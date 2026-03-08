import { Hono } from 'hono';

type Env = {
    DB: any;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
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

    let migrationResults = [];
    for (const colDef of travelMatesColumns) {
        try {
            await c.env.DB.prepare(`ALTER TABLE travel_mates ADD COLUMN ${colDef}`).run();
            migrationResults.push(`Added ${colDef}`);
        } catch (e: any) {
            migrationResults.push(`Skipped ${colDef}: ${e.message}`);
        }
    }

    return c.json({ 
        success: true, 
        message: "Migrations executed", 
        details: migrationResults 
    });
});

export default app;
