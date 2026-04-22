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
        .transform(response);
};

