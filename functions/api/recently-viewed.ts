import { Hono } from 'hono';

type Env = { DB: any; };

const app = new Hono<{ Bindings: Env }>();

const ensureTable = async (db: any) => {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS recently_viewed (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            viewed_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
};

// GET /api/recently-viewed
app.get('/', async (c) => {
    const db = c.env.DB;
    try {
        await ensureTable(db);
        const userId = c.req.query('user_id');
        let result;
        const joinQuery = `
            SELECT rv.id, rv.user_id, rv.product_id, rv.viewed_at as created_at,
                   p.name as title, p.thumbnail as image, p.price, p.category
            FROM recently_viewed rv
            LEFT JOIN products p ON rv.product_id = p.id
        `;
        if (userId) {
            result = await db.prepare(joinQuery + ' WHERE rv.user_id = ? ORDER BY rv.viewed_at DESC LIMIT 20').bind(userId).all();
        } else {
            result = await db.prepare(joinQuery + ' ORDER BY rv.viewed_at DESC LIMIT 20').all();
        }
        return c.json(result.results || []);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/recently-viewed (upsert)
app.post('/', async (c) => {
    try {
        const db = c.env.DB;
        await ensureTable(db);
        const data = await c.req.json();
        const userId = data.user_id || data.userId || '';
        const productId = data.product_id || data.productId || '';

        // Remove existing entry for same user+product
        await db.prepare('DELETE FROM recently_viewed WHERE user_id = ? AND product_id = ?').bind(userId, productId).run();

        // Insert new entry (moves it to top)
        const id = `rv-${Date.now()}`;
        await db.prepare('INSERT INTO recently_viewed (id, user_id, product_id) VALUES (?, ?, ?)').bind(id, userId, productId).run();

        // Keep only last 20 items per user
        await db.prepare(`
            DELETE FROM recently_viewed WHERE user_id = ? AND id NOT IN (
                SELECT id FROM recently_viewed WHERE user_id = ? ORDER BY viewed_at DESC LIMIT 20
            )
        `).bind(userId, userId).run();

        return c.json({ success: true, id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
