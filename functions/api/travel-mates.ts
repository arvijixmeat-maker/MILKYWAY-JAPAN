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
            `INSERT INTO travel_mates (
                id, user_id, user_name, user_avatar, title, content, destination, travel_date, max_members, current_members, status, tags, created_at,
                image, start_date, end_date, duration, recruit_count, gender, age_groups, region, styles, author_info, view_count, comment_count, author_name, author_image, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            data.created_at || new Date().toISOString(),
            data.image || '',
            data.start_date || '',
            data.end_date || '',
            data.duration || '',
            data.recruit_count || 4,
            data.gender || 'any',
            JSON.stringify(data.age_groups || []),
            data.region || '',
            JSON.stringify(data.styles || []),
            data.author_info || '',
            data.view_count || 0,
            data.comment_count || 0,
            data.author_name || '',
            data.author_image || '',
            data.description || ''
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
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        
        const safeKeys = [
            'title', 'content', 'destination', 'travel_date', 'max_members', 'current_members', 'status', 'tags',
            'image', 'start_date', 'end_date', 'duration', 'recruit_count', 'gender', 'age_groups', 'region', 
            'styles', 'author_info', 'view_count', 'comment_count', 'author_name', 'author_image', 'description'
        ];

        for (const key of safeKeys) {
            if (data[key] !== undefined) {
                updateFields.push(`${key}=?`);
                if (key === 'tags' || key === 'age_groups' || key === 'styles') {
                     updateValues.push(JSON.stringify(data[key]));
                } else {
                     updateValues.push(data[key]);
                }
            }
        }

        if (updateFields.length > 0) {
             updateValues.push(id);
             await db.prepare(
                 `UPDATE travel_mates SET ${updateFields.join(', ')} WHERE id=?`
             ).bind(...updateValues).run();
        }
        
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

// ===== Comments =====

const ensureCommentsTable = async (db: any) => {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS travel_mate_comments (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT DEFAULT '',
            user_image TEXT DEFAULT '',
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (post_id) REFERENCES travel_mates(id) ON DELETE CASCADE
        )
    `);
};

// GET /api/travel-mates/:id/comments
app.get('/:id/comments', async (c) => {
    const postId = c.req.param('id');
    const db = c.env.DB;
    try {
        await ensureCommentsTable(db);
        const { results } = await db.prepare(
            'SELECT * FROM travel_mate_comments WHERE post_id = ? ORDER BY created_at ASC'
        ).bind(postId).all();
        return c.json(results || []);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/travel-mates/:id/comments
app.post('/:id/comments', async (c) => {
    const postId = c.req.param('id');
    const db = c.env.DB;
    try {
        await ensureCommentsTable(db);
        const data = await c.req.json();
        const id = crypto.randomUUID();

        await db.prepare(
            `INSERT INTO travel_mate_comments (id, post_id, user_id, user_name, user_image, content) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(id, postId, data.user_id || '', data.user_name || '', data.user_image || '', data.content || '').run();

        // Increment comment_count on the post
        await db.prepare(
            `UPDATE travel_mates SET comment_count = COALESCE(comment_count, 0) + 1 WHERE id = ?`
        ).bind(postId).run();

        const newComment = await db.prepare('SELECT * FROM travel_mate_comments WHERE id = ?').bind(id).first();
        return c.json(newComment);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// DELETE /api/travel-mates/:postId/comments/:commentId
app.delete('/:postId/comments/:commentId', async (c) => {
    const postId = c.req.param('postId');
    const commentId = c.req.param('commentId');
    const db = c.env.DB;
    try {
        await db.prepare('DELETE FROM travel_mate_comments WHERE id = ? AND post_id = ?').bind(commentId, postId).run();

        // Decrement comment_count on the post
        await db.prepare(
            `UPDATE travel_mates SET comment_count = MAX(0, COALESCE(comment_count, 0) - 1) WHERE id = ?`
        ).bind(postId).run();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;

