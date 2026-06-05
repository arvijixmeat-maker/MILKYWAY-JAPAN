import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { quotes } from '../../src/db/schema';
import { initializeLucia } from '../lib/auth';
import { getCookie } from 'hono/cookie';
import { eq, desc } from 'drizzle-orm';

// Define Env locally if global scope is not picked up
interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Fields stored as JSON strings — parse for client convenience.
const JSON_ARRAY_FIELDS = ['travelTypes', 'travel_types', 'accommodations'] as const;
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
        result = await db.select().from(quotes).where(eq(quotes.userId, user.id)).orderBy(desc(quotes.createdAt)).all();
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
            const parsedDc = typeof dc === 'string' ? JSON.parse(dc) : dc;
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

// POST /api/quotes (Create new quote — no auth required, guests can submit)
app.post('/', async (c) => {
    try {
        const body = await c.req.json();

        if (!body.name || !body.type) {
            return c.json({ error: 'Missing required fields: name, type' }, 400);
        }

        const db = drizzle(c.env.DB);
        const id = crypto.randomUUID();

        await db.insert(quotes).values({
            id,
            userId: body.user_id || null,
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
            status: body.status || 'new',
            createdAt: body.created_at || new Date().toISOString(),
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

    // Explicitly map snake_case keys that must persist to their camelCase model props
    const itineraryTemplateId = body.itinerary_template_id ?? body.itineraryTemplateId;
    const documentContent = body.document_content ?? body.documentContent;

    // Update
    await db.update(quotes).set({
        ...body,
        ...(itineraryTemplateId !== undefined ? { itineraryTemplateId } : {}),
        ...(documentContent !== undefined ? { documentContent } : {}),
        updatedAt: new Date().toISOString() // Ensure camelCase vs snake_case matches schema
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

export default app;
