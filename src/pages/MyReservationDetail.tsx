import React, { useEffect, useMemo, useState } from 'react';
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

const formatDateShort = (iso?: string) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const wd = weekdays[d.getDay()];
        return `${y}/${m}/${day} (${wd})`;
    } catch { return iso; }
};

const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
};

const computeDays = (start?: string, end?: string) => {
    if (!start || !end) return null;
    try {
        const s = new Date(start);
        const e = new Date(end);
        const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? { nights: diff, days: diff + 1 } : null;
    } catch { return null; }
};

type StatusTone = 'pending' | 'partial' | 'paid' | 'cancelled' | 'neutral';

const STATUS_MAP: Record<string, { label: string; tone: StatusTone }> = {
    pending_payment: { label: 'お支払い待ち', tone: 'pending' },
    waiting_deposit: { label: '入金待ち', tone: 'pending' },
    paid: { label: 'お支払い完了', tone: 'partial' },
    confirmed: { label: 'ご予約確定', tone: 'paid' },
    completed: { label: '旅行終了', tone: 'neutral' },
    cancelled: { label: 'キャンセル', tone: 'cancelled' },
};

const TONE_STYLES: Record<StatusTone, { bg: string; fg: string; dot: string }> = {
    pending: { bg: '#FEF3C7', fg: '#92400E', dot: '#D97706' },
    partial: { bg: '#DBEAFE', fg: '#1E40AF', dot: '#2563EB' },
    paid: { bg: '#D1FAE5', fg: '#065F46', dot: '#059669' },
    cancelled: { bg: '#FEE2E2', fg: '#991B1B', dot: '#DC2626' },
    neutral: { bg: '#F1F5F9', fg: '#475569', dot: '#64748B' },
};

const HISTORY_ICON: Record<string, { icon: string; color: string }> = {
    status_change: { icon: 'sync', color: 'text-teal-600' },
    modification: { icon: 'edit_note', color: 'text-indigo-600' },
    document_added: { icon: 'description', color: 'text-emerald-600' },
    email: { icon: 'mail', color: 'text-sky-600' },
    admin_memo: { icon: 'sticky_note_2', color: 'text-amber-600' },
    created: { icon: 'add_circle', color: 'text-slate-600' },
};

const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');

const SectionHeader: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
    <div className="px-5 pt-6 pb-2.5">
        <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <h2 className="m-0 text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 ml-[26px] text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] ${className}`}>
        {children}
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

    const statusMeta = useMemo(() => {
        if (!reservation) return null;
        return STATUS_MAP[reservation.status] || { label: reservation.status, tone: 'neutral' as StatusTone };
    }, [reservation]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
            </div>
        );
    }

    if (error || !reservation || !statusMeta) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 gap-4">
                <p className="text-lg font-bold text-slate-800 dark:text-white">予約が見つかりません</p>
                <p className="text-sm text-slate-500">{error || 'URLをご確認ください。'}</p>
                <button onClick={() => navigate('/mypage/reservations')} className="px-4 py-2 bg-primary text-white font-semibold rounded-xl text-sm">
                    一覧に戻る
                </button>
            </div>
        );
    }

    const totalPeople = reservation.totalPeople ?? reservation.travelers ?? 0;
    const priceBreakdown = reservation.priceBreakdown || reservation.price_breakdown;
    const depositPaid = reservation.depositStatus === 'paid' || reservation.status === 'paid' || reservation.status === 'confirmed' || reservation.status === 'completed';
    const balancePaid = reservation.balanceStatus === 'paid' || reservation.status === 'completed';
    const paidAmount = (depositPaid && priceBreakdown ? priceBreakdown.deposit : 0) + (balancePaid && priceBreakdown ? priceBreakdown.local : 0);
    const paidPercent = priceBreakdown && priceBreakdown.total > 0 ? Math.round((paidAmount / priceBreakdown.total) * 100) : 0;
    const remaining = priceBreakdown ? priceBreakdown.total - paidAmount : 0;

    const guide = reservation.assignedGuide;
    const guideLanguages = parseArr(guide?.languages);
    const guideSpecialties = parseArr(guide?.specialties);
    const accommodations = reservation.dailyAccommodations || [];

    const itineraryUrl = reservation.itineraryUrl || (reservation.itineraryTemplateId ? `/documents/itinerary/${reservation.reservationNumber || reservation.id}` : '');
    const contractUrl = reservation.contractUrl || '';

    const history = reservation.history || [];
    const visibleHistory = showAllHistory ? [...history].reverse() : [...history].reverse().slice(0, 3);

    const duration = computeDays(reservation.startDate, reservation.endDate);
    const tone = TONE_STYLES[statusMeta.tone];

    // Donut chart geometry
    const DONUT_R = 26;
    const DONUT_C = 2 * Math.PI * DONUT_R;
    const donutDash = (paidPercent / 100) * DONUT_C;

    const payCtaDisabled = depositPaid;
    const payCtaLabel = depositPaid
        ? (balancePaid ? 'お支払い完了' : '現地支払いは現地でお支払い')
        : 'PayPalで予約金を支払う';

    const handleChat = () => {
        const w = window as any;
        if (typeof w.ChannelIO === 'function') {
            w.ChannelIO('showMessenger');
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-[100px]">
            <div className="max-w-[480px] mx-auto bg-white dark:bg-slate-900 shadow-xl min-h-screen">

                {/* Sticky TopBar */}
                <header className="sticky top-0 z-40 bg-white/92 dark:bg-slate-900/92 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-2 px-4 h-14">
                        <button
                            onClick={() => navigate('/mypage/reservations')}
                            aria-label="戻る"
                            className="w-10 h-10 grid place-items-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 500" }}>arrow_back_ios_new</span>
                        </button>
                        <div className="min-w-0 leading-tight">
                            <div className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight truncate">ご予約詳細</div>
                            <div className="text-[11px] font-medium text-slate-400 mt-0.5 tabular-nums">
                                #{reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase()}
                            </div>
                        </div>
                        <div
                            className="inline-flex items-center gap-1.5 py-1.5 pl-2 pr-2.5 rounded-full text-[12px] font-bold"
                            style={{ background: tone.bg, color: tone.fg }}
                        >
                            <span
                                className="inline-block rounded-full"
                                style={{ width: 6, height: 6, background: tone.dot, boxShadow: `0 0 0 3px ${tone.dot}22` }}
                            />
                            {statusMeta.label}
                        </div>
                    </div>
                </header>

                {/* TourHero */}
                <section className="px-5 pt-4">
                    <div
                        className="relative rounded-[20px] overflow-hidden text-white px-5 pt-5 pb-[22px] shadow-[0_10px_30px_-10px_rgba(15,118,110,0.45)]"
                        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 60%, #0c4a44 100%)' }}
                    >
                        {/* decorative rings */}
                        <svg
                            viewBox="0 0 200 200"
                            aria-hidden="true"
                            className="absolute pointer-events-none"
                            style={{ right: -40, top: -40, width: 180, height: 180, opacity: 0.14 }}
                        >
                            <circle cx="100" cy="100" r="90" fill="none" stroke="#fff" strokeWidth="1" />
                            <circle cx="100" cy="100" r="60" fill="none" stroke="#fff" strokeWidth="1" />
                            <circle cx="100" cy="100" r="30" fill="none" stroke="#fff" strokeWidth="1" />
                        </svg>

                        <div className="inline-flex items-center gap-1.5 bg-white/16 py-1 pl-2 pr-2.5 rounded-full text-[10.5px] font-bold tracking-[0.08em] mb-2.5">
                            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>landscape</span>
                            MILKYWAY TOUR
                        </div>

                        <h1 className="m-0 text-[22px] font-black tracking-tight leading-[1.2]">{reservation.productName}</h1>

                        <div className="mt-3.5 grid grid-cols-[1fr_auto] gap-3 items-center">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-[16px] opacity-90" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                                <div className="text-[12.5px] font-medium tabular-nums leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis">
                                    {formatDateShort(reservation.startDate)} 〜 {formatDateShort(reservation.endDate)}
                                </div>
                            </div>
                            <div className="inline-flex items-center gap-1 bg-black/18 py-1 px-2.5 rounded-full text-[12px] font-bold">
                                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                                {totalPeople}名
                            </div>
                        </div>

                        <div className="mt-3.5 pt-3.5 border-t border-white/14 grid grid-cols-[1fr_auto_1fr] gap-2 text-[11px]">
                            <div className="text-left">
                                <div className="opacity-70 text-[10.5px] font-medium tracking-wide">期間</div>
                                <div className="mt-0.5 text-[13px] font-bold tabular-nums">
                                    {duration ? `${duration.days}日${duration.nights}泊` : '—'}
                                </div>
                            </div>
                            <div className="w-px bg-white/14" />
                            <div className="text-right">
                                <div className="opacity-70 text-[10.5px] font-medium tracking-wide">予約番号</div>
                                <div className="mt-0.5 text-[13px] font-bold tabular-nums">
                                    {reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Payment card */}
                {priceBreakdown && (
                    <>
                        <SectionHeader icon="account_balance_wallet" title="お支払い状況" />
                        <div className="px-5">
                            <Card className="p-[18px]">
                                {/* Donut + total */}
                                <div className="flex items-center gap-4">
                                    <div className="relative w-[72px] h-[72px] flex-shrink-0">
                                        <svg width="72" height="72" viewBox="0 0 72 72">
                                            <circle cx="36" cy="36" r={DONUT_R} fill="none" className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="7" />
                                            <circle
                                                cx="36" cy="36" r={DONUT_R} fill="none"
                                                stroke="url(#paymentGrad)" strokeWidth="7" strokeLinecap="round"
                                                strokeDasharray={`${donutDash} ${DONUT_C - donutDash}`}
                                                strokeDashoffset={DONUT_C / 4}
                                                transform="rotate(-90 36 36)"
                                                style={{ transition: 'stroke-dasharray 450ms cubic-bezier(0.16,1,0.3,1)' }}
                                            />
                                            <defs>
                                                <linearGradient id="paymentGrad" x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0%" stopColor="#14b8a6" />
                                                    <stop offset="100%" stopColor="#0f766e" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 grid place-items-center text-[15px] font-bold text-primary tabular-nums tracking-tight">
                                            {paidPercent}%
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">お支払い済み</div>
                                        <div className="mt-0.5 text-[22px] font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-[1.1]">
                                            {yen(paidAmount)}
                                            <span className="ml-1 text-[12px] font-medium text-slate-400"> / {yen(priceBreakdown.total)}</span>
                                        </div>
                                        <div className="mt-1.5 text-[11px] text-slate-500">
                                            残り <span className="text-slate-700 dark:text-slate-200 font-bold tabular-nums">{yen(remaining)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-slate-100 dark:bg-slate-700 -mx-[18px] my-4" />

                                {/* Breakdown rows */}
                                <div className="flex flex-col gap-2.5">
                                    <BreakdownRow label="予約金" sublabel="PayPalで事前にお支払い" amount={priceBreakdown.deposit} paid={depositPaid} />
                                    <BreakdownRow label="現地支払い" sublabel="ウランバートル到着時 現金 / カード" amount={priceBreakdown.local} paid={balancePaid} />
                                </div>

                                {/* CTA */}
                                {payCtaDisabled ? (
                                    <button
                                        disabled
                                        className="mt-4 w-full h-[52px] rounded-[14px] bg-slate-100 dark:bg-slate-700 text-slate-400 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-default"
                                    >
                                        {payCtaLabel}
                                    </button>
                                ) : (
                                    <a
                                        href={priceBreakdown.deposit > 0 ? `https://paypal.me/MilkywayMongolia/${priceBreakdown.deposit}` : '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 w-full h-[52px] rounded-[14px] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_6px_18px_-6px_rgba(26,47,90,0.55)] active:scale-[0.98] transition-transform"
                                        style={{ background: 'linear-gradient(180deg, #1F3A6E 0%, #1A2F5A 100%)' }}
                                    >
                                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                                        {payCtaLabel}
                                    </a>
                                )}

                                {!payCtaDisabled && (
                                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                                        <span className="material-symbols-outlined text-[12px]">lock</span>
                                        PayPal SSL で安全にお支払い
                                    </div>
                                )}
                            </Card>
                        </div>
                    </>
                )}

                {/* Documents */}
                <SectionHeader icon="folder" title="ご旅行書類" subtitle="契約書と日程表をご確認いただけます" />
                <div className="px-5 flex flex-col gap-2.5">
                    <DocumentRow
                        icon="map"
                        title="確定日程表"
                        subReady="行程と宿泊先をチェック"
                        subPending="準備中（担当者が作成すると表示されます）"
                        href={itineraryUrl}
                    />
                    <DocumentRow
                        icon="description"
                        title="海外旅行契約書"
                        subReady="契約内容と注意事項を確認"
                        subPending="準備中（発行されるとメールでもお知らせします）"
                        href={contractUrl}
                    />
                </div>

                {/* Guide */}
                <SectionHeader icon="badge" title="担当ガイド" subtitle={guide?.name ? undefined : '出発2週間前までに確定します'} />
                <div className="px-5">
                    {guide && guide.name ? (
                        <button
                            onClick={() => setGuideModalOpen(true)}
                            className="w-full text-left bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 hover:shadow-md active:scale-[0.99] transition-all shadow-[0_2px_8px_0_rgba(0,0,0,0.04)]"
                        >
                            <div className="flex items-center gap-3">
                                {guide.image ? (
                                    <img src={guide.image} alt={guide.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0" loading="lazy" decoding="async" />
                                ) : (
                                    <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}
                                    >
                                        {guide.name[0]}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white truncate">{guide.name}</p>
                                    {(guideLanguages.length > 0 || guideSpecialties.length > 0) && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {guideLanguages.map((l, i) => (
                                                <span key={`l-${i}`} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{l}</span>
                                            ))}
                                            {guideSpecialties.slice(0, 2).map((s, i) => (
                                                <span key={`s-${i}`} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{s}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span className="material-symbols-outlined text-slate-400 flex-shrink-0">chevron_right</span>
                            </div>
                            {(guide.introduction || guide.bio) && (
                                <p className="text-xs text-slate-500 leading-relaxed mt-3 line-clamp-2">{guide.introduction || guide.bio}</p>
                            )}
                            <p className="text-[11px] text-primary font-semibold mt-2 inline-flex items-center gap-0.5">
                                詳細を見る
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </p>
                        </button>
                    ) : (
                        <PendingTile
                            centerIcon="person"
                            centerTitle="担当ガイドを調整中です"
                            centerSub="決まり次第メールとアプリでお知らせします"
                        />
                    )}
                </div>

                {/* Accommodations */}
                <SectionHeader
                    icon="hotel"
                    title="宿泊先"
                    subtitle={accommodations.length > 0 ? `${accommodations.length}泊` : '日程確定後、1日ごとに確定します'}
                />
                <div className="px-5">
                    {accommodations.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {accommodations.map((item) => {
                                const acc = item.accommodation;
                                const img = parseImage(acc?.images);
                                return (
                                    <div
                                        key={item.day}
                                        className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-[0_2px_8px_0_rgba(0,0,0,0.04)]"
                                    >
                                        <div className="flex gap-3 p-3 items-center">
                                            {img ? (
                                                <img src={img} alt={acc?.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" loading="lazy" decoding="async" />
                                            ) : (
                                                <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                    <span className="material-symbols-outlined text-slate-300 text-3xl">hotel</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-white">{item.day}日目</span>
                                                    {acc?.type && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{acc.type}</span>}
                                                </div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{acc?.name || '—'}</p>
                                                <button
                                                    onClick={() => acc && setAccModal({ accommodation: acc, day: item.day })}
                                                    className="inline-flex items-center gap-0.5 mt-1.5 text-[11px] font-semibold text-primary hover:opacity-80"
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
                        <PendingTile
                            centerIcon="bed"
                            centerTitle="宿泊先を手配中です"
                            centerSub="日程確定後、1日ごとに確定します"
                        />
                    )}
                </div>

                {/* History */}
                {history.length > 0 && (
                    <>
                        <SectionHeader icon="history" title="タイムライン" />
                        <div className="px-5">
                            <Card className="px-4 py-3">
                                <ul className="flex flex-col gap-2.5">
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
                                        className="w-full text-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-primary"
                                    >
                                        {showAllHistory ? '閉じる' : `すべて見る (${history.length}件)`}
                                    </button>
                                )}
                            </Card>
                        </div>
                    </>
                )}

                {/* Help footer */}
                <div className="px-5 pt-7 pb-8">
                    <div className="bg-slate-100 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 mb-2.5">
                            <div className="w-8 h-8 rounded-[10px] bg-primary grid place-items-center text-white">
                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
                            </div>
                            <div>
                                <div className="text-[13px] font-bold text-slate-900 dark:text-white">ご不明な点がありましたら</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">日本語担当スタッフが24時間対応</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <ContactBtn icon="chat" label="チャット相談" onClick={handleChat} />
                            <ContactBtn icon="mail" label="メールで問い合わせ" href="mailto:info@mongolryokou.com" />
                        </div>
                    </div>
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

// — Inner components —

const BreakdownRow: React.FC<{ label: string; sublabel: string; amount: number; paid: boolean }> = ({ label, sublabel, amount, paid }) => (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
                <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${
                        paid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${paid ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    {paid ? '入金済' : '未入金'}
                </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{sublabel}</div>
        </div>
        <div className="text-[15px] font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {yen(amount)}
        </div>
    </div>
);

const DocumentRow: React.FC<{
    icon: string;
    title: string;
    subReady: string;
    subPending: string;
    href: string;
}> = ({ icon, title, subReady, subPending, href }) => {
    const ready = !!href;
    const content = (
        <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3.5 w-full px-4 py-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-bold ${ready ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{title}</span>
                    {!ready && (
                        <span className="px-1.5 py-[1px] bg-amber-100 text-amber-800 text-[9.5px] font-bold tracking-wide rounded">準備中</span>
                    )}
                </div>
                <div className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400 leading-[1.4]">
                    {ready ? subReady : subPending}
                </div>
            </div>
            {ready && <span className="material-symbols-outlined text-slate-300">chevron_right</span>}
        </div>
    );

    if (ready) {
        return (
            <a
                href={href}
                target={href.startsWith('/') ? '_self' : '_blank'}
                rel="noopener noreferrer"
                className="block bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[14px] shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] active:scale-[0.99] transition-transform"
            >
                {content}
            </a>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-[14px]">
            {content}
        </div>
    );
};

const PendingTile: React.FC<{ centerIcon: string; centerTitle: string; centerSub: string }> = ({ centerIcon, centerTitle, centerSub }) => (
    <div
        className="relative py-[26px] px-5 border-[1.5px] border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center"
        style={{
            backgroundImage: 'repeating-linear-gradient(135deg, #FAFBFC 0 12px, #F3F5F8 12px 24px)',
        }}
    >
        <div className="w-12 h-12 mx-auto mb-2.5 rounded-[14px] bg-white border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] grid place-items-center text-primary relative">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{centerIcon}</span>
            <span
                className="absolute w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"
                style={{ top: -3, right: -3, boxShadow: '0 0 0 3px #fff' }}
            />
        </div>
        <div className="text-[13.5px] font-bold text-slate-700 dark:text-slate-200">{centerTitle}</div>
        <div className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400 leading-[1.5]">{centerSub}</div>
    </div>
);

const ContactBtn: React.FC<{ icon: string; label: string; onClick?: () => void; href?: string }> = ({ icon, label, onClick, href }) => {
    const cls =
        'inline-flex items-center justify-center gap-1.5 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-[12.5px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors';
    const inner = (
        <>
            <span className="material-symbols-outlined text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            {label}
        </>
    );
    if (href) {
        return <a href={href} className={cls}>{inner}</a>;
    }
    return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
};
