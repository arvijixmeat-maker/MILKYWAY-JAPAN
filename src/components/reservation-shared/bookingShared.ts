import type { AccommodationOption, TourPricingOption, VehicleOption } from '../../types/product';
import { yen } from '../desktop-primitives/mwTokens';

/**
 * Types, copy and pure helpers shared by the PC and mobile booking screens
 * (Claude Design: "Booking Header / Body / Summary"). No state and no requests live here:
 * the three pages (Reservation, Payment, ReservationComplete) own the booking logic.
 */

export interface PriceBreakdown {
    total: number;
    deposit: number;
    local: number;
}

export interface ParsedDuration {
    nights: number;
    days: number;
}

export interface CustomerInfo {
    name: string;
    phone: string;
    email: string;
}

export interface FieldError {
    field: string;
    msg: string;
}

export type BookingStepNo = 1 | 2 | 3;

/** What the booking screens read from a product. Quote bookings only carry id / name / duration. */
export interface BookingProduct {
    id?: string;
    name: string;
    duration?: string;
    category?: string;
    mainImages?: string[];
    pricingOptions?: TourPricingOption[];
    accommodationOptions?: AccommodationOption[];
    vehicleOptions?: VehicleOption[];
}

/** STEP 1 (/reservation/:id): state and handlers owned by pages/Reservation.tsx. */
export interface ReservationStepProps {
    product: BookingProduct;
    parsedDuration: ParsedDuration;
    selectedStartDate: Date | null;
    setSelectedStartDate: (d: Date) => void;
    totalPeople: number;
    setTotalPeople: (n: number) => void;
    selectedAccomId: string;
    setSelectedAccomId: (id: string) => void;
    selectedVehicleId: string;
    setSelectedVehicleId: (id: string) => void;
    baseOption: TourPricingOption | null;
    priceBreakdown: PriceBreakdown;
    onNext: () => void;
}

/** STEP 2 (/payment): state and handlers owned by pages/Payment.tsx. */
export interface PaymentStepProps {
    product: BookingProduct;
    isQuote: boolean;
    selectedStartDate: Date | null;
    endDate: Date | null;
    nights: number;
    days: number;
    totalPeople: number;
    baseOption: TourPricingOption | null;
    priceBreakdown: PriceBreakdown;
    selectedAccomId?: string;
    selectedVehicleId?: string;
    customerInfo: CustomerInfo;
    setCustomerInfo: (info: CustomerInfo) => void;
    memo: string;
    setMemo: (s: string) => void;
    agreeToTerms: boolean;
    setAgreeToTerms: (b: boolean) => void;
    isProcessing: boolean;
    fieldError: FieldError | null;
    /** Clears the error once the customer edits the field it points at. */
    onFieldEdit: (field: string) => void;
    onSubmit: () => void;
    onBack: () => void;
}

/** 完了 (/reservation-complete): values read from the saved reservation. */
export interface CompleteStepProps {
    productName: string;
    email: string;
    reservationNo: string;
    total: number;
    deposit: number;
    local: number;
}

export const BK_PAGE_BG = '#F4F6F5';
export const BK_SOFT = '#F7FAF9';
export const BK_HAIR = '#EEF1EF';
export const BK_OFF = '#C3CCCA';
export const BK_SAT = '#2B63C6';
export const BK_ERR_BG = '#FDECEA';
export const BK_DARK_GRADIENT = 'linear-gradient(160deg,#0F2A3B 0%,#1C8571 100%)';
export const BK_LINE_GREEN = '#06C755';

export const BK_STEPS: { label: string; short: string }[] = [
    { label: '予約日・オプション', short: '日程・オプション' },
    { label: 'ご予約者情報・決済', short: '情報・決済' },
    { label: '申し込み完了', short: '完了' },
];

export const BK_HEAD: Record<BookingStepNo, { title: string; sub: string }> = {
    1: { title: '予約日およびオプションの選択', sub: '旅行開始日と人数、オプションを選択してください' },
    2: { title: '予約情報および決済確認', sub: 'ご予約者情報と決済方法をご確認ください' },
    3: { title: 'お申し込み完了', sub: 'お支払い完了をもって予約確定となります' },
};

/** Shown under the deposit rule on STEP 2; the rule itself is DEPOSIT_POLICY in constants/company.ts. */
export const BK_CANCEL_NOTES = [
    'キャンセルや日程変更をご希望の場合は、お早めにLINEまたはメールでご連絡ください。',
    '詳しい契約条件は、ご予約後にお送りする海外旅行契約書をご確認ください。',
];

export const BK_PAY_NOTES = [
    '請求書メールにお支払い期限が記載されています。期限内に決済をお願いします。',
    '期限内にお支払いが確認できない場合、ご予約をキャンセルさせていただくことがございます。',
    '残金は現地到着後、担当ガイドへ現金（日本円）で直接お支払いください。',
];

export const BK_NEXT_STEPS: { t: string; d: string }[] = [
    { t: 'PayPal請求書をメールで受信', d: 'ご登録のEメール宛に決済用のPayPalご請求メールをお送りします。' },
    { t: 'メール内のリンクからお支払い', d: 'クレジットカード等で安全・簡単にお支払いいただけます。' },
    { t: 'お支払い完了で予約確定', d: '期限内にお支払いが確認できない場合、ご予約がキャンセルとなることがございます。' },
];

export const BK_HINT_DEPOSIT = '予約金はキャンセル時も返金不可となります';
export const BK_HINT_PICK_DATE = 'カレンダーから出発日を選択してください';
export const BK_HINT_INVOICE = '申し込み後、PayPal請求書をメールでお送りします';

/** Stroke icon paths (24px grid) copied from the design file. */
export const BK_D = {
    stay: 'M3 20h18M5 20V10l7-6 7 6v10M10 20v-5h4v5',
    car: 'M5 16V9l2-4h10l2 4v7M3 16h18v3H3zM7 19v2M17 19v2M5 12h14',
    credit: 'M3 6h18v12H3zM3 10h18M7 15h3',
    debit: 'M3 6h18v12H3zM3 10h18M15 15h3',
    bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
    note: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
    warn: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v5M12 16h.01',
    tick: 'M5 12l5 5 9-10',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    down: 'M6 9l6 6 6-6',
} as const;

const WEEK = '日月火水木金土';
export const BK_WEEK = WEEK.split('');

export const startOfToday = (): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

export const addDays = (date: Date, n: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
};

export const sameDay = (a: Date | null, b: Date | null): boolean =>
    !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** STEP 1 choices, kept for this tab so going back from STEP 2 does not reset them. */
export interface BookingDraft {
    startDate: Date | null;
    totalPeople: number;
    selectedAccomId: string;
    selectedVehicleId: string;
}

const draftKey = (productId: string) => `mw-booking-draft:${productId}`;

export const saveBookingDraft = (productId: string, draft: BookingDraft): void => {
    try {
        const d = draft.startDate;
        sessionStorage.setItem(draftKey(productId), JSON.stringify({
            ...draft,
            startDate: d ? [d.getFullYear(), d.getMonth(), d.getDate()] : null,
        }));
    } catch {
        // Storage can be blocked (private mode); the flow works without it.
    }
};

export const readBookingDraft = (productId: string): BookingDraft | null => {
    try {
        const raw = sessionStorage.getItem(draftKey(productId));
        if (!raw) return null;
        const v = JSON.parse(raw);
        const ymd = Array.isArray(v.startDate) && v.startDate.length === 3 ? v.startDate.map(Number) : null;
        const startDate = ymd && ymd.every(Number.isFinite) ? new Date(ymd[0], ymd[1], ymd[2]) : null;
        return {
            startDate,
            totalPeople: Number.isFinite(Number(v.totalPeople)) ? Number(v.totalPeople) : 0,
            selectedAccomId: typeof v.selectedAccomId === 'string' ? v.selectedAccomId : '',
            selectedVehicleId: typeof v.selectedVehicleId === 'string' ? v.selectedVehicleId : '',
        };
    } catch {
        return null;
    }
};

export const clearBookingDraft = (productId: string): void => {
    try {
        sessionStorage.removeItem(draftKey(productId));
    } catch {
        // see saveBookingDraft
    }
};

/** "9/12（金）" */
export const fmtShort = (d: Date): string => `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;

/** "2026年9月12日（金）" */
export const fmtLong = (d: Date): string => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;

export const periodShort = (start: Date, end: Date): string => `${fmtShort(start)} 〜 ${fmtShort(end)}`;

export const periodLong = (start: Date, end: Date): string =>
    `${fmtLong(start)} 〜 ${end.getMonth() + 1}月${end.getDate()}日（${WEEK[end.getDay()]}）`;

/** "4泊5日" when the tour has nights, otherwise the product's own duration text. */
export const durationLabel = (nights: number, days: number, fallback?: string): string =>
    nights > 0 ? `${nights}泊${days}日` : fallback || '';

/** Admin titles sometimes start with a "[カテゴリ]" tag; the booking screens show the bare name. */
export const bareName = (name: string): string => name.replace(/^\[[^\]]+\]\s*/, '');

export const signedYen = (n: number): string => (n < 0 ? `−${yen(Math.abs(n))}` : `+${yen(n)}`);

export const optionPriceLabel = (modifier: number, isDefault?: boolean): string =>
    modifier === 0 ? (isDefault ? '基本料金に含む' : '追加料金なし') : signedYen(modifier);

/** Tier chip price: "¥105k" on narrow screens when the price is a round thousand. */
export const tierPrice = (price: number, compact: boolean): string =>
    compact && price >= 1000 && price % 1000 === 0 ? `¥${price / 1000}k` : yen(price);

export const sortTiers = (options?: TourPricingOption[]): TourPricingOption[] =>
    (options ?? []).slice().sort((a, b) => a.people - b.people);

export const findOption = <T extends { id: string }>(options: T[] | undefined, id?: string): T | undefined =>
    id ? (options ?? []).find((o) => o.id === id) : undefined;

/** Breakdown rows above the total: base price and any option surcharge / discount. */
export function priceLines(
    baseOption: TourPricingOption | null,
    people: number,
    accom?: AccommodationOption,
    vehicle?: VehicleOption,
): { k: string; v: string }[] {
    const lines: { k: string; v: string }[] = [];
    if (baseOption) lines.push({ k: `${yen(baseOption.pricePerPerson)} × ${people}名`, v: yen(baseOption.pricePerPerson * people) });
    if (accom && accom.priceModifier !== 0) lines.push({ k: '宿泊オプション', v: signedYen(accom.priceModifier) });
    if (vehicle && vehicle.priceModifier !== 0) lines.push({ k: '車両オプション', v: signedYen(vehicle.priceModifier) });
    return lines;
}

/** Same number the customer sees in My Page (reservation number, else the short id). */
export const reservationNoOf = (r: { id?: string; reservationNumber?: string | null; reservation_number?: string | null }): string =>
    String(r.reservationNumber || r.reservation_number || (r.id ? r.id.slice(0, 8).toUpperCase() : ''));

/** Sticky offset of the PC summary card. The PC booking pages render without the site header. */
export const BK_STICKY_TOP_PC = 24;
