import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Header search helpers shared by the PC and mobile headers. */

export const HOT_WORDS = ['ゴビ砂漠', '乗馬', '星空', '温泉'];
export const POPULAR_WORDS = [...HOT_WORDS, 'ラクダ', 'ゲル'];

const RECENT_KEY = 'mw_recent_searches';

export const readRecent = (): string[] => {
    try {
        const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : [];
    } catch {
        return [];
    }
};

export const writeRecent = (list: string[]) => {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
        /* storage unavailable — recent searches are a convenience only */
    }
};

/** Moves `word` to the front of the recent list (max 6) and persists it. */
export const pushRecent = (list: string[], word: string) => {
    const next = [word, ...list.filter((x) => x !== word)].slice(0, 6);
    writeRecent(next);
    return next;
};

export const searchTokens = (q: string) => q.split(/[\s\u3000]+/).filter(Boolean);

export interface SearchProduct {
    id: string;
    name: string;
    category: string;
    duration: string;
    price: number;
    tags: string[];
    image: string;
}

/** Published tours for search suggestions; only fetched once the search box is opened. */
export function useSearchProducts(enabled: boolean) {
    const { data = [] } = useQuery<SearchProduct[]>({
        queryKey: ['headerSearch', 'products'],
        enabled,
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            const data = await api.products.list();
            if (!Array.isArray(data)) return [];
            return data
                .filter((p: { status?: string }) => p.status === 'active' || !p.status)
                .map((p: { id: string; name: string; category?: string; duration?: string; price?: number; tags?: string[]; mainImages?: string[] }) => ({
                    id: p.id,
                    name: (p.name || '').trim(),
                    category: p.category || '',
                    duration: p.duration || '',
                    price: p.price || 0,
                    tags: Array.isArray(p.tags) ? p.tags : [],
                    image: p.mainImages?.[0] || '',
                }));
        },
    });
    return data;
}

export const productMatches = (p: SearchProduct, words: string[]) =>
    words.every((k) => `${p.name} ${p.category} ${p.duration} ${p.tags.join(' ')}`.includes(k));

/** Site sections shown in the PC nav bar and the mobile header nav / menu. */
export const SITE_NAV: { id: string; label: string; path: string; match: (p: string) => boolean }[] = [
    { id: 'home', label: 'ホーム', path: '/', match: (p) => p === '/' },
    { id: 'tours', label: 'ツアー商品', path: '/products', match: (p) => p === '/products' || p.startsWith('/category/') || p.startsWith('/products/') },
    { id: 'mates', label: '同行者募集', path: '/travel-mates', match: (p) => p.startsWith('/travel-mates') },
    { id: 'reviews', label: 'レビュー', path: '/reviews', match: (p) => p.startsWith('/reviews') },
    { id: 'magazine', label: '旅マガジン', path: '/travel-guide', match: (p) => p.startsWith('/travel-guide') },
    { id: 'quote', label: 'お見積もり', path: '/custom-estimate', match: (p) => p.startsWith('/custom-estimate') || p.startsWith('/estimate') },
];
