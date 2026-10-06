import type { HomeProduct, ReviewStat } from '../home-desktop/homeDesktopData';

/**
 * Filter / sort logic of the mobile tour list (Claude Design: "Milkyway Japan Mobile" — M Tours).
 * Same data decisions as the PC list (TourListDesktop); the 絞り込み sheet adds 日程 / 料金 / 特典.
 */

export type Sort = 'rec' | 'low' | 'high' | 'rating' | 'reviews';
export type TripTypeKey = 'full' | 'value';
export type PriceKey = 'p1' | 'p2' | 'p3';
export type PerkKey = 'best' | 'pick';

export interface TourFilters {
    days: string[];
    prices: PriceKey[];
    perks: PerkKey[];
}

export const EMPTY_FILTERS: TourFilters = { days: [], prices: [], perks: [] };

/** Trip-type cards, driven by each tour's 여행 타입 set in the admin (packageType). */
export const TRIP_TYPES: { key: TripTypeKey; label: string; desc: string; en: string }[] = [
    { key: 'full', label: 'フルパッケージ旅行', desc: '4つ星ホテル＋デラックスゲル宿泊', en: 'PREMIUM' },
    { key: 'value', label: 'コスパ重視の旅行', desc: '3つ星ホテル＋スタンダードゲル宿泊', en: 'STANDARD' },
];

export const SORT_OPTIONS: [Sort, string][] = [
    ['rec', 'おすすめ順'],
    ['low', '安い順'],
    ['high', '高い順'],
    ['rating', '評価順'],
    ['reviews', 'レビュー数順'],
];

export const PRICE_BANDS: { key: PriceKey; label: string; hint: string; test: (price: number) => boolean }[] = [
    { key: 'p1', label: '〜¥100,000', hint: 'お手頃な3〜4泊プラン', test: (n) => n < 100000 },
    { key: 'p2', label: '¥100,000〜¥150,000', hint: '温泉・砂漠を満喫する定番', test: (n) => n >= 100000 && n < 150000 },
    { key: 'p3', label: '¥150,000〜', hint: 'ゴビ砂漠・長期周遊', test: (n) => n >= 150000 },
];

export interface Perk {
    key: PerkKey;
    tag: string;
    label: string;
    hint: string;
    chip: string;
    tagBg: string;
    tagBd: string;
    tagFg: string;
    test: (p: HomeProduct) => boolean;
}

/**
 * 特典 toggles backed by the admin's 인기 / 추천 flags. The design's 最安値保証 has no
 * product field behind it, so it is not offered.
 */
export const PERKS: Perk[] = [
    { key: 'best', tag: 'BEST', label: '人気No.1クラス', hint: '予約数・満足度が特に高いツアー', chip: 'BEST', tagBg: '#D93A2B', tagBd: '#D93A2B', tagFg: '#FFFFFF', test: (p) => p.isPopular },
    { key: 'pick', tag: 'おすすめ', label: 'スタッフおすすめ', hint: '現地スタッフが自信を持って推薦', chip: 'スタッフおすすめ', tagBg: '#FFFFFF', tagBd: '#F3C7C2', tagFg: '#B3261E', test: (p) => p.isFeatured },
];

export const durationOf = (p: HomeProduct) => (p.duration || '').trim();

/** Distinct durations that exist in the list, shortest trip first. */
export function durationOptions(products: HomeProduct[]): string[] {
    const nums = (d: string) => (d.match(/\d+/g) || []).map(Number);
    return [...new Set(products.map(durationOf).filter(Boolean))].sort((a, b) => {
        const [an = 0, ad = 0] = nums(a);
        const [bn = 0, bd = 0] = nums(b);
        return an - bn || ad - bd || a.localeCompare(b, 'ja');
    });
}

/** "3泊4日" → ["3泊", "4日"]; anything else stays on one line. */
export function splitDuration(d: string): [string, string] {
    const m = d.match(/^(\d+)\s*泊\s*(.+)$/);
    return m ? [`${m[1]}泊`, m[2]] : [d, ''];
}

export function matchFilters(p: HomeProduct, f: TourFilters): boolean {
    if (f.days.length && !f.days.includes(durationOf(p))) return false;
    if (f.prices.length && !PRICE_BANDS.some((b) => f.prices.includes(b.key) && b.test(p.price))) return false;
    return PERKS.every((k) => !f.perks.includes(k.key) || k.test(p));
}

/** Tours left if `value` were the pick in its group (特典 toggles add up instead). */
export function countWith<K extends keyof TourFilters>(base: HomeProduct[], f: TourFilters, group: K, value: TourFilters[K][number]): number {
    const next = { ...f, [group]: group === 'perks' ? [...new Set([...f.perks, value])] : [value] } as TourFilters;
    return base.filter((p) => matchFilters(p, next)).length;
}

export function toggleFilter<K extends keyof TourFilters>(f: TourFilters, group: K, value: TourFilters[K][number]): TourFilters {
    const cur = f[group] as string[];
    return { ...f, [group]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] } as TourFilters;
}

export const activeCount = (f: TourFilters) => f.days.length + f.prices.length + f.perks.length;

/** Text match on the header search word (?q=), same haystack as the PC list. */
export function matchQuery(p: HomeProduct, query: string): boolean {
    // \s also covers the full-width space Japanese keyboards insert.
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const hay = `${p.name} ${p.tags.join(' ')} ${p.category} ${p.duration}`.toLowerCase();
    return words.every((w) => hay.includes(w));
}

export function sortTours(list: HomeProduct[], sort: Sort, stats: Record<string, ReviewStat>): HomeProduct[] {
    const rank = (p: HomeProduct) => Number(p.isPopular) * 2 + Number(p.isFeatured);
    const sorters: Record<Sort, (a: HomeProduct, b: HomeProduct) => number> = {
        rec: (a, b) => rank(b) - rank(a),
        low: (a, b) => a.price - b.price,
        high: (a, b) => b.price - a.price,
        rating: (a, b) => (stats[b.id]?.avg ?? 0) - (stats[a.id]?.avg ?? 0) || (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0),
        reviews: (a, b) => (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0),
    };
    return [...list].sort(sorters[sort]);
}
