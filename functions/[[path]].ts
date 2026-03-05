import { drizzle } from 'drizzle-orm/d1';
import { products } from '../src/db/schema/products';

import { eq } from 'drizzle-orm';
import { SEO_CONSTANTS } from '../src/constants/seo';

interface Env {
    DB: D1Database;
}

// Helper to construct absolute image URLs
const getAbsoluteImageUrl = (url: string) => {
    if (!url) return `${SEO_CONSTANTS.SITE_URL}${SEO_CONSTANTS.OG_IMAGE}`;
    if (url.startsWith('http')) return url;
    return `${SEO_CONSTANTS.SITE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    // 1. Get the original response from the asset (usually index.html for unknown routes in an SPA)
    const response = await context.next();

    // Only process responses that are HTML. We don't want to rewrite assets, images, API JSON, etc.
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
        return response;
    }

    const url = new URL(context.request.url);
    const path = url.pathname;

    let pageTitle = SEO_CONSTANTS.TITLE;
    let pageDescription = SEO_CONSTANTS.DESCRIPTION;
    let pageImage = getAbsoluteImageUrl(SEO_CONSTANTS.OG_IMAGE);
    const pageUrl = url.href;

    try {
        const db = drizzle(context.env.DB);

        // --- Logic for Products ---
        const productMatch = path.match(/^\/products\/([^/]+)$/);
        if (productMatch) {
            const productId = productMatch[1];
            const productArr = await db.select().from(products).where(eq(products.id, productId)).limit(1);
            if (productArr.length > 0) {
                const product = productArr[0];
                pageTitle = `${product.name} | Milkyway Japan`;
                pageDescription = product.description || SEO_CONSTANTS.DESCRIPTION;

                // Parse images if stored as stringified JSON
                let images = [];
                try {
                    images = typeof product.mainImages === 'string' ? JSON.parse(product.mainImages) : product.mainImages;
                } catch (e) { }

                if (images && images.length > 0) {
                    pageImage = getAbsoluteImageUrl(images[0]);
                }
            }
        }
        // --- Logic for Travel Guides (Magazines) ---
        else {
            const guideMatch = path.match(/^\/travel-guide\/([^/]+)$/);
            if (guideMatch) {
                // Feature deferred: D1 table for magazines is not yet implemented in schema.
                // We leave the RegEx match block so fallback logic can be added later.
            }
        }

    } catch (error) {
        console.error("Meta injection DB error:", error);
        // On error, we just fallback to default meta tags (do not block the user response)
    }

    // 2. Use HTMLRewriter to inject the dynamically fetched tags into the <head>
    return new HTMLRewriter()
        .on('head', {
            element(element) {
                // Ensure we inject meta tags with proper escaping (Cloudflare HTMLRewriter handles text escaping usually, 
                // but for raw HTML we must be careful. We construct exact strings).

                // Remove existing generic tags if needed (optional, typically late-appended tags take precedence in crawlers)
                // For safety we just append ours.

                element.append(`\n<!-- Injected by Cloudflare Edge SSR -->`, { html: true });
                element.append(`\n<title>${pageTitle}</title>`, { html: true });

                // Standard meta
                element.append(`\n<meta name="description" content="${pageDescription}">`, { html: true });

                // Open Graph
                element.append(`\n<meta property="og:title" content="${pageTitle}">`, { html: true });
                element.append(`\n<meta property="og:description" content="${pageDescription}">`, { html: true });
                element.append(`\n<meta property="og:image" content="${pageImage}">`, { html: true });
                element.append(`\n<meta property="og:url" content="${pageUrl}">`, { html: true });
                element.append(`\n<meta property="og:type" content="website">`, { html: true });

                // Twitter Card
                element.append(`\n<meta name="twitter:card" content="summary_large_image">`, { html: true });
                element.append(`\n<meta name="twitter:title" content="${pageTitle}">`, { html: true });
                element.append(`\n<meta name="twitter:description" content="${pageDescription}">`, { html: true });
                element.append(`\n<meta name="twitter:image" content="${pageImage}">`, { html: true });
            }
        })
        .transform(response);
};
