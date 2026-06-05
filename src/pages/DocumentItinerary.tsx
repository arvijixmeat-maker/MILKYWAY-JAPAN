import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { GuideDetailModal, AccommodationDetailModal } from '../components/common/DetailModals';
import mongoliaHero from '../assets/login_bg_3.jpg';

interface Activity {
    time?: string;
    type?: string;
    title: string;
    description: string;
    images?: string[] | string;
}

interface DayData {
    day: number;
    title: string;
    region?: string;
    activities: Activity[];
    accommodation: {
        id: string;
        name: string;
        type?: string;
        location?: string;
        images?: string[] | string;
        description?: string;
        facilities?: string[] | string;
    } | null;
}

interface DocumentSettings {
    overview?: {
        subtitle?: string;
        heroTagline?: string;
        intro?: string;
        included?: { icon: string; label: string }[];
        includedText?: string;
        excludedText?: string;
        pricePerPerson?: string;
        paymentNote?: string;
    };
    detail?: {
        title?: string;
        note?: string;
        footerBadges?: string[];
    };
    guide?: {
        notices?: { title: string; body: string }[];
        emergencyPhone?: string;
        emergencyEmail?: string;
        closingMessage?: string;
        qrLabel?: string;
    };
}

interface ItineraryData {
    reservation: {
        id: string;
        reservationNumber: string | null;
        productName: string;
        customerName: string;
        travelers: number;
        startDate: string;
        endDate: string;
        status: string;
    };
    template: { id: string; name: string; description: string; days: any[]; documentSettings?: DocumentSettings } | null;
    guide: { id?: string; name: string; image?: string; phone?: string; languages?: string[] | string; specialties?: string[] | string } | null;
    days: DayData[];
}

const ACTIVITY_ICON: Record<string, string> = {
    pickup: 'flight_land',
    transport: 'directions_car',
    meal: 'restaurant',
    sightseeing: 'photo_camera',
    activity: 'hiking',
    checkin: 'hotel',
    free: 'park',
    other: 'check_circle',
};

const ACTIVITY_LABEL: Record<string, string> = {
    pickup: '送迎',
    transport: '移動',
    meal: '食事',
    sightseeing: '観光',
    activity: '体験',
    checkin: '宿泊',
    free: '自由時間',
    other: 'ご案内',
};

const fallbackIncluded = [
    { icon: 'hiking', label: 'モンゴル伝統衣装体験' },
    { icon: 'pets', label: '乗馬体験' },
    { icon: 'local_taxi', label: '専用車・ドライバー' },
    { icon: 'hotel', label: '宿泊' },
    { icon: 'restaurant', label: '食事付き' },
    { icon: 'support_agent', label: '日本語ガイド' },
];

const formatDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
};

const formatShortDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
};

const computeDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
    return nights >= 0 ? { nights, days: nights + 1 } : null;
};

const parseMaybeJson = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return value.startsWith('http') ? [value] : [];
        }
    }
    return [];
};

const parseImage = (value: any): string => {
    const arr = parseMaybeJson(value);
    if (arr.length > 0) return arr[0];
    if (typeof value === 'string' && value.startsWith('http')) return value;
    return '';
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-[126px_1fr] border-b border-[#8FE7DE]/70 last:border-b-0">
        <div className="bg-[#F7FAFA] px-3 py-2.5 text-[12px] font-black text-[#0F8F84]">{label}</div>
        <div className="px-3 py-2.5 text-[13px] font-bold text-slate-800">{value || '-'}</div>
    </div>
);

const Chip = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
        {children}
    </span>
);

export const DocumentItinerary: React.FC = () => {
    const { reservationId } = useParams();
    const [data, setData] = useState<ItineraryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [accModal, setAccModal] = useState<{ accommodation: any; day: number } | null>(null);

    useEffect(() => {
        if (!reservationId) return;
        (async () => {
            try {
                const res = await api.documents.itinerary.get(reservationId);
                setData(res);
            } catch (e: any) {
                setError(e.message || '日程表を読み込めませんでした。');
            } finally {
                setLoading(false);
            }
        })();
    }, [reservationId]);

    const issuedDate = useMemo(() => {
        return new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
                <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm border border-[#8FE7DE]/70">
                    <span className="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
                    <p className="mt-3 text-lg font-bold text-slate-800">日程表を表示できません</p>
                    <p className="mt-1 text-sm text-slate-500">{error || 'URLをご確認ください。'}</p>
                </div>
            </div>
        );
    }

    const { reservation, template, guide, days } = data;
    const settings = template?.documentSettings || {};
    const overview = settings.overview || {};
    const detail = settings.detail || {};
    const guideSettings = settings.guide || {};
    const guideLanguages = parseMaybeJson(guide?.languages);
    const guideSpecialties = parseMaybeJson(guide?.specialties);
    const duration = computeDuration(reservation.startDate, reservation.endDate);
    const documentNumber = reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase();
    const pricePerPerson = Number(overview.pricePerPerson || 0);
    const included = overview.included?.length ? overview.included : fallbackIncluded;
    const splitItems = (t?: string) => (t || '').split(/\r?\n|、|,/).map(x => x.trim()).filter(Boolean);
    const includedList = splitItems(overview.includedText);
    const excludedList = splitItems(overview.excludedText);
    const includedDisplay = includedList.length ? includedList : included.map(i => i.label);

    return (
        <>
            <style>{`
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .doc-shell { max-width: 100% !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
                    .print-break { break-inside: avoid; page-break-inside: avoid; }
                }
                @page { margin: 12mm; }
            `}</style>

            <div className="min-h-screen bg-[#F7FAFA] px-3 py-4 sm:px-4 sm:py-8 print:bg-white print:p-0">
                <main className="doc-shell mx-auto max-w-[920px] overflow-hidden rounded-[24px] border border-[#8FE7DE]/70 bg-white shadow-xl print:shadow-none">
                    <section className="border-b border-[#8FE7DE]/70 bg-white px-5 py-4 sm:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 text-[#0F8F84]">
                                <span className="material-symbols-outlined text-[34px]">landscape</span>
                                <div>
                                    <p className="text-base font-black">モンゴル大自然ツアー</p>
                                    <p className="text-[10px] font-bold tracking-[0.2em]">MONGOLIA NATURE TOUR</p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <h1 className="text-2xl font-black tracking-[0.14em] text-[#0F8F84] sm:text-3xl">ご旅行日程表</h1>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{overview.subtitle || '銀河の下で、大自然と文化を体験する特別な旅へ'}</p>
                            </div>
                        </div>
                    </section>

                    <section className="relative h-[300px] overflow-hidden sm:h-[360px]">
                        <img src={mongoliaHero} alt="Mongolia nature" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00796F]/95 via-[#0F8F84]/60 to-transparent" />
                        <div className="absolute bottom-7 left-5 right-5 text-white sm:left-8">
                            <span className="inline-flex rounded-xl bg-[#0F8F84] px-4 py-2 text-sm font-black">
                                {duration ? `${duration.nights}泊${duration.days}日` : `${days.length}日間`}
                            </span>
                            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">{template?.name || reservation.productName}</h2>
                            <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm font-semibold leading-relaxed text-white/90">
                                {overview.heroTagline || template?.description || reservation.productName}
                            </p>
                        </div>
                    </section>

                    <section className="grid gap-5 border-b border-[#8FE7DE]/70 px-5 py-6 sm:grid-cols-[1.1fr_0.9fr] sm:px-8">
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-base font-black text-[#0F8F84]">
                                <span className="material-symbols-outlined text-[20px]">check_circle</span>ご旅行概要
                            </h3>
                            <div className="overflow-hidden rounded-xl border border-[#8FE7DE]/70">
                                <InfoRow label="ご旅行番号" value={documentNumber} />
                                <InfoRow label="ご旅行期間" value={`${formatDate(reservation.startDate)} 〜 ${formatDate(reservation.endDate)}`} />
                                <InfoRow label="参加人数" value={`${reservation.travelers || '-'}名`} />
                                <InfoRow label="お客様名" value={`${reservation.customerName || '-'} 様`} />
                                <InfoRow label="旅行商品" value={reservation.productName} />
                                <InfoRow label="発行日" value={issuedDate} />
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-base font-black text-[#0F8F84]">
                                <span className="material-symbols-outlined text-[20px]">info</span>ご案内
                            </h3>
                            <div className="rounded-xl border border-[#8FE7DE]/70 bg-[#39C4B7]/10 p-4">
                                <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[#064E48]">
                                    {overview.intro || 'ご予約内容に基づき、旅行概要・日程・代金をまとめた確認用のご旅行日程表です。'}
                                </p>
                                {overview.paymentNote && <p className="mt-3 text-xs font-bold leading-relaxed text-slate-500">{overview.paymentNote}</p>}
                            </div>
                        </div>
                    </section>

                    <section className="border-b border-[#8FE7DE]/70 px-5 py-6 sm:px-8">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <h3 className="mb-3 text-base font-black text-[#0F8F84]">含まれているもの</h3>
                                <ul className="space-y-1.5">
                                    {includedDisplay.map((t, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                                            <span className="material-symbols-outlined text-[18px] text-[#0F8F84]">check_circle</span>{t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {excludedList.length > 0 && (
                                <div>
                                    <h3 className="mb-3 text-base font-black text-slate-500">含まれないもの</h3>
                                    <ul className="space-y-1.5">
                                        {excludedList.map((t, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm font-semibold text-slate-500">
                                                <span className="material-symbols-outlined text-[18px] text-slate-400">cancel</span>{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        {pricePerPerson > 0 && (
                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-amber-200 bg-white p-4 text-center">
                                    <p className="text-xs font-black text-[#0F8F84]">旅行代金（一人あたり）</p>
                                    <p className="mt-1 text-2xl font-black text-[#0F8F84]">{pricePerPerson.toLocaleString('ja-JP')}円</p>
                                </div>
                                <div className="rounded-xl border border-[#8FE7DE]/70 bg-white p-4 text-center">
                                    <p className="text-xs font-black text-slate-400">参加人数</p>
                                    <p className="mt-2 text-lg font-black text-slate-700">{reservation.travelers || '-'}名</p>
                                </div>
                                <div className="rounded-xl bg-gradient-to-br from-[#0F8F84] to-[#39C4B7] p-4 text-center text-white">
                                    <p className="text-xs font-black">参考合計</p>
                                    <p className="mt-1 text-2xl font-black">{(pricePerPerson * (reservation.travelers || 1)).toLocaleString('ja-JP')}円</p>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="px-5 py-7 sm:px-8">
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-[12px] font-black uppercase tracking-widest text-teal-700">Detailed Itinerary</p>
                                <h2 className="mt-1 text-2xl font-black text-slate-950">{detail.title || 'ご旅行日程表（詳細）'}</h2>
                            </div>
                            <p className="rounded-full bg-[#39C4B7]/10 px-3 py-1 text-sm font-black text-[#0F8F84]">{days.length}日間</p>
                        </div>

                        {days.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#8FE7DE] bg-slate-50 p-8 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300">edit_calendar</span>
                                <p className="mt-2 text-sm font-bold text-slate-500">日程は現在準備中です。</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {days.map((day) => {
                                    const accommodation = day.accommodation;
                                    const accommodationImage = parseImage(accommodation?.images);

                                    return (
                                        <article key={day.day} className="print-break grid gap-3 rounded-2xl border border-[#8FE7DE]/70 bg-white p-3 sm:grid-cols-[84px_1fr]">
                                            <div className="rounded-xl bg-gradient-to-b from-[#0F8F84] to-[#39C4B7] px-3 py-4 text-center text-white">
                                                <p className="text-xs font-black uppercase">DAY {day.day}</p>
                                                <p className="mt-1 text-sm font-bold">{formatShortDate(new Date(new Date(reservation.startDate).getTime() + (day.day - 1) * 86400000).toISOString())}</p>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        {day.region && <p className="text-[11px] font-black uppercase tracking-widest text-teal-700">{day.region}</p>}
                                                        <h3 className="text-lg font-black text-[#0F8F84]">{day.title || `${day.day}日目`}</h3>
                                                    </div>
                                                    {accommodation && <Chip>宿泊：{accommodation.name}</Chip>}
                                                </div>

                                                <div className="relative ml-2 space-y-0 border-l-2 border-dashed border-[#8FE7DE] pl-5">
                                                    {day.activities.length > 0 ? day.activities.map((activity, index) => {
                                                        const type = activity.type || 'other';
                                                        const imgs = parseMaybeJson(activity.images).filter(Boolean);
                                                        return (
                                                            <div key={index} className="relative pb-4 last:pb-0">
                                                                <span className="absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0F8F84] ring-4 ring-white">
                                                                    <span className="material-symbols-outlined text-[12px] text-white">{ACTIVITY_ICON[type] || ACTIVITY_ICON.other}</span>
                                                                </span>
                                                                <div className="grid gap-2 sm:grid-cols-[70px_1fr]">
                                                                    <p className="font-mono text-sm font-black text-slate-400">{activity.time || '--:--'}</p>
                                                                    <div>
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <p className="font-black text-slate-900">{activity.title || 'ご案内'}</p>
                                                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{ACTIVITY_LABEL[type] || ACTIVITY_LABEL.other}</span>
                                                                        </div>
                                                                        {activity.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-500">{activity.description}</p>}
                                                                        {imgs.length > 0 && (
                                                                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                                                {imgs.slice(0, 6).map((img: string, i: number) => (
                                                                                    <img key={i} src={img} alt={activity.title} loading="lazy" className="h-24 w-full rounded-lg object-cover" />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }) : (
                                                        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">この日の詳細は現在準備中です。</p>
                                                    )}
                                                </div>

                                                {accommodation && (
                                                    <button
                                                        onClick={() => setAccModal({ accommodation, day: day.day })}
                                                        className="no-print mt-4 grid w-full gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:bg-white sm:grid-cols-[120px_1fr]"
                                                    >
                                                        {accommodationImage && <img src={accommodationImage} alt={accommodation.name} className="h-20 w-full rounded-lg object-cover" loading="lazy" decoding="async" />}
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Accommodation</p>
                                                            <p className="mt-1 text-sm font-black text-slate-900">{accommodation.name}</p>
                                                            {accommodation.location && <p className="mt-1 text-xs text-slate-500">{accommodation.location}</p>}
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="border-t border-[#8FE7DE]/70 bg-[#F7FAFA] px-5 py-6 sm:px-8">
                        <div className="grid gap-4 sm:grid-cols-[1fr_280px]">
                            <div className="rounded-xl border border-[#8FE7DE]/70 bg-white p-4">
                                <p className="font-black text-[#0F8F84]">ご案内・ご注意事項</p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    {(guideSettings.notices?.length ? guideSettings.notices : [
                                        { title: '服装について', body: '朝夕は冷え込む場合があるため、羽織れる上着をご用意ください。' },
                                        { title: '宿泊について', body: '現地事情により同等クラスへ変更となる場合があります。' },
                                    ]).map((notice, index) => (
                                        <div key={`${notice.title}-${index}`} className="flex gap-2">
                                            <span className="material-symbols-outlined text-[20px] text-[#0F8F84]">info</span>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{notice.title}</p>
                                                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{notice.body}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {detail.note && <p className="mt-4 text-xs font-bold leading-relaxed text-slate-500">※ {detail.note}</p>}
                            </div>
                            <div className="rounded-xl border border-[#8FE7DE]/70 bg-white p-4">
                                <p className="text-[12px] font-black uppercase tracking-widest text-slate-400">Contact</p>
                                <p className="mt-2 font-black text-slate-950">Milkyway Japan</p>
                                <p className="mt-1 text-sm text-slate-500">{guideSettings.emergencyPhone || guide?.phone || '+976-80-1234-5678'}</p>
                                <p className="text-sm text-slate-500">{guideSettings.emergencyEmail || 'info@mongolryokou.com'}</p>
                                {guideSettings.closingMessage && <p className="mt-4 text-sm font-bold leading-relaxed text-[#0F8F84]">{guideSettings.closingMessage}</p>}
                            </div>
                        </div>

                        {detail.footerBadges?.length && (
                            <div className="mt-5 grid gap-2 sm:grid-cols-4">
                                {detail.footerBadges.map((badge, index) => (
                                    <div key={`${badge}-${index}`} className="rounded-xl bg-[#0F8F84] px-3 py-3 text-center text-xs font-black text-white">{badge}</div>
                                ))}
                            </div>
                        )}
                    </section>

                    <div className="no-print sticky bottom-0 flex justify-center border-t border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-800"
                        >
                            <span className="material-symbols-outlined text-base">print</span>
                            印刷 / PDF保存
                        </button>
                    </div>
                </main>
            </div>

            <GuideDetailModal guide={guide || null} open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
            <AccommodationDetailModal
                accommodation={accModal?.accommodation || null}
                day={accModal?.day}
                open={!!accModal}
                onClose={() => setAccModal(null)}
            />
        </>
    );
};
