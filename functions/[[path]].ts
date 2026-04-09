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
    
    let jsonLdString = '';

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

                // Construct Safe JSON-LD (No fake reviews)
                const productJsonLd = {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": product.name,
                    "image": pageImage,
                    "description": pageDescription,
                    "offers": {
                        "@type": "Offer",
                        "priceCurrency": "JPY",
                        "price": product.price,
                        "availability": "https://schema.org/InStock",
                        "url": pageUrl
                    }
                };
                jsonLdString = JSON.stringify(productJsonLd);
            }
        }
        // --- Logic for Travel Guides (Magazines) ---
        else {
            const guideMatch = path.match(/^\/travel-guide\/([^/]+)$/);
            if (guideMatch) {
                const guideId = guideMatch[1];
                try {
                    // Fetch magazine using raw D1 prepare as Drizzle schema limits import
                    const guide = await context.env.DB.prepare("SELECT * FROM magazines WHERE id = ?").bind(guideId).first();
                    if (guide) {
                        pageTitle = `${guide.title} | Milkyway Japan Travel Guide`;
                        pageDescription = (guide.subtitle || guide.description || SEO_CONSTANTS.DESCRIPTION) as string;

                        const imageStr = (guide.thumbnail || guide.image) as string;
                        if (imageStr) {
                            pageImage = getAbsoluteImageUrl(imageStr);
                        }

                        // Construct Safe JSON-LD for Articles
                        const articleJsonLd = {
                            "@context": "https://schema.org",
                            "@type": "Article",
                            "headline": guide.title,
                            "image": [pageImage],
                            "description": pageDescription,
                            "url": pageUrl
                        };
                        jsonLdString = JSON.stringify(articleJsonLd);
                    }
                } catch (e) {
                    console.log("Guide meta fetch skipped/failed:", e);
                }
            }
        }

    } catch (error) {
        console.error("Meta injection DB error:", error);
        // On error, we just fallback to default meta tags (do not block the user response)
    }

    // 2. Use HTMLRewriter to inject the dynamically fetched tags into the <head>
    return new HTMLRewriter()
        .on('title', {
            element(element) {
                element.setInnerContent(pageTitle);
            }
        })
        .on('meta', {
            element(element) {
                const name = element.getAttribute('name');
                const property = element.getAttribute('property');
                const targetTags = [
                    'description', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image',
                    'og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'
                ];
                if ((name && targetTags.includes(name)) || (property && targetTags.includes(property))) {
                    element.remove();
                }
            }
        })
        .on('head', {
            element(element) {
                element.append(`\n<!-- Injected by Cloudflare Edge SSR -->`, { html: true });
                
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

                // Dynamic JSON-LD structured data (Safe schema)
                if (jsonLdString) {
                    element.append(`\n<script type="application/ld+json">\n${jsonLdString}\n</script>`, { html: true });
                }
            }
        })
        .transform(response);
};
