import { Hono } from 'hono';

type Env = {
    DB: any;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
    let migrationResults: string[] = [];

    // Add reservation_number column to reservations table
    try {
        await c.env.DB.prepare('ALTER TABLE reservations ADD COLUMN reservation_number TEXT').run();
        migrationResults.push('Added reservations.reservation_number');
    } catch (e: any) {
        migrationResults.push(`Skipped reservations.reservation_number: ${e.message}`);
    }

    // Create quotes table if it doesn't exist
    try {
        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS quotes (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                destination TEXT,
                headcount TEXT,
                period TEXT,
                budget TEXT,
                travel_types TEXT,
                accommodations TEXT,
                vehicle TEXT,
                additional_request TEXT,
                attachment_url TEXT,
                status TEXT DEFAULT 'pending',
                admin_note TEXT,
                estimate_url TEXT,
                confirmed_start_date TEXT,
                confirmed_end_date TEXT,
                confirmed_price INTEGER,
                deposit INTEGER,
                deposit_status TEXT DEFAULT 'unpaid',
                balance_status TEXT DEFAULT 'unpaid',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        console.log("quotes table migration ok");
    } catch (e: any) {
        console.log("quotes table migration: ", e.message);
    }

    try {
        await c.env.DB.prepare("ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'product'").run();
        console.log("categories migration ok");
    } catch (e: any) {
        console.log("categories migration: ", e.message);
    }
    
    // Travel Mates Migrations
    const travelMatesColumns = [
        "image TEXT",
        "start_date TEXT",
        "end_date TEXT",
        "duration TEXT",
        "recruit_count INTEGER DEFAULT 1",
        "gender TEXT DEFAULT 'any'",
        "age_groups TEXT DEFAULT '[]'",
        "region TEXT",
        "styles TEXT DEFAULT '[]'",
        "author_info TEXT",
        "view_count INTEGER DEFAULT 0",
        "comment_count INTEGER DEFAULT 0",
        "author_name TEXT",
        "author_image TEXT",
        "description TEXT"
    ];

    for (const colDef of travelMatesColumns) {
        try {
            await c.env.DB.prepare(`ALTER TABLE travel_mates ADD COLUMN ${colDef}`).run();
            migrationResults.push(`Added travel_mates.${colDef}`);
        } catch (e: any) {
            migrationResults.push(`Skipped travel_mates.${colDef}: ${e.message}`);
        }
    }

    // Add ALL potentially missing columns to quotes table (safe to run multiple times)
    const quotesColumns = [
        "user_id TEXT",
        "type TEXT",
        "name TEXT",
        "phone TEXT",
        "email TEXT",
        "destination TEXT",
        "headcount TEXT",
        "period TEXT",
        "budget TEXT",
        "travel_types TEXT",
        "accommodations TEXT",
        "vehicle TEXT",
        "additional_request TEXT",
        "attachment_url TEXT",
        "status TEXT DEFAULT 'pending'",
        "admin_note TEXT",
        "estimate_url TEXT",
        "confirmed_start_date TEXT",
        "confirmed_end_date TEXT",
        "confirmed_price INTEGER",
        "deposit INTEGER",
        "deposit_status TEXT DEFAULT 'unpaid'",
        "balance_status TEXT DEFAULT 'unpaid'",
        "created_at TEXT DEFAULT CURRENT_TIMESTAMP",
        "updated_at TEXT DEFAULT CURRENT_TIMESTAMP",
    ];
    for (const colDef of quotesColumns) {
        try {
            await c.env.DB.prepare(`ALTER TABLE quotes ADD COLUMN ${colDef}`).run();
            migrationResults.push(`Added quotes.${colDef}`);
        } catch (e: any) {
            migrationResults.push(`Skipped quotes.${colDef}: ${e.message}`);
        }
    }

    // Create accommodations table
    try {
        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS accommodations (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                location TEXT DEFAULT '',
                type TEXT DEFAULT '',
                price_per_night INTEGER DEFAULT 0,
                images TEXT DEFAULT '[]',
                thumbnail TEXT DEFAULT '',
                amenities TEXT DEFAULT '[]',
                facilities TEXT DEFAULT '[]',
                rating REAL DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        migrationResults.push('Created accommodations table');
    } catch (e: any) {
        migrationResults.push(`Skipped accommodations table: ${e.message}`);
    }

    // Add missing columns to accommodations table
    const accommodationsColumns = [
        "type TEXT DEFAULT ''",
        "facilities TEXT DEFAULT '[]'",
        "price_per_night INTEGER DEFAULT 0",
        "rating REAL DEFAULT 0",
    ];
    for (const colDef of accommodationsColumns) {
        try {
            await c.env.DB.prepare(`ALTER TABLE accommodations ADD COLUMN ${colDef}`).run();
            migrationResults.push(`Added accommodations.${colDef}`);
        } catch (e: any) {
            migrationResults.push(`Skipped accommodations.${colDef}: ${e.message}`);
        }
    }

    // Create guides table
    try {
        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS guides (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                bio TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                languages TEXT DEFAULT '[]',
                specialties TEXT DEFAULT '[]',
                image TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        migrationResults.push('Created guides table');
    } catch (e: any) {
        migrationResults.push(`Skipped guides table: ${e.message}`);
    }

    // Add status column to guides if missing
    try {
        await c.env.DB.prepare("ALTER TABLE guides ADD COLUMN status TEXT DEFAULT 'active'").run();
        migrationResults.push('Added guides.status');
    } catch (e: any) {
        migrationResults.push(`Skipped guides.status: ${e.message}`);
    }

    // Add experience_years column to guides if missing
    try {
        await c.env.DB.prepare("ALTER TABLE guides ADD COLUMN experience_years INTEGER DEFAULT 0").run();
        migrationResults.push('Added guides.experience_years');
    } catch (e: any) {
        migrationResults.push(`Skipped guides.experience_years: ${e.message}`);
    }

    return c.json({
        success: true,
        message: "Migrations executed",
        details: migrationResults
    });
});

export default app;
