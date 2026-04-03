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
        { path: '/products', label: t('nav.products') },
        { path: '/custom-estimate', label: t('nav.custom_estimate') },
        { path: '/travel-mates', label: t('nav.travel_mates') },
        { path: '/travel-guide', label: t('nav.travel_guide') },
        { path: '/reviews', label: t('nav.reviews') },
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
                    <div className="absolute top-16 right-4 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in slide-in-from-top-4 duration-200">
                        <div className="py-2">
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
