import React from 'react';

interface AdminSidebarProps {
    activePage: string;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activePage, isDarkMode: _isDarkMode, toggleTheme }) => {
    const menuItems = [
        { id: 'dashboard', icon: 'dashboard', label: '대시보드', href: '/admin' },
        { id: 'reservations', icon: 'assignment', label: '통합 예약 관리', href: '/admin/reservations' },
        { id: 'calendar', icon: 'calendar_today', label: '투어 캘린더', href: '/admin/calendar' },
        { id: 'products', icon: 'inventory_2', label: '상품 관리', href: '/admin/products' },
        { id: 'magazines', icon: 'menu_book', label: '매거진 관리', href: '/admin/magazines' },
        { id: 'guides', icon: 'badge', label: '가이드 관리', href: '/admin/guides' },
        { id: 'accommodations', icon: 'hotel', label: '숙소 관리', href: '/admin/accommodations' },
        { id: 'reviews', icon: 'reviews', label: '후기 관리', href: '/admin/reviews' },
        { id: 'faq', icon: 'help', label: 'FAQ 관리', href: '/admin/faq' },
        { id: 'notifications', icon: 'notifications', label: '알림 관리', href: '#' },
    ];

    const settingsItems = [
        { id: 'settings', icon: 'settings', label: '서비스 설정', href: '/admin/settings' },
        { id: 'banners', icon: 'ad_units', label: '홈 화면 관리', href: '/admin/banners' },
        { id: 'categories', icon: 'category', label: '카테고리 관리', href: '/admin/categories' },
    ];

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-colors">
            <div className="flex flex-col h-full">
                <div className="p-6">
                    <div className="flex items-center gap-2 text-teal-500 font-bold text-2xl">
                        <span className="material-symbols-outlined text-3xl">flight_takeoff</span>
                        <span>MILKYWAY</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {/* Main Menu */}
                    {menuItems.map((item) => {
                        const isActive = activePage === item.id;
                        return (
                            <a
                                key={item.id}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive
                                    ? 'bg-teal-500/10 text-teal-500 border-r-4 border-teal-500 font-medium'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span className={`material-symbols-outlined ${isActive ? '' : 'group-hover:text-teal-500 transition-colors'}`}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </a>
                        );
                    })}

                    {/* Settings Section */}
                    <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">설정</div>
                    {settingsItems.map((item) => {
                        const isActive = activePage === item.id;
                        return (
                            <a
                                key={item.id}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive
                                    ? 'bg-teal-500/10 text-teal-500 border-r-4 border-teal-500 font-medium'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <span className={`material-symbols-outlined ${isActive ? '' : 'group-hover:text-teal-500 transition-colors'}`}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </a>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        onClick={toggleTheme}
                    >
                        <span className="material-symbols-outlined dark:hidden">dark_mode</span>
                        <span className="material-symbols-outlined hidden dark:block">light_mode</span>
                        <span>테마 변경</span>
                    </button>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 9999px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #334155;
                }
            `}</style>
        </aside>
    );
};
