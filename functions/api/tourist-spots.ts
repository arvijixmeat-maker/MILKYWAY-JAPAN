import { Hono } from 'hono';
import { requireAdmin } from '../lib/adminAuth';
import { autoFillSpots, collectCandidates, loadExistingSpots } from '../lib/spotAutoFill';

const app = new Hono<{ Bindings: Env }>();

const safeArr = (v: unknown): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
    if (typeof v === 'string') {
        try {
            const p = JSON.parse(v);
            return Array.isArray(p) ? p.filter((x: unknown): x is string => typeof x === 'string') : [];
        } catch { return []; }
    }
    return [];
};

const decorate = (row: any) => ({
    ...row,
    images: safeArr(row.images),
    is_active: row.is_active === 1 || row.is_active === true,
});

// POST /api/tourist-spots/auto-fill — 상품 일정의 우리 사진·설명으로 관광지 마스터를 자동으로 채운다 (관리자 전용)
// body: { productId?: 그 상품만 (상품 저장 직후 자동 실행), dryRun?: true 면 DB 에 쓰지 않고 계획만 }
app.post('/auto-fill', requireAdmin, async (c) => {
    const apiKey = String(c.env.ANTHROPIC_API_KEY || '').replace(/\s+/g, '');
    if (!apiKey.startsWith('sk-ant-')) return c.json({ error: 'AI 키(ANTHROPIC_API_KEY)가 설정되지 않았거나 올바르지 않습니다.' }, 503);
    const body: any = await c.req.json().catch(() => ({}));
    const db = c.env.DB;
    try {
        const productId = typeof body.productId === 'string' ? body.productId : '';
        const products = ((productId
            ? await db.prepare('SELECT id, name, itinerary_blocks FROM products WHERE id = ?').bind(productId).all()
            : await db.prepare("SELECT id, name, itinerary_blocks FROM products WHERE (status IS NULL OR status != 'deleted') ORDER BY sort_order ASC, created_at DESC LIMIT 60").all()
        ).results || []) as Array<Record<string, unknown>>;
        const candidates = collectCandidates(products, productId ? 40 : 120);
        const existing = await loadExistingSpots(db);
        const result = await autoFillSpots(apiKey, db, candidates, existing, body.dryRun === true);
        return c.json({ success: true, ...result });
    } catch (e: any) {
        console.error('[tourist-spots auto-fill] failed', e);
        const status = Number(e?.status) || 0;
        const msg = status === 401 ? 'AI 키가 올바르지 않습니다.'
            : status === 429 ? 'AI 요청이 잠시 많습니다. 1분 뒤 다시 시도해 주세요.'
            : status === 402 || e?.type === 'billing_error' ? 'AI 크레딧(결제)에 문제가 있습니다.'
            : `자동 채우기 실패: ${String(e?.message || e).slice(0, 200)}`;
        return c.json({ error: msg }, 500);
    }
});

// GET /api/tourist-spots?q=&active=&region=central|gobi|hovsgol|uncat
app.get('/', async (c) => {
    const db = c.env.DB;
    const q = (c.req.query('q') || '').trim();
    const onlyActive = c.req.query('active') !== '0';
    const region = (c.req.query('region') || '').trim();
    try {
        const where: string[] = [];
        const bind: any[] = [];
        if (onlyActive) where.push('is_active = 1');
        if (q) {
            where.push('(name_kr LIKE ? OR name_local LIKE ?)');
            const like = `%${q}%`;
            bind.push(like, like);
        }
        if (region === 'uncat') {
            // Sentinel — admin picked "미분류" tab. Match rows with no region.
            where.push("(region IS NULL OR region = '')");
        } else if (region && VALID_REGIONS.includes(region)) {
            where.push('region = ?');
            bind.push(region);
        }
        const sql = `SELECT * FROM tourist_spots ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name_kr ASC LIMIT 500`;
        const result = await db.prepare(sql).bind(...bind).all();
        return c.json((result.results || []).map(decorate));
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        const row = await db.prepare('SELECT * FROM tourist_spots WHERE id = ?').bind(id).first();
        if (!row) return c.json({ error: 'Not found' }, 404);
        return c.json(decorate(row));
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// Normalize region input — only allow the known values, fall back to ''.
const VALID_REGIONS = ['central', 'gobi', 'hovsgol', 'ulaanbaatar', 'experience', 'food', 'vehicle'];
const validRegion = (r: unknown): string => {
    if (typeof r !== 'string') return '';
    return VALID_REGIONS.includes(r) ? r : '';
};

app.post('/', requireAdmin, async (c) => {
    const data = await c.req.json();
    const db = c.env.DB;
    const id = data.id || `spot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
        await db.prepare(`
            INSERT INTO tourist_spots (
                id, name_kr, name_local, address, description, images, region, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            data.name_kr || data.nameKr || '',
            data.name_local || data.nameLocal || '',
            data.address || '',
            data.description || '',
            JSON.stringify(safeArr(data.images)),
            validRegion(data.region),
            data.is_active === false || data.is_active === 0 ? 0 : 1
        ).run();
        return c.json({ id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.put('/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    const db = c.env.DB;
    try {
        await db.prepare(`
            UPDATE tourist_spots SET
                name_kr = ?, name_local = ?, address = ?, description = ?, images = ?, region = ?, is_active = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `).bind(
            data.name_kr || data.nameKr || '',
            data.name_local || data.nameLocal || '',
            data.address || '',
            data.description || '',
            JSON.stringify(safeArr(data.images)),
            validRegion(data.region),
            data.is_active === false || data.is_active === 0 ? 0 : 1,
            id
        ).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.delete('/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        await db.prepare('DELETE FROM tourist_spots WHERE id = ?').bind(id).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
