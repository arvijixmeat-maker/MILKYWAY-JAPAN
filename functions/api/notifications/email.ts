import { Hono } from 'hono';

interface Env {
    RESEND_API_KEY: string;
    ADMIN_EMAIL: string;
}

const app = new Hono<{ Bindings: Env }>();

const FROM = 'Milkyway Japan <noreply@mongolryokou.com>';

async function sendEmail(apiKey: string, to: string | string[], subject: string, html: string) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: FROM,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error: ${err}`);
    }
    return res.json();
}

// ─── Email Templates ────────────────────────────────────────────────

function baseLayout(content: string) {
    return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a2e2a;}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);}
  .header{background:#1eb496;padding:28px 32px;text-align:center;}
  .header h1{margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:.5px;}
  .header p{margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px;}
  .body{padding:32px;}
  .greeting{font-size:16px;font-weight:600;margin-bottom:20px;}
  .card{background:#f4f9f8;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #1eb496;}
  .card-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5eeec;font-size:14px;}
  .card-row:last-child{border-bottom:none;}
  .card-row .label{color:#6b8f88;font-weight:500;}
  .card-row .value{font-weight:600;text-align:right;}
  .highlight{background:#fff3cd;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;border-left:4px solid #f59e0b;}
  .btn{display:inline-block;background:#1eb496;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:20px 0;}
  .footer{background:#f4f7f6;padding:20px 32px;text-align:center;font-size:12px;color:#6b8f88;}
  .footer a{color:#1eb496;text-decoration:none;}
</style>
</head>
<body><div class="wrap">${content}</div></body>
</html>`;
}

function tplReservationRequested(data: any) {
    return baseLayout(`
<div class="header">
  <h1>🐴 Milkyway Japan</h1>
  <p>モンゴル旅行専門</p>
</div>
<div class="body">
  <p class="greeting">${data.customerName} 様</p>
  <p>この度はご予約いただきありがとうございます。<br>以下の内容でご予約を承りました。</p>
  <div class="card">
    <div class="card-row"><span class="label">予約番号</span><span class="value" style="color:#1eb496;font-size:18px;font-weight:800;">${data.reservationId || '-'}</span></div>
    <div class="card-row"><span class="label">ツアー名</span><span class="value">${data.productName || '-'}</span></div>
    <div class="card-row"><span class="label">① 予約金（PayPal）</span><span class="value" style="color:#1eb496;">${data.depositAmount || '-'}</span></div>
    <div class="card-row"><span class="label">② 残金（現地・円現金）</span><span class="value">${data.localAmount || '-'}</span></div>
  </div>
  <div class="highlight">
    <strong>💳 ① 予約金のお支払い</strong><br><br>
    <strong>PayPalインボイス</strong>をこのメールアドレス宛に別途お送りします。<br>
    リンクからクレジットカードまたはPayPalで安全にお支払いください。<br><br>
    <strong>💴 ② 残金のお支払い</strong><br><br>
    残金は <strong>現地にて日本円（現金）</strong> でお支払いいただきます。<br><br>
    ※ 予約金のお支払い確認後、ご予約が確定となります。<br>
    ※ インボイスが届かない場合はお手数ですがご連絡ください。
  </div>
  <a class="btn" href="https://mongolryokou.com/mypage/reservations">予約確認はこちら</a>
</div>
<div class="footer">
  <a href="https://mongolryokou.com">mongolryokou.com</a> |
  <a href="mailto:info@mongolryokou.com">info@mongolryokou.com</a>
</div>`);
}

function tplAdminNewReservation(data: any) {
    return baseLayout(`
<div class="header">
  <h1>🔔 新規予約が入りました</h1>
  <p>Milkyway Japan 管理通知</p>
</div>
<div class="body">
  <p class="greeting">新しい予約が届きました。<br>下記メールアドレスへ <strong style="color:#1eb496;">PayPalインボイス</strong> を送付してください。</p>
  <div class="card">
    <div class="card-row"><span class="label">予約番号</span><span class="value" style="color:#1eb496;font-size:18px;font-weight:800;">${data.reservationId || '-'}</span></div>
    <div class="card-row"><span class="label">お客様名</span><span class="value">${data.customerName || '-'}</span></div>
    <div class="card-row"><span class="label">ツアー名</span><span class="value">${data.productName || '-'}</span></div>
    <div class="card-row"><span class="label">📧 PayPal送付先</span><span class="value" style="color:#1eb496;font-weight:800;">${data.customerEmail || '-'}</span></div>
    <div class="card-row"><span class="label">💴 予約金（PayPal）</span><span class="value">${data.depositAmount || '-'}</span></div>
    <div class="card-row"><span class="label">電話</span><span class="value">${data.customerPhone || '-'}</span></div>
  </div>
  <a class="btn" href="https://mongolryokou.com/admin/reservations">管理画面で確認する</a>
</div>
<div class="footer">Milkyway Japan 管理システム</div>`);
}

function tplQuoteReceived(data: any) {
    return baseLayout(`
<div class="header">
  <h1>🐴 Milkyway Japan</h1>
  <p>オーダーメイド見積もり受付</p>
</div>
<div class="body">
  <p class="greeting">${data.customerName} 様</p>
  <p>オーダーメイドツアーのお見積もりリクエストを受け付けました。<br>通常 <strong>24時間以内</strong> に担当者よりご連絡いたします。</p>
  <div class="card">
    <div class="card-row"><span class="label">プラン</span><span class="value">${data.productName || 'モンゴルオーダーメイド旅行'}</span></div>
  </div>
  <p style="font-size:14px;color:#4a6b64;">
    お急ぎの場合は直接 <a href="mailto:info@mongolryokou.com" style="color:#1eb496;">info@mongolryokou.com</a> までご連絡ください。
  </p>
  <a class="btn" href="https://mongolryokou.com">サイトへ戻る</a>
</div>
<div class="footer">
  <a href="https://mongolryokou.com">mongolryokou.com</a>
</div>`);
}

function tplAdminNewQuote(data: any) {
    return baseLayout(`
<div class="header">
  <h1>📋 新規お見積もりが届きました</h1>
  <p>Milkyway Japan 管理通知</p>
</div>
<div class="body">
  <p class="greeting">新しいオーダーメイド見積もりリクエストです。</p>
  <div class="card">
    <div class="card-row"><span class="label">お客様名</span><span class="value">${data.customerName || '-'}</span></div>
    <div class="card-row"><span class="label">メール</span><span class="value">${data.customerEmail || '-'}</span></div>
    <div class="card-row"><span class="label">電話</span><span class="value">${data.customerPhone || '-'}</span></div>
    <div class="card-row"><span class="label">プラン</span><span class="value">${data.productName || '-'}</span></div>
  </div>
  <a class="btn" href="https://mongolryokou.com/admin/quotes">管理画面で確認する</a>
</div>
<div class="footer">Milkyway Japan 管理システム</div>`);
}

function tplGuideAssigned(data: any) {
    return baseLayout(`
<div class="header">
  <h1>🐴 Milkyway Japan</h1>
  <p>担当ガイドのご案内</p>
</div>
<div class="body">
  <p class="greeting">${data.customerName} 様</p>
  <p>担当ガイドが決定いたしました。旅行当日はガイドが現地でお出迎えいたします。</p>
  <div class="card">
    <div class="card-row"><span class="label">ツアー名</span><span class="value">${data.productName || '-'}</span></div>
    <div class="card-row"><span class="label">担当ガイド</span><span class="value">${data.guideName || '-'}</span></div>
    <div class="card-row"><span class="label">ガイド連絡先</span><span class="value">${data.guidePhone || '-'}</span></div>
  </div>
  <p style="font-size:14px;color:#4a6b64;">ご不明な点はいつでもご連絡ください。素敵な旅をお楽しみください！</p>
  <a class="btn" href="https://mongolryokou.com/mypage/reservations">予約詳細を確認</a>
</div>
<div class="footer">
  <a href="https://mongolryokou.com">mongolryokou.com</a>
</div>`);
}

function tplEstimateCompleted(data: any) {
    return baseLayout(`
<div class="header">
  <h1>🐴 Milkyway Japan</h1>
  <p>オーダーメイド見積もり完了</p>
</div>
<div class="body">
  <p class="greeting">${data.customerName} 様</p>
  <p>お待たせいたしました。<br>モンゴル旅行のお見積もりが完成いたしました。</p>
  <div class="card">
    <div class="card-row"><span class="label">目的地</span><span class="value">${data.destination || '-'}</span></div>
  </div>
  ${data.adminNote ? `<div class="highlight"><strong>📝 担当者からのメッセージ</strong><br><br>${data.adminNote}</div>` : ''}
  ${data.estimateUrl ? `<div style="text-align:center;margin:24px 0;">
    <a class="btn" href="${data.estimateUrl}" style="font-size:16px;">📄 見積もりを確認する</a>
    <p style="font-size:12px;color:#6b8f88;margin-top:8px;">リンクが開かない場合: ${data.estimateUrl}</p>
  </div>` : ''}
  <p style="font-size:14px;color:#4a6b64;">ご不明な点はいつでもご連絡ください。</p>
</div>
<div class="footer">
  <a href="https://mongolryokou.com">mongolryokou.com</a> |
  <a href="mailto:info@mongolryokou.com">info@mongolryokou.com</a>
</div>`);
}

// ─── Route Handler ───────────────────────────────────────────────────

app.post('/', async (c) => {
    try {
        const { to, type, data } = await c.req.json();
        const apiKey = c.env.RESEND_API_KEY;
        const adminEmail = c.env.ADMIN_EMAIL || 'agape_ibeel@hanpass.com';

        if (!apiKey) {
            console.error('RESEND_API_KEY not set');
            return c.json({ error: 'Email service not configured' }, 500);
        }

        let subject = '';
        let html = '';
        let adminSubject = '';
        let adminHtml = '';

        switch (type) {
            case 'RESERVATION_REQUESTED':
                subject = `【予約確認】${data.productName || 'ツアー'} | Milkyway Japan`;
                html = tplReservationRequested(data);
                adminSubject = `【新規予約】${data.customerName} 様 - ${data.productName}`;
                adminHtml = tplAdminNewReservation({ ...data, customerEmail: to });
                break;

            case 'QUOTE_RECEIVED':
                subject = '【受付完了】オーダーメイド見積もりリクエスト | Milkyway Japan';
                html = tplQuoteReceived(data);
                adminSubject = `【新規見積もり】${data.customerName} 様`;
                adminHtml = tplAdminNewQuote({ ...data, customerEmail: to });
                break;

            case 'GUIDE_ASSIGNED':
                subject = `【ガイド決定】${data.productName || 'ツアー'} 担当ガイドのご案内 | Milkyway Japan`;
                html = tplGuideAssigned(data);
                break;

            case 'ESTIMATE_COMPLETED':
                subject = '【見積もり完了】モンゴル旅行のお見積もりをお送りします | Milkyway Japan';
                html = tplEstimateCompleted(data);
                break;

            default:
                return c.json({ error: `Unknown email type: ${type}` }, 400);
        }

        // Send to customer
        await sendEmail(apiKey, to, subject, html);

        // Send admin notification (reservation + quote)
        if (adminSubject && adminHtml) {
            await sendEmail(apiKey, adminEmail, adminSubject, adminHtml);
        }

        return c.json({ success: true });
    } catch (e: any) {
        console.error('Email send error:', e);
        return c.json({ error: e.message || 'Failed to send email' }, 500);
    }
});

export default app;
