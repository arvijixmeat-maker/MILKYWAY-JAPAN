import { useEffect, useState } from 'react';
import {
    BedDouble, CalendarDays, CircleHelp, ContactRound, FolderTree, Hotel, House, Images, Inbox, LayoutDashboard,
    LayoutTemplate, Luggage, Megaphone, MountainSnow, Newspaper, Star, Ticket, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';

/** 관리자 메뉴 — 사이드바 · 모바일 「더보기」 · 검색창이 모두 이 목록을 쓴다. */
export interface AdminNavItem {
    id: string;
    icon: LucideIcon;
    label: string;
    href: string;
}
export interface AdminNavGroup { key: string; label: string; items: AdminNavItem[] }

export const ADMIN_NAV: AdminNavGroup[] = [
    {
        key: 'ops', label: '운영', items: [
            { id: 'dashboard', icon: LayoutDashboard, label: '대시보드', href: '/admin' },
            { id: 'reservations', icon: Ticket, label: '통합 예약 관리', href: '/admin/reservations' },
            { id: 'accommodation-ops', icon: BedDouble, label: 'Байр захиалга · 숙소배정', href: '/admin/accommodation-ops' },
            { id: 'calendar', icon: CalendarDays, label: '투어 캘린더', href: '/admin/calendar' },
        ],
    },
    {
        key: 'content', label: '콘텐츠', items: [
            { id: 'products', icon: Luggage, label: '상품 관리', href: '/admin/products' },
            { id: 'magazines', icon: Newspaper, label: '매거진 관리', href: '/admin/magazines' },
            { id: 'templates', icon: LayoutTemplate, label: '템플릿 관리', href: '/admin/templates' },
            { id: 'reviews', icon: Star, label: '후기 관리', href: '/admin/reviews' },
            { id: 'faq', icon: CircleHelp, label: 'FAQ 관리', href: '/admin/faq' },
            { id: 'inquiries', icon: Inbox, label: '문의 관리', href: '/admin/inquiries' },
        ],
    },
    {
        key: 'site', label: '사이트 설정', items: [
            { id: 'banners', icon: House, label: '홈 화면 관리', href: '/admin/banners' },
            { id: 'promotions', icon: Megaphone, label: '여행기획전 관리', href: '/admin/promotions' },
            { id: 'categories', icon: FolderTree, label: '카테고리 관리', href: '/admin/categories' },
            { id: 'hotels', icon: Hotel, label: '호텔 마스터', href: '/admin/hotels' },
            { id: 'tourist-spots', icon: MountainSnow, label: '관광지 마스터', href: '/admin/tourist-spots' },
            { id: 'design-spots', icon: Images, label: '여행지 사진', href: '/admin/design-spots' },
            { id: 'guide-intro', icon: ContactRound, label: '가이드 소개 (공통)', href: '/admin/guide-intro' },
        ],
    },
];

/** 휴대폰 하단 탭 — 자주 쓰는 세 화면 + 「더보기」(전체 메뉴) */
export const MOBILE_TABS: { id: string; icon: LucideIcon; label: string; href: string }[] = [
    { id: 'reservations', icon: Ticket, label: '예약', href: '/admin/reservations' },
    { id: 'accommodation-ops', icon: BedDouble, label: '숙소배정', href: '/admin/accommodation-ops' },
    { id: 'products', icon: Luggage, label: '상품', href: '/admin/products' },
];

/** 메뉴 id → 상단 바에 보여 줄 분류 이름 (대시보드는 분류 없이 이름만) */
export const navGroupLabel = (pageId: string): string | undefined => {
    if (pageId === 'dashboard') return undefined;
    return ADMIN_NAV.find((g) => g.items.some((i) => i.id === pageId))?.label;
};

/** 관리자가 먼저 움직여야 하는 건수 — 메뉴 옆 숫자와 알림에 쓴다. */
export interface AdminPending {
    /** 새로 들어온 견적 요청 */
    newQuotes: number;
    /** 고객이 예약을 요청한 건 */
    requested: number;
    /** 아직 읽지 않은 문의 */
    newInquiries: number;
}

const CACHE_KEY = 'mw-admin-pending';
const TTL_MS = 60_000;

const readCache = (): (AdminPending & { at: number }) | null => {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const v = JSON.parse(raw);
        return typeof v?.at === 'number' ? v : null;
    } catch { return null; }
};

const isNewQuote = (q: any) => q?.status === 'new' || q?.status === 'pending';

/**
 * 처리 대기 건수. 메뉴를 옮길 때마다 페이지가 새로 열리므로 1분 동안은 브라우저에 적어 둔 값을 쓴다.
 * 불러오지 못한 항목은 0 으로 둔다(숫자가 안 보일 뿐 화면은 그대로).
 */
export const useAdminPending = (): AdminPending | null => {
    const [pending, setPending] = useState<AdminPending | null>(() => readCache());

    useEffect(() => {
        const cached = readCache();
        if (cached && Date.now() - cached.at < TTL_MS) return;
        let alive = true;
        const timer = window.setTimeout(async () => {
            const [reservations, quotes, inquiries] = await Promise.all([
                api.reservations.list().catch(() => null),
                api.quotes.list().catch(() => null),
                api.inquiries.list('new').catch(() => null),
            ]);
            if (!alive) return;
            const next: AdminPending = {
                newQuotes: Array.isArray(quotes) ? quotes.filter(isNewQuote).length : 0,
                requested: Array.isArray(reservations) ? reservations.filter((r: any) => r?.status === 'reservation_requested').length : 0,
                newInquiries: Array.isArray(inquiries) ? inquiries.length : 0,
            };
            setPending(next);
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, at: Date.now() })); } catch { /* 저장 못 해도 무방 */ }
        }, 400);
        return () => { alive = false; window.clearTimeout(timer); };
    }, []);

    return pending;
};

/** 메뉴 옆에 붙는 숫자 (0 이면 표시하지 않음) */
export const navCount = (pageId: string, p: AdminPending | null): number => {
    if (!p) return 0;
    if (pageId === 'reservations') return p.newQuotes + p.requested;
    if (pageId === 'inquiries') return p.newInquiries;
    return 0;
};
