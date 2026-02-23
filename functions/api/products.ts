import { Hono } from 'hono';

type Env = {
    DB: any;
};

const app = new Hono<{ Bindings: Env }>();

// Helper to safely parse JSON
const safeParse = (val: any, fallback: any = []) => {
    if (!val) return fallback;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
    }
    return val;
};

// GET /api/products
app.get('/', async (c) => {
    const db = c.env.DB;
    try {
        const result = await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
        const parsed = (result.results || []).map((p: any) => ({
            ...p,
            mainImages: safeParse(p.main_images),
            galleryImages: safeParse(p.gallery_images),
            detailImages: safeParse(p.detail_images),
            itineraryImages: safeParse(p.itinerary_images),
            tags: safeParse(p.tags),
            included: safeParse(p.included),
            excluded: safeParse(p.excluded),
            images: safeParse(p.images),
        }));
        return c.json(parsed);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// GET /api/products/:id
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        const result = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
        if (!result) return c.json({ error: 'Product not found' }, 404);

        const parsed = {
            ...result,
            mainImages: safeParse(result.main_images),
            galleryImages: safeParse(result.gallery_images),
            detailImages: safeParse(result.detail_images),
            itineraryImages: safeParse(result.itinerary_images),
            tags: safeParse(result.tags),
            included: safeParse(result.included),
            excluded: safeParse(result.excluded),
            images: safeParse(result.images),
        };
        return c.json(parsed);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/products
app.post('/', async (c) => {
    try {
        const data = await c.req.json();
        const db = c.env.DB;
        const id = data.id || `prod-${Date.now()}`;

        await db.prepare(`
            INSERT INTO products (id, name, description, category, duration, price, original_price,
                main_images, gallery_images, detail_images, itinerary_images, images, thumbnail,
                status, is_featured, is_popular, featured, popular,
                tags, included, excluded, view_count, booking_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            data.name || '',
            data.description || '',
            data.category || '',
            data.duration || '',
            data.price || 0,
            data.originalPrice || data.original_price || 0,
            JSON.stringify(data.mainImages || []),
            JSON.stringify(data.galleryImages || []),
            JSON.stringify(data.detailImages || []),
            JSON.stringify(data.itineraryImages || []),
            JSON.stringify(data.images || data.mainImages || []),
            data.thumbnail || (data.mainImages && data.mainImages[0]) || '',
            data.status || 'active',
            data.isFeatured ? 1 : 0,
            data.isPopular ? 1 : 0,
            data.isFeatured ? 1 : 0,
            data.isPopular ? 1 : 0,
            JSON.stringify(data.tags || []),
            JSON.stringify(data.included || []),
            JSON.stringify(data.excluded || []),
            data.viewCount || 0,
            data.bookingCount || 0
        ).run();

        return c.json({ success: true, id });
    } catch (e: any) {
        console.error('Product create error:', e);
        return c.json({ error: e.message }, 500);
    }
});

// PUT /api/products/:id
app.put('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const data = await c.req.json();
        const db = c.env.DB;

        await db.prepare(`
            UPDATE products SET
                name = ?, description = ?, category = ?, duration = ?, price = ?, original_price = ?,
                main_images = ?, gallery_images = ?, detail_images = ?, itinerary_images = ?,
                images = ?, thumbnail = ?,
                status = ?, is_featured = ?, is_popular = ?, featured = ?, popular = ?,
                tags = ?, included = ?, excluded = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `).bind(
            data.name || '',
            data.description || '',
            data.category || '',
            data.duration || '',
            data.price || 0,
            data.originalPrice || data.original_price || 0,
            JSON.stringify(data.mainImages || []),
            JSON.stringify(data.galleryImages || []),
            JSON.stringify(data.detailImages || []),
            JSON.stringify(data.itineraryImages || []),
            JSON.stringify(data.images || data.mainImages || []),
            data.thumbnail || (data.mainImages && data.mainImages[0]) || '',
            data.status || 'active',
            data.isFeatured ? 1 : 0,
            data.isPopular ? 1 : 0,
            data.isFeatured ? 1 : 0,
            data.isPopular ? 1 : 0,
            JSON.stringify(data.tags || []),
            JSON.stringify(data.included || []),
            JSON.stringify(data.excluded || []),
            id
        ).run();

        return c.json({ success: true });
    } catch (e: any) {
        console.error('Product update error:', e);
        return c.json({ error: e.message }, 500);
    }
});

// DELETE /api/products/:id
app.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const db = c.env.DB;
        await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
        return c.json({ success: true });
    } catch (e: any) {
        console.error('Product delete error:', e);
        return c.json({ error: e.message }, 500);
    }
});

export default app;
