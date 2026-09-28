// Shared helpers for the reservation detail screens (mobile MyReservationDetail + PC BookingDetailDesktop).

export interface Guide {
    id?: string;
    name?: string;
    image?: string;
    introduction?: string;
    bio?: string;
    phone?: string;
    kakaoId?: string;
    languages?: unknown;
    specialties?: unknown;
}

export interface Accommodation {
    id?: string;
    name?: string;
    type?: string;
    location?: string;
    images?: unknown;
    description?: string;
    facilities?: unknown;
}

export interface HistoryEntry {
    timestamp: string;
    type: string;
    description: string;
    detail?: string;
}

export interface PriceBreakdown {
    total: number;
    deposit: number;
    local: number;
}

export interface ReservationDetail {
    id: string;
    reservationNumber?: string | null;
    productName: string;
    status: string;
    startDate?: string;
    endDate?: string;
    totalPeople?: number;
    travelers?: number;
    priceBreakdown?: PriceBreakdown;
    price_breakdown?: PriceBreakdown;
    contractUrl?: string;
    itineraryUrl?: string;
    itineraryTemplateId?: string;
    history?: HistoryEntry[];
    assignedGuide?: Guide;
    dailyAccommodations?: Array<{ day: number; accommodation: Accommodation }>;
    areAssignmentsVisibleToUser?: boolean;
    depositStatus?: string;
    balanceStatus?: string;
    createdAt?: string;
}

/** JSON-array columns arrive either parsed or as a JSON string. */
export const parseArr = (v: unknown): string[] => {
    let arr: unknown = v;
    if (typeof v === 'string') {
        try { arr = JSON.parse(v); } catch { return []; }
    }
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
};

export const parseImage = (v: unknown): string => {
    const arr = parseArr(v);
    if (arr.length > 0) return arr[0];
    if (typeof v === 'string' && v.startsWith('http')) return v;
    return '';
};

export const formatDateShort = (iso?: string) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const wd = weekdays[d.getDay()];
        return `${y}/${m}/${day} (${wd})`;
    } catch { return iso; }
};

export const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
};

export const computeDays = (start?: string, end?: string) => {
    if (!start || !end) return null;
    try {
        const s = new Date(start);
        const e = new Date(end);
        const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? { nights: diff, days: diff + 1 } : null;
    } catch { return null; }
};

export type StatusTone = 'pending' | 'partial' | 'paid' | 'cancelled' | 'neutral';

export const STATUS_MAP: Record<string, { label: string; tone: StatusTone }> = {
    pending_payment: { label: 'お支払い待ち', tone: 'pending' },
    waiting_deposit: { label: '入金待ち', tone: 'pending' },
    paid: { label: 'お支払い完了', tone: 'partial' },
    confirmed: { label: 'ご予約確定', tone: 'paid' },
    completed: { label: '旅行終了', tone: 'neutral' },
    cancelled: { label: 'キャンセル', tone: 'cancelled' },
};
