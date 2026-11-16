import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reservations } from '../../src/db/schema/reservations';
import { eq, desc, or } from 'drizzle-orm';
import { initializeLucia } from '../lib/auth';
import { getCookie } from 'hono/cookie';
import { issueReservationInvoice, missingPayPalEnv, readInvoice } from '../lib/reservationInvoice';
import { requireAdmin } from '../lib/adminAuth';
import { getSessionUser } from '../lib/userAuth';

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
    PAYPAL_ENVIRONMENT?: string;
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

        // Same visibility as the list: the owner, or the account whose e-mail the booking carries.
        const sameEmail = !!user.email && !!result.customerEmail
            && user.email.trim().toLowerCase() === result.customerEmail.trim().toLowerCase();
        if (user.role !== 'admin' && result.userId !== user.id && !sameEmail) {
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
        product_id: 'productId',
        are_assignments_visible_to_user: 'areAssignmentsVisibleToUser',
        total_people: 'travelers',
        total_amount: 'totalPrice',
        deposit_amount: 'depositAmount',
        itinerary_template_id: 'itineraryTemplateId',
        contract_data: 'contractData',
        document_content: 'documentContent',
        start_date: 'startDate',
        end_date: 'endDate',
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
        'travelers', 'startDate', 'endDate', 'duration', 'status', 'totalPrice', 'depositAmount',
        'balanceAmount', 'paymentMethod', 'dailyAccommodations', 'notes', 'history',
        'userId', 'reservationNumber', 'itineraryTemplateId', 'contractData',
        'assignedGuide', 'contractUrl', 'itineraryUrl',
        'depositStatus', 'balanceStatus', 'areAssignmentsVisibleToUser', 'priceBreakdown',
        'documentContent', 'source', 'productId',
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

// POST /api/reservations — signed-in customers (booking flow) and admins (manual entry)
app.post('/', async (c) => {
    const user = await getSessionUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const isAdmin = user.role === 'admin';

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

    // 견적에서 만드는 예약 — 같은 견적으로 예약(과 PayPal 청구서)이 두 번 만들어지지 않게 막는다.
    // (예전엔 고객이 결제 페이지에서 예약 → 견적 상태 변경이 권한 부족으로 실패 → 관리자가 또 전환 → 청구서 2장)
    const quoteId = body.quote_id || body.quoteId ? String(body.quote_id || body.quoteId) : '';
    if (quoteId) {
        const q: any = await c.env.DB.prepare('SELECT id, status, user_id FROM quotes WHERE id = ?').bind(quoteId).first();
        if (!q) return c.json({ error: 'Quote not found' }, 404);
        if (q.status === 'converted') return c.json({ error: 'この見積はすでに予約に変換されています。(이미 예약으로 전환된 견적입니다 — 통합 예약관리에서 해당 예약을 확인하세요)', code: 'already_converted' }, 409);
        if (!isAdmin && q.user_id && q.user_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
    }

    // Customers book for themselves as a new, unpaid request; only admins choose these fields.
    const id = (isAdmin && body.id) || crypto.randomUUID();
    const rawDocumentContent = body.document_content || body.documentContent;

    // Generate the next number from the historical maximum so deleted rows
    // never cause a PayPal invoice number to be reused.
    let reservationNumber = '';
    try {
        const row = await c.env.DB.prepare(`
            SELECT COALESCE(MAX(CAST(SUBSTR(reservation_number, 3) AS INTEGER)), 0) AS max_num
            FROM reservations
        `).first();
        const next = Number(row?.max_num || 0) + 1;
        reservationNumber = `MN${String(next).padStart(3, '0')}`;
    } catch (numberError) {
        console.warn('[Reservation Number] max lookup failed; using timestamp fallback', numberError);
        reservationNumber = `MN${Date.now().toString().slice(-4)}`;
    }

    try {
        await db.insert(reservations).values({
            id,
            type: body.type ? String(body.type) : 'tour',
            productName: String(productName),
            productId: (body.product_id || body.productId) ? String(body.product_id || body.productId) : null,
            userId: isAdmin
                ? ((body.user_id || body.userId) ? String(body.user_id || body.userId) : null)
                : user.id,
            customerName: String(customerName),
            customerEmail: String(customerEmail),
            customerPhone: String(customerPhone),
            travelers: Number(body.total_people || body.totalPeople || 1),
            startDate: (body.start_date || body.date) ? String(body.start_date || body.date) : null,
            endDate: body.end_date ? String(body.end_date) : null,
            duration: body.duration ? String(body.duration) : null,
            status: isAdmin && body.status ? String(body.status) : 'pending_payment',
            source: isAdmin && body.source ? String(body.source) : null,
            totalPrice: Number(body.price_breakdown?.total ?? body.totalAmount ?? 0),
            depositAmount: Number(body.price_breakdown?.deposit ?? body.deposit ?? 0),
            balanceAmount: Number(body.price_breakdown?.local ?? body.balance ?? 0),
            paymentMethod: body.paymentMethod ? String(body.paymentMethod) : null,
            notes: body.notes ? String(body.notes) : null,
            dailyAccommodations: body.dailyAccommodations ? JSON.stringify(body.dailyAccommodations) : null,
            history: isAdmin && body.history ? JSON.stringify(body.history) : null,
            itineraryTemplateId: isAdmin && (body.itinerary_template_id || body.itineraryTemplateId)
                ? String(body.itinerary_template_id || body.itineraryTemplateId)
                : null,
            documentContent: isAdmin && rawDocumentContent
                ? (typeof rawDocumentContent === 'string' ? rawDocumentContent : JSON.stringify(rawDocumentContent))
                : null,
            reservationNumber,
        }).run();

        // 견적 → 예약 전환 완료 표시 (서버에서 처리 — 고객 계정으로는 견적을 수정할 수 없으므로)
        if (quoteId) {
            try {
                await c.env.DB.prepare("UPDATE quotes SET status = 'converted', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), quoteId).run();
            } catch (quoteErr) {
                console.error('[Reservation] quote status update failed', quoteErr);
            }
        }

        // 예약금 PayPal 청구서 — 예약당 한 장. 메일이 없는 고객은 결제 링크만 만든다.
        const missingPayPal = missingPayPalEnv(c.env);
        const depositAmt = Number(body.price_breakdown?.deposit ?? body.deposit ?? 0);

        if (missingPayPal.length > 0) {
            console.warn(`[PayPal Invoice] skipped: missing ${missingPayPal.join(', ')}`);
        } else if (!Number.isFinite(depositAmt) || depositAmt <= 0) {
            console.warn(`[PayPal Invoice] skipped: deposit amount is ${depositAmt || 0} (${reservationNumber})`);
        } else {
            const invoicePromise = issueReservationInvoice(c.env, c.env.DB, id).then(({ invoice, reason }) => {
                if (invoice) console.log(`[PayPal Invoice] sent: ${invoice.invoiceNumber} (${invoice.invoiceId})${customerEmail ? '' : ' — link only (no email)'}`);
                else console.warn(`[PayPal Invoice] skipped: ${reason} (${reservationNumber})`);
            }).catch((paypalErr: any) => {
                console.error(`[PayPal Invoice] failed: ${reservationNumber}`, paypalErr);
            });

            try {
                c.executionCtx.waitUntil(
                    invoicePromise
                );
            } catch (waitUntilError) {
                // The promise has already started. Keep the successful INSERT
                // response even if this runtime cannot register waitUntil.
                console.warn('[PayPal Invoice] waitUntil unavailable; continuing in background', waitUntilError);
                void invoicePromise;
            }
        }

        return c.json({ message: 'Reservation created', id, reservationNumber }, 201);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// DELETE /api/reservations/:id
// POST /api/reservations/:id/paypal-invoice (관리자) — 예약금 결제 링크를 돌려준다.
// 이미 청구서가 있으면 그 링크를 그대로(새로 만들지 않음), 없으면 그때 만든다.
// 인스타·페이스북 고객에게 DM 으로 결제 링크를 보내거나, 예전에 메일이 없어 청구서가 빠진 예약을 보완할 때 쓴다.
app.post('/:id/paypal-invoice', requireAdmin, async (c) => {
    const id = c.req.param('id');
    try {
        const { invoice, created, reason } = await issueReservationInvoice(c.env, c.env.DB, id);
        if (!invoice) {
            const msg = reason === 'no_deposit' ? '예약금이 0원이라 청구서를 만들 수 없습니다.'
                : reason === 'not_found' ? '예약을 찾을 수 없습니다.'
                    : `PayPal 설정이 없어 청구서를 만들 수 없습니다 (${reason}).`;
            return c.json({ error: msg, reason }, reason === 'not_found' ? 404 : 400);
        }
        return c.json({ ...invoice, created });
    } catch (e: any) {
        console.error('[PayPal Invoice] admin issue failed', e);
        return c.json({ error: e?.message || 'PayPal 청구서 생성 실패' }, 500);
    }
});

// GET /api/reservations/:id/paypal-invoice (관리자) — 저장된 청구서 정보만 조회 (만들지 않음)
app.get('/:id/paypal-invoice', requireAdmin, async (c) => {
    const row: any = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json({ invoice: readInvoice(row) });
});

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
