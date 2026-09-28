/**
 * Desktop redesign tokens (Claude Design: "Milkyway Japan Home").
 * Mint + navy palette with Zen Kaku Gothic New / Unbounded typography.
 * Used by the PC shell (DesktopHeader / DesktopFooter) and the desktop home.
 */
export const MW = {
    navy: '#0A1F2E',
    navySoft: '#0F2A3B',
    ink2: '#23323D',
    ink3: '#33434F',
    mute: '#5C6B75',
    mute2: '#8A9895',
    line: '#E3E6E2',
    line2: '#D6DBD8',
    line3: '#EEF0EC',
    dot: '#D0D6D3',
    chip: '#F1F3F2',
    mint: '#27AB8F',
    mintDeep: '#1C8571',
    mintLight: '#6DDBBE',
    mintTint: '#D1F6EA',
    mintBg: '#F1FCF8',
    red: '#D93A2B',
    redDeep: '#B3261E',
    star: '#E8A317',
} as const;

export const MW_FONT = "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif";
export const MW_FONT_EN = "'Unbounded', 'Zen Kaku Gothic New', sans-serif";

/** Centered content column used by every redesigned section. */
export const MW_CONTAINER = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' } as const;

export const MW_GRADIENT = 'linear-gradient(135deg,#27AB8F 0%,#3FC2A4 100%)';

export const yen = (n: number) => '¥' + Math.round(n).toLocaleString('ja-JP');

/** True for URLs we can actually render (admin placeholders excluded). */
export const isUsableImage = (url?: string): url is string =>
    !!url && url !== '/og-image.jpg' && (url.startsWith('http') || url.startsWith('/'));

/** Section eyebrow ("TOURS", "REAL REVIEWS" …) and the "すべて見る →" link. */
export const MW_EYEBROW = { fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep } as const;
export const MW_SEE_ALL = { fontSize: 14, fontWeight: 700, color: MW.navy, whiteSpace: 'nowrap', textDecoration: 'none' } as const;

/** Height of the sticky PC nav bar (56px + top/bottom borders); offset for sticky page elements. */
export const MW_STICKY_TOP = 58;

/** Drop leading zero-width spaces / emoji flags that some admin-entered titles start with. */
export const cleanTitle = (t: string) => t.replace(/^[\s\u200B-\u200D\uFEFF]*(?:[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F]+\s*)*/u, '').trim();
