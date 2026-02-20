import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { quotes } from '../../db/schema'; // Ensure this exists or use placeholder
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
