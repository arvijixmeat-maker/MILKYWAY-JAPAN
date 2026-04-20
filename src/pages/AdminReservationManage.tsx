import React, { useState, useMemo, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import { type QuoteRequest, ConvertSelectionModal, QuoteDetailModal } from '../components/admin/QuoteModals';
import { sendNotificationEmail } from '../lib/email';
import { sendNotification } from '../utils/notification';

// Reservation Interface
interface Reservation {
    id: string;
    type: 'product' | 'quote';
    productName: string;
    customerName: string;
    date: string;
    bookedAt: string;
    status: 'pending_payment' | 'paid' | 'confirmed' | 'cancelled' | 'new' | 'processing' | 'answered' | 'reservation_requested' | 'converted';

    // Payment Fields
    totalAmount: number;
    deposit: number;
    depositStatus: 'unpaid' | 'paid';
    balance: number;
    balanceStatus: 'unpaid' | 'paid';

    // Document URLs
    contractUrl?: string; // Excel Sheet URL
    itineraryUrl?: string; // Excel Sheet URL

    // Assigned Guide & Accommodation
    assignedGuide?: {
        id: string;
        name: string;
        image: string;
        introduction: string;
        phone: string;
        kakaoId: string;
        languages: string[];
        specialties: string[];
    };
    dailyAccommodations?: Array<{
        day: number;
        accommodation: {
            id: string;
            name: string;
            type: string;
            location: string;
            images: string[];
            description: string;
            facilities: string[];
        };
    }>;

    history?: Array<{
        timestamp: string;
        type: string;
        description: string;
        detail?: string;
    }>;

    userId?: string;
    areAssignmentsVisibleToUser?: boolean;

    headcount: string;
    totalPeople: number;
    phone: string;
    email: string;

    // Quote Specific
    quoteDetail?: QuoteRequest;
}

const StatusDropdown = ({ status, onChange }: { status: string, onChange: (s: Reservation['status']) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const styles = {
        pending_payment: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        paid: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        confirmed: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
        cancelled: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        // Quote Statuses
        new: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
        processing: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
        answered: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
        reservation_requested: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 animate-pulse',
        converted: 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
    };

    const labels = {
        pending_payment: '입금 대기',
        paid: '결제 완료',
        confirmed: '예약 확정',
        cancelled: '취소됨',
        new: '신규 견적',
        processing: '견적 작성중',
        answered: '견적 발송됨',
        reservation_requested: '예약 요청됨',
        converted: '예약 전환됨'
    };

    const statusKey = status as keyof typeof styles;

    const handleSelect = (newStatus: Reservation['status']) => {
        onChange(newStatus);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${styles[statusKey]} w-28 justify-between`}
            >
                <span>{labels[statusKey]}</span>
                <span className="material-symbols-outlined text-[16px] opacity-70">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1">
                        {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
                            <button
                                key={key}
                                onClick={() => handleSelect(key)}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-between
                                    ${status === key
                                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {labels[key]}
                                {status === key && <span className="material-symbols-outlined text-[14px]">check</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ReservationDetailModal = ({ reservation, onClose, onUpdate }: { reservation: Reservation | null, onClose: () => void, onUpdate: (updated: Reservation) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Reservation | null>(null);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showAccommodationModal, setShowAccommodationModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState(1);
    const [extraDays, setExtraDays] = useState(0);
    const [guideList, setGuideList] = useState<any[]>([]);
    const [accommodationList, setAccommodationList] = useState<any[]>([]);

    useEffect(() => {
        if (showGuideModal && guideList.length === 0) {
            api.tourGuides.list().then((data: any) => {
                if (Array.isArray(data)) setGuideList(data.filter((g: any) => g.status !== 'pending'));
            }).catch(() => {});
        }
    }, [showGuideModal]);

    useEffect(() => {
        if (showAccommodationModal && accommodationList.length === 0) {
            api.accommodations.list().then((data: any) => {
                if (Array.isArray(data)) setAccommodationList(data);
            }).catch(() => {});
        }
    }, [showAccommodationModal]);

    const getTripDays = (): number => {
        if (!reservation) return 1;
        // Try to match from date string first (e.g., "2024.05.01-05.05 (4박 5일)")
        let days = 1;
        const match = reservation.date.match(/(\d+)박/);
        if (match) {
            days = parseInt(match[1]) + 1;
        } else {
            // Fallback: try to guess from duration string or just default to 1
            // If reservation has a dedicated duration field (which we might not have added yet internally to the interface but is in data)
            // For now default to 1
        }
        return days + extraDays;
    };

    useEffect(() => {
        setEditForm(reservation);
        setExtraDays(0); // Reset extra days when reservation changes
    }, [reservation]);

    if (!reservation || !editForm) return null;

    // Toggle Payment Status Logic
    const toggleTotalStatus = () => {
        // Master toggle logic
        // If currently paid -> switch to pending (unpaid)
        // If currently not paid -> switch to paid AND mark all sub-payments as paid
        const isCurrentlyPaid = editForm.status === 'paid';

        const newStatus: Reservation['status'] = isCurrentlyPaid ? 'pending_payment' : 'paid';


        const updated = {
            ...editForm,
            status: newStatus,
            depositStatus: isCurrentlyPaid ? editForm.depositStatus : 'paid',
            balanceStatus: isCurrentlyPaid ? editForm.balanceStatus : 'paid'
        };

        setEditForm(updated);
        if (!isEditing) onUpdate(updated);
    };

    const toggleDepositStatus = () => {
        const newStatus: 'paid' | 'unpaid' = editForm.depositStatus === 'paid' ? 'unpaid' : 'paid';
        const updated = { ...editForm, depositStatus: newStatus };
        setEditForm(updated);
        // Check if full payment is complete? Optional feature.
        if (!isEditing) onUpdate(updated);
    };

    const toggleBalanceStatus = () => {
        const newStatus: 'paid' | 'unpaid' = editForm.balanceStatus === 'paid' ? 'unpaid' : 'paid';
        const updated = { ...editForm, balanceStatus: newStatus };
        setEditForm(updated);
        if (!isEditing) onUpdate(updated);
    };

    const handleSave = () => {
        if (editForm) {
            const finalData = {
                ...editForm,
                balance: editForm.totalAmount - editForm.deposit
            };
            onUpdate(finalData);
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setEditForm(reservation);
        setIsEditing(false);
    };

    const handleSendLink = (docType: string, url?: string) => {
        if (!url) {
            alert(`${docType} URL이 입력되지 않았습니다.\n정보 수정에서 URL을 먼저 입력해 주세요.`);
            return;
        }
        // In a real app, this might open a share dialog or copy to clipboard
        alert(`${docType} 링크를 발송했습니다!\nURL: ${url}`);
    };

    const handleGuideAssign = (guide: any) => {
        if (!reservation) return;

        const updated = {
            ...reservation,
            assignedGuide: {
                id: guide.id,
                name: guide.name,
                image: guide.image,
                introduction: guide.introduction,
                phone: guide.phone,
                kakaoId: guide.kakaoId,
                languages: guide.languages,
                specialties: guide.specialties
            },
            history: [
                ...(reservation.history || []),
                {
                    timestamp: new Date().toISOString(),
                    type: 'modification',
                    description: '담당 가이드가 배정되었습니다.',
                    detail: `${guide.name}`
                }
            ]
        };

        onUpdate(updated);
    };

    const handleAccommodationAssign = (accommodation: any) => {
        if (!reservation) return;

        const dailyAccommodations = reservation.dailyAccommodations || [];
        const existingIndex = dailyAccommodations.findIndex(d => d.day === selectedDay);

        const newDaily = {
            day: selectedDay,
            accommodation: {
                id: accommodation.id,
                name: accommodation.name,
                type: accommodation.type,
                location: accommodation.location,
                images: accommodation.images,
                description: accommodation.description,
                facilities: accommodation.facilities
            }
        };

        let updatedDailies;
        if (existingIndex >= 0) {
            updatedDailies = [...dailyAccommodations];
            updatedDailies[existingIndex] = newDaily;
        } else {
            updatedDailies = [...dailyAccommodations, newDaily].sort((a, b) => a.day - b.day);
        }

        const updated = {
            ...reservation,
            dailyAccommodations: updatedDailies,
            history: [
                ...(reservation.history || []),
                {
                    timestamp: new Date().toISOString(),
                    type: 'modification',
                    description: `${selectedDay}일차 숙소가 배정되었습니다.`,
                    detail: `${accommodation.name}`
                }
            ]
        };

        onUpdate(updated);
    };


    return (<>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex-shrink-0">
                                    {reservation.type !== 'quote' ? '일반상품' : '맞춤견적'}
                                </span>
                                <span className="text-slate-400 text-xs font-mono">#{(reservation as any).reservationNumber || reservation.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <h2 className="text-slate-900 dark:text-white font-bold text-base leading-tight truncate">{reservation.productName}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <StatusDropdown
                            status={editForm.status}
                            onChange={(s) => { setEditForm({ ...editForm, status: s }); if (!isEditing) onUpdate({ ...editForm, status: s }); }}
                        />
                        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors flex-shrink-0">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* Body - Two Column */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">

                        {/* LEFT COLUMN */}
                        <div className="flex-1 p-6 space-y-7 min-w-0">

                            {/* Customer Info */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">예약자 정보</p>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
                                    <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                                        <div className="p-4">
                                            <p className="text-xs text-slate-400 mb-1">이름</p>
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{reservation.customerName}</p>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-xs text-slate-400 mb-1">인원</p>
                                            {isEditing ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={editForm.totalPeople || ''}
                                                        onChange={(e) => setEditForm(prev => prev ? ({ ...prev, totalPeople: parseInt(e.target.value) || 0, headcount: `${e.target.value}명` }) : null)}
                                                        className="w-full font-semibold text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                    />
                                                    <span className="text-xs text-slate-500">명</span>
                                                </div>
                                            ) : (
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{reservation.headcount || '—'}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                                        <div className="p-4">
                                            <p className="text-xs text-slate-400 mb-1">연락처</p>
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{reservation.phone || '—'}</p>
                                        </div>
                                        <div className="p-4 min-w-0">
                                            <p className="text-xs text-slate-400 mb-1">이메일</p>
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{reservation.email || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Travel Schedule */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">여행 일정</p>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-teal-600 text-lg">calendar_month</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{reservation.date}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">접수일 {reservation.bookedAt}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">결제 현황</p>
                                    {isEditing && <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">수정 중</span>}
                                </div>

                                {/* Total */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 mb-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-1">총 상품 금액</p>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editForm.totalAmount}
                                                    onChange={(e) => setEditForm({ ...editForm, totalAmount: Number(e.target.value), balance: Number(e.target.value) - editForm.deposit })}
                                                    className="w-40 font-bold text-xl text-slate-900 dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                />
                                            ) : (
                                                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                                    {typeof reservation.totalAmount === 'number' ? `${reservation.totalAmount.toLocaleString()}` : '0'}<span className="text-base font-semibold text-slate-500 ml-0.5">원</span>
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={toggleTotalStatus}
                                            className={`text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${editForm.status === 'paid' ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                        >
                                            {editForm.status === 'paid' ? '전액완납' : '완납처리'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {/* Deposit */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-slate-400">예약금</p>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${editForm.depositStatus === 'paid' ? 'bg-teal-500/10 text-teal-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                                {editForm.depositStatus === 'paid' ? '완납' : '미납'}
                                            </span>
                                        </div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editForm.deposit}
                                                onChange={(e) => setEditForm({ ...editForm, deposit: Number(e.target.value), balance: editForm.totalAmount - Number(e.target.value) })}
                                                className="w-full font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        ) : (
                                            <p className="font-bold text-slate-900 dark:text-white text-sm mb-3">
                                                {typeof reservation.deposit === 'number' ? `${reservation.deposit.toLocaleString()}원` : '0원'}
                                            </p>
                                        )}
                                        <button
                                            onClick={toggleDepositStatus}
                                            className={`w-full py-1.5 text-xs rounded-lg font-semibold transition-colors ${editForm.depositStatus === 'paid' ? 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600 hover:bg-slate-100' : 'bg-teal-500 text-white hover:bg-teal-600'}`}
                                        >
                                            {editForm.depositStatus === 'paid' ? '취소' : '입금확인'}
                                        </button>
                                    </div>

                                    {/* Balance */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-slate-400">잔금</p>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${editForm.balanceStatus === 'paid' ? 'bg-teal-500/10 text-teal-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                                {editForm.balanceStatus === 'paid' ? '완납' : '미납'}
                                            </span>
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm mb-3">
                                            {typeof editForm.totalAmount === 'number' && typeof editForm.deposit === 'number' ? `${(editForm.totalAmount - editForm.deposit).toLocaleString()}원` : '0원'}
                                        </p>
                                        <button
                                            onClick={toggleBalanceStatus}
                                            className={`w-full py-1.5 text-xs rounded-lg font-semibold transition-colors ${editForm.balanceStatus === 'paid' ? 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600 hover:bg-slate-100' : 'bg-teal-500 text-white hover:bg-teal-600'}`}
                                        >
                                            {editForm.balanceStatus === 'paid' ? '취소' : '입금확인'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:w-80 xl:w-96 p-6 space-y-7 flex-shrink-0">

                            {/* Guide */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">담당 가이드</p>
                                {reservation.assignedGuide ? (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            {reservation.assignedGuide.image ? (
                                                <img src={reservation.assignedGuide.image} alt={reservation.assignedGuide.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                    <span className="material-symbols-outlined text-slate-400">person</span>
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{reservation.assignedGuide.name}</p>
                                                <p className="text-xs text-slate-400 truncate">{reservation.assignedGuide.phone}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowGuideModal(true)}
                                            className="w-full py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            가이드 변경
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowGuideModal(true)}
                                        className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center group-hover:bg-teal-500/10 transition-colors">
                                                <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-600 text-base transition-colors">add</span>
                                            </div>
                                            <p className="text-xs text-slate-500 group-hover:text-teal-600 font-medium transition-colors">가이드 배정하기</p>
                                        </div>
                                    </button>
                                )}
                            </div>

                            {/* Accommodations */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">숙소 배정</p>
                                <div className="space-y-1.5">
                                    {Array.from({ length: getTripDays() }, (_, i) => i + 1).map(day => {
                                        const assigned = reservation.dailyAccommodations?.find(d => d.day === day);
                                        return (
                                            <div key={day} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex-shrink-0">{day}일차</span>
                                                <p className={`text-xs font-medium truncate flex-1 ${assigned ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{assigned ? assigned.accommodation.name : '미배정'}</p>
                                                <button
                                                    onClick={() => { setSelectedDay(day); setShowAccommodationModal(true); }}
                                                    className="flex-shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                                                >
                                                    {assigned ? '변경' : '선택'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button
                                        onClick={() => setExtraDays(prev => prev + 1)}
                                        className="w-full py-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>일차 추가
                                    </button>
                                </div>

                                {/* Publish Assignments */}
                                <button
                                    onClick={async () => {
                                        if (!reservation.assignedGuide && (!reservation.dailyAccommodations || reservation.dailyAccommodations.length === 0)) {
                                            alert('할당된 가이드나 숙소가 없습니다.');
                                            return;
                                        }
                                        const updated = {
                                            ...reservation,
                                            areAssignmentsVisibleToUser: true,
                                            history: [
                                                ...(reservation.history || []),
                                                { timestamp: new Date().toISOString(), type: 'modification', description: '가이드/숙소 배정 정보가 발송되었습니다.' }
                                            ]
                                        };
                                        onUpdate(updated);
                                        await sendNotificationEmail(reservation.email, 'GUIDE_ASSIGNED', {
                                            customerName: reservation.customerName,
                                            productName: reservation.productName,
                                            guideName: reservation.assignedGuide?.name,
                                            guidePhone: reservation.assignedGuide?.phone
                                        });
                                        alert('사용자에게 배정 정보를 발송(공개)했습니다.');
                                    }}
                                    disabled={reservation.areAssignmentsVisibleToUser}
                                    className={`w-full mt-3 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${reservation.areAssignmentsVisibleToUser ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default' : 'bg-teal-500 text-white hover:bg-teal-600'}`}
                                >
                                    <span className="material-symbols-outlined text-base">{reservation.areAssignmentsVisibleToUser ? 'check_circle' : 'send'}</span>
                                    {reservation.areAssignmentsVisibleToUser ? '배정 정보 발송 완료' : '배정 정보 고객에게 발송'}
                                </button>
                            </div>

                            {/* Document Sending */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">문서 발송</p>
                                <div className="space-y-2">
                                    {/* Contract */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-slate-500 text-base">description</span>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">여행 계약서</p>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="URL 입력 후 발송..."
                                            value={editForm.contractUrl || ''}
                                            onChange={(e) => { setEditForm({ ...editForm, contractUrl: e.target.value }); if (!isEditing) setIsEditing(true); }}
                                            className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
                                        />
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => { if (editForm.contractUrl) { navigator.clipboard.writeText(editForm.contractUrl); alert('링크 복사됨!'); } else alert('URL을 먼저 입력해 주세요.'); }}
                                                className="flex-1 py-1.5 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">content_copy</span>복사
                                            </button>
                                            <button
                                                onClick={() => handleSendLink('여행계약서', editForm.contractUrl)}
                                                className="flex-1 py-1.5 text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-lg flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">send</span>발송
                                            </button>
                                        </div>
                                    </div>

                                    {/* Itinerary */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-slate-500 text-base">map</span>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">확정 일정표</p>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="URL 입력 후 발송..."
                                            value={editForm.itineraryUrl || ''}
                                            onChange={(e) => { setEditForm({ ...editForm, itineraryUrl: e.target.value }); if (!isEditing) setIsEditing(true); }}
                                            className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
                                        />
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => { if (editForm.itineraryUrl) { navigator.clipboard.writeText(editForm.itineraryUrl); alert('링크 복사됨!'); } else alert('URL을 먼저 입력해 주세요.'); }}
                                                className="flex-1 py-1.5 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">content_copy</span>복사
                                            </button>
                                            <button
                                                onClick={() => handleSendLink('확정일정표', editForm.itineraryUrl)}
                                                className="flex-1 py-1.5 text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-lg flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">send</span>발송
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center flex-shrink-0">
                    <p className="text-xs text-slate-400">접수 {reservation.bookedAt}</p>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button onClick={handleCancel} className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm">
                                    취소
                                </button>
                                <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm flex items-center gap-1.5 transition-colors">
                                    <span className="material-symbols-outlined text-base">check</span>저장
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm">
                                    닫기
                                </button>
                                <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm flex items-center gap-1.5 transition-colors">
                                    <span className="material-symbols-outlined text-base">edit</span>수정
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Guide Selection Modal */}
        {showGuideModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowGuideModal(false)} />
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white">가이드 선택</h3>
                        <button onClick={() => setShowGuideModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
                        </button>
                    </div>
                    <div className="overflow-y-auto p-4 space-y-2">
                        {guideList.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 text-sm">등록된 가이드가 없습니다</p>
                        ) : guideList.map((guide: any) => (
                            <button
                                key={guide.id}
                                onClick={() => { handleGuideAssign(guide); setShowGuideModal(false); }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 transition-all text-left"
                            >
                                {guide.image ? (
                                    <img src={guide.image} alt={guide.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-slate-400">person</span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{guide.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{guide.phone}</p>
                                    {guide.languages && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(typeof guide.languages === 'string' ? JSON.parse(guide.languages) : guide.languages).slice(0, 3).map((l: string) => (
                                                <span key={l} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] rounded">{l}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Accommodation Selection Modal */}
        {showAccommodationModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowAccommodationModal(false)} />
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white">{selectedDay}일차 숙소 선택</h3>
                        <button onClick={() => setShowAccommodationModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
                        </button>
                    </div>
                    <div className="overflow-y-auto p-4 space-y-2">
                        {accommodationList.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 text-sm">등록된 숙소가 없습니다</p>
                        ) : accommodationList.map((acc: any) => (
                            <button
                                key={acc.id}
                                onClick={() => { handleAccommodationAssign(acc); setShowAccommodationModal(false); }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-200 transition-all text-left"
                            >
                                {acc.thumbnail || (acc.images && JSON.parse(acc.images || '[]')[0]) ? (
                                    <img src={acc.thumbnail || JSON.parse(acc.images || '[]')[0]} alt={acc.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-slate-400">hotel</span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{acc.name}</p>
                                    {acc.type && <p className="text-xs text-slate-500">{acc.type}</p>}
                                    {acc.location && <p className="text-xs text-slate-400 truncate">{acc.location}</p>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </>);
};

export const AdminReservationManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('전체 상태');
    const [filterType, setFilterType] = useState('전체 유형');
    const [convertTarget, setConvertTarget] = useState<QuoteRequest | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Reservations State
    const [reservations, setReservations] = useState<Reservation[]>([]);

    const fetchReservations = async () => {
        try {
            setReservations([]); // Clear first

            // Fetch reservations and quotes independently so one failure doesn't block the other
            const [resSettled, quoteSettled] = await Promise.allSettled([
                api.reservations.list(),
                api.quotes.list()
            ]);
            const resData = resSettled.status === 'fulfilled' ? resSettled.value : null;
            const quoteData = quoteSettled.status === 'fulfilled' ? quoteSettled.value : null;
            if (quoteSettled.status === 'rejected') console.error('[Admin] quotes fetch failed:', quoteSettled.reason);
            if (resSettled.status === 'rejected') console.error('[Admin] reservations fetch failed:', resSettled.reason);

            const allItems: Reservation[] = [];

            // Map Reservations
            if (resData) {
                const mappedReservations: Reservation[] = resData.map((r: any) => {
                    const startDate = r.startDate || r.start_date;
                    const endDate = r.endDate || r.end_date;
                    const createdAt = r.createdAt || r.created_at;
                    const travelers = r.travelers || r.totalPeople || r.total_people || 0;
                    const totalAmount = r.totalPrice || r.total_amount || r.price_breakdown?.total || r.totalAmount || 0;
                    const depositAmt = r.depositAmount || r.deposit_amount || r.price_breakdown?.deposit || r.deposit || 0;
                    return {
                    id: r.id,
                    reservationNumber: r.reservationNumber || r.reservation_number || null,
                    type: r.type || 'product',
                    productName: r.productName || r.product_name,
                    customerName: r.customerName || r.customer_name || r.customer_info?.name || 'Unknown',
                    date: startDate
                        ? `${new Date(startDate).toLocaleDateString('ko-KR')} ~ ${endDate ? new Date(endDate).toLocaleDateString('ko-KR') : ''}`
                        : r.duration || '날짜 미정',
                    bookedAt: createdAt ? new Date(createdAt).toLocaleDateString('ko-KR') : '',
                    status: r.status,
                    totalAmount,
                    deposit: depositAmt,
                    depositStatus: r.depositStatus || r.deposit_status || (r.status === 'pending_payment' ? 'unpaid' : 'paid'),
                    balance: totalAmount - depositAmt,
                    balanceStatus: r.balanceStatus || r.balance_status || 'unpaid',
                    contractUrl: r.contractUrl || r.contract_url,
                    itineraryUrl: r.itineraryUrl || r.itinerary_url,
                    assignedGuide: r.assignedGuide || r.assigned_guide,
                    dailyAccommodations: r.dailyAccommodations || r.daily_accommodations,
                    history: r.history || [],
                    areAssignmentsVisibleToUser: r.areAssignmentsVisibleToUser || r.are_assignments_visible_to_user || false,
                    headcount: travelers ? `${travelers}名` : '미정',
                    totalPeople: travelers,
                    phone: r.phone || r.customerPhone || r.customer_phone || r.customer_info?.phone || '',
                    email: r.email || r.customerEmail || r.customer_email || r.customer_info?.email || '',
                    userId: r.userId || r.user_id,
                    };
                });
                allItems.push(...mappedReservations);
            }

            // Map Quotes
            if (quoteData) {
                // Filter out already transformed converted quotes if necessary,
                // but usually API returns all. We filter in map or before.
                // The original code filtered: .neq('status', 'converted')
                // We should filter client side if API doesn't.
                // Assuming API returns all.
                const activeQuotes = quoteData.filter((q: any) => q.status !== 'converted');

                const mappedQuotes: Reservation[] = activeQuotes.map((q: any) => {
                    const createdAt = q.createdAt || q.created_at;
                    return {
                        id: q.id,
                        type: 'quote',
                        productName: `${q.destination || 'モンゴル'} 맞춤 견적`,
                        customerName: q.name,
                        date: q.period || '일정 미정',
                        bookedAt: createdAt ? new Date(createdAt).toLocaleDateString('ko-KR') : '',
                        status: q.status,
                        totalAmount: 0,
                        deposit: 0,
                        depositStatus: 'unpaid',
                        balance: 0,
                        balanceStatus: 'unpaid',
                        headcount: q.headcount,
                        totalPeople: 0,
                        phone: q.phone,
                        email: q.email,
                        userId: q.userId || q.user_id,
                        quoteDetail: {
                            ...q,
                            userId: q.userId || q.user_id,
                            travelTypes: q.travelTypes || q.travel_types || [],
                            accommodations: q.accommodations || [],
                            additionalRequest: q.additionalRequest || q.additional_request,
                            adminNote: q.adminNote || q.admin_note,
                            estimateUrl: q.estimateUrl || q.estimate_url,
                            confirmedPrice: q.confirmedPrice || q.confirmed_price,
                            date: createdAt ? new Date(createdAt).toLocaleDateString() : ''
                        }
                    };
                });
                allItems.push(...mappedQuotes);
            }

            allItems.sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
            setReservations(allItems);

        } catch (error) {
            console.error('Error fetching data:', error);
            alert('데이터를 불러오는 데 실패했습니다.');
        }
    };
    // End of fetchReservations
    const handleUpdateReservation = async (updated: Reservation) => {
        try {
            // Find old reservation from local state instead of fetching
            // (Assuming local state has full history, which it does from fetchReservations)
            const oldReservation = reservations.find(r => r.id === updated.id);

            if (!oldReservation) throw new Error('Reservation not found');

            let history = oldReservation.history ? [...oldReservation.history] : [];

            // Add history entry for status change if changed
            if (oldReservation.status !== updated.status) {
                const statusLabels: Record<string, string> = {
                    pending_payment: '입금 대기',
                    paid: '결제 완료',
                    confirmed: '예약 확정',
                    cancelled: '취소됨'
                };
                history.push({
                    timestamp: new Date().toISOString(),
                    type: 'status_change',
                    description: `예약 상태가 변경되었습니다: ${statusLabels[updated.status] || updated.status}`,
                    detail: `${oldReservation.status} -> ${updated.status}`
                });
            }

            // Add history entry for itinerary upload if changed
            if (updated.itineraryUrl && (!oldReservation.itineraryUrl || oldReservation.itineraryUrl !== updated.itineraryUrl)) {
                history.push({
                    timestamp: new Date().toISOString(),
                    type: 'document_added',
                    description: '확정 일정표가 업로드되었습니다',
                    detail: updated.itineraryUrl
                });
            }

            // Add history entry for contract upload if changed
            if (updated.contractUrl && (!oldReservation.contractUrl || oldReservation.contractUrl !== updated.contractUrl)) {
                history.push({
                    timestamp: new Date().toISOString(),
                    type: 'document_added',
                    description: '여행 계약서가 업로드되었습니다',
                    detail: updated.contractUrl
                });
            }

            // Prepare update object (Map camelCase back to snake_case for DB)
            const updatePayload: any = {
                status: updated.status,
                deposit_status: updated.depositStatus,
                balance_status: updated.balanceStatus,
                contract_url: updated.contractUrl,
                itinerary_url: updated.itineraryUrl,
                assigned_guide: updated.assignedGuide,
                daily_accommodations: updated.dailyAccommodations,
                history: history,
                are_assignments_visible_to_user: updated.areAssignmentsVisibleToUser,
                total_people: updated.totalPeople,
                updated_at: new Date().toISOString()
            };

            // Update price_breakdown if amounts changed
            // Note: We need to access old price breakdown from oldReservation (which is camelCase mapped)
            // But we stored raw? No, we mapped it to flat fields.
            // We should reconstruct price_breakdown if we want to update it.
            // But simpler: just send the fields we know.
            // If backend handles partial updates, good.
            // If we want to update price_breakdown, we need to construct it.
            if (updated.totalAmount !== oldReservation.totalAmount || updated.deposit !== oldReservation.deposit) {
                updatePayload.price_breakdown = {
                    total: updated.totalAmount,
                    deposit: updated.deposit,
                    local: updated.totalAmount - updated.deposit
                };
            }

            // Also update flat amount fields if DB has them
            updatePayload.total_amount = updated.totalAmount;
            updatePayload.deposit_amount = updated.deposit;


            // Call API
            if (updated.type === 'quote') {
                // Quotes might have different update logic or endpoint?
                // For now assuming we treat them as reservations if they are in this list?
                // Actually quotes are in 'quotes' table, reservations in 'reservations'.
                // If updated.type is quote, we should use quotes API?
                // But the UI seems to treat them unified.
                // However, the ID will be found in 'quotes' table.
                await api.quotes.update(updated.id, updatePayload);
            } else {
                await api.reservations.update(updated.id, updatePayload);
            }

            // Optimistic update locally
            setReservations(prev => prev.map(r => r.id === updated.id ? { ...updated, history } : r));
            setSelectedReservation({ ...updated, history });

            // Notification Logic
            if (oldReservation.status !== updated.status && updated.userId) {
                const statusMessages: Record<string, string> = {
                    confirmed: '예약이 확정되었습니다! 😆',
                    paid: '결제가 완료되었습니다. 곧 확정됩니다!',
                    cancelled: '예약이 취소되었습니다.'
                };
                if (statusMessages[updated.status]) {
                    await sendNotification({
                        userId: updated.userId,
                        type: 'reservation',
                        title: '예약 상태 변경',
                        message: `${updated.productName} ${statusMessages[updated.status]}`,
                        link: `/mypage/reservations`
                    });
                }
            }

            if (updated.areAssignmentsVisibleToUser && !oldReservation.areAssignmentsVisibleToUser && updated.userId) {
                await sendNotification({
                    userId: updated.userId,
                    type: 'reservation',
                    title: '담당 가이드/숙소 배정 완료',
                    message: `${updated.productName}의 담당 가이드와 숙소가 배정되었습니다. 확인해보세요!`,
                    link: `/reservation-status`
                });
            }

            alert('예약 정보가 업데이트되었습니다.');
            // Only fetch if strictly necessary, otherwise optimistic is fine.
            // fetchReservations(); 
        } catch (error) {
            console.error('Error updating reservation:', error);
            alert('예약 정보 수정에 실패했습니다.');
        }
    };

    const handleStatusChange = async (id: string, newStatus: string, type: string) => {
        try {
            if (type === 'quote') {
                await api.quotes.update(id, { status: newStatus });
            } else {
                await api.reservations.update(id, { status: newStatus });
            }

            // Find current item to get userId
            const targetItem = reservations.find(r => r.id === id);
            if (targetItem && targetItem.userId) {
                const statusMessages: Record<string, string> = {
                    confirmed: '예약이 확정되었습니다! 😆',
                    paid: '결제가 완료되었습니다.',
                    cancelled: '예약이 취소되었습니다.',
                    answered: '견적서가 도착했습니다! 📄',
                };
                if (statusMessages[newStatus]) {
                    await sendNotification({
                        userId: targetItem.userId,
                        type: 'reservation',
                        title: type === 'quote' ? '견적 상태 변경' : '예약 상태 변경',
                        message: `${targetItem.productName} ${statusMessages[newStatus]}`,
                        link: type === 'quote' ? '/mypage/estimates' : '/mypage/reservations'
                    });
                }
            }

            // Optimistic update
            setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));
            if (selectedReservation && selectedReservation.id === id) {
                setSelectedReservation(prev => prev ? { ...prev, status: newStatus as any } : null);
            }

        } catch (error) {
            console.error('Failed to update status:', error);
            alert('상태 업데이트에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string, type: string) => {
        if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            if (type === 'quote') {
                await api.quotes.delete(id);
            } else {
                await api.reservations.delete(id);
            }

            alert('삭제되었습니다.');
            setReservations(prev => prev.filter(r => r.id !== id));
            if (selectedReservation?.id === id) setSelectedReservation(null);

        } catch (error: any) {
            console.error('Error deleting item:', error);
            alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
        }
    };


    useEffect(() => {
        fetchReservations();
    }, []);

    // Filter Logic
    const filteredReservations = useMemo(() => {
        return reservations.filter(res => {
            const matchesSearch = res.customerName.includes(searchTerm) || res.productName.includes(searchTerm);
            const matchesStatus = filterStatus === '전체 상태' ||
                (filterStatus === '입금 대기' && res.status === 'pending_payment') ||
                (filterStatus === '결제 완료' && res.status === 'paid') ||
                (filterStatus === '예약 확정' && res.status === 'confirmed') ||
                (filterStatus === '취소됨' && res.status === 'cancelled');
            const matchesType = filterType === '전체 유형' ||
                (filterType === '일반 상품' && res.type !== 'quote');

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [searchTerm, filterStatus, filterType, reservations]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
    const displayedReservations = filteredReservations.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats
    const stats = useMemo(() => {
        return {
            total: reservations.length,
            pending: reservations.filter(r => r.status === 'pending_payment').length,
            confirmed: reservations.filter(r => r.status === 'confirmed' || r.status === 'paid').length
        };
    }, [reservations]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            {/* Sidebar */}
            <AdminSidebar
                activePage="reservations"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">통합 예약 관리</h1>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button className="p-2 text-slate-400 hover:text-teal-500 transition-colors">
                                <span className="material-symbols-outlined">notifications</span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                            </button>
                        </div>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">관리자님, 환영합니다</span>
                            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-500">
                                <span className="material-symbols-outlined">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-6 bg-slate-50 dark:bg-slate-900">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">전체 예약</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{stats.total}건</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">list_alt</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">입금 대기</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{stats.pending}건</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">예약 확정</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{stats.confirmed}건</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">event_available</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Section */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-slate-400 mb-2">예약자 / 상품명 검색</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                    <input
                                        type="text"
                                        placeholder="이름 또는 투어명 검색"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">예약 구분</label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                                >
                                    <option>전체 유형</option>
                                    <option value="product">일반 상품</option>
                                    <option value="quote">맞춤 견적</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">결제 상태</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                                >
                                    <option>전체 상태</option>
                                    <option value="입금 대기">입금 대기</option>
                                    <option value="결제 완료">결제 완료</option>
                                    <option value="예약 확정">예약 확정</option>
                                    <option value="취소됨">취소됨</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <button onClick={() => { setSearchTerm(''); setFilterStatus('전체 상태'); setFilterType('전체 유형'); }} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-lg">refresh</span>
                                    초기화
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Reservation Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">구분</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">예약일</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">예약내용 (상품명/견적명)</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">예약자</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">여행일정</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">총 결제금액 (예약금)</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">상태</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {displayedReservations.length > 0 ? displayedReservations.map((res) => (
                                        <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${res.type !== 'quote' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                                    {res.type !== 'quote' ? '일반상품' : (res.type === 'quote' ? '맞춤견적' : '맞춤견적')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">{res.bookedAt}</td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={res.productName}>
                                                    {res.productName}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">{res.headcount}</div>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                                                <div className="font-medium">{res.customerName}</div>
                                                <div className="text-xs text-slate-400">{res.phone}</div>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{res.date}</td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">{typeof res.totalAmount === 'number' && !isNaN(res.totalAmount) ? res.totalAmount.toLocaleString() : 0}원</div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500">(예약금: {typeof res.deposit === 'number' && !isNaN(res.deposit) ? res.deposit.toLocaleString() : 0}원)</div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <StatusDropdown
                                                    status={res.status}
                                                    onChange={(newStatus) => handleStatusChange(res.id, newStatus, res.type)}
                                                />
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedReservation(res)}
                                                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                                                    >
                                                        {res.type === 'quote' ? '견적 관리' : '상세'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(res.id, res.type)}
                                                        className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                                        title="삭제"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                                                검색 결과가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span className="text-xs">
                                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredReservations.length)} of {filteredReservations.length} entries
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {selectedReservation && selectedReservation.type !== 'quote' && (
                <ReservationDetailModal
                    reservation={selectedReservation}
                    onClose={() => setSelectedReservation(null)}
                    onUpdate={handleUpdateReservation}
                />
            )}



            {selectedReservation && selectedReservation.type === 'quote' && selectedReservation.quoteDetail && (
                <QuoteDetailModal
                    request={selectedReservation.quoteDetail}
                    onClose={() => setSelectedReservation(null)}
                    onUpdateQuote={async (id, updates) => {
                        try {
                            await api.quotes.update(id, {
                                destination: updates.destination,
                                headcount: updates.headcount,
                                period: updates.period,
                                budget: updates.budget,
                                travel_types: updates.travelTypes,
                                accommodations: updates.accommodations,
                                vehicle: updates.vehicle,
                                confirmed_price: updates.confirmed_price,
                                deposit: updates.deposit,
                                updated_at: new Date().toISOString()
                            });
                            fetchReservations();
                        } catch (e) {
                            console.error(e);
                            alert('견적 수정 실패');
                        }
                    }}
                    onSendEstimate={async (url, note, priceDetail, confirmedStartDate, confirmedEndDate) => {
                        // Handle Send Estimate
                        try {
                            // 1. Update Database
                            await api.quotes.update(selectedReservation.id, {
                                status: 'answered',
                                admin_note: note,
                                estimate_url: url,
                                confirmed_price: priceDetail.totalAmount || null,
                                deposit: priceDetail.deposit || null,
                                confirmed_start_date: confirmedStartDate || null,
                                confirmed_end_date: confirmedEndDate || null,
                                updated_at: new Date().toISOString()
                            });

                            // 2. Send Email (Separate try-catch to not block UI success if email fails)
                            try {
                                const emailResult = await sendNotificationEmail(
                                    selectedReservation.email,
                                    'ESTIMATE_COMPLETED',
                                    {
                                        customerName: selectedReservation.customerName,
                                        destination: selectedReservation.productName.replace(' 맞춤 견적', ''),
                                        estimateUrl: url,
                                        adminNote: note
                                    }
                                );

                                if (!emailResult.success) {
                                    console.error('Email Send Error:', emailResult.error);
                                    alert('견적 정보는 저장되었으나, 이메일 발송에 실패했습니다.');
                                } else {
                                    alert(`견적서가 발송되었습니다. (이메일 알림 포함)\n확정 금액: ${priceDetail.totalAmount ? priceDetail.totalAmount.toLocaleString() + '원' : '미입력'}`);
                                }
                            } catch (emailError) {
                                console.error('Email Unexpected Error:', emailError);
                                alert('견적 정보는 저장되었으나, 이메일 발송 중 오류가 발생했습니다.');
                            }

                            fetchReservations();
                            setSelectedReservation(null);

                        } catch (e: any) {
                            console.error(e);
                            alert(`견적서 발송 실패: ${e.message}`);
                        }
                    }}
                    onOpenConvert={() => {
                        if (selectedReservation.quoteDetail) {
                            setConvertTarget(selectedReservation.quoteDetail);
                        }
                    }}
                />
            )}
            {convertTarget && (
                <ConvertSelectionModal
                    request={convertTarget}
                    onClose={() => setConvertTarget(null)}
                    onConvert={async (data) => {
                        try {
                            // 1. Create Reservation
                            const reservationPayload = {
                                type: 'quote',
                                product_name: `${convertTarget.destination} 맞춤 견적`,
                                customer_name: convertTarget.name,
                                customer_phone: convertTarget.phone,
                                customer_email: convertTarget.email,
                                total_people: parseInt(convertTarget.headcount.replace(/[^0-9]/g, '')) || 0,
                                start_date: data.startDate,
                                end_date: data.endDate,
                                status: 'pending_payment',
                                price_breakdown: {
                                    total: data.totalAmount,
                                    deposit: data.deposit,
                                    local: data.totalAmount - data.deposit
                                },
                                bank_account: {
                                    bankName: '국민은행',
                                    accountNumber: '123-456-789012',
                                    accountHolder: '밀키웨이투어'
                                },
                                user_id: convertTarget.userId
                            };

                            await api.reservations.create(reservationPayload);

                            // 2. Update Quote Status
                            await api.quotes.update(convertTarget.id, {
                                status: 'converted',
                                updated_at: new Date().toISOString()
                            });

                            alert('예약이 성공적으로 생성되었습니다.');

                            // Optionally send email here too?
                            // await sendNotificationEmail(...)

                            setConvertTarget(null);
                            setSelectedReservation(null);
                            fetchReservations();

                        } catch (e: any) {
                            console.error(e);
                            alert(`예약 생성 실패: ${e.message}`);
                        }
                    }}
                />
            )}
        </div>
    );
};
