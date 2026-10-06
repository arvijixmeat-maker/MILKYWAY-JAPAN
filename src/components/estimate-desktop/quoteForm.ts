import { api } from '../../lib/api';
import { sendNotificationEmail } from '../../lib/email';

/**
 * Quote request form logic shared by the PC (CustomEstimateDesktop) and mobile
 * (CustomEstimateMobile) forms: options, date helpers, progress and submission.
 * Both forms go through submitQuote, so the admin always receives the same payload.
 */

/** Destination cards; `spot` keywords pick a photo from the admin tourist-spot library. */
export const DESTINATIONS = [
    { v: '中央モンゴル', spot: ['大草原'] },
    { v: 'ゴビ砂漠', spot: ['ホンゴル砂丘', 'ゴビ'] },
    { v: 'フブスグル湖', spot: ['フブスグル'] },
    { v: 'テレルジ国立公園', spot: ['テレルジ'] },
    { v: 'トレッキング', spot: ['ハイキング', '登山'] },
    { v: 'ゴルフ', spot: ['ゴルフ'] },
];
export const TRAVEL_TYPES = ['ヒーリング', 'アクティビティ', 'グルメ', 'ホカンス', '映え', '星空・天体'];
export const ACCOMMODATIONS = ['5つ星ホテル', '4つ星ホテル', '3つ星ホテル', 'デラックスゲル', 'スタンダードゲル'];
export const VEHICLES = [
    { v: 'スタレックス (4-7名)', sub: '快適・一般的' },
    { v: 'プルゴン (4名)', sub: 'モンゴル伝統車' },
    { v: 'ハイエース (8-12名)', sub: '大人数対応' },
    { v: '大型バス (15名以上)', sub: 'グループ向け' },
];

export const WEEK = '日月火水木金土';
export const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 2026-10-03 → 2026年10月3日（土） */
export const jpDate = (v: string) => {
    if (!v) return '';
    const [y, m, d] = v.split('-').map(Number);
    return `${y}年${m}月${d}日（${WEEK[new Date(y, m - 1, d).getDay()]}）`;
};
export const EMAIL_RE = /.+@.+\..+/;

export interface QuoteFormValues {
    destinations: string[];
    /** YYYY-MM-DD, '' while unset. */
    startDate: string;
    endDate: string;
    adultCount: number;
    childCount: number;
    themes: string[];
    accommodations: string[];
    vehicle: string;
    /** Per-person budget in 万円; 500 means "500 or more". */
    priceRange: number;
    additionalRequest: string;
    name: string;
    phone: string;
    email: string;
}

export const quotePeople = (f: QuoteFormValues) => `大人 ${f.adultCount}名${f.childCount > 0 ? ` / 子供 ${f.childCount}名` : ''}`;
export const quoteBudgetLabel = (f: QuoteFormValues) => (f.priceRange >= 500 ? '500 万円+' : `${f.priceRange} 万円`);

export const canSubmitQuote = (f: QuoteFormValues) => f.destinations.length > 0 && !!f.name.trim() && EMAIL_RE.test(f.email.trim());

/** Completion of the nine form steps, in order (people and budget always have a value). */
export const quoteSteps = (f: QuoteFormValues) => [
    f.destinations.length > 0,
    !!f.startDate,
    true,
    f.themes.length > 0,
    f.accommodations.length > 0,
    !!f.vehicle,
    true,
    !!f.additionalRequest.trim(),
    !!f.name.trim() && EMAIL_RE.test(f.email.trim()),
];

/** Creates the quote and sends the confirmation email; resolves with the saved payload (+ id). */
export async function submitQuote(f: QuoteFormValues) {
    const me: { id?: string } | null = await api.auth.me().catch(() => null);
    const newEstimate = {
        user_id: me?.id || null,
        type: 'personal',
        status: 'new',
        name: f.name.trim(),
        phone: f.phone,
        email: f.email.trim(),
        destination: f.destinations.join(', '),
        period: f.startDate || f.endDate ? `${f.startDate || '未定'} ~ ${f.endDate || '未定'}` : '未定',
        headcount: `大人 ${f.adultCount}名${f.childCount > 0 ? `, 子供 ${f.childCount}名` : ''}`,
        budget: f.priceRange >= 500 ? '500万円以上' : `${f.priceRange}万円`,
        travel_types: f.themes,
        accommodations: f.accommodations,
        vehicle: f.vehicle,
        additional_request: f.additionalRequest,
        created_at: new Date().toISOString(),
    };

    const data: { id?: string } = await api.quotes.create(newEstimate);
    try {
        await sendNotificationEmail(newEstimate.email, 'QUOTE_RECEIVED', {
            customerName: newEstimate.name,
            productName: `モンゴルオーダーメイド旅行 (${newEstimate.period})`,
        });
    } catch {
        // email is non-fatal
    }
    return { id: data?.id || '', ...newEstimate };
}
