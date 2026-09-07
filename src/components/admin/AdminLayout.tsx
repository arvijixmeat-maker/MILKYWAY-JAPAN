import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { Icon } from './console/Icon';
import '../../styles/admin-console.css';

interface AdminLayoutProps {
    activePage: string;
    title: string;
    description?: string;
    /** small uppercase label above the title; defaults from the page section */
    eyebrow?: string;
    /** show the decorative header search pill (default true) */
    showSearch?: boolean;
    /** kept for backward-compat with existing call sites; redesign is light-only */
    isDarkMode?: boolean;
    toggleTheme?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

const EYEBROW: Record<string, string> = {
    dashboard: '관리자 콘솔',
    reservations: '운영', calendar: '운영', guides: '운영',
    products: '카탈로그',
    magazines: '콘텐츠', templates: '콘텐츠', reviews: '콘텐츠', faq: '콘텐츠',
    banners: '사이트 설정', categories: '사이트 설정', hotels: '사이트 설정',
    'tourist-spots': '사이트 설정', 'design-spots': '사이트 설정', accommodations: '사이트 설정', 'guide-intro': '사이트 설정',
};

const PAGE_DESCRIPTION: Record<string, string> = {
    dashboard: '오늘 처리할 업무와 주요 운영 현황을 한눈에 확인하세요.',
    reservations: '예약·견적·배정 업무를 한 곳에서 빠르게 처리하세요.',
    'accommodation-ops': '여행 일정별 숙소 배정 상태와 객실 정보를 관리하세요.',
    calendar: '확정된 투어 일정과 운영 준비 상태를 확인하세요.',
    products: '판매 상품과 노출 상태를 일관되게 관리하세요.',
    magazines: '여행 콘텐츠의 작성과 공개 상태를 관리하세요.',
    templates: '반복 업무에 사용하는 문서 템플릿을 관리하세요.',
    reviews: '고객 후기의 검수와 노출 상태를 관리하세요.',
    faq: '고객이 자주 찾는 질문과 답변을 관리하세요.',
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({
    activePage, title, description, eyebrow, showSearch = true, actions, children,
}) => {
    const navigate = useNavigate();
    const [isNavigationOpen, setIsNavigationOpen] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');
    const eb = eyebrow || EYEBROW[activePage] || '관리자 콘솔';
    const pageDescription = description || PAGE_DESCRIPTION[activePage];

    const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = globalSearch.trim();
        if (!query) return;
        navigate(`/admin/reservations?q=${encodeURIComponent(query)}`);
        setGlobalSearch('');
    };

    return (
        <div className={`app${isNavigationOpen ? ' side-open' : ''}`}>
            <AdminSidebar activePage={activePage} onNavigate={() => setIsNavigationOpen(false)} />
            <button
                className="side-scrim"
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setIsNavigationOpen(false)}
            />
            <div className="main">
                <header className="header">
                    <div className="header-in">
                        <button
                            className="icon-btn mobile-nav-btn"
                            type="button"
                            aria-label="관리자 메뉴 열기"
                            aria-expanded={isNavigationOpen}
                            onClick={() => setIsNavigationOpen(true)}
                        >
                            <Icon name="menu" />
                        </button>
                        <div style={{ minWidth: 0 }}>
                            <div className="eyebrow"><span className="dot" />{eb}</div>
                            <div className="page-title">{title}</div>
                            {pageDescription && (
                                <div className="page-description">{pageDescription}</div>
                            )}
                        </div>
                        <div className="header-spacer" />
                        <div className="header-tools">
                            {showSearch && (
                                <form className="search-pill" onSubmit={handleSearch} role="search">
                                    <Icon name="search" />
                                    <input
                                        value={globalSearch}
                                        onChange={(event) => setGlobalSearch(event.target.value)}
                                        placeholder="예약 · 고객 · 상품 검색"
                                        aria-label="통합 예약 검색"
                                    />
                                </form>
                            )}
                            {actions}
                        </div>
                    </div>
                </header>

                <div className="content"><div className="content-in">{children}</div></div>
            </div>
        </div>
    );
};
