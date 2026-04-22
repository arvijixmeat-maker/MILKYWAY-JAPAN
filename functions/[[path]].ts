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

// 301 redirects from legacy hand-coded SEO pages.
// Targets must exist (verify before adding). For `/category/...` targets the admin-managed
// category row must have a matching id; use the slug editor in the admin panel if not.
const LEGACY_REDIRECTS: Record<string, string> = {
    '/gobi-desert': '/category/gobi-desert',
    '/horse-riding-tour': '/category/horse-riding-tour',
    '/mongol-travel': '/travel-guide',
    '/mongol-tour': '/products',
};

// Per-page SEO configurations for static routes
const STATIC_PAGE_META: Record<string, { title: string; description: string }> = {
    '/products': {
        title: 'モンゴルツアー商品一覧 | Milkyway Japan',
        description: 'モンゴル乗馬旅行、ゴビ砂漠ツアー、テレルジ国立公園、フブスグル湖など、地域・テーマ別にモンゴルツアーをお探しいただけます。日本語ガイド同行で安心。'
    },
    '/travel-guide': {
        title: 'モンゴル旅行ガイド | Milkyway Japan',
        description: 'モンゴルの大自然、遊牧文化、おすすめスポット、持ち物リストなど、モンゴル旅行前に知っておきたい情報をまとめてご紹介。'
    },
    '/faq': {
        title: 'よくある質問（FAQ） | Milkyway Japan',
        description: 'モンゴル旅行に関するよくある質問と回答。予約方法、ツアー内容、持ち物、ビザ、決済・キャンセルなど、モンゴルツアーの疑問を解決します。'
    },
    '/reviews': {
        title: 'お客様のモンゴル旅行レビュー | Milkyway Japan',
        description: 'モンゴルツアーに参加されたお客様のリアルな旅行レビュー。実際の体験談でツアー選びの参考にしてください。'
    },
    '/custom-estimate': {
        title: 'オーダーメイド見積もり | Milkyway Japan',
        description: 'お客様のご要望に合わせたモンゴルツアーのオーダーメイドプランをご提案。日程・予算・目的地を自由にカスタマイズ。'
    },
    '/travel-mates': {
        title: '同行者募集 | Milkyway Japan',
        description: 'モンゴル旅行の同行者を募集・検索。一人旅が不安な方も、旅仲間を見つけてモンゴルツアーを一緒に楽しみましょう。'
    },
    '/about': {
        title: '会社案内 – モンゴル現地の旅行会社 | Milkyway Japan',
        description: 'モンゴル現地の旅行会社「モンゴリア銀河系（天の川）」。韓国でホテル経営学科を卒業しモンゴルで暮らす代表と副代表が設立した家族経営の旅行会社です。日本人旅行客に合わせた日程とリーズナブルな価格で、どこにもないモンゴル旅行をご提案します。'
    }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // Legacy Redirects
    if (path.startsWith('/shop_view') || url.searchParams.has('idx')) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}/products`, 301);
    }
    if (LEGACY_REDIRECTS[path]) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}${LEGACY_REDIRECTS[path]}`, 301);
    }

    // 1. Get the original response from the asset (usually index.html for unknown routes in an SPA)
    const response = await context.next();

    // Only process responses that are HTML. We don't want to rewrite assets, images, API JSON, etc.
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
        return response;
    }


    let pageTitle = SEO_CONSTANTS.TITLE;
    let pageDescription = SEO_CONSTANTS.DESCRIPTION;
    let pageImage = getAbsoluteImageUrl(SEO_CONSTANTS.OG_IMAGE);
    const pageUrl = url.href;
    const canonicalUrl = `${SEO_CONSTANTS.SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`;

    // Server-rendered JSON-LD blocks. These are appended inside <head> so that crawlers
    // that do NOT execute JavaScript (LINE, Kakao, Facebook, some Rich Results previewers)
    // can still see structured data. React's react-helmet still injects its own blocks
    // client-side — schema.org allows multiple valid JSON-LD scripts on one page.
    const extraJsonLd: string[] = [];

    // Check static routes first
    const normalizedPath = path.replace(/\/$/, '') || '/';
    if (STATIC_PAGE_META[normalizedPath]) {
        pageTitle = STATIC_PAGE_META[normalizedPath].title;
        pageDescription = STATIC_PAGE_META[normalizedPath].description;
    }

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
                let images: string[] = [];
                try {
                    images = typeof product.mainImages === 'string' ? JSON.parse(product.mainImages) : (product.mainImages || []);
                } catch (e) { }
                const absoluteImages = (Array.isArray(images) ? images : [])
                    .filter((img: string) => img && !img.startsWith('data:'))
                    .map((img: string) => getAbsoluteImageUrl(img));

                if (absoluteImages.length > 0) {
                    pageImage = absoluteImages[0];
                }

                // Build Product + BreadcrumbList JSON-LD on the server so crawlers that
                // don't run JS still see structured data (LINE, Kakao, FB, some previewers).
                const priceValidUntil = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                    .toISOString().split('T')[0];

                const productLd: any = {
                    '@context': 'https://schema.org/',
                    '@type': ['Product', 'TouristTrip'],
                    name: product.name,
                    image: absoluteImages.length > 0 ? absoluteImages : undefined,
                    description: product.description || SEO_CONSTANTS.DESCRIPTION,
                    brand: { '@type': 'Brand', name: 'Milkyway Japan' },
                    category: product.category || 'モンゴルツアー',
                    touristType: product.category || 'モンゴルツアー',
                    ...(product.duration ? {
                        additionalProperty: [
                            { '@type': 'PropertyValue', name: '所要時間', value: product.duration }
                        ]
                    } : {}),
                    offers: {
                        '@type': 'Offer',
                        url: pageUrl,
                        priceCurrency: 'JPY',
                        price: product.price,
                        priceValidUntil: priceValidUntil,
                        itemCondition: 'https://schema.org/NewCondition',
                        availability: product.status === 'active'
                            ? 'https://schema.org/InStock'
                            : 'https://schema.org/OutOfStock',
                        seller: { '@type': 'Organization', name: 'Milkyway Japan' },
                    },
                };
                extraJsonLd.push(JSON.stringify(productLd));

                const breadcrumbLd = {
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${SEO_CONSTANTS.SITE_URL}/` },
                        { '@type': 'ListItem', position: 2, name: 'モンゴルツアー商品', item: `${SEO_CONSTANTS.SITE_URL}/products` },
                        { '@type': 'ListItem', position: 3, name: product.name, item: canonicalUrl },
                    ],
                };
                extraJsonLd.push(JSON.stringify(breadcrumbLd));
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
                        const absoluteGuideImage = imageStr ? getAbsoluteImageUrl(imageStr) : pageImage;
                        if (imageStr) {
                            pageImage = absoluteGuideImage;
                        }

                        const articleLd = {
                            '@context': 'https://schema.org',
                            '@type': 'BlogPosting',
                            headline: guide.title,
                            description: pageDescription,
                            image: [absoluteGuideImage],
                            datePublished: guide.created_at,
                            dateModified: guide.updated_at || guide.created_at,
                            author: {
                                '@type': guide.author ? 'Person' : 'Organization',
                                name: guide.author || 'Milkyway Japan',
                            },
                            publisher: {
                                '@type': 'Organization',
                                name: 'Milkyway Japan',
                                logo: {
                                    '@type': 'ImageObject',
                                    url: `${SEO_CONSTANTS.SITE_URL}/favicon.png`,
                                },
                            },
                            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
                            articleSection: guide.category || undefined,
                            inLanguage: 'ja',
                        };
                        extraJsonLd.push(JSON.stringify(articleLd));

                        const breadcrumbLd = {
                            '@context': 'https://schema.org',
                            '@type': 'BreadcrumbList',
                            itemListElement: [
                                { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${SEO_CONSTANTS.SITE_URL}/` },
                                { '@type': 'ListItem', position: 2, name: '旅行ガイド', item: `${SEO_CONSTANTS.SITE_URL}/travel-guide` },
                                { '@type': 'ListItem', position: 3, name: guide.title, item: canonicalUrl },
                            ],
                        };
                        extraJsonLd.push(JSON.stringify(breadcrumbLd));
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

    // 2. Use HTMLRewriter to update existing tags in-place.
    //    Crawlers (LINE, Facebook, Twitter) read the FIRST occurrence,
    //    so we must replace — not append — the tags already in index.html.
    const escape = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return new HTMLRewriter()
        .on('title', {
            element(el) { el.setInnerContent(pageTitle); }
        })
        .on('meta[name="description"]', {
            element(el) { el.setAttribute('content', pageDescription); }
        })
        .on('link[rel="canonical"]', {
            element(el) { el.setAttribute('href', canonicalUrl); }
        })
        // Open Graph — replace existing tags in index.html
        .on('meta[property="og:title"]', {
            element(el) { el.setAttribute('content', escape(pageTitle)); }
        })
        .on('meta[property="og:description"]', {
            element(el) { el.setAttribute('content', escape(pageDescription)); }
        })
        .on('meta[property="og:image"]', {
            element(el) { el.setAttribute('content', pageImage); }
        })
        .on('meta[property="og:url"]', {
            element(el) { el.setAttribute('content', pageUrl); }
        })
        // Twitter Card — replace existing tags
        .on('meta[name="twitter:title"]', {
            element(el) { el.setAttribute('content', escape(pageTitle)); }
        })
        .on('meta[name="twitter:description"]', {
            element(el) { el.setAttribute('content', escape(pageDescription)); }
        })
        .on('meta[name="twitter:image"]', {
            element(el) { el.setAttribute('content', pageImage); }
        })
        // Append server-rendered JSON-LD blocks inside <head> so crawlers without JS see them.
        // Escape `</script>` inside payloads (JSON.stringify leaves forward slashes raw).
        .on('head', {
            element(el) {
                for (const ld of extraJsonLd) {
                    const safe = ld.replace(/<\/script>/gi, '<\\/script>');
                    el.append(`<script type="application/ld+json">${safe}</script>`, { html: true });
                }
            }
        })
        .transform(response);
};

