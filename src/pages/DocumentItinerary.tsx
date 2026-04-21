import React, { useEffect, useState } from 'react';
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
        facilities?: string[];
    } | null;
}

const ACTIVITY_ICON: Record<string, string> = {
    pickup: 'flight_land',
    transport: 'directions_car',
    meal: 'restaurant',
    sightseeing: 'photo_camera',
    activity: 'sports_handball',
    checkin: 'hotel',
    free: 'park',
    other: 'check_circle',
};

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

const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    } catch { return iso; }
};

const parseMaybeJson = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

const parseImage = (v: any): string => {
    const arr = parseMaybeJson(v);
    if (arr.length > 0) return arr[0];
    if (typeof v === 'string' && v.startsWith('http')) return v;
    return '';
};

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
                setError(e.message || '読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        })();
    }, [reservationId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="text-center">
                    <p className="text-lg font-bold text-slate-800 mb-2">日程表が見つかりません</p>
                    <p className="text-sm text-slate-500">{error || 'URLをご確認ください。'}</p>
                </div>
            </div>
        );
    }

    const { reservation, template, guide, days } = data;
    const guideLanguages = parseMaybeJson(guide?.languages);
    const guideSpecialties = parseMaybeJson(guide?.specialties);

    return (
        <>
            <style>{`
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always; }
                    .doc-shell { max-width: 100% !important; padding: 0 !important; box-shadow: none !important; }
                }
                @page { margin: 16mm; }
            `}</style>

            <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
                <div className="doc-shell max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">

                    {/* Header */}
                    <div className="relative px-8 py-10 text-white overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}>
                        <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none"></div>
                        <div className="relative">
                            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/70 mb-2">Milkyway Japan · ご旅行日程</p>
                            <h1 className="text-3xl font-bold tracking-tight leading-snug">{reservation.productName}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-white/90">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-base">event</span>
                                    {formatDate(reservation.startDate)} 〜 {formatDate(reservation.endDate)}
                                </span>
                                <span className="opacity-40">·</span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-base">group</span>
                                    {reservation.travelers}名
                                </span>
                                {reservation.reservationNumber && (
                                    <>
                                        <span className="opacity-40">·</span>
                                        <span className="font-mono text-xs opacity-90">#{reservation.reservationNumber}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customer greeting */}
                    <div className="px-8 py-6 border-b border-slate-100">
                        <p className="text-slate-700 leading-relaxed">
                            <span className="font-bold text-slate-900">{reservation.customerName}</span> 様<br />
                            この度はMilkyway Japanをお選びいただき、誠にありがとうございます。下記の通りご案内いたします。
                        </p>
                    </div>

                    {/* Guide Card */}
                    {guide && (
                        <div className="px-8 py-6 border-b border-slate-100">
                            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">担当ガイド</h2>
                            <button
                                onClick={() => setGuideModalOpen(true)}
                                className="no-print w-full text-left bg-slate-50 rounded-2xl p-4 flex items-center gap-4 hover:bg-slate-100 transition-colors"
                            >
                                {guide.image ? (
                                    <img src={guide.image} alt={guide.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
                                        {guide.name?.[0] || '?'}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900">{guide.name}</p>
                                    {guide.phone && <p className="text-xs text-slate-500 mt-0.5 font-mono">{guide.phone}</p>}
                                    {(guideLanguages.length > 0 || guideSpecialties.length > 0) && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {guideLanguages.map((l, i) => (
                                                <span key={`l-${i}`} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{l}</span>
                                            ))}
                                            {guideSpecialties.slice(0, 3).map((s, i) => (
                                                <span key={`s-${i}`} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{s}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span className="material-symbols-outlined text-slate-400 flex-shrink-0">chevron_right</span>
                            </button>
                        </div>
                    )}

                    {/* Day-by-day */}
                    <div className="px-8 py-6 border-b border-slate-100">
                        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">日程 ({days.length}日間)</h2>

                        {days.length === 0 ? (
                            <p className="text-sm text-slate-400 py-4">日程はまだ設定されていません。</p>
                        ) : (
                            <div className="space-y-5">
                                {days.map((d) => {
                                    const acc = d.accommodation;
                                    const accImage = parseImage(acc?.images);
                                    return (
                                        <div key={d.day} className="grid grid-cols-[52px_1fr] gap-4">
                                            <div className="relative">
                                                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold tracking-tight shadow-md shadow-teal-500/30"
                                                    style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
                                                    D-{d.day}
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                {(d.title || d.region) && (
                                                    <div className="mb-2">
                                                        {d.region && <p className="text-[11px] font-bold text-teal-600 uppercase tracking-widest">{d.region}</p>}
                                                        {d.title && <p className="font-bold text-slate-900 mt-0.5">{d.title}</p>}
                                                    </div>
                                                )}
                                                {d.activities.length > 0 && (
                                                    <ul className="space-y-2 mb-3">
                                                        {d.activities.map((a, i) => (
                                                            <li key={i} className="grid grid-cols-[48px_24px_1fr] gap-2 items-start">
                                                                <span className="text-[11px] font-bold font-mono text-slate-400 mt-0.5 tabular-nums">{a.time || '--:--'}</span>
                                                                <span className="material-symbols-outlined text-teal-600 text-base mt-0.5 flex-shrink-0">{ACTIVITY_ICON[a.type || 'other'] || 'check_circle'}</span>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                                                                    {a.description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.description}</p>}
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {acc && (
                                                    <button
                                                        onClick={() => setAccModal({ accommodation: acc, day: d.day })}
                                                        className="no-print w-full text-left bg-slate-50 rounded-xl p-3 flex items-center gap-3 mt-2 hover:bg-slate-100 transition-colors"
                                                    >
                                                        {accImage ? (
                                                            <img src={accImage} alt={acc.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                                                                <span className="material-symbols-outlined text-slate-400">hotel</span>
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <span className="material-symbols-outlined text-sm text-slate-400">bed</span>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">宿泊</p>
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-900 truncate">{acc.name}</p>
                                                            {acc.location && <p className="text-xs text-slate-500 truncate">{acc.location}</p>}
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-400 flex-shrink-0">chevron_right</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Template description */}
                    {template?.description && (
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{template.description}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-8 py-6 bg-slate-50">
                        <div className="text-center text-xs text-slate-500 leading-relaxed">
                            <p className="font-bold text-slate-700 mb-1">Milkyway Japan</p>
                            <p>mongolryokou.com · info@mongolryokou.com</p>
                            <p className="mt-2 text-[11px] text-slate-400">ご不明な点はお気軽にお問い合わせください。</p>
                        </div>
                    </div>

                    {/* Print button */}
                    <div className="no-print px-8 py-4 bg-white border-t border-slate-100 flex justify-center">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">print</span>
                            印刷 / PDF 保存
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modals */}
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