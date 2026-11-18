import { Hono } from 'hono';
import { requireAdmin } from '../lib/adminAuth';
import { mergePricingConfig, type CostItem } from '../../src/lib/pricing';
import { getFuelPrices } from '../lib/fuelPrices';
import { ensurePricingReady, seedCostItems } from '../lib/pricingStore';

/**
 * 요금표 · 규칙 (관리자 전용) — 원가표(cost_items) · 계산 설정 · 엔화 환율.
 * 원가와 마진은 고객에게 보이면 안 되므로 모든 라우트에 관리자 확인을 붙인다.
 * 표는 배포 후 /api/migrate-db 를 한 번 열어야 생긴다.
 */
const app = new Hono<{ Bindings: Env }>();
app.use('*', requireAdmin);

const CATS = ['stay', 'meal', 'activity', 'entrance', 'transfer', 'vehicle', 'staff', 'misc'];
const UNITS = ['person_night', 'room_night', 'person', 'vehicle', 'team', 'day'];
const text = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
const money = (v: unknown) => { const n = Math.round(Number(String(v ?? '').replace(/[^\d.]/g, ''))); return Number.isFinite(n) && n > 0 ? n : 0; };

const toItem = (r: any): CostItem => ({
    id: String(r.id), category: r.category, region: r.region || '', name: r.name || '', grade: r.grade || '', unit: r.unit,
    priceMnt: Number(r.price_mnt) || 0, peakPriceMnt: Number(r.peak_price_mnt) || 0, supplier: r.supplier || '', note: r.note || '',
    source: r.source || '', needsCheck: r.needs_check === 1, isActive: r.is_active !== 0, sortOrder: Number(r.sort_order) || 0, updatedAt: r.updated_at || '',
});

const missingTable = (e: any) => /no such table/i.test(String(e?.message || e));
const NEED_MIGRATE = '요금표 표가 아직 없습니다. 관리자로 로그인한 상태에서 /api/migrate-db 를 한 번 열어 주세요.';

// ── 환율 (1엔당 ₮) — 하루 두 번까지만 바깥 서비스에 묻고 나머지는 보관한 값을 쓴다 ──
const RATE_TTL_MS = 12 * 60 * 60 * 1000;
export interface StoredRate { mntPerJpy: number; fetchedAt: string; source: string; stale?: boolean }
export async function getLiveRate(db: any, force = false): Promise<StoredRate | null> {
    let saved: StoredRate | null = null;
    try {
        const row: any = await db.prepare("SELECT value FROM pricing_settings WHERE key = 'rate'").first();
        if (row?.value) saved = JSON.parse(row.value);
    } catch { /* 표가 없거나 값이 깨졌으면 새로 받는다 */ }
    if (saved && !force && Date.now() - Date.parse(saved.fetchedAt) < RATE_TTL_MS) return saved;
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/JPY');
        const j: any = await res.json();
        const v = Number(j?.rates?.MNT);
        if (!res.ok || !(v > 0)) throw new Error('rate unavailable');
        const next: StoredRate = { mntPerJpy: v, fetchedAt: new Date().toISOString(), source: 'open.er-api.com (ExchangeRate-API)' };
        try {
            await db.prepare("INSERT INTO pricing_settings (key, value) VALUES ('rate', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(next)).run();
        } catch { /* 보관 실패는 무시 */ }
        return next;
    } catch {
        // 못 받으면 전에 받아 둔 값을 쓴다 (오래됐다고 표시)
        return saved ? { ...saved, stale: true } : null;
    }
}

export async function loadPricing(db: any) {
    // 표가 없거나 한 번도 채운 적이 없으면 여기서 알아서 준비한다 (migrate-db · 버튼 없이)
    await ensurePricingReady(db);
    const rows = ((await db.prepare('SELECT * FROM cost_items ORDER BY sort_order ASC, category ASC, region ASC, name ASC').all()).results || []) as any[];
    const cfgRow: any = await db.prepare("SELECT value FROM pricing_settings WHERE key = 'config'").first();
    let cfg: unknown = {};
    try { cfg = cfgRow?.value ? JSON.parse(cfgRow.value) : {}; } catch { cfg = {}; }
    return { items: rows.map(toItem), config: mergePricingConfig(cfg) };
}

// GET /api/pricing — 원가표 + 설정 + 환율
app.get('/', async (c) => {
    try {
        const { items, config } = await loadPricing(c.env.DB);
        const [rate, fuel] = await Promise.all([getLiveRate(c.env.DB), getFuelPrices(c.env.DB)]);
        return c.json({ items, config, rate, fuel });
    } catch (e: any) {
        if (missingTable(e)) return c.json({ error: NEED_MIGRATE, needsMigration: true }, 503);
        return c.json({ error: e.message }, 500);
    }
});

// GET /api/pricing/rate?refresh=1 — 환율만 (refresh 면 지금 다시 받는다)
app.get('/rate', async (c) => {
    const rate = await getLiveRate(c.env.DB, c.req.query('refresh') === '1');
    return rate ? c.json(rate) : c.json({ error: '환율을 받지 못했습니다. 잠시 뒤 다시 시도하거나 직접 입력해 주세요.' }, 502);
});

// GET /api/pricing/fuel?refresh=1 — 연료 가격 (슈흐라이 주유소 가격표)
app.get('/fuel', async (c) => {
    const fuel = await getFuelPrices(c.env.DB, c.req.query('refresh') === '1');
    return fuel ? c.json(fuel) : c.json({ error: '연료 가격표를 읽지 못했습니다. 잠시 뒤 다시 시도하거나 직접 입력해 주세요.' }, 502);
});

// PUT /api/pricing/items — 원가표 전체 저장 (보낸 목록이 곧 원가표: 빠진 줄은 지운다)
app.put('/items', async (c) => {
    const body: any = await c.req.json().catch(() => ({}));
    const list: any[] = Array.isArray(body.items) ? body.items.slice(0, 2000) : [];
    const db = c.env.DB;
    try {
        const seen = new Set<string>();
        const stmts: any[] = [];
        list.forEach((it, i) => {
            const name = text(it?.name, 120);
            if (!name || !CATS.includes(it?.category) || !UNITS.includes(it?.unit)) return;
            let id = text(it?.id, 60) || `cost-${Date.now().toString(36)}-${i.toString(36)}`;
            if (seen.has(id)) id = `${id}-${i.toString(36)}`;
            seen.add(id);
            stmts.push(db.prepare(`
                INSERT INTO cost_items (id, category, region, name, grade, unit, price_mnt, peak_price_mnt, supplier, note, source, needs_check, is_active, sort_order, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET category = excluded.category, region = excluded.region, name = excluded.name, grade = excluded.grade, unit = excluded.unit,
                    peak_price_mnt = excluded.peak_price_mnt, supplier = excluded.supplier, note = excluded.note, source = excluded.source,
                    needs_check = excluded.needs_check, is_active = excluded.is_active, sort_order = excluded.sort_order,
                    updated_at = CASE WHEN cost_items.price_mnt != excluded.price_mnt OR cost_items.peak_price_mnt != excluded.peak_price_mnt THEN datetime('now') ELSE cost_items.updated_at END,
                    price_mnt = excluded.price_mnt
            `).bind(id, it.category, text(it.region, 60), name, text(it.grade, 40), it.unit, money(it.priceMnt), money(it.peakPriceMnt),
                text(it.supplier, 120), text(it.note, 300), text(it.source, 120), it.needsCheck ? 1 : 0, it.isActive === false ? 0 : 1, i));
        });
        const existing = ((await db.prepare('SELECT id FROM cost_items').all()).results || []) as any[];
        for (const r of existing) if (!seen.has(String(r.id))) stmts.push(db.prepare('DELETE FROM cost_items WHERE id = ?').bind(r.id));
        // D1 은 한 번에 보낼 수 있는 문장 수에 한도가 있어 나눠서 보낸다
        for (let i = 0; i < stmts.length; i += 80) await db.batch(stmts.slice(i, i + 80));
        return c.json({ success: true, ...(await loadPricing(db)) });
    } catch (e: any) {
        if (missingTable(e)) return c.json({ error: NEED_MIGRATE, needsMigration: true }, 503);
        return c.json({ error: e.message }, 500);
    }
});

// PUT /api/pricing/config — 계산 설정 저장
app.put('/config', async (c) => {
    const body: any = await c.req.json().catch(() => ({}));
    const config = mergePricingConfig(body.config);
    try {
        await c.env.DB.prepare("INSERT INTO pricing_settings (key, value) VALUES ('config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(config)).run();
        return c.json({ success: true, config });
    } catch (e: any) {
        if (missingTable(e)) return c.json({ error: NEED_MIGRATE, needsMigration: true }, 503);
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/pricing/seed — 원가표가 비어 있을 때 받은 원가표 값으로 채운다 (모두 「확인 필요」)
app.post('/seed', async (c) => {
    const db = c.env.DB;
    try {
        const n: any = await db.prepare('SELECT COUNT(*) AS n FROM cost_items').first();
        if (Number(n?.n) > 0) return c.json({ error: '원가표에 이미 항목이 있습니다. 비어 있을 때만 초기 데이터를 넣을 수 있습니다.' }, 409);
        await seedCostItems(db);
        return c.json({ success: true, ...(await loadPricing(db)) });
    } catch (e: any) {
        if (missingTable(e)) return c.json({ error: NEED_MIGRATE, needsMigration: true }, 503);
        return c.json({ error: e.message }, 500);
    }
});

// GET / PUT /api/pricing/quote/:id — 견적별 원가 내역 (원가 계획 · 등급별 원가 줄 · 계산한 날의 환율)
// 견적 문서(document_content)는 고객 화면으로 나가므로 원가는 거기 넣지 않고 여기 따로 둔다.
app.get('/quote/:id', async (c) => {
    try {
        const row: any = await c.env.DB.prepare('SELECT value FROM pricing_settings WHERE key = ?').bind(`quote:${c.req.param('id')}`).first();
        let costing: unknown = null;
        try { costing = row?.value ? JSON.parse(row.value) : null; } catch { costing = null; }
        return c.json({ costing });
    } catch (e: any) {
        if (missingTable(e)) return c.json({ error: NEED_MIGRATE, needsMigration: true }, 503);
        return c.json({ error: e.message }, 500);
    }
});
app.put('/quote/:id', async (c) => {
    const body: any = await c.req.json().catch(() => ({}));
    const value = JSON.stringify(body.costing ?? null);
    if (value.length > 200_000) return c.json({ error: '원가 내역이 너무 큽니다.' }, 413);
    try {
        await c.env.DB.prepare('INSERT INTO pricing_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(`quote:${c.req.param('id')}`, value).run();
        return c.json({ success: true });
    } catch (e: any) {
        if (missingTable(e)) return c.json({ error: NEED_MIGRATE, needsMigration: true }, 503);
        return c.json({ error: e.message }, 500);
    }
});

export default app;
