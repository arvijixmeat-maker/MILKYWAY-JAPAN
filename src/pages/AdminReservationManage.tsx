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
    itineraryTemplateId?: string; // selected itinerary template

    contractData?: {
        travelers?: Array<{ name?: string; passportName?: string; age?: number | string; phone?: string; gender?: string }>;
        arrival?: { date?: string; time?: string; flight?: string };
        departure?: { date?: string; time?: string; flight?: string };
        region?: string;
        category?: string;
        issuedDate?: string;
    };

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
    const [memoDraft, setMemoDraft] = useState('');
    const [memoFocused, setMemoFocused] = useState(false);
    const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
    const [templatesList, setTemplatesList] = useState<any[]>([]);
    const [sendingItinerary, setSendingItinerary] = useState(false);
    const [contractEditorOpen, setContractEditorOpen] = useState(false);
    const [sendingContract, setSendingContract] = useState(false);

    useEffect(() => {
        api.itineraryTemplates.list().then((data: any) => {
            if (Array.isArray(data)) setTemplatesList(data);
        }).catch(() => {});
    }, []);

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

    // Derived data
    const memos = (reservation.history || []).filter((h: any) => h.type === 'admin_memo');
    const timelineEvents = (reservation.history || []).filter((h: any) => h.type !== 'admin_memo');
    const paidAmount = (editForm.depositStatus === 'paid' ? editForm.deposit : 0) + (editForm.balanceStatus === 'paid' ? (editForm.totalAmount - editForm.deposit) : 0);
    const paidPercent = editForm.totalAmount > 0 ? Math.round((paidAmount / editForm.totalAmount) * 100) : 0;
    const getInitials = (name: string) => (name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const addMemo = () => {
        const text = memoDraft.trim();
        if (!text) return;
        const updated = {
            ...reservation,
            history: [
                ...(reservation.history || []),
                { timestamp: new Date().toISOString(), type: 'admin_memo', description: text }
            ]
        };
        onUpdate(updated);
        setMemoDraft('');
        setMemoFocused(false);
    };

    const deleteMemo = (ts: string) => {
        const updated = {
            ...reservation,
            history: (reservation.history || []).filter((h: any) => h.timestamp !== ts)
        };
        onUpdate(updated);
    };

    const timelineIcon: Record<string, string> = {
        created: 'add_circle',
        email: 'mail',
        note: 'sticky_note_2',
        call: 'call',
        modification: 'edit_note',
        payment: 'payments',
        document_added: 'description',
        assignment: 'assignment_ind',
    };

    return (<>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">

                {/* Header */}
                <div className="px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0 gap-5 bg-white dark:bg-slate-900">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 tracking-wide">
                                {reservation.type !== 'quote' ? '일반상품' : '맞춤견적'}
                            </span>
                            <span className="text-xs font-mono font-semibold text-slate-500">#{(reservation as any).reservationNumber || reservation.id.slice(0, 8).toUpperCase()}</span>
                            <span className="text-xs text-slate-300">·</span>
                            <span className="text-xs text-slate-500">접수 {reservation.bookedAt}</span>
                        </div>
                        <h2 className="text-slate-900 dark:text-white font-bold text-xl leading-tight tracking-tight truncate">{reservation.productName}</h2>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusDropdown
                            status={editForm.status}
                            onChange={(s) => { setEditForm({ ...editForm, status: s }); if (!isEditing) onUpdate({ ...editForm, status: s }); }}
                        />
                        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/40">
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* LEFT COLUMN */}
                        <div className="space-y-5 min-w-0">

                            {/* Trip Summary Hero */}
                            <section className="relative rounded-2xl overflow-hidden text-white shadow-xl shadow-teal-500/20"
                                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}>
                                <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none"></div>
                                <div className="absolute top-8 right-10 w-20 h-20 rounded-full bg-white/5 pointer-events-none"></div>
                                <div className="relative p-5">
                                    <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/70 mb-1.5">여행 기간</p>
                                    <p className="text-xl font-bold tracking-tight leading-snug">{reservation.date}</p>
                                    <div className="flex items-center gap-2 mt-2.5 text-[11px] text-white/80">
                                        <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-sm">event_available</span>접수일 {reservation.bookedAt}</span>
                                        <span className="opacity-40">·</span>
                                        <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span>{reservation.headcount || '인원 미정'}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Guest Card */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-500">person</span>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">예약자 정보</h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold tracking-tight shadow-md shadow-teal-500/30 flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
                                            {getInitials(reservation.customerName)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate tracking-tight">{reservation.customerName}</p>
                                            {isEditing ? (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <input
                                                        type="number"
                                                        value={editForm.totalPeople || ''}
                                                        onChange={(e) => setEditForm(prev => prev ? ({ ...prev, totalPeople: parseInt(e.target.value) || 0, headcount: `${e.target.value}명` }) : null)}
                                                        className="w-16 text-xs font-semibold bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                    />
                                                    <span className="text-xs text-slate-400">명</span>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 mt-0.5">{reservation.headcount}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 grid grid-cols-2 gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">연락처</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono truncate">{reservation.phone || '—'}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">이메일</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{reservation.email || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Admin Memo */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-500">sticky_note_2</span>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">관리자 메모</h3>
                                    </div>
                                    <span className="text-[11px] text-slate-400">내부 공유 전용 · 고객 비공개</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                                    <div className={`p-3 ${memos.length ? 'border-b border-slate-100 dark:border-slate-700' : ''}`} style={{ background: '#fcfcfa' }}>
                                        <div className={`bg-white dark:bg-slate-900 rounded-xl transition-all ${memoFocused ? 'ring-2 ring-teal-500 ring-offset-0' : 'border border-slate-200 dark:border-slate-700'}`}>
                                            <textarea
                                                value={memoDraft}
                                                onChange={e => setMemoDraft(e.target.value)}
                                                onFocus={() => setMemoFocused(true)}
                                                onBlur={() => setMemoFocused(false)}
                                                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addMemo(); }}
                                                placeholder="이 예약에 대한 메모를 남기세요. (예: 고객 특이사항, 파트너 연락 결과…)"
                                                rows={memoFocused || memoDraft ? 3 : 2}
                                                className="w-full px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 bg-transparent outline-none resize-none leading-relaxed"
                                            />
                                            <div className="flex items-center justify-between px-3 pb-2 gap-2">
                                                <span className="text-[11px] text-slate-400">⌘ + Enter 로 저장</span>
                                                <button
                                                    onClick={addMemo}
                                                    disabled={!memoDraft.trim()}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${memoDraft.trim() ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-default'}`}
                                                >
                                                    메모 추가
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {memos.length > 0 && (
                                        <ul className="p-1">
                                            {[...memos].reverse().map((m: any) => (
                                                <li key={m.timestamp} className="group grid grid-cols-[1fr_auto] gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">{m.description}</p>
                                                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                                                            <span className="font-semibold text-slate-500">Admin</span>
                                                            <span>·</span>
                                                            <span>{new Date(m.timestamp).toLocaleString('ko-KR')}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteMemo(m.timestamp)}
                                                        className="self-start opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                        title="메모 삭제"
                                                    >
                                                        <span className="material-symbols-outlined text-base">delete_outline</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </section>

                            {/* Payment with Progress Ring */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-500">payments</span>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">결제 현황</h3>
                                    </div>
                                    {isEditing && <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">수정 중</span>}
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5">
                                    {/* Summary with ring */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative w-[62px] h-[62px] flex-shrink-0">
                                            <svg width="62" height="62" viewBox="0 0 62 62">
                                                <circle cx="31" cy="31" r="26" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                                                <circle cx="31" cy="31" r="26" fill="none" stroke="#0f766e" strokeWidth="5" strokeLinecap="round"
                                                    strokeDasharray={2 * Math.PI * 26}
                                                    strokeDashoffset={2 * Math.PI * 26 * (1 - paidPercent / 100)}
                                                    transform="rotate(-90 31 31)"
                                                    style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                                                />
                                            </svg>
                                            <div className={`absolute inset-0 flex items-center justify-center text-xs font-extrabold ${paidPercent >= 100 ? 'text-teal-600' : 'text-slate-900 dark:text-white'}`}>
                                                {paidPercent}%
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">입금 현황</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {paidPercent >= 100 ? '완납 완료' : `잔액 ₩${(editForm.totalAmount - paidAmount).toLocaleString()}`}
                                                </p>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.totalAmount}
                                                        onChange={(e) => setEditForm({ ...editForm, totalAmount: Number(e.target.value), balance: Number(e.target.value) - editForm.deposit })}
                                                        className="w-32 text-xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                    />
                                                ) : (
                                                    <>
                                                        <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">₩{paidAmount.toLocaleString()}</span>
                                                        <span className="text-xs text-slate-400 font-medium">/ ₩{(editForm.totalAmount || 0).toLocaleString()}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleTotalStatus}
                                            className={`h-9 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors flex-shrink-0 ${editForm.status === 'paid' ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <span className="material-symbols-outlined text-base">done_all</span>
                                            {editForm.status === 'paid' ? '전액완납' : '완납 처리'}
                                        </button>
                                    </div>
                                    {/* Deposit + Balance cells */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className={`rounded-xl border p-3.5 transition-all ${editForm.depositStatus === 'paid' ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700'}`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">예약금</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider ${editForm.depositStatus === 'paid' ? 'bg-teal-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                                    {editForm.depositStatus === 'paid' ? '입금' : '미납'}
                                                </span>
                                            </div>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editForm.deposit}
                                                    onChange={(e) => setEditForm({ ...editForm, deposit: Number(e.target.value), balance: editForm.totalAmount - Number(e.target.value) })}
                                                    className="w-full text-base font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                />
                                            ) : (
                                                <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">₩{(editForm.deposit || 0).toLocaleString()}</p>
                                            )}
                                            {editForm.depositStatus !== 'paid' && (
                                                <button onClick={toggleDepositStatus} className="mt-2 w-full py-1 text-[11px] font-bold rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 inline-flex items-center justify-center gap-1 transition-colors">
                                                    <span className="material-symbols-outlined text-xs">check</span>입금 확인
                                                </button>
                                            )}
                                            {editForm.depositStatus === 'paid' && (
                                                <button onClick={toggleDepositStatus} className="mt-2 w-full py-1 text-[11px] font-semibold rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                    입금 취소
                                                </button>
                                            )}
                                        </div>
                                        <div className={`rounded-xl border p-3.5 transition-all ${editForm.balanceStatus === 'paid' ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700'}`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">잔금</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider ${editForm.balanceStatus === 'paid' ? 'bg-teal-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                                    {editForm.balanceStatus === 'paid' ? '입금' : '미납'}
                                                </span>
                                            </div>
                                            <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                                                ₩{((editForm.totalAmount || 0) - (editForm.deposit || 0)).toLocaleString()}
                                            </p>
                                            {editForm.balanceStatus !== 'paid' && (
                                                <button onClick={toggleBalanceStatus} className="mt-2 w-full py-1 text-[11px] font-bold rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 inline-flex items-center justify-center gap-1 transition-colors">
                                                    <span className="material-symbols-outlined text-xs">check</span>입금 확인
                                                </button>
                                            )}
                                            {editForm.balanceStatus === 'paid' && (
                                                <button onClick={toggleBalanceStatus} className="mt-2 w-full py-1 text-[11px] font-semibold rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                    입금 취소
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-5 min-w-0">

                            {/* Guide */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-base text-slate-500">badge</span>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">담당 가이드</h3>
                                </div>
                                {reservation.assignedGuide ? (
                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-3.5 grid grid-cols-[44px_1fr_auto] gap-3 items-center">
                                        {reservation.assignedGuide.image ? (
                                            <img src={reservation.assignedGuide.image} alt={reservation.assignedGuide.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-md shadow-teal-500/20" />
                                        ) : (
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md shadow-teal-500/30"
                                                style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
                                                {getInitials(reservation.assignedGuide.name)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{reservation.assignedGuide.name}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{reservation.assignedGuide.phone}</p>
                                        </div>
                                        <button onClick={() => setShowGuideModal(true)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1 transition-colors">
                                            <span className="material-symbols-outlined text-sm">swap_horiz</span>변경
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowGuideModal(true)}
                                        className="w-full py-[18px] bg-white dark:bg-slate-800 border-[1.5px] border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 text-slate-400 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all">
                                        <span className="material-symbols-outlined text-lg">person_add</span>
                                        가이드 배정하기
                                    </button>
                                )}
                            </section>

                            {/* Trip Timeline */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-500">route</span>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">여행 일정 & 배정</h3>
                                    </div>
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
                                        className={`text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${reservation.areAssignmentsVisibleToUser ? 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 cursor-default' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        <span className="material-symbols-outlined text-sm">{reservation.areAssignmentsVisibleToUser ? 'check_circle' : 'send'}</span>
                                        {reservation.areAssignmentsVisibleToUser ? '고객 발송 완료' : '배정 정보 고객에게 발송'}
                                    </button>
                                </div>
                                <div className="relative">
                                    {Array.from({ length: getTripDays() }, (_, i) => i + 1).map((day, idx, arr) => {
                                        const assigned = reservation.dailyAccommodations?.find(d => d.day === day);
                                        const isLast = idx === arr.length - 1;
                                        const isFirst = idx === 0;
                                        return (
                                            <div key={day} className="grid grid-cols-[40px_1fr] gap-3 pb-3.5" style={{ position: 'relative' }}>
                                                {/* Node column */}
                                                <div className="relative" style={{ width: 40 }}>
                                                    {!isLast && <div className="absolute left-[19px] bg-slate-200 dark:bg-slate-700" style={{ top: 46, bottom: -14, width: 2, borderRadius: 2, zIndex: 1 }} />}
                                                    {!isFirst && <div className="absolute left-[19px] bg-slate-200 dark:bg-slate-700" style={{ top: 0, height: 14, width: 2, borderRadius: 2, zIndex: 1 }} />}
                                                    <div className={`absolute top-[14px] left-[4px] w-8 h-8 rounded-full border-2 border-teal-600 flex items-center justify-center text-[10px] font-extrabold tracking-tight shadow-sm ${assigned ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800 text-teal-600'}`} style={{ zIndex: 2 }}>
                                                        D-{day}
                                                    </div>
                                                </div>
                                                {/* Content */}
                                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
                                                    <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{day}일차</span>
                                                        <span className="text-[11px] text-slate-400">{assigned ? (assigned.accommodation.location || '—') : '일정 미지정'}</span>
                                                    </div>
                                                    <div className="p-3">
                                                        <button onClick={() => { setSelectedDay(day); setShowAccommodationModal(true); }}
                                                            className={`w-full h-[38px] px-3 text-left text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors ${assigned ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                            <span className="material-symbols-outlined text-base">hotel</span>
                                                            <span className="flex-1 truncate">{assigned ? assigned.accommodation.name : '숙소 선택'}</span>
                                                            <span className="material-symbols-outlined text-sm opacity-70">{assigned ? 'edit' : 'add'}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => setExtraDays(prev => prev + 1)}
                                        className="ml-[54px] mt-1 inline-flex items-center gap-1 px-3 py-2 text-[11px] font-semibold text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-sm">add</span>일차 추가
                                    </button>
                                </div>
                            </section>

                            {/* Documents */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-base text-slate-500">folder_shared</span>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">문서 발송</h3>
                                </div>
                                <div className="flex flex-col gap-2">

                                    {/* Itinerary — template-based auto link */}
                                    {(() => {
                                        const itineraryUrl = `${window.location.origin}/documents/itinerary/${(reservation as any).reservationNumber || reservation.id}`;
                                        const templateId = editForm.itineraryTemplateId || '';
                                        const selectedTemplate = templatesList.find((t: any) => t.id === templateId);
                                        const ready = !!templateId;
                                        return (
                                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                                                <div className="grid grid-cols-[36px_1fr_auto] gap-3 items-center px-3.5 py-3">
                                                    <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                                                        <span className="material-symbols-outlined text-lg">map</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">확정 일정표</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                                            {ready ? `${selectedTemplate?.name || '템플릿'} · 자동 생성 링크` : '템플릿 선택 필요'}
                                                        </p>
                                                    </div>
                                                    {ready ? (
                                                        <span className="text-[11px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 text-teal-700">
                                                            <span className="material-symbols-outlined text-xs">check_circle</span>준비됨
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                                                            <span className="material-symbols-outlined text-xs">schedule</span>미설정
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="px-3.5 pb-3.5 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="mt-3 space-y-2">
                                                        <label className="text-[11px] font-semibold text-slate-500">일정 템플릿</label>
                                                        <select
                                                            value={templateId}
                                                            onChange={e => {
                                                                const newId = e.target.value || undefined;
                                                                const updated = { ...reservation, itineraryTemplateId: newId } as Reservation;
                                                                setEditForm(prev => prev ? { ...prev, itineraryTemplateId: newId } : prev);
                                                                onUpdate(updated);
                                                            }}
                                                            className="w-full h-[38px] px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                        >
                                                            <option value="">— 템플릿 선택 —</option>
                                                            {templatesList.map((t: any) => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                        {ready && (
                                                            <div className="text-[11px] text-slate-400 font-mono truncate px-1">
                                                                {itineraryUrl}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2 pt-1">
                                                            <button
                                                                onClick={() => window.open(itineraryUrl, '_blank')}
                                                                disabled={!ready}
                                                                className={`flex-1 h-[34px] text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${ready ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">open_in_new</span>미리보기
                                                            </button>
                                                            <button
                                                                onClick={() => { if (!ready) return; navigator.clipboard.writeText(itineraryUrl); setCopiedDocId('itinerary'); setTimeout(() => setCopiedDocId(null), 1500); }}
                                                                disabled={!ready}
                                                                className={`flex-1 h-[34px] text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${ready ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">{copiedDocId === 'itinerary' ? 'check' : 'content_copy'}</span>
                                                                {copiedDocId === 'itinerary' ? '복사됨' : '복사'}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!ready || !reservation.email) { alert(!reservation.email ? '고객 이메일이 없습니다.' : '템플릿을 먼저 선택해 주세요.'); return; }
                                                                    setSendingItinerary(true);
                                                                    try {
                                                                        await sendNotificationEmail(reservation.email, 'ITINERARY_READY', {
                                                                            customerName: reservation.customerName,
                                                                            productName: reservation.productName,
                                                                            reservationId: (reservation as any).reservationNumber || reservation.id,
                                                                            reservationNumber: (reservation as any).reservationNumber,
                                                                            travelDates: reservation.date,
                                                                            itineraryUrl,
                                                                        });
                                                                        const updated = {
                                                                            ...reservation,
                                                                            itineraryUrl,
                                                                            history: [
                                                                                ...(reservation.history || []),
                                                                                { timestamp: new Date().toISOString(), type: 'email', description: '확정 일정표 이메일을 발송했습니다.', detail: itineraryUrl }
                                                                            ]
                                                                        };
                                                                        onUpdate(updated);
                                                                        alert('일정표 링크를 고객에게 발송했습니다.');
                                                                    } catch (e: any) {
                                                                        alert(`발송 실패: ${e.message || e}`);
                                                                    } finally {
                                                                        setSendingItinerary(false);
                                                                    }
                                                                }}
                                                                disabled={!ready || sendingItinerary}
                                                                className={`flex-1 h-[34px] text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${ready && !sendingItinerary ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">send</span>
                                                                {sendingItinerary ? '발송중' : '발송'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Contract — template-based auto link */}
                                    {(() => {
                                        const contractUrl = `${window.location.origin}/documents/contract/${(reservation as any).reservationNumber || reservation.id}`;
                                        const cd = editForm.contractData || {};
                                        const travelers = cd.travelers || [];
                                        const ready = travelers.length > 0 && !!travelers[0]?.name;

                                        const updateContract = (patch: any) => {
                                            const next = { ...(editForm.contractData || {}), ...patch };
                                            const updated = { ...reservation, contractData: next } as Reservation;
                                            setEditForm(prev => prev ? { ...prev, contractData: next } : prev);
                                            onUpdate(updated);
                                        };

                                        const updateTraveler = (idx: number, patch: any) => {
                                            const arr = [...(cd.travelers || [])];
                                            arr[idx] = { ...(arr[idx] || {}), ...patch };
                                            updateContract({ travelers: arr });
                                        };
                                        const addTraveler = () => updateContract({ travelers: [...(cd.travelers || []), { name: '' }] });
                                        const removeTraveler = (idx: number) => {
                                            const arr = [...(cd.travelers || [])];
                                            arr.splice(idx, 1);
                                            updateContract({ travelers: arr });
                                        };

                                        return (
                                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                                                <div className="grid grid-cols-[36px_1fr_auto] gap-3 items-center px-3.5 py-3">
                                                    <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                                                        <span className="material-symbols-outlined text-lg">description</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">여행 계약서</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                                            {ready ? `${travelers.length}명 · 자동 생성 링크` : '여행자 정보 입력 필요'}
                                                        </p>
                                                    </div>
                                                    {ready ? (
                                                        <span className="text-[11px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 text-teal-700">
                                                            <span className="material-symbols-outlined text-xs">check_circle</span>준비됨
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                                                            <span className="material-symbols-outlined text-xs">schedule</span>미설정
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="px-3.5 pb-3.5 border-t border-slate-100 dark:border-slate-700">
                                                    {/* Editor toggle */}
                                                    <button
                                                        onClick={() => setContractEditorOpen(!contractEditorOpen)}
                                                        className="w-full mt-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg inline-flex items-center justify-center gap-1 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">{contractEditorOpen ? 'expand_less' : 'edit'}</span>
                                                        {contractEditorOpen ? '계약서 정보 닫기' : '계약서 정보 편집'}
                                                    </button>

                                                    {contractEditorOpen && (
                                                        <div className="mt-3 space-y-3 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                                                            {/* Travelers */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">여행자</p>
                                                                    <button onClick={addTraveler} className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 inline-flex items-center gap-0.5">
                                                                        <span className="material-symbols-outlined text-xs">add</span>추가
                                                                    </button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {travelers.length === 0 && (
                                                                        <button onClick={addTraveler} className="w-full py-2 text-[11px] font-semibold text-slate-500 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                                                                            여행자 추가
                                                                        </button>
                                                                    )}
                                                                    {travelers.map((t, i) => (
                                                                        <div key={i} className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-2.5 space-y-1.5">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[11px] font-semibold text-slate-500">#{i + 1}</span>
                                                                                <button onClick={() => removeTraveler(i)} className="text-[11px] text-slate-400 hover:text-red-500">
                                                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                                                </button>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                                <input type="text" placeholder="氏名" value={t.name || ''} onChange={e => updateTraveler(i, { name: e.target.value })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                                <input type="text" placeholder="パスポート氏名" value={t.passportName || ''} onChange={e => updateTraveler(i, { passportName: e.target.value })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                                <input type="number" placeholder="年齢" value={t.age || ''} onChange={e => updateTraveler(i, { age: e.target.value ? Number(e.target.value) : '' })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                                <select value={t.gender || ''} onChange={e => updateTraveler(i, { gender: e.target.value })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500">
                                                                                    <option value="">性別</option>
                                                                                    <option value="男">男</option>
                                                                                    <option value="女">女</option>
                                                                                </select>
                                                                                <input type="text" placeholder="連絡先" value={t.phone || ''} onChange={e => updateTraveler(i, { phone: e.target.value })} className="col-span-2 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Arrival */}
                                                            <div>
                                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">モンゴル到着</p>
                                                                <div className="grid grid-cols-3 gap-1.5">
                                                                    <input type="date" value={cd.arrival?.date || ''} onChange={e => updateContract({ arrival: { ...(cd.arrival || {}), date: e.target.value } })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                    <input type="time" value={cd.arrival?.time || ''} onChange={e => updateContract({ arrival: { ...(cd.arrival || {}), time: e.target.value } })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                    <input type="text" placeholder="航空便" value={cd.arrival?.flight || ''} onChange={e => updateContract({ arrival: { ...(cd.arrival || {}), flight: e.target.value } })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                </div>
                                                            </div>

                                                            {/* Departure */}
                                                            <div>
                                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">モンゴル出発</p>
                                                                <div className="grid grid-cols-3 gap-1.5">
                                                                    <input type="date" value={cd.departure?.date || ''} onChange={e => updateContract({ departure: { ...(cd.departure || {}), date: e.target.value } })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                    <input type="time" value={cd.departure?.time || ''} onChange={e => updateContract({ departure: { ...(cd.departure || {}), time: e.target.value } })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                    <input type="text" placeholder="航空便" value={cd.departure?.flight || ''} onChange={e => updateContract({ departure: { ...(cd.departure || {}), flight: e.target.value } })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                </div>
                                                            </div>

                                                            {/* Region & Category */}
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                <div>
                                                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">旅行地域</p>
                                                                    <input type="text" placeholder="中央モンゴル" value={cd.region || ''} onChange={e => updateContract({ region: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">区分</p>
                                                                    <input type="text" placeholder="フルパッケージ" value={cd.category || ''} onChange={e => updateContract({ category: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Link + buttons */}
                                                    <div className="mt-3 space-y-2">
                                                        {ready && (
                                                            <div className="text-[11px] text-slate-400 font-mono truncate px-1">
                                                                {contractUrl}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => window.open(contractUrl, '_blank')}
                                                                disabled={!ready}
                                                                className={`flex-1 h-[34px] text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${ready ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">open_in_new</span>미리보기
                                                            </button>
                                                            <button
                                                                onClick={() => { if (!ready) return; navigator.clipboard.writeText(contractUrl); setCopiedDocId('contract'); setTimeout(() => setCopiedDocId(null), 1500); }}
                                                                disabled={!ready}
                                                                className={`flex-1 h-[34px] text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${ready ? 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">{copiedDocId === 'contract' ? 'check' : 'content_copy'}</span>
                                                                {copiedDocId === 'contract' ? '복사됨' : '복사'}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!ready || !reservation.email) { alert(!reservation.email ? '고객 이메일이 없습니다.' : '여행자 정보를 먼저 입력해 주세요.'); return; }
                                                                    setSendingContract(true);
                                                                    try {
                                                                        await sendNotificationEmail(reservation.email, 'CONTRACT_READY', {
                                                                            customerName: reservation.customerName,
                                                                            productName: reservation.productName,
                                                                            reservationId: (reservation as any).reservationNumber || reservation.id,
                                                                            reservationNumber: (reservation as any).reservationNumber,
                                                                            travelDates: reservation.date,
                                                                            contractUrl,
                                                                        });
                                                                        const updated = {
                                                                            ...reservation,
                                                                            contractUrl,
                                                                            history: [
                                                                                ...(reservation.history || []),
                                                                                { timestamp: new Date().toISOString(), type: 'email', description: '여행 계약서 이메일을 발송했습니다.', detail: contractUrl }
                                                                            ]
                                                                        };
                                                                        onUpdate(updated);
                                                                        alert('계약서 링크를 고객에게 발송했습니다.');
                                                                    } catch (e: any) {
                                                                        alert(`발송 실패: ${e.message || e}`);
                                                                    } finally {
                                                                        setSendingContract(false);
                                                                    }
                                                                }}
                                                                disabled={!ready || sendingContract}
                                                                className={`flex-1 h-[34px] text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1 transition-colors ${ready && !sendingContract ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">send</span>
                                                                {sendingContract ? '발송중' : '발송'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </section>

                            {/* History Timeline */}
                            {timelineEvents.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-base text-slate-500">history</span>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">이력</h3>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2">
                                        {[...timelineEvents].reverse().map((e: any, i: number, arr: any[]) => (
                                            <div key={i} className={`grid grid-cols-[20px_1fr_auto] gap-3 py-2 ${i < arr.length - 1 ? 'border-b border-dashed border-slate-100 dark:border-slate-700' : ''}`}>
                                                <span className="material-symbols-outlined text-teal-600 text-base mt-0.5">{timelineIcon[e.type] || 'radio_button_checked'}</span>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">{e.description}</p>
                                                    {e.detail && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{e.detail}</p>}
                                                </div>
                                                <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono self-start">
                                                    {e.timestamp ? new Date(e.timestamp).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center flex-shrink-0">
                    <p className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">update</span>
                        최근 업데이트 {timelineEvents.length > 0 && timelineEvents[timelineEvents.length - 1].timestamp ? new Date(timelineEvents[timelineEvents.length - 1].timestamp).toLocaleString('ko-KR') : reservation.bookedAt}
                    </p>
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
                    itineraryTemplateId: r.itineraryTemplateId || r.itinerary_template_id,
                    contractData: (() => {
                        const raw = r.contractData || r.contract_data;
                        if (!raw) return undefined;
                        if (typeof raw === 'object') return raw;
                        try { return JSON.parse(raw); } catch { return undefined; }
                    })(),
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

            // Use updated.history as base so memos/entries added inside the modal are preserved.
            // Fall back to oldReservation.history if updated didn't provide one.
            let history = updated.history ? [...updated.history] : (oldReservation.history ? [...oldReservation.history] : []);

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
                itinerary_template_id: updated.itineraryTemplateId,
                contract_data: updated.contractData,
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
