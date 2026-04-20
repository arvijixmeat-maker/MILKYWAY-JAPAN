import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { reservations } from '../../../src/db/schema/reservations';
import { eq, and, like } from 'drizzle-orm';
import { sendEmail, baseLayout } from '../../lib/mailer';

interface Env {
    DB: D1Database;
    RESEND_API_KEY: string;
    ADMIN_EMAIL: string;
    CRON_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

function tplDailyDigest(data: {
    date: string;
    departures: any[];
    unpaid: any[];
    newToday: any[];
}) {
    const fmt = (n: number) => n.toLocaleString();

    const departureRows = data.departures.length
        ? data.departures.map(r => `
    <tr>
      <td style="color:#1eb496;font-weight:700;">${r.reservationNumber || '-'}</td>
      <td>${r.customerName || '-'}</td>
      <td>${r.productName || '-'}</td>
      <td>${r.travelers || 1}名</td>
    </tr>`).join('')
        : '<tr><td colspan="4" style="color:#9ca3af;text-align:center;">本日の出発なし</td></tr>';

    const unpaidRows = data.unpaid.length
        ? data.unpaid.map(r => `
    <tr>
      <td style="color:#ef4444;font-weight:700;">${r.reservationNumber || '-'}</td>
      <td>${r.customerName || '-'}</td>
      <td>${r.productName || '-'}</td>
      <td style="color:#ef4444;">${fmt(r.depositAmount || 0)}円</td>
    </tr>`).join('')
        : '<tr><td colspan="4" style="color:#9ca3af;text-align:center;">未払いなし ✅</td></tr>';

    const newRows = data.newToday.length
        ? data.newToday.map(r => `
    <tr>
      <td style="color:#1eb496;font-weight:700;">${r.reservationNumber || '-'}</td>
      <td>${r.customerName || '-'}</td>
      <td>${r.productName || '-'}</td>
      <td>${fmt(r.totalPrice || 0)}円</td>
    </tr>`).join('')
        : '<tr><td colspan="4" style="color:#9ca3af;text-align:center;">本日の新規予約なし</td></tr>';

    return baseLayout(`
<div class="header">
  <h1>📊 日次レポート</h1>
  <p>${data.date} | Milkyway Japan</p>
</div>
<div class="body">
  <p class="greeting">おはようございます。本日の予約状況です。</p>

  <h3 style="color:#1a2e2a;margin-top:28px;margin-bottom:8px;">✈️ 本日出発 (${data.departures.length}件)</h3>
  <table>
    <tr><th>予約番号</th><th>お客様</th><th>ツアー</th><th>人数</th></tr>
    ${departureRows}
  </table>

  <h3 style="color:#1a2e2a;margin-top:28px;margin-bottom:8px;">⚠️ 未払い予約 (${data.unpaid.length}件)</h3>
  <table>
    <tr><th>予約番号</th><th>お客様</th><th>ツアー</th><th>予約金</th></tr>
    ${unpaidRows}
  </table>

  <h3 style="color:#1a2e2a;margin-top:28px;margin-bottom:8px;">🆕 本日の新規予約 (${data.newToday.length}件)</h3>
  <table>
    <tr><th>予約番号</th><th>お客様</th><th>ツアー</th><th>合計</th></tr>
    ${newRows}
  </table>

  <a class="btn" href="https://mongolryokou.com/admin/reservations" style="margin-top:28px;">管理画面を開く</a>
</div>
<div class="footer">Milkyway Japan 管理システム | 自動送信メール</div>`);
}

// POST /api/cron/daily-digest
app.post('/', async (c) => {
    const auth = c.req.header('Authorization');
    if (!c.env.CRON_SECRET || auth !== `Bearer ${c.env.CRON_SECRET}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = drizzle(c.env.DB);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const [departures, unpaid, newToday] = await Promise.all([
        db.select().from(reservations).where(like(reservations.startDate, `${today}%`)).all(),
        db.select().from(reservations).where(eq(reservations.status, 'pending_payment')).all(),
        db.select().from(reservations).where(like(reservations.createdAt, `${today}%`)).all(),
    ]);

    const adminEmail = c.env.ADMIN_EMAIL || 'agape_ibeel@hanpass.com';
    const dateLabel = new Date().toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });

    await sendEmail(
        c.env.RESEND_API_KEY,
        adminEmail,
        `【日次レポート】${today} の予約状況 | Milkyway Japan`,
        tplDailyDigest({ date: dateLabel, departures, unpaid, newToday }),
    );

    return c.json({
        success: true,
        departures: departures.length,
        unpaid: unpaid.length,
        newToday: newToday.length,
    });
});

export default app;