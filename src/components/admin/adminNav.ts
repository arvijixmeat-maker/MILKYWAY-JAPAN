import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { StrokeIconName } from './console/StrokeIcon';

/** 관리자 메뉴 — 사이드바 · 모바일 서랍 · 검색창이 모두 이 목록을 쓴다. */
export interface AdminNavItem {
    id: string;
    icon: StrokeIconName;
    label: string;
    /** 라벨 옆 작은 보조 글씨 (예: 몽골어 이름) */
    sub?: string;
    href: string;
}
export interface AdminNavGroup { key: string; label: string; items: AdminNavItem[] }

export const ADMIN_NAV: AdminNavGroup[] = [
    {
        key: 'ops', label: '운영', items: [
            { id: 'dashboard', icon: 'navDash', label: '대시보드', href: '/admin' },
            { id: 'reservations', icon: 'navBooking', label: '통합 예약 관리', href: '/admin/reservations' },
            { id: 'accommodation-ops', icon: 'navBed', label: '숙소배정', sub: 'Байр захиалга', href: '/admin/accommodation-ops' },
            { id: 'calendar', icon: 'navCal', label: '투어 캘린더', href: '/admin/calendar' },
        ],
    },
    {
        key: 'catalog', label: '카탈로그', items: [
            { id: 'products', icon: 'navBox', label: '상품 관리', href: '/admin/products' },
        ],
    },
    {
        key: 'content', label: '콘텐츠', items: [
            { id: 'magazines', icon: 'navMagazine', label: '매거진 관리', href: '/admin/magazines' },
            { id: 'templates', icon: 'navLayers', label: '템플릿 관리', href: '/admin/templates' },
            { id: 'reviews', icon: 'navStar', label: '후기 관리', href: '/admin/reviews' },
            { id: 'faq', icon: 'navHelp', label: 'FAQ 관리', href: '/admin/faq' },
            { id: 'inquiries', icon: 'navMail', label: '문의 관리', href: '/admin/inquiries' },
        ],
    },
    {
        key: 'site', label: '사이트 설정', items: [
            { id: 'banners', icon: 'navScreen', label: '홈 화면 관리', href: '/admin/banners' },
            { id: 'promotions', icon: 'navHorn', label: '여행기획전 관리', href: '/admin/promotions' },
            { id: 'categories', icon: 'navTag', label: '카테고리 관리', href: '/admin/categories' },
            { id: 'hotels', icon: 'navBuilding', label: '호텔 마스터', href: '/admin/hotels' },
            { id: 'tourist-spots', icon: 'navPin', label: '관광지 마스터', href: '/admin/tourist-spots' },
            { id: 'design-spots', icon: 'navPhoto', label: '여행지 사진', href: '/admin/design-spots' },
            { id: 'guide-intro', icon: 'navGlobe', label: '가이드 소개 (공통)', href: '/admin/guide-intro' },
        ],
    },
];

/** 메뉴 id → 페이지 제목 위 분류 라벨 */
export const navGroupLabel = (pageId: string): string | undefined => {
    if (pageId === 'dashboard') return '관리자 콘솔';
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
