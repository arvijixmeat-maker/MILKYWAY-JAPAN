import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import {
    DocTopBar, DocHero, DocCard, TripInfoGrid, IncludeExclude,
    DayCard, GuideTips, DocFooter, DOC_BLUE, DOC_NAVY, type DocDay,
} from '../components/document/TripDocParts';

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
    summary?: string;
    activities: Activity[];
    meals?: {
        breakfast?: string;
        lunch?: string;
        dinner?: string;
    };
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
        guideName?: string;
        guidePhone?: string;
        accommodationInfo?: string;
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

const formatDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
};

const computeDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
    return nights >= 0 ? { nights, days: nights + 1 } : null;
};

export const DocumentItinerary: React.FC = () => {
    const { reservationId } = useParams();
    const [data, setData] = useState<ItineraryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            <>
                <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
                <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F5FA' }}>
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200" style={{ borderTopColor: DOC_BLUE }} />
                </div>
            </>
        );
    }

    if (error || !data) {
        return (
            <>
                <SEO title="確定日程表" description="お客様専用の旅行日程表です。" robots="noindex, nofollow" />
                <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F2F5FA' }}>
                    <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_8px_24px_rgba(11,27,69,0.08)]">
                        <span className="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
                        <p className="mt-3 text-lg font-black" style={{ color: DOC_NAVY }}>日程表を表示できません</p>
                        <p className="mt-1 text-sm text-slate-500">{error || 'URLをご確認ください。'}</p>
                    </div>
                </div>
            </>
        );
    }

    const { reservation, template, guide, days } = data;
    const settings = template?.documentSettings || {};
    const overview = settings.overview || {};
    const detail = settings.detail || {};
    const guideSettings = settings.guide || {};
    const duration = computeDuration(reservation.startDate, reservation.endDate);
    const documentNumber = reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase();
    const splitItems = (t?: string) => (t || '').split(/\r?\n|、|,/).map(x => x.trim()).filter(Boolean);
    const includedList = splitItems(overview.includedText);
    const excludedList = splitItems(overview.excludedText);
    const includedDisplay = includedList.length ? includedList
        : ['空港送迎・専用車', '全行程の宿泊（ホテル・ゲル）', '日程表内のお食事', '日本語ガイド', '観光入場料・各種体験'];
    const excludedDisplay = excludedList.length ? excludedList
        : ['国際線航空券', '海外旅行保険', '個人的な費用（お土産・飲み物など）'];
    const notices = (guideSettings.notices || []).filter(n => n?.title);
    const guideNotices = notices.length > 0 ? notices : [
        { title: '服装について', body: '朝夕は冷え込む場合があるため、羽織れる上着をご用意ください。' },
        { title: '宿泊について', body: '現地事情により同等クラスへ変更となる場合があります。' },
    ];
    const durationChip = duration ? `${duration.nights}泊${duration.days}日` : `全${days.length}日間`;

    return (
        <>
            <SEO
                title="確定日程表"
                description="お客様専用の旅行日程表です。"
                robots="noindex, nofollow"
            />
            <>
            <style>{`
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .doc-shell { max-width: 100% !important; padding: 0 !important; }
                    .print-break { break-inside: avoid; page-break-inside: avoid; }
                }
                @page { margin: 12mm; }
            `}</style>

            <div className="min-h-screen px-3 py-4 sm:px-4 sm:py-8 print:bg-white print:p-0" style={{ background: '#F2F5FA' }}>
                <main className="doc-shell mx-auto flex max-w-[880px] flex-col gap-4">
                    <DocTopBar docLabel="ご予約" number={documentNumber} date={issuedDate} />

                    <DocHero
                        eyebrow="ご予約確定 ─ CONFIRMED ITINERARY"
                        title={template?.name || reservation.productName}
                        subtitle={overview.heroTagline || template?.description || 'モンゴルの大自然と文化を体験する特別な旅へ。'}
                        chips={[durationChip, `${reservation.travelers || '-'}名`]}
                    />

                    <TripInfoGrid items={[
                        { icon: 'person', label: 'お客様名', value: `${reservation.customerName || '—'} 様` },
                        { icon: 'flag', label: 'ツアー名', value: reservation.productName },
                        { icon: 'groups', label: 'ご人数', value: `${reservation.travelers || '-'}名` },
                        { icon: 'support_agent', label: 'ガイド', value: guide?.name || '日本語ガイド' },
                        { icon: 'calendar_month', label: 'ご旅行期間', value: `${formatDate(reservation.startDate)} 〜 ${formatDate(reservation.endDate)}` },
                        { icon: 'directions_car', label: '車両', value: '専用車' },
                    ]} />

                    {overview.intro && (
                        <DocCard>
                            <p className="whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-slate-600">{overview.intro}</p>
                        </DocCard>
                    )}

                    <IncludeExclude included={includedDisplay} excluded={excludedDisplay} />

                    {/* 상세 일정 */}
                    <div className="mt-2 px-1">
                        <p className="text-[11px] font-black tracking-[0.18em]" style={{ color: DOC_BLUE }}>TOUR ITINERARY</p>
                        <div className="flex items-end justify-between">
                            <h2 className="text-[24px] font-black" style={{ color: DOC_NAVY }}>{detail.title || 'ご旅行日程表'}</h2>
                            <span className="rounded-full px-3 py-1 text-[12px] font-black text-white" style={{ background: DOC_BLUE }}>{durationChip}</span>
                        </div>
                    </div>

                    {days.length === 0 ? (
                        <DocCard className="text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300">edit_calendar</span>
                            <p className="mt-2 text-sm font-black text-slate-500">日程は現在準備中です。</p>
                        </DocCard>
                    ) : (
                        days.map((day, i) => <DayCard key={day.day || i} day={{ ...(day as unknown as DocDay), day: day.day || i + 1 }} />)
                    )}

                    <GuideTips
                        notices={guideNotices}
                        emergencyPhone={guideSettings.emergencyPhone || guide?.phone}
                        emergencyEmail={guideSettings.emergencyEmail}
                        closingMessage={guideSettings.closingMessage || 'モンゴルの大自然と文化を心ゆくまでお楽しみください。'}
                    />

                    {detail.note && (
                        <p className="px-1 text-[11px] font-bold text-slate-400">※ {detail.note}</p>
                    )}

                    <DocFooter />

                    <div className="no-print sticky bottom-3 flex justify-center">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-white shadow-lg transition-transform active:scale-95"
                            style={{ background: `linear-gradient(135deg, #2F86FF 0%, #1656D6 100%)`, boxShadow: '0 10px 24px rgba(40,125,250,0.4)' }}
                        >
                            <span className="material-symbols-outlined text-base">print</span>
                            印刷 / PDF保存
                        </button>
                    </div>
                </main>
            </div>
            </>
        </>
    );
};
