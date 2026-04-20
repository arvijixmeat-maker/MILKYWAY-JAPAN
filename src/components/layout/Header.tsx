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

            {/* Dropdown Menu Overlay */}
            {isMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute top-16 right-4 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in slide-in-from-top-4 duration-200">
                        <div className="py-2">

                            {/* ツアー商品 — 서브메뉴 토글 */}
                            <button
                                onClick={() => setIsTourExpanded(prev => !prev)}
                                className={`w-full text-left px-5 py-4 text-[15px] font-bold flex items-center justify-between transition-colors ${
                                    isTourActive
                                        ? 'bg-primary/5 text-primary'
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {t('nav.products')}
                                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isTourExpanded ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>

                            {/* 서브메뉴 */}
                            {isTourExpanded && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                                    {TOUR_SUB_ITEMS.map(item => (
                                        <button
                                            key={item.path}
                                            onClick={() => handleNavigate(item.path)}
                                            className={`w-full text-left pl-8 pr-5 py-3 text-[13px] font-semibold flex items-center gap-2.5 transition-colors ${
                                                location.pathname === item.path
                                                    ? 'text-primary'
                                                    : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                                            {t(item.labelKey)}
                                            {location.pathname === item.path && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* 나머지 메뉴 */}
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    className={`w-full text-left px-5 py-4 text-[15px] font-bold flex items-center justify-between transition-colors ${
                                        location.pathname === item.path
                                        ? 'bg-primary/5 text-primary'
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {item.label}
                                    {location.pathname === item.path && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </header>
    );
};
