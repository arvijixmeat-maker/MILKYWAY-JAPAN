import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reservations } from '../../src/db/schema/reservations';
import { eq, desc, or } from 'drizzle-orm';
import { initializeLucia } from '../lib/auth';
import { getCookie } from 'hono/cookie';
import { sendPayPalInvoice } from '../lib/paypal';
import { getReservationDeposit } from '../../src/lib/tourPricing';

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

const parseArray = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const amount = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};

async function resolveReservationPrice(db: any, body: any, user: { id: string; role?: string }) {
    const people = Number(body.total_people || body.totalPeople);
    if (!Number.isInteger(people) || people < 1) {
        return { error: '予約人数が正しくありません。' } as const;
    }

    if (body.type === 'quote') {
        const quoteId = String(body.quote_id || body.quoteId || '');
        if (!quoteId) return { error: 'お見積りIDが必要です。' } as const;

        const quote: any = await db.prepare(
            'SELECT id, user_id, confirmed_price FROM quotes WHERE id = ?'
        ).bind(quoteId).first();
        if (!quote) return { error: 'お見積りが見つかりません。' } as const;
        if (user.role !== 'admin' && quote.user_id && quote.user_id !== user.id) {
            return { error: 'このお見積りを予約する権限がありません。' } as const;
        }

        const total = amount(quote.confirmed_price);
        if (total <= 0) return { error: '確定済みのお見積り金額が必要です。' } as const;
        const deposit = getReservationDeposit(total);
        return {
            people,
            productName: String(body.product_name || body.productName || 'オーダーメイド旅行'),
            productId: null,
            priceBreakdown: { total, deposit, local: total - deposit },
        } as const;
    }

    const productId = String(body.product_id || body.productId || '');
    if (!productId && user.role === 'admin') {
        const total = amount(body.price_breakdown?.total ?? body.total_price ?? body.totalPrice);
        if (total <= 0) return { error: '合計金額を入力してください。' } as const;
        const deposit = getReservationDeposit(total);
        return {
            people,
            productName: String(body.product_name || body.productName || 'オーダーメイド旅行'),
            productId: null,
            priceBreakdown: { total, deposit, local: total - deposit },
        } as const;
    }
    if (!productId) return { error: '商品IDが必要です。' } as const;

    const product: any = await db.prepare(
        'SELECT id, name, pricing_options, accommodation_options, vehicle_options FROM products WHERE id = ?'
    ).bind(productId).first();
    if (!product) return { error: '商品が見つかりません。' } as const;

    const pricing = parseArray(product.pricing_options);
    const tier = pricing.find((option) => Number(option?.people) === people);
    const pricePerPerson = amount(tier?.pricePerPerson);
    if (!tier || pricePerPerson <= 0) return { error: `${people}名様の料金を確認できません。` } as const;

    const resolveModifier = (rawOptions: unknown, selectedId: unknown, label: string) => {
        const id = String(selectedId || '');
        if (!id) return { value: 0 };
        const option = parseArray(rawOptions).find((item) => String(item?.id) === id);
        if (!option) return { error: `選択した${label}オプションを確認できません。` };
        return { value: amount(option.priceModifier) };
    };

    const accommodation = resolveModifier(
        product.accommodation_options,
        body.selected_accom_id || body.selectedAccomId,
        '宿泊',
    );
    if ('error' in accommodation) return { error: accommodation.error } as const;
    const vehicle = resolveModifier(
        product.vehicle_options,
        body.selected_vehicle_id || body.selectedVehicleId,
        '車両',
    );
    if ('error' in vehicle) return { error: vehicle.error } as const;

    const total = Math.max(0, pricePerPerson * people + accommodation.value + vehicle.value);
    const deposit = getReservationDeposit(total);
    return {
        people,
        productName: String(product.name),
        productId: String(product.id),
        priceBreakdown: { total, deposit, local: total - deposit },
    } as const;
}

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

// POST /api/reservations
app.post('/', async (c) => {
    const body = await c.req.json();
    const db = drizzle(c.env.DB);

    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);
    if (!sessionId) return c.json({ error: 'Unauthorized' }, 401);
    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) return c.json({ error: 'Unauthorized' }, 401);

    const customerInfo = body.customer_info || {};
    const customerName = customerInfo.name || body.customer_name || body.customerName;
    const customerEmail = customerInfo.email || body.customer_email || body.email;
    const customerPhone = customerInfo.phone || body.customer_phone || body.phone;

    if (!customerName || (user.role !== 'admin' && (!customerEmail || !customerPhone))) {
        return c.json({ error: 'お名前、メールアドレス、携帯電話番号を入力してください。' }, 400);
    }

    const serverPricing = await resolveReservationPrice(c.env.DB, body, user);
    if ('error' in serverPricing) {
        return c.json({ error: serverPricing.error }, 400);
    }
    const { productName, productId, people, priceBreakdown } = serverPricing;
    const reservationUserId = user.role === 'admin'
        ? ((body.user_id || body.userId) ? String(body.user_id || body.userId) : null)
        : user.id;

    const requestedId = String(body.id || '');
    const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedId)
        ? requestedId
        : crypto.randomUUID();

    // 같은 결제 화면에서 재시도한 요청은 기존 예약을 반환해 인보이스 중복 생성을 막는다.
    const existing = await db.select().from(reservations).where(eq(reservations.id, id)).get();
    if (existing) {
        if (user.role !== 'admin' && existing.userId !== user.id) return c.json({ error: 'Conflict' }, 409);
        return c.json({
            message: 'Reservation already created',
            id: existing.id,
            reservationNumber: existing.reservationNumber,
            priceBreakdown: {
                total: existing.totalPrice,
                deposit: existing.depositAmount,
                local: existing.balanceAmount,
            },
        }, 200);
    }

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
            type: body.type === 'quote' ? 'quote' : 'tour',
            productName: String(productName),
            productId,
            userId: reservationUserId,
            customerName: String(customerName),
            customerEmail: customerEmail ? String(customerEmail) : null,
            customerPhone: customerPhone ? String(customerPhone) : null,
            travelers: people,
            startDate: (body.start_date || body.date) ? String(body.start_date || body.date) : null,
            endDate: body.end_date ? String(body.end_date) : null,
            duration: body.duration ? String(body.duration) : null,
            status: user.role === 'admin' && body.status ? String(body.status) : 'pending_payment',
            source: user.role === 'admin' && body.source ? String(body.source) : 'website',
            totalPrice: priceBreakdown.total,
            depositAmount: priceBreakdown.deposit,
            balanceAmount: priceBreakdown.local,
            priceBreakdown: JSON.stringify(priceBreakdown),
            paymentMethod: 'paypal_invoice',
            notes: body.notes ? String(body.notes) : null,
            dailyAccommodations: body.dailyAccommodations ? JSON.stringify(body.dailyAccommodations) : null,
            history: body.history ? JSON.stringify(body.history) : null,
            itineraryTemplateId: (body.itinerary_template_id || body.itineraryTemplateId)
                ? String(body.itinerary_template_id || body.itineraryTemplateId)
                : null,
            documentContent: body.document_content
                ? (typeof body.document_content === 'string' ? body.document_content : JSON.stringify(body.document_content))
                : body.documentContent
                    ? (typeof body.documentContent === 'string' ? body.documentContent : JSON.stringify(body.documentContent))
                    : null,
            reservationNumber,
        }).run();

        const missingPayPalEnv = [
            !c.env.PAYPAL_CLIENT_ID && 'PAYPAL_CLIENT_ID',
            !c.env.PAYPAL_SECRET_KEY && 'PAYPAL_SECRET_KEY',
            !c.env.PAYPAL_BUSINESS_EMAIL && 'PAYPAL_BUSINESS_EMAIL',
        ].filter(Boolean);
        const depositAmt = priceBreakdown.deposit;

        if (missingPayPalEnv.length > 0) {
            console.warn(`[PayPal Invoice] skipped: missing ${missingPayPalEnv.join(', ')}`);
        } else if (user.role === 'admin' && body.status && body.status !== 'pending_payment') {
            console.info(`[PayPal Invoice] skipped for admin-created ${body.status} reservation (${reservationNumber})`);
        } else if (!customerEmail) {
            console.warn(`[PayPal Invoice] skipped: customer email is missing (${reservationNumber})`);
        } else if (!Number.isFinite(depositAmt) || depositAmt <= 0) {
            console.warn(`[PayPal Invoice] skipped: deposit amount is ${depositAmt || 0} (${reservationNumber})`);
        } else {
            const invoicePromise = sendPayPalInvoice({
                clientId: c.env.PAYPAL_CLIENT_ID,
                secret: c.env.PAYPAL_SECRET_KEY,
                businessEmail: c.env.PAYPAL_BUSINESS_EMAIL,
                customerEmail: String(customerEmail),
                customerName: String(customerName),
                reservationNumber,
                productName: String(productName),
                depositAmount: depositAmt,
                environment: c.env.PAYPAL_ENVIRONMENT,
            }).then(async ({ invoiceId, invoiceNumber, recipientViewUrl }) => {
                console.log(`[PayPal Invoice] sent: ${invoiceNumber} (${invoiceId})`);
                const saved = await db.select().from(reservations).where(eq(reservations.id, id)).get();
                let history: any[] = [];
                try {
                    history = saved?.history ? JSON.parse(saved.history) : [];
                } catch {
                    history = [];
                }
                if (!history.some((item) => item.type === 'paypal_invoice_sent')) {
                    const timestamp = new Date().toISOString();
                    history.push({
                        type: 'paypal_invoice_sent',
                        timestamp,
                        date: timestamp,
                        description: 'PayPal請求書をメールで送信しました。',
                        detail: recipientViewUrl || '',
                        invoiceId,
                        invoiceNumber,
                    });
                    await db.update(reservations)
                        .set({ history: JSON.stringify(history) })
                        .where(eq(reservations.id, id))
                        .run();
                }
            }).catch(async (paypalErr: any) => {
                console.error(`[PayPal Invoice] failed: ${reservationNumber}`, paypalErr);
                try {
                    const saved = await db.select().from(reservations).where(eq(reservations.id, id)).get();
                    let history: any[] = [];
                    try {
                        history = saved?.history ? JSON.parse(saved.history) : [];
                    } catch {
                        history = [];
                    }
                    const timestamp = new Date().toISOString();
                    history.push({
                        type: 'paypal_invoice_failed',
                        timestamp,
                        date: timestamp,
                        description: 'PayPal請求書を送信できませんでした。担当者が確認します。',
                    });
                    await db.update(reservations)
                        .set({ history: JSON.stringify(history) })
                        .where(eq(reservations.id, id))
                        .run();
                } catch (historyError) {
                    console.error(`[PayPal Invoice] failed to record error: ${reservationNumber}`, historyError);
                }
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

        return c.json({ message: 'Reservation created', id, reservationNumber, priceBreakdown }, 201);
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
