import { MW } from '../desktop-primitives/mwTokens';
import { M_AMBER } from '../mobile/mobileTheme';
import type { MateStatus } from '../mates-desktop/matesData';

/**
 * Constants for the mobile 同行者募集 screens (Claude Design: "Milkyway Japan Mobile").
 * Values are copied from the design file; data comes from mates-desktop/matesData.
 */

export const LIST_PATH = '/travel-mates';
export const WRITE_PATH = '/travel-mates/write';

/** Navy → mint panel ("THIS TRIP", hero stats) and the photo fallback. */
export const PANEL_BG = 'linear-gradient(160deg,#0F2A3B 0%,#1C8571 100%)';
export const MINT_SOLID = '#3FC2A4';
const AMBER_INK = '#9A5B00';

/** Status pill on a card photo: [background, text]. */
export const CARD_STATUS_PILL: Record<MateStatus, [string, string]> = {
    open: [MINT_SOLID, MW.navy],
    few: [M_AMBER, MW.navy],
    done: ['rgba(10,31,46,0.72)', '#FFFFFF'],
};

/** Status pill in the detail header: [background, text]. */
export const DETAIL_STATUS_PILL: Record<MateStatus, [string, string]> = {
    open: [MW.mintTint, MW.mintDeep],
    few: ['#FFF2DC', AMBER_INK],
    done: [MW.chip, MW.mute],
};

export const SEAT_FG: Record<MateStatus, string> = { open: MW.mintDeep, few: AMBER_INK, done: MW.mute2 };

/** Seat dots drawn on a card photo / member circles in the detail panel. */
export const MAX_SEAT_DOTS = 6;

export const STEPS: [string, string, string][] = [
    ['01', '募集をさがす・投稿する', '行き先や日程、旅のスタイルで気の合う仲間を探せます。見つからなければ、無料で募集を投稿できます。'],
    ['02', 'コメントで相談', '気になる募集には、コメントで質問や参加の希望を伝えましょう。日程やプランを気軽に相談できます。'],
    ['03', '手配はmilkywayへ', 'メンバーが決まったら、日本語ガイド・車両・宿泊の手配をまとめてmilkywayにご相談いただけます。'],
];

export const MATE_ICON = {
    search: 'M17.5 11a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0zM16 16l4.5 4.5',
    gender: 'M12 11a4 4 0 100-8 4 4 0 000 8zM5 21c0-4 3.1-7 7-7s7 3 7 7',
    age: 'M5 20h14M6 20v-7h12v7M9 13V10M15 13V10M12 13V9M12 6.5v.5',
    shield: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM9 12l2 2 4-4',
    chat: 'M4 5h16v11H9l-5 4z',
    share: 'M20.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM8.5 12a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM20.5 19a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4',
} as const;
