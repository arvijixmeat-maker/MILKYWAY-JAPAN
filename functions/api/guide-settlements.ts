import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { initializeLucia } from '../lib/auth';
import { requireAdmin } from '../lib/adminAuth';

type Env = {
    DB: any;
    BUCKET: any;
};

const app = new Hono<{ Bindings: Env }>();
let schemaReady = false;

const ensureSchema = async (db: any) => {
    if (schemaReady) return;
    await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS guide_settlements (
            id TEXT PRIMARY KEY,
            reservation_id TEXT NOT NULL,
            reservation_number TEXT,
            guide_id TEXT,
            guide_name TEXT NOT NULL,
            guide_phone TEXT,
            title TEXT NOT NULL,
            start_date TEXT,
            end_date TEXT,
            travelers INTEGER DEFAULT 1,
            base_currency TEXT DEFAULT 'MNT',
            exchange_rate REAL DEFAULT 1,
            advance_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'draft',
            admin_note TEXT DEFAULT '',
            access_token_hash TEXT NOT NULL,
            submitted_at TEXT,
            approved_at TEXT,
            paid_at TEXT,
            created_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS guide_expense_items (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            spent_at TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            quantity REAL DEFAULT 1,
            unit_price REAL DEFAULT 0,
            planned_amount REAL DEFAULT 0,
            actual_amount REAL DEFAULT 0,
            currency TEXT DEFAULT 'MNT',
            exchange_rate REAL DEFAULT 1,
            base_amount REAL DEFAULT 0,
            merchant TEXT DEFAULT '',
            note TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES guide_settlements(id) ON DELETE CASCADE
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS guide_expense_receipts (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            storage_key TEXT NOT NULL,
            file_name TEXT NOT NULL,
            content_type TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES guide_settlements(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES guide_expense_items(id) ON DELETE CASCADE
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS guide_settlement_logs (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            action TEXT NOT NULL,
            message TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_guide_settlements_reservation ON guide_settlements(reservation_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_guide_expense_items_report ON guide_expense_items(report_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_guide_receipts_item ON guide_expense_receipts(item_id)'),
    ]);
    schemaReady = true;
};

const numberValue = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const tokenHash = async (token: string) => {
    const bytes = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
};

const createAccessToken = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('');
};

const isAdminRequest = async (c: any) => {
    try {
        const lucia = initializeLucia(c.env.DB);
        const sessionId = getCookie(c, lucia.sessionCookieName);
        if (!sessionId) return false;
        const { session, user } = await lucia.validateSession(sessionId);
        return !!session && user?.role === 'admin';
    } catch {
        return false;
    }
};

const authorizeReport = async (c: any, reportId: string) => {
    const token = c.req.header('X-Guide-Token') || c.req.query('token') || '';
    if (token) {
        const row = await c.env.DB.prepare(
            'SELECT access_token_hash FROM guide_settlements WHERE id = ? LIMIT 1'
        ).bind(reportId).first();
        if (row?.access_token_hash && await tokenHash(token) === row.access_token_hash) {
            return { role: 'guide' as const, token };
        }
    }
    if (await isAdminRequest(c)) return { role: 'admin' as const, token: '' };
    return null;
};

const addLog = async (db: any, reportId: string, actorRole: string, action: string, message = '') => {
    await db.prepare(
        'INSERT INTO guide_settlement_logs (id, report_id, actor_role, action, message) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), reportId, actorRole, action, message).run();
};

const mapReceipt = (row: any) => ({
    id: row.id,
    reportId: row.report_id,
    itemId: row.item_id,
    fileName: row.file_name,
    contentType: row.content_type,
    fileSize: numberValue(row.file_size),
    createdAt: row.created_at,
    url: `/api/guide-settlements/${row.report_id}/receipts/${row.id}`,
});

const mapItem = (row: any, receipts: any[]) => ({
    id: row.id,
    reportId: row.report_id,
    spentAt: row.spent_at,
    category: row.category,
    description: row.description,
    quantity: numberValue(row.quantity, 1),
    unitPrice: numberValue(row.unit_price),
    plannedAmount: numberValue(row.planned_amount),
    actualAmount: numberValue(row.actual_amount),
    currency: row.currency || 'MNT',
    exchangeRate: numberValue(row.exchange_rate, 1),
    baseAmount: numberValue(row.base_amount),
    merchant: row.merchant || '',
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    receipts: receipts.filter((receipt) => receipt.itemId === row.id),
});

const buildReport = async (db: any, row: any, includeItems = true) => {
    const itemRows = await db.prepare(
        'SELECT * FROM guide_expense_items WHERE report_id = ? ORDER BY spent_at ASC, created_at ASC'
    ).bind(row.id).all();
    const receiptRows = await db.prepare(
        'SELECT * FROM guide_expense_receipts WHERE report_id = ? ORDER BY created_at DESC'
    ).bind(row.id).all();
    const receipts = (receiptRows.results || []).map(mapReceipt);
    const items = (itemRows.results || []).map((item: any) => mapItem(item, receipts));
    const planned = items.reduce((sum: number, item: any) => sum + item.plannedAmount, 0);
    const actual = items.reduce((sum: number, item: any) => sum + item.baseAmount, 0);
    const cashBalance = Math.max(0, numberValue(row.advance_amount) - actual);
    const reimbursement = Math.max(0, actual - numberValue(row.advance_amount));
    const missingReceiptCount = items.filter((item: any) => item.actualAmount > 0 && item.receipts.length === 0).length;

    const report: any = {
        id: row.id,
        reservationId: row.reservation_id,
        reservationNumber: row.reservation_number || '',
        guideId: row.guide_id || '',
        guideName: row.guide_name,
        guidePhone: row.guide_phone || '',
        title: row.title,
        startDate: row.start_date || '',
        endDate: row.end_date || '',
        travelers: numberValue(row.travelers, 1),
        baseCurrency: row.base_currency || 'MNT',
        exchangeRate: numberValue(row.exchange_rate, 1),
        advanceAmount: numberValue(row.advance_amount),
        status: row.status || 'draft',
        adminNote: row.admin_note || '',
        submittedAt: row.submitted_at || '',
        approvedAt: row.approved_at || '',
        paidAt: row.paid_at || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        totals: {
            planned,
            actual,
            variance: planned - actual,
            cashBalance,
            reimbursement,
            itemCount: items.length,
            receiptCount: receipts.length,
            missingReceiptCount,
        },
    };
    if (includeItems) report.items = items;
    return report;
};

const getReportRow = async (db: any, id: string) => db.prepare(
    'SELECT * FROM guide_settlements WHERE id = ? LIMIT 1'
).bind(id).first();

const EDITABLE_STATUSES = new Set(['draft', 'in_progress', 'changes_requested']);

app.get('/', requireAdmin, async (c) => {
    await ensureSchema(c.env.DB);
    const result = await c.env.DB.prepare('SELECT * FROM guide_settlements ORDER BY created_at DESC').all();
    const reports = await Promise.all((result.results || []).map((row: any) => buildReport(c.env.DB, row, false)));
    return c.json(reports);
});

app.post('/', requireAdmin, async (c) => {
    await ensureSchema(c.env.DB);
    const body: any = await c.req.json();
    if (!body.reservationId) return c.json({ error: '예약을 선택해 주세요.' }, 400);

    const reservation: any = await c.env.DB.prepare(
        `SELECT id, reservation_number, product_name, start_date, end_date, travelers, assigned_guide
         FROM reservations WHERE id = ? LIMIT 1`
    ).bind(body.reservationId).first();
    if (!reservation) return c.json({ error: '예약을 찾을 수 없습니다.' }, 404);

    const existing = await c.env.DB.prepare(
        "SELECT id FROM guide_settlements WHERE reservation_id = ? AND status != 'paid' LIMIT 1"
    ).bind(reservation.id).first();
    if (existing) return c.json({ error: '이 예약에는 진행 중인 정산서가 이미 있습니다.', reportId: existing.id }, 409);

    let assignedGuide: any = {};
    try { assignedGuide = reservation.assigned_guide ? JSON.parse(reservation.assigned_guide) : {}; } catch { assignedGuide = {}; }
    const guideName = String(body.guideName || assignedGuide.name || '').trim();
    if (!guideName) return c.json({ error: '예약에 담당 가이드를 먼저 배정해 주세요.' }, 400);

    const id = crypto.randomUUID();
    const accessToken = createAccessToken();
    const hash = await tokenHash(accessToken);
    await c.env.DB.prepare(`INSERT INTO guide_settlements (
        id, reservation_id, reservation_number, guide_id, guide_name, guide_phone, title,
        start_date, end_date, travelers, base_currency, exchange_rate, advance_amount,
        status, access_token_hash, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`)
        .bind(
            id,
            reservation.id,
            reservation.reservation_number || '',
            body.guideId || assignedGuide.id || '',
            guideName,
            body.guidePhone || assignedGuide.phone || '',
            body.title || reservation.product_name || 'モンゴルツアー',
            body.startDate || reservation.start_date || '',
            body.endDate || reservation.end_date || '',
            numberValue(body.travelers, numberValue(reservation.travelers, 1)),
            body.baseCurrency || 'MNT',
            numberValue(body.exchangeRate, 22.4),
            numberValue(body.advanceAmount),
            hash,
            'admin'
        ).run();
    await addLog(c.env.DB, id, 'admin', 'created', '정산서를 생성했습니다.');
    const row = await getReportRow(c.env.DB, id);
    return c.json({ report: await buildReport(c.env.DB, row), accessToken }, 201);
});

app.get('/:id/admin', requireAdmin, async (c) => {
    await ensureSchema(c.env.DB);
    const row = await getReportRow(c.env.DB, c.req.param('id'));
    if (!row) return c.json({ error: '정산서를 찾을 수 없습니다.' }, 404);
    return c.json(await buildReport(c.env.DB, row));
});

app.post('/:id/access-link', requireAdmin, async (c) => {
    await ensureSchema(c.env.DB);
    const id = c.req.param('id');
    const row = await getReportRow(c.env.DB, id);
    if (!row) return c.json({ error: '정산서를 찾을 수 없습니다.' }, 404);
    const accessToken = createAccessToken();
    await c.env.DB.prepare(
        "UPDATE guide_settlements SET access_token_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(await tokenHash(accessToken), id).run();
    await addLog(c.env.DB, id, 'admin', 'link_reset', '가이드 보안 링크를 재발급했습니다.');
    return c.json({ accessToken });
});

app.post('/:id/status', requireAdmin, async (c) => {
    await ensureSchema(c.env.DB);
    const id = c.req.param('id');
    const body: any = await c.req.json();
    const status = String(body.status || '');
    if (!['draft', 'changes_requested', 'approved', 'paid'].includes(status)) {
        return c.json({ error: '변경할 수 없는 상태입니다.' }, 400);
    }
    const row = await getReportRow(c.env.DB, id);
    if (!row) return c.json({ error: '정산서를 찾을 수 없습니다.' }, 404);
    const approvedAt = status === 'approved' ? new Date().toISOString() : row.approved_at;
    const paidAt = status === 'paid' ? new Date().toISOString() : row.paid_at;
    await c.env.DB.prepare(`UPDATE guide_settlements
        SET status = ?, admin_note = ?, approved_at = ?, paid_at = ?, updated_at = datetime('now')
        WHERE id = ?`)
        .bind(status, String(body.adminNote ?? row.admin_note ?? ''), approvedAt || null, paidAt || null, id)
        .run();
    await addLog(c.env.DB, id, 'admin', `status_${status}`, String(body.adminNote || ''));
    return c.json(await buildReport(c.env.DB, await getReportRow(c.env.DB, id)));
});

app.get('/:id/guide', async (c) => {
    await ensureSchema(c.env.DB);
    const id = c.req.param('id');
    const actor = await authorizeReport(c, id);
    if (!actor) return c.json({ error: '유효하지 않거나 만료된 가이드 링크입니다.' }, 401);
    const row = await getReportRow(c.env.DB, id);
    if (!row) return c.json({ error: '정산서를 찾을 수 없습니다.' }, 404);
    return c.json(await buildReport(c.env.DB, row));
});

app.post('/:id/submit', async (c) => {
    await ensureSchema(c.env.DB);
    const id = c.req.param('id');
    const actor = await authorizeReport(c, id);
    if (!actor || actor.role !== 'guide') return c.json({ error: '가이드 권한이 필요합니다.' }, 401);
    const row = await getReportRow(c.env.DB, id);
    if (!row) return c.json({ error: '정산서를 찾을 수 없습니다.' }, 404);
    if (!EDITABLE_STATUSES.has(row.status)) return c.json({ error: '현재 상태에서는 제출할 수 없습니다.' }, 409);
    const count: any = await c.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM guide_expense_items WHERE report_id = ? AND actual_amount > 0'
    ).bind(id).first();
    if (!numberValue(count?.count)) return c.json({ error: '실제 지출을 한 건 이상 등록해 주세요.' }, 400);
    const submittedAt = new Date().toISOString();
    await c.env.DB.prepare(
        "UPDATE guide_settlements SET status = 'submitted', submitted_at = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(submittedAt, id).run();
    await addLog(c.env.DB, id, 'guide', 'submitted', '가이드가 정산서를 제출했습니다.');
    return c.json(await buildReport(c.env.DB, await getReportRow(c.env.DB, id)));
});

app.post('/:id/items', async (c) => {
    await ensureSchema(c.env.DB);
    const reportId = c.req.param('id');
    const actor = await authorizeReport(c, reportId);
    if (!actor) return c.json({ error: '접근 권한이 없습니다.' }, 401);
    const report = await getReportRow(c.env.DB, reportId);
    if (!report) return c.json({ error: '정산서를 찾을 수 없습니다.' }, 404);
    if (!EDITABLE_STATUSES.has(report.status)) return c.json({ error: '검토가 시작된 정산서는 수정할 수 없습니다.' }, 409);

    const body: any = await c.req.json();
    const description = String(body.description || '').trim();
    if (!description) return c.json({ error: '지출 내용을 입력해 주세요.' }, 400);
    const currency = String(body.currency || report.base_currency || 'MNT').toUpperCase();
    const actualAmount = Math.max(0, numberValue(body.actualAmount));
    const exchangeRate = currency === report.base_currency
        ? 1
        : Math.max(0, numberValue(body.exchangeRate, numberValue(report.exchange_rate, 1)));
    const baseAmount = Math.round(actualAmount * exchangeRate);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(`INSERT INTO guide_expense_items (
        id, report_id, spent_at, category, description, quantity, unit_price,
        planned_amount, actual_amount, currency, exchange_rate, base_amount, merchant, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
            id,
            reportId,
            body.spentAt || new Date().toISOString().slice(0, 10),
            body.category || 'other',
            description,
            Math.max(0, numberValue(body.quantity, 1)),
            Math.max(0, numberValue(body.unitPrice)),
            actor.role === 'admin' ? Math.max(0, numberValue(body.plannedAmount)) : 0,
            actualAmount,
            currency,
            exchangeRate,
            baseAmount,
            String(body.merchant || ''),
            String(body.note || '')
        ).run();
    if (actor.role === 'guide' && report.status === 'draft') {
        await c.env.DB.prepare(
            "UPDATE guide_settlements SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?"
        ).bind(reportId).run();
    }
    await addLog(c.env.DB, reportId, actor.role, 'item_created', description);
    const updatedReport = await buildReport(c.env.DB, await getReportRow(c.env.DB, reportId));
    return c.json({ report: updatedReport, item: updatedReport.items.find((entry: any) => entry.id === id) }, 201);
});

app.put('/:id/items/:itemId', async (c) => {
    await ensureSchema(c.env.DB);
    const reportId = c.req.param('id');
    const itemId = c.req.param('itemId');
    const actor = await authorizeReport(c, reportId);
    if (!actor) return c.json({ error: '접근 권한이 없습니다.' }, 401);
    const report = await getReportRow(c.env.DB, reportId);
    const item: any = await c.env.DB.prepare(
        'SELECT * FROM guide_expense_items WHERE id = ? AND report_id = ? LIMIT 1'
    ).bind(itemId, reportId).first();
    if (!report || !item) return c.json({ error: '지출 항목을 찾을 수 없습니다.' }, 404);
    if (!EDITABLE_STATUSES.has(report.status)) return c.json({ error: '검토가 시작된 정산서는 수정할 수 없습니다.' }, 409);

    const body: any = await c.req.json();
    const currency = String(body.currency ?? item.currency ?? report.base_currency).toUpperCase();
    const actualAmount = Math.max(0, numberValue(body.actualAmount, item.actual_amount));
    const exchangeRate = currency === report.base_currency
        ? 1
        : Math.max(0, numberValue(body.exchangeRate, numberValue(item.exchange_rate, report.exchange_rate)));
    const plannedAmount = actor.role === 'admin'
        ? Math.max(0, numberValue(body.plannedAmount, item.planned_amount))
        : numberValue(item.planned_amount);
    await c.env.DB.prepare(`UPDATE guide_expense_items SET
        spent_at = ?, category = ?, description = ?, quantity = ?, unit_price = ?,
        planned_amount = ?, actual_amount = ?, currency = ?, exchange_rate = ?, base_amount = ?,
        merchant = ?, note = ?, updated_at = datetime('now')
        WHERE id = ? AND report_id = ?`)
        .bind(
            body.spentAt ?? item.spent_at,
            body.category ?? item.category,
            String(body.description ?? item.description).trim(),
            Math.max(0, numberValue(body.quantity, item.quantity)),
            Math.max(0, numberValue(body.unitPrice, item.unit_price)),
            plannedAmount,
            actualAmount,
            currency,
            exchangeRate,
            Math.round(actualAmount * exchangeRate),
            body.merchant ?? item.merchant ?? '',
            body.note ?? item.note ?? '',
            itemId,
            reportId
        ).run();
    await addLog(c.env.DB, reportId, actor.role, 'item_updated', String(body.description ?? item.description));
    return c.json(await buildReport(c.env.DB, await getReportRow(c.env.DB, reportId)));
});

app.delete('/:id/items/:itemId', async (c) => {
    await ensureSchema(c.env.DB);
    const reportId = c.req.param('id');
    const itemId = c.req.param('itemId');
    const actor = await authorizeReport(c, reportId);
    if (!actor) return c.json({ error: '접근 권한이 없습니다.' }, 401);
    const report = await getReportRow(c.env.DB, reportId);
    if (!report) return c.json({ error: '정산서를 찾을 수 없습니다.' }, 404);
    if (!EDITABLE_STATUSES.has(report.status)) return c.json({ error: '검토가 시작된 정산서는 수정할 수 없습니다.' }, 409);
    const receiptRows = await c.env.DB.prepare(
        'SELECT storage_key FROM guide_expense_receipts WHERE report_id = ? AND item_id = ?'
    ).bind(reportId, itemId).all();
    for (const receipt of receiptRows.results || []) {
        try { await c.env.BUCKET?.delete(receipt.storage_key); } catch { /* DB cleanup still proceeds */ }
    }
    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM guide_expense_receipts WHERE report_id = ? AND item_id = ?').bind(reportId, itemId),
        c.env.DB.prepare('DELETE FROM guide_expense_items WHERE report_id = ? AND id = ?').bind(reportId, itemId),
    ]);
    await addLog(c.env.DB, reportId, actor.role, 'item_deleted', itemId);
    return c.json(await buildReport(c.env.DB, await getReportRow(c.env.DB, reportId)));
});

app.post('/:id/items/:itemId/receipts', async (c) => {
    await ensureSchema(c.env.DB);
    const reportId = c.req.param('id');
    const itemId = c.req.param('itemId');
    const actor = await authorizeReport(c, reportId);
    if (!actor) return c.json({ error: '접근 권한이 없습니다.' }, 401);
    const report = await getReportRow(c.env.DB, reportId);
    if (!report || !EDITABLE_STATUSES.has(report.status)) return c.json({ error: '영수증을 추가할 수 없는 상태입니다.' }, 409);
    const item = await c.env.DB.prepare(
        'SELECT id FROM guide_expense_items WHERE id = ? AND report_id = ? LIMIT 1'
    ).bind(itemId, reportId).first();
    if (!item) return c.json({ error: '지출 항목을 찾을 수 없습니다.' }, 404);

    const form = await c.req.parseBody();
    const file = form.file;
    if (!file || typeof file === 'string') return c.json({ error: '영수증 파일을 선택해 주세요.' }, 400);
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    if (!allowed.has(file.type)) return c.json({ error: 'JPG, PNG, WEBP, PDF만 등록할 수 있습니다.' }, 400);
    if (file.size > 10 * 1024 * 1024) return c.json({ error: '영수증은 10MB 이하만 등록할 수 있습니다.' }, 400);
    if (!c.env.BUCKET) return c.json({ error: '파일 저장소가 연결되지 않았습니다.' }, 500);

    const receiptId = crypto.randomUUID();
    const extension = (file.name.split('.').pop() || (file.type === 'application/pdf' ? 'pdf' : 'webp')).toLowerCase();
    const storageKey = `expense-receipts/${reportId}/${receiptId}.${extension}`;
    await c.env.BUCKET.put(storageKey, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { reportId, itemId },
    });
    await c.env.DB.prepare(`INSERT INTO guide_expense_receipts (
        id, report_id, item_id, storage_key, file_name, content_type, file_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(receiptId, reportId, itemId, storageKey, file.name, file.type, file.size).run();
    await addLog(c.env.DB, reportId, actor.role, 'receipt_uploaded', file.name);
    return c.json(await buildReport(c.env.DB, await getReportRow(c.env.DB, reportId)), 201);
});

app.get('/:id/receipts/:receiptId', async (c) => {
    await ensureSchema(c.env.DB);
    const reportId = c.req.param('id');
    const actor = await authorizeReport(c, reportId);
    if (!actor) return c.json({ error: '접근 권한이 없습니다.' }, 401);
    const receipt: any = await c.env.DB.prepare(
        'SELECT * FROM guide_expense_receipts WHERE id = ? AND report_id = ? LIMIT 1'
    ).bind(c.req.param('receiptId'), reportId).first();
    if (!receipt) return c.json({ error: '영수증을 찾을 수 없습니다.' }, 404);
    const object = await c.env.BUCKET?.get(receipt.storage_key);
    if (!object) return c.json({ error: '영수증 파일을 찾을 수 없습니다.' }, 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Content-Disposition', `inline; filename="${String(receipt.file_name).replace(/["\r\n]/g, '_')}"`);
    return new Response(object.body, { headers });
});

app.delete('/:id/receipts/:receiptId', async (c) => {
    await ensureSchema(c.env.DB);
    const reportId = c.req.param('id');
    const actor = await authorizeReport(c, reportId);
    if (!actor) return c.json({ error: '접근 권한이 없습니다.' }, 401);
    const report = await getReportRow(c.env.DB, reportId);
    if (!report || !EDITABLE_STATUSES.has(report.status)) return c.json({ error: '영수증을 삭제할 수 없는 상태입니다.' }, 409);
    const receipt: any = await c.env.DB.prepare(
        'SELECT * FROM guide_expense_receipts WHERE id = ? AND report_id = ? LIMIT 1'
    ).bind(c.req.param('receiptId'), reportId).first();
    if (!receipt) return c.json({ error: '영수증을 찾을 수 없습니다.' }, 404);
    try { await c.env.BUCKET?.delete(receipt.storage_key); } catch { /* remove metadata below */ }
    await c.env.DB.prepare('DELETE FROM guide_expense_receipts WHERE id = ? AND report_id = ?')
        .bind(receipt.id, reportId).run();
    await addLog(c.env.DB, reportId, actor.role, 'receipt_deleted', receipt.file_name);
    return c.json(await buildReport(c.env.DB, await getReportRow(c.env.DB, reportId)));
});

export default app;
