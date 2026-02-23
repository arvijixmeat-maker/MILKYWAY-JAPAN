import { Hono } from 'hono';
import type { D1PreparedStatement } from '@cloudflare/workers-types';

type Env = {
    DB: any; // Using any for simplicity or you can use D1Database if imported
};

const app = new Hono<{ Bindings: Env }>();

// GET /api/categories
app.get('/', async (c) => {
    const db = c.env.DB;
    const type = c.req.query('type');
    try {
        let result;
        if (type) {
            result = await db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC').bind(type).all();
        } else {
            result = await db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
        }
        return c.json(result.results);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/categories
app.post('/', async (c) => {
    const data = await c.req.json();
    const db = c.env.DB;
    const id = data.id || crypto.randomUUID();
    const type = data.type || 'product'; // Default to product
    try {
        await db.prepare(
            "INSERT INTO categories (id, name, description, icon, image, sort_order, is_active, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, data.name, data.description || '', data.icon || '', data.image || '', data.sort_order || 0, data.is_active ?? 1, type).run();
        return c.json({ id, ...data });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// PUT /api/categories/:id
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    const db = c.env.DB;
    try {
        await db.prepare(
            "UPDATE categories SET name=?, description=?, icon=?, image=?, sort_order=?, is_active=? WHERE id=?"
        ).bind(data.name, data.description || '', data.icon || '', data.image || '', data.sort_order || 0, data.is_active ?? 1, id).run();
        // Note: intentionally not updating 'type' as it shouldn't change, but if needed, we'll keep it simple for now.
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// DELETE /api/categories/:id
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        await db.prepare('DELETE FROM categories WHERE id=?').bind(id).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// PUT /api/categories/bulk - Replace all categories
app.put('/bulk', async (c) => {
    const { categories } = await c.req.json();
    const db = c.env.DB;
    try {
        const stmts: D1PreparedStatement[] = [db.prepare('DELETE FROM categories')];
        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const type = cat.type || 'product';
            stmts.push(db.prepare(
                "INSERT INTO categories (id, name, description, icon, image, sort_order, is_active, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(cat.id || crypto.randomUUID(), cat.name, cat.description || '', cat.icon || '', cat.image || '', i, cat.is_active ?? 1, type));
        }
        await db.batch(stmts);
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
