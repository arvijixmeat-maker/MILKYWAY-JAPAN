import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { DayInfoContent, DesignBlockContent, ProductFAQ, TimelineContent, TourPricingOption, TourProduct } from '../../../types/product';
import { isPublished, type HomeProduct } from '../../home-desktop/homeDesktopData';
import { LINE_CHAT_URL } from '../../mobile/mobileTheme';
import { mapReview, parseJsonArray, type DesktopReview, type RawReview } from '../../reviews-desktop/reviewsData';
import { getDesignTemplate } from '../designTemplates/registry';
import { visibleInstances } from '../designTemplates/sections';

/**
 * Data helpers shared by the redesigned tour detail (PC + mobile).
 * Everything here reads the real product / review rows; nothing is sample data.
 */

/** Result of the page's share handler: drives the 共有 → コピー済み label. */
export type ShareResult = 'copied' | 'shared' | null;

export interface TourDetailViewProps {
    product: TourProduct;
    /** Approved reviews of this tour, newest first (raw API rows). */
    reviews: RawReview[];
    onBook: () => void;
    onShare: () => Promise<ShareResult>;
}

// ───────────────────────── sections / tabs ─────────────────────────

export type DetailSectionId = 'td-about' | 'td-detail' | 'td-plan' | 'td-incl' | 'td-rev' | 'td-faq';

export interface DetailTab {
    id: DetailSectionId;
    label: string;
}

export interface ItineraryBlock {
    id?: string;
    type: string;
    content: unknown;
}

export interface ItineraryDay {
    key: string;
    info: DayInfoContent;
    events: ItineraryBlock[];
}

/** A day / timeline card only counts once the admin typed something into it. */
export function isMeaningfulItineraryBlock(b: ItineraryBlock): boolean {
    if (b.type === 'image' || b.type === 'slide' || b.type === 'divider') return true;
    if (b.type === 'dayInfo') {
        const c = (b.content ?? {}) as Partial<DayInfoContent>;
        return Boolean(c.title?.trim() || c.description?.trim() || c.accommodation?.trim() || c.meals?.breakfast || c.meals?.lunch || c.meals?.dinner);
    }
    if (b.type === 'timeline') {
        const c = (b.content ?? {}) as Partial<TimelineContent>;
        return Boolean(c.title?.trim() || c.description?.trim() || c.time?.trim() || (Array.isArray(c.images) && c.images.length > 0));
    }
    return false;
}

/**
 * Itinerary blocks grouped per day. Blocks created before the first day card belong to day 1
 * (admins usually add the day skeleton last); without any day card the blocks stay flat.
 */
export function groupItinerary(product: TourProduct): { days: ItineraryDay[]; flat: ItineraryBlock[]; legacyImages: string[] } {
    const blocks = ((product.itineraryBlocks ?? []) as ItineraryBlock[]).filter(isMeaningfulItineraryBlock);
    const days: ItineraryDay[] = [];
    const pre: ItineraryBlock[] = [];
    let current: ItineraryDay | null = null;
    blocks.forEach((b, i) => {
        if (b.type === 'dayInfo') {
            if (current) days.push(current);
            current = { key: b.id || `day-${i}`, info: (b.content ?? {}) as DayInfoContent, events: [] };
        } else if (current) {
            current.events.push(b);
        } else {
            pre.push(b);
        }
    });
    if (current) days.push(current);
    if (days.length > 0 && pre.length > 0) {
        days[0] = { ...days[0], events: [...pre, ...days[0].events] };
        return { days, flat: [], legacyImages: [] };
    }
    return { days, flat: pre, legacyImages: blocks.length === 0 ? (product.itineraryImages ?? []).filter(Boolean) : [] };
}

/** True when a design-template block actually has the slot the itinerary is inserted into. */
export function designShowsItinerary(content: DesignBlockContent | undefined): boolean {
    const def = getDesignTemplate(content?.templateId ?? '');
    if (!def?.itineraryAfter) return false;
    return visibleInstances(def, content?.sections).some((s) => s.def === def.itineraryAfter);
}

export interface DetailFlags {
    hasDetail: boolean;
    hasItinerary: boolean;
    /** A design-template block draws the itinerary inside itself, so the separate 日程 section is skipped. */
    itineraryInDesign: boolean;
    hasIncluded: boolean;
}

export function detailFlags(product: TourProduct): DetailFlags {
    const blocks = product.detailBlocks ?? [];
    return {
        hasDetail: blocks.length > 0 || (product.detailSlides?.length ?? 0) > 0 || (product.detailImages?.length ?? 0) > 0,
        hasItinerary: ((product.itineraryBlocks ?? []) as ItineraryBlock[]).some(isMeaningfulItineraryBlock) || (product.itineraryImages?.length ?? 0) > 0,
        itineraryInDesign: blocks.some((b) => b.type === 'design' && designShowsItinerary(b.content as DesignBlockContent)),
        hasIncluded: (product.included?.length ?? 0) > 0 || (product.excluded?.length ?? 0) > 0,
    };
}


/** Tabs of the sticky row — only sections this tour really has. */
export function detailTabs(product: TourProduct): DetailTab[] {
    const f = detailFlags(product);
    const tabs: (DetailTab | false)[] = [
        { id: 'td-about', label: '概要' },
        f.hasDetail && { id: 'td-detail', label: '詳細情報' },
        f.hasItinerary && { id: 'td-plan', label: '日程' },
        f.hasIncluded && { id: 'td-incl', label: '含まれるもの' },
        { id: 'td-rev', label: 'レビュー' },
        { id: 'td-faq', label: 'ご注意・FAQ' },
    ];
    return tabs.filter((t): t is DetailTab => !!t);
}

export function scrollToSection(id: DetailSectionId, offset: number) {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
}

/** Active tab follows the section under the sticky bars; a tapped tab wins until its scroll settles. */
export function useSectionTabs(tabs: DetailTab[], offset: number) {
    const [active, setActive] = useState<DetailSectionId>('td-about');

    useEffect(() => {
        let locked = 0;
        const onScroll = () => {
            if (Date.now() < locked) return;
            let cur: DetailSectionId = tabs[0]?.id ?? 'td-about';
            for (const t of tabs) {
                const el = document.getElementById(t.id);
                if (el && el.getBoundingClientRect().top - offset - 12 < 0) cur = t.id;
            }
            setActive(cur);
        };
        const onPick = (e: Event) => {
            locked = Date.now() + 800;
            setActive((e as CustomEvent<DetailSectionId>).detail);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener(PICK_EVENT, onPick);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener(PICK_EVENT, onPick);
        };
    }, [tabs, offset]);

    const pick = (id: DetailSectionId) => {
        window.dispatchEvent(new CustomEvent<DetailSectionId>(PICK_EVENT, { detail: id }));
        scrollToSection(id, offset);
    };

    return { active, pick };
}

const PICK_EVENT = 'mw:tour-detail-tab';

// ───────────────────────── gallery / facts ─────────────────────────

/** Main + gallery photos without duplicates. */
export function tourGallery(product: TourProduct): string[] {
    const all = [...(product.mainImages ?? []), ...(product.galleryImages ?? [])].filter((x): x is string => typeof x === 'string' && x.length > 0);
    return Array.from(new Set(all));
}

export const tourImageAlt = (name: string, index: number) => `${name} ${index + 1}｜モンゴル旅行・モンゴルツアー`;

export const FACT_ICON = {
    calendar: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4',
    guide: 'M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c-1 4-4 7-7 8M13 20l4-9 4 9M14.5 17h5',
    people: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 010 6.5M18 14c2 .7 3 3 3 6',
    included: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 12l3 3 5-6',
} as const;

export interface TourFact {
    label: string;
    value: string;
    d: string;
}

const INCLUDED_GROUPS: [string, RegExp][] = [
    ['食事', /食事|朝食|昼食|夕食|全食/],
    ['宿泊', /宿泊|ホテル|ゲル/],
    ['送迎', /送迎|専用車|車両|ドライバー/],
    ['入場料', /入場/],
];

/** 含むもの summary taken from the tour's own "included" list (never a fixed phrase). */
function includedSummary(included: string[], joiner: string): string {
    const hits = INCLUDED_GROUPS.filter(([, re]) => included.some((x) => re.test(x))).map(([label]) => label);
    if (hits.length >= 2) return hits.slice(0, 2).join(joiner);
    return `${included.length}項目`;
}

/** The fact row under the gallery. Cells without real data are left out. */
export function tourFacts(product: TourProduct, minPeople: number | undefined, compact: boolean): TourFact[] {
    const facts: TourFact[] = [];
    const duration = (product.duration || '').trim();
    if (duration) facts.push({ label: '期間', value: duration, d: FACT_ICON.calendar });
    facts.push({ label: 'ガイド', value: compact ? '日本語ガイド' : '日本語ガイド同行', d: FACT_ICON.guide });
    if (minPeople && minPeople > 0) facts.push({ label: '最少催行', value: `${minPeople}名様〜`, d: FACT_ICON.people });
    const included = (product.included ?? []).filter(Boolean);
    if (included.length > 0) facts.push({ label: '含むもの', value: includedSummary(included, compact ? '・' : ' + '), d: FACT_ICON.included });
    return facts;
}

/** Whole-percent discount (5%+) of the tour's "from" price against the admin-set original price. */
export function tourDiscountPct(product: TourProduct): number {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    const pct = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    return pct >= 5 ? pct : 0;
}

// ───────────────────────── pricing ─────────────────────────

export interface TourPricing {
    options: TourPricingOption[];
    people: number;
    setPeople: (n: number) => void;
    canDec: boolean;
    canInc: boolean;
    dec: () => void;
    inc: () => void;
    /** Per-person price of the tier that applies to the chosen headcount. */
    unit: number;
    total: number;
    minPeople: number | undefined;
    /** Larger groups pay less per person (drives the "人数が多いほどお得" hint). */
    groupSaves: boolean;
}

/**
 * Headcount → price, from the admin's per-headcount tiers (the same matching the booking page uses).
 * Falls back to the flat product price when no tiers are configured.
 */
export function useTourPricing(product: TourProduct): TourPricing {
    const options = useMemo(
        () => (product.pricingOptions ?? []).filter((o) => o && o.people > 0).slice().sort((a, b) => a.people - b.people),
        [product.pricingOptions],
    );
    const first = options[0];
    const last = options[options.length - 1];
    const [people, setPeople] = useState(first?.people ?? 2);

    const tier = useMemo(() => {
        if (options.length === 0) return null;
        const exact = options.find((o) => o.people === people);
        if (exact) return exact;
        if (people < options[0].people) return options[0];
        return options.filter((o) => o.people <= people).pop() ?? options[0];
    }, [options, people]);

    const unit = tier?.pricePerPerson ?? product.price ?? 0;
    const min = first?.people ?? 1;
    const max = last?.people;
    const canDec = people > min;
    const canInc = max === undefined || people < max;

    return {
        options,
        people,
        setPeople,
        canDec,
        canInc,
        dec: () => setPeople(Math.max(min, people - 1)),
        inc: () => setPeople(max === undefined ? people + 1 : Math.min(max, people + 1)),
        unit,
        total: unit * people,
        minPeople: first?.people,
        groupSaves: !!first && !!last && last.pricePerPerson < first.pricePerPerson,
    };
}

/** Tier button price: ¥189,000 → ¥189k (exact when it is not a round thousand). */
export function shortYen(n: number): string {
    if (n >= 10000 && n % 1000 === 0) return `¥${n / 1000}k`;
    return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

// ───────────────────────── reviews ─────────────────────────

export interface ReviewSummary {
    list: DesktopReview[];
    count: number;
    /** One decimal; 0 when there are no reviews. */
    avg: number;
    /** Number of reviews per star, 5 → 1. */
    dist: { star: number; count: number }[];
}

export function summariseReviews(raw: RawReview[]): ReviewSummary {
    const list = raw.map(mapReview);
    const count = list.length;
    const sum = raw.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const buckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of list) buckets[r.rating] += 1;
    return {
        list,
        count,
        avg: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
        dist: [5, 4, 3, 2, 1].map((star) => ({ star, count: buckets[star] })),
    };
}

// ───────────────────────── FAQ ─────────────────────────

/** Shown only when neither the tour nor /admin/tour-faqs has any question. */
const DEFAULT_PRODUCT_FAQS: ProductFAQ[] = [
    { q: '出発前に何を準備したらいいですか？', a: '国際線航空券・パスポート (有効期限6ヶ月以上)・モンゴルビザが必要です。ビザ申請は弊社でもサポートいたします。気温差が大きいため、季節を問わず羽織りものは必須です。' },
    { q: 'キャンセル規定を教えてください。', a: '予約金はホテルおよび宿泊施設の前払金として使用するため、日程キャンセルの場合は返金不可となります。キャンセルや日程変更をご希望の場合は、お早めにLINEまたはメールでご連絡ください。' },
    { q: 'ゲル宿泊は寝具がありますか？', a: '全てのゲルキャンプにベッド・マットレス・毛布・タオルを完備しています。冬季には電気毛布もご用意します。' },
    { q: '1人旅でも参加できますか？', a: 'もちろん可能です。一人参加追加料金 ¥18,000 を頂戴しております (個室追加料金分)。同行者募集の掲示板もご利用ください。' },
    { q: '食事のアレルギー対応はありますか？', a: '事前にお知らせいただければ、食物アレルギーや宗教上の食事制限に個別対応いたします。ベジタリアン・ヴィーガン対応も可能です。' },
    { q: '現地での通信手段は？', a: 'ウランバートル市内は4G完備。ゴビ・テレルジでは電波が弱い場所もあります。ガイドが衛星電話を所持しているため緊急連絡は可能です。' },
];

/** FAQ precedence: the tour's own questions → site-wide tour FAQ (/admin/tour-faqs) → built-in defaults. */
export function useTourFaqItems(product: TourProduct): ProductFAQ[] {
    const { data: common = [] } = useQuery({
        queryKey: ['tourFaqs'],
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            try {
                const rows = await api.tourFaqs.list();
                return Array.isArray(rows) ? rows.map((r): ProductFAQ => ({ q: r.question, a: r.answer })) : [];
            } catch (e) {
                console.error('tour-faqs fetch failed:', e);
                return [] as ProductFAQ[];
            }
        },
    });
    const own = parseJsonArray<ProductFAQ>(product.faqs).filter((f) => f && f.q);
    if (own.length > 0) return own;
    return common.length > 0 ? common : DEFAULT_PRODUCT_FAQS;
}

// ───────────────────────── related / recently viewed ─────────────────────────

interface RawProduct {
    id: string;
    name?: string;
    category?: string;
    price?: number;
    originalPrice?: number;
    original_price?: number;
    isPopular?: boolean | number;
    is_popular?: boolean | number;
    isFeatured?: boolean | number;
    is_featured?: boolean | number;
    status?: string;
    packageType?: string | null;
    mainImages?: unknown;
    main_images?: unknown;
    duration?: string;
    tags?: unknown;
    bookingCount?: number;
    booking_count?: number;
}

/** Other published tours of the same category, popular / most booked first. */
export function useRelatedTours(productId: string, category: string, limit: number): HomeProduct[] {
    const { data = [] } = useQuery({
        queryKey: ['tourDetail', 'products'],
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            const raw = await api.products.list();
            return (Array.isArray(raw) ? (raw as RawProduct[]) : []).map((p) => ({
                booked: Number(p.bookingCount ?? p.booking_count ?? 0),
                product: {
                    id: String(p.id),
                    name: String(p.name ?? ''),
                    category: p.category ?? '',
                    price: Number(p.price ?? 0),
                    originalPrice: p.originalPrice ?? p.original_price ?? undefined,
                    isPopular: !!(p.isPopular ?? p.is_popular),
                    isFeatured: !!(p.isFeatured ?? p.is_featured),
                    status: p.status,
                    packageType: p.packageType === 'full' || p.packageType === 'value' ? p.packageType : null,
                    mainImages: parseJsonArray<string>(p.mainImages ?? p.main_images).filter((x) => typeof x === 'string' && x.length > 0),
                    duration: p.duration ?? '',
                    tags: parseJsonArray<string>(p.tags),
                } satisfies HomeProduct,
            }));
        },
    });
    return useMemo(
        () =>
            data
                .filter((x) => x.product.id !== productId && x.product.category === category && isPublished(x.product))
                .sort((a, b) => Number(b.product.isPopular) - Number(a.product.isPopular) || b.booked - a.booked)
                .slice(0, limit)
                .map((x) => x.product),
        [data, productId, category, limit],
    );
}

export interface RecentlyViewedTour {
    product_id: string;
    title?: string;
    image?: string;
    price?: number | string;
    type?: string;
}

/** The signed-in visitor's recently viewed tours, without the current one. */
export function useRecentlyViewedTours(excludeId: string): RecentlyViewedTour[] {
    const { data = [] } = useQuery({
        queryKey: ['tourDetail', 'recentlyViewed', excludeId],
        retry: false,
        queryFn: async () => {
            try {
                const me = await api.auth.me();
                if (!me) return [];
                const rows = await api.recentlyViewed.list();
                return (Array.isArray(rows) ? (rows as RecentlyViewedTour[]) : [])
                    .filter((v) => v.product_id !== excludeId && v.type !== 'magazine' && (v.title || v.image))
                    .slice(0, 8);
            } catch {
                return [];
            }
        },
    });
    return data;
}

// ───────────────────────── consultation ─────────────────────────

/** 無料相談: the Channel Talk messenger when it has loaded, otherwise the official LINE chat. */
export function openConsult() {
    if (typeof window.openChannelTalk === 'function') window.openChannelTalk();
    else window.open(LINE_CHAT_URL, '_blank', 'noopener,noreferrer');
}
