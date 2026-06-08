import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { Icon } from './console/Icon';

interface AdminSidebarProps {
    activePage: string;
    /** kept for backward-compat with existing call sites; the redesign is light-only */
    isDarkMode?: boolean;
    toggleTheme?: () => void;
}

interface NavItem {
    id: string;
    icon: string;
    label: string;
    href: string;
    count?: number;
}

const primaryItems: NavItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: '대시보드', href: '/admin' },
    { id: 'reservations', icon: 'assignment', label: '통합 예약 관리', href: '/admin/reservations' },
    { id: 'calendar', icon: 'calendar_today', label: '투어 캘린더', href: '/admin/calendar' },
    { id: 'products', icon: 'inventory_2', label: '상품 관리', href: '/admin/products' },
    { id: 'magazines', icon: 'menu_book', label: '매거진 관리', href: '/admin/magazines' },
    { id: 'templates', icon: 'folder_special', label: '템플릿 관리', href: '/admin/templates' },
    { id: 'reviews', icon: 'reviews', label: '후기 관리', href: '/admin/reviews' },
    { id: 'faq', icon: 'help', label: 'FAQ 관리', href: '/admin/faq' },
];

const settingItems: NavItem[] = [
    { id: 'banners', icon: 'ad_units', label: '홈 화면 관리', href: '/admin/banners' },
    { id: 'categories', icon: 'category', label: '카테고리 관리', href: '/admin/categories' },
    { id: 'hotels', icon: 'hotel', label: '호텔 마스터', href: '/admin/hotels' },
    { id: 'tourist-spots', icon: 'location_on', label: '관광지 마스터', href: '/admin/tourist-spots' },
    { id: 'guide-intro', icon: 'translate', label: '가이드 소개 (공통)', href: '/admin/guide-intro' },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activePage }) => {
    const navigate = useNavigate();
    let logout: undefined | (() => void | Promise<void>);
    try { logout = useUser().logout; } catch { logout = undefined; }

    const handleLogout = async () => {
        try { await logout?.(); } catch { /* ignore */ }
        navigate('/admin/login');
    };

    const renderItem = (item: NavItem) => {
        const isActive = activePage === item.id;
        return (
            <a key={item.id} href={item.href} className={`nav-item${isActive ? ' active' : ''}`} aria-current={isActive ? 'page' : undefined}>
                <Icon name={item.icon} fill={isActive} />
                <span>{item.label}</span>
                {item.count ? <span className="nav-count">{item.count}</span> : null}
            </a>
        );
    };

    return (
        <aside className="side">
            <a href="/admin" className="side-brand" aria-label="MILKYWAY 관리자 홈">
                <span className="brand-mark"><Icon name="flight_takeoff" /></span>
                <div>
                    <div className="brand-name">MILKYWAY</div>
                    <div className="brand-sub">Admin Console</div>
                </div>
            </a>

            <nav className="side-nav">
                {primaryItems.map(renderItem)}
                <div className="nav-group-label">사이트 설정</div>
                {settingItems.map(renderItem)}
            </nav>

            <div className="side-foot">
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
