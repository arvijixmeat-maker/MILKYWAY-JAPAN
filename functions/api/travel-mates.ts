import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { initializeLucia } from '../lib/auth';

interface Env {
    DB: any;
}

const app = new Hono<{ Bindings: Env }>();

/** Signed-in user for this request, or null. Reads are public; writes need a user. */
const sessionUser = async (c: any) => {
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);
    if (!sessionId) return null;
    const { session, user } = await lucia.validateSession(sessionId);
    return session ? user : null;
};

/** Post/comment authors and admins may change or remove it. */
const canManage = (user: any, ownerId: string | null | undefined) =>
    !!user && (user.role === 'admin' || (!!ownerId && ownerId === user.id));

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
    const user = await sessionUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const data = await c.req.json();
    const db = c.env.DB;
    const id = crypto.randomUUID();
    
    try {
        await db.prepare(
            `INSERT INTO travel_mates (
                id, user_id, user_name, user_avatar, title, content, destination, travel_date, max_members, current_members, status, tags, created_at,
                image, start_date, end_date, duration, recruit_count, gender, age_groups, region, styles, author_info, view_count, comment_count, author_name, author_image, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, 
            user.id, 
            data.user_name || user.name || '', 
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
            0,
            0,
            data.author_name || user.name || '',
            data.author_image || user.avatarUrl || '',
            data.description || ''
        ).run();
        
        return c.json({ ...data, id, user_id: user.id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// PUT /api/travel-mates/:id
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    const user = await sessionUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const post = await db.prepare('SELECT user_id FROM travel_mates WHERE id=?').bind(id).first();
    if (!post) return c.json({ error: 'Not found' }, 404);
    if (!canManage(user, post.user_id)) return c.json({ error: 'Forbidden' }, 403);
    const data = await c.req.json();
    
    try {
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        
        const safeKeys = [
            'title', 'content', 'destination', 'travel_date', 'max_members', 'current_members', 'status', 'tags',
            'image', 'start_date', 'end_date', 'duration', 'recruit_count', 'gender', 'age_groups', 'region', 
            'styles', 'author_info', 'author_name', 'author_image', 'description'
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
    const user = await sessionUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const post = await db.prepare('SELECT user_id FROM travel_mates WHERE id=?').bind(id).first();
    if (!post) return c.json({ error: 'Not found' }, 404);
    if (!canManage(user, post.user_id)) return c.json({ error: 'Forbidden' }, 403);
    try {
        await ensureCommentsTable(db);
        await db.prepare('DELETE FROM travel_mate_comments WHERE post_id=?').bind(id).run();
        await db.prepare('DELETE FROM travel_mates WHERE id=?').bind(id).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/travel-mates/:id/view — public view counter (the post itself is owner/admin-only to edit)
app.post('/:id/view', async (c) => {
    const id = c.req.param('id');
    try {
        await c.env.DB.prepare('UPDATE travel_mates SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?').bind(id).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// ===== Comments =====

const ensureCommentsTable = async (db: any) => {
    await db.prepare(`
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
    `).run();
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
    const user = await sessionUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    try {
        await ensureCommentsTable(db);
        const data = await c.req.json();
        const id = crypto.randomUUID();

        await db.prepare(
            `INSERT INTO travel_mate_comments (id, post_id, user_id, user_name, user_image, content) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(id, postId, user.id, data.user_name || user.name || '', data.user_image || user.avatarUrl || '', data.content || '').run();

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
    const user = await sessionUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    try {
        await ensureCommentsTable(db);
        const comment = await db.prepare('SELECT user_id FROM travel_mate_comments WHERE id = ? AND post_id = ?').bind(commentId, postId).first();
        if (!comment) return c.json({ error: 'Not found' }, 404);
        const post = await db.prepare('SELECT user_id FROM travel_mates WHERE id = ?').bind(postId).first();
        if (!canManage(user, comment.user_id) && !canManage(user, post?.user_id)) return c.json({ error: 'Forbidden' }, 403);

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

