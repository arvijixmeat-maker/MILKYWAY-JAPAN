import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { BottomNav } from '../components/layout/BottomNav';
import { useUser } from '../contexts/UserContext';
import { useTranslation } from 'react-i18next';
import notificationBell from '../assets/notification_bell.png';
import wishlistHeart from '../assets/wishlist_heart.png';
import companionIcon from '../assets/companion_search.png';

import businessEstimateIcon from '../assets/business_estimate.png';
import wishlistIcon from '../assets/wishlist_icon.png';
import myReviewsIcon from '../assets/my_reviews.png';
import faqIcon from '../assets/faq_icon.png';
import contactIcon from '../assets/contact_icon.png';
import recentlyViewedIcon from '../assets/recently_viewed.png';

interface NotificationItem {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    reservationId: string;
    productName: string;
    read: boolean;
    targetPath?: string;
}

interface Reservation {
    id: string;
    status: string;
    productName: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    duration?: string;
    history?: any[];
}

export const MyPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, setUser, logout } = useUser();
    const { t } = useTranslation();

    // Reservations state
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Check user is handled by useUser hook, but here we fetch data
                if (!user) return;

                const resData = await api.reservations.list();
                // api.reservations.list() now returns only user's reservations if not admin

                if (resData) {
                    setReservations(resData.map((r: any) => ({
                        id: r.id,
                        status: r.status,
                        productName: r.productName,
                        startDate: r.date, // Note: Schema uses 'date' (single string) or we need to check if schema has start/end. 
                        // 'reservations' schema has 'date'. Adusting to match.
                        endDate: r.date,   // Placeholder if range not available
                        createdAt: r.createdAt,
                        history: r.history
                    })));
                }

                // Quotes Mock
                setQuotes([]);
            } catch (error) {
                console.error('Failed to fetch my page data', error);
            }
        };
        if (user) {
            fetchData();
        }
    }, [user]);

    const [upcomingReservation, setUpcomingReservation] = useState<Reservation | null>(null);
    const [daysUntilTrip, setDaysUntilTrip] = useState<number | null>(null);

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (reservations) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Logic for Upcoming Reservation
            const upcoming = reservations
                .filter((r) => {
                    const startDate = new Date(r.startDate);
                    return r.status !== 'cancelled' && startDate >= today;
                })
                .sort((a, b) =>
                    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                );

            if (upcoming.length > 0) {
                const nextTrip = upcoming[0];
                setUpcomingReservation(nextTrip);

                const startDate = new Date(nextTrip.startDate);
                const diffTime = startDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setDaysUntilTrip(diffDays);
            } else {
                setUpcomingReservation(null);
                setDaysUntilTrip(null);
            }

            // 2. Logic for Notifications
            const allNotifications: NotificationItem[] = [];

            // Quotes Notifications
            quotes.forEach(q => {
                if (q.status === 'answered') {
                    allNotifications.push({
                        id: `quote-${q.id}`,
                        type: 'quote_answered',
                        description: '견적서가 도착했습니다. 확인해보세요!',
                        timestamp: q.updated_at || q.created_at,
                        reservationId: q.id,
                        productName: `${q.destination} 견적`,
                        read: false,
                        targetPath: `/estimate/${q.id}`
                    });
                }
            });

            // Reservations Notifications
            reservations.forEach((res) => {
                if (res.history && Array.isArray(res.history)) {
                    res.history.forEach((hist, idx) => {
                        allNotifications.push({
                            id: `${res.id}-${idx}`,
                            reservationId: res.id,
                            productName: res.productName,
                            type: hist.type,
                            description: hist.description,
                            timestamp: hist.timestamp,
                            read: false,
                            targetPath: '/mypage/reservations'
                        });
                    });
                }
            });

            // Sort by timestamp descending (newest first)
            allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setNotifications(allNotifications);
        }
    }, [reservations, quotes]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            weekday: 'short'
        }).replace(/\. /g, '.').replace(' ', '(').replace(/\.$/, ')');
    };

    const formatTimeAgo = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return '방금 전';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
        return `${Math.floor(diffInSeconds / 86400)}일 전`;
    };

    return (
        <div className="bg-[#f9fafb] dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
            <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-[#f9fafb] dark:bg-background-dark shadow-xl overflow-x-hidden pb-[100px]">
                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-6 py-4 justify-between transition-colors">
                    <h1 className="text-2xl font-bold text-text-main dark:text-white">{t('mypage.title')}</h1>
                    <div className="flex gap-4 items-center">
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="hover:scale-105 transition-transform relative"
                            >
                                <img src={notificationBell} alt={t('mypage.notifications')} className="w-7 h-7 object-contain" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute top-full right-[-50px] mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-700/30">
                                        <h3 className="font-bold text-sm text-text-main dark:text-white">{t('mypage.notifications')}</h3>
                                        <span className="text-xs text-primary font-medium cursor-pointer">{t('mypage.mark_all_read')}</span>
                                    </div>
                                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                                        {notifications.length > 0 ? (
                                            notifications.map((note) => (
                                                <div
                                                    key={note.id}
                                                    onClick={() => {
                                                        if (note.targetPath) navigate(note.targetPath);
                                                        else navigate('/mypage/reservations');
                                                        setShowNotifications(false);
                                                    }}
                                                    className="p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex gap-3 items-start">
                                                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${note.read ? 'bg-gray-300' : 'bg-red-500'}`}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-primary font-bold mb-0.5 truncate">{note.productName}</p>
                                                            <p className="text-sm text-text-main dark:text-gray-200 leading-snug break-keep">{note.description}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1.5">{formatTimeAgo(note.timestamp)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                                                <span className="material-symbols-outlined text-4xl opacity-20">notifications_off</span>
                                                {t('mypage.no_notifications')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 bg-gray-50/50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-gray-700 text-center">
                                        <button
                                            onClick={() => navigate('/mypage/notifications')}
                                            className="text-xs font-bold text-text-sub hover:text-text-main transition-colors py-1"
                                        >
                                            {t('mypage.view_all')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="px-6 mb-6 mt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-[64px] h-[64px] rounded-full bg-gray-200 overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm relative group cursor-pointer">
                                {user?.image ? (
                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-500">
                                        <span className="material-symbols-outlined text-3xl">person</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-bold text-text-main dark:text-white leading-tight">
                                    {user ? `${user.name} 님` : t('mypage.guest')}
                                </h2>
                                <p className="text-sm text-text-sub dark:text-gray-400">
                                    {user?.email || t('mypage.login_required')}
                                </p>
                            </div>
                        </div>
                        {user ? (
                            <button
                                onClick={logout}
                                className="bg-white dark:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-sub dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/20 border border-gray-100 dark:border-transparent transition-colors shadow-sm"
                            >
                                {t('mypage.logout')}
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-primary px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                {t('mypage.login')}
                            </button>
                        )}
                    </div>
                </div>

                {/* My Reservation */}
                <div className="px-5 mb-6">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-3 ml-1">{t('mypage.my_reservations')}</h3>
                    <div
                        onClick={() => navigate('/mypage/reservations')}
                        className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <span className="material-symbols-outlined text-8xl text-primary">flight_takeoff</span>
                        </div>
                        <div className="relative z-10">
                            {upcomingReservation && daysUntilTrip !== null ? (
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                                            {t('mypage.preparing_trip', { days: daysUntilTrip })}
                                        </span>
                                        <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-text-main dark:text-white mb-1 leading-snug">
                                        {upcomingReservation.productName}
                                    </h4>
                                    <p className="text-sm text-text-sub dark:text-gray-400 font-medium mb-6">
                                        {formatDate(upcomingReservation.startDate)} - {formatDate(upcomingReservation.endDate)} • {upcomingReservation.duration}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div className="bg-primary h-full rounded-full" style={{ width: daysUntilTrip <= 7 ? '80%' : daysUntilTrip <= 14 ? '60%' : '40%' }}></div>
                                        </div>
                                        <span className="text-xs font-bold text-primary">
                                            {daysUntilTrip <= 7 ? '80%' : daysUntilTrip <= 14 ? '60%' : '40%'}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        {user && quotes.length > 0 ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                                                {t('mypage.quote_requests', { count: quotes.length })}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold">
                                                {t('mypage.no_reservations')}
                                            </span>
                                        )}
                                        <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-text-main dark:text-white mb-1 leading-snug">
                                        {t('mypage.no_upcoming_trips')}
                                    </h4>
                                    <p className="text-sm text-text-sub dark:text-gray-400 font-medium mb-6">
                                        {user && quotes.length > 0 ? t('mypage.check_quote_status') : t('mypage.book_trip_msg')}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* My Activities */}
                <div className="px-5 mb-6">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-3 ml-1">{t('mypage.my_activities')}</h3>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-3xl overflow-hidden shadow-sm">
                        <button onClick={() => navigate('/mypage/travel-mates')} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#eef6ef] dark:bg-blue-900/10 flex items-center justify-center p-2">
                                    <img src={companionIcon} alt={t('mypage.travel_mate_posts')} className="w-full h-full object-contain" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-text-main dark:text-white font-medium text-[15px]">{t('mypage.travel_mate_posts')}</span>
                                    <span className="text-[11px] text-text-sub mt-0.5">{t('mypage.check_posts')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-300 text-[20px]">chevron_right</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Interest List */}
                <div className="px-5 mb-6">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-3 ml-1">{t('mypage.wishlist')}</h3>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-3xl overflow-hidden shadow-sm">
                        <button onClick={() => navigate('/mypage/wishlist')} className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#eef6ef] dark:bg-gray-800 flex items-center justify-center p-2">
                                    <img src={wishlistIcon} alt={t('mypage.wishlist_items')} className="w-full h-full object-contain" />
                                </div>
                                <span className="text-text-main dark:text-white font-medium text-[15px]">{t('mypage.wishlist_items')}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[20px]">chevron_right</span>
                        </button>
                        <button onClick={() => navigate('/mypage/recently-viewed')} className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#eef6ef] dark:bg-orange-900/30 flex items-center justify-center p-2">
                                    <img src={recentlyViewedIcon} alt={t('mypage.recently_viewed')} className="w-full h-full object-contain" />
                                </div>
                                <span className="text-text-main dark:text-white font-medium text-[15px]">{t('mypage.recently_viewed')}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[20px]">chevron_right</span>
                        </button>
                        <button onClick={() => navigate('/mypage/reviews')} className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#eef6ef] dark:bg-yellow-900/30 flex items-center justify-center p-2">
                                    <img src={myReviewsIcon} alt={t('mypage.my_reviews')} className="w-full h-full object-contain" />
                                </div>
                                <span className="text-text-main dark:text-white font-medium text-[15px]">{t('mypage.my_reviews')}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[20px]">chevron_right</span>
                        </button>
                    </div>
                </div>

                {/* Customer Support */}
                <div className="px-5 mb-8">
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-3 ml-1">{t('mypage.customer_support')}</h3>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-3xl overflow-hidden shadow-sm">
                        <button onClick={() => navigate('/faq')} className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#eef6ef] dark:bg-teal-900/30 flex items-center justify-center p-2">
                                    <img src={faqIcon} alt={t('mypage.faq')} className="w-full h-full object-contain" />
                                </div>
                                <span className="text-text-main dark:text-white font-medium text-[15px]">{t('mypage.faq')}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[20px]">chevron_right</span>
                        </button>
                        <a href="https://pf.kakao.com/_BSLaxl" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#eef6ef] dark:bg-yellow-900/30 flex items-center justify-center p-2">
                                    <img src={contactIcon} alt={t('mypage.contact_us')} className="w-full h-full object-contain" />
                                </div>
                                <span className="text-text-main dark:text-white font-medium text-[15px]">{t('mypage.contact_us')}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[20px]">chevron_right</span>
                        </a>
                    </div>
                </div>

                <BottomNav />
            </div>
        </div>
    );
};
