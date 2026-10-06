import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useHomeData } from '../../hooks/useHomeData';
import { yen } from '../desktop-primitives/mwTokens';
import { categoryImage, inCategory, isPublished } from '../home-desktop/homeDesktopData';
import { cleanAdminText, toPath } from '../home-mobile/homeMobileData';

/** Row of the admin-managed `event_banners` table. */
interface EventBannerRow {
    id?: string | number;
    image?: string;
    background_color?: string;
    tag?: string;
    title?: string;
    icon?: string;
    link?: string;
    location?: string;
}

export interface PromoTheme {
    bg: string;
    fg: string;
    subFg: string;
    artFg: string;
    artShadow: string;
    badgeBg: string;
    badgeFg: string;
    glow: string;
    edge: string;
}

/** The design's eight card themes (mint, navy, jade, deep, light, paper, night, soft), applied in turn. */
export const PROMO_THEMES: PromoTheme[] = [
    ['linear-gradient(160deg,#6DDBBE 0%,#A3ECD6 100%)', '#0A1F2E', '#23323D', '#FFFFFF', '#1C8571', '#0A1F2E', '#FFFFFF', 'rgba(255,255,255,0.35)', 'transparent'],
    ['linear-gradient(160deg,#0A1F2E 0%,#16344A 100%)', '#FFFFFF', '#C4D0D8', '#6DDBBE', '#1C8571', '#0A1F2E', '#6DDBBE', 'rgba(109,219,190,0.18)', 'transparent'],
    ['linear-gradient(160deg,#27AB8F 0%,#1C8571 100%)', '#FFFFFF', '#D1F6EA', '#FFFFFF', '#0A1F2E', '#0A1F2E', '#FFFFFF', 'rgba(255,255,255,0.18)', 'transparent'],
    ['linear-gradient(160deg,#1C8571 0%,#0A1F2E 100%)', '#FFFFFF', '#D1F6EA', '#A3ECD6', '#0A1F2E', '#0A1F2E', '#A3ECD6', 'rgba(163,236,214,0.16)', 'transparent'],
    ['linear-gradient(160deg,#D1F6EA 0%,#F1FCF8 100%)', '#0A1F2E', '#33434F', '#27AB8F', '#0A1F2E', '#FFFFFF', '#0A1F2E', 'rgba(109,219,190,0.35)', '#D1F6EA'],
    ['linear-gradient(160deg,#FFFFFF 0%,#F1FCF8 100%)', '#0A1F2E', '#5C6B75', '#0A1F2E', '#A3ECD6', '#27AB8F', '#0A1F2E', 'rgba(163,236,214,0.45)', '#E3E6E2'],
    ['radial-gradient(120% 80% at 50% 0%,#16344A 0%,#0A1F2E 70%)', '#FFFFFF', '#C4D0D8', '#FFFFFF', '#27AB8F', '#27AB8F', '#0A1F2E', 'rgba(39,171,143,0.22)', 'transparent'],
    ['linear-gradient(160deg,#A3ECD6 0%,#F1FCF8 100%)', '#0A1F2E', '#33434F', '#1C8571', '#FFFFFF', '#0A1F2E', '#FFFFFF', 'rgba(255,255,255,0.45)', 'transparent'],
].map(([bg, fg, subFg, artFg, artShadow, badgeBg, badgeFg, glow, edge]) => ({ bg, fg, subFg, artFg, artShadow, badgeBg, badgeFg, glow, edge }));

export interface PromoItem {
    key: string;
    group: string;
    title: string;
    sub: string;
    /** Large display lettering in the middle of the card; empty when nothing latin can be derived. */
    art: string;
    badge: string;
    tags: string[];
    image: string;
    path: string;
    theme: PromoTheme;
}

export const PROMO_ALL = '全体';
const GROUP_CAMPAIGN = 'キャンペーン';
const GROUP_FEATURE = '特集';

/** "gobi-desert" → "GOBI\nDESERT". Only latin slugs / tags make display lettering. */
const artFrom = (source: string) => {
    const words = source.trim().split(/[\s_-]+/).filter(Boolean);
    if (words.length === 0 || !words.every((w) => /^[a-z]{2,}$/i.test(w))) return '';
    return words.slice(0, 2).join('\n').toUpperCase();
};

const oneLine = (v?: string) => (v || '').replace(/\s+/g, ' ').trim();

/**
 * Campaign cards for /promotions: the admin's event banners first, then one feature card
 * per active tour category so the page always has real content.
 */
export function usePromotions() {
    const { data, isLoading: homeLoading } = useHomeData();
    const { data: rows, isLoading: rowsLoading } = useQuery<EventBannerRow[]>({
        queryKey: ['eventBanners'],
        staleTime: 1000 * 60 * 5,
        retry: 1,
        queryFn: async () => {
            const list = await api.eventBanners.list();
            return Array.isArray(list) ? list : [];
        },
    });

    const products = data.products.filter(isPublished);

    const campaigns = (rows ?? [])
        .map((r, i) => {
            const tag = cleanAdminText(r.tag);
            return {
                key: `event-${r.id ?? i}`,
                group: GROUP_CAMPAIGN,
                title: oneLine(cleanAdminText(r.title)),
                sub: '',
                art: artFrom(tag),
                badge: '',
                tags: tag ? [tag] : [],
                image: r.image || '',
                path: toPath(r.link),
            };
        })
        .filter((c) => c.title);

    const features = data.categories.map((c) => {
        const tours = products.filter((p) => inCategory(p, c));
        return {
            key: `category-${c.id}`,
            group: GROUP_FEATURE,
            title: c.name,
            sub: oneLine(c.description),
            art: artFrom(c.id),
            badge: tours.length > 0 ? `${yen(Math.min(...tours.map((p) => p.price)))}〜` : '',
            tags: tours.length > 0 ? [`ツアー ${tours.length}件`] : [],
            image: categoryImage(c),
            path: `/category/${c.id}`,
        };
    });

    const items: PromoItem[] = [...campaigns, ...features].map((x, i) => ({ ...x, theme: PROMO_THEMES[i % PROMO_THEMES.length] }));
    const groups = [...new Set(items.map((x) => x.group))];

    return { items, groups, isLoading: homeLoading || rowsLoading };
}

/** Tab state: 全体 + one tab per group. A single group needs no tabs. */
export function usePromoFilter(items: PromoItem[], groups: string[]) {
    const [picked, setPicked] = useState(PROMO_ALL);
    const tabs = groups.length > 1 ? [PROMO_ALL, ...groups] : [];
    const current = tabs.includes(picked) ? picked : PROMO_ALL;
    const list = current === PROMO_ALL ? items : items.filter((x) => x.group === current);
    return { tabs, current, setCurrent: setPicked, list };
}

/** Shrink the display lettering when a word is too long for the card ("MONGOLIA"). */
export const artScale = (art: string) => {
    const longest = Math.max(...art.split('\n').map((w) => w.length));
    return longest > 7 ? 7 / longest : 1;
};
