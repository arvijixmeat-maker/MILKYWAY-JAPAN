import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { StrokeIcon } from './console/StrokeIcon';
import { ADMIN_NAV, navCount, type AdminPending } from './adminNav';
import { AdminAlerts } from './AdminAlerts';

interface AdminSidebarProps {
    activePage: string;
    pending?: AdminPending | null;
    /** 검색창(Ctrl/⌘+K) 열기 */
    onOpenSearch?: () => void;
    /** 모바일 서랍으로 열렸을 때 닫기 */
    onClose?: () => void;
    /** kept for backward-compat with existing call sites; the redesign is light-only */
    isDarkMode?: boolean;
    toggleTheme?: () => void;
}

const CLOSED_KEY = 'mw-admin-nav-closed';
const readClosed = (): Record<string, boolean> => {
    try { return JSON.parse(localStorage.getItem(CLOSED_KEY) || '{}') || {}; } catch { return {}; }
};
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activePage, pending = null, onOpenSearch, onClose }) => {
    const navigate = useNavigate();
    let logout: undefined | (() => void | Promise<void>);
    try { logout = useUser().logout; } catch { logout = undefined; }

    // 접어 둔 분류는 브라우저에 기억한다. 지금 보고 있는 메뉴가 든 분류는 항상 펼친다.
    const [closed, setClosed] = useState<Record<string, boolean>>(() => {
        const saved = readClosed();
        const current = ADMIN_NAV.find((g) => g.items.some((i) => i.id === activePage));
        if (current) delete saved[current.key];
        return saved;
    });
    const toggleGroup = (key: string) => setClosed((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        try { localStorage.setItem(CLOSED_KEY, JSON.stringify(next)); } catch { /* 기억 못 해도 무방 */ }
        return next;
    });

    const handleLogout = async () => {
        try { await logout?.(); } catch { /* ignore */ }
        navigate('/admin/login');
    };

    return (
        <aside className="side" aria-label="관리자 메뉴">
            <div className="side-head">
                <a href="/admin" className="side-brand" aria-label="MILKYWAY 관리자 홈">
                    <span className="brand-mark">M</span>
                    <span className="brand-text">
                        <span className="brand-name">MILKYWAY</span>
                        <span className="brand-sub">Admin Console</span>
                    </span>
                </a>
                <AdminAlerts pending={pending} className="side-alerts" />
                {onClose && (
                    <button type="button" className="side-icon-btn side-close" aria-label="메뉴 닫기" onClick={onClose}>
                        <StrokeIcon name="uiCross" />
                    </button>
                )}
            </div>

            <div className="side-search-wrap">
                <button type="button" className="side-search" onClick={onOpenSearch}>
                    <StrokeIcon name="uiSearch" size={18} />
                    <span className="side-search-label">예약번호, 고객명, 메뉴 검색</span>
                    <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
                </button>
            </div>

            <nav className="side-nav">
                {ADMIN_NAV.map((group) => {
                    const open = !closed[group.key];
                    return (
                        <div key={group.key} className="nav-group">
                            <button
                                type="button" className="nav-group-label" aria-expanded={open}
                                onClick={() => toggleGroup(group.key)}
                            >
                                <span>{group.label}</span>
                                <span className={`nav-group-arrow${open ? '' : ' shut'}`}><StrokeIcon name="uiChevDown" size={14} /></span>
                            </button>
                            {open && (
                                <div className="nav-group-items">
                                    {group.items.map((item) => {
                                        const isActive = activePage === item.id;
                                        const count = navCount(item.id, pending);
                                        return (
                                            <a
                                                key={item.id} href={item.href}
                                                className={`nav-item${isActive ? ' active' : ''}`}
                                                aria-current={isActive ? 'page' : undefined}
                                            >
                                                <StrokeIcon name={item.icon} />
                                                <span className="nav-label">
                                                    {item.label}
                                                    {item.sub && <span className="nav-sub">{item.sub}</span>}
                                                </span>
                                                {count > 0 && <span className="nav-count" aria-label={`처리 대기 ${count}건`}>{count}</span>}
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="side-foot">
                <span className="av">관</span>
                <span className="who">
                    <b>관리자</b>
                    <span>운영 계정 · 마스터</span>
                </span>
                <button type="button" className="side-icon-btn" aria-label="로그아웃" title="로그아웃" onClick={handleLogout}>
                    <StrokeIcon name="uiSignOut" size={18} />
                </button>
            </div>
        </aside>
    );
};
