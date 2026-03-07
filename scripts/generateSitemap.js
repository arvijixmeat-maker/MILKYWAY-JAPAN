import fs from 'fs';
import path from 'path';
import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), '');

// We use the production mongolryokou domain to fetch data from the Cloudflare Worker API
const DOMAIN = 'https://mongolryokou.com';
const API_BASE = `${DOMAIN}/api`;

async function fetchFromApi(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) {
            console.warn(`⚠️ Warning: Failed to fetch from ${endpoint} (Status: ${response.status})`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Error fetching ${endpoint}:`, error.message);
        return null;
    }
}

async function generateSitemap() {
    console.log('Generating dynamic sitemap...');
    
    // Core Static Routes
    const staticRoutes = [
        { url: '/', priority: 1.0, changefreq: 'weekly' },
        { url: '/products', priority: 0.9, changefreq: 'weekly' },
        { url: '/custom-estimate', priority: 0.8, changefreq: 'monthly' },
        { url: '/travel-guide', priority: 0.8, changefreq: 'weekly' },
        { url: '/travel-mates', priority: 0.8, changefreq: 'daily' },
        { url: '/reviews', priority: 0.8, changefreq: 'daily' },
        { url: '/faq', priority: 0.7, changefreq: 'monthly' },
    ];

    const dynamicUrls = [];
    const prerenderRoutes = ['/', '/products', '/travel-guide', '/faq', '/reviews', '/custom-estimate', '/travel-mates'];

    try {
        // 1. Fetch Products
        console.log('Fetching products from API...');
        const products = await fetchFromApi('/products');

        if (products && Array.isArray(products)) {
            products.forEach(product => {
                // Ensure the product is active
                if (product.status !== 'active' && product.is_active !== true) return;
                
                dynamicUrls.push({
                    url: `/products/${product.id}`,
                    lastmod: product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    changefreq: 'weekly',
                    priority: 0.9,
                });
                prerenderRoutes.push(`/products/${product.id}`);
            });
            console.log(`✅ Loaded ${products.length} products`);
        } else {
            console.warn('⚠️ No products found or API error.');
        }

        // 2. Fetch Travel Guides (Magazines)
        console.log('Fetching magazines from API...');
        const guides = await fetchFromApi('/magazines');

        if (guides && Array.isArray(guides)) {
            guides.forEach(guide => {
                if (guide.status !== 'active' && guide.is_active !== true) return;
                
                dynamicUrls.push({
                    url: `/travel-guide/${guide.id}`,
                    lastmod: guide.updated_at ? new Date(guide.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    changefreq: 'monthly',
                    priority: 0.8,
                });
                prerenderRoutes.push(`/travel-guide/${guide.id}`);
            });
            console.log(`✅ Loaded ${guides.length} magazines/guides`);
        } else {
            console.warn('⚠️ No magazines found or API error.');
        }

        // --- Build XML ---
        const allRoutes = [...staticRoutes, ...dynamicUrls];
        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(item => `  <url>
    <loc>${DOMAIN}${item.url}</loc>
    ${item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : `<lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

        // Save sitemap to public folder
        const publicDir = path.resolve(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml);
        console.log(`✅ sitemap.xml generated with ${allRoutes.length} URLs.`);

        // Save prerender routes to root for Vite config to read
        fs.writeFileSync(
            path.resolve(process.cwd(), 'prerender-routes.json'),
            JSON.stringify(prerenderRoutes, null, 2)
        );
        console.log(`✅ prerender-routes.json generated with ${prerenderRoutes.length} paths for Prerendering.`);

    } catch (error) {
        console.error('❌ Error generating sitemap:', error);
        process.exit(1);
    }
}

generateSitemap();
