import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

// GET /api/reviews  — optional filters: ?product_id=... & ?approved=1
app.get('/', async (c) => {
    const db = c.env.DB;
    const productId = c.req.query('product_id');
    const approvedParam = c.req.query('approved');
    try {
        const where: string[] = [];
        const binds: any[] = [];
        if (productId) { where.push('product_id = ?'); binds.push(productId); }
        if (approvedParam === '1' || approvedParam === 'true') { where.push('is_approved = 1'); }
        const sql = `SELECT * FROM reviews${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
        const result = await (binds.length ? db.prepare(sql).bind(...binds) : db.prepare(sql)).all();
        return c.json(result.results);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// GET /api/reviews/:id
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        const result = await db.prepare('SELECT * FROM reviews WHERE id=?').bind(id).first();
        if (!result) return c.json({ error: 'Not found' }, 404);
        return c.json(result);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/reviews
app.post('/', async (c) => {
    const data = await c.req.json();
    const db = c.env.DB;
    const id = data.id || crypto.randomUUID();
    try {
        await db.prepare(
            "INSERT INTO reviews (id, user_id, user_name, user_avatar, product_id, product_name, rating, title, content, images, is_approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, data.user_id || '', data.user_name || data.author_name || '', data.user_avatar || '', data.product_id || '', data.product_name || '',
            data.rating || 5, data.title || '', data.content || '', JSON.stringify(data.images || []), data.is_approved ?? 0, data.created_at || new Date().toISOString()).run();
        return c.json({ id, ...data });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// PUT /api/reviews/:id
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    const db = c.env.DB;
    try {
        await db.prepare(
            "UPDATE reviews SET rating=?, title=?, content=?, images=?, is_approved=? WHERE id=?"
        ).bind(data.rating || 5, data.title || '', data.content || '', JSON.stringify(data.images || []), data.is_approved ?? 0, id).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// DELETE /api/reviews/:id
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        await db.prepare('DELETE FROM reviews WHERE id=?').bind(id).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
