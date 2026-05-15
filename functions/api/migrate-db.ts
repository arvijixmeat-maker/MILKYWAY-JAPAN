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

    // Link reservations to itinerary templates
    try {
        await c.env.DB.prepare('ALTER TABLE reservations ADD COLUMN itinerary_template_id TEXT').run();
        migrationResults.push('Added reservations.itinerary_template_id');
    } catch (e: any) {
        migrationResults.push(`Skipped reservations.itinerary_template_id: ${e.message}`);
    }

    // Contract data (travelers, flights, region, category, etc.) stored as JSON
    try {
        await c.env.DB.prepare('ALTER TABLE reservations ADD COLUMN contract_data TEXT').run();
        migrationResults.push('Added reservations.contract_data');
    } catch (e: any) {
        migrationResults.push(`Skipped reservations.contract_data: ${e.message}`);
    }

    // Admin-managed reservation columns that were previously dropped silently
    const reservationColumns = [
        "assigned_guide TEXT",                          // JSON: guide object
        "contract_url TEXT",                            // legacy external URL (for pre-digital contracts)
        "itinerary_url TEXT",                           // legacy external URL
        "deposit_status TEXT DEFAULT 'unpaid'",
        "balance_status TEXT DEFAULT 'unpaid'",
        "are_assignments_visible_to_user INTEGER DEFAULT 0",
        "price_breakdown TEXT",                         // JSON: { total, deposit, local }
    ];
    for (const colDef of reservationColumns) {
        try {
            await c.env.DB.prepare(`ALTER TABLE reservations ADD COLUMN ${colDef}`).run();
            migrationResults.push(`Added reservations.${colDef}`);
        } catch (e: any) {
            migrationResults.push(`Skipped reservations.${colDef}: ${e.message}`);
        }
    }

    // In-app notifications table
    try {
        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY NOT NULL,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT,
                link TEXT,
                read INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        migrationResults.push('Created notifications table');
    } catch (e: any) {
        migrationResults.push(`Skipped notifications table: ${e.message}`);
    }
    try {
        await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at)').run();
        migrationResults.push('Created idx_notifications_user');
    } catch (e: any) {
        migrationResults.push(`Skipped idx_notifications_user: ${e.message}`);
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

    // Category landing page content columns
    const categoryLandingCols = [
        "landing_hero_image TEXT",
        "landing_hero_images TEXT",        // JSON string array of image URLs (slider)
        "landing_hero_tagline TEXT",
        "landing_hero_title TEXT",
        "landing_hero_subtitle TEXT",
        "landing_accent_color TEXT",
        "landing_highlights TEXT",         // JSON string
        "landing_product_grid_title TEXT",
    ];
    for (const colDef of categoryLandingCols) {
        try {
            await c.env.DB.prepare(`ALTER TABLE categories ADD COLUMN ${colDef}`).run();
            migrationResults.push(`Added categories.${colDef}`);
        } catch (e: any) {
            migrationResults.push(`Skipped categories.${colDef}: ${e.message}`);
        }
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

    // Create itinerary_templates table
    try {
        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS itinerary_templates (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                days TEXT DEFAULT '[]',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        migrationResults.push('Created itinerary_templates table');
    } catch (e: any) {
        migrationResults.push(`Skipped itinerary_templates table: ${e.message}`);
    }

    // Products: per-product FAQ list (JSON array of { q, a }).
    // When empty, the frontend falls back to a site-wide common FAQ.
    try {
        await c.env.DB.prepare("ALTER TABLE products ADD COLUMN faqs TEXT DEFAULT '[]'").run();
        migrationResults.push('Added products.faqs');
    } catch (e: any) {
        migrationResults.push(`Skipped products.faqs: ${e.message}`);
    }

    // Hotels — reusable hotel master library.
    // Picked from dayInfo.accommodation in the product itinerary editor
    // so admin doesn't have to type "마리나베이샌즈호텔" repeatedly.
    try {
        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS hotels (
                id TEXT PRIMARY KEY NOT NULL,
                code TEXT DEFAULT '',
                name_kr TEXT NOT NULL,
                name_local TEXT DEFAULT '',
                country TEXT DEFAULT '',
                city TEXT DEFAULT '',
                region TEXT DEFAULT '',
                star_rating INTEGER DEFAULT 0,
                address TEXT DEFAULT '',
                latitude REAL,
                longitude REAL,
                description TEXT DEFAULT '',
                website TEXT DEFAULT '',
                images TEXT DEFAULT '[]',
                amenities TEXT DEFAULT '[]',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        migrationResults.push('Created hotels table');
    } catch (e: any) {
        migrationResults.push(`Skipped hotels table: ${e.message}`);
    }

    // Tourist spots — reusable master library for the timeline blocks.
    // Picked from timeline events in the product itinerary editor so
    // admin doesn't have to retype spot title/description/photos.
    try {
        await c.env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS tourist_spots (
                id TEXT PRIMARY KEY NOT NULL,
                name_kr TEXT NOT NULL,
                name_local TEXT DEFAULT '',
                address TEXT DEFAULT '',
                description TEXT DEFAULT '',
                images TEXT DEFAULT '[]',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        migrationResults.push('Created tourist_spots table');
    } catch (e: any) {
        migrationResults.push(`Skipped tourist_spots table: ${e.message}`);
    }

    // Banners: PC-specific hero image (wider aspect ratio than mobile).
    // Falls back to `image` when not set.
    try {
        await c.env.DB.prepare("ALTER TABLE banners ADD COLUMN pc_image TEXT").run();
        migrationResults.push('Added banners.pc_image');
    } catch (e: any) {
        migrationResults.push(`Skipped banners.pc_image: ${e.message}`);
    }

    // Magazines: location/map columns for embedding Google Maps in posts
    const magazineLocationColumns = [
        "location_name TEXT",
        "location_address TEXT",
        "location_phone TEXT",
        "location_website TEXT",
        "location_hours TEXT",          // JSON: { mon: '09:00-17:00', ... }
        "map_embed_url TEXT",           // Google Maps embed iframe src
        "map_query TEXT",               // Address or "lat,lng" for directions URL
    ];
    for (const colDef of magazineLocationColumns) {
        try {
            await c.env.DB.prepare(`ALTER TABLE magazines ADD COLUMN ${colDef}`).run();
            migrationResults.push(`Added magazines.${colDef}`);
        } catch (e: any) {
            migrationResults.push(`Skipped magazines.${colDef}: ${e.message}`);
        }
    }

    return c.json({
        success: true,
        message: "Migrations executed",
        details: migrationResults
    });
});

export default app;
