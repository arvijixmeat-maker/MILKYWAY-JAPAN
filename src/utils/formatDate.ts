// Shared date formatting helpers.
// Review/magazine timestamps come from D1 as either ISO strings, "YYYY-MM-DD HH:mm:ss",
// or "YYYY-MM-DD". Parsing Date(undefined/invalid) returns Invalid Date — guard against that.

const toValidDate = (raw: string | number | Date | null | undefined): Date | null => {
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Short numeric date. Japanese: "2026/04/22", other: "2026. 04. 22."
 * Used in list cards where space is tight.
 */
export const formatShortDate = (raw: string | number | Date | null | undefined, locale: string = 'ja'): string => {
    const d = toValidDate(raw);
    if (!d) return '';
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return locale.startsWith('ja') ? `${y}/${m}/${day}` : `${y}. ${m}. ${day}.`;
};

/**
 * Short date with abbreviated weekday in parentheses. Used on MyReviews cards.
 * "2026/04/22 (水)" in Japanese, "2026. 04. 22. (수)" in Korean.
 */
export const formatDateWithWeekday = (raw: string | number | Date | null | undefined, locale: string = 'ja'): string => {
    const d = toValidDate(raw);
    if (!d) return '';
    const base = formatShortDate(d, locale);
    const weekdayLocale = locale.startsWith('ja') ? 'ja-JP' : (locale.startsWith('ko') ? 'ko-KR' : locale);
    const weekday = d.toLocaleDateString(weekdayLocale, { weekday: 'short' });
    return `${base} (${weekday})`;
};

/**
 * Relative time for reviews/comments/activity. e.g. "たった今", "3分前", "2時間前", then falls back to short date.
 */
export const formatRelativeTime = (raw: string | number | Date | null | undefined, locale: string = 'ja'): string => {
    const d = toValidDate(raw);
    if (!d) return '';
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return formatShortDate(d, locale);

    const min = Math.floor(diffMs / 60_000);
    const hr = Math.floor(diffMs / 3_600_000);
    const day = Math.floor(diffMs / 86_400_000);

    const isJa = locale.startsWith('ja');
    if (min < 1) return isJa ? 'たった今' : '방금';
    if (min < 60) return isJa ? `${min}分前` : `${min}분 전`;
    if (hr < 24) return isJa ? `${hr}時間前` : `${hr}시간 전`;
    if (day < 7) return isJa ? `${day}日前` : `${day}일 전`;
    return formatShortDate(d, locale);
};
