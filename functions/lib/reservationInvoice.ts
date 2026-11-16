import { sendPayPalInvoice } from './paypal';

/**
 * 예약금 PayPal 청구서 — 예약당 한 장만.
 * 청구서 번호·결제 링크를 reservations.paypal_invoice(JSON) 에 저장해 두고,
 * 이미 있으면 다시 만들지 않는다 (같은 예약에 청구서가 두 번 나가지 않게).
 *
 * paypal_invoice 컬럼은 drizzle 스키마에 넣지 않았다 — 마이그레이션 전 운영 DB 에서
 * 예약 목록 조회(SELECT 컬럼 지정)가 깨지지 않도록, 원시 SQL 로만 읽고 쓴다.
 * 컬럼이 없으면 처음 저장할 때 자동으로 추가한다.
 */
export interface PayPalEnv {
    PAYPAL_CLIENT_ID?: string;
    PAYPAL_SECRET_KEY?: string;
    PAYPAL_BUSINESS_EMAIL?: string;
    PAYPAL_ENVIRONMENT?: string;
}
export interface StoredInvoice { invoiceId: string; invoiceNumber: string; payUrl: string; createdAt: string }

export const readInvoice = (row: any): StoredInvoice | null => {
    const raw = row?.paypal_invoice;
    if (!raw) return null;
    try { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return v && v.invoiceId ? v : null; } catch { return null; }
};

async function ensureColumn(db: any) {
    try { await db.prepare('ALTER TABLE reservations ADD COLUMN paypal_invoice TEXT').run(); } catch { /* 이미 있음 */ }
}

export async function saveInvoice(db: any, reservationId: string, inv: StoredInvoice) {
    const run = () => db.prepare('UPDATE reservations SET paypal_invoice = ? WHERE id = ?').bind(JSON.stringify(inv), reservationId).run();
    try { await run(); }
    catch (e: any) {
        if (!/no such column/i.test(String(e?.message || e))) throw e;
        await ensureColumn(db);
        await run();
    }
}

export const missingPayPalEnv = (env: PayPalEnv) => [
    !env.PAYPAL_CLIENT_ID && 'PAYPAL_CLIENT_ID',
    !env.PAYPAL_SECRET_KEY && 'PAYPAL_SECRET_KEY',
    !env.PAYPAL_BUSINESS_EMAIL && 'PAYPAL_BUSINESS_EMAIL',
].filter(Boolean) as string[];

/**
 * 예약의 청구서를 만들고(이미 있으면 그대로) 저장한다.
 * 메일 주소가 없는 고객도 결제 링크만으로 결제할 수 있게 만든다.
 */
export async function issueReservationInvoice(env: PayPalEnv, db: any, reservationId: string): Promise<{ invoice: StoredInvoice | null; created: boolean; reason?: string }> {
    const row: any = await db.prepare('SELECT * FROM reservations WHERE id = ?').bind(reservationId).first();
    if (!row) return { invoice: null, created: false, reason: 'not_found' };
    const existing = readInvoice(row);
    if (existing) return { invoice: existing, created: false };

    const missing = missingPayPalEnv(env);
    if (missing.length) return { invoice: null, created: false, reason: `missing ${missing.join(', ')}` };
    const deposit = Number(row.deposit_amount || 0);
    if (!Number.isFinite(deposit) || deposit <= 0) return { invoice: null, created: false, reason: 'no_deposit' };

    const result = await sendPayPalInvoice({
        clientId: env.PAYPAL_CLIENT_ID!,
        secret: env.PAYPAL_SECRET_KEY!,
        businessEmail: env.PAYPAL_BUSINESS_EMAIL!,
        customerEmail: row.customer_email ? String(row.customer_email) : undefined,
        customerName: String(row.customer_name || ''),
        reservationNumber: String(row.reservation_number || row.id),
        productName: String(row.product_name || ''),
        depositAmount: deposit,
        environment: env.PAYPAL_ENVIRONMENT,
    });
    const invoice: StoredInvoice = { ...result, createdAt: new Date().toISOString() };
    await saveInvoice(db, reservationId, invoice);
    return { invoice, created: true };
}
