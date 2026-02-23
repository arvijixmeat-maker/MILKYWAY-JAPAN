import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { products } from '../../src/db/schema/products';
import { eq } from 'drizzle-orm';

const app = new Hono<{ Bindings: Env }>();

// GET /api/products
app.get('/', async (c) => {
    const db = drizzle(c.env.DB);
    const result = await db.select().from(products).all();

    // Parse JSON fields
    const parsed = result.map(p => ({
        ...p,
        mainImages: JSON.parse(p.mainImages),
        galleryImages: JSON.parse(p.galleryImages),
        detailImages: JSON.parse(p.detailImages),
        itineraryImages: JSON.parse(p.itineraryImages),
        tags: JSON.parse(p.tags),
        included: JSON.parse(p.included),
        excluded: JSON.parse(p.excluded),
    }));

    return c.json(parsed);
});

// GET /api/products/:id
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = drizzle(c.env.DB);
    const result = await db.select().from(products).where(eq(products.id, id)).get();

    if (!result) return c.json({ error: 'Product not found' }, 404);

    // Parse JSON fields
    const parsed = {
        ...result,
        mainImages: JSON.parse(result.mainImages),
        galleryImages: JSON.parse(result.galleryImages),
        detailImages: JSON.parse(result.detailImages),
        itineraryImages: JSON.parse(result.itineraryImages),
        tags: JSON.parse(result.tags),
        included: JSON.parse(result.included),
        excluded: JSON.parse(result.excluded),
    };

    return c.json(parsed);
});

// POST /api/products
app.post('/', async (c) => {
    try {
        const data = await c.req.json();
        const db = drizzle(c.env.DB);
        const id = data.id || `prod-${Date.now()}`;

        await db.insert(products).values({
            id,
            name: data.name || '',
            description: data.description || '',
            category: data.category || '',
            duration: data.duration || '',
            price: data.price || 0,
            originalPrice: data.originalPrice || data.original_price || null,
            mainImages: JSON.stringify(data.mainImages || []),
            galleryImages: JSON.stringify(data.galleryImages || []),
            detailImages: JSON.stringify(data.detailImages || []),
            itineraryImages: JSON.stringify(data.itineraryImages || []),
            status: data.status || 'active',
            isFeatured: data.isFeatured ?? false,
            isPopular: data.isPopular ?? false,
            tags: JSON.stringify(data.tags || []),
            included: JSON.stringify(data.included || []),
            excluded: JSON.stringify(data.excluded || []),
            viewCount: data.viewCount || 0,
            bookingCount: data.bookingCount || 0,
        });

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
        const db = drizzle(c.env.DB);

        await db.update(products).set({
            name: data.name || '',
            description: data.description || '',
            category: data.category || '',
            duration: data.duration || '',
            price: data.price || 0,
            originalPrice: data.originalPrice || data.original_price || null,
            mainImages: JSON.stringify(data.mainImages || []),
            galleryImages: JSON.stringify(data.galleryImages || []),
            detailImages: JSON.stringify(data.detailImages || []),
            itineraryImages: JSON.stringify(data.itineraryImages || []),
            status: data.status || 'active',
            isFeatured: data.isFeatured ?? false,
            isPopular: data.isPopular ?? false,
            tags: JSON.stringify(data.tags || []),
            included: JSON.stringify(data.included || []),
            excluded: JSON.stringify(data.excluded || []),
        }).where(eq(products.id, id));

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
        const db = drizzle(c.env.DB);
        await db.delete(products).where(eq(products.id, id));
        return c.json({ success: true });
    } catch (e: any) {
        console.error('Product delete error:', e);
        return c.json({ error: e.message }, 500);
    }
});

export default app;
