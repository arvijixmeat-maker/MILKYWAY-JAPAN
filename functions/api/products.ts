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

// Helper to stringify if needed
const toJson = (val: any): string => {
    if (typeof val === 'string') return val;
    return JSON.stringify(val || []);
};

// Helper to get value from either snake_case or camelCase
const g = (data: any, snakeKey: string, camelKey: string, defaultVal: any = '') => {
    return data[snakeKey] ?? data[camelKey] ?? defaultVal;
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
            detailSlides: safeParse(p.detail_slides),
            detailBlocks: safeParse(p.detail_blocks),
            itineraryBlocks: safeParse(p.itinerary_blocks),
            highlights: safeParse(p.highlights),
            pricingOptions: safeParse(p.pricing_options),
            accommodationOptions: safeParse(p.accommodation_options),
            vehicleOptions: safeParse(p.vehicle_options),
            tags: safeParse(p.tags),
            included: safeParse(p.included),
            excluded: safeParse(p.excluded),
            images: safeParse(p.images),
            originalPrice: p.original_price,
            isFeatured: p.is_featured === 1 || p.featured === 1,
            isPopular: p.is_popular === 1 || p.popular === 1,
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
            detailSlides: safeParse(result.detail_slides),
            detailBlocks: safeParse(result.detail_blocks),
            itineraryBlocks: safeParse(result.itinerary_blocks),
            highlights: safeParse(result.highlights),
            pricingOptions: safeParse(result.pricing_options),
            accommodationOptions: safeParse(result.accommodation_options),
            vehicleOptions: safeParse(result.vehicle_options),
            tags: safeParse(result.tags),
            included: safeParse(result.included),
            excluded: safeParse(result.excluded),
            images: safeParse(result.images),
            originalPrice: result.original_price,
            isFeatured: result.is_featured === 1 || result.featured === 1,
            isPopular: result.is_popular === 1 || result.popular === 1,
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

        const mainImages = g(data, 'main_images', 'mainImages', []);
        const isFeatured = data.is_featured ?? data.isFeatured ?? false;
        const isPopular = data.is_popular ?? data.isPopular ?? false;

        await db.prepare(`
            INSERT INTO products (
                id, name, description, category, duration, price, original_price,
                main_images, gallery_images, detail_images, itinerary_images,
                images, thumbnail, status,
                is_featured, is_popular, featured, popular,
                tags, included, excluded,
                detail_slides, detail_blocks, itinerary_blocks,
                highlights, pricing_options, accommodation_options, vehicle_options,
                view_count, booking_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            data.name || '',
            data.description || '',
            data.category || '',
            data.duration || '',
            data.price || 0,
            g(data, 'original_price', 'originalPrice', 0),
            toJson(mainImages),
            toJson(g(data, 'gallery_images', 'galleryImages', [])),
            toJson(g(data, 'detail_images', 'detailImages', [])),
            toJson(g(data, 'itinerary_images', 'itineraryImages', [])),
            toJson(mainImages), // images = copy of mainImages
            (Array.isArray(mainImages) && mainImages.length > 0) ? mainImages[0] : '', // thumbnail
            data.status || 'active',
            isFeatured ? 1 : 0,
            isPopular ? 1 : 0,
            isFeatured ? 1 : 0,
            isPopular ? 1 : 0,
            toJson(data.tags || []),
            toJson(data.included || []),
            toJson(data.excluded || []),
            toJson(g(data, 'detail_slides', 'detailSlides', [])),
            toJson(g(data, 'detail_blocks', 'detailBlocks', [])),
            toJson(g(data, 'itinerary_blocks', 'itineraryBlocks', [])),
            toJson(data.highlights || []),
            toJson(g(data, 'pricing_options', 'pricingOptions', [])),
            toJson(g(data, 'accommodation_options', 'accommodationOptions', [])),
            toJson(g(data, 'vehicle_options', 'vehicleOptions', [])),
            data.view_count || data.viewCount || 0,
            data.booking_count || data.bookingCount || 0
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

        const mainImages = g(data, 'main_images', 'mainImages', []);
        const isFeatured = data.is_featured ?? data.isFeatured ?? false;
        const isPopular = data.is_popular ?? data.isPopular ?? false;

        await db.prepare(`
            UPDATE products SET
                name = ?, description = ?, category = ?, duration = ?, price = ?, original_price = ?,
                main_images = ?, gallery_images = ?, detail_images = ?, itinerary_images = ?,
                images = ?, thumbnail = ?, status = ?,
                is_featured = ?, is_popular = ?, featured = ?, popular = ?,
                tags = ?, included = ?, excluded = ?,
                detail_slides = ?, detail_blocks = ?, itinerary_blocks = ?,
                highlights = ?, pricing_options = ?, accommodation_options = ?, vehicle_options = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `).bind(
            data.name || '',
            data.description || '',
            data.category || '',
            data.duration || '',
            data.price || 0,
            g(data, 'original_price', 'originalPrice', 0),
            toJson(mainImages),
            toJson(g(data, 'gallery_images', 'galleryImages', [])),
            toJson(g(data, 'detail_images', 'detailImages', [])),
            toJson(g(data, 'itinerary_images', 'itineraryImages', [])),
            toJson(mainImages),
            (Array.isArray(mainImages) && mainImages.length > 0) ? mainImages[0] : '',
            data.status || 'active',
            isFeatured ? 1 : 0,
            isPopular ? 1 : 0,
            isFeatured ? 1 : 0,
            isPopular ? 1 : 0,
            toJson(data.tags || []),
            toJson(data.included || []),
            toJson(data.excluded || []),
            toJson(g(data, 'detail_slides', 'detailSlides', [])),
            toJson(g(data, 'detail_blocks', 'detailBlocks', [])),
            toJson(g(data, 'itinerary_blocks', 'itineraryBlocks', [])),
            toJson(data.highlights || []),
            toJson(g(data, 'pricing_options', 'pricingOptions', [])),
            toJson(g(data, 'accommodation_options', 'accommodationOptions', [])),
            toJson(g(data, 'vehicle_options', 'vehicleOptions', [])),
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
