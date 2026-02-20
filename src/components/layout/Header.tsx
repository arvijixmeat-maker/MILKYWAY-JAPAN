import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';

import { useNavigate } from 'react-router-dom';
import logoSquare from '../../assets/logo_square.png';
import notificationBell from '../../assets/notification_bell.png';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const { unreadCount } = useNotification();
    const { t } = useTranslation();

    return (
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                    <img src={logoSquare} alt="Mongolia Milkyway" className="h-14 w-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigate('/mypage/notifications')}
                        className="w-10 h-10 rounded-full flex items-center justify-center relative hover:scale-105 transition-transform"
                    >
                        <img src={notificationBell} alt={t('header.notification')} className="w-7 h-7 object-contain" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white border-2 border-white dark:border-slate-800 font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                </div>
            </div>

        </header>
    );
};
