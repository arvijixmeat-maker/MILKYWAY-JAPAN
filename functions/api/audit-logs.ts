import { Hono } from 'hono';
import { requireAdmin } from '../lib/adminAuth';

interface Env {
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/audit-logs?entity_type=reservation&entity_id=...
// Operational snapshots intentionally omit customer contact details.
app.get('/', requireAdmin, async (c) => {
    const entityType = c.req.query('entity_type');
    const entityId = c.req.query('entity_id');
    const requestedLimit = Number(c.req.query('limit') || 100);
    const limit = Math.min(Math.max(Number.isInteger(requestedLimit) ? requestedLimit : 100, 1), 500);

    const clauses: string[] = [];
    const values: unknown[] = [];
    if (entityType) {
        if (!['reservation', 'quote', 'accommodation', 'migration'].includes(entityType)) {
            return c.json({ error: 'Invalid entity_type' }, 400);
        }
        clauses.push('entity_type = ?');
        values.push(entityType);
    }
    if (entityId) {
        clauses.push('entity_id = ?');
        values.push(entityId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await c.env.DB.prepare(`
        SELECT id, entity_type, entity_id, action, actor_id, actor_role,
               previous_data, next_data, metadata, created_at
        FROM audit_logs
        ${where}
        ORDER BY created_at DESC
        LIMIT ?
    `).bind(...values, limit).all();

    const parse = (value: unknown) => {
        if (typeof value !== 'string' || !value) return null;
        try { return JSON.parse(value); } catch { return null; }
    };

    return c.json((result.results || []).map((row: any) => ({
        ...row,
        previous_data: parse(row.previous_data),
        next_data: parse(row.next_data),
        metadata: parse(row.metadata),
    })));
});

export default app;
