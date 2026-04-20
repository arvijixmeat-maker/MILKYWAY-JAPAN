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

export async function sendPayPalInvoice(opts: {
    clientId: string;
    secret: string;
    businessEmail: string;
    customerEmail: string;
    customerName: string;
    reservationNumber: string;
    productName: string;
    depositAmount: number;
}): Promise<{ invoiceId: string }> {
    const token = await getAccessToken(opts.clientId, opts.secret);

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // 1. インボイス作成
    const createRes = await fetch(`${PAYPAL_API}/v2/invoicing/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            detail: {
                invoice_number: opts.reservationNumber,
                currency_code: 'JPY',
                note: `予約番号: ${opts.reservationNumber}\n残金は現地にて円現金でお支払いください。`,
                payment_term: { term_type: 'NET_10' },
                memo: opts.productName,
            },
            invoicer: {
                email_address: opts.businessEmail,
            },
            primary_recipients: [{
                billing_info: {
                    email_address: opts.customerEmail,
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
        }),
    });

    if (!createRes.ok) throw new Error(`PayPal invoice create failed: ${await createRes.text()}`);

    // PayPal v2 인보이스 ID는 Location 헤더 또는 응답 본문에서 추출
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

    if (!invoiceId) throw new Error('PayPal invoice create: no invoice ID in response');

    // 2. インボイス送信
    const sendRes = await fetch(`${PAYPAL_API}/v2/invoicing/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ send_to_recipient: true, send_to_invoicer: true }),
    });

    if (!sendRes.ok) throw new Error(`PayPal invoice send failed: ${await sendRes.text()}`);

    return { invoiceId };
}
