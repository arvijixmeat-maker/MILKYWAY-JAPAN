import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { useNotification, Notification } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabaseClient';

export const MyNotifications: React.FC = () => {
    const navigate = useNavigate();
    const { notifications, loading, markAllAsRead, markAsRead } = useNotification();

    // Mark all as read when entering the page (optional, or per item click)
    // For now, let's just mark all as read when the user clicks specific button or items.
    // Or we can auto-mark all when visiting this page? 
    // Let's implement manual "Mark all as read" button for better UX control.

    const handleNotificationClick = async (note: Notification) => {
        if (!note.is_read) {
            await markAsRead(note.id);
        }
        if (note.link) {
            navigate(note.link);
        }
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

    // Helper to get icon and color based on type
    const getIconInfo = (type: string) => {
        switch (type) {
            case 'reservation':
                return { icon: 'confirmation_number', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' };
            case 'comment':
                return { icon: 'chat_bubble', color: 'text-primary', bg: 'bg-primary/10' };
            case 'event':
                return { icon: 'campaign', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' };
            case 'system':
            default:
                return { icon: 'info', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
            <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-background-light dark:bg-background-dark shadow-xl overflow-x-hidden pb-[100px]">
                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-6 py-4 justify-between transition-colors border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-text-main dark:text-white">arrow_back</span>
                        </button>
                        <h1 className="text-xl font-bold text-text-main dark:text-white">알림</h1>
                    </div>
                    {notifications.some(n => !n.is_read) && (
                        <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-primary font-bold hover:bg-primary/10 px-2 py-1 rounded transition-colors"
                        >
                            모두 읽음
                        </button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((note) => {
                            const { icon, color, bg } = getIconInfo(note.type);
                            return (
                                <div
                                    key={note.id}
                                    onClick={() => handleNotificationClick(note)}
                                    className={`p-6 transition-colors cursor-pointer relative ${note.is_read ? 'bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20'}`}
                                >
                                    <div className="flex gap-4 items-start">
                                        <div className={`mt-1 w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${bg}`}>
                                            <span className={`material-symbols-outlined ${color} text-[20px]`}>{icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-sm font-bold text-text-main dark:text-white truncate pr-2">{note.title}</p>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap pt-0.5">{formatTimeAgo(note.created_at)}</span>
                                            </div>
                                            <p className="text-[13px] font-medium text-gray-600 dark:text-gray-300 leading-snug break-keep mb-0">{note.message}</p>
                                        </div>
                                        {!note.is_read && (
                                            <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-red-500"></div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <span className="material-symbols-outlined text-5xl opacity-20 mb-4">notifications_off</span>
                            <p className="text-sm">새로운 알림이 없습니다.</p>
                        </div>
                    )}
                </div>

                <BottomNav />
            </div>
        </div>
    );
};
