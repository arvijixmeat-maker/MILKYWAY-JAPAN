import { drizzle } from 'drizzle-orm/d1';
import { products } from '../src/db/schema/products';

import { eq } from 'drizzle-orm';
import { SEO_CONSTANTS } from '../src/constants/seo';
import { isKnownAppSeoPath, isPrivateSeoPath, normalizeSeoPath } from '../src/constants/seoRoutes';

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
    '/33': '/',
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
    },
    '/privacy-policy': {
        title: 'プライバシーポリシー | Milkyway Japan',
        description: 'Milkyway Japanにおける個人情報の取り扱いと保護方針をご案内します。'
    },
    '/terms-of-service': {
        title: '利用規約 | Milkyway Japan',
        description: 'Milkyway Japanのサービス利用条件、予約、決済、キャンセルに関する規約をご案内します。'
    },
    '/guide-apply': {
        title: 'モンゴル現地ガイド募集 | Milkyway Japan',
        description: '日本人旅行者のモンゴル旅行をサポートする現地ガイドを募集しています。応募条件と仕事内容をご確認ください。'
    }
};

const cleanMetaText = (value: unknown, fallback: string, maxLength = 160) => {
    const plain = String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return (plain || fallback).slice(0, maxLength);
};

const notFoundResponse = () => new Response(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>ページが見つかりません | Milkyway Japan</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;color:#191f28;background:#f7f8fa"><main style="min-height:100vh;display:grid;place-items:center;padding:24px"><section style="text-align:center"><b style="color:#3182f6">404</b><h1>ページが見つかりません</h1><p style="color:#6b7684">URLが間違っているか、ページが移動・削除された可能性があります。</p><a href="/" style="display:inline-block;margin-top:16px;padding:12px 20px;border-radius:12px;background:#3182f6;color:white;text-decoration:none;font-weight:700">ホームへ戻る</a></section></main></body></html>`, {
    status: 404,
    headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const path = normalizeSeoPath(url.pathname);
    let decodedPath = path;
    try { decodedPath = decodeURIComponent(path); } catch { /* malformed paths become a 404 below */ }

    // Category slugs are editable in admin. Keep every previous public URL alive with
    // a direct 301 so backlinks and already-indexed URLs retain their accumulated value.
    const renamedCategoryMatch = decodedPath.match(/^\/category\/([a-z0-9-]+)$/);
    if (renamedCategoryMatch) {
        try {
            const redirect = await context.env.DB.prepare(
                'SELECT new_slug FROM category_redirects WHERE old_slug = ? LIMIT 1'
            ).bind(renamedCategoryMatch[1]).first<{ new_slug?: string }>();
            if (redirect?.new_slug && redirect.new_slug !== renamedCategoryMatch[1]) {
                return Response.redirect(
                    `${SEO_CONSTANTS.SITE_URL}/category/${encodeURIComponent(redirect.new_slug)}`,
                    301
                );
            }
        } catch { /* table is created on the first rename; no redirect exists yet */ }
    }

    // Legacy Redirects
    if (decodedPath.startsWith('/shop_view')) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}/products`, 301);
    }
    if (decodedPath.toLowerCase().startsWith('/tour_guide')) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}/travel-guide`, 301);
    }
    if (/^\/(中央モンゴル|ゴビ|北部モンゴル)(?:\/|$)/.test(decodedPath)) {
        const destination = decodedPath.startsWith('/ゴビ') ? '/category/gobi-desert' : decodedPath.startsWith('/中央モンゴル') ? '/category/central-mongolia' : '/products';
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}${destination}`, 301);
    }
    if (LEGACY_REDIRECTS[decodedPath]) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}${LEGACY_REDIRECTS[decodedPath]}`, 301);
    }

    // One canonical host and one slash convention. Redirect only after resolving legacy
    // URLs so an old www URL reaches its final destination in a single hop.
    if (url.hostname === 'www.mongolryokou.com' || (path !== '/' && url.pathname.endsWith('/'))) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}${path}${url.search}`, 301);
    }

    // 1. Get the original response from the asset (usually index.html for unknown routes in an SPA)
    const response = await context.next();

    // Only process responses that are HTML. We don't want to rewrite assets, images, API JSON, etc.
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
        return response;
    }

    // _redirects serves index.html for every unknown SPA path. Stop arbitrary URLs from
    // becoming indexable 200 pages and consuming crawl budget.
    if (!isKnownAppSeoPath(path)) return notFoundResponse();


    let pageTitle = SEO_CONSTANTS.TITLE;
    let pageDescription = SEO_CONSTANTS.DESCRIPTION;
    let pageImage = getAbsoluteImageUrl(SEO_CONSTANTS.OG_IMAGE);
    const isPrivatePage = isPrivateSeoPath(path);
    const canonicalUrl = `${SEO_CONSTANTS.SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`;
    const pageUrl = canonicalUrl;

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
                pageDescription = cleanMetaText(product.description, SEO_CONSTANTS.DESCRIPTION);

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
                let productOffers: Record<string, unknown> = {
                    '@type': 'Offer',
                    url: pageUrl,
                    priceCurrency: 'JPY',
                    price: product.price,
                    itemCondition: 'https://schema.org/NewCondition',
                    availability: product.status === 'active'
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/OutOfStock',
                    seller: { '@type': 'Organization', name: 'Milkyway Japan' },
                };

                // Keep the server schema aligned with the tiered prices visible on the page.
                // A conflicting single price and AggregateOffer can invalidate rich results.
                try {
                    const pricingRow = await context.env.DB.prepare(
                        'SELECT pricing_options FROM products WHERE id = ? LIMIT 1'
                    ).bind(productId).first<{ pricing_options?: string | null }>();
                    const pricingOptions = JSON.parse(pricingRow?.pricing_options || '[]');
                    const tierPrices = Array.isArray(pricingOptions)
                        ? pricingOptions
                            .map((option: any) => Number(option?.pricePerPerson ?? option?.price_per_person))
                            .filter((price: number) => Number.isFinite(price) && price > 0)
                        : [];
                    if (tierPrices.length > 1) {
                        productOffers = {
                            '@type': 'AggregateOffer',
                            url: pageUrl,
                            priceCurrency: 'JPY',
                            lowPrice: Math.min(...tierPrices),
                            highPrice: Math.max(...tierPrices),
                            offerCount: tierPrices.length,
                            availability: product.status === 'active'
                                ? 'https://schema.org/InStock'
                                : 'https://schema.org/OutOfStock',
                            seller: { '@type': 'Organization', name: 'Milkyway Japan' },
                        };
                    }
                } catch { /* legacy rows may not have tiered pricing */ }

                const productLd: any = {
                    '@context': 'https://schema.org/',
                    '@type': ['Product', 'TouristTrip'],
                    '@id': `${canonicalUrl}#tour`,
                    name: product.name,
                    image: absoluteImages.length > 0 ? absoluteImages : undefined,
                    description: pageDescription,
                    brand: { '@type': 'Brand', name: 'Milkyway Japan' },
                    category: product.category || 'モンゴルツアー',
                    touristType: product.category || 'モンゴルツアー',
                    ...(product.duration ? {
                        additionalProperty: [
                            { '@type': 'PropertyValue', name: '所要時間', value: product.duration }
                        ]
                    } : {}),
                    offers: productOffers,
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
            } else return notFoundResponse();
        }
        // --- Logic for Travel Guides (Magazines) ---
        else {
            const categoryMatch = path.match(/^\/category\/([^/]+)$/);
            const guideMatch = path.match(/^\/travel-guide\/([^/]+)$/);
            const reviewMatch = path.match(/^\/reviews\/([^/]+)$/);
            const travelMateMatch = path.match(/^\/travel-mates\/([^/]+)$/);

            if (categoryMatch) {
                const category = await context.env.DB.prepare(
                    "SELECT * FROM categories WHERE id = ? AND is_active = 1 LIMIT 1"
                ).bind(categoryMatch[1]).first();
                if (!category) return notFoundResponse();

                const categoryName = String(category.name || 'モンゴルツアー');
                pageTitle = `${categoryName}のモンゴルツアー | Milkyway Japan`;
                pageDescription = cleanMetaText(
                    category.landing_hero_subtitle || category.description,
                    `${categoryName}を楽しむモンゴルツアーをご案内。日本語ガイド同行の現地旅行会社Milkyway Japanが旅程・料金・見どころを詳しくご紹介します。`
                );
                const categoryImage = String(category.landing_hero_image || category.image || '');
                if (categoryImage) pageImage = getAbsoluteImageUrl(categoryImage);

                extraJsonLd.push(JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    '@id': `${canonicalUrl}#collection`,
                    name: categoryName,
                    description: pageDescription,
                    url: canonicalUrl,
                    inLanguage: 'ja',
                    isPartOf: { '@id': `${SEO_CONSTANTS.SITE_URL}/#website` },
                }));
                extraJsonLd.push(JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${SEO_CONSTANTS.SITE_URL}/` },
                        { '@type': 'ListItem', position: 2, name: 'モンゴルツアー商品', item: `${SEO_CONSTANTS.SITE_URL}/products` },
                        { '@type': 'ListItem', position: 3, name: categoryName, item: canonicalUrl },
                    ],
                }));
            } else if (guideMatch) {
                const guideId = guideMatch[1];
                try {
                    // Fetch magazine using raw D1 prepare as Drizzle schema limits import
                    const guide = await context.env.DB.prepare("SELECT * FROM magazines WHERE id = ?").bind(guideId).first();
                    if (guide) {
                        pageTitle = `${guide.title} | Milkyway Japan Travel Guide`;
                        pageDescription = cleanMetaText(guide.subtitle || guide.description, SEO_CONSTANTS.DESCRIPTION);

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
                    } else return notFoundResponse();
                } catch (e) {
                    console.log("Guide meta fetch skipped/failed:", e);
                }
            } else if (reviewMatch) {
                const review = await context.env.DB.prepare(
                    "SELECT id, title, content, product_name, rating, images, created_at, user_name FROM reviews WHERE id = ? AND is_approved = 1 LIMIT 1"
                ).bind(reviewMatch[1]).first();
                if (!review) return notFoundResponse();
                const reviewTitle = String(review.title || `${review.product_name || 'モンゴルツアー'}の旅行レビュー`);
                pageTitle = `${reviewTitle} | Milkyway Japan`;
                pageDescription = cleanMetaText(review.content, `${review.product_name || 'モンゴルツアー'}に参加されたお客様の旅行レビューです。`);
                try {
                    const images = typeof review.images === 'string' ? JSON.parse(review.images) : review.images;
                    if (Array.isArray(images) && images[0]) pageImage = getAbsoluteImageUrl(String(images[0]));
                } catch { /* keep the default social image */ }
                extraJsonLd.push(JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'Review',
                    name: reviewTitle,
                    reviewBody: pageDescription,
                    reviewRating: review.rating ? { '@type': 'Rating', ratingValue: review.rating, bestRating: 5 } : undefined,
                    author: { '@type': 'Person', name: review.user_name || 'Milkyway Japanのお客様' },
                    datePublished: review.created_at,
                    itemReviewed: { '@type': 'TouristTrip', name: review.product_name || 'モンゴルツアー' },
                }));
            } else if (travelMateMatch) {
                const post = await context.env.DB.prepare(
                    "SELECT id, title, content, description, destination, image, created_at, user_name FROM travel_mates WHERE id = ? LIMIT 1"
                ).bind(travelMateMatch[1]).first();
                if (!post) return notFoundResponse();
                pageTitle = `${post.title || 'モンゴル旅行の同行者募集'} | Milkyway Japan`;
                pageDescription = cleanMetaText(post.description || post.content, `${post.destination || 'モンゴル'}旅行の同行者募集情報です。`);
                if (post.image) pageImage = getAbsoluteImageUrl(String(post.image));
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

    const responseHeaders = new Headers(response.headers);
    if (isPrivatePage) {
        responseHeaders.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        responseHeaders.set('Cache-Control', 'private, no-store');
    }
    const rewriteTarget = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
    });

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
        .on('link[rel="alternate"][hreflang="ja"]', {
            element(el) { el.setAttribute('href', canonicalUrl); }
        })
        .on('link[rel="alternate"][hreflang="x-default"]', {
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
                const robots = isPrivatePage
                    ? 'noindex, nofollow, noarchive'
                    : 'index, follow, max-image-preview:large';
                el.prepend(`<meta name="robots" content="${robots}">`, { html: true });
                for (const ld of extraJsonLd) {
                    const safe = ld.replace(/<\/script>/gi, '<\\/script>');
                    el.append(`<script type="application/ld+json">${safe}</script>`, { html: true });
                }
            }
        })
        .transform(rewriteTarget);
};

