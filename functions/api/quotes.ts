import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { quotes } from '../../src/db/schema';
import { initializeLucia } from '../lib/auth';
import { getCookie } from 'hono/cookie';
import { eq, desc, or, sql } from 'drizzle-orm';
import { getSessionUser } from '../lib/userAuth';
import { sendEmail, baseLayout } from '../lib/mailer';
import { requireAdmin } from '../lib/adminAuth';
import { generateQuoteDraft, summarizeProducts } from '../lib/aiQuoteDraft';
import { CATEGORY_KO, UNIT_KO, type CostCategory, type CostUnit } from '../../src/lib/pricing';
import { inferActivityType, periodDates } from '../../src/constants/quoteOptions';

// Define Env locally if global scope is not picked up
interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    RESEND_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    ADMIN_EMAIL?: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Fields stored as JSON strings — parse for client convenience.
const JSON_ARRAY_FIELDS = ['travelTypes', 'travel_types', 'accommodations'] as const;
const parseNestedJson = (value: any, maxDepth = 2) => {
    let parsed = value;
    for (let depth = 0; depth < maxDepth && typeof parsed === 'string'; depth += 1) {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            break;
        }
    }
    return parsed;
};

const parseQuoteRow = (q: any) => {
    const out: any = { ...q };
    for (const f of JSON_ARRAY_FIELDS) {
        const v = out[f];
        if (typeof v === 'string' && v.trim().startsWith('[')) {
            try { out[f] = JSON.parse(v); } catch { /* leave as string */ }
        }
    }
    return out;
};

// GET /api/quotes
app.get('/', async (c) => {
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);

    if (!sessionId) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const db = drizzle(c.env.DB);

    // Admin gets all, User gets theirs
    let result;
    if (user.role === 'admin') {
        result = await db.select().from(quotes).orderBy(desc(quotes.createdAt)).all();
    } else {
        // 본인 계정 견적 + 같은 이메일로 받은 견적(관리자가 인스타·메일 문의로 만든 견적은 계정 없이 이메일만 있다)
        // — 예약 목록과 같은 방식. 이메일은 대소문자를 구분하지 않는다
        const email = String(user.email || '').trim().toLowerCase();
        const mine = email
            ? or(eq(quotes.userId, user.id), sql`lower(trim(${quotes.email})) = ${email}`)
            : eq(quotes.userId, user.id);
        result = await db.select().from(quotes).where(mine).orderBy(desc(quotes.createdAt)).all();
    }

    return c.json(result.map(parseQuoteRow));
});

// GET /api/quotes/:id (public — no auth required so users can view own quotes from email link)
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = drizzle(c.env.DB);

    const result: any = await db.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!result) {
        return c.json({ error: 'Not found' }, 404);
    }

    const parsed = parseQuoteRow(result);

    // 맞춤 일정표가 연결돼 있으면 템플릿의 일정(사진 포함)을 함께 내려줌 (고객 견적 페이지용)
    const tplId = result.itinerary_template_id ?? result.itineraryTemplateId;
    if (tplId) {
        try {
            const tpl: any = await c.env.DB.prepare('SELECT * FROM itinerary_templates WHERE id = ?').bind(tplId).first();
            if (tpl) {
                let days: any[] = [];
                try { days = tpl.days ? JSON.parse(tpl.days) : []; } catch { days = []; }
                parsed.itinerary = { id: tpl.id, name: tpl.name, description: tpl.description || '', days };
            }
        } catch (e) {
            console.error('[Quotes GET] itinerary template fetch failed', e);
        }
    }

    // 관리자가 문서 편집기로 저장한 내용이 있으면 그 일정을 우선 사용 (고객 견적 페이지에 편집본 노출)
    const dc = result.document_content ?? result.documentContent;
    if (dc) {
        try {
            const parsedDc = parseNestedJson(dc);
            if (parsedDc && Array.isArray(parsedDc.days) && parsedDc.days.length) {
                parsed.itinerary = {
                    id: 'doc',
                    name: parsedDc.name || parsed.itinerary?.name || '',
                    description: parsedDc.description || parsed.itinerary?.description || '',
                    days: parsedDc.days,
                };
            }
            parsed.documentContent = parsedDc;
        } catch (e) {
            console.error('[Quotes GET] document_content parse failed', e);
        }
    }

    return c.json(parsed);
});

// POST /api/quotes/:id/request-booking — 고객이 견적서에서 「この内容で確定する」를 눌렀을 때 (로그인 불필요)
// 인스타·페이스북·메일로 문의한 고객은 계정이 없으므로, 견적 링크(추측 불가한 UUID)만으로
// 「예약 요청」 상태로 바꾸고 관리자에게 메일을 보낸다. 금액·일정 등 다른 값은 바꾸지 못한다.
app.post('/:id/request-booking', async (c) => {
    const id = c.req.param('id');
    const row: any = await c.env.DB.prepare('SELECT id, name, email, phone, destination, headcount, status, confirmed_price FROM quotes WHERE id = ?').bind(id).first();
    if (!row) return c.json({ error: 'Not found' }, 404);
    if (row.status === 'reservation_requested') return c.json({ success: true, already: true });
    if (row.status === 'converted') return c.json({ error: 'Already converted' }, 409);
    if (!['answered', 'processing', 'new'].includes(String(row.status))) return c.json({ error: 'Not available' }, 409);

    let message = '';
    try { const body: any = await c.req.json(); message = String(body?.message || '').slice(0, 500); } catch { /* 본문 없음 */ }

    await c.env.DB.prepare("UPDATE quotes SET status = 'reservation_requested', updated_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), id).run();

    // 관리자 알림 메일 (키가 없으면 건너뛴다 — 상태 변경은 이미 저장됨)
    const apiKey = c.env.RESEND_API_KEY;
    if (apiKey) {
        try {
            const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
            const html = baseLayout(`
                <div class="greeting">견적 확정 요청이 들어왔습니다</div>
                <div class="card">
                    <p><b>${esc(row.name)}</b> · ${esc(row.headcount)} · ${esc(row.destination)}</p>
                    <p>연락처: ${esc(row.email)} ${esc(row.phone)}</p>
                    ${row.confirmed_price ? `<p>견적 금액: ¥${Number(row.confirmed_price).toLocaleString()}</p>` : ''}
                    ${message ? `<p>고객 메시지: ${esc(message)}</p>` : ''}
                </div>
                <p>관리자 「통합 예약 관리」에서 이 견적을 열어 「예약으로 전환」을 눌러 주세요.</p>`);
            await sendEmail(apiKey, c.env.ADMIN_EMAIL || 'agape_ibeel@hanpass.com', `[견적 확정 요청] ${row.name}`, html);
        } catch (e) {
            console.error('[Quotes request-booking] admin mail failed', e);
        }
    }
    return c.json({ success: true });
});

// POST /api/quotes (Create new quote — no auth required, guests can submit)
app.post('/', async (c) => {
    try {
        const body = await c.req.json();

        if (!body.name || !body.type) {
            return c.json({ error: 'Missing required fields: name, type' }, 400);
        }

        // Guests may ask for a quote. The owner, status and timestamp come from the
        // server unless an admin is entering the quote on someone's behalf.
        const user = await getSessionUser(c);
        const isAdmin = user?.role === 'admin';

        const db = drizzle(c.env.DB);
        const id = crypto.randomUUID();

        await db.insert(quotes).values({
            id,
            userId: isAdmin ? (body.user_id || null) : (user?.id ?? null),
            type: body.type,
            name: body.name,
            phone: body.phone || null,
            email: body.email || null,
            destination: body.destination || null,
            headcount: body.headcount || null,
            period: body.period || null,
            budget: body.budget || null,
            travelTypes: Array.isArray(body.travel_types)
                ? JSON.stringify(body.travel_types)
                : (body.travel_types || null),
            accommodations: Array.isArray(body.accommodations)
                ? JSON.stringify(body.accommodations)
                : (body.accommodations || null),
            vehicle: body.vehicle || null,
            additionalRequest: body.additional_request || null,
            status: (isAdmin && body.status) || 'new',
            createdAt: (isAdmin && body.created_at) || new Date().toISOString(),
        }).run();

        return c.json({ id, success: true });
    } catch (e: any) {
        console.error('[Quotes POST Error]', e);
        const cause = e?.cause?.message || e?.cause || '';
        const msg = cause ? String(cause) : (e?.message?.split('\n')[0] || 'Internal server error');
        return c.json({ error: msg }, 500);
    }
});

// PUT /api/quotes/:id
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    // Auth check
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);
    if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || user.role !== 'admin') return c.json({ error: "Forbidden" }, 403);

    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    const updates: Record<string, any> = {};
    const assign = (property: string, ...keys: string[]) => {
        const key = keys.find(candidate => Object.prototype.hasOwnProperty.call(body, candidate));
        if (key) updates[property] = body[key];
    };

    assign('userId', 'user_id', 'userId');
    assign('type', 'type');
    assign('name', 'name');
    assign('phone', 'phone');
    assign('email', 'email');
    assign('destination', 'destination');
    assign('headcount', 'headcount');
    assign('period', 'period');
    assign('budget', 'budget');
    assign('travelTypes', 'travel_types', 'travelTypes');
    assign('accommodations', 'accommodations');
    assign('vehicle', 'vehicle');
    assign('additionalRequest', 'additional_request', 'additionalRequest');
    assign('attachmentUrl', 'attachment_url', 'attachmentUrl');
    assign('status', 'status');
    assign('adminNote', 'admin_note', 'adminNote');
    assign('estimateUrl', 'estimate_url', 'estimateUrl');
    assign('confirmedStartDate', 'confirmed_start_date', 'confirmedStartDate');
    assign('confirmedEndDate', 'confirmed_end_date', 'confirmedEndDate');
    assign('confirmedPrice', 'confirmed_price', 'confirmedPrice');
    assign('deposit', 'deposit');
    assign('depositStatus', 'deposit_status', 'depositStatus');
    assign('balanceStatus', 'balance_status', 'balanceStatus');
    assign('itineraryTemplateId', 'itinerary_template_id', 'itineraryTemplateId');
    assign('documentContent', 'document_content', 'documentContent');

    if (Array.isArray(updates.travelTypes)) updates.travelTypes = JSON.stringify(updates.travelTypes);
    if (Array.isArray(updates.accommodations)) updates.accommodations = JSON.stringify(updates.accommodations);
    if (updates.documentContent !== undefined && updates.documentContent !== null && typeof updates.documentContent !== 'string') {
        updates.documentContent = JSON.stringify(updates.documentContent);
    }

    await db.update(quotes).set({
        ...updates,
        updatedAt: new Date().toISOString(),
    }).where(eq(quotes.id, id)).run();

    return c.json({ success: true });
});

// DELETE /api/quotes/:id
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    // Auth check
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);
    if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || user.role !== 'admin') return c.json({ error: "Forbidden" }, 403);

    const db = drizzle(c.env.DB);
    await db.delete(quotes).where(eq(quotes.id, id)).run();

    return c.json({ success: true });
});

// POST /api/quotes/:id/ai-draft — AI 견적 초안 (관리자 전용). 저장하지 않고 편집기에 돌려준다.
// body: { people?, startDate?, endDate?, revise?: { instruction, current: { title, days, included, excluded } } }
//   — 날짜·인원은 편집기에서 관리자가 고친 값이 있으면 그걸 우선. revise 가 있으면 지금 일정을 한국어 수정 요청대로 고친다 (「AI로 수정」)
app.post('/:id/ai-draft', requireAdmin, async (c) => {
    // 키를 붙여 넣을 때 섞인 줄바꿈·공백 제거 (키 안에는 원래 공백이 없다 — 줄바꿈이 섞이면 「Invalid header value」로 실패)
    const apiKey = String(c.env.ANTHROPIC_API_KEY || '').replace(/\s+/g, '');
    if (!apiKey) return c.json({ error: 'AI 키(ANTHROPIC_API_KEY)가 아직 설정되지 않았습니다. Cloudflare 환경 변수에 등록해 주세요.' }, 503);
    if (!apiKey.startsWith('sk-ant-')) return c.json({ error: 'Cloudflare 에 저장된 AI 키가 올바른 형식이 아닙니다(sk-ant- 로 시작해야 함). Console 에서 키를 다시 복사해 ANTHROPIC_API_KEY 에 넣어 주세요.' }, 503);

    const id = c.req.param('id');
    const row: any = await c.env.DB.prepare('SELECT * FROM quotes WHERE id = ?').bind(id).first();
    if (!row) return c.json({ error: '견적을 찾을 수 없습니다.' }, 404);
    const body: any = await c.req.json().catch(() => ({}));

    // 기간 → DAY 수 (날짜가 있으면 날짜로, 없으면 「3泊4日」·「4박5일」 같은 글에서)
    // 편집기 날짜 → 확정 날짜 → 고객이 적은 희망 일정(예: 2027-08-01 ~ 2027-08-04) 순
    const wish = periodDates(row.period);
    const startDate = String(body.startDate || row.confirmed_start_date || wish.start).slice(0, 10);
    const endDate = String(body.endDate || row.confirmed_end_date || (body.startDate || row.confirmed_start_date ? '' : wish.end)).slice(0, 10);
    let dayCount: number | null = null;
    if (startDate && endDate) {
        const n = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1;
        if (n >= 1 && n <= 20) dayCount = n;
    }
    if (!dayCount) {
        const m = String(row.period || '').match(/(\d+)\s*(?:泊|박)\s*(\d+)\s*(?:日|일)/);
        if (m) dayCount = Math.min(20, Number(m[2]));
    }

    try {
        // 관광지(음식·차량 제외, 사진 있는 곳) · 호텔 목록
        const parseImgs = (v: unknown): string[] => { try { const a = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(a) ? a.filter((x: unknown) => typeof x === 'string' && x) : []; } catch { return []; } };
        const spotRows = ((await c.env.DB.prepare("SELECT id, name_kr, region, description, images FROM tourist_spots WHERE (is_active IS NULL OR is_active = 1) AND (region IS NULL OR region NOT IN ('food','vehicle'))").all()).results || []) as any[];
        const hotelRows = ((await c.env.DB.prepare('SELECT id, name_kr, name_local, city, star_rating, address, description, images FROM hotels WHERE (is_active IS NULL OR is_active = 1)').all()).results || []) as any[];
        const spots = spotRows.filter(s => parseImgs(s.images).length);
        // 판매 중인 상품 — AI 가 우리 표준 일정을 바탕으로 초안을 만들게
        const productRows = ((await c.env.DB.prepare("SELECT id, name, duration, price, itinerary_blocks FROM products WHERE (status IS NULL OR status = 'active') ORDER BY sort_order ASC, created_at DESC LIMIT 30").all()).results || []) as any[];
        const oneLine = (t: unknown, n: number) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);

        // 「AI로 수정」 — 편집기의 지금 일정을 AI 가 읽는 모양으로 (사진 → 관광지 ID, 숙소 → 호텔 ID)
        const reviseReq = body?.revise && typeof body.revise === 'object' ? body.revise : null;
        let revise: { currentJson: string; instruction: string } | undefined;
        if (reviseReq) {
            const instruction = String(reviseReq.instruction || '').trim().slice(0, 1500);
            const cur = reviseReq.current || {};
            const curDays: any[] = Array.isArray(cur.days) ? cur.days.slice(0, 20) : [];
            if (!instruction) return c.json({ error: '수정할 내용을 적어 주세요.' }, 400);
            if (!curDays.length) return c.json({ error: '고칠 일정이 없습니다. 먼저 「AI 초안」으로 일정을 만들어 주세요.' }, 400);
            const spotIdByImage = new Map<string, string>();
            for (const s of spots) for (const img of parseImgs(s.images)) if (!spotIdByImage.has(img)) spotIdByImage.set(img, String(s.id));
            const hotelIds = new Set(hotelRows.map(h => String(h.id)));
            const meal = (v: unknown) => oneLine(v, 40);
            const current = {
                tripTitleJa: oneLine(cur.title, 120),
                days: curDays.map(d => {
                    const acc = d?.accommodation && typeof d.accommodation === 'object' ? d.accommodation : null;
                    const accId = acc?.id ? String(acc.id) : '';
                    return {
                        titleJa: oneLine(d?.title, 120), titleKo: oneLine(d?.titleKo, 120),
                        titleSpotId: spotIdByImage.get(String(d?.titleImage || '')) || '',
                        regionJa: oneLine(d?.region, 60), moveJa: oneLine(d?.move, 40),
                        noteJa: oneLine(d?.note, 200), noteKo: oneLine(d?.noteKo, 200),
                        items: (Array.isArray(d?.activities) ? d.activities.slice(0, 20) : []).map((a: any) => ({
                            ja: oneLine(a?.title, 200), ko: oneLine(a?.ko, 200),
                            spotId: spotIdByImage.get(String((Array.isArray(a?.images) && a.images[0]) || '')) || '',
                        })),
                        hotelId: hotelIds.has(accId) ? accId : '',
                        stayJa: acc && !hotelIds.has(accId) ? oneLine(acc.name, 80) : '',
                        breakfast: meal(d?.meals?.breakfast), lunch: meal(d?.meals?.lunch), dinner: meal(d?.meals?.dinner),
                    };
                }),
                included: (Array.isArray(cur.included) ? cur.included : []).map((x: unknown) => oneLine(x, 60)).slice(0, 40),
                excluded: (Array.isArray(cur.excluded) ? cur.excluded : []).map((x: unknown) => oneLine(x, 60)).slice(0, 40),
            };
            revise = { currentJson: JSON.stringify(current), instruction };
        }

        // 원가표 — AI 는 항목 ID 만 고른다 (단가는 보내지 않는다: 금액은 서버·편집기가 계산)
        let costRows: any[] = [];
        try { costRows = ((await c.env.DB.prepare('SELECT id, category, region, name, unit FROM cost_items WHERE is_active = 1 ORDER BY sort_order ASC').all()).results || []) as any[]; } catch { costRows = []; /* 표가 아직 없으면 원가 없이 */ }
        const stayRegions = [...new Set(costRows.filter(r => r.category === 'stay').map(r => String(r.region || '')).filter(Boolean))];
        const costText = costRows.length
            ? `原価表の宿泊地域（stayRegion に使う名前）: ${stayRegions.join(' / ')}\n原価表の項目（ID | 分類 | 地域 | 項目 | 単位）— costs に使う:\n${costRows.filter(r => r.category !== 'stay').map(r => `${r.id} | ${CATEGORY_KO[r.category as CostCategory] || r.category} | ${r.region || '-'} | ${r.name} | ${UNIT_KO[r.unit as CostUnit] || r.unit}`).join('\n')}`
            : '';
        const { draft, usage, model } = await generateQuoteDraft(apiKey, {
            destination: row.destination, headcount: row.headcount, people: Number(body.people) || null, period: row.period,
            startDate, endDate, budget: row.budget, travelTypes: row.travel_types, accommodations: row.accommodations,
            vehicle: row.vehicle, additionalRequest: row.additional_request, dayCount: revise ? null : dayCount,
        },
        spots.map(s => ({ id: String(s.id), name: oneLine(s.name_kr, 60), region: String(s.region || ''), desc: oneLine(s.description, 50) })),
        hotelRows.map(h => ({ id: String(h.id), name: oneLine(h.name_kr, 60), local: oneLine(h.name_local, 40), city: oneLine(h.city, 20), stars: Number(h.star_rating) || 0 })),
        summarizeProducts(productRows), revise, costText);

        // AI 가 고른 ID → 우리 자료 (없는 ID 는 버린다)
        const spotById = new Map(spots.map(s => [String(s.id), s]));
        const hotelById = new Map(hotelRows.map(h => [String(h.id), h]));
        const days = draft.days.map((d, i) => {
            const titleSpot = spotById.get(d.titleSpotId);
            const hotel = hotelById.get(d.hotelId);
            return {
                day: i + 1,
                title: d.titleJa.trim(),
                titleKo: d.titleKo.trim(),
                ...(titleSpot ? { titleImage: parseImgs(titleSpot.images)[0] } : {}),
                region: d.regionJa.trim(),
                move: d.moveJa.trim(),
                note: d.noteJa.trim(),
                noteKo: d.noteKo.trim(),
                summary: '',
                activities: d.items.filter(it => it.ja.trim()).map(it => {
                    const s = spotById.get(it.spotId);
                    return { time: '', type: inferActivityType(it.ja), title: it.ja.trim(), ko: it.ko.trim(), description: '', images: s ? parseImgs(s.images).slice(0, 4) : [] };
                }),
                meals: { breakfast: d.breakfast, lunch: d.lunch, dinner: d.dinner },
                accommodation: hotel
                    ? { id: String(hotel.id), name: String(hotel.name_kr), location: String(hotel.address || ''), images: parseImgs(hotel.images), description: String(hotel.description || '') }
                    : (d.stayJa.trim() ? { name: d.stayJa.trim(), images: [] } : null),
            };
        });
        // 참고한 상품 — 이름이 맞는 실제 상품의 1인 가격을 함께 (AI 가 만든 숫자가 아님)
        // 원가 계획 — 원가표에 있는 ID · 지역만 남긴다
        const costIds = new Set(costRows.map(r => String(r.id)));
        const costPlan = costRows.length ? {
            lastDayMorningEnd: draft.lastDayMorningEnd,
            days: draft.days.map((d, i) => ({
                day: i + 1,
                stayRegion: stayRegions.includes(d.stayRegion) ? d.stayRegion : '',
                stayType: stayRegions.includes(d.stayRegion) ? d.stayType : '',
                picks: d.costs.filter(p => costIds.has(p.itemId)),
            })),
        } : null;
        const base = draft.baseProductName.trim();
        const baseRow = base ? productRows.find(p => String(p.name || '').trim() === base) || productRows.find(p => String(p.name || '').includes(base) || base.includes(String(p.name || '').trim())) : undefined;
        return c.json({
            draft: {
                title: draft.tripTitleJa, titleKo: draft.tripTitleKo, days, included: draft.included, excluded: draft.excluded, noteKo: draft.adminNoteKo,
                memos: draft.memosKo.map(m => ({ tag: m.tag, text: m.textKo })), budgetNote: draft.budgetNoteKo, budget: String(row.budget || ''),
                checks: draft.requestChecks.map(c => ({ item: c.itemKo, status: c.status, how: c.howKo })),
                costPlan,
                baseProduct: baseRow ? { id: String(baseRow.id), name: String(baseRow.name), price: Number(baseRow.price) || 0, duration: String(baseRow.duration || '') } : null,
            },
            model,
            usage: { input: usage.input_tokens, output: usage.output_tokens, cacheRead: usage.cache_read_input_tokens ?? 0 },
        });
    } catch (e: any) {
        console.error('[Quotes ai-draft] failed', e);
        // 크레딧 소진·키 오류 등도 그대로 알려 준다 (관리자 화면)
        const status = Number(e?.status) || 0;
        const msg = status === 401 ? 'AI 키가 올바르지 않습니다. Cloudflare 의 ANTHROPIC_API_KEY 를 확인해 주세요.'
            : status === 429 ? 'AI 요청이 잠시 많습니다. 1분 뒤 다시 시도해 주세요.'
            : status === 402 || e?.type === 'billing_error' ? 'AI 크레딧(결제)에 문제가 있습니다 — 이번 달 크레딧을 다 썼을 수 있습니다. 직접 작성하거나 Console 에서 확인해 주세요.'
            : (e?.message ? `AI 초안 만들기 실패: ${String(e.message).slice(0, 200)}` : 'AI 초안 만들기에 실패했습니다.');
        return c.json({ error: msg }, 500);
    }
});

export default app;
