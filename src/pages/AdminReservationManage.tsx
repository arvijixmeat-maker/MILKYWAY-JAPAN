import React, { useState, useMemo, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { GuideSelectionModal, AccommodationSelectionModal } from '../components/admin/SelectionModals';
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
                        <div className={`w-2 h-8 rounded-full ${reservation.type === 'product' ? 'bg-indigo-500' : 'bg-purple-500'}`}></div>
                        <div>
                            <h2 className="text-xl font-bold">예약 상세 정보</h2>
                            <p className="text-sm text-slate-500 font-medium">No. {reservation.id.slice(0, 8).toUpperCase()}</p>
                        </div>
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
                    {/* Payment Info Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">payments</span>
                                결제 정보 확인
                            </h3>
                            {isEditing && <span className="text-xs text-amber-500 font-bold animate-pulse">수정 중...</span>}
                        </div>

                        <div className={`bg-slate-50 dark:bg-slate-700/30 rounded-xl border ${isEditing ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-100 dark:border-slate-700'} overflow-hidden transition-all duration-300`}>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold">
                                    <tr>
                                        <th className="px-4 py-3">항목</th>
                                        <th className="px-4 py-3 text-right">금액</th>
                                        <th className="px-4 py-3 text-center">상태</th>
                                        <th className="px-4 py-3 text-center">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {/* Total */}
                                    <tr>
                                        <td className="px-4 py-3 font-medium">총 상품 금액</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editForm.totalAmount}
                                                    onChange={(e) => setEditForm({ ...editForm, totalAmount: Number(e.target.value), balance: Number(e.target.value) - editForm.deposit })}
                                                    className="w-32 text-right px-2 py-1 border rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                />
                                            ) : (
                                                `${reservation.totalAmount.toLocaleString()}원`
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {editForm.status === 'paid' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">전액완납</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">미납/진행중</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={toggleTotalStatus}
                                                className={`text-xs px-2 py-1 rounded border transition-colors ${editForm.status === 'paid'
                                                    ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                    : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                            >
                                                {editForm.status === 'paid' ? '취소' : '완납처리'}
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Deposit */}
                                    <tr>
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                                            예약금 (Deposit)
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-teal-600">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editForm.deposit}
                                                    onChange={(e) => setEditForm({ ...editForm, deposit: Number(e.target.value), balance: editForm.totalAmount - Number(e.target.value) })}
                                                    className="w-32 text-right px-2 py-1 border rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                />
                                            ) : (
                                                `${reservation.deposit.toLocaleString()}원`
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {editForm.depositStatus === 'paid' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-700">완납</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">미납</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={toggleDepositStatus}
                                                className={`text-xs px-2 py-1 rounded border transition-colors ${editForm.depositStatus === 'paid'
                                                    ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                    : 'border-teal-200 bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
                                            >
                                                {editForm.depositStatus === 'paid' ? '취소' : '입금확인'}
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Balance */}
                                    <tr>
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            잔금 (Balance)
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-blue-600">
                                            {isEditing
                                                ? (editForm.totalAmount - editForm.deposit).toLocaleString()
                                                : reservation.balance.toLocaleString()
                                            }원
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {editForm.balanceStatus === 'paid' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">완납</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">미납</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={toggleBalanceStatus}
                                                className={`text-xs px-2 py-1 rounded border transition-colors ${editForm.balanceStatus === 'paid'
                                                    ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                    : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                            >
                                                {editForm.balanceStatus === 'paid' ? '취소' : '입금확인'}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Documents & Sending Section */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">folder_open</span>
                            문서 및 발송 (여행자 제공용)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Contract Card */}
                            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">description</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white">여행 계약서</p>
                                        <p className="text-xs text-slate-500">Google Sheet / Excel URL</p>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            value={editForm.contractUrl || ''}
                                            onChange={(e) => setEditForm({ ...editForm, contractUrl: e.target.value })}
                                            className="w-full text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-500 rounded bg-slate-50 dark:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    ) : (
                                        <div className="text-xs text-slate-500 truncate bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded border border-slate-100 dark:border-slate-600">
                                            {reservation.contractUrl ? (
                                                <a href={reservation.contractUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">link</span>
                                                    {reservation.contractUrl}
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">URL이 입력되지 않았습니다.</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleSendLink('여행계약서', isEditing ? editForm.contractUrl : reservation.contractUrl)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg transition-colors border border-teal-100"
                                >
                                    <span className="material-symbols-outlined text-sm">send</span>
                                    계약서 링크 발송
                                </button>
                            </div>

                            {/* Itinerary Card */}
                            <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">map</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white">확정 일정표</p>
                                        <p className="text-xs text-slate-500">Google Sheet / Excel URL</p>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            value={editForm.itineraryUrl || ''}
                                            onChange={(e) => setEditForm({ ...editForm, itineraryUrl: e.target.value })}
                                            className="w-full text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-500 rounded bg-slate-50 dark:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <div className="text-xs text-slate-500 truncate bg-slate-50 dark:bg-slate-800 px-2 py-1.5 rounded border border-slate-100 dark:border-slate-600">
                                            {reservation.itineraryUrl ? (
                                                <a href={reservation.itineraryUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">link</span>
                                                    {reservation.itineraryUrl}
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">URL이 입력되지 않았습니다.</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleSendLink('확정일정표', isEditing ? editForm.itineraryUrl : reservation.itineraryUrl)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors border border-blue-100"
                                >
                                    <span className="material-symbols-outlined text-sm">send</span>
                                    일정표 링크 발송
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* Product Info */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">inventory_2</span>
                            상품 정보
                        </h3>
                        <div className="p-5 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-2 ${reservation.type === 'product' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {reservation.type === 'product' ? '일반상품' : '맞춤견적'}
                                    </span>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{reservation.productName}</h4>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">여행 일정</p>
                                    <p className="font-medium">{reservation.date}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">접수 일자</p>
                                    <p className="font-medium">{reservation.bookedAt}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">person</span>
                            예약자 정보
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">이름</p>
                                <p className="font-medium">{reservation.customerName}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">인원</p>
                                {isEditing ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={editForm.totalPeople || ''}
                                            onChange={(e) => setEditForm(prev => prev ? ({ ...prev, totalPeople: parseInt(e.target.value) || 0, headcount: `${e.target.value}명` }) : null)}
                                            className="w-full font-medium bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                            placeholder="0"
                                        />
                                        <span className="text-sm">명</span>
                                    </div>
                                ) : (
                                    <p className="font-medium">{reservation.headcount}</p>
                                )}
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">연락처</p>
                                <p className="font-medium">{reservation.phone}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">이메일</p>
                                <p className="font-medium">{reservation.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Guide & Accommodation Assignment Section */}
                    {!isEditing && (
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mt-6">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">assignment_ind</span>
                                가이드 & 숙소 할당
                            </h3>

                            {/* Guide Assignment */}
                            <div className="mb-6">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">담당 가이드</p>
                                {reservation.assignedGuide ? (
                                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <img src={reservation.assignedGuide.image} alt={reservation.assignedGuide.name} className="w-12 h-12 rounded-full object-cover" />
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{reservation.assignedGuide.name}</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400">{reservation.assignedGuide.phone}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowGuideModal(true)}
                                            className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-600"
                                        >
                                            변경
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowGuideModal(true)}
                                        className="w-full px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-xl text-slate-400">add</span>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">가이드 할당</p>
                                    </button>
                                )}
                            </div>

                            {/* Accommodation Assignment */}
                            <div>
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">숙소 일정</p>
                                <div className="space-y-2">
                                    {Array.from({ length: getTripDays() }, (_, i) => i + 1).map(day => {
                                        const assigned = reservation.dailyAccommodations?.find(d => d.day === day);
                                        return (
                                            <div key={day} className="flex items-center justify-between p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs font-bold rounded">{day}일차</span>
                                                    </div>
                                                    {assigned ? (
                                                        <p className="text-xs font-medium text-slate-800 dark:text-white">{assigned.accommodation.name}</p>
                                                    ) : (
                                                        <p className="text-xs text-slate-500 dark:text-slate-500">미할당</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedDay(day);
                                                        setShowAccommodationModal(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-600"
                                                >
                                                    {assigned ? '변경' : '선택'}
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {/* Add Day Button */}
                                    <button
                                        onClick={() => setExtraDays(prev => prev + 1)}
                                        className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors text-xs font-bold flex items-center justify-center gap-1 mb-4"
                                    >
                                        <span className="material-symbols-outlined text-sm">add_circle</span>
                                        일차 추가
                                    </button>

                                    {/* Publish Button */}
                                    <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
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
                                                        {
                                                            timestamp: new Date().toISOString(),
                                                            type: 'modification', // or 'assignment_published'
                                                            description: '가이드/숙소 배정 정보가 발송되었습니다.'
                                                        }
                                                    ]
                                                };
                                                onUpdate(updated);

                                                // Send Email Notification
                                                await sendNotificationEmail(
                                                    reservation.email,
                                                    'GUIDE_ASSIGNED',
                                                    {
                                                        customerName: reservation.customerName,
                                                        productName: reservation.productName,
                                                        guideName: reservation.assignedGuide?.name,
                                                        guidePhone: reservation.assignedGuide?.phone
                                                    }
                                                );

                                                alert('사용자에게 배정 정보를 발송(공개)했습니다. (이메일 알림 포함)');
                                            }}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${reservation.areAssignmentsVisibleToUser
                                                ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                                                }`}
                                            disabled={reservation.areAssignmentsVisibleToUser}
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {reservation.areAssignmentsVisibleToUser ? 'check_circle' : 'send'}
                                            </span>
                                            {reservation.areAssignmentsVisibleToUser ? '발송 완료됨' : '배정 정보 발송하기'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleCancel}
                                className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold shadow-lg shadow-teal-500/20 transition-all text-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">check</span>
                                저장 완료
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                            >
                                닫기
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all text-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                정보 수정
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
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

            // 1. Fetch Reservations and Quotes using API
            const [resData, quoteData] = await Promise.all([
                api.reservations.list(),
                api.quotes.list()
            ]);

            const allItems: Reservation[] = [];

            // Map Reservations
            if (resData) {
                const mappedReservations: Reservation[] = resData.map((r: any) => ({
                    id: r.id,
                    type: r.type || 'product',
                    productName: r.product_name || r.productName,
                    customerName: r.customer_info?.name || r.customer_name || r.customerName || 'Unknown',
                    date: r.start_date
                        ? `${new Date(r.start_date).toLocaleDateString('ko-KR')} ~ ${new Date(r.end_date).toLocaleDateString('ko-KR')}`
                        : r.duration || '날짜 미정',
                    bookedAt: r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR') : '',
                    status: r.status,
                    totalAmount: r.total_amount || r.price_breakdown?.total || r.totalAmount || 0,
                    deposit: r.deposit_amount || r.price_breakdown?.deposit || r.deposit || 0,
                    depositStatus: r.deposit_status || r.depositStatus || (r.status === 'pending_payment' ? 'unpaid' : 'paid'),
                    balance: (r.total_amount || r.price_breakdown?.total || r.totalAmount || 0) - (r.deposit_amount || r.price_breakdown?.deposit || r.deposit || 0),
                    balanceStatus: r.balance_status || r.balanceStatus || 'unpaid',
                    contractUrl: r.contract_url || r.contractUrl,
                    itineraryUrl: r.itinerary_url || r.itineraryUrl,
                    assignedGuide: r.assigned_guide || r.assignedGuide,
                    dailyAccommodations: r.daily_accommodations || r.dailyAccommodations,
                    history: r.history || [],
                    areAssignmentsVisibleToUser: r.are_assignments_visible_to_user || r.areAssignmentsVisibleToUser || false,
                    headcount: r.total_people ? `${r.total_people}명` : '미정',
                    totalPeople: r.total_people || r.totalPeople || 0,
                    phone: r.customer_info?.phone || r.customer_phone || r.phone || '',
                    email: r.customer_info?.email || r.customer_email || r.email || '',
                    userId: r.user_id || r.userId // Map user_id
                }));
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

                const mappedQuotes: Reservation[] = activeQuotes.map((q: any) => ({
                    id: q.id,
                    type: 'quote',
                    productName: `${q.destination} 맞춤 견적`,
                    customerName: q.name,
                    date: q.period || '일정 미정',
                    bookedAt: q.created_at ? new Date(q.created_at).toLocaleDateString('ko-KR') : '',
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
                    userId: q.user_id || q.userId,
                    quoteDetail: {
                        ...q,
                        userId: q.user_id || q.userId,
                        // Fix for camelCase vs snake_case
                        travelTypes: q.travel_types || q.travelTypes || [],
                        accommodations: q.accommodations || [],
                        additionalRequest: q.additional_request || q.additionalRequest,
                        adminNote: q.admin_note || q.adminNote,
                        estimateUrl: q.estimate_url || q.estimateUrl,
                        confirmedPrice: q.confirmed_price || q.confirmedPrice,
                        date: q.created_at ? new Date(q.created_at).toLocaleDateString() : ''
                    }
                }));
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
                (filterType === '일반 상품' && res.type === 'product');

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
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${res.type === 'product' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                                    {res.type === 'product' ? '일반상품' : (res.type === 'quote' ? '맞춤견적' : '맞춤견적')}
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
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">{res.totalAmount.toLocaleString()}원</div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500">(예약금: {res.deposit.toLocaleString()}원)</div>
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
                            const { error } = await supabase
                                .from('quotes')
                                .update({
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
                                })
                                .eq('id', id);

                            if (error) throw error;
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
                            const { error } = await supabase
                                .from('quotes')
                                .update({
                                    status: 'answered',
                                    admin_note: note,
                                    estimate_url: url,
                                    confirmed_price: priceDetail.totalAmount || null,
                                    deposit: priceDetail.deposit || null,
                                    confirmed_start_date: confirmedStartDate || null,
                                    confirmed_end_date: confirmedEndDate || null,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', selectedReservation.id);

                            if (error) {
                                console.error('DB Update Error:', error);
                                throw new Error(`DB 업데이트 실패: ${error.message}`);
                            }

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
