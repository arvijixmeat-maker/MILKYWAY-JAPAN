import React, { useEffect, useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminAlerts } from './AdminAlerts';
import { AdminSearch } from './AdminSearch';
import { StrokeIcon } from './console/StrokeIcon';
import { navGroupLabel, useAdminPending } from './adminNav';
import '../../styles/admin-console.css';

interface AdminLayoutProps {
    activePage: string;
    title: string;
    description?: string;
    /** 제목 위 분류 라벨; 없으면 메뉴 분류에서 가져온다 */
    eyebrow?: string;
    /** kept for backward-compat — 검색은 이제 사이드바(Ctrl/⌘+K)에 있다 */
    showSearch?: boolean;
    /** kept for backward-compat with existing call sites; redesign is light-only */
    isDarkMode?: boolean;
    toggleTheme?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * 관리자 공통 틀 (Claude Design 「MILKYWAY 관리자 콘솔 리디자인」 기준 레이아웃).
 * 사이드바 248px + 회색 바탕 위 페이지 헤더(분류 → 제목 → 설명 / 오른쪽 버튼) + 본문 최대 1280px.
 * 767px 이하에서는 상단 바(메뉴 · 검색 · 알림)와 서랍 메뉴로 바뀐다.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({
    activePage, title, description, eyebrow, actions, children,
}) => {
    const eb = eyebrow || navGroupLabel(activePage) || '관리자 콘솔';
    const pending = useAdminPending();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
            else if (e.key === 'Escape') setDrawerOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const openSearch = () => { setDrawerOpen(false); setSearchOpen(true); };

    return (
        <div className={`app${drawerOpen ? ' drawer-open' : ''}`}>
            <div className="topbar">
                <button type="button" className="side-icon-btn" aria-label="메뉴 열기" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
                    <StrokeIcon name="uiBars" size={22} />
                </button>
                <a href="/admin" className="topbar-brand" aria-label="MILKYWAY 관리자 홈">
                    <span className="brand-mark sm">M</span>
                    <span className="brand-name">MILKYWAY</span>
                </a>
                <button type="button" className="side-icon-btn" aria-label="검색" onClick={openSearch}>
                    <StrokeIcon name="uiSearch" />
                </button>
                <AdminAlerts pending={pending} className="topbar-alerts" />
            </div>

            <button type="button" className="side-scrim" aria-label="메뉴 닫기" tabIndex={drawerOpen ? 0 : -1} onClick={() => setDrawerOpen(false)} />
            <AdminSidebar activePage={activePage} pending={pending} onOpenSearch={openSearch} onClose={() => setDrawerOpen(false)} />

            <div className="main">
                <header className="header">
                    <div className="header-in">
                        <div className="header-titles">
                            <div className="eyebrow">{eb}</div>
                            <h1 className="page-title">{title}</h1>
                            {description && <p className="page-desc">{description}</p>}
                        </div>
                        {actions && <div className="header-tools">{actions}</div>}
                    </div>
                </header>

                <div className="content"><div className="content-in">{children}</div></div>
            </div>

            {searchOpen && <AdminSearch onClose={() => setSearchOpen(false)} />}
        </div>
    );
};
