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

    return c.json({
        success: true,
        message: "Migrations executed",
        details: migrationResults
    });
});

export default app;
