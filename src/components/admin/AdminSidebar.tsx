import React from 'react';

interface AdminSidebarProps {
    activePage: string;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const primaryItems = [
    { id: 'dashboard', icon: 'dashboard', label: '대시보드', href: '/admin' },
    { id: 'reservations', icon: 'assignment', label: '통합 예약 관리', href: '/admin/reservations' },
    { id: 'calendar', icon: 'calendar_today', label: '투어 캘린더', href: '/admin/calendar' },
    { id: 'products', icon: 'inventory_2', label: '상품 관리', href: '/admin/products' },
    { id: 'magazines', icon: 'menu_book', label: '매거진 관리', href: '/admin/magazines' },
    { id: 'templates', icon: 'folder_special', label: '템플릿 관리', href: '/admin/templates' },
    { id: 'reviews', icon: 'reviews', label: '후기 관리', href: '/admin/reviews' },
    { id: 'faq', icon: 'help', label: 'FAQ 관리', href: '/admin/faq' },
];

const settingItems = [
    { id: 'banners', icon: 'ad_units', label: '홈 화면 관리', href: '/admin/banners' },
    { id: 'categories', icon: 'category', label: '카테고리 관리', href: '/admin/categories' },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activePage, isDarkMode, toggleTheme }) => {
    const renderItem = (item: { id: string; icon: string; label: string; href: string }) => {
        const isActive = activePage === item.id;

        return (
            <a
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all group ${isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm dark:bg-teal-500/15 dark:text-teal-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className={`material-symbols-outlined text-[22px] ${isActive ? 'text-teal-600 dark:text-teal-300' : 'text-slate-400 group-hover:text-teal-600'}`}>
                    {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
            </a>
        );
    };

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className="flex h-full flex-col">
                <div className="px-6 py-5">
                    <a href="/admin" className="flex items-center gap-3" aria-label="MILKYWAY 관리자 홈">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm">
                            <span className="material-symbols-outlined text-2xl">flight_takeoff</span>
                        </span>
                        <div>
                            <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">MILKYWAY</div>
                            <div className="text-xs font-medium text-slate-400">Admin Console</div>
                        </div>
                    </a>
                </div>

                <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-4 pb-4">
                    {primaryItems.map(renderItem)}

                    <div className="px-4 pb-2 pt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        사이트 설정
                    </div>
                    {settingItems.map(renderItem)}
                </nav>

                <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        onClick={toggleTheme}
                    >
                        <span className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[22px]">
                                {isDarkMode ? 'light_mode' : 'dark_mode'}
                            </span>
                            {isDarkMode ? '라이트 모드' : '다크 모드'}
                        </span>
                        <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${isDarkMode ? 'bg-teal-500' : 'bg-slate-300'}`}>
                            <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-4' : ''}`} />
                        </span>
                    </button>
                </div>
            </div>
        </aside>
    );
};
