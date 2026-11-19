import React, { useEffect, useState } from 'react';
import { ChevronRight, Ellipsis, ExternalLink, Search } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { AdminAlerts } from './AdminAlerts';
import { AdminSearch } from './AdminSearch';
import { MOBILE_TABS, navCount, navGroupLabel, useAdminPending } from './adminNav';
import { CountBadge } from './ui';
import '../../styles/admin-console.css';

interface AdminLayoutProps {
    activePage: string;
    title: string;
    description?: string;
    /** 상단 바의 분류 이름; 없으면 메뉴 분류에서 가져온다 */
    eyebrow?: string;
    /** kept for backward-compat — 검색은 상단 바(Ctrl/⌘+K)에 있다 */
    showSearch?: boolean;
    /** kept for backward-compat with existing call sites; redesign is light-only */
    isDarkMode?: boolean;
    toggleTheme?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

/**
 * 관리자 공통 틀 (Claude Design 「MILKYWAY 관리자 · mymilkyway 기준 화면」).
 * PC: 사이드바 240px + 흰 상단 바(위치 · 검색 · 알림 · 사이트 보기) + 본문 최대 1200px(제목 28px · 설명 · 오른쪽 버튼).
 * 768px 이하: 상단 바에 화면 제목, 아래에 탭 4개(예약 · 숙소배정 · 상품 · 더보기). 「더보기」가 전체 메뉴 서랍을 연다.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({
    activePage, title, description, eyebrow, actions, children,
}) => {
    const group = eyebrow || navGroupLabel(activePage);
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
    const onTab = MOBILE_TABS.some((t) => t.id === activePage);

    return (
        <div className={`app${drawerOpen ? ' drawer-open' : ''}`}>
            <button type="button" className="side-scrim" aria-label="메뉴 닫기" tabIndex={drawerOpen ? 0 : -1} onClick={() => setDrawerOpen(false)} />
            <AdminSidebar activePage={activePage} pending={pending} onClose={() => setDrawerOpen(false)} />

            <div className="main">
                <header className="topbar">
                    <div className="topbar-crumbs" aria-label="현재 위치">
                        {group && <><span>{group}</span><ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" /></>}
                        <b>{title}</b>
                    </div>
                    {/* 768px 이하: 화면 제목이 상단 바에 온다 */}
                    <div className="topbar-title">
                        <b>{title}</b>
                        {description && <span>{description}</span>}
                    </div>
                    <div className="topbar-tools">
                        <button type="button" className="topbar-search" onClick={openSearch}>
                            <Search size={18} strokeWidth={1.5} aria-hidden="true" />
                            <span>예약번호·고객명 검색</span>
                            <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
                        </button>
                        <button type="button" className="side-icon-btn topbar-search-ico" aria-label="검색" onClick={openSearch}>
                            <Search size={20} strokeWidth={1.5} />
                        </button>
                        <AdminAlerts pending={pending} />
                        <a className="topbar-site" href="/" target="_blank" rel="noopener noreferrer">
                            사이트 보기 <ExternalLink size={16} strokeWidth={1.5} aria-hidden="true" />
                        </a>
                    </div>
                </header>

                <main className="content">
                    <div className="content-in">
                        <div className="header">
                            <div className="header-in">
                                <div className="header-titles">
                                    <h1 className="page-title">{title}</h1>
                                    {description && <p className="page-desc">{description}</p>}
                                </div>
                                {actions && <div className="header-tools">{actions}</div>}
                            </div>
                        </div>
                        {children}
                    </div>
                </main>
            </div>

            <nav className="tabbar" aria-label="하단 메뉴">
                {MOBILE_TABS.map((tab) => {
                    const active = tab.id === activePage;
                    const count = navCount(tab.id, pending);
                    const Glyph = tab.icon;
                    return (
                        <a key={tab.id} href={tab.href} className={`tabbar-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                            <span className="tabbar-pill"><Glyph size={22} strokeWidth={1.5} aria-hidden="true" /></span>
                            <span>{tab.label}</span>
                            <CountBadge count={count} label={`처리 대기 ${count}건`} className="tabbar-count" />
                        </a>
                    );
                })}
                <button type="button" className={`tabbar-item${onTab ? '' : ' active'}`} aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
                    <span className="tabbar-pill"><Ellipsis size={22} strokeWidth={1.5} aria-hidden="true" /></span>
                    <span>더보기</span>
                </button>
            </nav>

            {searchOpen && <AdminSearch onClose={() => setSearchOpen(false)} />}
        </div>
    );
};
