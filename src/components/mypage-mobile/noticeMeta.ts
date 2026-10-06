import type { Notification } from '../../contexts/NotificationContext';
import { MW } from '../desktop-primitives/mwTokens';
import { NOTICE_TYPES } from '../mypage-desktop/myPageTheme';
import { parseDbTime } from '../mypage-desktop/useMyPageData';

/** Icon circle colours per notification type (labels and icons come from the shared NOTICE_TYPES). */
export const NOTICE_TONE: Record<string, { bg: string; fg: string }> = {
    reservation: { bg: MW.mintTint, fg: MW.mintDeep },
    comment: { bg: '#E8F0FB', fg: '#2B63C6' },
    event: { bg: '#FFF2DC', fg: '#9A5B00' },
    system: { bg: MW.chip, fg: MW.mute },
};

export const noticeType = (n: Notification) => (NOTICE_TYPES[n.type] ? n.type : 'system');

const GROUPS = ['今日', '今週', 'それ以前'] as const;

/** Buckets notifications (kept in their given order) into 今日 / 今週 / それ以前 relative to `now`. */
export function groupNotices(items: Notification[], now: number) {
    const t = new Date(now);
    const todayStart = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    const weekStart = todayStart - 6 * 86_400_000;
    const buckets: Record<(typeof GROUPS)[number], Notification[]> = { 今日: [], 今週: [], それ以前: [] };
    for (const n of items) {
        const at = parseDbTime(n.created_at).getTime();
        buckets[at >= todayStart ? '今日' : at >= weekStart ? '今週' : 'それ以前'].push(n);
    }
    return GROUPS.map((label) => ({ label, items: buckets[label] })).filter((g) => g.items.length > 0);
}
