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

    // Parse JSON fields and map to legacy frontend schema interface
    const parsed = result.map(r => ({
        ...r,
        email: r.customerEmail,
        phone: r.customerPhone,
        date: r.startDate,
        headcount: `${r.travelers}名`,
        totalPeople: r.travelers,
        totalAmount: r.totalPrice,
        deposit: r.depositAmount,
        balance: r.balanceAmount,
        depositStatus: r.status === 'confirmed' ? 'paid' : 'unpaid',
        balanceStatus: r.status === 'completed' ? 'paid' : 'unpaid',
        dailyAccommodations: r.dailyAccommodations ? JSON.parse(r.dailyAccommodations) : undefined,
        history: r.history ? JSON.parse(r.history) : undefined,
    }));

    return c.json(parsed);
});

// GET /api/reservations/:id
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = drizzle(c.env.DB);
    const result = await db.select().from(reservations).where(eq(reservations.id, id)).get();

    if (!result) return c.json({ error: 'Reservation not found' }, 404);

    // If the reservation belongs to a specific user, enforce auth
    if (result.userId !== null) {
        const lucia = initializeLucia(c.env.DB);
        const sessionId = getCookie(c, lucia.sessionCookieName);
        
        if (!sessionId) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        const { session, user } = await lucia.validateSession(sessionId);
        if (!session) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        if (user.role !== 'admin' && result.userId !== user.id) {
            return c.json({ error: "Forbidden" }, 403);
        }
    }
    // If userId is null (guest reservation), allow public access since the UUID is practically unguessable.

    const parsed = {
        ...result,
        email: result.customerEmail,
        phone: result.customerPhone,
        date: result.startDate,
        headcount: `${result.travelers}名`,
        totalPeople: result.travelers,
        totalAmount: result.totalPrice,
        deposit: result.depositAmount,
        balance: result.balanceAmount,
        depositStatus: result.status === 'confirmed' ? 'paid' : 'unpaid',
        balanceStatus: result.status === 'completed' ? 'paid' : 'unpaid',
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
    if (body.dailyAccommodations) updateData.dailyAccommodations = JSON.stringify(body.dailyAccommodations);
    if (body.history) updateData.history = JSON.stringify(body.history);

    await db.update(reservations).set(updateData).where(eq(reservations.id, id)).run();

    // Fetch updated
    const updated = await db.select().from(reservations).where(eq(reservations.id, id)).get();

    const parsed = {
        ...updated!,
        email: updated?.customerEmail,
        phone: updated?.customerPhone,
        date: updated?.startDate,
        headcount: `${updated?.travelers}名`,
        totalPeople: updated?.travelers,
        totalAmount: updated?.totalPrice,
        deposit: updated?.depositAmount,
        balance: updated?.balanceAmount,
        depositStatus: updated?.status === 'confirmed' ? 'paid' : 'unpaid',
        balanceStatus: updated?.status === 'completed' ? 'paid' : 'unpaid',
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
    const productName = body.product_name || body.productName;
    const customerInfo = body.customer_info || {};
    const customerName = customerInfo.name || body.customerName;
    const customerEmail = customerInfo.email || body.email;
    const customerPhone = customerInfo.phone || body.phone;

    if (!productName || !customerName) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    // Generate ID if not provided (UUID)
    const id = body.id || crypto.randomUUID();

    try {
        await db.insert(reservations).values({
            id,
            type: body.type ? String(body.type) : 'tour',
            productName: String(productName),
            userId: (body.user_id || body.userId) ? String(body.user_id || body.userId) : null,
            customerName: String(customerName),
            customerEmail: String(customerEmail),
            customerPhone: String(customerPhone),
            travelers: Number(body.total_people || body.totalPeople || 1),
            startDate: (body.start_date || body.date) ? String(body.start_date || body.date) : null,
            endDate: body.end_date ? String(body.end_date) : null,
            status: body.status ? String(body.status) : 'pending_payment',
            totalPrice: Number(body.price_breakdown?.total ?? body.totalAmount ?? 0),
            depositAmount: Number(body.price_breakdown?.deposit ?? body.deposit ?? 0),
            balanceAmount: Number(body.price_breakdown?.local ?? body.balance ?? 0),
            paymentMethod: body.paymentMethod ? String(body.paymentMethod) : null,
            notes: body.notes ? String(body.notes) : null,
            dailyAccommodations: body.dailyAccommodations ? JSON.stringify(body.dailyAccommodations) : null,
            history: body.history ? JSON.stringify(body.history) : null,
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
