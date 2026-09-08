import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reservations } from '../../src/db/schema/reservations';
import { eq, desc, or } from 'drizzle-orm';
import { initializeLucia } from '../lib/auth';
import { getCookie } from 'hono/cookie';
import { sendPayPalInvoice } from '../lib/paypal';
import { requireAdmin } from '../lib/adminAuth';
import { requireAuth } from '../lib/userAuth';
import { writeAuditLogSafely } from '../lib/audit';
import {
    assertReservationTransition,
    calculateAuthoritativeProductPrice,
    normalizeIdempotencyKey,
    normalizeReservationStatus,
    OperationsValidationError,
    validateManualPrice,
} from '../lib/operations';

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

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

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
app.get('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const db = drizzle(c.env.DB);
    const result = await db.select().from(reservations).where(eq(reservations.id, id)).get();

    if (!result) return c.json({ error: 'Reservation not found' }, 404);

    const user = c.get('user');
    const ownsReservation = result.userId === user.id
        || (!!user.email && result.customerEmail === user.email);
    if (user.role !== 'admin' && !ownsReservation) {
        return c.json({ error: 'Forbidden' }, 403);
    }

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
app.put('/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const existing = await db.select().from(reservations).where(eq(reservations.id, id)).get();
    if (!existing) return c.json({ error: 'Reservation not found' }, 404);

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
        quote_id: 'quoteId',
        price_source: 'priceSource',
        price_verified_at: 'priceVerifiedAt',
    };
    const normalized: any = {};
    for (const [k, v] of Object.entries(body)) {
        normalized[snakeToCamel[k] || k] = v;
    }

    try {
        if (Object.prototype.hasOwnProperty.call(normalized, 'status')) {
            normalized.status = assertReservationTransition(existing.status, normalized.status);
        }
        const priceFields = ['totalPrice', 'depositAmount', 'balanceAmount', 'priceBreakdown'];
        if (priceFields.some((field) => Object.prototype.hasOwnProperty.call(normalized, field))) {
            let submittedBreakdown = normalized.priceBreakdown;
            if (typeof submittedBreakdown === 'string') {
                try { submittedBreakdown = JSON.parse(submittedBreakdown); } catch { submittedBreakdown = {}; }
            }
            const checked = validateManualPrice({
                total: normalized.totalPrice ?? submittedBreakdown?.total ?? existing.totalPrice,
                deposit: normalized.depositAmount ?? submittedBreakdown?.deposit ?? existing.depositAmount,
            });
            normalized.totalPrice = checked.total;
            normalized.depositAmount = checked.deposit;
            normalized.balanceAmount = checked.local;
            normalized.priceBreakdown = checked;
            normalized.priceSource = 'admin_manual';
            normalized.priceVerifiedAt = new Date().toISOString();
        }
    } catch (error) {
        if (error instanceof OperationsValidationError) return c.json({ error: error.message }, 400);
        throw error;
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
        'documentContent', 'source', 'productId', 'quoteId', 'priceSource', 'priceVerifiedAt',
        'createdAt', 'updatedAt',
    ]);
    const filtered: any = {};
    for (const [k, v] of Object.entries(updateData)) {
        if (schemaKeys.has(k)) filtered[k] = v;
    }

    if (Object.keys(filtered).length > 0) {
        filtered.updatedAt = new Date().toISOString();
        await db.update(reservations).set(filtered).where(eq(reservations.id, id)).run();
    }

    // Fetch updated
    const updated = await db.select().from(reservations).where(eq(reservations.id, id)).get();

    const actor = c.get('user');
    await writeAuditLogSafely(c.env.DB, {
        entityType: 'reservation', entityId: id, action: 'update',
        actorId: actor?.id, actorRole: actor?.role,
        before: existing, after: updated,
        metadata: { changedFields: Object.keys(filtered) },
    });

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
        depositStatus: updated?.depositStatus || (updated?.status === 'confirmed' ? 'paid' : 'unpaid'),
        balanceStatus: updated?.balanceStatus || (updated?.status === 'completed' ? 'paid' : 'unpaid'),
        dailyAccommodations: updated?.dailyAccommodations ? JSON.parse(updated.dailyAccommodations) : undefined,
        history: updated?.history ? JSON.parse(updated.history) : undefined,
    };

    return c.json(parsed);
});

// POST /api/reservations
app.post('/', requireAuth, async (c) => {
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

    const actor = c.get('user');
    const cleanCustomerEmail = customerEmail ? String(customerEmail).trim() : null;
    const cleanCustomerPhone = customerPhone ? String(customerPhone).trim() : null;
    if (actor.role !== 'admin' && (!cleanCustomerEmail || !cleanCustomerPhone)) {
        return c.json({ error: 'Customer email and phone are required' }, 400);
    }
    const reservationType = body.type ? String(body.type) : 'tour';
    const productId = (body.product_id || body.productId) ? String(body.product_id || body.productId) : null;
    const quoteId = (body.quote_id || body.quoteId) ? String(body.quote_id || body.quoteId) : null;
    const travelers = Number(body.total_people || body.totalPeople || 1);
    let resolvedProductName = String(productName);
    let idempotencyKey: string | null;
    let authoritativePrice: { total: number; deposit: number; local: number };
    let priceSource: 'product_catalog' | 'quote' | 'admin_manual';
    let sourceQuoteBefore: Record<string, unknown> | null = null;

    try {
        idempotencyKey = normalizeIdempotencyKey(
            c.req.header('Idempotency-Key') || body.idempotency_key || body.idempotencyKey,
        );

        if (idempotencyKey) {
            const duplicate: any = await c.env.DB.prepare(
                'SELECT id, quote_id, reservation_number, total_price, deposit_amount, balance_amount FROM reservations WHERE idempotency_key = ?',
            ).bind(idempotencyKey).first();
            if (duplicate) {
                if (duplicate.quote_id) {
                    await c.env.DB.prepare(
                        "UPDATE quotes SET status = 'converted', updated_at = ? WHERE id = ? AND status <> 'converted'",
                    ).bind(new Date().toISOString(), duplicate.quote_id).run();
                }
                return c.json({
                    message: 'Reservation already created',
                    id: duplicate.id,
                    reservationNumber: duplicate.reservation_number,
                    priceBreakdown: {
                        total: Number(duplicate.total_price || 0),
                        deposit: Number(duplicate.deposit_amount || 0),
                        local: Number(duplicate.balance_amount || 0),
                    },
                    idempotentReplay: true,
                }, 200);
            }
        }

        if (reservationType === 'tour' && productId) {
            const product: any = await c.env.DB.prepare(`
                SELECT id, name, status, price, pricing_options, accommodation_options, vehicle_options
                FROM products WHERE id = ?
            `).bind(productId).first();
            if (!product || product.status !== 'active') {
                return c.json({ error: 'Product is unavailable' }, 409);
            }
            resolvedProductName = String(product.name);
            authoritativePrice = calculateAuthoritativeProductPrice(product, {
                people: travelers,
                accommodationId: body.selected_accommodation_id || body.selectedAccommodationId,
                vehicleId: body.selected_vehicle_id || body.selectedVehicleId,
            });
            priceSource = 'product_catalog';
        } else if (reservationType === 'quote' && quoteId) {
            const quote: any = await c.env.DB.prepare(`
                SELECT id, user_id, confirmed_price, deposit, status FROM quotes WHERE id = ?
            `).bind(quoteId).first();
            if (!quote) return c.json({ error: 'Quote not found' }, 404);
            sourceQuoteBefore = quote;
            if (actor.role !== 'admin' && quote.user_id !== actor.id) {
                return c.json({ error: 'Forbidden' }, 403);
            }
            if (Number(quote.confirmed_price) > 0) {
                authoritativePrice = validateManualPrice({
                    total: quote.confirmed_price,
                    deposit: quote.deposit || 0,
                });
            } else if (actor.role === 'admin') {
                authoritativePrice = validateManualPrice(body.price_breakdown || {
                    total: body.totalAmount,
                    deposit: body.deposit,
                });
            } else {
                return c.json({ error: 'Quote price is not confirmed' }, 409);
            }
            priceSource = 'quote';
        } else if (actor.role === 'admin') {
            // Phone/LINE/manual bookings and first-time quote conversions are
            // intentionally admin-priced, but are clearly marked in the record.
            authoritativePrice = validateManualPrice(body.price_breakdown || {
                total: body.totalAmount,
                deposit: body.deposit,
            });
            priceSource = 'admin_manual';
        } else {
            return c.json({ error: 'A valid product or quote is required' }, 400);
        }
    } catch (error) {
        if (error instanceof OperationsValidationError) return c.json({ error: error.message }, 400);
        throw error;
    }

    const id = body.id || crypto.randomUUID();

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
            type: reservationType,
            productName: resolvedProductName,
            productId,
            quoteId,
            userId: actor.role === 'admin'
                ? ((body.user_id || body.userId) ? String(body.user_id || body.userId) : null)
                : actor.id,
            customerName: String(customerName),
            customerEmail: cleanCustomerEmail,
            customerPhone: cleanCustomerPhone,
            travelers,
            startDate: (body.start_date || body.date) ? String(body.start_date || body.date) : null,
            endDate: body.end_date ? String(body.end_date) : null,
            duration: body.duration ? String(body.duration) : null,
            status: actor.role === 'admin'
                ? normalizeReservationStatus(body.status || 'pending_payment')
                : 'pending_payment',
            source: body.source ? String(body.source) : null,
            totalPrice: authoritativePrice.total,
            depositAmount: authoritativePrice.deposit,
            balanceAmount: authoritativePrice.local,
            paymentMethod: body.paymentMethod ? String(body.paymentMethod) : null,
            notes: body.notes ? String(body.notes) : null,
            dailyAccommodations: body.dailyAccommodations ? JSON.stringify(body.dailyAccommodations) : null,
            history: JSON.stringify([
                ...(Array.isArray(body.history) ? body.history : []),
                { type: 'reservation_created', timestamp: new Date().toISOString(), actor: actor.role },
            ]),
            itineraryTemplateId: (body.itinerary_template_id || body.itineraryTemplateId)
                ? String(body.itinerary_template_id || body.itineraryTemplateId)
                : null,
            documentContent: body.document_content
                ? (typeof body.document_content === 'string' ? body.document_content : JSON.stringify(body.document_content))
                : body.documentContent
                    ? (typeof body.documentContent === 'string' ? body.documentContent : JSON.stringify(body.documentContent))
                    : null,
            reservationNumber,
            idempotencyKey,
            priceSource,
            priceVerifiedAt: new Date().toISOString(),
        }).run();

        await writeAuditLogSafely(c.env.DB, {
            entityType: 'reservation', entityId: id, action: 'create',
            actorId: actor.id, actorRole: actor.role,
            after: {
                id, type: reservationType, status: body.status || 'pending_payment',
                productId, quoteId, travelers,
                totalPrice: authoritativePrice.total,
                depositAmount: authoritativePrice.deposit,
                balanceAmount: authoritativePrice.local,
                priceSource,
            },
            metadata: { idempotencyKey: idempotencyKey || undefined },
        });

        // Quote checkout and reservation creation are finalized on the server;
        // the customer must not need admin-only quote update permissions.
        if (quoteId) {
            const convertedAt = new Date().toISOString();
            await c.env.DB.prepare(
                "UPDATE quotes SET status = 'converted', updated_at = ? WHERE id = ?",
            ).bind(convertedAt, quoteId).run();
            await writeAuditLogSafely(c.env.DB, {
                entityType: 'quote', entityId: quoteId, action: 'update',
                actorId: actor.id, actorRole: actor.role,
                before: sourceQuoteBefore,
                after: { id: quoteId, status: 'converted', updated_at: convertedAt },
                metadata: { reason: 'reservation_created', reservationId: id },
            });
        }

        const missingPayPalEnv = [
            !c.env.PAYPAL_CLIENT_ID && 'PAYPAL_CLIENT_ID',
            !c.env.PAYPAL_SECRET_KEY && 'PAYPAL_SECRET_KEY',
            !c.env.PAYPAL_BUSINESS_EMAIL && 'PAYPAL_BUSINESS_EMAIL',
        ].filter(Boolean);
        const depositAmt = authoritativePrice.deposit;

        if (missingPayPalEnv.length > 0) {
            console.warn(`[PayPal Invoice] skipped: missing ${missingPayPalEnv.join(', ')}`);
        } else if (!cleanCustomerEmail) {
            console.warn(`[PayPal Invoice] skipped: customer email is missing (${reservationNumber})`);
        } else if (!Number.isFinite(depositAmt) || depositAmt <= 0) {
            console.warn(`[PayPal Invoice] skipped: deposit amount is ${depositAmt || 0} (${reservationNumber})`);
        } else {
            const invoicePromise = sendPayPalInvoice({
                clientId: c.env.PAYPAL_CLIENT_ID,
                secret: c.env.PAYPAL_SECRET_KEY,
                businessEmail: c.env.PAYPAL_BUSINESS_EMAIL,
                customerEmail: cleanCustomerEmail,
                customerName: String(customerName),
                reservationNumber,
                productName: resolvedProductName,
                depositAmount: depositAmt,
                environment: c.env.PAYPAL_ENVIRONMENT,
            }).then(({ invoiceId, invoiceNumber }) => {
                console.log(`[PayPal Invoice] sent: ${invoiceNumber} (${invoiceId})`);
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

        return c.json({
            message: 'Reservation created', id, reservationNumber,
            priceBreakdown: authoritativePrice,
            priceSource,
        }, 201);
    } catch (error: any) {
        if (idempotencyKey) {
            try {
                const duplicate: any = await c.env.DB.prepare(
                    'SELECT id, quote_id, reservation_number, total_price, deposit_amount, balance_amount FROM reservations WHERE idempotency_key = ?',
                ).bind(idempotencyKey).first();
                if (duplicate) {
                    if (duplicate.quote_id) {
                        await c.env.DB.prepare(
                            "UPDATE quotes SET status = 'converted', updated_at = ? WHERE id = ? AND status <> 'converted'",
                        ).bind(new Date().toISOString(), duplicate.quote_id).run();
                    }
                    return c.json({
                        message: 'Reservation already created', id: duplicate.id,
                        reservationNumber: duplicate.reservation_number,
                        priceBreakdown: {
                            total: Number(duplicate.total_price || 0),
                            deposit: Number(duplicate.deposit_amount || 0),
                            local: Number(duplicate.balance_amount || 0),
                        },
                        idempotentReplay: true,
                    }, 200);
                }
            } catch { /* surface original insert failure */ }
        }
        return c.json({ error: error.message }, 500);
    }
});

// DELETE /api/reservations/:id
app.delete('/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    const db = drizzle(c.env.DB);

    // Check if exists
    const existing = await db.select().from(reservations).where(eq(reservations.id, id)).get();
    if (!existing) {
        return c.json({ error: "Not found" }, 404);
    }

    await db.delete(reservations).where(eq(reservations.id, id)).run();

    const actor = c.get('user');
    await writeAuditLogSafely(c.env.DB, {
        entityType: 'reservation', entityId: id, action: 'delete',
        actorId: actor?.id, actorRole: actor?.role, before: existing,
    });

    return c.json({ success: true, id });
});

export default app;
