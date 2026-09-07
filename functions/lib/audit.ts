type AuditDatabase = {
    prepare: (query: string) => {
        bind: (...values: unknown[]) => { run: () => Promise<unknown> };
    };
};

export type AuditEntry = {
    entityType: 'reservation' | 'quote' | 'accommodation' | 'migration';
    entityId: string;
    action: 'create' | 'update' | 'delete' | 'migrate';
    actorId?: string | null;
    actorRole?: string | null;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
};

const OPERATIONAL_FIELDS = new Set([
    'id', 'type', 'status', 'productId', 'product_id', 'quoteId', 'quote_id',
    'travelers', 'startDate', 'start_date', 'endDate', 'end_date',
    'totalPrice', 'total_price', 'depositAmount', 'deposit_amount',
    'balanceAmount', 'balance_amount', 'depositStatus', 'deposit_status',
    'balanceStatus', 'balance_status', 'assignedGuide', 'assigned_guide',
    'dailyAccommodations', 'daily_accommodations', 'source', 'priceSource',
    'price_source', 'priceVerifiedAt', 'price_verified_at', 'updatedAt', 'updated_at',
]);

function operationalSnapshot(value: unknown): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value ?? null;
    const output: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(value as Record<string, unknown>)) {
        if (OPERATIONAL_FIELDS.has(key)) output[key] = fieldValue;
    }
    return output;
}

function json(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
}

export async function writeAuditLog(db: AuditDatabase, entry: AuditEntry): Promise<void> {
    await db.prepare(`
        INSERT INTO audit_logs (
            id, entity_type, entity_id, action, actor_id, actor_role,
            previous_data, next_data, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
        crypto.randomUUID(),
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.actorId || null,
        entry.actorRole || null,
        json(operationalSnapshot(entry.before)),
        json(operationalSnapshot(entry.after)),
        json(entry.metadata),
    ).run();
}

export async function writeAuditLogSafely(db: AuditDatabase, entry: AuditEntry): Promise<void> {
    try {
        await writeAuditLog(db, entry);
    } catch (error) {
        // During a rolling deployment the application can briefly run before the
        // migration is applied. Business mutations must still succeed, but the
        // missing audit table is made visible in logs instead of being swallowed.
        console.error('[Audit] failed to write audit log', error);
    }
}
