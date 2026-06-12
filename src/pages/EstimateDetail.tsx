import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { SEO } from '../components/seo/SEO';
import {
    DocTopBar, DocHero, DocCard, TripInfoGrid, PaymentSummary,
    IncludeExclude, BookingSteps, DayCard, GuideTips, DocFooter,
    DOC_BLUE, DOC_NAVY, type DocDay,
} from '../components/document/TripDocParts';

export const EstimateDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [estimate, setEstimate] = useState<any>(null);
    const { showToast, showConfirm } = useToast();

    const handleReservationRequest = async () => {
        const confirmed = await showConfirm({
            title: '予約相談の申し込み',
            message: '予約相談を申し込みますか？\nお申し込み後、担当者が確認してご案内いたします。',
            confirmText: '申し込む',
            cancelText: 'キャンセル',
            type: 'info'
        });

        if (!confirmed) return;

        try {
            const { error } = await (api.quotes as any).update(id, { status: 'reservation_requested' });
            if (error) throw error;

            setEstimate((prev: any) => ({ ...prev, adminStatus: 'reservation_requested', statusLabel: '予約リクエスト済' }));
            showToast('success', '予約相談のお申し込みを受け付けました。担当者が確認後、すぐにご連絡いたします。');
        } catch (error) {
            console.error("Failed to update status:", error);
            showToast('error', 'エラーが発生しました。もう一度お試しください。');
        }
    };

    const handleConfirmReservation = async () => {
        // 1. Confirm Dialog
        const confirmed = await showConfirm({
            title: '予約リクエスト',
            message: 'この見積内容で予約を進めますか？',
            confirmText: '予約リクエスト',
            cancelText: 'キャンセル',
            type: 'info'
        });

        if (!confirmed) return;

        try {
            const me = await api.auth.me();
            if (!me) {
                showToast('error', 'ログインが必要です。');
                navigate('/login');
                return;
            }

            // Navigate to payment page with quote data
            // Parse people count: "성인 3명, 아동 3명" → 3 + 3 = 6
            let totalPeopleCount = 2; // default
            if (estimate.people) {
                const peopleStr = String(estimate.people);
                const matches = peopleStr.match(/\d+/g); // Extract all numbers
                if (matches && matches.length > 0) {
                    totalPeopleCount = matches.reduce((sum, num) => sum + parseInt(num), 0);
                }
            }

            // Use confirmed price from admin if available
            const confirmedTotalPrice = estimate.confirmedPrice || 0;
            // Use admin set deposit if available, otherwise 10% default
            const depositAmount = (estimate.deposit !== undefined && estimate.deposit !== null)
                ? estimate.deposit
                : Math.floor(confirmedTotalPrice * 0.1);
            const localAmount = confirmedTotalPrice - depositAmount;

            navigate('/payment', {
                state: {
                    isQuote: true,
                    quoteId: id,
                    product: {
                        id: id,
                        name: estimate.title || `${estimate.destinations?.[0] || 'オーダーメイド'} 旅行`,
                        duration: estimate.date || '',
                        price: confirmedTotalPrice,
                    },
                    totalPeople: totalPeopleCount,
                    priceBreakdown: {
                        total: confirmedTotalPrice,
                        deposit: depositAmount,
                        local: localAmount
                    },
                    customerInfo: {
                        name: estimate.contact?.name || '',
                        phone: estimate.contact?.phone || '',
                        email: estimate.contact?.email || ''
                    }
                }
            });

        } catch (error) {
            console.error("Failed to proceed:", error);
            showToast('error', 'エラーが発生しました。');
        }
    };

    useEffect(() => {
        // Helper: quote fields like travel_types / accommodations are stored as JSON strings in D1.
        // If the server hasn't parsed them, we parse defensively here.
        const asArray = (val: any): string[] => {
            if (!val) return [];
            if (Array.isArray(val)) return val.filter(Boolean);
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (trimmed.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        return Array.isArray(parsed) ? parsed.filter(Boolean) : [trimmed];
                    } catch {
                        return [trimmed];
                    }
                }
                // Comma-separated fallback (e.g. "中央モンゴル, ゴビ砂漠")
                return trimmed.split(/,\s*/).filter(Boolean);
            }
            return [];
        };

        const fetchEstimate = async () => {
            try {
                const data = await api.quotes.get(id as string);
                if (!data) return;

                const createdAtRaw = data.created_at || data.createdAt;
                const createdAtDate = createdAtRaw ? new Date(createdAtRaw) : null;
                const createdAtStr = createdAtDate && !isNaN(createdAtDate.getTime())
                    ? createdAtDate.toLocaleDateString('ja-JP')
                    : '—';

                setEstimate({
                    id: data.id,
                    status: data.status,
                    statusLabel:
                        data.status === 'converted' ? '予約確定済' :
                            data.status === 'reservation_requested' ? '予約リクエスト済' :
                                data.status === 'answered' ? 'お見積り到着' :
                                    data.status === 'processing' ? 'お見積り作成中' : '受付完了',
                    adminStatus: data.status,
                    title: data.title || `${data.destination || 'オーダーメイド'} 旅行見積もり`,
                    date: data.travel_dates || data.period,
                    type: data.trip_type || 'オーダーメイド',
                    people: data.travelers || data.headcount,
                    requestDate: createdAtStr,
                    destinations: asArray(data.destination),
                    themes: asArray(data.travel_types ?? data.travelTypes),
                    accommodations: asArray(data.accommodations),
                    vehicle: data.vehicle,
                    priceRange: data.budget,
                    additionalRequest: data.additional_request,
                    contact: { name: data.name, phone: data.phone, email: data.email },
                    estimateUrl: data.estimate_url,
                    adminNote: data.admin_note,
                    confirmedPrice: data.confirmed_price,
                    deposit: data.deposit,
                    confirmedStartDate: data.confirmed_start_date,
                    confirmedEndDate: data.confirmed_end_date,
                    itinerary: data.itinerary || null,
                    documentContent: data.documentContent || null,
                });
            } catch (error) {
                console.error('Error fetching estimate:', error);
            }
        };
        fetchEstimate();
    }, [id]);

    if (!estimate) {
        return (
            <>
                <SEO title="お見積もり" description="お客様専用のお見積もりページです。" robots="noindex, nofollow" />
                <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
                    <div className="relative flex h-full min-h-screen w-full max-w-[920px] flex-col bg-gray-50 dark:bg-zinc-900 shadow-xl overflow-x-hidden items-center justify-center">
                        <p className="text-gray-500">お見積り情報が見つかりません。</p>
                        <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">戻る</button>
                    </div>
                </div>
            </>
        );
    }

    // ── 발송 여부/표시용 파생값 ──
    const isSent = estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested';
    const isWriting = estimate.adminStatus === 'processing';
    const quoteNumber = String(estimate.id || '').slice(0, 8).toUpperCase();
    const periodLabel = (estimate.confirmedStartDate && estimate.confirmedEndDate)
        ? `${String(estimate.confirmedStartDate).slice(0, 10)} 〜 ${String(estimate.confirmedEndDate).slice(0, 10)}`
        : (estimate.date || '日程調整中');
    const ds = estimate.documentContent?.documentSettings;
    const splitLines = (t?: string) => (t || '').split(/\r?\n/).map((x: string) => x.trim()).filter(Boolean);
    const includedList = splitLines(ds?.overview?.includedText).length > 0 ? splitLines(ds?.overview?.includedText)
        : ['空港送迎・専用車', '全行程の宿泊（ホテル・ゲル）', '日程表内のお食事', '日本語ガイド', '観光入場料・各種体験'];
    const excludedList = splitLines(ds?.overview?.excludedText).length > 0 ? splitLines(ds?.overview?.excludedText)
        : ['国際線航空券', '海外旅行保険', '個人的な費用（お土産・飲み物など）'];
    const notices = (ds?.guide?.notices || []).filter((n: any) => n?.title);
    const guideNotices = notices.length > 0 ? notices : [
        { title: '服装について', body: '朝夕は冷え込む場合があるため、羽織れる上着をご用意ください。' },
        { title: 'お食事について', body: 'アレルギーや食事制限がある場合は事前にお知らせください。' },
    ];
    const docDays: DocDay[] = (estimate.itinerary && Array.isArray(estimate.itinerary.days)) ? estimate.itinerary.days : [];

    const stepDone = [true, isWriting || isSent, isSent];
    const stepLabels = ['お見積り受付', 'お見積り作成', '送信完了'];

    return (
        <>
            <SEO
                title="お見積もり"
                description="お客様専用のお見積もりページです。"
                robots="noindex, nofollow"
            />
            <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
            <div className="relative flex h-full min-h-screen w-full max-w-[920px] flex-col shadow-xl overflow-x-hidden pb-[100px]" style={{ background: '#F2F5FA' }}>
                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-white/95 backdrop-blur-sm px-4 py-4 transition-colors border-b border-slate-100">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 transition-colors"
                        style={{ color: DOC_NAVY }}
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-black flex-1 text-center pr-8" style={{ color: DOC_NAVY }}>お見積り詳細</h1>
                </div>

                <div className="px-4 pt-4 sm:px-6 flex flex-col gap-4">
                    {/* 진행 타임라인 (접수→작성→발송) */}
                    <div className="rounded-2xl bg-white px-5 py-4 shadow-[0_8px_24px_rgba(11,27,69,0.06)]">
                        <div className="relative flex justify-between items-start max-w-[300px] mx-auto">
                            <div className="absolute top-[12px] left-0 right-0 h-[2px] bg-slate-100 z-0" />
                            <div className="absolute top-[12px] left-0 h-[2px] z-0 transition-all duration-500" style={{ width: isSent ? '100%' : isWriting ? '50%' : '0%', background: DOC_BLUE }} />
                            {stepLabels.map((label, i) => (
                                <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                                    <div className="size-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm" style={{ background: stepDone[i] ? DOC_BLUE : '#E2E8F0' }}>
                                        {stepDone[i]
                                            ? <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                                            : <div className="size-2 rounded-full bg-slate-400" />}
                                    </div>
                                    <span className="text-[11px] font-black" style={{ color: stepDone[i] ? DOC_BLUE : '#94A3B8' }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 예약 전환 완료 배너 */}
                    {estimate.status === 'converted' && (
                        <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xl" style={{ background: 'linear-gradient(135deg, #0B1B45 0%, #1656D6 70%, #287DFA 100%)' }}>
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20">
                                    <span className="material-symbols-outlined text-2xl">verified</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-lg mb-0.5">ご予約を承りました！</h3>
                                    <p className="text-white/75 text-sm">ご予約金のご入金後に最終確定となります</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/mypage/reservations')}
                                className="w-full py-3.5 bg-white font-black rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                style={{ color: '#1656D6' }}
                            >
                                <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                マイ予約で確認する
                            </button>
                        </div>
                    )}

                    {/* ─── 견적서 문서 (Trip.com식 블루 디자인) ─── */}
                    <DocTopBar docLabel="お見積" number={quoteNumber} date={estimate.requestDate} />
                    <DocHero
                        eyebrow="あなただけの特別な旅へ"
                        title={estimate.title}
                        subtitle="大切なご旅行のために、心を込めてご用意したお見積りです。"
                        chips={[periodLabel, String(estimate.people || '')].filter(Boolean) as string[]}
                    />

                    <TripInfoGrid items={[
                        { icon: 'person', label: 'ご旅行者名', value: `${estimate.contact?.name || '—'} 様` },
                        { icon: 'flag', label: 'ツアー名', value: estimate.title },
                        { icon: 'groups', label: 'ご人数', value: estimate.people || '—' },
                        { icon: 'support_agent', label: 'ガイド', value: '日本語ガイド' },
                        { icon: 'calendar_month', label: 'ご旅行期間', value: periodLabel },
                        { icon: 'directions_car', label: '車両', value: estimate.vehicle || '専用車' },
                    ]} />

                    {(estimate.confirmedPrice && estimate.confirmedPrice > 0) ? (
                        <PaymentSummary total={estimate.confirmedPrice} deposit={estimate.deposit || 0} />
                    ) : isSent ? (
                        <DocCard>
                            <p className="text-center text-[13px] font-black text-amber-600">ご相談の上、金額が確定次第ご予約可能となります。</p>
                            <p className="mt-1 text-center text-[11px] font-bold text-amber-500/80">担当者が金額を確定するとご予約ボタンが有効になります。</p>
                        </DocCard>
                    ) : null}

                    {/* CTA — 견적서 확인 / 예약 요청 (기존 로직 그대로) */}
                    {isSent && (
                        <div className="grid grid-cols-1 gap-2.5">
                            {estimate.estimateUrl && (
                                <a
                                    href={estimate.estimateUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-white transition-all active:scale-[0.98]"
                                    style={{ background: DOC_NAVY }}
                                >
                                    <span className="material-symbols-outlined">description</span>
                                    お見積書（添付）を確認
                                </a>
                            )}
                            {estimate.status === 'answered' ? (
                                (estimate.confirmedPrice && estimate.confirmedPrice > 0) ? (
                                    <button
                                        onClick={handleConfirmReservation}
                                        className="flex items-center justify-center gap-2 py-4 rounded-xl font-black text-white transition-all active:scale-[0.98] shadow-lg"
                                        style={{ background: `linear-gradient(135deg, #2F86FF 0%, #1656D6 100%)`, boxShadow: '0 10px 24px rgba(40,125,250,0.35)' }}
                                    >
                                        <span className="material-symbols-outlined">event_available</span>
                                        この内容で予約をリクエストする
                                    </button>
                                ) : null
                            ) : (
                                <button
                                    onClick={handleReservationRequest}
                                    disabled={estimate.adminStatus === 'reservation_requested' || estimate.adminStatus === 'converted'}
                                    className={`flex items-center justify-center gap-2 py-4 rounded-xl font-black transition-all active:scale-[0.98] ${estimate.adminStatus === 'reservation_requested' || estimate.adminStatus === 'converted'
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'text-white shadow-lg'}`}
                                    style={estimate.adminStatus === 'reservation_requested' || estimate.adminStatus === 'converted' ? undefined : { background: `linear-gradient(135deg, #2F86FF 0%, #1656D6 100%)`, boxShadow: '0 10px 24px rgba(40,125,250,0.35)' }}
                                >
                                    <span className="material-symbols-outlined">event_available</span>
                                    {estimate.adminStatus === 'reservation_requested' ? 'お申し込み完了' : '予約相談を申し込む'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* 담당자 메시지 */}
                    {estimate.adminNote && (
                        <DocCard>
                            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-black" style={{ color: DOC_NAVY }}>
                                <span className="material-symbols-outlined text-[18px]" style={{ color: DOC_BLUE }}>chat</span>担当者からのメッセージ
                            </p>
                            <div className="whitespace-pre-wrap rounded-xl bg-[#F4F8FF] p-4 text-[13px] font-semibold leading-relaxed text-slate-600">{estimate.adminNote}</div>
                        </DocCard>
                    )}

                    {!isSent && (
                        <DocCard>
                            <p className="text-center text-[13px] font-black" style={{ color: DOC_NAVY }}>担当者がお見積りを作成しています</p>
                            <p className="mt-1 text-center text-[11.5px] font-bold text-slate-500">完成次第、メールでお知らせいたします。今しばらくお待ちください。</p>
                        </DocCard>
                    )}

                    {isSent && <IncludeExclude included={includedList} excluded={excludedList} />}

                    {/* 상세 일정표 */}
                    {docDays.length > 0 && (
                        <>
                            <div className="mt-2 px-1">
                                <p className="text-[11px] font-black tracking-[0.18em]" style={{ color: DOC_BLUE }}>TOUR ITINERARY</p>
                                <div className="flex items-end justify-between">
                                    <h2 className="text-[22px] font-black" style={{ color: DOC_NAVY }}>ご旅行日程表</h2>
                                    <span className="rounded-full px-3 py-1 text-[12px] font-black text-white" style={{ background: DOC_BLUE }}>全{docDays.length}日間</span>
                                </div>
                            </div>
                            {docDays.map((day, i) => <DayCard key={i} day={{ ...day, day: day.day || i + 1 }} />)}
                        </>
                    )}

                    {isSent && <BookingSteps />}

                    {isSent && <GuideTips
                        notices={guideNotices}
                        emergencyPhone={ds?.guide?.emergencyPhone}
                        emergencyEmail={ds?.guide?.emergencyEmail}
                        closingMessage={ds?.guide?.closingMessage || 'モンゴルの大自然と文化を心ゆくまでお楽しみください。'}
                    />}

                    {/* ご依頼内容（고객이 보낸 요청 조건) */}
                    <DocCard>
                        <p className="mb-3 flex items-center gap-1.5 text-[13px] font-black" style={{ color: DOC_NAVY }}>
                            <span className="material-symbols-outlined text-[18px]" style={{ color: DOC_BLUE }}>fact_check</span>ご依頼内容
                        </p>
                        <div className="space-y-3 text-[12.5px]">
                            <div className="flex flex-wrap gap-1.5">
                                {[...(estimate.destinations || []), ...(estimate.themes || []), ...(estimate.accommodations || [])].map((item: string, idx: number) => (
                                    <span key={idx} className="rounded-md bg-[#F4F8FF] px-2.5 py-1 text-[11.5px] font-bold" style={{ color: '#1656D6' }}>{item}</span>
                                ))}
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-3"><span className="font-bold text-slate-400">ご希望予算（お一人）</span><b style={{ color: DOC_NAVY }}>{estimate.priceRange || '—'}</b></div>
                            {estimate.additionalRequest && (
                                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-semibold leading-relaxed text-slate-600">{estimate.additionalRequest}</p>
                            )}
                            <div className="flex justify-between border-t border-slate-100 pt-3"><span className="font-bold text-slate-400">お名前</span><b style={{ color: DOC_NAVY }}>{estimate.contact?.name}</b></div>
                            <div className="flex justify-between"><span className="font-bold text-slate-400">お電話</span><b style={{ color: DOC_NAVY }}>{estimate.contact?.phone}</b></div>
                            <div className="flex justify-between"><span className="font-bold text-slate-400">メール</span><b className="break-all" style={{ color: DOC_NAVY }}>{estimate.contact?.email}</b></div>
                        </div>
                    </DocCard>

                    <DocFooter />
                </div>

                <BottomNav />
            </div>
        </div>
        </>
    );
};
