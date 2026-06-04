import React, { useState, useEffect } from 'react';

import { GuideSelectionModal, AccommodationSelectionModal } from './SelectionModals';
import { sendNotificationEmail } from '../../lib/email';

export interface QuoteRequest {
    id: string;
    type: 'personal' | 'business';
    name: string;
    destination: string;
    headcount: string;
    period: string;
    date: string;
    status: 'new' | 'processing' | 'completed' | 'converted' | 'reservation_requested' | 'answered';
    adminNote?: string;
    estimateUrl?: string;
    userId?: string;
    // Detailed fields
    phone: string;
    email: string;
    travelTypes: string[];
    accommodations: string[];
    vehicle: string;
    budget: string;
    additionalRequest: string;
    attachment?: File | Blob;
    createdAt: string;
    confirmed_price?: number;
    confirmed_start_date?: string;
    confirmed_end_date?: string;
    deposit?: number;
    deposit_status?: 'paid' | 'unpaid';
    balance_status?: 'paid' | 'unpaid';
}

// Helper functions for currency formatting
const formatNumber = (num: number | string) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const unformatNumber = (str: string) => {
    return parseInt(str.replace(/,/g, '')) || 0;
};

// Conversion Modal Component
export const ConvertSelectionModal: React.FC<{
    request: QuoteRequest | null;
    onClose: () => void;
    onConvert: (data: { startDate: string; endDate: string; totalAmount: number; deposit: number }) => void;
}> = ({ request, onClose, onConvert }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);
    const [deposit, setDeposit] = useState(0);

    useEffect(() => {
        if (!request) return;

        // 1순위: 이미 견적서에서 확정된 금액/날짜가 있으면 우선 사용
        if (request.confirmed_start_date) setStartDate(request.confirmed_start_date.substring(0, 10));
        if (request.confirmed_end_date) setEndDate(request.confirmed_end_date.substring(0, 10));
        if (request.confirmed_price) {
            setTotalAmount(request.confirmed_price);
            setDeposit(request.deposit || Math.floor(request.confirmed_price * 0.1));
            return;
        }

        // 2순위: 확정 데이터 없으면 period 문자열 파싱
        if (!request.confirmed_start_date && request.period && request.period.includes('~')) {
            const parts = request.period.split('~').map(p => p.trim());
            if (parts.length === 2) {
                if (parts[0].includes('-') && parts[0].length >= 10) {
                    setStartDate(parts[0].substring(0, 10));
                    setEndDate(parts[1].substring(0, 10));
                } else if (parts[0].includes('.')) {
                    const year = new Date().getFullYear();
                    const [startMonth, startDay] = parts[0].split('.').map(n => n.padStart(2, '0'));
                    const [endMonth, endDay] = parts[1].split('.').map(n => n.padStart(2, '0'));
                    setStartDate(`${year}-${startMonth}-${startDay}`);
                    setEndDate(`${year}-${endMonth}-${endDay}`);
                }
            }
        }

        // 3순위: 금액은 예산 문자열에서 파싱
        if (!request.confirmed_price && request.budget) {
            const budgetMatch = request.budget.match(/(\d+)/);
            if (budgetMatch) {
                const budgetNum = parseInt(budgetMatch[1]) * 10000;
                setTotalAmount(budgetNum);
                setDeposit(Math.floor(budgetNum * 0.1));
            }
        }
    }, [request]);

    if (!request) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">sync_alt</span>
                        예약 확정 및 전환
                    </h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200 text-sm rounded-lg mb-4">
                        <b>{request.name}</b>님의 견적 요청을 정식 예약으로 전환합니다.<br />
                        확정된 일정과 금액을 입력해주세요.
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">여행 시작일</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">여행 종료일</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">총 확정 금액 (원)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="0"
                                    value={formatNumber(totalAmount)}
                                    onChange={e => {
                                        const val = unformatNumber(e.target.value);
                                        setTotalAmount(val);
                                        if (deposit === 0) setDeposit(Math.floor(val * 0.1));
                                    }}
                                    className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary font-bold text-right pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">원</span>
                            </div>
                            {totalAmount > 0 && (
                                <p className="text-[10px] font-bold text-primary/70 ml-1">
                                    ≈ {typeof totalAmount === 'number' && !isNaN(totalAmount) ? (totalAmount / 10000).toLocaleString() : 0}만원
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">예약금 (원)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="0"
                                    value={formatNumber(deposit)}
                                    onChange={e => setDeposit(unformatNumber(e.target.value))}
                                    className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary font-bold text-right text-primary pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">원</span>
                            </div>
                            {deposit > 0 && (
                                <p className="text-[10px] font-bold text-primary/70 ml-1">
                                    ≈ {typeof deposit === 'number' && !isNaN(deposit) ? (deposit / 10000).toLocaleString() : 0}만원
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Balance Preview */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${totalAmount - deposit < 0 ? 'bg-red-50 border-red-100' : 'bg-primary/5 border-primary/10'}`}>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${totalAmount - deposit < 0 ? 'text-red-600' : 'text-primary'}`}>예상 현지 지불 잔금</span>
                            {totalAmount - deposit < 0 && (
                                <span className="text-[9px] text-red-500 font-bold mt-0.5 animate-pulse">! 예약금이 총액을 초과했습니다</span>
                            )}
                        </div>
                        <span className={`text-base font-extrabold ${totalAmount - deposit < 0 ? 'text-red-600' : 'text-primary'}`}>
                            {typeof totalAmount === 'number' && typeof deposit === 'number' && !isNaN(totalAmount) && !isNaN(deposit) ? (totalAmount - deposit).toLocaleString() : 0}원
                        </span>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg text-sm"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => {
                            if (!startDate || !endDate || totalAmount <= 0) {
                                alert('날짜와 금액을 모두 입력해주세요.');
                                return;
                            }
                            onConvert({ startDate, endDate, totalAmount, deposit });
                        }}
                        className="px-4 py-2 bg-primary-dark hover:bg-primary-dark text-white font-bold rounded-lg text-sm shadow-lg shadow-primary/20"
                    >
                        예약 생성 및 확정
                    </button>
                </div>
            </div>
        </div>
    );
};

// Quote Detail Modal (Updated to receive onOpenConvert)
export const QuoteDetailModal: React.FC<{
    request: QuoteRequest | null;
    onClose: () => void;
    onSendEstimate: (url: string, note: string, priceDetail: any, startDate: string, endDate: string) => void;
    onOpenConvert: () => void;
    onUpdateQuote: (id: string, updates: Partial<QuoteRequest>) => Promise<void>;
}> = ({ request, onClose, onSendEstimate, onOpenConvert, onUpdateQuote }) => {
    const [estimateUrl, setEstimateUrl] = useState(request?.estimateUrl || '');
    const [adminNote, setAdminNote] = useState(request?.adminNote || '');
    const [copiedEstimateUrl, setCopiedEstimateUrl] = useState(false);

    // --- Added for Centralized UI Integration ---
    const [priceDetail, setPriceDetail] = useState({
        totalAmount: request?.confirmed_price || 0,
        deposit: request?.deposit || 0,
        depositStatus: request?.deposit_status || 'unpaid',
        balanceStatus: request?.balance_status || 'unpaid'
    });
    const [assignedGuide, setAssignedGuide] = useState<any>(null);
    const [dailyAccommodations, setDailyAccommodations] = useState<any[]>([]);

    // Confirmed Dates
    const [confirmedStartDate, setConfirmedStartDate] = useState(request?.confirmed_start_date || '');
    const [confirmedEndDate, setConfirmedEndDate] = useState(request?.confirmed_end_date || '');

    // UI Toggles
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showAccommodationModal, setShowAccommodationModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState(1);
    const [extraDays, setExtraDays] = useState(0);

    const getTripDays = () => (1 + extraDays);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        destination: '',
        headcount: '',
        period: '',
        budget: '',
        travelTypes: [] as string[],
        accommodations: [] as string[],
        vehicle: '',
        confirmedPrice: 0,
        deposit: 0
    });

    useEffect(() => {
        if (request) {
            setEstimateUrl(request.estimateUrl || '');
            setAdminNote(request.adminNote || '');
            setEditForm({
                destination: request.destination,
                headcount: request.headcount,
                period: request.period,
                budget: request.budget,
                travelTypes: request.travelTypes,
                accommodations: request.accommodations,
                vehicle: request.vehicle,
                confirmedPrice: request.confirmed_price || 0,
                deposit: request.deposit || 0
            });
            // Reset priceDetail when request changes
            setPriceDetail({
                totalAmount: request.confirmed_price || 0,
                deposit: request.deposit || 0,
                depositStatus: request.deposit_status || 'unpaid',
                balanceStatus: request.balance_status || 'unpaid'
            });
            setConfirmedStartDate(request.confirmed_start_date || '');
            setConfirmedEndDate(request.confirmed_end_date || '');
        }
    }, [request]);

    const handleGuideAssign = (guide: any) => {
        setAssignedGuide({ ...guide });
    };

    const handleAccommodationAssign = (accommodation: any) => {
        const existingIndex = dailyAccommodations.findIndex(d => d.day === selectedDay);
        const newDaily = {
            day: selectedDay,
            accommodation: {
                id: accommodation.id,
                name: accommodation.name,
                type: accommodation.type
            }
        };
        const updated = existingIndex >= 0
            ? dailyAccommodations.map((d, i) => i === existingIndex ? newDaily : d)
            : [...dailyAccommodations, newDaily].sort((a, b) => a.day - b.day);
        setDailyAccommodations(updated);
    };

    const handleSendGuideInfo = async () => {
        if (!assignedGuide || !request) return;
        if (!confirm('가이드 배정 정보를 고객에게 이메일로 발송하시겠습니까?')) return;
        try {
            await sendNotificationEmail(
                request.email,
                'GUIDE_ASSIGNED',
                {
                    customerName: request.name,
                    productName: request.destination,
                    guideName: assignedGuide.name,
                    guidePhone: assignedGuide.phone
                }
            );
            alert('가이드 배정 정보가 발송되었습니다.');
        } catch (e) {
            console.error(e);
            alert('발송 실패');
        }
    };

    const handleSaveEdit = async () => {
        if (!request) return;

        await onUpdateQuote(request.id, {
            ...editForm
        } as any);
        setIsEditing(false);
    };

    if (!request) return null;

    const quoteStatusMeta: Record<string, { label: string; tone: string }> = {
        new: { label: '신규 요청', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
        processing: { label: '견적 작성 중', tone: 'bg-orange-50 text-orange-700 border-orange-200' },
        answered: { label: '견적 발송 완료', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
        reservation_requested: { label: '예약 요청', tone: 'bg-purple-50 text-purple-700 border-purple-200' },
        converted: { label: '예약 전환 완료', tone: 'bg-slate-100 text-slate-600 border-slate-200' },
        completed: { label: '완료', tone: 'bg-teal-50 text-teal-700 border-teal-200' },
    };

    const workflowSteps = [
        { key: 'new', label: '요청 확인', icon: 'fact_check' },
        { key: 'processing', label: '견적 작성', icon: 'edit_note' },
        { key: 'answered', label: '고객 발송', icon: 'outgoing_mail' },
        { key: 'reservation_requested', label: '예약 요청', icon: 'event_available' },
        { key: 'converted', label: '예약 전환', icon: 'task_alt' },
    ];

    const currentStepIndex = Math.max(0, workflowSteps.findIndex((step) => step.key === request.status));
    const statusMeta = quoteStatusMeta[request.status] || quoteStatusMeta.new;
    const checklistItems = [
        { label: '여행 조건 확인', done: Boolean(request.destination && request.headcount && request.period) },
        { label: '확정 일정 입력', done: Boolean(confirmedStartDate && confirmedEndDate) },
        { label: '금액/예약금 입력', done: priceDetail.totalAmount > 0 && priceDetail.deposit >= 0 },
        { label: '견적서 링크', done: Boolean(estimateUrl), optional: true },
        { label: '고객 안내문', done: Boolean(adminNote.trim()), optional: true },
    ];
    // 발송 필수 = 일정·금액·예약금만. 견적서 링크/안내문은 선택(고객은 시스템 견적 페이지로 받음).
    const canSendEstimate = checklistItems.filter((item) => !item.optional).every((item) => item.done) && priceDetail.totalAmount >= priceDetail.deposit;
    const quickNotes = [
        {
            label: '기본 안내',
            text: 'お見積りをご確認ください。日程・料金に問題がなければ、予約相談へお進みください。',
        },
        {
            label: '상담 유도',
            text: 'ご希望条件に合わせて日程と料金を調整しました。ご不明点や変更希望があればお気軽にご相談ください。',
        },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-gray-100 font-sans">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>
            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-primary"></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">맞춤 견적 관리</h2>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">No. {request.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <span className={`ml-2 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${statusMeta.tone}`}>
                            {statusMeta.label}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                        <div className="grid gap-3 md:grid-cols-5">
                            {workflowSteps.map((step, index) => {
                                const isActive = index === currentStepIndex;
                                const isDone = index < currentStepIndex;

                                return (
                                    <div
                                        key={step.key}
                                        className={`rounded-xl border p-3 transition-colors ${isActive
                                            ? 'border-primary/30 bg-white text-primary shadow-sm dark:bg-slate-800'
                                            : isDone
                                                ? 'border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300'
                                                : 'border-slate-100 bg-white/70 text-slate-400 dark:border-slate-700 dark:bg-slate-800/60'
                                            }`}
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="material-symbols-outlined text-[18px]">{isDone ? 'check_circle' : step.icon}</span>
                                            <span className="text-[10px] font-black">STEP {index + 1}</span>
                                        </div>
                                        <p className="text-xs font-black">{step.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <span className="material-symbols-outlined text-base text-primary">summarize</span>
                                    요청 요약
                                </h3>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300"
                                >
                                    정보 수정
                                </button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">고객</p>
                                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{request.name}</p>
                                    <p className="mt-1 truncate text-xs text-slate-500">{request.phone || request.email}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">여행 조건</p>
                                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{request.destination || '목적지 미정'}</p>
                                    <p className="mt-1 text-xs text-slate-500">{request.headcount || '인원 미정'} · {request.period || '일정 미정'}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">예산/차량</p>
                                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{request.budget || '예산 미정'}</p>
                                    <p className="mt-1 text-xs text-slate-500">{request.vehicle || '차량/가이드 미정'}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">견적 금액</p>
                                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{priceDetail.totalAmount ? `${priceDetail.totalAmount.toLocaleString()}엔` : '미입력'}</p>
                                    <p className="mt-1 text-xs text-slate-500">예약금 {priceDetail.deposit ? `${priceDetail.deposit.toLocaleString()}엔` : '0엔'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <h3 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <span className="material-symbols-outlined text-base text-primary">checklist</span>
                                발송 전 체크
                            </h3>
                            <div className="space-y-2">
                                {checklistItems.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {item.label}
                                            {item.optional && <span className="ml-1.5 text-[10px] font-bold text-slate-400">선택</span>}
                                        </span>
                                        <span className={`material-symbols-outlined text-[18px] ${item.done ? 'text-teal-500' : item.optional ? 'text-slate-200' : 'text-slate-300'}`}>
                                            {item.done ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quote Workspace */}
                    <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm dark:border-teal-500/20 dark:bg-slate-800">
                        <div className="flex flex-col gap-3 border-b border-teal-100 bg-teal-50/70 px-6 py-5 dark:border-teal-500/20 dark:bg-teal-500/10 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
                                    <span className="material-symbols-outlined text-[22px] text-primary">contract_edit</span>
                                    견적 작성 워크스페이스
                                </h3>
                                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    확정 일정과 금액·예약금만 입력하면 발송할 수 있습니다. 외부 견적서 없이 시스템 견적 페이지로 전달됩니다.
                                </p>
                            </div>
                            {request.status === 'reservation_requested' && (
                                <button
                                    onClick={onOpenConvert}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-600/20 transition-colors hover:bg-purple-700"
                                >
                                    <span className="material-symbols-outlined text-[20px]">sync_alt</span>
                                    예약으로 전환
                                </button>
                            )}
                        </div>

                        <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
                            <div className="space-y-5 border-b border-slate-100 p-6 dark:border-slate-700 lg:border-b-0 lg:border-r">
                                <div>
                                    <h4 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span className="material-symbols-outlined text-base text-primary">event</span>
                                        1. 확정 일정
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <label className="block">
                                            <span className="mb-1.5 block text-[10px] font-bold text-slate-400">시작일</span>
                                            <input
                                                type="date"
                                                value={confirmedStartDate}
                                                onChange={(e) => setConfirmedStartDate(e.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1.5 block text-[10px] font-bold text-slate-400">종료일</span>
                                            <input
                                                type="date"
                                                value={confirmedEndDate}
                                                onChange={(e) => setConfirmedEndDate(e.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span className="material-symbols-outlined text-base text-primary">payments</span>
                                        2. 금액 입력
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">총 결제금액</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={formatNumber(priceDetail.totalAmount)}
                                                    onChange={(e) => {
                                                        const total = unformatNumber(e.target.value);
                                                        // 예약금이 비어 있으면 10% 자동 제안
                                                        setPriceDetail(prev => ({
                                                            ...prev,
                                                            totalAmount: total,
                                                            deposit: prev.deposit ? prev.deposit : Math.floor(total * 0.1),
                                                        }));
                                                    }}
                                                    className="w-full bg-transparent text-right text-2xl font-black text-slate-900 outline-none dark:text-white"
                                                    placeholder="0"
                                                />
                                                <span className="text-sm font-bold text-slate-400">엔</span>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-500/30 dark:bg-teal-500/10">
                                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-300">예약금</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={formatNumber(priceDetail.deposit)}
                                                    onChange={(e) => setPriceDetail({ ...priceDetail, deposit: unformatNumber(e.target.value) })}
                                                    className="w-full bg-transparent text-right text-2xl font-black text-primary outline-none dark:text-teal-300"
                                                    placeholder="0"
                                                />
                                                <span className="text-sm font-bold text-teal-500">엔</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`mt-3 flex items-center justify-between rounded-xl border px-4 py-3 ${priceDetail.totalAmount - priceDetail.deposit < 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>
                                        <span className="text-xs font-bold">예상 잔금</span>
                                        <span className="text-base font-black">
                                            {typeof priceDetail.totalAmount === 'number' && typeof priceDetail.deposit === 'number' && !isNaN(priceDetail.totalAmount) && !isNaN(priceDetail.deposit) ? (priceDetail.totalAmount - priceDetail.deposit).toLocaleString() : 0}엔
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5 p-6">
                                <div>
                                    <h4 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span className="material-symbols-outlined text-base text-primary">link</span>
                                        3. 견적서 링크
                                        <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 dark:bg-slate-800">선택</span>
                                    </h4>
                                    <p className="mb-2 text-[11px] font-medium text-slate-400">
                                        비워두면 고객은 시스템 견적 페이지로 받습니다. 외부 견적서를 첨부할 때만 입력하세요.
                                    </p>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            type="url"
                                            value={estimateUrl}
                                            onChange={(e) => setEstimateUrl(e.target.value)}
                                            placeholder="https://docs.google.com/... (선택)"
                                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => estimateUrl && window.open(estimateUrl, '_blank')}
                                                disabled={!estimateUrl}
                                                className={`h-[46px] px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${estimateUrl ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                보기
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!estimateUrl) return;
                                                    await navigator.clipboard.writeText(estimateUrl);
                                                    setCopiedEstimateUrl(true);
                                                    setTimeout(() => setCopiedEstimateUrl(false), 1500);
                                                }}
                                                disabled={!estimateUrl}
                                                className={`h-[46px] px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${estimateUrl ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">{copiedEstimateUrl ? 'check' : 'content_copy'}</span>
                                                {copiedEstimateUrl ? '복사됨' : '복사'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <span className="material-symbols-outlined text-base text-primary">chat</span>
                                            4. 고객 안내문
                                            <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 dark:bg-slate-800">선택</span>
                                        </h4>
                                        <div className="flex gap-1.5">
                                            {quickNotes.map((note) => (
                                                <button
                                                    key={note.label}
                                                    type="button"
                                                    onClick={() => setAdminNote(note.text)}
                                                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 transition-colors hover:bg-teal-50 hover:text-primary dark:bg-slate-900 dark:text-slate-300"
                                                >
                                                    {note.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        placeholder="고객 화면에는 일본어로 보이므로 일본어 안내문을 입력하세요."
                                        className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">고객 화면 미리보기</p>
                                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                        <p><b>見積金額:</b> {priceDetail.totalAmount ? `${priceDetail.totalAmount.toLocaleString()}円` : '未入力'}</p>
                                        <p><b>予約金:</b> {priceDetail.deposit ? `${priceDetail.deposit.toLocaleString()}円` : '未入力'}</p>
                                        <p><b>日程:</b> {confirmedStartDate && confirmedEndDate ? `${confirmedStartDate} ~ ${confirmedEndDate}` : '未入力'}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onSendEstimate(estimateUrl, adminNote, priceDetail, confirmedStartDate, confirmedEndDate)}
                                    disabled={!canSendEstimate}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-dark px-5 py-4 text-sm font-black text-white shadow-lg shadow-primary-dark/20 transition-all hover:bg-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700"
                                    title={!canSendEstimate ? '확정 일정과 금액·예약금을 입력하면 발송할 수 있습니다.' : undefined}
                                >
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                    견적서 발송 처리
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Guide Assignment (NEW) */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-primary">hail</span>
                                가이드 배정
                            </h3>
                        </div>

                        {assignedGuide ? (
                            <div className="flex items-center justify-between p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 dark:border-primary/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/30 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{assignedGuide.name}</p>
                                        <p className="text-xs text-slate-500">{assignedGuide.phone}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSendGuideInfo}
                                        className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-primary/20 text-primary rounded-lg hover:bg-primary/5 font-bold"
                                    >
                                        정보 발송
                                    </button>
                                    <button
                                        onClick={() => setShowGuideModal(true)}
                                        className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-bold shadow-sm transition-all"
                                    >
                                        변경
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowGuideModal(true)}
                                className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-primary-dark hover:border-primary/20 hover:bg-primary/5 transition-all"
                            >
                                <span className="material-symbols-outlined text-3xl">add_circle</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">가이드 배정하기</span>
                            </button>
                        )}
                    </div>

                    {/* Accommodation Assignment (NEW) */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-primary">hotel</span>
                                숙소 배정
                            </h3>
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                <button
                                    onClick={() => setExtraDays(Math.max(0, extraDays - 1))}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white dark:bg-slate-800 shadow-sm text-slate-500"
                                >-</button>
                                <span className="text-[10px] font-bold px-2 text-slate-600 dark:text-slate-300">{getTripDays()}일차</span>
                                <button
                                    onClick={() => setExtraDays(extraDays + 1)}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white dark:bg-slate-800 shadow-sm text-slate-500"
                                >+</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Array.from({ length: getTripDays() }).map((_, i) => {
                                const dayNum = i + 1;
                                const assigned = dailyAccommodations.find(d => d.day === dayNum);
                                return (
                                    <div
                                        key={dayNum}
                                        className={`p-3 rounded-xl border transition-all ${assigned ? 'border-primary/10 bg-primary/10' : 'border-slate-100 bg-slate-50/50'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dayNum}일차</span>
                                            {assigned && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedDay(dayNum);
                                                        setShowAccommodationModal(true);
                                                    }}
                                                    className="text-[10px] text-primary-dark font-bold"
                                                >변경</button>
                                            )}
                                        </div>
                                        {assigned ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-primary/10 dark:bg-primary/40 flex items-center justify-center text-primary-dark">
                                                    <span className="material-symbols-outlined text-sm">home</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-700 dark:text-white truncate">{assigned.accommodation.name}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{assigned.accommodation.type}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setSelectedDay(dayNum);
                                                    setShowAccommodationModal(true);
                                                }}
                                                className="w-full py-3 border border-dashed border-slate-200 rounded-lg flex items-center justify-center gap-1 text-slate-400 hover:text-primary hover:bg-white transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">배정</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Customer Info Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-primary">person</span>
                                신청자 정보
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">성함</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{request.name}</p>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">연락처</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{request.phone}</p>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">이메일</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={request.email}>{request.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Travel Info Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-primary">explore</span>
                                여행 기본 정보
                            </h3>
                            <button
                                onClick={() => isEditing ? handleSaveEdit() : setIsEditing(true)}
                                className={`text-[10px] px-3 py-1 rounded-lg font-bold transition-all ${isEditing ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-900/80 dark:text-slate-400'}`}
                            >
                                {isEditing ? '저장 완료' : '정보 수정'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                                    <span className="text-xs text-slate-500">여행지</span>
                                    {isEditing ? (
                                        <input
                                            value={editForm.destination}
                                            onChange={e => setEditForm({ ...editForm, destination: e.target.value })}
                                            className="text-right text-sm font-bold bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-primary/20 dark:border-primary/30 outline-none focus:border-primary transition-all"
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-primary dark:text-primary-dark">{request.destination}</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                                    <span className="text-xs text-slate-500">인원</span>
                                    {isEditing ? (
                                        <input
                                            value={editForm.headcount}
                                            onChange={e => setEditForm({ ...editForm, headcount: e.target.value })}
                                            className="text-right text-sm font-bold bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-primary/20 dark:border-primary/30 outline-none focus:border-primary transition-all"
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{request.headcount}</span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                                    <span className="text-xs text-slate-500">희망 일정</span>
                                    {isEditing ? (
                                        <input
                                            value={editForm.period}
                                            onChange={e => setEditForm({ ...editForm, period: e.target.value })}
                                            className="text-right text-sm font-bold bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-primary/20 dark:border-primary/30 outline-none focus:border-primary transition-all"
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{request.period}</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                                    <span className="text-xs text-slate-500">예산 (인당)</span>
                                    {isEditing ? (
                                        <input
                                            value={editForm.budget}
                                            onChange={e => setEditForm({ ...editForm, budget: e.target.value })}
                                            className="text-right text-sm font-bold bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-primary/20 dark:border-primary/30 outline-none focus:border-primary transition-all"
                                        />
                                    ) : (
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{request.budget}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detail Requirements Section */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-primary">format_list_bulleted</span>
                            상세 요청 사항
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">여행 스타일</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {request.travelTypes.map(t => (
                                        <span key={t} className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm">{t}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">희망 숙소</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {request.accommodations.map(t => (
                                        <span key={t} className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm">{t}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">차량/가이드</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{request.vehicle}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">기타 요청사항</span>
                            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{request.additionalRequest || '추가 요청사항이 없습니다.'}</div>
                        </div>
                    </div>

                    {/* Attachment Section */}
                    {request.attachment && (
                        <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">attach_file</span>
                                첨부파일
                            </h3>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/5 dark:bg-primary/20 flex items-center justify-center text-primary/50">
                                        <span className="material-symbols-outlined">description</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{(request.attachment as File).name}</p>
                                        <p className="text-xs text-slate-400">{(request.attachment as File).size ? `${((request.attachment as File).size / 1024).toFixed(1)} KB` : ''}</p>
                                    </div>
                                </div>
                                <a
                                    href={URL.createObjectURL(request.attachment)}
                                    download={(request.attachment as File).name}
                                    className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:shadow-lg transition-all"
                                >
                                    파일 다운로드
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between sticky bottom-0 z-10">
                    <p className="text-[10px] font-medium text-slate-400">요청 일시: {request.date} ({request.createdAt})</p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>

            {/* Selection Modals */}
            {showGuideModal && (
                <GuideSelectionModal
                    isOpen={showGuideModal}
                    onClose={() => setShowGuideModal(false)}
                    onSelect={handleGuideAssign}
                />
            )}
            {showAccommodationModal && (
                <AccommodationSelectionModal
                    isOpen={showAccommodationModal}
                    day={selectedDay}
                    onClose={() => setShowAccommodationModal(false)}
                    onSelect={handleAccommodationAssign}
                />
            )}
        </div>
    );
};
