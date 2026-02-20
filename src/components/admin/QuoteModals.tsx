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
        if (request) {
            // Parse dates from period string (format: "2026-01-19 ~ 2026-01-23" or "07.15 ~ 07.22")
            if (request.period && request.period.includes('~')) {
                const parts = request.period.split('~').map(p => p.trim());
                if (parts.length === 2) {
                    // Check if it's already in YYYY-MM-DD format
                    if (parts[0].includes('-') && parts[0].length >= 10) {
                        setStartDate(parts[0].substring(0, 10));
                        setEndDate(parts[1].substring(0, 10));
                    } else if (parts[0].includes('.')) {
                        // Format like "01.19" - assume current year
                        const year = new Date().getFullYear();
                        const [startMonth, startDay] = parts[0].split('.').map(n => n.padStart(2, '0'));
                        const [endMonth, endDay] = parts[1].split('.').map(n => n.padStart(2, '0'));
                        // Handle year boundary roughly or assume current/next year
                        setStartDate(`${year}-${startMonth}-${startDay}`);
                        setEndDate(`${year}-${endMonth}-${endDay}`);
                    }
                }
            }

            // Parse budget (format: "150만원" or "150만원 ~" or "232만원")
            if (request.budget) {
                const budgetMatch = request.budget.match(/(\d+)/);
                if (budgetMatch) {
                    const budgetNum = parseInt(budgetMatch[1]) * 10000; // 만원 to 원
                    setTotalAmount(budgetNum);
                    setDeposit(Math.floor(budgetNum * 0.1)); // 10% as deposit
                }
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
                                    ≈ {(totalAmount / 10000).toLocaleString()}만원
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
                                    ≈ {(deposit / 10000).toLocaleString()}만원
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
                            {(totalAmount - deposit).toLocaleString()}원
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-gray-100 font-sans">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-primary"></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">견적 상세 정보</h2>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">No. {request.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        {request.status === 'reservation_requested' && (
                            <span className="bg-primary/10 text-primary-dark text-[10px] px-2 py-1 rounded-lg font-bold ml-2 animate-pulse uppercase tracking-wider border border-primary/20">
                                예약 상담 요청 중
                            </span>
                        )}
                        {request.status === 'answered' && (
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-lg font-bold ml-2 uppercase tracking-wider border border-primary/10">
                                답변 완료
                            </span>
                        )}
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
                    {/* Action Area (Reply/Estimate) */}
                    <div className={`${request.status === 'reservation_requested' ? 'bg-primary/5 border-primary/10' : 'bg-primary/5 border-primary/10'} dark:bg-slate-800/50 p-6 rounded-2xl border transition-all duration-300`}>
                        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">
                                {request.status === 'reservation_requested' ? 'bookmark_add' : 'send'}
                            </span>
                            {request.status === 'reservation_requested' ? '예약 전환 관리' : '견적서 발송 및 답변'}
                        </h3>

                        <div className="grid grid-cols-1 gap-6">
                            {request.status === 'reservation_requested' ? (
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                        <p>고객님이 견적서를 확인하고 예약을 요청했습니다.</p>
                                        <p className="text-xs text-slate-400 mt-1">상담을 통해 일정을 확정하고 예약을 생성해주세요.</p>
                                    </div>
                                    <button
                                        onClick={onOpenConvert}
                                        className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined">sync_alt</span>
                                        예약 및 확정
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">견적서 URL (Google/Excel)</label>
                                            <input
                                                type="url"
                                                value={estimateUrl}
                                                onChange={(e) => setEstimateUrl(e.target.value)}
                                                placeholder="https://docs.google.com/..."
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-dark outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <button
                                                onClick={() => onSendEstimate(estimateUrl, adminNote, priceDetail, confirmedStartDate, confirmedEndDate)}
                                                className="flex-1 py-3 bg-primary-dark hover:bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary-dark/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                                            >
                                                <span className="material-symbols-outlined text-lg">send</span>
                                                견적서 발송 처리
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">관리자 메모 (고객에게 노출)</label>
                                        <textarea
                                            value={adminNote}
                                            onChange={(e) => setAdminNote(e.target.value)}
                                            placeholder="견적에 대한 상세 설명이나 안내 사항을 입력해주세요."
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-dark outline-none transition-all h-24 resize-none text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Info Section */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-primary">payments</span>
                                결제 및 금액 정보
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">총 결제금액</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={formatNumber(priceDetail.totalAmount)}
                                        onChange={(e) => setPriceDetail({ ...priceDetail, totalAmount: unformatNumber(e.target.value) })}
                                        className="w-full bg-transparent text-base font-bold text-slate-800 dark:text-white outline-none border-b border-transparent focus:border-primary transition-all text-right"
                                        placeholder="0"
                                    />
                                    <span className="text-sm font-bold text-slate-400">원</span>
                                </div>
                                {priceDetail.totalAmount > 0 && (
                                    <p className="mt-1 text-[9px] font-bold text-primary/60 text-right">
                                        ≈ {(priceDetail.totalAmount / 10000).toLocaleString()}만원
                                    </p>
                                )}
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">예약금 (Deposit)</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={formatNumber(priceDetail.deposit)}
                                        onChange={(e) => setPriceDetail({ ...priceDetail, deposit: unformatNumber(e.target.value) })}
                                        className="w-full bg-transparent text-base font-bold text-primary dark:text-primary-dark outline-none border-b border-transparent focus:border-primary transition-all text-right"
                                        placeholder="0"
                                    />
                                    <span className="text-sm font-bold text-slate-400">원</span>
                                </div>
                                {priceDetail.deposit > 0 && (
                                    <p className="mt-1 text-[9px] font-bold text-primary/60 text-right">
                                        ≈ {(priceDetail.deposit / 10000).toLocaleString()}만원
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/30 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">예약금 상태</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priceDetail.depositStatus === 'paid' ? 'bg-primary/10 text-primary-dark border-primary/20' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    {priceDetail.depositStatus === 'paid' ? '입금 완료' : '미입금'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/30 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">잔금 상태</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priceDetail.balanceStatus === 'paid' ? 'bg-primary/10 text-primary-dark border-primary/20' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    {priceDetail.balanceStatus === 'paid' ? '결제 완료' : '결제 대기'}
                                </span>
                            </div>
                        </div>

                        <div className={`mt-4 p-4 rounded-2xl border flex items-center justify-between transition-all ${priceDetail.totalAmount - priceDetail.deposit < 0 ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-primary/10 dark:bg-primary/10 border-primary/10 dark:border-primary/30'}`}>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${priceDetail.totalAmount - priceDetail.deposit < 0 ? 'text-red-600' : 'text-primary dark:text-primary-dark'}`}>
                                    예상 잔금 (Balance)
                                </span>
                                {priceDetail.totalAmount - priceDetail.deposit < 0 && (
                                    <span className="text-[9px] text-red-500 font-bold mt-0.5 animate-pulse">! 예약금이 총액보다 큽니다</span>
                                )}
                            </div>
                            <p className={`text-base font-bold ${priceDetail.totalAmount - priceDetail.deposit < 0 ? 'text-red-600' : 'text-primary dark:text-primary-dark'}`}>
                                {(priceDetail.totalAmount - priceDetail.deposit).toLocaleString()}원
                            </p>
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
