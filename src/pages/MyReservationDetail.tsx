import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { BottomNav } from '../components/layout/BottomNav';
import { GuideDetailModal, AccommodationDetailModal } from '../components/common/DetailModals';

interface Guide {
    id?: string;
    name?: string;
    image?: string;
    introduction?: string;
    bio?: string;
    phone?: string;
    kakaoId?: string;
    languages?: any;
    specialties?: any;
}

interface Accommodation {
    id?: string;
    name?: string;
    type?: string;
    location?: string;
    images?: any;
    description?: string;
    facilities?: any;
}

interface HistoryEntry {
    timestamp: string;
    type: string;
    description: string;
    detail?: string;
}

interface Reservation {
    id: string;
    reservationNumber?: string | null;
    productName: string;
    status: string;
    startDate?: string;
    endDate?: string;
    totalPeople?: number;
    travelers?: number;
    priceBreakdown?: { total: number; deposit: number; local: number };
    price_breakdown?: { total: number; deposit: number; local: number };
    contractUrl?: string;
    itineraryUrl?: string;
    itineraryTemplateId?: string;
    history?: HistoryEntry[];
    assignedGuide?: Guide;
    dailyAccommodations?: Array<{ day: number; accommodation: Accommodation }>;
    areAssignmentsVisibleToUser?: boolean;
    depositStatus?: string;
    balanceStatus?: string;
    createdAt?: string;
}

const parseArr = (v: any): any[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

const parseImage = (v: any): string => {
    const arr = parseArr(v);
    if (arr.length > 0) return arr[0];
    if (typeof v === 'string' && v.startsWith('http')) return v;
    return '';
};

const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    } catch { return iso; }
};

const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending_payment: { label: 'お支払い待ち', color: 'bg-amber-100 text-amber-700' },
    waiting_deposit: { label: '入金待ち', color: 'bg-amber-100 text-amber-700' },
    paid: { label: 'お支払い完了', color: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'ご予約確定', color: 'bg-teal-100 text-teal-700' },
    completed: { label: '旅行終了', color: 'bg-slate-100 text-slate-600' },
    cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
};

const HISTORY_ICON: Record<string, { icon: string; color: string }> = {
    status_change: { icon: 'sync', color: 'text-teal-600' },
    modification: { icon: 'edit_note', color: 'text-indigo-600' },
    document_added: { icon: 'description', color: 'text-emerald-600' },
    email: { icon: 'mail', color: 'text-sky-600' },
    admin_memo: { icon: 'sticky_note_2', color: 'text-amber-600' },
    created: { icon: 'add_circle', color: 'text-slate-600' },
};

const SectionHeader: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
    <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
        <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

export const MyReservationDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [accModal, setAccModal] = useState<{ accommodation: any; day: number } | null>(null);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const data = await api.reservations.get(id);
                setReservation(data);
            } catch (e: any) {
                setError(e.message || '読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500" />
            </div>
        );
    }

    if (error || !reservation) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 gap-4">
                <p className="text-lg font-bold text-slate-800">予約が見つかりません</p>
                <p className="text-sm text-slate-500">{error || 'URLをご確認ください。'}</p>
                <button onClick={() => navigate('/mypage/reservations')} className="px-4 py-2 bg-teal-500 text-white font-semibold rounded-xl text-sm">
                    一覧に戻る
                </button>
            </div>
        );
    }

    const status = STATUS_MAP[reservation.status] || { label: reservation.status, color: 'bg-slate-100 text-slate-600' };
    const totalPeople = reservation.totalPeople ?? reservation.travelers ?? 0;
    const priceBreakdown = reservation.priceBreakdown || reservation.price_breakdown;
    const depositPaid = reservation.depositStatus === 'paid' || reservation.status === 'paid' || reservation.status === 'confirmed' || reservation.status === 'completed';
    const balancePaid = reservation.balanceStatus === 'paid' || reservation.status === 'completed';
    const paidAmount = (depositPaid && priceBreakdown ? priceBreakdown.deposit : 0) + (balancePaid && priceBreakdown ? priceBreakdown.local : 0);
    const paidPercent = priceBreakdown && priceBreakdown.total > 0 ? Math.round((paidAmount / priceBreakdown.total) * 100) : 0;

    // Show guide/accommodations as soon as they're assigned — no separate publish gate.
    // The areAssignmentsVisibleToUser flag is now only used for triggering email notifications,
    // not for hiding data on the customer's own page.
    const guide = reservation.assignedGuide;
    const guideLanguages = parseArr(guide?.languages);
    const guideSpecialties = parseArr(guide?.specialties);

    const accommodations = reservation.dailyAccommodations || [];

    const itineraryUrl = reservation.itineraryUrl || (reservation.itineraryTemplateId ? `/documents/itinerary/${reservation.reservationNumber || reservation.id}` : '');
    const contractUrl = reservation.contractUrl || '';

    const history = reservation.history || [];
    const visibleHistory = showAllHistory ? [...history].reverse() : [...history].reverse().slice(0, 3);

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-[100px]">
            <div className="max-w-[480px] mx-auto bg-white dark:bg-slate-900 shadow-xl min-h-screen">

                {/* Header */}
                <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
                    <button onClick={() => navigate('/mypage/reservations')} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">ご予約詳細</p>
                        <p className="font-mono text-xs text-slate-500">#{reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
                </header>

                <div className="px-5 py-5 space-y-5">

                    {/* Product hero */}
                    <section className="relative rounded-2xl overflow-hidden text-white shadow-lg shadow-teal-500/20"
                        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}>
                        <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/5" />
                        <div className="absolute top-8 right-10 w-20 h-20 rounded-full bg-white/5" />
                        <div className="relative p-5">
                            <h1 className="text-xl font-bold tracking-tight leading-snug">{reservation.productName}</h1>
                            <div className="flex items-center gap-3 mt-3 text-xs text-white/80 flex-wrap">
                                <span className="inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">event</span>
                                    {formatDate(reservation.startDate)} 〜 {formatDate(reservation.endDate)}
                                </span>
                                <span className="opacity-40">·</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">group</span>
                                    {totalPeople}名
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Payment card */}
                    {priceBreakdown && (
                        <section className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
                            <SectionHeader icon="payments" title="お支払い状況" />
                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative w-14 h-14 flex-shrink-0">
                                    <svg width="56" height="56" viewBox="0 0 56 56">
                                        <circle cx="28" cy="28" r="23" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                                        <circle cx="28" cy="28" r="23" fill="none" stroke="#0f766e" strokeWidth="5" strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 23}
                                            strokeDashoffset={2 * Math.PI * 23 * (1 - paidPercent / 100)}
                                            transform="rotate(-90 28 28)"
                                            style={{ transition: 'stroke-dashoffset 500ms' }} />
                                    </svg>
                                    <div className={`absolute inset-0 flex items-center justify-center text-xs font-extrabold ${paidPercent >= 100 ? 'text-teal-600' : 'text-slate-900'}`}>
                                        {paidPercent}%
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">お支払い済み</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">¥{paidAmount.toLocaleString()}</span>
                                        <span className="text-xs text-slate-400 font-medium">/ ¥{priceBreakdown.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className={`rounded-xl p-3 border ${depositPaid ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">予約金</p>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${depositPaid ? 'bg-teal-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                            {depositPaid ? '入金' : '未入金'}
                                        </span>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">¥{priceBreakdown.deposit.toLocaleString()}</p>
                                </div>
                                <div className={`rounded-xl p-3 border ${balancePaid ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">現地支払い</p>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${balancePaid ? 'bg-teal-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                            {balancePaid ? '入金' : '未入金'}
                                        </span>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">¥{priceBreakdown.local.toLocaleString()}</p>
                                </div>
                            </div>
                            {(reservation.status === 'pending_payment' || reservation.status === 'waiting_deposit') && priceBreakdown.deposit > 0 && (
                                <a
                                    href={`https://paypal.me/MilkywayMongolia/${priceBreakdown.deposit}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 w-full flex items-center justify-center gap-2 bg-[#003087] text-white font-bold px-4 py-3 rounded-xl text-sm active:scale-95 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-base">payments</span>
                                    PayPalで予約金を支払う
                                </a>
                            )}
                        </section>
                    )}

                    {/* Documents */}
                    <section>
                        <SectionHeader icon="folder_open" title="ご旅行書類" subtitle="契約書と日程表をご確認いただけます" />
                        <div className="grid grid-cols-1 gap-2">
                            {/* Itinerary */}
                            {itineraryUrl ? (
                                <a
                                    href={itineraryUrl.startsWith('http') ? itineraryUrl : itineraryUrl}
                                    target={itineraryUrl.startsWith('/') ? '_self' : '_blank'}
                                    rel="noopener noreferrer"
                                    className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-sky-600">map</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white">確定日程表</p>
                                        <p className="text-[11px] text-slate-500">行程と宿泊先をチェック</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                                </a>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-slate-400">map</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-500">確定日程表</p>
                                        <p className="text-[11px] text-slate-400">準備中（担当者が作成すると表示されます）</p>
                                    </div>
                                </div>
                            )}
                            {/* Contract */}
                            {contractUrl ? (
                                <a
                                    href={contractUrl}
                                    target={contractUrl.startsWith('/') ? '_self' : '_blank'}
                                    rel="noopener noreferrer"
                                    className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-emerald-600">description</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white">海外旅行契約書</p>
                                        <p className="text-[11px] text-slate-500">契約内容と注意事項を確認</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                                </a>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-slate-400">description</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-500">海外旅行契約書</p>
                                        <p className="text-[11px] text-slate-400">準備中（発行されるとメールでもお知らせします）</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Guide */}
                    <section>
                        <SectionHeader icon="badge" title="担当ガイド" />
                        {guide && guide.name ? (
                            <button
                                onClick={() => setGuideModalOpen(true)}
                                className="w-full text-left bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 hover:shadow-md active:scale-[0.99] transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    {guide.image ? (
                                        <img src={guide.image} alt={guide.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0" loading="lazy" decoding="async" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
                                            {guide.name[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">{guide.name}</p>
                                        {(guideLanguages.length > 0 || guideSpecialties.length > 0) && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {guideLanguages.map((l, i) => (
                                                    <span key={`l-${i}`} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">{l}</span>
                                                ))}
                                                {guideSpecialties.slice(0, 2).map((s, i) => (
                                                    <span key={`s-${i}`} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{s}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400 flex-shrink-0">chevron_right</span>
                                </div>
                                {(guide.introduction || guide.bio) && (
                                    <p className="text-xs text-slate-500 leading-relaxed mt-3 line-clamp-2">{guide.introduction || guide.bio}</p>
                                )}
                                <p className="text-[11px] text-teal-600 font-semibold mt-2 inline-flex items-center gap-0.5">
                                    詳細を見る
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </p>
                            </button>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
                                <span className="material-symbols-outlined text-3xl text-slate-300">person</span>
                                <p className="text-sm font-semibold text-slate-500 mt-1">担当ガイドを調整中です</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">決まり次第メールとアプリでお知らせします</p>
                            </div>
                        )}
                    </section>

                    {/* Accommodations */}
                    <section>
                        <SectionHeader icon="hotel" title="宿泊先" subtitle={accommodations.length > 0 ? `${accommodations.length}泊` : undefined} />
                        {accommodations.length > 0 ? (
                            <div className="space-y-2">
                                {accommodations.map((item) => {
                                    const acc = item.accommodation;
                                    const img = parseImage(acc?.images);
                                    return (
                                        <div
                                            key={item.day}
                                            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden"
                                        >
                                            <div className="flex gap-3 p-3 items-center">
                                                {img ? (
                                                    <img src={img} alt={acc?.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" loading="lazy" decoding="async" />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="material-symbols-outlined text-slate-300 text-3xl">hotel</span>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500 text-white">{item.day}日目</span>
                                                        {acc?.type && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{acc.type}</span>}
                                                    </div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{acc?.name || '—'}</p>
                                                    <button
                                                        onClick={() => acc && setAccModal({ accommodation: acc, day: item.day })}
                                                        className="inline-flex items-center gap-0.5 mt-1.5 text-[11px] font-semibold text-teal-600 hover:text-teal-700"
                                                    >
                                                        詳しく見る
                                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
                                <span className="material-symbols-outlined text-3xl text-slate-300">hotel</span>
                                <p className="text-sm font-semibold text-slate-500 mt-1">宿泊先を手配中です</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">日程確定後、1日ごとに確定します</p>
                            </div>
                        )}
                    </section>

                    {/* History */}
                    {history.length > 0 && (
                        <section>
                            <SectionHeader icon="history" title="タイムライン" />
                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3">
                                <ul className="space-y-2.5">
                                    {visibleHistory.map((h, i) => {
                                        const ic = HISTORY_ICON[h.type] || HISTORY_ICON.created;
                                        return (
                                            <li key={i} className="flex gap-3">
                                                <span className={`material-symbols-outlined text-base mt-0.5 flex-shrink-0 ${ic.color}`}>{ic.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">{h.description}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(h.timestamp)}</p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {history.length > 3 && (
                                    <button
                                        onClick={() => setShowAllHistory(!showAllHistory)}
                                        className="w-full text-center mt-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-500 hover:text-teal-600"
                                    >
                                        {showAllHistory ? '閉じる' : `すべて見る (${history.length}件)`}
                                    </button>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
            <BottomNav />

            {/* Detail Modals */}
            <GuideDetailModal guide={guide || null} open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
            <AccommodationDetailModal
                accommodation={accModal?.accommodation || null}
                day={accModal?.day}
                open={!!accModal}
                onClose={() => setAccModal(null)}
            />
        </div>
    );
};