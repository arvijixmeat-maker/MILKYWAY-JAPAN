import { Hono } from 'hono';

const app = new Hono();

app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { to, type, data } = body;

        // TODO: Integrate with actual Email Service Provider (Resend, MailChannels, SendGrid)
        // For now, we just log it.
        console.log('--- SENDING EMAIL ---');
        console.log(`To: ${to}`);
        console.log(`Type: ${type}`);
        console.log(`Data:`, data);
        console.log('---------------------');

        return c.json({ success: true, message: 'Email queued (mock)' });
    } catch (e) {
        console.error('Error sending email:', e);
        return c.json({ error: 'Failed to send email' }, 500);
    }
});

export default app;
