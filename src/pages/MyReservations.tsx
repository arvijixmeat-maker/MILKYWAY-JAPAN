import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

import { useUser } from '../contexts/UserContext';
import phoneIcon from '../assets/phone_icon_custom.png';
import kakaoIcon from '../assets/kakao_icon_custom.png';
import { useTranslation } from 'react-i18next';

interface Reservation {
    id: string;
    reservationNumber?: string;
    status: string;
    productName: string;
    startDate: string;
    endDate: string;
    duration?: string;
    totalPeople: number;
    priceBreakdown: any;
    createdAt: string;
    contractUrl?: string;
    itineraryUrl?: string;
    history?: any[];
    assignedGuide?: any;
    dailyAccommodations?: any[];
    areAssignmentsVisibleToUser?: boolean;
}

interface Quote {
    id: string;
    status: string;
    title: string;
    date: string;
    type: string;
    people: string;
    requestDate: string;
    destination?: string;
}

export const MyReservations: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useUser();
    const { t, i18n } = useTranslation();

    // Tabs: 'reservations' | 'quotes'
    const [activeTab, setActiveTab] = useState<'reservations' | 'quotes'>('reservations');

    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'quotes') {
            setActiveTab('quotes');
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const me = await api.auth.me();
                if (!me) return;

                setIsLoading(true);

                // Fetch Reservations
                // Note: api.reservations.list() returns all? Need filtering by user_id?
                // The current API implementation just mocks fetch('/api/reservations').
                // If the backend handles filtering by session user, great.
                // If not, we might get everyone's reservations which is bad.
                // Assuming backend filters by auth user for 'list' or we need to filter client side if it returns all.
                // But typically /api/reservations for a user should return their own.
                // Let's assume the API behaves like the Cloudflare query: filtering by user.
                const resData = await api.reservations.list();
                const quoteData = await api.quotes.list();

                // Backend already filters reservations by userId OR customerEmail (see
                // functions/api/reservations.ts). So trust the API response directly —
                // a client-side user_id filter would reject guest-made reservations
                // that were linked by email.
                const myReservations = Array.isArray(resData) ? resData : [];
                // Quotes API also filters server-side. Just narrow to personal/custom types.
                const myQuotes = Array.isArray(quoteData)
                    ? quoteData.filter((q: any) => ['personal', 'custom', 'business'].includes(q.type))
                    : [];

                if (myReservations) {
                    const mappedRes = myReservations.map((r: any) => ({
                        id: r.id,
                        reservationNumber: r.reservationNumber || r.reservation_number,
                        status: r.status,
                        productName: r.product_name || r.productName,
                        startDate: r.start_date || r.startDate || r.date,
                        endDate: r.end_date || r.endDate,
                        duration: r.duration,
                        totalPeople: r.total_people || r.travelers || r.totalPeople,
                        priceBreakdown: r.price_breakdown || { total: r.totalPrice || r.total_price, deposit: r.depositAmount || r.deposit_amount, local: r.balanceAmount || r.balance_amount },
                        createdAt: r.created_at || r.createdAt,
                        contractUrl: r.contract_url || r.contractUrl,
                        itineraryUrl: r.itinerary_url || r.itineraryUrl,
                        history: r.history || [],
                        assignedGuide: (() => {
                            const g = r.assigned_guide || r.assignedGuide;
                            if (!g) return undefined;
                            const parseArr = (v: any) => {
                                if (Array.isArray(v)) return v;
                                if (typeof v === 'string') {
                                    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
                                }
                                return [];
                            };
                            return {
                                ...g,
                                languages: parseArr(g.languages),
                                specialties: parseArr(g.specialties),
                            };
                        })(),
                        dailyAccommodations: r.daily_accommodations || r.dailyAccommodations,
                        areAssignmentsVisibleToUser: r.are_assignments_visible_to_user || r.areAssignmentsVisibleToUser
                    }));
                    // Sor by created_at desc
                    setReservations(mappedRes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                }

                if (myQuotes) {
                    const mappedQuotes = myQuotes.map((e: any) => ({
                        id: e.id,
                        status: e.status === 'new' ? 'waiting' : e.status,
                        title: e.title || `${t('my_reservations.labels.custom_quote')} (${e.destination || t('my_reservations.labels.mongolia')})`,
                        date: e.travel_dates || e.period || e.travelDates,
                        type: t('my_reservations.labels.custom_quote'),
                        people: e.travelers || e.headcount,
                        requestDate: new Date(e.created_at || e.createdAt).toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : 'ko-KR'),
                        destination: e.destination,
                        createdAt: e.created_at || e.createdAt
                    }));
                    setQuotes(mappedQuotes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                }
            } catch (error) {
                console.error('Error fetching my reservations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [t, i18n.language]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekday = date.toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : 'ko-KR', { weekday: 'short' });

        if (i18n.language === 'ja') {
            return `${year}/${month}/${day} (${weekday})`;
        }
        return `${year}. ${month}. ${day}. (${weekday})`;
    };

    const formatPrice = (price: number) => price?.toLocaleString() || '0';

    const getStatusText = (status: string) => {
        return t(`my_reservations.status.${status}`, { defaultValue: status });
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { color: string }> = {
            pending_payment: { color: 'bg-amber-50 text-amber-700 border-amber-200' },
            paid: { color: 'bg-blue-50 text-blue-700 border-blue-200' },
            confirmed: { color: 'bg-teal-50 text-teal-700 border-teal-200' },
            completed: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            cancelled: { color: 'bg-red-50 text-red-700 border-red-200' },
            answered: { color: 'bg-green-50 text-green-700 border-green-200' },
            waiting: { color: 'bg-gray-50 text-gray-700 border-gray-200' },
            reservation_requested: { color: 'bg-purple-50 text-purple-700 border-purple-200' },
            converted: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
        };

        const badge = badges[status];
        const text = getStatusText(status);

        if (!badge) {
            return (
                <span className="px-2 py-1 rounded-lg text-xs font-bold border bg-gray-50 text-gray-700 border-gray-200">
                    {text}
                </span>
            );
        }

        return (
            <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${badge.color}`}>
                {text}
            </span>
        );
    };

    const getRelativeTime = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('my_reservations.time.just_now');
        if (diffMins < 60) return t('my_reservations.time.mins_ago', { count: diffMins });
        if (diffHours < 24) return t('my_reservations.time.hours_ago', { count: diffHours });
        if (diffDays < 7) return t('my_reservations.time.days_ago', { count: diffDays });
        return date.toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : 'ko-KR');
    };

    const getHistoryIcon = (type: string) => {
        const icons = {
            created: { icon: 'add_circle', color: 'text-gray-500' },
            status_change: { icon: 'sync', color: 'text-blue-500' },
            document_added: { icon: 'description', color: 'text-teal-500' }
        };
        return icons[type as keyof typeof icons] || icons.created;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="max-w-[430px] mx-auto bg-white dark:bg-zinc-900 min-h-screen flex flex-col relative overflow-x-hidden shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center px-4 py-4 justify-between">
                        <button
                            onClick={() => navigate('/mypage')}
                            className="text-[#0e1a18] dark:text-white flex size-10 shrink-0 items-center justify-start cursor-pointer hover:opacity-70 transition-opacity"
                        >
                            <span className="material-symbols-outlined">arrow_back_ios</span>
                        </button>
                        <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">{t('my_reservations.title')}</h2>
                        <div className="size-10"></div>
                    </div>

                    {/* Tabs */}
                    <div className="flex w-full px-4">
                        <button
                            onClick={() => setActiveTab('reservations')}
                            className={`flex-1 pb-3 text-sm font-bold transition-all relative ${activeTab === 'reservations'
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
                                }`}
                        >
                            {t('my_reservations.tab_reservations')}
                            {activeTab === 'reservations' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 dark:bg-teal-400 rounded-t-full"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('quotes')}
                            className={`flex-1 pb-3 text-sm font-bold transition-all relative ${activeTab === 'quotes'
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
                                }`}
                        >
                            {t('my_reservations.tab_quotes')}
                            {activeTab === 'quotes' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 dark:bg-teal-400 rounded-t-full"></div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-zinc-900/50">
                    {/* RESERVATIONS TAB */}
                    {activeTab === 'reservations' && (
                        <>
                            {reservations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-20 h-20 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center mb-4 shadow-sm">
                                        <span className="material-symbols-outlined text-4xl text-gray-300">receipt_long</span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-center mb-1 font-bold">{t('my_reservations.empty_reservations')}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-6">{t('my_reservations.empty_reservations_sub')}</p>

                                    <button
                                        onClick={() => navigate('/products')}
                                        className="px-6 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200/50 hover:bg-teal-700 transition-all text-sm"
                                    >
                                        {t('my_reservations.browse_products')}
                                    </button>
                                </div>
                            ) : (
                                reservations.map((reservation) => {
                                    const statusInfo = {
                                        pending_payment: { label: 'お支払い待ち', color: 'bg-amber-100 text-amber-700' },
                                        waiting_deposit: { label: '入金待ち', color: 'bg-amber-100 text-amber-700' },
                                        paid: { label: 'お支払い完了', color: 'bg-blue-100 text-blue-700' },
                                        confirmed: { label: 'ご予約確定', color: 'bg-teal-100 text-teal-700' },
                                        completed: { label: '旅行終了', color: 'bg-slate-100 text-slate-600' },
                                        cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
                                    }[reservation.status] || { label: reservation.status, color: 'bg-slate-100 text-slate-600' };
                                    const pb = reservation.priceBreakdown;
                                    const daysUntil = reservation.startDate ? Math.ceil((new Date(reservation.startDate).getTime() - Date.now()) / 86400000) : null;
                                    const depositPaid = reservation.status === "paid" || reservation.status === "confirmed" || reservation.status === "completed";
                                    const balancePaid = reservation.status === "completed";
                                    const paidAmount = (depositPaid && pb ? pb.deposit : 0) + (balancePaid && pb ? pb.local : 0);
                                    const paidPercent = pb && pb.total > 0 ? Math.round((paidAmount / pb.total) * 100) : 0;
                                    const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }) : "";
                                    return (
                                        <button
                                            key={reservation.id}
                                            onClick={() => navigate(`/mypage/reservations/${reservation.id}`)}
                                            className="w-full text-left bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                                                {daysUntil != null && daysUntil >= 0 && daysUntil <= 60 && (
                                                    <span className="text-[11px] font-bold text-teal-600">ご旅行まであと{daysUntil}日</span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight mb-2">{reservation.productName}</h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                                <span className="inline-flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-sm">event</span>
                                                    {fmt(reservation.startDate)} 〜 {fmt(reservation.endDate)}
                                                </span>
                                                <span className="opacity-40">·</span>
                                                <span className="inline-flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-sm">group</span>
                                                    {reservation.totalPeople}名
                                                </span>
                                            </div>
                                            {pb && (
                                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-700">
                                                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                                                        <span>お支払い {paidPercent}%</span>
                                                        <span className="font-mono">¥{pb.total.toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: paidPercent + "%" }} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-teal-600">
                                                詳細を見る <span className="material-symbols-outlined text-sm">chevron_right</span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </>
                    )}

                    {/* QUOTES TAB */}
                    {activeTab === 'quotes' && (
                        <>
                            {quotes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-20 h-20 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center mb-4 shadow-sm">
                                        <span className="material-symbols-outlined text-4xl text-gray-300">request_quote</span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-center mb-1 font-bold">{t('my_reservations.empty_quotes')}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-6">{t('my_reservations.empty_quotes_sub')}</p>
                                    <button
                                        onClick={() => navigate('/custom-estimate')}
                                        className="px-6 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200/50 hover:bg-teal-700 transition-all text-sm"
                                    >
                                        {t('my_reservations.request_quote')}
                                    </button>
                                </div>
                            ) : (
                                quotes.map((quote) => (
                                    <div
                                        key={quote.id}
                                        onClick={() => navigate(`/estimate/${quote.id}`)}
                                        className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer border border-gray-100 dark:border-zinc-700/50 hover:border-teal-500/30 group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-base font-bold text-text-main dark:text-white leading-snug line-clamp-2 pr-8 group-hover:text-teal-600 transition-colors">
                                                {quote.title}
                                            </h3>
                                            <span className="material-symbols-outlined text-gray-300 text-lg">chevron_right</span>
                                        </div>
                                        <div className="flex flex-col gap-1.5 mb-4">
                                            <div className="flex items-center gap-2 text-text-sub text-xs">
                                                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                <span>{quote.date}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-text-sub text-xs">
                                                <span className="material-symbols-outlined text-[14px]">diversity_3</span>
                                                <span>{quote.type} · {quote.people}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-zinc-700">
                                            <span className={`text-xs font-bold flex items-center gap-1.5 ${quote.status === 'converted' ? 'text-indigo-500' :
                                                quote.status === 'answered' ? 'text-teal-600' :
                                                    quote.status === 'reservation_requested' ? 'text-purple-500' :
                                                        'text-gray-500'
                                                }`}>
                                                {quote.status === 'converted' ? (
                                                    <>
                                                        <span className="material-symbols-outlined text-[16px]">verified</span>
                                                        {t('my_reservations.status.converted')}
                                                    </>
                                                ) : quote.status === 'answered' ? (
                                                    <>
                                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                        {t('my_reservations.labels.answered_status')}
                                                    </>
                                                ) : quote.status === 'reservation_requested' ? (
                                                    <>
                                                        <span className="material-symbols-outlined text-[16px]">event_upcoming</span>
                                                        {t('my_reservations.status.reservation_requested')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                        {getStatusText(quote.status)}
                                                    </>
                                                )}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{quote.requestDate}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
