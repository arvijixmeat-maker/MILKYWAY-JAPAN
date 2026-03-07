import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

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
        const fetchEstimate = async () => {
            try {
                const data = await api.quotes.get(id as string);
                if (data) {
                    setEstimate({
                        id: data.id,
                        status: data.status,
                        statusLabel:
                            data.status === 'converted' ? '予約確定済' :
                                data.status === 'reservation_requested' ? '予約リクエスト済' :
                                    data.status === 'answered' ? 'お見積り到着' :
                                        data.status === 'processing' ? 'お見積り作成中' : '受付完了',
                        adminStatus: data.status,
                        // Fix: Use data.destination (string) and split it if needed for title
                        title: data.title || `${data.destination} 旅行見積もり`,
                        date: data.travel_dates || data.period, // data.period is used in CustomEstimate
                        type: data.trip_type || 'オーダーメイド',
                        people: data.travelers || data.headcount,
                        requestDate: new Date(data.created_at).toLocaleDateString('ko-KR') + ' リクエスト',
                        // Fix: Map data.destination (string) to array
                        destinations: data.destination ? data.destination.split(', ') : [],
                        // Fix: Map data.travel_types to themes
                        themes: data.travel_types,
                        // Fix: Map data.accommodations (plural)
                        accommodations: data.accommodations,
                        vehicle: data.vehicle,
                        // Fix: Remove '만원' if it exists in data, or handled in UI. 
                        // Let's keep data raw here and handle UI carefully.
                        priceRange: data.budget,
                        additionalRequest: data.additional_request, // Check column name in CustomEstimate: additional_request
                        contact: { name: data.name, phone: data.phone, email: data.email }, // CustomEstimate uses name/phone/email columns directly on quotes? or joined?
                        // Wait, CustomEstimate inserts name, phone, email into quotes table directly.
                        // EstimateDetail line 50 was: contact: { name: data.customer_name, phone: data.phone, email: data.email }
                        // CustomEstimate Line 43: name: name, phone: phone...
                        // So it should be data.name.
                        estimateUrl: data.estimate_url,
                        adminNote: data.admin_note,
                        // Admin confirmed values
                        confirmedPrice: data.confirmed_price,
                        deposit: data.deposit,
                        confirmedStartDate: data.confirmed_start_date,
                        confirmedEndDate: data.confirmed_end_date
                    });
                }
            } catch (error) {
                console.error('Error fetching estimate:', error);
            }
        };
        fetchEstimate();
    }, [id]);

    if (!estimate) {
        return (
            <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
                <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-gray-50 dark:bg-zinc-900 shadow-xl overflow-x-hidden items-center justify-center">
                    <p className="text-gray-500">お見積り情報が見つかりません。</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">戻る</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
            <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-gray-50 dark:bg-zinc-900 shadow-xl overflow-x-hidden pb-[100px]">
                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-gray-50/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 py-4 transition-colors border-b border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-text-main dark:text-white hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-text-main dark:text-white flex-1 text-center pr-8">見積り詳細</h1>
                </div>

                <div className="px-5 pt-6 flex flex-col gap-6">
                    {/* Timeline */}
                    <div className="mb-2">
                        <div className="relative flex justify-between items-start max-w-[280px] mx-auto">
                            {/* Background Lines */}
                            <div className="absolute top-[12px] left-0 right-0 h-[2px] bg-gray-100 dark:bg-zinc-700 z-0"></div>
                            {/* Active Line - Dynamic width based on status */}
                            <div
                                className={`absolute top-[12px] left-0 h-[2px] bg-primary z-0 transition-all duration-500`}
                                style={{
                                    width: estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested' ? '100%' :
                                        estimate.adminStatus === 'processing' ? '50%' : '0%'
                                }}
                            ></div>

                            {/* Step 1: 접수 */}
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`size-6 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-sm transition-colors ${true ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'
                                    }`}>
                                    <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                                </div>
                                <span className={`text-[11px] font-bold ${true ? 'text-primary' : 'text-gray-400'}`}>お見積り受付</span>
                            </div>

                            {/* Step 2: 작성 */}
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`size-6 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-sm transition-colors ${estimate.adminStatus === 'processing' || estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested'
                                    ? 'bg-primary'
                                    : 'bg-gray-200 dark:bg-zinc-700'
                                    }`}>
                                    {estimate.adminStatus === 'processing' ? (
                                        <div className="size-2 bg-white rounded-full animate-pulse"></div>
                                    ) : (estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested') ? (
                                        <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                                    ) : (
                                        <div className="size-2 bg-gray-400 dark:bg-zinc-500 rounded-full"></div>
                                    )}
                                </div>
                                <span className={`text-[11px] font-bold ${estimate.adminStatus === 'processing' || estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested'
                                    ? 'text-primary'
                                    : 'text-gray-400'
                                    }`}>お見積り作成</span>
                            </div>

                            {/* Step 3: 발송 */}
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`size-6 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-sm transition-colors ${estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested'
                                    ? 'bg-primary'
                                    : 'bg-gray-200 dark:bg-zinc-700'
                                    }`}>
                                    {(estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested') ? (
                                        <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                                    ) : (
                                        <div className="size-2 bg-gray-400 dark:bg-zinc-500 rounded-full"></div>
                                    )}
                                </div>
                                <span className={`text-[11px] font-bold ${estimate.adminStatus === 'answered' || estimate.adminStatus === 'converted' || estimate.status === 'answered' || estimate.adminStatus === 'reservation_requested'
                                    ? 'text-primary'
                                    : 'text-gray-400'
                                    }`}>送信完了</span>
                            </div>
                        </div>
                    </div>

                    {/* Reservation Conversion Banner - Show when converted */}
                    {estimate.status === 'converted' && (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-teal-500 to-emerald-500 p-[1px] shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="relative bg-gradient-to-br from-primary/95 via-teal-500/95 to-emerald-500/95 backdrop-blur-xl rounded-2xl p-5">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                                <div className="relative z-10">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                                            <span className="material-symbols-outlined text-2xl text-white">verified</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-white mb-0.5">ご予約を承りました！</h3>
                                            <p className="text-white/70 text-sm">ご予約金のご入金後に最終確定となります</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-white/80 text-sm">info</span>
                                            <span className="text-white/90 text-xs font-semibold tracking-wide">次のステップ</span>
                                        </div>
                                        <p className="text-white text-sm leading-relaxed">
                                            マイ予約ページから <span className="font-semibold bg-white/20 px-1.5 py-0.5 rounded">振込先口座</span> と
                                            <span className="font-semibold bg-white/20 px-1.5 py-0.5 rounded ml-1">予約詳細</span> をご確認ください。
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => navigate('/mypage/reservations')}
                                        className="w-full py-3.5 bg-white text-primary font-bold rounded-xl hover:bg-white/95 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                                    >
                                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                        マイ予約で確認する
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status & Title */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700">
                        {/* Status Label */}
                        <div className="flex items-center justify-between mb-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${(estimate.status === 'completed' || estimate.status === 'reservation_requested' || estimate.status === 'converted') ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
                                {estimate.statusLabel}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug mb-2">{estimate.title}</h2>
                        <p className="text-sm text-slate-400">{estimate.requestDate}</p>

                        {/* Admin Response Section - Visible only when answered */}
                        {(estimate.status === 'completed' || estimate.status === 'reservation_requested' || estimate.status === 'converted' || estimate.status === 'answered') && (
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-zinc-700">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {estimate.estimateUrl && (
                                        <a
                                            href={estimate.estimateUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                                        >
                                            <span className="material-symbols-outlined">description</span>
                                            見積書を確認
                                        </a>
                                    )}

                                    {estimate.status === 'answered' ? (
                                        (estimate.confirmedPrice && estimate.confirmedPrice > 0) ? (
                                            <button
                                                onClick={handleConfirmReservation}
                                                className={`flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all active:scale-[0.98] shadow-md shadow-slate-200 dark:shadow-none ${!estimate.estimateUrl ? 'col-span-2' : ''}`}
                                            >
                                                <span className="material-symbols-outlined">event_available</span>
                                                予約をリクエストする
                                            </button>
                                        ) : (
                                            <div className="col-span-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 p-4 rounded-xl text-center">
                                                <p className="text-sm text-amber-600 dark:text-amber-400 font-bold mb-1">ご相談の上、金額が確定次第ご予約可能となります。</p>
                                                <p className="text-xs text-amber-500/70">管理者が金額を入力すると、予約ボタンが有効になります。</p>
                                            </div>
                                        )
                                    ) : (
                                        <button
                                            onClick={handleReservationRequest}
                                            disabled={estimate.adminStatus === 'reservation_requested' || estimate.adminStatus === 'converted'}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-[0.98] shadow-md ${!estimate.estimateUrl ? 'col-span-2' : ''} ${estimate.adminStatus === 'reservation_requested' || estimate.adminStatus === 'converted'
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-100'
                                                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined">event_available</span>
                                            {estimate.adminStatus === 'reservation_requested' ? 'お申し込み完了' : '予約相談の申し込み'}
                                        </button>
                                    )}
                                </div>

                                {(estimate.confirmedPrice && estimate.confirmedPrice > 0) && (
                                    <div className="bg-gray-50 dark:bg-zinc-700/30 border border-gray-100 dark:border-zinc-700 p-4 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">確定金額合計</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{estimate.confirmedPrice.toLocaleString()}円</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-primary dark:text-primary-light font-bold">今すぐお支払いいただくご予約金</span>
                                            <span className="font-bold text-primary dark:text-primary-light">{(estimate.deposit || 0).toLocaleString()}円</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200 dark:border-zinc-700">
                                            <span className="text-gray-400">現地決済残金</span>
                                            <span className="font-medium text-gray-600 dark:text-gray-300">{(estimate.confirmedPrice - (estimate.deposit || 0)).toLocaleString()}円</span>
                                        </div>
                                    </div>
                                )}

                                {estimate.adminNote && (
                                    <div className="bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-xl text-sm text-gray-600 dark:text-gray-300">
                                        <p className="font-bold mb-1 text-gray-800 dark:text-gray-200">管理者メッセージ</p>
                                        <div className="whitespace-pre-wrap">{estimate.adminNote}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Summary Info */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-700/50 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-lg">calendar_today</span>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 mb-0.5">旅行日程</h3>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{estimate.date}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-700/50 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-lg">diversity_3</span>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 mb-0.5">旅行人数＆タイプ</h3>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{estimate.type} · {estimate.people}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-700/50 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-lg">attach_money</span>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 mb-0.5">希望予算負担 (1人あたり)</h3>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{estimate.priceRange} ~</p>
                            </div>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">選択オプション</h3>
                        <div className="space-y-4">
                            <div>
                                <span className="text-xs font-bold text-slate-400 block mb-1.5">希望目的地</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {estimate.destinations?.map((item: string, idx: number) => (
                                        <span key={idx} className="px-2.5 py-1 bg-gray-50 dark:bg-zinc-700 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300">{item}</span>
                                    )) || <span className="text-sm text-slate-400">選択なし</span>}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 block mb-1.5">旅行テーマ</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {estimate.themes?.map((item: string, idx: number) => (
                                        <span key={idx} className="px-2.5 py-1 bg-gray-50 dark:bg-zinc-700 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300">{item}</span>
                                    )) || <span className="text-sm text-slate-400">選択なし</span>}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 block mb-1.5">希望宿泊施設</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {estimate.accommodations?.map((item: string, idx: number) => (
                                        <span key={idx} className="px-2.5 py-1 bg-gray-50 dark:bg-zinc-700 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300">{item}</span>
                                    )) || <span className="text-sm text-slate-400">選択なし</span>}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 block mb-1.5">希望車両</span>
                                <span className="px-2.5 py-1 bg-gray-50 dark:bg-zinc-700 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300">{estimate.vehicle || '選択なし'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Request */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">その他ご要望</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {estimate.additionalRequest || 'なし'}
                        </p>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700 mb-6">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">申込者情報</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">名前</span>
                                <span className="font-medium text-slate-900 dark:text-white">{estimate.contact?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">電話番号</span>
                                <span className="font-medium text-slate-900 dark:text-white">{estimate.contact?.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Email</span>
                                <span className="font-medium text-slate-900 dark:text-white">{estimate.contact?.email}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <BottomNav />
            </div>
        </div>
    );
};
