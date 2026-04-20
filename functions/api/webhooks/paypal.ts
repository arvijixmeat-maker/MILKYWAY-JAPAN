import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reservations } from '../../../src/db/schema/reservations';
import { eq } from 'drizzle-orm';

interface Env {
    DB: D1Database;
    PAYPAL_CLIENT_ID: string;
    PAYPAL_SECRET_KEY: string;
    PAYPAL_WEBHOOK_ID: string;
}

const PAYPAL_API = 'https://api-m.paypal.com';

async function getAccessToken(clientId: string, secret: string): Promise<string> {
    const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
    const data: any = await res.json();
    return data.access_token;
}

async function verifyWebhookSignature(
    clientId: string,
    secret: string,
    webhookId: string,
    headers: Record<string, string>,
    body: any,
): Promise<boolean> {
    try {
        const token = await getAccessToken(clientId, secret);
        const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                auth_algo: headers['paypal-auth-algo'],
                cert_url: headers['paypal-cert-url'],
                transmission_id: headers['paypal-transmission-id'],
                transmission_sig: headers['paypal-transmission-sig'],
                transmission_time: headers['paypal-transmission-time'],
                webhook_id: webhookId,
                webhook_event: body,
            }),
        });
        if (!res.ok) return false;
        const result: any = await res.json();
        return result.verification_status === 'SUCCESS';
    } catch {
        return false;
    }
}

const app = new Hono<{ Bindings: Env }>();

// POST /api/webhooks/paypal
app.post('/', async (c) => {
    const rawBody = await c.req.text();
    let event: any;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
    }

    // Verify webhook signature if PAYPAL_WEBHOOK_ID is configured
    if (c.env.PAYPAL_WEBHOOK_ID) {
        const headers: Record<string, string> = {
            'paypal-auth-algo': c.req.header('paypal-auth-algo') || '',
            'paypal-cert-url': c.req.header('paypal-cert-url') || '',
            'paypal-transmission-id': c.req.header('paypal-transmission-id') || '',
            'paypal-transmission-sig': c.req.header('paypal-transmission-sig') || '',
            'paypal-transmission-time': c.req.header('paypal-transmission-time') || '',
        };

        const valid = await verifyWebhookSignature(
            c.env.PAYPAL_CLIENT_ID,
            c.env.PAYPAL_SECRET_KEY,
            c.env.PAYPAL_WEBHOOK_ID,
            headers,
            event,
        );

        if (!valid) {
            console.error('[PayPal Webhook] Signature verification failed');
            return c.json({ error: 'Signature verification failed' }, 401);
        }
    }

    const eventType: string = event.event_type || '';

    // Invoice payment completed → confirm reservation
    if (eventType === 'INVOICES.PAYMENT.COMPLETED') {
        const invoiceNumber: string = event.resource?.detail?.invoice_number || '';
        if (!invoiceNumber) {
            return c.json({ received: true, note: 'no invoice_number' });
        }

        const db = drizzle(c.env.DB);
        const reservation = await db
            .select()
            .from(reservations)
            .where(eq(reservations.reservationNumber, invoiceNumber))
            .get();

        if (reservation) {
            const history: any[] = reservation.history ? JSON.parse(reservation.history) : [];
            history.push({
                type: 'payment_confirmed',
                date: new Date().toISOString(),
                source: 'paypal_webhook',
                eventId: event.id,
            });

            await db
                .update(reservations)
                .set({
                    status: 'confirmed',
                    history: JSON.stringify(history),
                })
                .where(eq(reservations.id, reservation.id))
                .run();

            console.log(`[PayPal Webhook] Confirmed reservation ${invoiceNumber}`);
        } else {
            console.warn(`[PayPal Webhook] Reservation not found for invoice ${invoiceNumber}`);
        }
    }

    return c.json({ received: true });
});

export default app;