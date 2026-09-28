import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toTourDateKey } from '../../utils/formatDate';
import { parseArr } from '../../utils/reservationDetail';

export interface MeUser {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    avatarUrl?: string;
}

export interface MyReservation {
    id: string;
    number: string;
    status: string;
    productId: string;
    productName: string;
    start: string;
    end: string;
    travelers: number;
    reviewed: boolean;
    createdAt: string;
}

export interface MyQuote {
    id: string;
    status: string;
    destination: string;
    period: string;
    headcount: string;
    createdAt: string;
}

export interface MyMatePost {
    id: string;
    title: string;
    region: string;
    status: string;
    start: string;
    end: string;
    duration: string;
    comments: number;
    views: number;
    joined: number;
    capacity: number;
    createdAt: string;
}

export interface MyReview {
    id: string;
    productId: string;
    productName: string;
    rating: number;
    content: string;
    images: string[];
    helpful: number;
    createdAt: string;
}

export interface RecentItem {
    id: string;
    productId: string;
    title: string;
    image: string;
    price: number;
    category: string;
    viewedAt: string;
}

type Row = Record<string, unknown>;

const rows = (data: unknown): Row[] => (Array.isArray(data) ? data.filter((x): x is Row => !!x && typeof x === 'object') : []);
const pick = (r: Row, keys: string[]) => {
    for (const k of keys) {
        const v = r[k];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
};
const str = (r: Row, ...keys: string[]) => {
    const v = pick(r, keys);
    return v === undefined ? '' : String(v);
};
const num = (r: Row, ...keys: string[]) => {
    const v = Number(pick(r, keys));
    return Number.isFinite(v) ? v : 0;
};
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/** D1 `datetime('now')` values ("YYYY-MM-DD HH:MM:SS") are UTC without a zone marker. */
export const parseDbTime = (v: string) => new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? v.replace(' ', 'T') + 'Z' : v);

/** Whole days from `today` to `day` (both "YYYY-MM-DD"). */
export const daysUntil = (day: string, today: string) => Math.round((Date.parse(day) - Date.parse(today)) / 86_400_000);

/** Session user; cached so tab switches (separate routes) don't flash the loading state. */
export function useMe() {
    return useQuery<MeUser | null>({
        queryKey: ['authMe'],
        queryFn: () => api.auth.me(),
    });
}

/**
 * Everything the PC My Page lists. The APIs return every row for admins, so each list is
 * narrowed to the signed-in user with the same rule the server applies to regular users.
 */
export function useMyPageData(me: MeUser | null | undefined) {
    const uid = me?.id;
    const email = (me?.email || '').toLowerCase();
    const enabled = !!uid;

    const reservations = useQuery<MyReservation[]>({
        queryKey: ['myPage', 'reservations', uid],
        enabled,
        queryFn: async () => rows(await api.reservations.list())
            .filter((r) => str(r, 'userId', 'user_id') === uid || (!!email && str(r, 'customerEmail', 'customer_email', 'email').toLowerCase() === email))
            .map((r) => ({
                id: str(r, 'id'),
                number: str(r, 'reservationNumber', 'reservation_number'),
                status: str(r, 'status'),
                productId: str(r, 'productId', 'product_id'),
                productName: str(r, 'productName', 'product_name') || 'モンゴルツアー',
                start: toTourDateKey(str(r, 'startDate', 'start_date', 'date')),
                end: toTourDateKey(str(r, 'endDate', 'end_date')),
                travelers: num(r, 'totalPeople', 'travelers', 'total_people'),
                reviewed: Array.isArray(r.history) && (r.history as Row[]).some((h) => h && h.type === 'review_submitted'),
                createdAt: str(r, 'createdAt', 'created_at'),
            }))
            .sort(byNewest),
    });

    const quotes = useQuery<MyQuote[]>({
        queryKey: ['myPage', 'quotes', uid],
        enabled,
        queryFn: async () => rows(await api.quotes.list())
            .filter((q) => str(q, 'userId', 'user_id') === uid && ['personal', 'custom', 'business'].includes(str(q, 'type')))
            .map((q) => ({
                id: str(q, 'id'),
                status: str(q, 'status') || 'new',
                destination: str(q, 'destination'),
                period: str(q, 'period', 'travel_dates', 'travelDates'),
                headcount: str(q, 'headcount', 'travelers'),
                createdAt: str(q, 'createdAt', 'created_at'),
            }))
            .sort(byNewest),
    });

    const mates = useQuery<MyMatePost[]>({
        queryKey: ['myPage', 'mates', uid],
        enabled,
        queryFn: async () => rows(await api.travelMates.list())
            .filter((p) => str(p, 'user_id', 'userId') === uid)
            .map((p) => ({
                id: str(p, 'id'),
                title: str(p, 'title'),
                region: str(p, 'region', 'destination'),
                status: str(p, 'status') || 'recruiting',
                start: str(p, 'start_date', 'startDate'),
                end: str(p, 'end_date', 'endDate'),
                duration: str(p, 'duration'),
                comments: num(p, 'comment_count', 'commentCount'),
                views: num(p, 'view_count', 'viewCount'),
                joined: num(p, 'current_members', 'currentMembers'),
                capacity: num(p, 'recruit_count', 'recruitCount', 'max_members', 'maxMembers'),
                createdAt: str(p, 'created_at', 'createdAt'),
            }))
            .sort(byNewest),
    });

    const reviews = useQuery<MyReview[]>({
        queryKey: ['myPage', 'reviews', uid],
        enabled,
        queryFn: async () => rows(await api.reviews.list())
            .filter((r) => str(r, 'user_id', 'author_id') === uid)
            .map((r) => ({
                id: str(r, 'id'),
                productId: str(r, 'product_id'),
                productName: str(r, 'product_name') || 'モンゴルツアー',
                rating: Math.max(0, Math.min(5, Math.round(num(r, 'rating')))),
                content: str(r, 'content'),
                images: parseArr(r.images),
                helpful: num(r, 'helpful_count'),
                createdAt: str(r, 'created_at'),
            }))
            .sort(byNewest),
    });

    const recent = useQuery<RecentItem[]>({
        queryKey: ['myPage', 'recent', uid],
        enabled,
        queryFn: async () => rows(await api.recentlyViewed.list())
            .filter((r) => !r.user_id || r.user_id === uid)
            .map((r) => ({
                id: str(r, 'id'),
                productId: str(r, 'product_id'),
                title: str(r, 'title'),
                image: str(r, 'image'),
                price: num(r, 'price'),
                category: str(r, 'category'),
                viewedAt: str(r, 'created_at'),
            }))
            .sort((a, b) => parseDbTime(b.viewedAt).getTime() - parseDbTime(a.viewedAt).getTime()),
    });

    return { reservations, quotes, mates, reviews, recent };
}
