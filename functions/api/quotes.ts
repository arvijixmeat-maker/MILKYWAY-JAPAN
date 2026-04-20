import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { quotes } from '../../src/db/schema';
import { initializeLucia } from '../lib/auth';
import { getCookie } from 'hono/cookie';
import { eq, desc } from 'drizzle-orm';

// Define Env locally if global scope is not picked up
interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// GET /api/quotes
app.get('/', async (c) => {
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);

    if (!sessionId) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const db = drizzle(c.env.DB);

    // Admin gets all, User gets theirs
    let result;
    if (user.role === 'admin') {
        result = await db.select().from(quotes).orderBy(desc(quotes.createdAt)).all();
    } else {
        result = await db.select().from(quotes).where(eq(quotes.userId, user.id)).orderBy(desc(quotes.createdAt)).all();
    }

    // Parse JSON fields if any (e.g. travel details)
    const parsed = result.map(q => ({
        ...q,
        // Add parsing logic if fields are JSON strings
    }));

    return c.json(parsed);
});

// POST /api/quotes (Create new quote — no auth required, guests can submit)
app.post('/', async (c) => {
    try {
        const body = await c.req.json();

        if (!body.name || !body.type) {
            return c.json({ error: 'Missing required fields: name, type' }, 400);
        }

        const db = drizzle(c.env.DB);
        const id = crypto.randomUUID();

        await db.insert(quotes).values({
            id,
            userId: body.user_id || null,
            type: body.type,
            name: body.name,
            phone: body.phone || null,
            email: body.email || null,
            destination: body.destination || null,
            headcount: body.headcount || null,
            period: body.period || null,
            budget: body.budget || null,
            travelTypes: Array.isArray(body.travel_types)
                ? JSON.stringify(body.travel_types)
                : (body.travel_types || null),
            accommodations: Array.isArray(body.accommodations)
                ? JSON.stringify(body.accommodations)
                : (body.accommodations || null),
            vehicle: body.vehicle || null,
            additionalRequest: body.additional_request || null,
            status: body.status || 'new',
            createdAt: body.created_at || new Date().toISOString(),
        }).run();

        return c.json({ id, success: true });
    } catch (e: any) {
        console.error('[Quotes POST Error]', e);
        const cause = e?.cause?.message || e?.cause || '';
        const msg = cause ? String(cause) : (e?.message?.split('\n')[0] || 'Internal server error');
        return c.json({ error: msg }, 500);
    }
});

// PUT /api/quotes/:id
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    // Auth check
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);
    if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || user.role !== 'admin') return c.json({ error: "Forbidden" }, 403);

    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    // Update
    await db.update(quotes).set({
        ...body,
        updatedAt: new Date().toISOString() // Ensure camelCase vs snake_case matches schema
    }).where(eq(quotes.id, id)).run();

    return c.json({ success: true });
});

// DELETE /api/quotes/:id
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    // Auth check
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);
    if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || user.role !== 'admin') return c.json({ error: "Forbidden" }, 403);

    const db = drizzle(c.env.DB);
    await db.delete(quotes).where(eq(quotes.id, id)).run();

    return c.json({ success: true });
});

export default app;
