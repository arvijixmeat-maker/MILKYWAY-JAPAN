const PAYPAL_LIVE_API = 'https://api-m.paypal.com';
const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';

function getPayPalApi(environment?: string): string {
    return environment?.toLowerCase() === 'sandbox'
        ? PAYPAL_SANDBOX_API
        : PAYPAL_LIVE_API;
}

async function getAccessToken(apiBase: string, clientId: string, secret: string): Promise<string> {
    const res = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
        throw new Error(`[PayPal Invoice][auth] ${res.status}: ${await res.text()}`);
    }
    const data: any = await res.json();
    if (!data.access_token) {
        throw new Error('[PayPal Invoice][auth] access_token missing from response');
    }
    return data.access_token;
}

function buildInvoiceBody(opts: {
    businessEmail: string;
    customerEmail?: string;
    customerName: string;
    reservationNumber: string;
    productName: string;
    depositAmount: number;
}, invoiceNumber: string) {
    return {
        detail: {
            invoice_number: invoiceNumber,
            currency_code: 'JPY',
            locale: 'ja_JP',
            note: `予約番号: ${opts.reservationNumber}\n残金は現地にて円現金でお支払いください。`,
            payment_term: { term_type: 'NET_10' },
            memo: opts.productName,
        },
        invoicer: {
            email_address: opts.businessEmail,
        },
        // 메일 주소가 없는 고객(인스타·페이스북 문의)도 결제 링크로 결제할 수 있게 이름만 넣는다
        primary_recipients: [{
            billing_info: {
                ...(opts.customerEmail ? { email_address: opts.customerEmail } : {}),
                name: { given_name: opts.customerName },
            },
        }],
        items: [{
            name: `予約金 - ${opts.productName}`,
            description: `予約番号: ${opts.reservationNumber}`,
            quantity: '1',
            unit_amount: { currency_code: 'JPY', value: String(Math.round(opts.depositAmount)) },
            unit_of_measure: 'QUANTITY',
        }],
        amount: {
            breakdown: {
                item_total: { currency_code: 'JPY', value: String(Math.round(opts.depositAmount)) },
            },
        },
    };
}

function isDuplicateInvoiceNumber(errorBody: string): boolean {
    return errorBody.includes('DUPLICATE_INVOICE_NUMBER');
}

export interface PayPalInvoiceResult { invoiceId: string; invoiceNumber: string; payUrl: string }

/**
 * 예약금 PayPal 청구서를 만들어 보낸다.
 * - 고객 메일이 있으면 PayPal 이 고객에게 메일을 보내고, 없으면 메일 없이 결제 링크만 만든다.
 * - 판매자 사본 메일(send_to_invoicer)은 보내지 않는다 — 같은 청구서 메일이 두 통 오는 것처럼 보였다.
 *   청구서는 PayPal 관리 화면에서 그대로 확인할 수 있다.
 * - 반환하는 payUrl(고객 결제 페이지)은 예약에 저장해 확정일정표의 결제 버튼·관리자 링크 복사에 쓴다.
 */
export async function sendPayPalInvoice(opts: {
    clientId: string;
    secret: string;
    businessEmail: string;
    customerEmail?: string;
    customerName: string;
    reservationNumber: string;
    productName: string;
    depositAmount: number;
    environment?: string;
}): Promise<PayPalInvoiceResult> {
    const apiBase = getPayPalApi(opts.environment);
    const token = await getAccessToken(apiBase, opts.clientId, opts.secret);

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const createInvoice = (invoiceNumber: string) => fetch(`${apiBase}/v2/invoicing/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildInvoiceBody(opts, invoiceNumber)),
    });

    let invoiceNumber = opts.reservationNumber;
    let createRes = await createInvoice(invoiceNumber);
    if (!createRes.ok) {
        const createError = await createRes.text();
        if (!isDuplicateInvoiceNumber(createError)) {
            throw new Error(`[PayPal Invoice][create] ${createRes.status}: ${createError}`);
        }

        invoiceNumber = `${opts.reservationNumber}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
        console.warn(`[PayPal Invoice][create] duplicate invoice number; retrying as ${invoiceNumber}`);
        createRes = await createInvoice(invoiceNumber);
        if (!createRes.ok) {
            throw new Error(`[PayPal Invoice][create retry] ${createRes.status}: ${await createRes.text()}`);
        }
    }

    const locationHeader = createRes.headers.get('Location') || createRes.headers.get('location');
    let invoiceId: string | undefined;

    if (locationHeader) {
        invoiceId = locationHeader.split('/').pop();
    }

    if (!invoiceId) {
        try {
            const invoice: any = await createRes.json();
            invoiceId = invoice.id || invoice.links?.find((l: any) => l.rel === 'self')?.href?.split('/').pop();
        } catch { /* empty body */ }
    }

    if (!invoiceId) {
        throw new Error('[PayPal Invoice][create] no invoice ID in response');
    }

    const sendRes = await fetch(`${apiBase}/v2/invoicing/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ send_to_recipient: !!opts.customerEmail, send_to_invoicer: false }),
    });

    if (!sendRes.ok) {
        throw new Error(`[PayPal Invoice][send] ${sendRes.status}: ${await sendRes.text()}`);
    }

    // 고객 결제 페이지 링크 — send 응답의 payer-view, 없으면 청구서 상세의 recipient_view_url
    let payUrl = '';
    try {
        const sent: any = await sendRes.json();
        payUrl = sent?.href && /payer|invoice\/p/i.test(sent.href) ? sent.href
            : sent?.links?.find((l: any) => l.rel === 'payer-view')?.href || '';
    } catch { /* 본문 없음 */ }
    if (!payUrl) {
        try {
            const detailRes = await fetch(`${apiBase}/v2/invoicing/invoices/${invoiceId}`, { headers });
            if (detailRes.ok) {
                const inv: any = await detailRes.json();
                payUrl = inv?.detail?.metadata?.recipient_view_url || inv?.links?.find((l: any) => l.rel === 'payer-view')?.href || '';
            }
        } catch { /* 링크 없이도 청구서는 발송됨 */ }
    }

    return { invoiceId, invoiceNumber, payUrl };
}
