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


export default app;
