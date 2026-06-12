import { Hono } from 'hono';
import { sendPayPalInvoice } from '../lib/paypal';

interface Env {
    PAYPAL_CLIENT_ID: string;
    PAYPAL_SECRET_KEY: string;
    PAYPAL_BUSINESS_EMAIL: string;
    PAYPAL_ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// GET /api/test-paypal?email=customer@example.com
app.get('/', async (c) => {
    const customerEmail = c.req.query('email');

    if (!customerEmail) {
        return c.json({ error: 'email query parameter required' }, 400);
    }

    if (!c.env.PAYPAL_CLIENT_ID) return c.json({ error: 'PAYPAL_CLIENT_ID not set' }, 500);
    if (!c.env.PAYPAL_SECRET_KEY) return c.json({ error: 'PAYPAL_SECRET_KEY not set' }, 500);
    if (!c.env.PAYPAL_BUSINESS_EMAIL) return c.json({ error: 'PAYPAL_BUSINESS_EMAIL not set' }, 500);

    // Show partial credentials for debugging
    const clientIdPreview = c.env.PAYPAL_CLIENT_ID.slice(0, 6) + '...' + c.env.PAYPAL_CLIENT_ID.slice(-4);
    const secretPreview = c.env.PAYPAL_SECRET_KEY.slice(0, 4) + '...' + c.env.PAYPAL_SECRET_KEY.slice(-4);

    try {
        const result = await sendPayPalInvoice({
            clientId: c.env.PAYPAL_CLIENT_ID,
            secret: c.env.PAYPAL_SECRET_KEY,
            businessEmail: c.env.PAYPAL_BUSINESS_EMAIL,
            customerEmail,
            customerName: 'テスト 顧客',
            reservationNumber: `MN-TEST-${Date.now()}`,
            productName: 'テストツアー',
            depositAmount: 1000,
            environment: c.env.PAYPAL_ENVIRONMENT,
        });
        return c.json({
            success: true,
            invoiceId: result.invoiceId,
            invoiceNumber: result.invoiceNumber,
            environment: c.env.PAYPAL_ENVIRONMENT || 'live',
            clientIdPreview,
            secretPreview,
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message, clientIdPreview, secretPreview }, 500);
    }
});

export default app;
