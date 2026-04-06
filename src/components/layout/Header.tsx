import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import logoSquare from '../../assets/logo_square.png';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useNotification();
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const navItems = [
        { path: '/products', label: t('nav.products'), icon: 'flight' },
        { path: '/custom-estimate', label: t('nav.custom_estimate'), icon: 'calculate' },
        { path: '/travel-mates', label: t('nav.travel_mates'), icon: 'group' },
        { path: '/travel-guide', label: t('nav.travel_guide'), icon: 'menu_book' },
        { path: '/reviews', label: t('nav.reviews'), icon: 'rate_review' },
    ];

    const handleNavigate = (path: string) => {
        navigate(path);
        setIsMenuOpen(false);
    };

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
                    <div className="absolute top-16 right-4 w-[220px] bg-white dark:bg-slate-800 rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-black/50 border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in slide-in-from-top-4 duration-200">
                        <div className="py-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    className={`w-full text-left px-5 py-3.5 text-[15px] font-bold flex items-center gap-3 transition-colors ${
                                        location.pathname.startsWith(item.path) 
                                        ? 'text-[#0f766e] dark:text-[#18c9a6] bg-[#f0fdf4] dark:bg-slate-700/50' 
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-[#f0fdf4] hover:text-[#0f766e] dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px] leading-none shrink-0">{item.icon}</span>
                                    <span className="flex-1">{item.label}</span>
                                    {location.pathname.startsWith(item.path) && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e] dark:bg-[#18c9a6] shrink-0" />
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
