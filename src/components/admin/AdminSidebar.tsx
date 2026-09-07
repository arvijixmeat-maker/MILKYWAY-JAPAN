import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { Icon } from './console/Icon';
import { ADMIN_NAV_GROUPS, type AdminNavItem } from './adminNavigation';

interface AdminSidebarProps {
    activePage: string;
    onNavigate?: () => void;
    /** kept for backward-compat with existing call sites; the redesign is light-only */
    isDarkMode?: boolean;
    toggleTheme?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activePage, onNavigate }) => {
    const navigate = useNavigate();
    const { logout } = useUser();

    const handleLogout = async () => {
        try { await logout(); } catch { /* ignore */ }
        navigate('/admin/login');
    };

    const renderItem = (item: AdminNavItem) => {
        const isActive = activePage === item.id;
        return (
            <Link key={item.id} to={item.href} className={`nav-item${isActive ? ' active' : ''}`} aria-current={isActive ? 'page' : undefined} onClick={onNavigate} title={item.description}>
                <Icon name={item.icon} fill={isActive} />
                <span>{item.label}</span>
            </Link>
        );
    };

    return (
        <aside className="side">
            <div className="side-brand-row">
                <Link to="/admin" className="side-brand" aria-label="MILKYWAY 관리자 홈" onClick={onNavigate}>
                    <span className="brand-mark"><Icon name="flight_takeoff" /></span>
                    <div>
                        <div className="brand-name">MILKYWAY</div>
                        <div className="brand-sub">Admin Console</div>
                    </div>
                </Link>
                <button className="side-close" type="button" aria-label="메뉴 닫기" onClick={(event) => { event.preventDefault(); onNavigate?.(); }}>
                    <Icon name="close" />
                </button>
            </div>

            <nav className="side-nav">
                {ADMIN_NAV_GROUPS.map((group) => (
                    <div className="nav-group" key={group.label}>
                        <div className="nav-group-label">{group.label}</div>
                        {group.items.map(renderItem)}
                    </div>
                ))}
            </nav>

            <div className="side-foot">
                <a className="side-site-link" href="/" target="_blank" rel="noreferrer">
                    <Icon name="open_in_new" /><span>고객 사이트 보기</span>
                </a>
                <div className="side-account">
                    <span className="av">관</span>
                    <div className="who">
                        <b>관리자</b>
                        <span>운영 계정 · 마스터</span>
                    </div>
                    <button className="out" title="로그아웃" onClick={handleLogout}>
                        <Icon name="logout" />
                    </button>
                </div>
            </div>
        </aside>
    );
};
