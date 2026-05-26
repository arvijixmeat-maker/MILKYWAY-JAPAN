import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { GuideDetailModal, AccommodationDetailModal } from '../components/common/DetailModals';

interface Activity {
    time?: string;
    type?: string;
    title: string;
    description: string;
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
    template: { id: string; name: string; description: string; days: any[] } | null;
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
    other: '予定',
};

const formatDate = (iso?: string) => {
    if (!iso) return '未定';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
};

const formatShortDate = (iso?: string) => {
    if (!iso) return '未定';
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
    <div className="grid grid-cols-[110px_1fr] border-b border-slate-200 last:border-b-0">
        <div className="bg-slate-50 px-3 py-2.5 text-[12px] font-bold text-slate-500">{label}</div>
        <div className="px-3 py-2.5 text-[13px] font-bold text-slate-900">{value || '-'}</div>
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
                <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm border border-slate-200">
                    <span className="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
                    <p className="mt-3 text-lg font-bold text-slate-800">日程表が見つかりません</p>
                    <p className="mt-1 text-sm text-slate-500">{error || 'URLをご確認ください。'}</p>
                </div>
            </div>
        );
    }

    const { reservation, template, guide, days } = data;
    const guideLanguages = parseMaybeJson(guide?.languages);
    const guideSpecialties = parseMaybeJson(guide?.specialties);
    const duration = computeDuration(reservation.startDate, reservation.endDate);
    const documentNumber = reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase();

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

            <div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-4 sm:py-8 print:bg-white print:p-0">
                <main className="doc-shell mx-auto max-w-[900px] overflow-hidden rounded-2xl bg-white shadow-xl print:shadow-none">
                    <section className="border-b-4 border-teal-700 px-5 py-6 sm:px-9">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-[12px] font-black uppercase tracking-[0.22em] text-teal-700">Milkyway Japan</p>
                                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">CONFIRMED ITINERARY</h1>
                                <p className="mt-2 text-sm font-medium text-slate-500">モンゴル旅行 確定日程表</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 text-left sm:w-[260px]">
                                <InfoRow label="文書番号" value={`IT-${documentNumber}`} />
                                <InfoRow label="予約番号" value={documentNumber} />
                                <InfoRow label="発行日" value={issuedDate} />
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-5 border-b border-slate-200 px-5 py-5 sm:grid-cols-[1.2fr_1fr] sm:px-9">
                        <div>
                            <p className="text-[12px] font-black uppercase tracking-widest text-slate-400">Bill To / Customer</p>
                            <div className="mt-2 rounded-xl border border-slate-200">
                                <InfoRow label="お客様名" value={`${reservation.customerName || 'お客様'} 様`} />
                                <InfoRow label="商品名" value={reservation.productName} />
                                <InfoRow label="人数" value={`${reservation.travelers || '-'}名`} />
                            </div>
                        </div>
                        <div>
                            <p className="text-[12px] font-black uppercase tracking-widest text-slate-400">Trip Summary</p>
                            <div className="mt-2 rounded-xl border border-slate-200">
                                <InfoRow label="旅行期間" value={`${formatDate(reservation.startDate)} 〜 ${formatDate(reservation.endDate)}`} />
                                <InfoRow label="日数" value={duration ? `${duration.days}日間 / ${duration.nights}泊` : `${days.length}日間`} />
                                <InfoRow label="日程タイプ" value={template?.name || '確定日程表'} />
                            </div>
                        </div>
                    </section>

                    <section className="border-b border-slate-200 px-5 py-5 sm:px-9">
                        <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-950">
                            この度はMilkyway Japanをご利用いただき、誠にありがとうございます。下記の通り、ご旅行の日程をご案内いたします。
                            天候・道路状況・安全上の判断により、現地で行程の順序や時間を調整する場合がございます。
                        </div>
                    </section>

                    {guide && (
                        <section className="border-b border-slate-200 px-5 py-5 sm:px-9">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Guide Information</h2>
                                <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-700">担当ガイド</span>
                            </div>
                            <button
                                onClick={() => setGuideModalOpen(true)}
                                className="no-print w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-slate-50"
                            >
                                <div className="flex items-center gap-4">
                                    {guide.image ? (
                                        <img src={guide.image} alt={guide.name} className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" loading="lazy" decoding="async" />
                                    ) : (
                                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-teal-700 text-xl font-black text-white">
                                            {guide.name?.[0] || '?'}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-base font-black text-slate-900">{guide.name}</p>
                                        {guide.phone && <p className="mt-0.5 font-mono text-xs text-slate-500">{guide.phone}</p>}
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {guideLanguages.map((item, index) => <Chip key={`lang-${index}`}>{item}</Chip>)}
                                            {guideSpecialties.slice(0, 3).map((item, index) => <Chip key={`spec-${index}`}>{item}</Chip>)}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                                </div>
                            </button>
                        </section>
                    )}

                    <section className="px-5 py-6 sm:px-9">
                        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-[12px] font-black uppercase tracking-widest text-teal-700">Itinerary Details</p>
                                <h2 className="mt-1 text-xl font-black text-slate-950">日程明細</h2>
                            </div>
                            <p className="text-sm font-bold text-slate-500">{days.length}日間</p>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <div className="hidden grid-cols-[90px_1fr_110px] bg-slate-900 text-[12px] font-black uppercase tracking-widest text-white sm:grid">
                                <div className="px-4 py-3">Day</div>
                                <div className="px-4 py-3">Schedule</div>
                                <div className="px-4 py-3 text-right">Stay</div>
                            </div>

                            {days.length === 0 ? (
                                <div className="bg-slate-50 p-8 text-center">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">edit_calendar</span>
                                    <p className="mt-2 text-sm font-bold text-slate-500">日程はまだ設定されていません。</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-200">
                                    {days.map((day) => {
                                        const accommodation = day.accommodation;
                                        const accommodationImage = parseImage(accommodation?.images);

                                        return (
                                            <article key={day.day} className="print-break grid gap-0 bg-white sm:grid-cols-[90px_1fr_110px]">
                                                <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 sm:border-b-0 sm:border-r sm:border-slate-200">
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Day</p>
                                                    <p className="mt-1 text-2xl font-black text-teal-700">{day.day}</p>
                                                </div>

                                                <div className="px-4 py-4">
                                                    <div className="mb-3">
                                                        {day.region && <p className="text-[11px] font-black uppercase tracking-widest text-teal-700">{day.region}</p>}
                                                        <h3 className="text-base font-black text-slate-950">{day.title || `${day.day}日目`}</h3>
                                                    </div>

                                                    {day.activities.length > 0 ? (
                                                        <table className="w-full border-collapse text-left">
                                                            <tbody>
                                                                {day.activities.map((activity, index) => {
                                                                    const type = activity.type || 'other';
                                                                    return (
                                                                        <tr key={index} className="border-t border-slate-100 first:border-t-0">
                                                                            <td className="w-[58px] py-2 pr-2 align-top font-mono text-[12px] font-bold text-slate-400">
                                                                                {activity.time || '--:--'}
                                                                            </td>
                                                                            <td className="w-[34px] py-2 pr-2 align-top">
                                                                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                                                                                    <span className="material-symbols-outlined text-[16px]">{ACTIVITY_ICON[type] || ACTIVITY_ICON.other}</span>
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 align-top">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <p className="font-bold text-slate-900">{activity.title}</p>
                                                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{ACTIVITY_LABEL[type] || ACTIVITY_LABEL.other}</span>
                                                                                </div>
                                                                                {activity.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-500">{activity.description}</p>}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">この日の詳細は調整中です。</p>
                                                    )}
                                                </div>

                                                <div className="border-t border-slate-100 px-4 py-4 sm:border-l sm:border-t-0 sm:border-slate-200">
                                                    {accommodation ? (
                                                        <button
                                                            onClick={() => setAccModal({ accommodation, day: day.day })}
                                                            className="no-print w-full text-left"
                                                        >
                                                            {accommodationImage && (
                                                                <img src={accommodationImage} alt={accommodation.name} className="mb-2 h-16 w-full rounded-lg object-cover" loading="lazy" decoding="async" />
                                                            )}
                                                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">宿泊</p>
                                                            <p className="mt-1 text-sm font-black text-slate-900">{accommodation.name}</p>
                                                            {accommodation.location && <p className="mt-1 text-xs text-slate-500">{accommodation.location}</p>}
                                                        </button>
                                                    ) : (
                                                        <p className="text-sm font-bold text-slate-400">調整中</p>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {template?.description && (
                        <section className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-9">
                            <p className="text-[12px] font-black uppercase tracking-widest text-slate-400">Notes</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{template.description}</p>
                        </section>
                    )}

                    <section className="border-t border-slate-200 px-5 py-6 sm:px-9">
                        <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
                            <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
                                <p className="font-black text-teal-950">ご確認のお願い</p>
                                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-teal-950/80">
                                    <li>集合時間、航空便、宿泊先に誤りがないかご確認ください。</li>
                                    <li>修正希望がある場合は、出発前に担当者へご連絡ください。</li>
                                    <li>現地では安全を最優先し、必要に応じて行程を調整します。</li>
                                </ul>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-4">
                                <p className="text-[12px] font-black uppercase tracking-widest text-slate-400">Contact</p>
                                <p className="mt-2 font-black text-slate-950">Milkyway Japan</p>
                                <p className="mt-1 text-sm text-slate-500">mongolryokou.com</p>
                                <p className="text-sm text-slate-500">info@mongolryokou.com</p>
                            </div>
                        </div>
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
