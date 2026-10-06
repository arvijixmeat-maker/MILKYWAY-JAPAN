import { ICON, TONE, reservationTone, type BadgeTone } from '../mypage-desktop/myPageTheme';
import { daysUntil } from '../mypage-desktop/useMyPageData';
import { D } from '../mobile/mobileTheme';

/** Date, status and icon helpers shared by the mobile my page, trips list and booking detail. */

const WEEK = '日月火水木金土';

/** "2026-08-16" → "8/16(日)"; anything else is returned untouched. */
const monthDay = (key: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!m) return key;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return `${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`;
};

/** "8/16(日) 〜 8/19(水)" from two "YYYY-MM-DD" keys. */
export const tripPeriod = (start: string, end: string) => [start, end].filter(Boolean).map(monthDay).join(' 〜 ');

interface TripDates {
    start: string;
    end: string;
    status: string;
}

export type TripPhase = 'upcoming' | 'live' | 'past';

/** Where a reservation sits relative to `today` ("YYYY-MM-DD"); cancelled and completed trips count as past. */
export const tripPhase = (r: TripDates, today: string): TripPhase => {
    if (r.status === 'cancelled' || r.status === 'completed') return 'past';
    if (!r.start) return 'upcoming';
    if ((r.end || r.start) < today) return 'past';
    return r.start <= today ? 'live' : 'upcoming';
};

/** "D-12" / "D-DAY" / "旅行中"; empty for finished, cancelled or undated trips. */
export const ddayLabel = (r: TripDates, today: string) => {
    if (!r.start) return '';
    const phase = tripPhase(r, today);
    if (phase === 'past') return '';
    if (phase === 'live') return r.start === today ? 'D-DAY' : '旅行中';
    return `D-${daysUntil(r.start, today)}`;
};

/** Status pill on a white card: the solid "confirmed" tone is softened to the mint tint. */
export const softTone = (status: string): BadgeTone => {
    const tone = reservationTone(status);
    return tone === TONE.solid ? TONE.tint : tone;
};

/** Quote card footer: what happens next for each status, plus the link label when there is something to open. */
export const QUOTE_NOTE: Record<string, { note: string; cta?: string }> = {
    new: { note: '担当者が確認中です（24時間以内にご返信）' },
    pending: { note: '担当者が確認中です（24時間以内にご返信）' },
    waiting: { note: '担当者が確認中です（24時間以内にご返信）' },
    processing: { note: '担当者とご相談中です' },
    answered: { note: 'お見積もりが届きました', cta: '見積もりを見る' },
    reservation_requested: { note: '予約リクエストを受け付けました', cta: '見積もりを見る' },
    converted: { note: 'ご予約が確定しました', cta: '予約を見る' },
    completed: { note: 'ご旅行が完了しました' },
    cancelled: { note: 'キャンセルされました' },
};

/** Section and document icons of the booking detail screen. */
export const DETAIL_ICON = {
    mountain: 'M0 12L6 3l4 5 3-4 7 8z',
    wallet: 'M4 7h15v12H4zM4 7l11-3v3M15 13h4',
    folder: 'M3 6h6l2 2h10v11H3z',
    guide: 'M4 6h16v13H4zM9 12a2 2 0 100-4 2 2 0 000 4zM6 16c.6-1.6 1.7-2.5 3-2.5s2.4.9 3 2.5M14 10h4M14 14h3',
    bed: 'M3 18V6M3 14h18v4M21 14v-3a3 3 0 00-3-3h-7v6M7 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    history: 'M4 12a8 8 0 102.3-5.7M4 4v4h4M12 8v4l3 2',
    map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
    headset: 'M5 14v-2a7 7 0 0114 0v2M5 14h3v5H5zM16 14h3v5h-3z',
    chat: 'M4 5h16v11H8l-4 4zM8 10h8M8 13h5',
    lock: ICON.lock,
    user: ICON.user,
} as const;

/** Timeline entry type → icon. */
export const HISTORY_ICON: Record<string, string> = {
    status_change: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12l2.5 2.5 4.5-5',
    modification: ICON.quoteRequest,
    document_added: D.doc,
    email: D.mail,
    admin_memo: 'M6 4h12v16H6zM9 9h6M9 13h6M9 17h3',
    created: ICON.bookings,
    review_submitted: ICON.reviews,
};
