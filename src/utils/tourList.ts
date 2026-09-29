import type { HomeProduct, ReviewStat } from '../components/home-desktop/homeDesktopData';

export type TourSort = 'rec' | 'low' | 'high' | 'rating' | 'reviews';

/** `short` is the narrower mobile label. */
export const TOUR_SORTS: { id: TourSort; label: string; short: string }[] = [
    { id: 'rec', label: 'おすすめ順', short: 'おすすめ順' },
    { id: 'low', label: '料金が安い順', short: '安い順' },
    { id: 'high', label: '料金が高い順', short: '高い順' },
    { id: 'rating', label: '評価が高い順', short: '評価順' },
    { id: 'reviews', label: 'レビュー数順', short: 'レビュー数順' },
];

/**
 * Trip-type cards, driven by each tour's 여행 타입 set in the admin (packageType).
 * They always filter; a type with no tours yet shows the empty state, whose quote
 * button carries that type's stays (?stay=).
 */
export const TRIP_TYPES = [
    { key: 'full', label: 'フルパッケージ旅行', sub: '4つ星ホテル＋デラックスゲル宿泊', tier: 'PREMIUM', stays: ['4つ星ホテル', 'デラックスゲル'], dark: true },
    { key: 'value', label: 'コスパ重視の旅行', sub: '3つ星ホテル＋スタンダードゲル宿泊', tier: 'STANDARD', stays: ['3つ星ホテル', 'スタンダードゲル'], dark: false },
];

export const tripType = (key: string) => TRIP_TYPES.find((t) => t.key === key);

export const quotePathFor = (typeKey: string) => {
    const t = tripType(typeKey);
    return t ? `/custom-estimate?stay=${encodeURIComponent(t.stays.join(','))}` : '/custom-estimate';
};

/** Every search word must appear in the tour's name, tags, category or duration. */
export const matchesQuery = (p: HomeProduct, query: string) => {
    const words = query.toLowerCase().split(/[\s\u3000]+/).filter(Boolean);
    if (!words.length) return true;
    const hay = `${p.name} ${p.tags.join(' ')} ${p.category} ${p.duration}`.toLowerCase();
    return words.every((w) => hay.includes(w));
};

export function sortTours(list: HomeProduct[], sort: TourSort, stats: Record<string, ReviewStat>) {
    const rank = (p: HomeProduct) => Number(p.isPopular) * 2 + Number(p.isFeatured);
    const avg = (p: HomeProduct) => stats[p.id]?.avg ?? 0;
    const count = (p: HomeProduct) => stats[p.id]?.count ?? 0;
    const sorters: Record<TourSort, (a: HomeProduct, b: HomeProduct) => number> = {
        rec: (a, b) => rank(b) - rank(a),
        low: (a, b) => a.price - b.price,
        high: (a, b) => b.price - a.price,
        rating: (a, b) => avg(b) - avg(a) || count(b) - count(a),
        reviews: (a, b) => count(b) - count(a),
    };
    return [...list].sort(sorters[sort]);
}
