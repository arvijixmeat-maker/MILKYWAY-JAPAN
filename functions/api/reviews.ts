import { Hono } from 'hono';
import { requireAuth } from '../lib/userAuth';
import { requireAdmin } from '../lib/adminAuth';

type Variables = { user: { id: string; name?: string; email?: string; avatarUrl?: string; role?: string } };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

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

// POST /api/reviews — login required. Identity (user_id / user_name / user_avatar)
// is taken from the validated session, NOT from the request body, to prevent
// spoofing or unauthenticated/scripted submissions.
app.post('/', requireAuth, async (c) => {
    const data = await c.req.json();
    const db = c.env.DB;
    const sessionUser = c.get('user');
    const id = data.id || crypto.randomUUID();
    try {
        await db.prepare(
            "INSERT INTO reviews (id, user_id, user_name, user_avatar, product_id, product_name, rating, title, content, images, is_approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            id,
            sessionUser.id,
            sessionUser.name || sessionUser.email?.split('@')[0] || '',
            sessionUser.avatarUrl || '',
            data.product_id || '',
            data.product_name || '',
            data.rating || 5,
            data.title || '',
            data.content || '',
            JSON.stringify(data.images || []),
            // Never trust client-side is_approved — only admin should be able to flip this.
            0,
            data.created_at || new Date().toISOString()
        ).run();
        return c.json({ id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// PUT /api/reviews/:id — login required. Used by users for comments / helpful toggles
// and by admins for moderation. Sensitive fields (is_approved) are honored only when
// the requester is an admin.
app.put('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    const db = c.env.DB;
    const sessionUser = c.get('user');
    const isAdmin = sessionUser.role === 'admin';

    try {
        const fields: string[] = [];
        const binds: any[] = [];

        if (data.rating !== undefined) {
            fields.push('rating = ?');
            binds.push(data.rating || 5);
        }
        if (data.title !== undefined) {
            fields.push('title = ?');
            binds.push(data.title || '');
        }
        if (data.content !== undefined) {
            fields.push('content = ?');
            binds.push(data.content || '');
        }
        if (data.images !== undefined) {
            fields.push('images = ?');
            binds.push(JSON.stringify(data.images || []));
        }
        if (data.comments !== undefined) {
            fields.push('comments = ?');
            binds.push(typeof data.comments === 'string' ? data.comments : JSON.stringify(data.comments));
        }
        if (data.helpful_count !== undefined) {
            fields.push('helpful_count = ?');
            binds.push(data.helpful_count || 0);
        }
        if (data.helpful_users !== undefined) {
            fields.push('helpful_users = ?');
            binds.push(typeof data.helpful_users === 'string' ? data.helpful_users : JSON.stringify(data.helpful_users));
        }
        // is_approved is admin-only.
        if (data.is_approved !== undefined && isAdmin) {
            fields.push('is_approved = ?');
            binds.push(data.is_approved ? 1 : 0);
        }

        if (fields.length === 0) {
            return c.json({ success: true, updated: 0 });
        }

        binds.push(id);
        await db.prepare(`UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`).bind(...binds).run();
        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// DELETE /api/reviews/:id — admin only.
app.delete('/:id', requireAdmin, async (c) => {
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
