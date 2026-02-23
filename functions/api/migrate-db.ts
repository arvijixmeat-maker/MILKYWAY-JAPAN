import { Hono } from 'hono';

type Env = {
    DB: any;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
    try {
        await c.env.DB.prepare("ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'product'").run();
        return c.json({ success: true, message: "Added 'type' column to categories table successfully!" });
    } catch (e: any) {
        // If it already exists, it will throw an error, which is fine at this point, but we can catch it.
        if (e.message.includes('duplicate column name')) {
            return c.json({ success: true, message: "Column 'type' already exists." });
        }
        return c.json({ success: false, error: e.message });
    }
});

export default app;
