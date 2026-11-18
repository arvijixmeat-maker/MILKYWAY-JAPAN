import { PRICING_SEED } from './pricingSeed';

/**
 * 요금표가 「알아서 준비되게」 한다 — 관리자가 /api/migrate-db 를 열거나 버튼을 누르지 않아도
 * 처음 쓰는 순간 표를 만들고, 한 번도 채운 적이 없으면 받은 원가표로 채운다.
 * (관리자가 원가표를 일부러 비운 뒤에는 다시 채우지 않는다 — 'seeded' 표시)
 */
export async function ensurePricingReady(db: any): Promise<void> {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS cost_items (
            id TEXT PRIMARY KEY NOT NULL,
            category TEXT NOT NULL,
            region TEXT DEFAULT '',
            name TEXT NOT NULL,
            grade TEXT DEFAULT '',
            unit TEXT NOT NULL,
            price_mnt INTEGER DEFAULT 0,
            peak_price_mnt INTEGER DEFAULT 0,
            supplier TEXT DEFAULT '',
            note TEXT DEFAULT '',
            source TEXT DEFAULT '',
            needs_check INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
    await db.prepare('CREATE TABLE IF NOT EXISTS pricing_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT)').run();
    const seeded: any = await db.prepare("SELECT value FROM pricing_settings WHERE key = 'seeded'").first();
    if (seeded) return;
    const n: any = await db.prepare('SELECT COUNT(*) AS n FROM cost_items').first();
    if (!(Number(n?.n) > 0)) await seedCostItems(db);
    await db.prepare("INSERT INTO pricing_settings (key, value) VALUES ('seeded', ?) ON CONFLICT(key) DO NOTHING").bind(new Date().toISOString()).run();
}

/** 받은 원가표 값을 넣는다 (모두 「확인 필요」 표시) */
export async function seedCostItems(db: any): Promise<void> {
    const stmts = PRICING_SEED.map(([category, region, name, grade, unit, price, note], i) => db.prepare(`
        INSERT OR IGNORE INTO cost_items (id, category, region, name, grade, unit, price_mnt, peak_price_mnt, supplier, note, source, needs_check, is_active, sort_order, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, '', ?, '2026 원가표', 1, 1, ?, datetime('now'))
    `).bind(`cost-seed-${i.toString(36).padStart(3, '0')}`, category, region, name, grade, unit, price, note, i));
    for (let i = 0; i < stmts.length; i += 80) await db.batch(stmts.slice(i, i + 80));
}
