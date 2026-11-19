import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { ADMIN_NAV, navCount, type AdminPending } from './adminNav';
import { CountBadge } from './ui';

interface AdminSidebarProps {
    activePage: string;
    pending?: AdminPending | null;
    /** 휴대폰 「더보기」 서랍으로 열렸을 때 닫기 */
    onClose?: () => void;
    /** kept for backward-compat with existing call sites; the redesign is light-only */
    isDarkMode?: boolean;
    toggleTheme?: () => void;
}

/** 사이드바 240px — 분류 3개(운영 · 콘텐츠 · 사이트 설정). 768px 이하에서는 「더보기」 서랍이 된다. */
export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activePage, pending = null, onClose }) => {
    const navigate = useNavigate();
    let user: { name?: string; email?: string } | null | undefined;
    let logout: undefined | (() => void | Promise<void>);
    try {
        const ctx = useUser() as any;
        logout = ctx.logout;
        user = ctx.user;
    } catch { logout = undefined; }

    const handleLogout = async () => {
        try { await logout?.(); } catch { /* ignore */ }
        navigate('/admin/login');
    };
    const who = (user?.name || '').trim() || '관리자';

    return (
        <aside className="side" aria-label="관리자 메뉴">
            <div className="side-head">
                <a href="/admin" className="side-brand" aria-label="MILKYWAY 관리자 홈">
                    <span className="brand-mark">M</span>
                    <span className="brand-text">
                        <span className="brand-name">MILKYWAY</span>
                        <span className="brand-sub">관리자 콘솔</span>
                    </span>
                </a>
                {onClose && (
                    <button type="button" className="side-icon-btn side-close" aria-label="메뉴 닫기" onClick={onClose}>
                        <X size={20} strokeWidth={1.5} />
                    </button>
                )}
            </div>

            <nav className="side-nav">
                {ADMIN_NAV.map((group) => (
                    <div key={group.key} className="nav-group">
                        <div className="nav-group-label">{group.label}</div>
                        {group.items.map((item) => {
                            const isActive = activePage === item.id;
                            const count = navCount(item.id, pending);
                            const Glyph = item.icon;
                            return (
                                <a
                                    key={item.id} href={item.href}
                                    className={`nav-item${isActive ? ' active' : ''}`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Glyph size={18} strokeWidth={1.5} aria-hidden="true" />
                                    <span className="nav-label">{item.label}</span>
                                    <CountBadge count={count} label={`처리 대기 ${count}건`} className="nav-count" />
                                </a>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="side-foot">
                <span className="av">{who.slice(0, 1)}</span>
                <span className="who">
                    <b>{who}</b>
                    <span>운영 관리자</span>
                </span>
                <button type="button" className="side-icon-btn" aria-label="로그아웃" title="로그아웃" onClick={handleLogout}>
                    <LogOut size={18} strokeWidth={1.5} />
                </button>
            </div>
        </aside>
    );
};
