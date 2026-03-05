import { drizzle } from 'drizzle-orm/d1';
import { products } from '../src/db/schema/products';
import { eq } from 'drizzle-orm';
import { SEO_CONSTANTS } from '../src/constants/seo';

// Define the Cloudflare Env interface
interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const db = drizzle(context.env.DB);

        // Fetch all active products
        const activeProducts = await db
            .select({
                id: products.id,
                updatedAt: products.updatedAt
            })
            .from(products)
            .where(eq(products.status, 'active'));

        const today = new Date().toISOString().split('T')[0];
        const baseUrl = SEO_CONSTANTS.SITE_URL;

        // Base static URLs
        const urls = [
            { loc: `${baseUrl}`, lastmod: today, changefreq: 'daily', priority: '1.0' },
            { loc: `${baseUrl}/products`, lastmod: today, changefreq: 'daily', priority: '0.9' },
            { loc: `${baseUrl}/travel-guide`, lastmod: today, changefreq: 'daily', priority: '0.9' },
            { loc: `${baseUrl}/travel-mates`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
            { loc: `${baseUrl}/reviews`, lastmod: today, changefreq: 'daily', priority: '0.8' },
            { loc: `${baseUrl}/custom-estimate`, lastmod: today, changefreq: 'monthly', priority: '0.7' },
            { loc: `${baseUrl}/about`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
            { loc: `${baseUrl}/faq`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
        ];

        // Add dynamic product URLs
        activeProducts.forEach(product => {
            const lastModFormat = product.updatedAt ? product.updatedAt.split(' ')[0] : today;
            urls.push({
                loc: `${baseUrl}/products/${product.id}`,
                lastmod: lastModFormat,
                changefreq: 'weekly',
                priority: '0.8'
            });
        });

        // Add dynamic travel guide (magazine) URLs using raw D1 query
        let magazinesResult;
        try {
            magazinesResult = await context.env.DB.prepare(
                "SELECT id, updated_at FROM magazines WHERE is_published = 1 OR is_active = 1"
            ).all();
        } catch (e) {
            // column 'is_published' or 'is_active' may differ depending on migrations, fallback to all:
            try {
                magazinesResult = await context.env.DB.prepare("SELECT id, updated_at FROM magazines").all();
            } catch (err) {
                console.error("Failed to fetch magazines for sitemap:", err);
            }
        }

        if (magazinesResult && magazinesResult.results) {
            magazinesResult.results.forEach((mag: any) => {
                const lastModFormat = mag.updated_at ? mag.updated_at.split(' ')[0] : today;
                urls.push({
                    loc: `${baseUrl}/travel-guide/${mag.id}`,
                    lastmod: lastModFormat,
                    changefreq: 'monthly',
                    priority: '0.7'
                });
            });
        }

        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

        return new Response(sitemapXml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour at edge
            }
        });
    } catch (error) {
        console.error('Failed to generate sitemap:', error);
        // Fallback to minimal sitemap on error so search engines don't get 500s
        const baseUrl = SEO_CONSTANTS.SITE_URL;
        const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

        return new Response(fallbackXml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8'
            }
        });
    }
};
