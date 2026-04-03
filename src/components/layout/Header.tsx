import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import logoSquare from '../../assets/logo_square.png';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useNotification();
    const { t } = useTranslation();

    return (
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <img 
                        src={logoSquare} 
                        alt="Mongolia Milkyway" 
                        className="h-10 w-auto object-contain cursor-pointer" 
                        onClick={() => navigate('/')} 
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/mypage/notifications')}
                        className="p-2 text-slate-400 dark:text-slate-500 relative"
                    >
                        <span className="material-symbols-outlined text-2xl">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white border-2 border-white dark:border-slate-900 font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Navigation Row */}
            <div className="overflow-x-auto scrollbar-hide border-t border-slate-50 dark:border-slate-800/50">
                <nav className="flex items-center px-4 py-2 gap-6 min-w-max">
                    <button
                        onClick={() => navigate('/products')}
                        className={`text-[13px] font-bold py-1 whitespace-nowrap transition-colors ${location.pathname === '/products' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t('nav.products')}
                    </button>
                    <button
                        onClick={() => navigate('/custom-estimate')}
                        className={`text-[13px] font-bold py-1 whitespace-nowrap transition-colors ${location.pathname === '/custom-estimate' || location.pathname === '/estimate-complete' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t('nav.custom_estimate')}
                    </button>
                    <button
                        onClick={() => navigate('/travel-mates')}
                        className={`text-[13px] font-bold py-1 whitespace-nowrap transition-colors ${location.pathname === '/travel-mates' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t('nav.travel_mates')}
                    </button>
                    <button
                        onClick={() => navigate('/travel-guide')}
                        className={`text-[13px] font-bold py-1 whitespace-nowrap transition-colors ${location.pathname === '/travel-guide' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t('nav.travel_guide')}
                    </button>
                    <button
                        onClick={() => navigate('/reviews')}
                        className={`text-[13px] font-bold py-1 whitespace-nowrap transition-colors ${location.pathname === '/reviews' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {t('nav.reviews')}
                    </button>
                </nav>
            </div>
        </header>
    );
};
