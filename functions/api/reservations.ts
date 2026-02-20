import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reservations } from '../../src/db/schema/reservations';
import { eq, desc } from 'drizzle-orm';
import { initializeLucia } from '../lib/auth';
import { getCookie } from 'hono/cookie';

// Define Env locally if global scope is not picked up
interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// GET /api/reservations
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
    let result;

    if (user.role === 'admin') {
        result = await db.select().from(reservations).orderBy(desc(reservations.createdAt)).all();
    } else {
        result = await db.select().from(reservations).where(eq(reservations.userId, user.id)).orderBy(desc(reservations.createdAt)).all();
    }

    // Parse JSON fields
    const parsed = result.map(r => ({
        ...r,
        assignedGuide: r.assignedGuideId ? JSON.parse(r.assignedGuideId) : undefined,
        dailyAccommodations: r.dailyAccommodations ? JSON.parse(r.dailyAccommodations) : undefined,
        history: r.history ? JSON.parse(r.history) : undefined,
    }));

    return c.json(parsed);
});

// GET /api/reservations/:id
app.get('/:id', async (c) => {
    const id = c.req.param('id');
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
    const result = await db.select().from(reservations).where(eq(reservations.id, id)).get();

    if (!result) return c.json({ error: 'Reservation not found' }, 404);

    // Authorization check for filtering detail view
    if (user.role !== 'admin' && result.userId !== user.id) {
        return c.json({ error: "Forbidden" }, 403);
    }

    const parsed = {
        ...result,
        assignedGuide: result.assignedGuideId ? JSON.parse(result.assignedGuideId) : undefined,
        dailyAccommodations: result.dailyAccommodations ? JSON.parse(result.dailyAccommodations) : undefined,
        history: result.history ? JSON.parse(result.history) : undefined,
    };

    return c.json(parsed);
});

// PUT /api/reservations/:id
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);

    if (!sessionId) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    // Only Admin can update reservations for now (or maybe user can cancel?)
    // For Admin Reservation Manage, it is admin only.
    if (user.role !== 'admin') {
        return c.json({ error: "Forbidden" }, 403);
    }

    const db = drizzle(c.env.DB);
    const body = await c.req.json();

    // Validate body?
    // We expect partial updates or full updates.
    // Drizzle update

    // Flatten nested objects for DB storage if needed
    const updateData: any = { ...body };
    if (body.assignedGuide) updateData.assignedGuideId = JSON.stringify(body.assignedGuide);
    if (body.dailyAccommodations) updateData.dailyAccommodations = JSON.stringify(body.dailyAccommodations);
    if (body.history) updateData.history = JSON.stringify(body.history);

    // Remove fields that are not columns if necessary (like 'assignedGuide' object itself if we store ID)
    delete updateData.assignedGuide;
    // dailyAccommodations and history are stored as JSON strings in Text columns likely?
    // Need to check schema. 
    // 'reservations' schema definition:
    // assignedGuideId: text('assigned_guide_id'), 
    // dailyAccommodations: text('daily_accommodations'),
    // history: text('history')

    await db.update(reservations).set(updateData).where(eq(reservations.id, id)).run();

    // Fetch updated
    const updated = await db.select().from(reservations).where(eq(reservations.id, id)).get();

    const parsed = {
        ...updated,
        assignedGuide: updated?.assignedGuideId ? JSON.parse(updated.assignedGuideId) : undefined,
        dailyAccommodations: updated?.dailyAccommodations ? JSON.parse(updated.dailyAccommodations) : undefined,
        history: updated?.history ? JSON.parse(updated.history) : undefined,
    };

    return c.json(parsed);
});

// POST /api/reservations
app.post('/', async (c) => {
    const body = await c.req.json();
    const db = drizzle(c.env.DB);

    // Basic validation (can be improved with Zod)
    if (!body.productName || !body.customerName) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    // Generate ID if not provided (UUID)
    const id = body.id || crypto.randomUUID();

    try {
        await db.insert(reservations).values({
            id,
            type: body.type || 'product',
            productName: body.productName,
            userId: body.userId,
            customerName: body.customerName,
            email: body.email,
            phone: body.phone,
            date: body.date,
            headcount: body.headcount,
            totalPeople: body.totalPeople || 1,
            status: body.status || 'pending_payment',
            totalAmount: body.totalAmount || 0,
            deposit: body.deposit || 0,
            depositStatus: body.depositStatus || 'unpaid',
            balance: body.balance || 0,
            balanceStatus: body.balanceStatus || 'unpaid',
            assignedGuideId: body.assignedGuide ? JSON.stringify(body.assignedGuide) : null,
            dailyAccommodations: body.dailyAccommodations ? JSON.stringify(body.dailyAccommodations) : null,
            history: body.history ? JSON.stringify(body.history) : null,
            areAssignmentsVisibleToUser: body.areAssignmentsVisibleToUser || false,
        }).run();

        return c.json({ message: 'Reservation created', id }, 201);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// DELETE /api/reservations/:id
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);

    if (!sessionId) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || user.role !== 'admin') {
        return c.json({ error: "Forbidden" }, 403);
    }

    const db = drizzle(c.env.DB);

    // Check if exists
    const existing = await db.select().from(reservations).where(eq(reservations.id, id)).get();
    if (!existing) {
        return c.json({ error: "Not found" }, 404);
    }

    await db.delete(reservations).where(eq(reservations.id, id)).run();

    return c.json({ success: true, id });
});

export default app;
