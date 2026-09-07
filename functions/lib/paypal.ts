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
    customerEmail: string;
    customerName: string;
    reservationNumber: string;
    productName: string;
    depositAmount: number;
}, invoiceNumber: string) {
    return {
        detail: {
            invoice_number: invoiceNumber,
            currency_code: 'JPY',
            reference: `予約番号 ${opts.reservationNumber}`,
            note: `モンゴル旅行のご予約金です。\n予約番号: ${opts.reservationNumber}\n残金は旅行当日に日本円でお支払いください。`,
            terms_and_conditions: '予約金のお支払い確認後に予約が確定します。キャンセル規定はMilkyway Japanの利用規約をご確認ください。',
            payment_term: { term_type: 'DUE_ON_RECEIPT' },
            memo: opts.productName,
        },
        invoicer: {
            email_address: opts.businessEmail,
        },
        primary_recipients: [{
            billing_info: {
                email_address: opts.customerEmail,
                name: { given_name: opts.customerName },
                language: 'ja-JP',
                additional_info: '日本語で対応いたします',
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
        configuration: {
            allow_tip: false,
            partial_payment: { allow_partial_payment: false },
            tax_calculated_after_discount: false,
            tax_inclusive: false,
        },
    };
}

function isDuplicateInvoiceNumber(errorBody: string): boolean {
    return errorBody.includes('DUPLICATE_INVOICE_NUMBER');
}

export async function sendPayPalInvoice(opts: {
    clientId: string;
    secret: string;
    businessEmail: string;
    customerEmail: string;
    customerName: string;
    reservationNumber: string;
    productName: string;
    depositAmount: number;
    environment?: string;
}): Promise<{ invoiceId: string; invoiceNumber: string; recipientViewUrl?: string }> {
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
        body: JSON.stringify({ send_to_recipient: true, send_to_invoicer: false }),
    });

    if (!sendRes.ok) {
        throw new Error(`[PayPal Invoice][send] ${sendRes.status}: ${await sendRes.text()}`);
    }

    let recipientViewUrl: string | undefined;
    try {
        const sendData: any = await sendRes.json();
        recipientViewUrl = sendData?.href
            || sendData?.links?.find((link: any) => link.rel === 'payer-view')?.href;
    } catch { /* PayPal may return an empty 202 response */ }

    if (!recipientViewUrl) {
        try {
            const detailsRes = await fetch(`${apiBase}/v2/invoicing/invoices/${invoiceId}`, { headers });
            if (detailsRes.ok) {
                const details: any = await detailsRes.json();
                recipientViewUrl = details?.detail?.metadata?.recipient_view_url
                    || details?.links?.find((link: any) => link.rel === 'payer-view')?.href;
            }
        } catch { /* The email invoice is still valid even if the link lookup fails. */ }
    }

    return { invoiceId, invoiceNumber, recipientViewUrl };
}
