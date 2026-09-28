import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { HomeData } from './useHomeData';
import { yen } from '../components/desktop-primitives/mwTokens';

interface ApiBanner {
    id: string;
    image?: string;
    image_url?: string;
    pc_image?: string;
    pcImage?: string;
    tag?: string;
    title?: string;
    subtitle?: string;
    link?: string;
    pc_title?: string;
    pcTitle?: string;
    pc_subtitle?: string;
    pcSubtitle?: string;
    pc_tag?: string;
    pcTag?: string;
}

export interface HeroSlide {
    key: string;
    img: string;
    /** False when only the mobile banner exists — its copy is baked into the image, so don't overlay text. */
    textFree: boolean;
    eyebrow: string;
    title: string;
    sub: string;
    label: string;
    path: string;
}

// Strings the admin tooling inserts as placeholders that we should never display.
const DEFAULT_TEXTS = new Set(['New Tag', 'new tag', '새로운 배너 타이틀', '배너 설명을 입력하세요', 'Premium Trip']);
const clean = (v?: string) => {
    const s = (v || '').trim();
    return s && !DEFAULT_TEXTS.has(s) ? s : '';
};

/** Banner links are stored as absolute production URLs; route them in-app. */
const toPath = (link?: string) => {
    const l = (link || '').trim();
    if (!l) return '/products';
    try {
        const u = new URL(l, window.location.origin);
        if (u.hostname === window.location.hostname || u.hostname.endsWith('mongolryokou.com')) {
            return u.pathname + u.search;
        }
        return l;
    } catch {
        return l.startsWith('/') ? l : '/products';
    }
};

const FALLBACK: HeroSlide = {
    key: 'fallback',
    img: '',
    textFree: true,
    eyebrow: 'CUSTOM TOUR',
    title: 'あなただけの特別なプランを、\n1分でリクエスト',
    sub: '日本語スタッフが24時間以内にご返信。お見積もりは無料です。',
    label: 'お見積もり無料',
    path: '/custom-estimate',
};

/**
 * Home hero slides from the admin banners (PC copy and text-free PC photo preferred).
 * Banners that link to a tour pick up its category, length and price.
 */
export function useHeroSlides(products: HomeData['products']): HeroSlide[] {
    const { data: banners = [] } = useQuery<ApiBanner[]>({
        queryKey: ['heroBannersDesktop'],
        queryFn: async () => {
            const data = await api.banners.get();
            return Array.isArray(data?.banners) ? data.banners : [];
        },
        staleTime: 1000 * 60 * 5,
    });

    if (banners.length === 0) return [FALLBACK];
    return banners.slice(0, 6).map((b, i) => {
        const path = toPath(b.link);
        const productId = path.match(/^\/products\/([^/?#]+)/)?.[1];
        const product = productId ? products.find((p) => p.id === productId) : undefined;
        const tag = clean(b.pc_tag || b.pcTag) || clean(b.tag);
        const sub = clean(b.pc_subtitle || b.pcSubtitle) || clean(b.subtitle);
        const pcImage = b.pc_image || b.pcImage || '';
        return {
            key: b.id || String(i),
            img: pcImage || b.image || b.image_url || '',
            textFree: !!pcImage,
            eyebrow: tag || (product ? [product.category, product.duration].filter(Boolean).join('・') : ''),
            title: clean(b.pc_title || b.pcTitle) || clean(b.title) || product?.name || 'モンゴル旅行',
            sub: sub || (product ? `${yen(product.price)}〜` : ''),
            label: product?.category || 'モンゴル旅行',
            path,
        };
    });
}
