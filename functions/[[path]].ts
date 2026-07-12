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
    '/33': '/travel-guide',
};

const PUBLIC_STATIC_ROUTES = new Set([
    '/', '/login', '/about', '/products', '/payment', '/reservation-complete',
    '/reservation-status', '/reviews', '/reviews/write', '/custom-estimate',
    '/estimate-complete', '/travel-mates', '/travel-mates/write', '/chats',
    '/travel-guide', '/mypage', '/mypage/travel-mates', '/mypage/estimates',
    '/mypage/reservations', '/mypage/notifications', '/mypage/reviews',
    '/mypage/recently-viewed', '/mypage/wishlist', '/faq', '/terms-of-service',
    '/privacy-policy', '/guide-apply',
    '/mongolia-tour', '/mongolia-horse-riding-tour', '/gobi-desert-tour',
    '/mongolia-travel-cost',
]);

const VALID_DYNAMIC_ROUTE_PATTERNS = [
    /^\/category\/[^/]+$/,
    /^\/products\/[^/]+$/,
    /^\/reservation\/[^/]+$/,
    /^\/reviews\/[^/]+$/,
    /^\/estimate\/[^/]+$/,
    /^\/travel-mates\/[^/]+$/,
    /^\/chats\/[^/]+$/,
    /^\/travel-guide\/[^/]+$/,
    /^\/mypage\/reservations\/[^/]+$/,
    /^\/my-booking\/[^/]+$/,
    /^\/documents\/(itinerary|contract)\/[^/]+$/,
    /^\/admin(?:\/[^/]+)?$/,
];

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
    '/mongolia-tour': {
        title: 'モンゴルツアー比較｜現地旅行会社の日本語ガイド付き旅行 | Milkyway Japan',
        description: 'モンゴルツアーの選び方を目的・日数・予算別に解説。乗馬、ゴビ砂漠、テレルジ、ゲル宿泊を日本語ガイド付きで手配する現地旅行会社です。'
    },
    '/mongolia-horse-riding-tour': {
        title: 'モンゴル乗馬ツアー｜初心者から経験者まで日本語ガイド同行 | Milkyway Japan',
        description: 'モンゴル乗馬ツアーを初心者・経験者別に選ぶポイント、服装、時期、旅行日数を解説。大草原での乗馬旅行を日本語でサポートします。'
    },
    '/gobi-desert-tour': {
        title: 'モンゴル・ゴビ砂漠ツアー｜日数・見どころ・移動を解説 | Milkyway Japan',
        description: '南ゴビの砂丘、渓谷、恐竜化石で知られる地域を巡るゴビ砂漠ツアー。必要日数、長距離移動、宿泊、持ち物を日本語でご案内します。'
    },
    '/mongolia-travel-cost': {
        title: 'モンゴル旅行の費用とベストシーズン｜予算・日数の目安 | Milkyway Japan',
        description: 'モンゴル旅行の費用を航空券、現地ツアー、宿泊、食事に分けて考える方法と、目的別のベストシーズン、必要日数を解説します。'
    }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // Consolidate every public URL onto the apex HTTPS host. Splitting signals
    // between www and apex weakens canonicalization and leaves legacy URLs indexed.
    if (url.hostname === 'www.mongolryokou.com') {
        url.hostname = 'mongolryokou.com';
        url.protocol = 'https:';
        return Response.redirect(url.toString(), 301);
    }

    // Legacy Redirects
    if (path.startsWith('/shop_view') || url.searchParams.has('idx')) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}/products`, 301);
    }
    if (LEGACY_REDIRECTS[path]) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}${LEGACY_REDIRECTS[path]}`, 301);
    }
    if (path.toLowerCase().startsWith('/tour_guide')) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}/travel-guide`, 301);
    }

    // 1. Get the original response from the asset (usually index.html for unknown routes in an SPA)
    const response = await context.next();

    // Only process responses that are HTML. We don't want to rewrite assets, images, API JSON, etc.
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
        return response;
    }


    const normalizedPath = path.replace(/\/$/, '') || '/';
    let knownRoute = PUBLIC_STATIC_ROUTES.has(normalizedPath)
        || VALID_DYNAMIC_ROUTE_PATTERNS.some(pattern => pattern.test(normalizedPath));

    let pageTitle = knownRoute ? SEO_CONSTANTS.TITLE : 'ページが見つかりません | Milkyway Japan';
    let pageDescription = SEO_CONSTANTS.DESCRIPTION;
    let pageImage = getAbsoluteImageUrl(SEO_CONSTANTS.OG_IMAGE);
    let pageHeading = 'モンゴルツアー・モンゴル旅行なら現地旅行社 Milkyway Japan';
    let pageIntro = SEO_CONSTANTS.DESCRIPTION;
    const pageUrl = url.href;
    const canonicalUrl = `${SEO_CONSTANTS.SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`;

    // Server-rendered JSON-LD blocks. These are appended inside <head> so that crawlers
    // that do NOT execute JavaScript (LINE, Kakao, Facebook, some Rich Results previewers)
    // can still see structured data. React's react-helmet still injects its own blocks
    // client-side — schema.org allows multiple valid JSON-LD scripts on one page.
    const extraJsonLd: string[] = [];

    // Check static routes first
    if (STATIC_PAGE_META[normalizedPath]) {
        pageTitle = STATIC_PAGE_META[normalizedPath].title;
        pageDescription = STATIC_PAGE_META[normalizedPath].description;
        pageHeading = pageTitle.replace(/\s*[|｜–-]\s*Milkyway Japan.*$/i, '');
        pageIntro = pageDescription;
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
                pageHeading = product.name;
                pageIntro = pageDescription;

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
                        seller: { '@type': 'TravelAgency', name: 'Milkyway Japan' },
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
            } else {
                knownRoute = false;
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
                        pageHeading = String(guide.title || 'モンゴル旅行ガイド');
                        pageIntro = pageDescription;

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
                    } else {
                        knownRoute = false;
                    }
                } catch (e) {
                    console.log("Guide meta fetch skipped/failed:", e);
                }
            }
        }

        // Category pages need distinct server-rendered metadata. Without this,
        // crawlers see the homepage title/body for every commercial landing page.
        const categoryMatch = path.match(/^\/category\/([^/]+)$/);
        if (categoryMatch) {
            const category: any = await context.env.DB.prepare(
                'SELECT id, name, description, image FROM categories WHERE id = ? AND is_active = 1 LIMIT 1'
            ).bind(categoryMatch[1]).first();
            if (category) {
                const categoryName = String(category.name || 'モンゴルツアー');
                pageTitle = `${categoryName}｜モンゴル専門現地旅行社 Milkyway Japan`;
                pageDescription = String(category.description || `${categoryName}のおすすめモンゴルツアーを日本語ガイド同行でご案内。日程・料金・宿泊を比較してオンラインでご相談いただけます。`);
                pageHeading = categoryName;
                pageIntro = pageDescription;
                if (category.image) pageImage = getAbsoluteImageUrl(String(category.image));
                extraJsonLd.push(JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: categoryName,
                    description: pageDescription,
                    url: canonicalUrl,
                    inLanguage: 'ja',
                    breadcrumb: {
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${SEO_CONSTANTS.SITE_URL}/` },
                            { '@type': 'ListItem', position: 2, name: 'モンゴルツアー', item: `${SEO_CONSTANTS.SITE_URL}/products` },
                            { '@type': 'ListItem', position: 3, name: categoryName, item: canonicalUrl },
                        ],
                    },
                }));
            } else {
                knownRoute = false;
            }
        }

    } catch (error) {
        console.error("Meta injection DB error:", error);
        // On error, we just fallback to default meta tags (do not block the user response)
    }

    if (!knownRoute) {
        pageTitle = 'ページが見つかりません | Milkyway Japan';
        pageDescription = 'お探しのページは移動または削除された可能性があります。モンゴルツアー一覧や旅行ガイドから目的の情報をお探しください。';
        pageHeading = 'ページが見つかりません';
        pageIntro = pageDescription;
        extraJsonLd.length = 0;
    }

    const rewrittenResponse = knownRoute
        ? response
        : new Response(response.body, { status: 404, statusText: 'Not Found', headers: response.headers });

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
        .on('#root .pre-render-seo h1', {
            element(el) { el.setInnerContent(pageHeading); }
        })
        .on('#root .pre-render-seo > p', {
            element(el) { el.setInnerContent(pageIntro); }
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
                if (!knownRoute) {
                    el.append('<meta name="robots" content="noindex, nofollow">', { html: true });
                }
                for (const ld of extraJsonLd) {
                    const safe = ld.replace(/<\/script>/gi, '<\\/script>');
                    el.append(`<script type="application/ld+json">${safe}</script>`, { html: true });
                }
            }
        })
        .transform(rewrittenResponse);
};

