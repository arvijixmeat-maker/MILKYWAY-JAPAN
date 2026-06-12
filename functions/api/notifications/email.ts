import { Hono } from 'hono';
import { createNotification } from './index';

interface Env {
    DB: any;
    RESEND_API_KEY: string;
    ADMIN_EMAIL: string;
}

const app = new Hono<{ Bindings: Env }>();

const FROM = 'Milkyway Japan <noreply@mongolryokou.com>';
const SITE_URL = 'https://mongolryokou.com';
const CONTACT_EMAIL = 'info@mongolryokou.com';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getDocumentReservationId = (data: any): string => {
    const candidates = [data.reservationDbId, data.reservationId];
    return candidates.find((value) => typeof value === 'string' && UUID_PATTERN.test(value)) || '';
};

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

function escapeHtml(value: unknown) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function money(value: unknown) {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return `${value.toLocaleString('ja-JP')}円`;
    return escapeHtml(value);
}

function fieldRows(rows: Array<[string, unknown]>) {
    return rows
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => `
            <tr>
                <th>${escapeHtml(label)}</th>
                <td>${escapeHtml(value)}</td>
            </tr>
        `)
        .join('');
}

function cta(label: string, url: string) {
    return `
        <div class="cta-wrap">
            <a class="btn" href="${escapeHtml(url)}">${escapeHtml(label)}</a>
            <p class="url-note">開けない場合はこちらをコピーしてください：<br><span>${escapeHtml(url)}</span></p>
        </div>
    `;
}

function baseLayout(preheader: string, content: string) {
    return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Milkyway Japan</title>
<style>
  body{margin:0;padding:0;background:#f3f7f6;color:#102522;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans","Yu Gothic",Meiryo,sans-serif;line-height:1.65;}
  .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;}
  .wrap{max-width:640px;margin:28px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,118,110,.12);}
  .header{background:#0f766e;padding:30px 34px;color:#fff;}
  .brand{font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.82;margin:0 0 8px;}
  .header h1{font-size:22px;line-height:1.35;margin:0;font-weight:800;}
  .body{padding:34px;}
  .lead{font-size:16px;font-weight:700;margin:0 0 14px;color:#102522;}
  p{font-size:14px;margin:0 0 16px;color:#365a55;}
  .notice{background:#ecfdf9;border:1px solid #c8eee5;border-radius:14px;padding:16px 18px;margin:22px 0;color:#234d47;font-size:14px;}
  .panel{border:1px solid #e4eeeb;border-radius:14px;overflow:hidden;margin:22px 0;background:#fbfefd;}
  .panel-title{margin:0;padding:13px 16px;background:#f2faf8;color:#0f766e;font-size:13px;font-weight:800;letter-spacing:.04em;}
  table{width:100%;border-collapse:collapse;}
  th,td{font-size:14px;padding:12px 16px;border-top:1px solid #e4eeeb;vertical-align:top;}
  th{width:34%;text-align:left;color:#6b817d;font-weight:700;background:#fbfefd;}
  td{color:#122d29;font-weight:650;text-align:right;}
  .steps{padding-left:18px;margin:10px 0 0;color:#365a55;font-size:14px;}
  .steps li{margin:6px 0;}
  .cta-wrap{text-align:center;margin:28px 0 20px;}
  .btn{display:inline-block;background:#0f766e;color:#fff!important;text-decoration:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:800;}
  .url-note{font-size:12px;color:#78918d;margin-top:10px;word-break:break-all;}
  .url-note span{color:#0f766e;}
  .footer{background:#f7faf9;padding:22px 34px;text-align:center;font-size:12px;color:#6b817d;}
  .footer a{color:#0f766e;text-decoration:none;font-weight:700;}
  @media(max-width:680px){.wrap{margin:0;border-radius:0}.header,.body,.footer{padding-left:22px;padding-right:22px}th,td{display:block;width:auto;text-align:left}td{padding-top:0;border-top:none}th{padding-bottom:4px}}
</style>
</head>
<body>
<div class="preheader">${escapeHtml(preheader)}</div>
<div class="wrap">${content}</div>
</body>
</html>`;
}

function footer() {
    return `
        <div class="footer">
            Milkyway Japan / Mongolia Milky Way Travel<br>
            <a href="${SITE_URL}">mongolryokou.com</a> · <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
        </div>
    `;
}

function tplReservationRequested(data: any) {
    return baseLayout('ご予約リクエストを受け付けました。予約金のお支払い方法をご案内します。', `
<div class="header">
  <p class="brand">Milkyway Japan</p>
  <h1>ご予約リクエストを受け付けました</h1>
</div>
<div class="body">
  <p class="lead">${escapeHtml(data.customerName || 'お客様')} 様</p>
  <p>この度はMilkyway Japanへお申し込みいただき、誠にありがとうございます。担当者が内容を確認し、予約金のお支払い方法と今後の流れをご案内いたします。</p>
  <div class="panel">
    <p class="panel-title">予約内容</p>
    <table>${fieldRows([
        ['予約番号', data.reservationId || data.reservationNumber],
        ['ツアー名', data.productName],
        ['予約金', money(data.depositAmount)],
        ['現地お支払い予定額', money(data.localAmount)],
    ])}</table>
  </div>
  <div class="notice">
    <strong>今後の流れ</strong>
    <ol class="steps">
      <li>PayPalインボイスを別途メールでお送りします。</li>
      <li>予約金のご入金確認後、手配を開始します。</li>
      <li>確定日程表、契約書、ガイド情報を順番にご案内します。</li>
    </ol>
  </div>
  ${cta('予約状況を確認する', `${SITE_URL}/mypage/reservations${data.reservationDbId ? `/${data.reservationDbId}` : ''}`)}
</div>
${footer()}`);
}

export function tplPaymentConfirmed(data: any) {
    return baseLayout('ご予約金のご入金を確認いたしました。今後の手配についてご案内します。', `
<div class="header">
  <p class="brand">Milkyway Japan</p>
  <h1>ご予約金のご入金を確認いたしました</h1>
</div>
<div class="body">
  <p class="lead">${escapeHtml(data.customerName || 'お客様')} 様</p>
  <p>ご予約金のお支払いを確認いたしました。ありがとうございます。ご旅行の現地手配を順次進めてまいります。</p>
  <div class="panel">
    <p class="panel-title">ご入金内容</p>
    <table>${fieldRows([
        ['予約番号', data.reservationNumber || data.reservationId],
        ['ツアー名', data.productName],
        ['ご入金額', money(data.paymentAmount)],
        ['現地お支払い予定額', money(data.balanceAmount)],
    ])}</table>
  </div>
  <div class="notice">
    <strong>今後の流れ</strong>
    <ol class="steps">
      <li>宿泊、車両、ガイドなどの現地手配を進めます。</li>
      <li>確定日程表と海外旅行契約書を順番にご案内します。</li>
      <li>残金のお支払い方法と期限は、ご出発前に改めてご案内します。</li>
    </ol>
  </div>
  ${cta('予約状況を確認する', `${SITE_URL}/mypage/reservations${data.reservationDbId ? `/${data.reservationDbId}` : ''}`)}
</div>
${footer()}`);
}

function tplAdminNewReservation(data: any) {
    return baseLayout('新しい予約が入りました。管理画面で内容を確認してください。', `
<div class="header">
  <p class="brand">Admin Notice</p>
  <h1>新しい予約が入りました</h1>
</div>
<div class="body">
  <p>管理画面で予約内容を確認し、PayPalインボイスと手配状況を更新してください。</p>
  <div class="panel">
    <p class="panel-title">予約情報</p>
    <table>${fieldRows([
        ['予約番号', data.reservationId || data.reservationNumber],
        ['お客様名', data.customerName],
        ['ツアー名', data.productName],
        ['メール', data.customerEmail],
        ['電話番号', data.customerPhone],
        ['予約金', money(data.depositAmount)],
    ])}</table>
  </div>
  ${cta('管理画面を開く', `${SITE_URL}/admin/reservations`)}
</div>
${footer()}`);
}

function tplQuoteReceived(data: any) {
    return baseLayout('お見積りリクエストを受け付けました。担当者よりご連絡します。', `
<div class="header">
  <p class="brand">Milkyway Japan</p>
  <h1>お見積りリクエストを受け付けました</h1>
</div>
<div class="body">
  <p class="lead">${escapeHtml(data.customerName || 'お客様')} 様</p>
  <p>ご希望内容を確認のうえ、担当者より通常24時間以内にご連絡いたします。日程、人数、ご予算に合わせて最適なプランをご提案します。</p>
  <div class="panel">
    <p class="panel-title">ご相談内容</p>
    <table>${fieldRows([
        ['内容', data.productName || data.destination || 'オーダーメイド旅行相談'],
    ])}</table>
  </div>
  ${cta('マイページを確認する', `${SITE_URL}/mypage/estimates`)}
</div>
${footer()}`);
}

function tplAdminNewQuote(data: any) {
    return baseLayout('新しい見積り相談が入りました。', `
<div class="header">
  <p class="brand">Admin Notice</p>
  <h1>新しい見積り相談が入りました</h1>
</div>
<div class="body">
  <div class="panel">
    <p class="panel-title">相談者情報</p>
    <table>${fieldRows([
        ['お客様名', data.customerName],
        ['メール', data.customerEmail],
        ['電話番号', data.customerPhone],
        ['内容', data.productName || data.destination],
    ])}</table>
  </div>
  ${cta('見積り管理を開く', `${SITE_URL}/admin/quotes`)}
</div>
${footer()}`);
}

function tplGuideAssigned(data: any) {
    return baseLayout('担当ガイドと宿泊情報をご案内します。', `
<div class="header">
  <p class="brand">Milkyway Japan</p>
  <h1>担当ガイド・宿泊先のご案内</h1>
</div>
<div class="body">
  <p class="lead">${escapeHtml(data.customerName || 'お客様')} 様</p>
  <p>ご旅行の担当ガイドおよび現地手配情報が決まりましたのでご案内いたします。出発前の確認事項がある場合は、担当者より追加でご連絡します。</p>
  <div class="panel">
    <p class="panel-title">担当情報</p>
    <table>${fieldRows([
        ['ツアー名', data.productName],
        ['担当ガイド', data.guideName],
        ['ガイド連絡先', data.guidePhone],
    ])}</table>
  </div>
  ${cta('予約詳細を確認する', `${SITE_URL}/mypage/reservations${data.reservationDbId ? `/${data.reservationDbId}` : ''}`)}
</div>
${footer()}`);
}

function tplEstimateCompleted(data: any) {
    return baseLayout('お見積りが完成しました。内容をご確認ください。', `
<div class="header">
  <p class="brand">Milkyway Japan</p>
  <h1>お見積りが完成しました</h1>
</div>
<div class="body">
  <p class="lead">${escapeHtml(data.customerName || 'お客様')} 様</p>
  <p>ご希望内容に合わせたモンゴル旅行プランのお見積りをご用意しました。内容をご確認のうえ、ご不明点や調整希望がございましたらお気軽にご返信ください。</p>
  <div class="panel">
    <p class="panel-title">お見積り概要</p>
    <table>${fieldRows([
        ['目的地', data.destination],
        ['合計金額', money(data.totalAmount)],
    ])}</table>
  </div>
  ${data.adminNote ? `<div class="notice"><strong>担当者メモ</strong><br>${escapeHtml(data.adminNote).replace(/\n/g, '<br>')}</div>` : ''}
  ${cta('お見積り・旅行日程を確認する', `${SITE_URL}/estimate/${data.quoteId || data.reservationId || ''}`)}
  ${data.estimateUrl ? `<p style="text-align:center;margin-top:8px"><a href="${data.estimateUrl}" style="color:#0f766e;font-size:13px">外部見積書(PDF/資料)はこちら</a></p>` : ''}
</div>
${footer()}`);
}

function tplContractReady(data: any) {
    const url = `${SITE_URL}/documents/contract/${getDocumentReservationId(data)}`;
    return baseLayout('海外旅行契約書をご用意しました。内容をご確認ください。', `
<div class="header">
  <p class="brand">Milkyway Japan</p>
  <h1>海外旅行契約書のご案内</h1>
</div>
<div class="body">
  <p class="lead">${escapeHtml(data.customerName || 'お客様')} 様</p>
  <p>海外旅行契約書をご用意しました。旅行条件、旅行者情報、お支払い内容をご確認ください。修正が必要な場合は、このメールへご返信ください。</p>
  <div class="panel">
    <p class="panel-title">契約書情報</p>
    <table>${fieldRows([
        ['ツアー名', data.productName],
        ['旅行期間', data.travelDates],
        ['予約番号', data.reservationNumber || data.reservationId],
    ])}</table>
  </div>
  <div class="notice">予約金のご入金確認後、契約内容に基づき現地手配を進めます。</div>
  ${cta('契約書を確認する', url)}
</div>
${footer()}`);
}

function tplItineraryReady(data: any) {
    const url = `${SITE_URL}/documents/itinerary/${getDocumentReservationId(data)}`;
    return baseLayout('確定日程表をご用意しました。集合時間、宿泊先、行程をご確認ください。', `
<div class="header">
  <p class="brand">Milkyway Japan</p>
  <h1>確定日程表のご案内</h1>
</div>
<div class="body">
  <p class="lead">${escapeHtml(data.customerName || 'お客様')} 様</p>
  <p>ご旅行の確定日程表をご用意しました。日別行程、宿泊先、担当ガイド情報をご確認ください。</p>
  <div class="panel">
    <p class="panel-title">ご旅行情報</p>
    <table>${fieldRows([
        ['ツアー名', data.productName],
        ['旅行期間', data.travelDates],
        ['予約番号', data.reservationNumber || data.reservationId],
    ])}</table>
  </div>
  <div class="notice">
    <strong>ご出発前にご確認ください</strong>
    <ol class="steps">
      <li>集合時間、フライト情報、宿泊先に誤りがないかご確認ください。</li>
      <li>天候や道路状況により、現地で安全を優先して順序を調整する場合があります。</li>
      <li>変更希望やご不明点は、出発前に担当者へご連絡ください。</li>
    </ol>
  </div>
  ${cta('日程表を確認する', url)}
</div>
${footer()}`);
}

app.post('/', async (c) => {
    try {
        const { to, type, data = {} } = await c.req.json();
        const apiKey = c.env.RESEND_API_KEY;
        const adminEmail = c.env.ADMIN_EMAIL || 'agape_ibeel@hanpass.com';
        if (type === 'ITINERARY_READY' || type === 'CONTRACT_READY') {
            const documentReservationId = getDocumentReservationId(data);
            if (!documentReservationId) {
                return c.json({ error: 'A reservation UUID is required for customer documents' }, 400);
            }
            data.reservationId = documentReservationId;
            data.reservationDbId = documentReservationId;
        }

        // 이메일 키가 없어도 인앱 알림은 계속 생성해야 하므로 여기서 중단하지 않음
        if (!apiKey) {
            console.error('RESEND_API_KEY not set — skipping email, in-app notification만 생성');
        }

        let subject = '';
        let html = '';
        let adminSubject = '';
        let adminHtml = '';

        switch (type) {
            case 'RESERVATION_REQUESTED':
                subject = `【予約受付】${data.productName || 'モンゴル旅行'}のお申し込みありがとうございます | Milkyway Japan`;
                html = tplReservationRequested(data);
                adminSubject = `【新規予約】${data.customerName || 'お客様'} - ${data.productName || 'ツアー'}`;
                adminHtml = tplAdminNewReservation({ ...data, customerEmail: to });
                break;

            case 'PAYMENT_CONFIRMED':
                subject = `【ご入金確認】${data.productName || 'モンゴル旅行'}の予約金を確認しました | Milkyway Japan`;
                html = tplPaymentConfirmed(data);
                break;

            case 'QUOTE_RECEIVED':
                subject = '【見積り受付】ご相談ありがとうございます | Milkyway Japan';
                html = tplQuoteReceived(data);
                adminSubject = `【新規見積り】${data.customerName || 'お客様'}`;
                adminHtml = tplAdminNewQuote({ ...data, customerEmail: to });
                break;

            case 'GUIDE_ASSIGNED':
                subject = `【担当ガイド決定】${data.productName || 'ご旅行'}の現地手配情報 | Milkyway Japan`;
                html = tplGuideAssigned(data);
                break;

            case 'ESTIMATE_COMPLETED':
                subject = '【お見積り完成】モンゴル旅行プランをご確認ください | Milkyway Japan';
                html = tplEstimateCompleted(data);
                break;

            case 'ITINERARY_READY':
                subject = `【確定日程表】${data.productName || 'ご旅行'}のご案内 | Milkyway Japan`;
                html = tplItineraryReady(data);
                break;

            case 'CONTRACT_READY':
                subject = `【海外旅行契約書】${data.productName || 'ご旅行'}のご案内 | Milkyway Japan`;
                html = tplContractReady(data);
                break;

            default:
                return c.json({ error: `Unknown email type: ${type}` }, 400);
        }

        if (apiKey) {
            try {
                await sendEmail(apiKey, to, subject, html);
            } catch (mailErr) {
                console.error('Email send failed (continuing to create in-app notification):', mailErr);
            }
        }

        const targetUserId = data.userId || data.user_id;
        if (targetUserId && c.env.DB) {
            const inAppTitle = subject.replace(/\s*\|\s*Milkyway Japan\s*$/, '');
            const inAppMessage =
                type === 'ITINERARY_READY' ? '確定日程表をご用意しました。内容をご確認ください。' :
                type === 'CONTRACT_READY' ? '海外旅行契約書をご用意しました。内容をご確認ください。' :
                type === 'GUIDE_ASSIGNED' ? '担当ガイドと現地手配情報をご案内しました。' :
                type === 'RESERVATION_REQUESTED' ? 'ご予約リクエストを受け付けました。' :
                type === 'PAYMENT_CONFIRMED' ? 'ご予約金のご入金を確認しました。現地手配を進めます。' :
                type === 'QUOTE_RECEIVED' ? 'お見積りリクエストを受け付けました。' :
                type === 'ESTIMATE_COMPLETED' ? 'お見積りが完成しました。内容をご確認ください。' : '';
            const link =
                type === 'ITINERARY_READY' ? (data.reservationDbId ? `/mypage/reservations/${data.reservationDbId}` : `/documents/itinerary/${data.reservationId || ''}`) :
                type === 'CONTRACT_READY' ? (data.reservationDbId ? `/mypage/reservations/${data.reservationDbId}` : `/documents/contract/${data.reservationId || ''}`) :
                type === 'ESTIMATE_COMPLETED' ? `/estimate/${data.quoteId || data.reservationId || ''}` :
                type === 'GUIDE_ASSIGNED' || type === 'RESERVATION_REQUESTED' || type === 'PAYMENT_CONFIRMED' ? (data.reservationDbId ? `/mypage/reservations/${data.reservationDbId}` : '/mypage/reservations') :
                type === 'QUOTE_RECEIVED' ? '/mypage/estimates' : undefined;

            await createNotification(c.env.DB, {
                userId: targetUserId,
                type: 'reservation',
                title: inAppTitle,
                message: inAppMessage,
                link,
            });
        }

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
