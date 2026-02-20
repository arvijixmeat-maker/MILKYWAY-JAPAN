import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
// import { notifications } from '../../../src/db/schema/notifications'; // Need to define schema
import { initializeLucia } from '../../lib/auth'; // Adjust path
import { getCookie } from 'hono/cookie';
import { eq, desc } from 'drizzle-orm';

// Mock schema for now if not exists, or I should define it.
// Assuming table 'notifications' exists in D1 or I need to create it.
// I'll assume I need to create the schema file too.

const app = new Hono<{ Bindings: Env }>();

// GET /api/notifications (Get my notifications)
app.get('/', async (c) => {
    // Auth check
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);
    if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    // TODO: Implement Drizzle Query
    // const db = drizzle(c.env.DB);
    // const result = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).all();

    return c.json([]); // Mock empty list
});

// POST /api/notifications (Send notification)
app.post('/', async (c) => {
    // Auth check? Internal use mostly.
    // Or Admin can send.

    const body = await c.req.json();
    // { userId, type, title, message, link }

    // Insert into DB
    console.log('Notification created:', body);

    return c.json({ success: true });
});

export default app;
