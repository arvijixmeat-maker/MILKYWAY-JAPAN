import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reservations } from '../../src/db/schema/reservations';
import { eq, desc, or } from 'drizzle-orm';
import { initializeLucia } from '../lib/auth';
import { getCookie } from 'hono/cookie';
import { sendPayPalInvoice } from '../lib/paypal';

// Define Env locally if global scope is not picked up
interface Env {
    DB: any;
    BUCKET: any;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ENVIRONMENT: string;
    PAYPAL_CLIENT_ID: string;
    PAYPAL_SECRET_KEY: string;
    PAYPAL_BUSINESS_EMAIL: string;
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
        // Match by userId primarily, but also by customerEmail so guest-made
        // reservations (userId=null) with the same email appear after login.
        const conditions = user.email
            ? or(eq(reservations.userId, user.id), eq(reservations.customerEmail, user.email))
            : eq(reservations.userId, user.id);
        result = await db.select().from(reservations).where(conditions).orderBy(desc(reservations.createdAt)).all();
    }

    // Helper: safe JSON.parse
    const tryParse = (v: any) => {
        if (!v) return undefined;
        if (typeof v !== 'string') return v;
        try { return JSON.parse(v); } catch { return undefined; }
    };

    // Parse JSON fields and map to legacy frontend schema interface
    const parsed = result.map((r: any) => ({
        ...r,
        email: r.customerEmail,
        phone: r.customerPhone,
        date: r.startDate,
        headcount: `${r.travelers}名`,
        totalPeople: r.travelers,
        totalAmount: r.totalPrice,
        deposit: r.depositAmount,
        balance: r.balanceAmount,
        price_breakdown: tryParse(r.priceBreakdown) || {
            total: r.totalPrice,
            deposit: r.depositAmount,
            local: r.balanceAmount,
        },
        depositStatus: r.depositStatus || (r.status === 'confirmed' ? 'paid' : 'unpaid'),
        balanceStatus: r.balanceStatus || (r.status === 'completed' ? 'paid' : 'unpaid'),
        dailyAccommodations: tryParse(r.dailyAccommodations),
        assignedGuide: tryParse(r.assignedGuide),
        contractData: tryParse(r.contractData),
        areAssignmentsVisibleToUser: !!r.areAssignmentsVisibleToUser,
        history: tryParse(r.history) || [],
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
        price_breakdown: (() => { try { return result.priceBreakdown ? JSON.parse(result.priceBreakdown) : { total: result.totalPrice, deposit: result.depositAmount, local: result.balanceAmount }; } catch { return { total: result.totalPrice, deposit: result.depositAmount, local: result.balanceAmount }; } })(),
        depositStatus: result.depositStatus || (result.status === 'confirmed' ? 'paid' : 'unpaid'),
        balanceStatus: result.balanceStatus || (result.status === 'completed' ? 'paid' : 'unpaid'),
        dailyAccommodations: (() => { try { return result.dailyAccommodations ? JSON.parse(result.dailyAccommodations) : undefined; } catch { return undefined; } })(),
        assignedGuide: (() => { try { return result.assignedGuide ? JSON.parse(result.assignedGuide) : undefined; } catch { return undefined; } })(),
        contractData: (() => { try { return result.contractData ? JSON.parse(result.contractData) : undefined; } catch { return undefined; } })(),
        areAssignmentsVisibleToUser: !!result.areAssignmentsVisibleToUser,
        history: (() => { try { return result.history ? JSON.parse(result.history) : []; } catch { return []; } })(),
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

    // Normalize snake_case keys from admin frontend to camelCase schema keys
    const snakeToCamel: Record<string, string> = {
        deposit_status: 'depositStatus',
        balance_status: 'balanceStatus',
        contract_url: 'contractUrl',
        itinerary_url: 'itineraryUrl',
        assigned_guide: 'assignedGuide',
        daily_accommodations: 'dailyAccommodations',
        are_assignments_visible_to_user: 'areAssignmentsVisibleToUser',
        total_people: 'travelers',
        total_amount: 'totalPrice',
        deposit_amount: 'depositAmount',
        itinerary_template_id: 'itineraryTemplateId',
        contract_data: 'contractData',
        updated_at: 'updatedAt',
    };
    const normalized: any = {};
    for (const [k, v] of Object.entries(body)) {
        normalized[snakeToCamel[k] || k] = v;
    }

    // Serialize nested objects/arrays to JSON strings for TEXT columns
    const updateData: any = {};
    for (const [k, v] of Object.entries(normalized)) {
        if (v !== undefined && typeof v === 'object' && v !== null) {
            updateData[k] = JSON.stringify(v);
        } else {
            updateData[k] = v;
        }
    }

    // Known schema keys (from src/db/schema/reservations.ts)
    const schemaKeys = new Set([
        'id', 'type', 'productName', 'customerName', 'customerEmail', 'customerPhone',
        'travelers', 'startDate', 'endDate', 'status', 'totalPrice', 'depositAmount',
        'balanceAmount', 'paymentMethod', 'dailyAccommodations', 'notes', 'history',
        'userId', 'reservationNumber', 'itineraryTemplateId', 'contractData',
        'assignedGuide', 'contractUrl', 'itineraryUrl',
        'depositStatus', 'balanceStatus', 'areAssignmentsVisibleToUser', 'priceBreakdown',
        'createdAt', 'updatedAt',
    ]);
    const filtered: any = {};
    for (const [k, v] of Object.entries(updateData)) {
        if (schemaKeys.has(k)) filtered[k] = v;
    }

    if (Object.keys(filtered).length > 0) {
        await db.update(reservations).set(filtered).where(eq(reservations.id, id)).run();
    }

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
        price_breakdown: {
            total: updated?.totalPrice,
            deposit: updated?.depositAmount,
            local: updated?.balanceAmount
        },
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

    const id = body.id || crypto.randomUUID();

    // Generate sequential reservation number MN001, MN002...
    let reservationNumber = '';
    try {
        const row = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM reservations').first();
        const next = ((row?.cnt as number) || 0) + 1;
        reservationNumber = `MN${String(next).padStart(3, '0')}`;
    } catch {
        reservationNumber = `MN${Date.now().toString().slice(-4)}`;
    }

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
            reservationNumber,
        }).run();

        // Auto-send PayPal invoice — waitUntil so Worker doesn't kill the promise after response
        if (c.env.PAYPAL_CLIENT_ID && c.env.PAYPAL_SECRET_KEY && c.env.PAYPAL_BUSINESS_EMAIL) {
            const depositAmt = Number(body.price_breakdown?.deposit ?? body.deposit ?? 0);
            if (depositAmt > 0) {
                c.executionCtx.waitUntil(
                    sendPayPalInvoice({
                        clientId: c.env.PAYPAL_CLIENT_ID,
                        secret: c.env.PAYPAL_SECRET_KEY,
                        businessEmail: c.env.PAYPAL_BUSINESS_EMAIL,
                        customerEmail: String(customerEmail),
                        customerName: String(customerName),
                        reservationNumber,
                        productName: String(productName),
                        depositAmount: depositAmt,
                    }).catch((paypalErr: any) => {
                        console.error('[PayPal Invoice Error]', paypalErr);
                    })
                );
            }
        }

        return c.json({ message: 'Reservation created', id, reservationNumber }, 201);
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
