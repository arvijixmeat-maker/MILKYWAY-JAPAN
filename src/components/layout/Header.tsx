import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { api } from '../../lib/api';
import logoSquare from '../../assets/logo_square.webp';

interface TourSubItem {
    path: string;
    icon: string;
    label: string;
}

// Fallback sub-items if categories haven't loaded yet or are empty.
const FALLBACK_TOUR_SUB_ITEMS: TourSubItem[] = [
    { path: '/products', icon: 'grid_view', label: '全ツアー一覧' },
];

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useNotification();
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTourExpanded, setIsTourExpanded] = useState(false);
    const [tourSubItems, setTourSubItems] = useState<TourSubItem[]>(FALLBACK_TOUR_SUB_ITEMS);

    // Load active product categories dynamically so new admin-created categories
    // appear in the hamburger menu without a code change.
    useEffect(() => {
        api.categories.list('product').then((data: any) => {
            if (!Array.isArray(data)) return;
            const items: TourSubItem[] = [
                { path: '/products', icon: 'grid_view', label: '全ツアー一覧' },
                ...data
                    .filter((c: any) => c.is_active && c.id !== 'all')
                    .map((c: any) => ({
                        path: `/category/${c.id}`,
                        icon: c.icon && !c.icon.startsWith('http') && !c.icon.startsWith('/') && !c.icon.startsWith('data:') ? c.icon : 'category',
                        label: c.name,
                    })),
            ];
            setTourSubItems(items);
        }).catch(() => {});
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(prev => !prev);
        setIsTourExpanded(false);
    };

    const navItems = [
        { path: '/custom-estimate', label: t('nav.custom_estimate') },
        { path: '/travel-mates', label: t('nav.travel_mates') },
        { path: '/travel-guide', label: t('nav.travel_guide') },
        { path: '/reviews', label: t('nav.reviews') },
    ];

    const handleNavigate = (path: string) => {
        navigate(path);
        setIsMenuOpen(false);
        setIsTourExpanded(false);
    };

    const isTourActive = location.pathname === '/products' || location.pathname.startsWith('/category/');

    return (
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm font-sans">
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                    <img
                        src={logoSquare}
                        alt="Mongolia Milkyway"
                        width={100}
                        height={36}
                        className="h-9 w-auto object-contain cursor-pointer"
                        onClick={() => navigate('/')}
                        loading="eager"
                        decoding="async"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMenu}
                        className={`p-2 transition-all duration-300 ${isMenuOpen ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <span className="material-symbols-outlined text-[30px] font-light">menu</span>
                    </button>
                </div>
            </div>

            {/* Side Drawer */}
            <div
                className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMenuOpen(false)}
            />
            <aside
                className={`fixed top-0 right-0 h-full w-[80vw] max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <img src={logoSquare} alt="Mongolia Milkyway" width={90} height={32} className="h-8 w-auto object-contain" loading="lazy" decoding="async" />
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        aria-label="close menu"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Menu body */}
                <nav className="flex-1 overflow-y-auto py-2">
                    {/* ツアー商品 */}
                    <button
                        onClick={() => setIsTourExpanded(prev => !prev)}
                        className={`w-full text-left px-6 py-4 text-[16px] font-bold flex items-center justify-between transition-colors ${
                            isTourActive
                                ? 'text-primary'
                                : 'text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        {t('nav.products')}
                        <span className={`material-symbols-outlined text-xl text-slate-400 transition-transform duration-200 ${isTourExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </button>

                    {/* 서브메뉴 */}
                    <div className={`overflow-hidden transition-all duration-300 ${isTourExpanded ? 'max-h-64' : 'max-h-0'}`}>
                        <div className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800">
                            {tourSubItems.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    className={`w-full text-left pl-10 pr-6 py-3 text-[14px] font-semibold flex items-center gap-3 transition-colors ${
                                        location.pathname === item.path
                                            ? 'text-primary bg-primary/5'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                                    {item.label}
                                    {location.pathname === item.path && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 나머지 메뉴 */}
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => handleNavigate(item.path)}
                            className={`w-full text-left px-6 py-4 text-[16px] font-bold flex items-center justify-between transition-colors ${
                                location.pathname === item.path
                                    ? 'text-primary bg-primary/5'
                                    : 'text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            {item.label}
                            {location.pathname === item.path && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Footer */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 text-[11px] text-slate-400">
                    {unreadCount > 0 && (
                        <p className="mb-2 text-primary font-semibold">お知らせ {unreadCount}件</p>
                    )}
                    <p>Milkyway Japan · mongolryokou.com</p>
                </div>
            </aside>
        </header>
    );
};
