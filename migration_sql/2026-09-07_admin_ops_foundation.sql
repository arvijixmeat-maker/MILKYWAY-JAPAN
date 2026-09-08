ALTER TABLE reservations ADD COLUMN quote_id TEXT;
ALTER TABLE reservations ADD COLUMN idempotency_key TEXT;
ALTER TABLE reservations ADD COLUMN price_source TEXT;
ALTER TABLE reservations ADD COLUMN price_verified_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_idempotency
ON reservations(idempotency_key);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT,
    actor_role TEXT,
    previous_data TEXT,
    next_data TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
ON audit_logs(entity_type, entity_id, created_at);

UPDATE quotes
SET status = CASE
    WHEN status IS NULL OR status = 'pending' THEN 'new'
    WHEN status = 'completed' THEN 'answered'
    WHEN status = 'pending_payment' THEN 'reservation_requested'
    WHEN status IN ('paid', 'confirmed') THEN 'converted'
    ELSE status
END
WHERE status IS NULL OR status IN ('pending', 'completed', 'pending_payment', 'paid', 'confirmed');
