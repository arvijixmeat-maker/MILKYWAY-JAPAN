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
    '/mongol-travel': {
        title: 'モンゴル旅行ガイド2026 – 費用・ベストシーズン・おすすめツアー | Milkyway Japan',
        description: '大自然が広がるモンゴル旅行。おすすめの時期、費用相場、治安、人気のモンゴルツアー情報まで、モンゴル旅行前に知っておきたい完全ガイドです。'
    },
    '/mongol-tour': {
        title: 'モンゴルツアー比較 – 乗馬・ゴビ砂漠・テレルジ 現地ツアー一覧 | Milkyway Japan',
        description: 'モンゴル乗馬旅行、ゴビ砂漠星空ツアー、テレルジ国立公園の大自然体験など、様々なモンゴルツアーの特徴を比較。Milkyway Japanなら日本語ガイド付きで安心です。'
    },
    '/horse-riding-tour': {
        title: 'モンゴル乗馬旅行 – 初心者OK！大草原で楽しむ乗馬ツアー | Milkyway Japan',
        description: 'モンゴルの大草原を馬で駆ける乗馬旅行。経験豊富な現地ガイドがサポートするため、初心者から上級者まで安心。おすすめのモンゴル乗馬ツアーをご案内します。'
    },
    '/gobi-desert': {
        title: 'ゴビ砂漠ツアー – 満天の星空と壮大な砂丘を体験 | Milkyway Japan',
        description: 'モンゴル南部に広がるゴビ砂漠。ホンゴル砂丘で夕陽を眺め、夜は満天の星空（天の川）に包まれる感動のツアー。恐竜の化石発掘スポットなど、ゴビ砂漠の見どころを日本語ガイド付きでご案内します。'
    }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // Legacy Redirects
    if (path.startsWith('/shop_view') || url.searchParams.has('idx')) {
        return Response.redirect(`${SEO_CONSTANTS.SITE_URL}/products`, 301);
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
                // Remove existing title content — we'll inject our own
                element.setInnerContent(pageTitle);
            }
        })
        .on('meta[name="description"]', {
            element(element) {
                // Update existing description meta
                element.setAttribute('content', pageDescription);
            }
        })
        .on('link[rel="canonical"]', {
            element(element) {
                // Update canonical URL
                element.setAttribute('href', canonicalUrl);
            }
        })
        .on('head', {
            element(element) {
                element.append(`\n<!-- Injected by Cloudflare Edge SSR -->`, { html: true });

                // Open Graph (appended — browsers/crawlers use last occurrence)
                element.append(`\n<meta property="og:title" content="${pageTitle}">`, { html: true });
                element.append(`\n<meta property="og:description" content="${pageDescription}">`, { html: true });
                element.append(`\n<meta property="og:image" content="${pageImage}">`, { html: true });
                element.append(`\n<meta property="og:url" content="${pageUrl}">`, { html: true });

                // Twitter Card
                element.append(`\n<meta name="twitter:title" content="${pageTitle}">`, { html: true });
                element.append(`\n<meta name="twitter:description" content="${pageDescription}">`, { html: true });
                element.append(`\n<meta name="twitter:image" content="${pageImage}">`, { html: true });
            }
        })
        .transform(response);
};

