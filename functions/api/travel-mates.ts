import { Hono } from 'hono';

interface Env {
    DB: any;
}

const app = new Hono<{ Bindings: Env }>();

// GET /api/travel-mates
app.get('/', async (c) => {
    const db = c.env.DB;
    try {
        const result = await db.prepare('SELECT * FROM travel_mates ORDER BY created_at DESC').all();
        return c.json(result.results);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// GET /api/travel-mates/:id
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        const result = await db.prepare('SELECT * FROM travel_mates WHERE id=?').bind(id).first();
        if (!result) return c.json({ error: 'Not found' }, 404);
        return c.json(result);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/travel-mates
app.post('/', async (c) => {
    const data = await c.req.json();
    const db = c.env.DB;
    const id = data.id || crypto.randomUUID();
    
    try {
        await db.prepare(
            "INSERT INTO travel_mates (id, user_id, user_name, user_avatar, title, content, destination, travel_date, max_members, current_members, status, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            id, 
            data.user_id || '', 
            data.user_name || '', 
            data.user_avatar || '', 
            data.title || '', 
            data.content || '', 
            data.destination || '', 
            data.travel_date || '', 
            data.max_members || 4, 
            data.current_members || 1, 
            data.status || 'open', 
            JSON.stringify(data.tags || []), 
            data.created_at || new Date().toISOString()
        ).run();
        
        return c.json({ id, ...data });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// PUT /api/travel-mates/:id
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    const db = c.env.DB;
    
    try {
        await db.prepare(
            "UPDATE travel_mates SET title=?, content=?, destination=?, travel_date=?, max_members=?, current_members=?, status=?, tags=? WHERE id=?"
        ).bind(
            data.title || '', 
            data.content || '', 
            data.destination || '', 
            data.travel_date || '', 
            data.max_members || 4, 
            data.current_members || 1, 
            data.status || 'open', 
            JSON.stringify(data.tags || []), 
            id
        ).run();
        
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// DELETE /api/travel-mates/:id
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        await db.prepare('DELETE FROM travel_mates WHERE id=?').bind(id).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
