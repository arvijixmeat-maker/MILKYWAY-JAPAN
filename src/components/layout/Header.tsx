import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import logoSquare from '../../assets/logo_square.png';

const TOUR_SUB_ITEMS = [
    { path: '/products', icon: 'grid_view', labelKey: 'nav.all_tours' },
    { path: '/horse-riding-tour', icon: 'hiking', labelKey: 'nav.horse_riding' },
    { path: '/gobi-desert', icon: 'landscape', labelKey: 'nav.gobi_desert' },
] as const;

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useNotification();
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTourExpanded, setIsTourExpanded] = useState(false);

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

    const isTourActive = ['/products', '/horse-riding-tour', '/gobi-desert'].includes(location.pathname);

    return (
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm font-sans">
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                    <img
                        src={logoSquare}
                        alt="Mongolia Milkyway"
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
                    <img src={logoSquare} alt="Mongolia Milkyway" className="h-8 w-auto object-contain" loading="lazy" decoding="async" />
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
                            {TOUR_SUB_ITEMS.map(item => (
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
                                    {t(item.labelKey)}
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
