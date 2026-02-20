import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import phoneIcon from '../assets/phone_icon_custom.png';
import kakaoIcon from '../assets/kakao_icon_custom.png';
import { useTranslation } from 'react-i18next';

interface Reservation {
    id: string;
    status: string;
    productName: string;
    startDate: string;
    endDate: string;
    duration?: string;
    totalPeople: number;
    priceBreakdown: any;
    bankAccount: any;
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

    // Global bank settings fallback
    const [globalBankSettings, setGlobalBankSettings] = useState<any>(null);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('*').eq('key', 'bank_account').single();
            if (data?.value) {
                setGlobalBankSettings(data.value);
            }
        };
        fetchSettings();
    }, []);

    const getDisplayBankAccount = (reservation: Reservation) => {
        // Priority: 1. Reservation-specific (if valid) 2. Global settings
        if (reservation.bankAccount?.bankName) return reservation.bankAccount;
        if (globalBankSettings) return globalBankSettings;
        return null; // Both missing
    };


    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'quotes') {
            setActiveTab('quotes');
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setIsLoading(true);

            // Fetch Reservations
            const resPromise = supabase
                .from('reservations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Fetch Quotes
            const quotePromise = supabase
                .from('quotes')
                .select('*')
                .eq('user_id', user.id)
                .in('type', ['personal', 'custom', 'business'])
                .order('created_at', { ascending: false });

            const [resResult, quoteResult] = await Promise.all([resPromise, quotePromise]);

            if (resResult.data) {
                const mappedRes = resResult.data.map((r: any) => ({
                    id: r.id,
                    status: r.status,
                    productName: r.product_name,
                    startDate: r.start_date,
                    endDate: r.end_date,
                    duration: r.duration,
                    totalPeople: r.total_people,
                    priceBreakdown: r.price_breakdown,
                    bankAccount: r.bank_account,
                    createdAt: r.created_at,
                    contractUrl: r.contract_url,
                    itineraryUrl: r.itinerary_url,
                    history: r.history || [],
                    assignedGuide: r.assigned_guide,
                    dailyAccommodations: r.daily_accommodations,
                    areAssignmentsVisibleToUser: r.are_assignments_visible_to_user
                }));
                setReservations(mappedRes);
            }

            if (quoteResult.data) {
                const mappedQuotes = quoteResult.data.map((e: any) => ({
                    id: e.id,
                    status: e.status === 'new' ? 'waiting' : e.status,
                    title: e.title || `${t('my_reservations.labels.custom_quote')} (${e.destination || t('my_reservations.labels.mongolia')})`,
                    date: e.travel_dates || e.period,
                    type: t('my_reservations.labels.custom_quote'),
                    people: e.travelers || e.headcount,
                    requestDate: new Date(e.created_at).toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : 'ko-KR'),
                    destination: e.destination
                }));
                setQuotes(mappedQuotes);
            }

            setIsLoading(false);
        };

        fetchData();

        // Realtime Subscription
        const channel = supabase
            .channel('my-reservations-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reservations'
                },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
                                    const displayBankAccount = getDisplayBankAccount(reservation);

                                    return (
                                        <div
                                            key={reservation.id}
                                            className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                                        >
                                            {/* Header */}
                                            <div className="p-5 border-b border-gray-50 dark:border-zinc-700/50">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold bg-gray-50 dark:bg-zinc-700/50 px-2 py-1 rounded-lg">
                                                        No. {reservation.id.slice(0, 8).toUpperCase()}
                                                    </span>
                                                    {getStatusBadge(reservation.status)}
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                                    {reservation.productName}
                                                </h3>
                                            </div>

                                            {/* Details */}
                                            <div className="p-5 space-y-5">
                                                <div className="flex items-start gap-4 group">
                                                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
                                                        <span className="material-symbols-outlined">calendar_month</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">{t('my_reservations.labels.itinerary')}</p>
                                                        <p className="text-[15px] font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                                            {formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}
                                                        </p>
                                                        {reservation.duration && <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mt-1">{reservation.duration}</p>}
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-4 group">
                                                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
                                                        <span className="material-symbols-outlined">group</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">{t('my_reservations.labels.people')}</p>
                                                        <p className="text-[15px] font-bold text-slate-800 dark:text-slate-200">
                                                            {reservation.totalPeople > 0 ? t('my_reservations.labels.people_count', { count: reservation.totalPeople }) : t('my_reservations.labels.people_undefined')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-4 group">
                                                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
                                                        <span className="material-symbols-outlined">payments</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">{t('my_reservations.labels.payment_info')}</p>
                                                        <div className="flex flex-col gap-1">
                                                            <p className="text-[17px] font-extrabold text-slate-900 dark:text-white">
                                                                {reservation.priceBreakdown ? formatPrice(reservation.priceBreakdown.total) : '0'}{t('wishlist.won_suffix', { defaultValue: '원' })}
                                                            </p>
                                                            <div className="flex gap-3 text-xs mt-1">
                                                                <span className="text-slate-500 dark:text-slate-400">{t('my_reservations.labels.deposit')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{reservation.priceBreakdown ? formatPrice(reservation.priceBreakdown.deposit) : '0'}{t('wishlist.won_suffix', { defaultValue: '원' })}</span></span>
                                                                <span className="w-px h-3 bg-gray-200 dark:bg-zinc-600 my-auto"></span>
                                                                <span className="text-slate-500 dark:text-slate-400">{t('my_reservations.labels.local_payment')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{reservation.priceBreakdown ? formatPrice(reservation.priceBreakdown.local) : '0'}{t('wishlist.won_suffix', { defaultValue: '원' })}</span></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>


                                                {/* Bank Account */}
                                                {(reservation.status === 'pending_payment' || reservation.status === 'waiting_deposit') && (
                                                    <div className="mt-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="material-symbols-outlined text-teal-600 text-lg">account_balance_wallet</span>
                                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('my_reservations.labels.bank_info')}</p>
                                                        </div>
                                                        <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-gray-100 dark:border-zinc-700 mb-3 text-center">
                                                            <p className="text-[10px] text-gray-500 mb-1">{t('my_reservations.labels.deposit_amount')}</p>
                                                            <p className="text-lg font-extrabold text-teal-600">{reservation.priceBreakdown ? formatPrice(reservation.priceBreakdown.deposit) : '0'}{t('wishlist.won_suffix', { defaultValue: '원' })}</p>
                                                        </div>
                                                        <div className="space-y-1.5 text-xs">
                                                            <div className="flex justify-between"><span className="text-gray-500">{t('my_reservations.labels.bank')}</span><span className="font-bold text-gray-800 dark:text-gray-200">{displayBankAccount?.bankName || '-'}</span></div>
                                                            <div className="flex justify-between"><span className="text-gray-500">{t('my_reservations.labels.account_number')}</span><span className="font-bold text-gray-800 dark:text-gray-200 font-mono tracking-wide">{displayBankAccount?.accountNumber || '-'}</span></div>
                                                            <div className="flex justify-between"><span className="text-gray-500">{t('my_reservations.labels.account_holder')}</span><span className="font-bold text-gray-800 dark:text-gray-200">{displayBankAccount?.accountHolder || '-'}</span></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Documents */}
                                                {(reservation.status === 'confirmed' || reservation.status === 'completed' || reservation.status === 'paid') && (reservation.contractUrl || reservation.itineraryUrl) && (
                                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                                        {reservation.contractUrl && (
                                                            <a href={reservation.contractUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl hover:bg-teal-100 transition-colors">
                                                                <span className="material-symbols-outlined text-teal-600 text-lg">history_edu</span>
                                                                <span className="text-xs font-bold text-teal-700 dark:text-teal-300">{t('my_reservations.labels.view_contract')}</span>
                                                            </a>
                                                        )}
                                                        {reservation.itineraryUrl && (
                                                            <a href={reservation.itineraryUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl hover:bg-teal-100 transition-colors">
                                                                <span className="material-symbols-outlined text-teal-600 text-lg">map</span>
                                                                <span className="text-xs font-bold text-teal-700 dark:text-teal-300">{t('my_reservations.labels.view_itinerary')}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {/* History */}
                                                {reservation.history && reservation.history.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-700/50">
                                                        <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">{t('my_reservations.labels.timeline')}</p>
                                                        <div className="space-y-3">
                                                            {reservation.history.slice(0, 2).reverse().map((h: any, i: number) => (
                                                                <div key={i} className="flex gap-3 text-xs">
                                                                    <span className={`material-symbols-outlined text-sm ${getHistoryIcon(h.type).color}`}>{getHistoryIcon(h.type).icon}</span>
                                                                    <div>
                                                                        <p className="text-gray-700 dark:text-gray-300 font-medium">{h.description}</p>
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">{getRelativeTime(h.timestamp)}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Assignments */}
                                                {reservation.areAssignmentsVisibleToUser && reservation.assignedGuide && (
                                                    <div className="mt-4 p-4 bg-teal-50/50 dark:bg-zinc-800/50 rounded-xl border border-teal-100/50 dark:border-zinc-700/50">
                                                        <div className="flex items-start gap-3">
                                                            <img
                                                                src={reservation.assignedGuide.image || 'https://placehold.co/100x100?text=Guide'}
                                                                className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-sm"
                                                                alt="Guide"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <span className="inline-block text-[11px] font-bold text-black dark:text-white mb-1">{t('my_reservations.labels.guide')}</span>
                                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{reservation.assignedGuide.name}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Extended Guide Info */}
                                                                <div className="mt-3 space-y-1 text-xs">
                                                                    {reservation.assignedGuide.introduction && (
                                                                        <p className="line-clamp-2 leading-relaxed text-black dark:text-white pb-1">{reservation.assignedGuide.introduction}</p>
                                                                    )}
                                                                    <div className="flex gap-4 flex-wrap mt-3">
                                                                        {reservation.assignedGuide.phone && (
                                                                            <a href={`tel:${reservation.assignedGuide.phone}`} className="flex items-center gap-2 text-black dark:text-white font-medium">
                                                                                <img src={phoneIcon} className="w-5 h-5 object-contain" alt="Phone" />
                                                                                <span>{reservation.assignedGuide.phone}</span>
                                                                            </a>
                                                                        )}
                                                                        {reservation.assignedGuide.kakaoId && (
                                                                            <div className="flex items-center gap-2 text-black dark:text-white font-medium">
                                                                                <img src={kakaoIcon} className="w-5 h-5 object-contain" alt="Kakao" />
                                                                                <span>Kakao: {reservation.assignedGuide.kakaoId}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {reservation.assignedGuide.languages && reservation.assignedGuide.languages.length > 0 && (
                                                                        <div className="flex gap-1 mt-3">
                                                                            {reservation.assignedGuide.languages.map((lang: string, idx: number) => (
                                                                                <span key={idx} className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-700 rounded text-[10px] text-gray-500">{lang}</span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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
