import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reservations } from '../../../src/db/schema/reservations';
import { eq, and, lt } from 'drizzle-orm';
import { sendEmail, baseLayout } from '../../lib/mailer';

interface Env {
    DB: D1Database;
    RESEND_API_KEY: string;
    ADMIN_EMAIL: string;
    CRON_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

function tplPaymentReminder(data: { customerName: string; reservationNumber: string; productName: string; depositAmount: number }) {
    return baseLayout(`
<div class="header">
  <h1>🐴 Milkyway Japan</h1>
  <p>お支払いリマインダー</p>
</div>
<div class="body">
  <p class="greeting">${data.customerName} 様</p>
  <p>ご予約いただきありがとうございます。<br>予約金のお支払いがまだ確認できておりません。</p>
  <div class="card">
    <div class="card-row"><span class="label">予約番号</span><span class="value" style="color:#1eb496;font-size:18px;font-weight:800;">${data.reservationNumber}</span></div>
    <div class="card-row"><span class="label">ツアー名</span><span class="value">${data.productName}</span></div>
    <div class="card-row"><span class="label">予約金（PayPal）</span><span class="value" style="color:#1eb496;">${data.depositAmount.toLocaleString()}円</span></div>
  </div>
  <div class="alert">
    <strong>⚠️ お支払い期限が近づいています</strong><br><br>
    PayPalインボイスはすでにこのメールアドレス宛にお送りしております。<br>
    メールをご確認いただき、<strong>期限内にお支払い</strong>をお願いいたします。<br><br>
    メールが見つからない場合は <strong>迷惑メールフォルダ</strong> もご確認ください。
  </div>
  <p style="font-size:14px;color:#4a6b64;">
    ご不明な点は <a href="mailto:info@mongolryokou.com" style="color:#1eb496;">info@mongolryokou.com</a> までご連絡ください。
  </p>
  <a class="btn" href="https://mongolryokou.com/mypage/reservations">予約を確認する</a>
</div>
<div class="footer">
  <a href="https://mongolryokou.com">mongolryokou.com</a> |
  <a href="mailto:info@mongolryokou.com">info@mongolryokou.com</a>
</div>`);
}

// POST /api/cron/payment-reminder
// Called by external cron service (e.g. cron-job.org) with Authorization: Bearer <CRON_SECRET>
app.post('/', async (c) => {
    const auth = c.req.header('Authorization');
    if (!c.env.CRON_SECRET || auth !== `Bearer ${c.env.CRON_SECRET}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = drizzle(c.env.DB);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const pending = await db
        .select()
        .from(reservations)
        .where(and(eq(reservations.status, 'pending_payment'), lt(reservations.createdAt, cutoff)))
        .all();

    let sent = 0;
    const errors: string[] = [];

    for (const r of pending) {
        if (!r.customerEmail) continue;

        const history: any[] = r.history ? JSON.parse(r.history) : [];
        if (history.some((h) => h.type === 'reminder_sent')) continue;

        try {
            await sendEmail(
                c.env.RESEND_API_KEY,
                r.customerEmail,
                `【お支払いリマインダー】${r.productName || 'ツアー'} 予約金のご確認 | Milkyway Japan`,
                tplPaymentReminder({
                    customerName: r.customerName || 'お客様',
                    reservationNumber: r.reservationNumber || r.id.slice(0, 8).toUpperCase(),
                    productName: r.productName || 'ツアー',
                    depositAmount: r.depositAmount || 0,
                }),
            );

            history.push({ type: 'reminder_sent', date: new Date().toISOString() });
            await db
                .update(reservations)
                .set({ history: JSON.stringify(history) })
                .where(eq(reservations.id, r.id))
                .run();

            sent++;
        } catch (e: any) {
            errors.push(`${r.id}: ${e.message}`);
        }
    }

    return c.json({ success: true, sent, skipped: pending.length - sent - errors.length, errors });
});

export default app;