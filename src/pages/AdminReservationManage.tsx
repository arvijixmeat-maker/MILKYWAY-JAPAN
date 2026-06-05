import React, { useState, useMemo, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../lib/api';
import { type QuoteRequest, ConvertSelectionModal, QuoteDetailModal } from '../components/admin/QuoteModals';
import { sendNotificationEmail } from '../lib/email';
import { sendNotification } from '../utils/notification';
import { ReservationDocumentEditor, type ReservationDocContent } from '../components/admin/ReservationDocumentEditor';
import { decodeTemplateDescription, mergeDocumentSettings } from './AdminTemplateManage';

// Reservation Interface
interface Reservation {
    id: string;
    type: 'product' | 'quote';
    productName: string;
    customerName: string;
    date: string;
    bookedAt: string;
    bookedAtMs?: number;
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
    documentContent?: ReservationDocContent | null; // 고객별 편집·저장된 문서 내용

    contractData?: {
        travelers?: Array<{ name?: string; passportName?: string; age?: number | string; birthdate?: string; phone?: string; gender?: string }>;
        arrival?: { date?: string; time?: string; flight?: string };
        departure?: { date?: string; time?: string; flight?: string };
        region?: string;
        category?: string;
        issuedDate?: string;
        agreement?: { agreed?: boolean; name?: string; agreedAt?: string };
        customerSubmittedAt?: string;
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
    manager?: string;

    // Quote Specific
    quoteDetail?: QuoteRequest;
}

const quoteWorkflowMeta: Record<string, { label: string; hint: string; icon: string; tone: string }> = {
    new: {
        label: '신규 요청',
        hint: '요청 조건 확인 필요',
        icon: 'fiber_new',
        tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
    },
    processing: {
        label: '견적 작성 중',
        hint: '일정·금액 입력 단계',
        icon: 'edit_note',
        tone: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30',
    },
    answered: {
        label: '견적 발송 완료',
        hint: '고객 확인 대기',
        icon: 'mark_email_read',
        tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
    },
    reservation_requested: {
        label: '예약 요청',
        hint: '예약 전환 필요',
        icon: 'priority_high',
        tone: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30',
    },
    converted: {
        label: '예약 전환 완료',
        hint: '예약 관리에서 진행',
        icon: 'task_alt',
        tone: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
};

const getQuoteAction = (reservation: Reservation) => {
    if (reservation.type !== 'quote') {
        return {
            label: '상세 확인',
            description: reservation.status === 'pending_payment' ? '입금 상태 확인' : '예약 내용 관리',
            icon: 'visibility',
            nextStatus: null as Reservation['status'] | null,
            primary: false,
        };
    }

    switch (reservation.status) {
        case 'new':
            return {
                label: '검토 시작',
                description: '클릭하면 검토 중으로 변경',
                icon: 'play_arrow',
                nextStatus: 'processing' as Reservation['status'],
                primary: true,
            };
        case 'processing':
            return {
                label: '견적 작성',
                description: '금액·메모·URL 입력',
                icon: 'edit_note',
                nextStatus: null,
                primary: true,
            };
        case 'answered':
            return {
                label: '재확인',
                description: '발송 내용 확인·재발송',
                icon: 'outgoing_mail',
                nextStatus: null,
                primary: false,
            };
        case 'reservation_requested':
            return {
                label: '예약 전환',
                description: '예약 생성 필요',
                icon: 'sync_alt',
                nextStatus: null,
                primary: true,
            };
        default:
            return {
                label: '견적 관리',
                description: '상세 내용 확인',
                icon: 'manage_search',
                nextStatus: null,
                primary: false,
            };
    }
};

const getWorkflowMeta = (reservation: Reservation) => {
    if (reservation.type === 'quote') {
        return quoteWorkflowMeta[reservation.status] || {
            label: '견적 진행',
            hint: '상태 확인 필요',
            icon: 'request_quote',
            tone: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        };
    }

    if (reservation.status === 'pending_payment') {
        return {
            label: '입금 대기',
            hint: '예약금 확인 필요',
            icon: 'payments',
            tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
        };
    }

    if (reservation.status === 'confirmed' || reservation.status === 'paid') {
        return {
            label: reservation.status === 'confirmed' ? '예약 확정' : '결제 완료',
            hint: '일정 운영 관리',
            icon: 'event_available',
            tone: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
        };
    }

    return {
        label: '예약 관리',
        hint: '상세 확인',
        icon: 'assignment',
        tone: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };
};

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
    const [sendingAllDocs, setSendingAllDocs] = useState(false);
    const [docEditorOpen, setDocEditorOpen] = useState(false);

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

        const parseArr = (v: any) => {
            if (Array.isArray(v)) return v;
            if (typeof v === 'string') {
                try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
            }
            return [];
        };
        const updated = {
            ...reservation,
            assignedGuide: {
                id: guide.id,
                name: guide.name,
                image: guide.image,
                introduction: guide.introduction || guide.bio || '',
                phone: guide.phone,
                kakaoId: guide.kakaoId,
                languages: parseArr(guide.languages),
                specialties: parseArr(guide.specialties)
            },
            history: [
                ...(reservation.history || []),
                {
                    timestamp: new Date().toISOString(),
                    type: 'modification',
                    description: '担当ガイドが決定しました。',
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
                    description: `${selectedDay}日目の宿泊先が確定しました。`,
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
    const reservationNumber = (reservation as any).reservationNumber || reservation.id;
    const itineraryUrl = `${window.location.origin}/documents/itinerary/${reservationNumber}`;
    const contractUrl = `${window.location.origin}/documents/contract/${reservationNumber}`;
    const selectedTemplate = templatesList.find((t: any) => t.id === editForm.itineraryTemplateId);
    const itineraryReady = !!editForm.itineraryTemplateId;
    const contractTravelers = editForm.contractData?.travelers || [];
    const contractHasTravelers = contractTravelers.length > 0 && !!contractTravelers[0]?.name;
    // 고객이 계약서에서 직접 여행자 정보를 작성하므로, 이메일만 있으면 발송 가능
    const contractReady = !!reservation.email;
    const itinerarySent = timelineEvents.some((e: any) => e.type === 'email' && (e.detail === itineraryUrl || String(e.description || '').includes('日程')));
    const contractSent = timelineEvents.some((e: any) => e.type === 'email' && (e.detail === contractUrl || String(e.description || '').includes('契約')));
    const guideReady = !!reservation.assignedGuide || !!reservation.areAssignmentsVisibleToUser;

    // ── 문서 편집기(예약/견적 자동 채움) ──
    const isQuoteRes = (reservation as any).type === 'quote';
    const docPeopleCount = reservation.totalPeople || (reservation.headcount ? parseInt(String(reservation.headcount).replace(/[^0-9]/g, '')) : 0) || 0;
    const _sd = (reservation as any).startDate;
    const _ed = (reservation as any).endDate;
    const _nights = (_sd && _ed) ? Math.round((new Date(_ed).getTime() - new Date(_sd).getTime()) / 86400000) : NaN;
    const docTripLength = (!Number.isNaN(_nights) && _nights >= 0) ? `${_nights}泊${_nights + 1}日` : undefined;
    const docCustomer = {
        tripNumber: reservationNumber,
        period: reservation.date || '',
        tripLength: docTripLength,
        headcount: reservation.headcount || (docPeopleCount ? `${docPeopleCount}名` : ''),
        name: reservation.customerName,
        tripType: reservation.productName,
        totalAmount: editForm.totalAmount || undefined,
        deposit: editForm.deposit || undefined,
        localAmount: editForm.totalAmount ? (editForm.totalAmount - (editForm.deposit || 0)) : undefined,
        peopleCount: docPeopleCount || undefined,
    };
    const docInitialContent: ReservationDocContent | null = (() => {
        const dc = reservation.documentContent;
        if (dc && (Array.isArray(dc.days) || dc.documentSettings)) {
            return { name: dc.name || '', description: dc.description || '', days: dc.days || [], documentSettings: mergeDocumentSettings(dc.documentSettings) };
        }
        if (selectedTemplate) {
            const decoded = decodeTemplateDescription(selectedTemplate.description || '');
            let tDays: any[] = [];
            try { tDays = typeof selectedTemplate.days === 'string' ? JSON.parse(selectedTemplate.days || '[]') : (selectedTemplate.days || []); } catch { tDays = []; }
            return { name: selectedTemplate.name || '', description: decoded.description || '', days: tDays, documentSettings: decoded.documentSettings };
        }
        return null;
    })();
    const saveDocContent = async (content: ReservationDocContent) => {
        const payload = { document_content: JSON.stringify(content) };
        if (isQuoteRes) await (api.quotes as any).update(reservation.id, payload);
        else await (api.reservations as any).update(reservation.id, payload);
        onUpdate({ ...reservation, documentContent: content });
    };

    const addHistory = (entry: { type: string; description: string; detail?: string }) => ({
        ...reservation,
        history: [
            ...(reservation.history || []),
            { timestamp: new Date().toISOString(), ...entry }
        ]
    });

    const copyCustomerMessage = async (kind: 'itinerary' | 'contract' | 'final') => {
        const url = kind === 'contract' ? contractUrl : itineraryUrl;
        const title = kind === 'contract' ? '海外旅行契約書' : kind === 'itinerary' ? '確定日程表' : 'ご出発前の最終案内';
        const body = `${reservation.customerName || 'お客様'} 様\n\nいつもお世話になっております。Milkyway Japanです。\n${reservation.productName}の${title}をご用意しました。\n下記リンクより内容をご確認ください。\n\n${url}\n\nご不明点や修正希望がございましたら、このままご返信ください。`;
        await navigator.clipboard.writeText(body);
        setCopiedDocId(`${kind}-message`);
        setTimeout(() => setCopiedDocId(null), 1500);
    };

    const sendItineraryToCustomer = async () => {
        if (!itineraryReady || !reservation.email) {
            alert(!reservation.email ? '고객 이메일이 없습니다.' : '일정표 템플릿을 먼저 선택해 주세요.');
            return;
        }
        setSendingItinerary(true);
        try {
            await sendNotificationEmail(reservation.email, 'ITINERARY_READY', {
                customerName: reservation.customerName,
                productName: reservation.productName,
                reservationId: reservationNumber,
                reservationDbId: reservation.id,
                reservationNumber,
                userId: reservation.userId,
                travelDates: reservation.date,
                itineraryUrl,
            });
            onUpdate(addHistory({ type: 'email', description: '確定日程表をお客様へ送信しました。', detail: itineraryUrl }));
            alert('일정표 안내를 고객에게 발송했습니다.');
        } catch (e: any) {
            alert(`발송 실패: ${e.message || e}`);
        } finally {
            setSendingItinerary(false);
        }
    };

    const sendContractToCustomer = async () => {
        if (!reservation.email) {
            alert('고객 이메일이 없습니다.');
            return;
        }
        setSendingContract(true);
        try {
            await sendNotificationEmail(reservation.email, 'CONTRACT_READY', {
                customerName: reservation.customerName,
                productName: reservation.productName,
                reservationId: reservationNumber,
                reservationDbId: reservation.id,
                reservationNumber,
                userId: reservation.userId,
                travelDates: reservation.date,
                contractUrl,
            });
            onUpdate(addHistory({ type: 'email', description: '海外旅行契約書をお客様へ送信しました。', detail: contractUrl }));
            alert('계약서 안내를 고객에게 발송했습니다.');
        } catch (e: any) {
            alert(`발송 실패: ${e.message || e}`);
        } finally {
            setSendingContract(false);
        }
    };

    const sendReadyDocumentsToCustomer = async () => {
        if (!reservation.email) {
            alert('고객 이메일이 없습니다.');
            return;
        }

        const jobs: Array<{
            key: 'itinerary' | 'contract';
            title: string;
            ready: boolean;
            sent: boolean;
            send: () => Promise<void>;
            history: { type: string; description: string; detail: string };
        }> = [
            {
                key: 'itinerary',
                title: '일정표',
                ready: itineraryReady,
                sent: itinerarySent,
                send: () => sendNotificationEmail(reservation.email!, 'ITINERARY_READY', {
                    customerName: reservation.customerName,
                    productName: reservation.productName,
                    reservationId: reservationNumber,
                    reservationDbId: reservation.id,
                    reservationNumber,
                    userId: reservation.userId,
                    travelDates: reservation.date,
                    itineraryUrl,
                }),
                history: { type: 'email', description: '確定日程表をお客様へ送信しました。', detail: itineraryUrl },
            },
            {
                key: 'contract',
                title: '계약서',
                ready: contractReady,
                sent: contractSent,
                send: () => sendNotificationEmail(reservation.email!, 'CONTRACT_READY', {
                    customerName: reservation.customerName,
                    productName: reservation.productName,
                    reservationId: reservationNumber,
                    reservationDbId: reservation.id,
                    reservationNumber,
                    userId: reservation.userId,
                    travelDates: reservation.date,
                    contractUrl,
                }),
                history: { type: 'email', description: '海外旅行契約書をお客様へ送信しました。', detail: contractUrl },
            },
        ];

        const readyJobs = jobs.filter((job) => job.ready && !job.sent);
        if (readyJobs.length === 0) {
            alert('새로 발송할 준비된 문서가 없습니다. 이미 발송했거나 필수 정보가 부족합니다.');
            return;
        }

        setSendingAllDocs(true);
        setSendingItinerary(readyJobs.some((job) => job.key === 'itinerary'));
        setSendingContract(readyJobs.some((job) => job.key === 'contract'));

        const sentHistories: Array<{ timestamp: string; type: string; description: string; detail: string }> = [];
        try {
            for (const job of readyJobs) {
                await job.send();
                sentHistories.push({ timestamp: new Date().toISOString(), ...job.history });
            }

            onUpdate({
                ...reservation,
                history: [
                    ...(reservation.history || []),
                    ...sentHistories,
                ],
            });
            alert(`${readyJobs.map((job) => job.title).join(', ')} 안내를 고객에게 발송했습니다.`);
        } catch (e: any) {
            alert(`통합 발송 실패: ${e.message || e}`);
        } finally {
            setSendingAllDocs(false);
            setSendingItinerary(false);
            setSendingContract(false);
        }
    };

    const operationSteps = [
        {
            title: '예약 접수',
            description: '주문 내용 확인 및 고객 정보 확보',
            icon: 'assignment_turned_in',
            done: true,
            actionLabel: '상세 확인',
            onAction: undefined as (() => void) | undefined,
        },
        {
            title: '결제 확인',
            description: editForm.depositStatus === 'paid' ? '예약금 입금 확인 완료' : '예약금 입금 확인 필요',
            icon: 'payments',
            done: editForm.depositStatus === 'paid',
            actionLabel: editForm.depositStatus === 'paid' ? '완료' : '입금 확인',
            onAction: editForm.depositStatus === 'paid' ? undefined : toggleDepositStatus,
        },
        {
            title: '일정표',
            description: itinerarySent ? '고객 발송 완료' : itineraryReady ? `${selectedTemplate?.name || '선택한 템플릿'} 발송 가능` : '일정표 템플릿 선택 필요',
            icon: 'map',
            done: itinerarySent,
            actionLabel: itineraryReady ? (sendingItinerary ? '발송중' : '일정표 발송') : '템플릿 선택',
            onAction: itineraryReady ? sendItineraryToCustomer : undefined,
        },
        {
            title: '계약서',
            description: contractSent ? '고객 발송 완료' : contractHasTravelers ? `${contractTravelers.length}명 입력됨 · 재발송 가능` : '발송하면 고객이 직접 작성',
            icon: 'description',
            done: contractSent,
            actionLabel: contractReady ? (sendingContract ? '발송중' : '계약서 발송') : '이메일 없음',
            onAction: contractReady ? sendContractToCustomer : () => setContractEditorOpen(true),
        },
        {
            title: '현지 안내',
            description: guideReady ? '가이드/숙소 안내 가능' : '가이드와 숙소 배정 필요',
            icon: 'support_agent',
            done: !!reservation.areAssignmentsVisibleToUser,
            actionLabel: guideReady ? '안내문 복사' : '가이드 배정',
            onAction: guideReady ? () => copyCustomerMessage('final') : () => setShowGuideModal(true),
        },
    ];

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
                        <section className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                                        <span className="material-symbols-outlined text-[15px]">route</span>
                                        여행사 처리 플로우
                                    </div>
                                    <h3 className="mt-2 text-base font-extrabold tracking-tight text-slate-900 dark:text-white">이 예약에서 다음에 할 일</h3>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">고객 회신, 일정표, 계약서, 현지 안내를 한 곳에서 순서대로 처리합니다.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setDocEditorOpen(true)}
                                        className="h-9 px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white shadow-sm shadow-teal-500/20 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">edit_document</span>
                                        문서 편집 (고객·금액 자동)
                                    </button>
                                    <button
                                        onClick={() => copyCustomerMessage('itinerary')}
                                        disabled={!itineraryReady}
                                        className={`h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${itineraryReady ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{copiedDocId === 'itinerary-message' ? 'check' : 'content_copy'}</span>
                                        일정표 안내문
                                    </button>
                                    <button
                                        onClick={() => copyCustomerMessage('contract')}
                                        disabled={!contractReady}
                                        className={`h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${contractReady ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{copiedDocId === 'contract-message' ? 'check' : 'content_copy'}</span>
                                        계약서 안내문
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                {operationSteps.map((step, index) => (
                                    <div
                                        key={step.title}
                                        className={`rounded-xl border p-3 min-h-[132px] flex flex-col transition-colors ${step.done
                                            ? 'border-teal-100 bg-teal-50/70 dark:border-teal-500/20 dark:bg-teal-500/10'
                                            : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step.done ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}>
                                                <span className="material-symbols-outlined text-[18px]">{step.done ? 'check' : step.icon}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">STEP {index + 1}</span>
                                        </div>
                                        <div className="mt-3 flex-1">
                                            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{step.title}</p>
                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{step.description}</p>
                                        </div>
                                        <button
                                            onClick={step.onAction}
                                            disabled={!step.onAction || (step.title === '일정표' && sendingItinerary) || (step.title === '계약서' && sendingContract)}
                                            className={`mt-3 h-8 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 transition-colors ${step.onAction
                                                ? 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
                                                : 'bg-white/70 text-slate-400 dark:bg-slate-800/60'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[15px]">{step.done ? 'task_alt' : 'arrow_forward'}</span>
                                            {step.actionLabel}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

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
                                                    { timestamp: new Date().toISOString(), type: 'modification', description: '担当ガイド・宿泊先のご案内を送信しました。' }
                                                ]
                                            };
                                            onUpdate(updated);
                                            await sendNotificationEmail(reservation.email, 'GUIDE_ASSIGNED', {
                                                customerName: reservation.customerName,
                                                productName: reservation.productName,
                                                guideName: reservation.assignedGuide?.name,
                                                guidePhone: reservation.assignedGuide?.phone,
                                                userId: reservation.userId,
                                                reservationId: (reservation as any).reservationNumber || reservation.id,
                                                reservationDbId: reservation.id,
                                            });
                                            alert('고객에게 배정 알림 이메일을 발송했습니다.');
                                        }}
                                        className="text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        title="배정 정보가 변경되었을 때 고객에게 이메일+인앱 알림을 보냅니다. 고객 마이페이지에는 이미 자동으로 표시되어 있습니다."
                                    >
                                        <span className="material-symbols-outlined text-sm">{reservation.areAssignmentsVisibleToUser ? 'mark_email_read' : 'send'}</span>
                                        {reservation.areAssignmentsVisibleToUser ? '알림 재발송' : '고객에게 알림 발송'}
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
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm tracking-tight">문서 센터</h3>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="bg-white dark:bg-slate-800 border border-teal-100 dark:border-teal-500/20 rounded-xl p-4 shadow-sm">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">고객 발송 패키지</p>
                                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                                        고객 마이페이지에서 열리는 문서를 예약 상세에서 바로 확인하고 발송합니다.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={sendReadyDocumentsToCustomer}
                                                    disabled={sendingAllDocs || (!itineraryReady && !contractReady) || (itinerarySent && contractSent)}
                                                    className={`h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors flex-shrink-0 ${!sendingAllDocs && (itineraryReady || contractReady) && !(itinerarySent && contractSent)
                                                        ? 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-default'
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">{sendingAllDocs ? 'hourglass_top' : 'outgoing_mail'}</span>
                                                    {sendingAllDocs ? '발송중' : '준비 문서 발송'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className={`rounded-lg border px-3 py-2 ${itinerarySent
                                                    ? 'border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300'
                                                    : itineraryReady
                                                        ? 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300'
                                                        : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                                                    }`}>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">일정표</p>
                                                    <p className="mt-0.5 text-xs font-extrabold">{itinerarySent ? '발송 완료' : itineraryReady ? '발송 가능' : '템플릿 필요'}</p>
                                                </div>
                                                <div className={`rounded-lg border px-3 py-2 ${contractSent
                                                    ? 'border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300'
                                                    : contractReady
                                                        ? 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300'
                                                        : 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                                                    }`}>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">계약서</p>
                                                    <p className="mt-0.5 text-xs font-extrabold">{contractSent ? '발송 완료' : contractReady ? '발송 가능' : '이메일 없음'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

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
                                                        <button onClick={() => setDocEditorOpen(true)} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold py-2.5 transition-colors">
                                                            <span className="material-symbols-outlined text-base">edit_document</span>
                                                            {reservation.documentContent ? '문서 편집 (저장됨)' : '문서 편집 (고객·금액 자동 채움)'}
                                                        </button>
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
                                                                onClick={sendItineraryToCustomer}
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
                                        // 고객이 직접 작성하므로 링크는 항상 발송 가능 (여행자 정보 없어도 OK)
                                        const ready = true;

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
                                                            {travelers.length > 0 ? `${travelers.length}명 입력됨 · 자동 생성 링크` : '발송하면 고객이 직접 작성 · 자동 생성 링크'}
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

                                                    {(cd.customerSubmittedAt || cd.agreement?.agreed) && (
                                                        <div className="mt-3 rounded-lg border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20 px-3 py-2.5 text-xs">
                                                            <p className="font-bold text-teal-700 dark:text-teal-300 inline-flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-sm">task_alt</span>고객이 계약서를 작성했습니다
                                                            </p>
                                                            <p className="mt-1 text-slate-600 dark:text-slate-300">
                                                                {cd.agreement?.agreed && <>동의: <b>{cd.agreement.name}</b>{cd.agreement.agreedAt ? ` (${cd.agreement.agreedAt.split('T')[0]})` : ''} · </>}
                                                                여행자 {(cd.travelers || []).length}명 정보 입력됨
                                                            </p>
                                                        </div>
                                                    )}

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
                                                                                <input type="date" title="生年月日" value={t.birthdate || ''} onChange={e => updateTraveler(i, { birthdate: e.target.value })} className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
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
                                                                onClick={sendContractToCustomer}
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
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
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
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
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

        <ReservationDocumentEditor
            open={docEditorOpen}
            onClose={() => setDocEditorOpen(false)}
            title={`${reservation.customerName || '고객'} · ${isQuoteRes ? '見積提案書' : '確定日程表'}`}
            customer={docCustomer}
            initialContent={docInitialContent}
            onSave={saveDocContent}
            assignedGuide={reservation.assignedGuide}
            dailyAccommodations={reservation.dailyAccommodations}
            onAssignGuide={() => setShowGuideModal(true)}
            onAssignAccommodation={(day) => { setSelectedDay(day); setShowAccommodationModal(true); }}
        />
    </>);
};

export const AdminReservationManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('전체 상태');
    const [filterPayment, setFilterPayment] = useState('전체 결제');
    const [filterType, setFilterType] = useState('전체 유형');
    const [filterDeparture, setFilterDeparture] = useState('');
    const [convertTarget, setConvertTarget] = useState<QuoteRequest | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Reservations State
    const [reservations, setReservations] = useState<Reservation[]>([]);

    const toTime = (value: any) => {
        if (!value) return 0;
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? 0 : time;
    };

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
                    country: r.country || r.customerCountry || r.customer_country || r.customer_info?.country || '일본',
                    startDate,
                    endDate,
                    departureMs: toTime(startDate),
                    date: startDate
                        ? `${new Date(startDate).toLocaleDateString('ko-KR')} ~ ${endDate ? new Date(endDate).toLocaleDateString('ko-KR') : ''}`
                        : r.duration || '날짜 미정',
                    bookedAt: createdAt ? new Date(createdAt).toLocaleDateString('ko-KR') : '',
                    status: r.status,
                    bookedAtMs: toTime(createdAt),
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
                    documentContent: (() => {
                        const raw = r.documentContent || r.document_content;
                        if (!raw) return null;
                        if (typeof raw === 'object') return raw;
                        try { return JSON.parse(raw); } catch { return null; }
                    })(),
                    assignedGuide: r.assignedGuide || r.assigned_guide,
                    dailyAccommodations: r.dailyAccommodations || r.daily_accommodations,
                    history: r.history || [],
                    areAssignmentsVisibleToUser: r.areAssignmentsVisibleToUser || r.are_assignments_visible_to_user || false,
                    headcount: travelers ? `${travelers}名` : '미정',
                    totalPeople: travelers,
                    phone: r.phone || r.customerPhone || r.customer_phone || r.customer_info?.phone || '',
                    email: r.email || r.customerEmail || r.customer_email || r.customer_info?.email || '',
                    manager: r.manager || r.assignedAdmin || r.assigned_admin || 'Admin',
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
                        bookedAtMs: toTime(createdAt),
                        status: q.status,
                        totalAmount: q.confirmedPrice || q.confirmed_price || 0,
                        deposit: q.deposit || 0,
                        depositStatus: 'unpaid',
                        balance: (q.confirmedPrice || q.confirmed_price || 0) - (q.deposit || 0),
                        balanceStatus: 'unpaid',
                        headcount: q.headcount,
                        totalPeople: 0,
                        phone: q.phone,
                        email: q.email,
                        manager: q.manager || 'Admin',
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
                            confirmed_price: q.confirmed_price || q.confirmedPrice,
                            confirmed_start_date: q.confirmed_start_date || q.confirmedStartDate,
                            confirmed_end_date: q.confirmed_end_date || q.confirmedEndDate,
                            deposit: q.deposit || 0,
                            deposit_status: q.deposit_status || q.depositStatus || 'unpaid',
                            balance_status: q.balance_status || q.balanceStatus || 'unpaid',
                            itineraryTemplateId: q.itineraryTemplateId || q.itinerary_template_id || '',
                            date: createdAt ? new Date(createdAt).toLocaleDateString() : ''
                        }
                    };
                });
                allItems.push(...mappedQuotes);
            }

            allItems.sort((a, b) => (b.bookedAtMs || 0) - (a.bookedAtMs || 0));
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
                    description: `ご予約ステータスが変更されました: ${statusLabels[updated.status] || updated.status}`,
                    detail: `${oldReservation.status} -> ${updated.status}`
                });
            }

            // Add history entry for itinerary upload if changed
            if (updated.itineraryUrl && (!oldReservation.itineraryUrl || oldReservation.itineraryUrl !== updated.itineraryUrl)) {
                history.push({
                    timestamp: new Date().toISOString(),
                    type: 'document_added',
                    description: '確定日程表がアップロードされました',
                    detail: updated.itineraryUrl
                });
            }

            // Add history entry for contract upload if changed
            if (updated.contractUrl && (!oldReservation.contractUrl || oldReservation.contractUrl !== updated.contractUrl)) {
                history.push({
                    timestamp: new Date().toISOString(),
                    type: 'document_added',
                    description: '海外旅行契約書がアップロードされました',
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
                    confirmed: 'ご予約が確定しました！',
                    paid: 'お支払いが完了しました。まもなく確定となります。',
                    cancelled: 'ご予約がキャンセルされました。'
                };
                if (statusMessages[updated.status]) {
                    await sendNotification({
                        userId: updated.userId,
                        type: 'reservation',
                        title: 'ご予約状況の更新',
                        message: `${updated.productName} — ${statusMessages[updated.status]}`,
                        link: `/mypage/reservations`
                    });
                }
            }

            if (updated.areAssignmentsVisibleToUser && !oldReservation.areAssignmentsVisibleToUser && updated.userId) {
                await sendNotification({
                    userId: updated.userId,
                    type: 'reservation',
                    title: '担当ガイド・宿泊先のご案内',
                    message: `${updated.productName} の担当ガイドと宿泊先が確定しました。ご確認ください。`,
                    link: `/mypage/reservations`
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
                    confirmed: 'ご予約が確定しました！',
                    paid: 'お支払いが完了しました。',
                    cancelled: 'ご予約がキャンセルされました。',
                    answered: 'お見積りが到着しました。',
                };
                if (statusMessages[newStatus]) {
                    await sendNotification({
                        userId: targetItem.userId,
                        type: 'reservation',
                        title: type === 'quote' ? 'お見積り状況の更新' : 'ご予約状況の更新',
                        message: `${targetItem.productName} — ${statusMessages[newStatus]}`,
                        link: type === 'quote' ? '/mypage/estimates' : '/mypage/reservations'
                    });
                }
            }

            const updatedStatus = newStatus as Reservation['status'];

            // Optimistic update
            setReservations(prev => prev.map(r => r.id === id ? {
                ...r,
                status: updatedStatus,
                quoteDetail: r.quoteDetail ? { ...r.quoteDetail, status: updatedStatus as QuoteRequest['status'] } : r.quoteDetail,
            } : r));
            if (selectedReservation && selectedReservation.id === id) {
                setSelectedReservation(prev => prev ? {
                    ...prev,
                    status: updatedStatus,
                    quoteDetail: prev.quoteDetail ? { ...prev.quoteDetail, status: updatedStatus as QuoteRequest['status'] } : prev.quoteDetail,
                } : null);
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
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return reservations.filter(res => {
            const haystack = [
                res.reservationNumber,
                res.customerName,
                res.email,
                res.phone,
                res.productName,
                res.country,
                res.headcount,
            ].filter(Boolean).join(' ').toLowerCase();

            const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
            const matchesStatus = filterStatus === '전체 상태' ||
                (filterStatus === '입금 대기' && res.status === 'pending_payment') ||
                (filterStatus === '결제 완료' && res.status === 'paid') ||
                (filterStatus === '예약 확정' && res.status === 'confirmed') ||
                (filterStatus === '취소됨' && res.status === 'cancelled') ||
                (filterStatus === '신규 견적' && res.status === 'new') ||
                (filterStatus === '견적 작성 중' && res.status === 'processing') ||
                (filterStatus === '견적 발송 완료' && res.status === 'answered') ||
                (filterStatus === '예약 요청' && res.status === 'reservation_requested');
            const matchesType = filterType === '전체 유형' ||
                (filterType === '맞춤 견적' && res.type === 'quote') ||
                (filterType === '일반 상품' && res.type !== 'quote');
            const matchesPayment = filterPayment === '전체 결제' ||
                (filterPayment === '예약금 미입금' && res.depositStatus !== 'paid') ||
                (filterPayment === '예약금 입금' && res.depositStatus === 'paid') ||
                (filterPayment === '잔금 미입금' && res.balanceStatus !== 'paid') ||
                (filterPayment === '잔금 입금' && res.balanceStatus === 'paid');
            const matchesDeparture = !filterDeparture || res.startDate === filterDeparture;

            return matchesSearch && matchesStatus && matchesType && matchesPayment && matchesDeparture;
        });
    }, [searchTerm, filterStatus, filterPayment, filterType, filterDeparture, reservations]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
    const displayedReservations = filteredReservations.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats
    const stats = useMemo(() => {
        const activeQuoteStatuses = ['new', 'processing', 'reservation_requested'];
        const now = Date.now();
        const thirtyDays = now + 30 * 86400000;
        const hasContractSent = (r: Reservation) => Boolean(r.history?.some((event: any) =>
            event.type === 'email' && (String(event.description || '').includes('契約') || String(event.detail || '').includes('/documents/contract/'))
        ));

        return {
            total: reservations.length,
            pending: reservations.filter(r => r.depositStatus !== 'paid' || r.status === 'pending_payment').length,
            confirmed: reservations.filter(r => r.status === 'confirmed' || r.status === 'paid').length,
            quoteTodo: reservations.filter(r => r.type === 'quote' && activeQuoteStatuses.includes(r.status)).length,
            contractSent: reservations.filter(hasContractSent).length,
            departingSoon: reservations.filter(r => r.type !== 'quote' && (r.departureMs || 0) >= now && (r.departureMs || 0) <= thirtyDays).length,
        };
    }, [reservations]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <>
            <AdminLayout
                activePage="reservations"
                title="통합 예약 관리"
                description="상품 예약, 맞춤 견적 전환, 결제 상태를 한 화면에서 관리합니다."
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                actions={
                    <button
                        type="button"
                        onClick={fetchReservations}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-500/50 dark:hover:bg-teal-500/10"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                        새로고침
                    </button>
                }
            >
                <div className="space-y-6" style={{ fontFamily: 'Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                    <section className="rounded-3xl border border-[#8FE7DE]/60 bg-gradient-to-br from-white via-[#F7FAFA] to-[#EFFFFD] p-6 shadow-sm dark:border-teal-500/20 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/30">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#39C4B7]/10 px-3 py-1 text-xs font-black text-[#0F8F84]">
                                    <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                                    Travel CRM
                                </span>
                                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">예약부터 계약서 발송까지 한 화면에서 처리합니다</h2>
                                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">견적, 예약, 입금, 문서 발송, 출발 예정 상태를 실시간으로 확인하세요.</p>
                            </div>
                            <button
                                type="button"
                                onClick={fetchReservations}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#39C4B7] px-5 text-sm font-black text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-[#0F8F84]"
                            >
                                <span className="material-symbols-outlined text-[20px]">refresh</span>
                                데이터 새로고침
                            </button>
                        </div>
                    </section>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                        {[
                            { label: '전체 예약 건수', value: stats.total, icon: 'folder_managed', tone: 'text-[#0F8F84] bg-[#39C4B7]/10' },
                            { label: '입금 대기', value: stats.pending, icon: 'payments', tone: 'text-amber-600 bg-amber-50' },
                            { label: '예약 확정', value: stats.confirmed, icon: 'verified', tone: 'text-[#0F8F84] bg-[#8FE7DE]/25' },
                            { label: '맞춤 견적 진행중', value: stats.quoteTodo, icon: 'request_quote', tone: 'text-blue-600 bg-blue-50' },
                            { label: '계약서 발송 완료', value: stats.contractSent, icon: 'contract', tone: 'text-violet-600 bg-violet-50' },
                            { label: '여행 출발 예정', value: stats.departingSoon, icon: 'flight_takeoff', tone: 'text-rose-600 bg-rose-50' },
                        ].map(card => (
                            <div key={card.label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
                                    <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                                </div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{card.label}</p>
                                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{card.value}<span className="ml-1 text-sm font-bold text-slate-400">건</span></p>
                            </div>
                        ))}
                    </div>

                    {/* Filter Section */}
                    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">검색 및 필터</h3>
                                <p className="mt-1 text-xs font-medium text-slate-400">고객명, 이메일, 전화번호, 예약번호, 여행상품으로 검색할 수 있습니다.</p>
                            </div>
                            <button
                                onClick={() => { setSearchTerm(''); setFilterStatus('전체 상태'); setFilterPayment('전체 결제'); setFilterType('전체 유형'); setFilterDeparture(''); setCurrentPage(1); }}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                초기화
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <label className="block xl:col-span-2">
                                <span className="mb-1.5 block text-[11px] font-black text-slate-400">통합 검색</span>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                    <input
                                        type="text"
                                        placeholder="고객명 / 이메일 / 전화번호 / 예약번호 / 상품명"
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                        className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F7FAFA] pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#39C4B7] focus:bg-white focus:ring-4 focus:ring-[#39C4B7]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                    />
                                </div>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-[11px] font-black text-slate-400">예약상태</span>
                                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F7FAFA] px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#39C4B7] focus:ring-4 focus:ring-[#39C4B7]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                                    <option>전체 상태</option>
                                    <option value="입금 대기">입금 대기</option>
                                    <option value="결제 완료">결제 완료</option>
                                    <option value="예약 확정">예약 확정</option>
                                    <option value="신규 견적">신규 견적</option>
                                    <option value="견적 작성 중">견적 작성 중</option>
                                    <option value="견적 발송 완료">견적 발송 완료</option>
                                    <option value="예약 요청">예약 요청</option>
                                    <option value="취소됨">취소됨</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-[11px] font-black text-slate-400">결제상태</span>
                                <select value={filterPayment} onChange={(e) => { setFilterPayment(e.target.value); setCurrentPage(1); }} className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F7FAFA] px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#39C4B7] focus:ring-4 focus:ring-[#39C4B7]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                                    <option>전체 결제</option>
                                    <option>예약금 미입금</option>
                                    <option>예약금 입금</option>
                                    <option>잔금 미입금</option>
                                    <option>잔금 입금</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-[11px] font-black text-slate-400">출발일</span>
                                <input type="date" value={filterDeparture} onChange={(e) => { setFilterDeparture(e.target.value); setCurrentPage(1); }} className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F7FAFA] px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#39C4B7] focus:ring-4 focus:ring-[#39C4B7]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
                            </label>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {['전체 유형', '일반 상품', '맞춤 견적'].map(type => (
                                <button key={type} onClick={() => { setFilterType(type); setCurrentPage(1); }} className={`h-9 rounded-full px-4 text-xs font-black transition-colors ${filterType === type ? 'bg-[#0F8F84] text-white shadow-sm' : 'bg-[#F7FAFA] text-slate-500 hover:bg-[#8FE7DE]/25 dark:bg-slate-800 dark:text-slate-300'}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reservation List */}
                    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-950 dark:text-white">예약 리스트</h3>
                                <p className="mt-1 text-xs font-medium text-slate-400">카드형 요약과 테이블 정보를 결합해 빠르게 스캔할 수 있습니다.</p>
                            </div>
                            <span className="rounded-full bg-[#39C4B7]/10 px-3 py-1 text-xs font-black text-[#0F8F84]">총 {filteredReservations.length}건</span>
                        </div>

                        <div className="space-y-3">
                            {displayedReservations.length > 0 ? displayedReservations.map((res) => {
                                const workflow = getWorkflowMeta(res);
                                const nextAction = getQuoteAction(res);
                                const reservationNo = res.reservationNumber || res.id.slice(0, 8).toUpperCase();
                                const paymentLabel = res.depositStatus === 'paid' ? (res.balanceStatus === 'paid' ? '완납' : '예약금 입금') : '입금 대기';
                                const paymentTone = res.depositStatus === 'paid' ? 'bg-[#39C4B7]/10 text-[#0F8F84]' : 'bg-amber-50 text-amber-700';

                                return (
                                    <article key={res.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-[#8FE7DE] hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40">
                                        <div className="grid gap-4 xl:grid-cols-[1.1fr_1.6fr_1fr_1fr_auto] xl:items-center">
                                            <div className="min-w-0">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${res.type === 'quote' ? 'bg-blue-50 text-blue-700' : 'bg-[#39C4B7]/10 text-[#0F8F84]'}`}>
                                                        {res.type === 'quote' ? '맞춤견적' : '일반상품'}
                                                    </span>
                                                    <span className="font-mono text-xs font-black text-slate-400">#{reservationNo}</span>
                                                </div>
                                                <p className="truncate text-base font-black text-slate-950 dark:text-white" title={res.customerName}>{res.customerName}</p>
                                                <p className="mt-1 truncate text-xs font-semibold text-slate-400">{res.email || res.phone || '연락처 미입력'}</p>
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-slate-900 dark:text-slate-100" title={res.productName}>{res.productName}</p>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-4">
                                                    <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-[#39C4B7]">public</span>{res.country || '일본'}</span>
                                                    <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-[#39C4B7]">groups</span>{res.headcount || '미정'}</span>
                                                    <span className="inline-flex items-center gap-1 sm:col-span-2"><span className="material-symbols-outlined text-[15px] text-[#39C4B7]">calendar_month</span>{res.date}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">결제</p>
                                                <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{typeof res.totalAmount === 'number' && !isNaN(res.totalAmount) ? res.totalAmount.toLocaleString() : 0}원</p>
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${paymentTone}`}>{paymentLabel}</span>
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">예약금 {typeof res.deposit === 'number' && !isNaN(res.deposit) ? res.deposit.toLocaleString() : 0}원</span>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">진행 상태</p>
                                                <div className={`mt-1 inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-black ${workflow.tone}`}>
                                                    <span className="material-symbols-outlined text-[15px]">{workflow.icon}</span>
                                                    {workflow.label}
                                                </div>
                                                <p className="mt-1 text-xs font-semibold text-slate-400">담당자 {res.manager || 'Admin'}</p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (nextAction.nextStatus) {
                                                            handleStatusChange(res.id, nextAction.nextStatus, res.type);
                                                        } else {
                                                            setSelectedReservation(res);
                                                        }
                                                    }}
                                                    className={`h-10 rounded-2xl px-4 text-xs font-black transition-colors inline-flex items-center gap-1.5 ${nextAction.primary ? 'bg-[#39C4B7] text-white hover:bg-[#0F8F84]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'}`}
                                                    title={nextAction.description}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">{nextAction.icon}</span>
                                                    {nextAction.label}
                                                </button>
                                                <button onClick={() => setSelectedReservation(res)} className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition-colors hover:bg-[#F7FAFA] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                    상세보기
                                                </button>
                                                <button onClick={() => handleDelete(res.id, res.type)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500 transition-colors hover:bg-red-100" title="삭제">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            }) : (
                                <div className="rounded-3xl border border-dashed border-slate-200 py-16 text-center text-slate-400 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-4xl">manage_search</span>
                                    <p className="mt-2 text-sm font-bold">검색 결과가 없습니다.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            <span className="text-xs font-semibold">
                                총 {filteredReservations.length}건 중 {filteredReservations.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredReservations.length)} 표시
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition-colors hover:bg-slate-200 disabled:cursor-default disabled:opacity-40 dark:bg-slate-800">
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <span className="text-xs font-black text-slate-400">{Math.min(currentPage, Math.max(totalPages, 1))} / {Math.max(totalPages, 1)}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.max(totalPages, 1)))} disabled={currentPage >= totalPages || totalPages === 0} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition-colors hover:bg-slate-200 disabled:cursor-default disabled:opacity-40 dark:bg-slate-800">
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>

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
                    onSendEstimate={async (url, note, priceDetail, confirmedStartDate, confirmedEndDate, itineraryTemplateId) => {
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
                                itinerary_template_id: itineraryTemplateId || null,
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
                                        adminNote: note,
                                        quoteId: selectedReservation.id,
                                        totalAmount: priceDetail.totalAmount,
                                        userId: selectedReservation.userId,
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
        </>
    );
};