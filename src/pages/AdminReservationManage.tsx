import React, { useState, useMemo, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Icon } from '../components/admin/console/Icon';
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

const quoteWorkflowMeta: Record<string, { label: string; hint: string; icon: string }> = {
    new: {
        label: '신규 요청',
        hint: '요청 조건 확인 필요',
        icon: 'fiber_new',
    },
    processing: {
        label: '견적 작성 중',
        hint: '일정·금액 입력 단계',
        icon: 'edit_note',
    },
    answered: {
        label: '견적 발송 완료',
        hint: '고객 확인 대기',
        icon: 'mark_email_read',
    },
    reservation_requested: {
        label: '예약 요청',
        hint: '예약 전환 필요',
        icon: 'priority_high',
    },
    converted: {
        label: '예약 전환 완료',
        hint: '예약 관리에서 진행',
        icon: 'task_alt',
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
        };
    }

    if (reservation.status === 'pending_payment') {
        return {
            label: '입금 대기',
            hint: '예약금 확인 필요',
            icon: 'payments',
        };
    }

    if (reservation.status === 'confirmed' || reservation.status === 'paid') {
        return {
            label: reservation.status === 'confirmed' ? '예약 확정' : '결제 완료',
            hint: '일정 운영 관리',
            icon: 'event_available',
        };
    }

    return {
        label: '예약 관리',
        hint: '상세 확인',
        icon: 'assignment',
    };
};

// status → design-system badge tone (b-*) for the new admin console look
const STATUS_TONE: Record<string, string> = {
    new: 'b-purple',
    reservation_requested: 'b-purple',
    processing: 'b-amber',
    pending_payment: 'b-amber',
    answered: 'b-blue',
    paid: 'b-blue',
    confirmed: 'b-green',
    cancelled: 'b-gray',
    completed: 'b-gray',
    converted: 'b-gray',
};

const STATUS_LABELS: Record<string, string> = {
    pending_payment: '입금 대기',
    paid: '결제 완료',
    confirmed: '예약 확정',
    cancelled: '취소됨',
    new: '신규 견적',
    processing: '견적 작성중',
    answered: '견적 발송됨',
    reservation_requested: '예약 요청됨',
    converted: '예약 전환됨',
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

    const labels = STATUS_LABELS;

    const statusKey = status as keyof typeof labels;
    const tone = STATUS_TONE[status] || 'b-gray';

    const handleSelect = (newStatus: Reservation['status']) => {
        onChange(newStatus);
        setIsOpen(false);
    };

    return (
        <div className="statusdd" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`badge statusdd-btn ${tone}`}
            >
                <span className={`sd-dot ${tone}`} />
                <span>{labels[statusKey] || status}</span>
                <Icon name={isOpen ? 'expand_less' : 'expand_more'} style={{ fontSize: 16, opacity: 0.7 }} />
            </button>

            {isOpen && (
                <div className="statusdd-menu">
                    {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => handleSelect(key)}
                            className={`statusdd-item${status === key ? ' on' : ''}`}
                        >
                            <span className={`sd-dot ${STATUS_TONE[key] || 'b-gray'}`} />
                            <span style={{ flex: 1 }}>{labels[key]}</span>
                            {status === key && <Icon name="check" style={{ fontSize: 14 }} />}
                        </button>
                    ))}
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
    const [sendingContract, setSendingContract] = useState(false);
    const [sendingAllDocs, setSendingAllDocs] = useState(false);
    const [docEditorOpen, setDocEditorOpen] = useState(false);
    const [activeDocument, setActiveDocument] = useState<'itinerary' | 'contract'>('itinerary');
    const [tab, setTab] = useState<'overview' | 'payment' | 'docs' | 'history'>('overview');

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
            onAction: editForm.depositStatus === 'paid' ? () => setTab('payment') : () => { setTab('payment'); toggleDepositStatus(); },
        },
        {
            title: '일정표',
            description: itinerarySent ? '고객 발송 완료' : itineraryReady ? `${selectedTemplate?.name || '선택한 템플릿'} 발송 가능` : '일정표 템플릿 선택 필요',
            icon: 'map',
            done: itinerarySent,
            actionLabel: itineraryReady ? '문서 확인' : '템플릿 필요',
            onAction: () => { setTab('docs'); setActiveDocument('itinerary'); },
        },
        {
            title: '계약서',
            description: contractSent ? '고객 발송 완료' : contractHasTravelers ? `${contractTravelers.length}명 입력됨 · 재발송 가능` : '발송하면 고객이 직접 작성',
            icon: 'description',
            done: contractSent,
            actionLabel: contractReady ? '문서 확인' : '이메일 없음',
            onAction: () => { setTab('docs'); setActiveDocument('contract'); },
        },
        {
            title: '현지 안내',
            description: guideReady ? '가이드/숙소 안내 가능' : '가이드와 숙소 배정 필요',
            icon: 'support_agent',
            done: !!reservation.areAssignmentsVisibleToUser,
            actionLabel: guideReady ? '안내문 복사' : '가이드 배정',
            onAction: guideReady ? () => copyCustomerMessage('final') : () => { setTab('payment'); setShowGuideModal(true); },
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

    const DRAWER_TABS: Array<{ id: typeof tab; label: string; icon: string }> = [
        { id: 'overview', label: '개요', icon: 'route' },
        { id: 'payment', label: '결제·배정', icon: 'payments' },
        { id: 'docs', label: '문서', icon: 'description' },
        { id: 'history', label: '메모·이력', icon: 'history' },
    ];

    return (<>
        <div className="drawer-scrim" onClick={onClose}>
            <div className="drawer wide" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="drawer-head">
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="row" style={{ gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span className={`tag-type ${reservation.type !== 'quote' ? 'reservation' : 'quote'}`}>
                                {reservation.type !== 'quote' ? '일반상품' : '맞춤견적'}
                            </span>
                            <span className="cell-mono" style={{ fontSize: 13 }}>#{(reservation as any).reservationNumber || reservation.id.slice(0, 8).toUpperCase()}</span>
                            <span className="cell-muted" style={{ fontSize: 12 }}>· 접수 {reservation.bookedAt}</span>
                        </div>
                        <div className="page-title" style={{ fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{reservation.productName}</div>
                    </div>
                    <StatusDropdown
                        status={editForm.status}
                        onChange={(s) => { setEditForm({ ...editForm, status: s }); if (!isEditing) onUpdate({ ...editForm, status: s }); }}
                    />
                    <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={onClose}><Icon name="close" /></button>
                </div>

                {/* Tabs */}
                <div className="drawer-tabs">
                    {DRAWER_TABS.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            className={`dtab${tab === t.id ? ' active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <Icon name={t.icon} />{t.label}
                            {t.id === 'history' && memos.length > 0 && <span className="dtab-ct">{memos.length}</span>}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="drawer-body">
                    {tab === 'overview' && (
                    <div className="stack" style={{ gap: 16 }}>
                        {/* progress */}
                        <div className="card card-pad">
                            <div className="row" style={{ marginBottom: 12 }}>
                                <Icon name="route" style={{ color: 'var(--mrt-blue-strong)' }} />
                                <b style={{ fontSize: 14, fontWeight: 800 }}>예약 처리 현황</b>
                                <div className="spacer" style={{ flex: 1 }} />
                                <span className={`badge ${operationSteps.filter(s => s.done).length === operationSteps.length ? 'b-green' : 'b-blue'}`}>
                                    {operationSteps.filter(s => s.done).length}/{operationSteps.length} 단계
                                </span>
                            </div>
                            <div className="op-steps">
                                {operationSteps.map((step, index) => (
                                    <button
                                        key={step.title}
                                        type="button"
                                        onClick={step.onAction}
                                        disabled={!step.onAction}
                                        className={`op-step${step.done ? ' done' : ''}`}
                                    >
                                        <span className="op-ico"><Icon name={step.done ? 'check' : step.icon} /></span>
                                        <span className="op-no">STEP {index + 1}</span>
                                        <span className="op-t">{step.title}</span>
                                        <span className="op-d">{step.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* trip hero */}
                        <div className="trip-hero">
                            <div className="th-label">여행 기간</div>
                            <div className="th-date">{reservation.date}</div>
                            <div className="th-meta">
                                <span><Icon name="event_available" />접수 {reservation.bookedAt}</span>
                                <span><Icon name="group" />{reservation.headcount || '인원 미정'}</span>
                            </div>
                        </div>

                        {/* guest */}
                        <div className="card">
                            <div className="card-head"><Icon name="person" style={{ color: 'var(--mrt-gray-600)' }} /><h2>예약자 정보</h2></div>
                            <div className="card-pad" style={{ paddingTop: 14 }}>
                                <div className="kv"><span>이름</span><b>{reservation.customerName}</b></div>
                                <div className="kv">
                                    <span>인원</span>
                                    {isEditing ? (
                                        <span className="row" style={{ gap: 4 }}>
                                            <input
                                                type="number"
                                                value={editForm.totalPeople || ''}
                                                onChange={(e) => setEditForm(prev => prev ? ({ ...prev, totalPeople: parseInt(e.target.value) || 0, headcount: `${e.target.value}명` }) : null)}
                                                className="inp"
                                                style={{ width: 72, height: 32 }}
                                            />
                                            <span className="cell-muted" style={{ fontSize: 12 }}>명</span>
                                        </span>
                                    ) : (
                                        <b>{reservation.headcount}</b>
                                    )}
                                </div>
                                <div className="kv"><span>연락처</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{reservation.phone || '—'}</b></div>
                                <div className="kv" style={{ borderBottom: 'none' }}><span>이메일</span><b style={{ textAlign: 'right' }}>{reservation.email || '—'}</b></div>
                            </div>
                        </div>
                    </div>
                    )}

                    {tab === 'payment' && (
                    <div className="stack" style={{ gap: 16 }}>
                            {/* Payment with Progress Ring */}
                            <div className="card card-pad">
                                <div className="row" style={{ marginBottom: 16, gap: 16 }}>
                                    <div className="ring">
                                        <svg width="62" height="62" viewBox="0 0 62 62">
                                            <circle cx="31" cy="31" r="26" fill="none" stroke="var(--mrt-gray-100)" strokeWidth="6" />
                                            <circle cx="31" cy="31" r="26" fill="none" stroke="#0f766e" strokeWidth="6" strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 26}
                                                strokeDashoffset={2 * Math.PI * 26 * (1 - paidPercent / 100)}
                                                transform="rotate(-90 31 31)"
                                                style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                                            />
                                        </svg>
                                        <span className="ring-n">{paidPercent}<small>%</small></span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="cell-muted" style={{ fontSize: 12.5 }}>
                                            {paidPercent >= 100 ? '완납 완료' : `잔액 ₩${(editForm.totalAmount - paidAmount).toLocaleString()}`}
                                        </div>
                                        <div className="row" style={{ gap: 6, marginTop: 2 }}>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editForm.totalAmount}
                                                    onChange={(e) => setEditForm({ ...editForm, totalAmount: Number(e.target.value), balance: Number(e.target.value) - editForm.deposit })}
                                                    className="inp"
                                                    style={{ width: 140, height: 36 }}
                                                />
                                            ) : (
                                                <>
                                                    <span className="cell-price" style={{ fontSize: 22 }}>₩{paidAmount.toLocaleString()}</span>
                                                    <span className="cell-muted" style={{ fontSize: 12 }}>/ ₩{(editForm.totalAmount || 0).toLocaleString()}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleTotalStatus}
                                        className={`btn btn-sm ${editForm.status === 'paid' ? 'btn-blue' : 'btn-ghost'}`}
                                    >
                                        <Icon name="done_all" />
                                        {editForm.status === 'paid' ? '전액완납' : '완납 처리'}
                                    </button>
                                </div>
                                {/* Deposit + Balance cells */}
                                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className={`pay-cell${editForm.depositStatus === 'paid' ? ' paid' : ''}`}>
                                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>예약금</span>
                                            <span className={`badge ${editForm.depositStatus === 'paid' ? 'b-green' : 'b-amber'}`}>
                                                {editForm.depositStatus === 'paid' ? '입금' : '미납'}
                                            </span>
                                        </div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editForm.deposit}
                                                onChange={(e) => setEditForm({ ...editForm, deposit: Number(e.target.value), balance: editForm.totalAmount - Number(e.target.value) })}
                                                className="inp"
                                                style={{ height: 36 }}
                                            />
                                        ) : (
                                            <div className="cell-price" style={{ fontSize: 16 }}>₩{(editForm.deposit || 0).toLocaleString()}</div>
                                        )}
                                        {editForm.depositStatus !== 'paid' && (
                                            <button onClick={toggleDepositStatus} className="btn btn-sm btn-blue" style={{ width: '100%', marginTop: 10 }}>
                                                <Icon name="check" />입금 확인
                                            </button>
                                        )}
                                        {editForm.depositStatus === 'paid' && (
                                            <button onClick={toggleDepositStatus} className="btn btn-sm btn-ghost" style={{ width: '100%', marginTop: 10 }}>
                                                입금 취소
                                            </button>
                                        )}
                                    </div>
                                    <div className={`pay-cell${editForm.balanceStatus === 'paid' ? ' paid' : ''}`}>
                                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>잔금</span>
                                            <span className={`badge ${editForm.balanceStatus === 'paid' ? 'b-green' : 'b-amber'}`}>
                                                {editForm.balanceStatus === 'paid' ? '입금' : '미납'}
                                            </span>
                                        </div>
                                        <div className="cell-price" style={{ fontSize: 16 }}>
                                            ₩{((editForm.totalAmount || 0) - (editForm.deposit || 0)).toLocaleString()}
                                        </div>
                                        {editForm.balanceStatus !== 'paid' && (
                                            <button onClick={toggleBalanceStatus} className="btn btn-sm btn-blue" style={{ width: '100%', marginTop: 10 }}>
                                                <Icon name="check" />입금 확인
                                            </button>
                                        )}
                                        {editForm.balanceStatus === 'paid' && (
                                            <button onClick={toggleBalanceStatus} className="btn btn-sm btn-ghost" style={{ width: '100%', marginTop: 10 }}>
                                                입금 취소
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Guide */}
                            <div className="card">
                                <div className="card-head">
                                    <Icon name="badge" style={{ color: 'var(--mrt-gray-600)' }} /><h2>담당 가이드</h2>
                                    <div className="spacer" style={{ flex: 1 }} />
                                    <button className="link-action" onClick={() => setShowGuideModal(true)}>
                                        {reservation.assignedGuide ? '변경' : '배정'}<Icon name="chevron_right" />
                                    </button>
                                </div>
                                <div className="card-pad" style={{ paddingTop: 12 }}>
                                    {reservation.assignedGuide ? (
                                        <div className="assign-row">
                                            {reservation.assignedGuide.image ? (
                                                <img className="avatar round" src={reservation.assignedGuide.image} alt={reservation.assignedGuide.name} />
                                            ) : (
                                                <span className="avatar round tint-blue">{getInitials(reservation.assignedGuide.name)}</span>
                                            )}
                                            <div style={{ minWidth: 0 }}>
                                                <div className="cell-strong">{reservation.assignedGuide.name}</div>
                                                <div className="cell-muted" style={{ fontSize: 12 }}>{reservation.assignedGuide.phone}</div>
                                            </div>
                                            <button className="act-btn" title="변경" onClick={() => setShowGuideModal(true)}><Icon name="swap_horiz" /></button>
                                        </div>
                                    ) : (
                                        <div className="assign-empty" onClick={() => setShowGuideModal(true)}>
                                            <Icon name="person_add" />가이드를 배정하세요
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Trip Timeline / accommodation per day */}
                            <div className="card">
                                <div className="card-head">
                                    <Icon name="hotel" style={{ color: 'var(--mrt-gray-600)' }} /><h2>여행 일정 & 배정</h2>
                                    <div className="spacer" style={{ flex: 1 }} />
                                    <button
                                        className="link-action"
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
                                        title="배정 정보가 변경되었을 때 고객에게 이메일+인앱 알림을 보냅니다. 고객 마이페이지에는 이미 자동으로 표시되어 있습니다."
                                    >
                                        <Icon name={reservation.areAssignmentsVisibleToUser ? 'mark_email_read' : 'send'} />
                                        {reservation.areAssignmentsVisibleToUser ? '알림 재발송' : '고객에게 알림 발송'}
                                    </button>
                                </div>
                                <div className="card-pad" style={{ paddingTop: 12 }}>
                                    <div className="stack" style={{ gap: 8 }}>
                                        {Array.from({ length: getTripDays() }, (_, i) => i + 1).map((day) => {
                                            const assigned = reservation.dailyAccommodations?.find(d => d.day === day);
                                            return (
                                                <div className="accom-day" key={day}>
                                                    <span className="th-day">{day}일차</span>
                                                    {assigned ? (
                                                        <div className="assign-row" style={{ flex: 1, padding: 0 }}>
                                                            {(assigned.accommodation.images && assigned.accommodation.images[0]) ? (
                                                                <img className="thumb" src={assigned.accommodation.images[0]} alt={assigned.accommodation.name} loading="lazy" />
                                                            ) : (
                                                                <span className="thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--mrt-gray-400)' }}><Icon name="hotel" /></span>
                                                            )}
                                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                                <div className="cell-strong">{assigned.accommodation.name}</div>
                                                                <div className="cell-muted" style={{ fontSize: 12 }}>{assigned.accommodation.location || '—'}</div>
                                                            </div>
                                                            <button className="act-btn" title="변경" onClick={() => { setSelectedDay(day); setShowAccommodationModal(true); }}><Icon name="edit" /></button>
                                                        </div>
                                                    ) : (
                                                        <button className="accom-empty" onClick={() => { setSelectedDay(day); setShowAccommodationModal(true); }}>
                                                            <Icon name="add" />숙소 선택
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button className="accom-add" onClick={() => setExtraDays(prev => prev + 1)}>
                                        <Icon name="add_circle" />일차 추가
                                    </button>
                                </div>
                            </div>
                    </div>
                    )}

                    {tab === 'docs' && (
                    <div className="stack" style={{ gap: 16 }}>
                            {/* Documents header */}
                            <div className="row" style={{ gap: 8 }}>
                                <Icon name="folder_shared" style={{ color: 'var(--mrt-gray-600)' }} />
                                <b style={{ fontSize: 14, fontWeight: 800 }}>고객 문서 작업</b>
                                <div className="spacer" style={{ flex: 1 }} />
                                <button
                                    onClick={sendReadyDocumentsToCustomer}
                                    disabled={sendingAllDocs || (!itineraryReady && !contractReady) || (itinerarySent && contractSent)}
                                    className="btn btn-sm btn-blue"
                                >
                                    <Icon name={sendingAllDocs ? 'hourglass_top' : 'outgoing_mail'} />
                                    {sendingAllDocs ? '발송중' : '준비 문서 일괄 발송'}
                                </button>
                            </div>

                            {/* Document type tabs */}
                            <div className="seg" style={{ width: '100%' }}>
                                {[
                                    { key: 'itinerary' as const, label: '일정표', ready: itineraryReady, sent: itinerarySent, icon: 'map' },
                                    { key: 'contract' as const, label: '계약서', ready: contractReady, sent: contractSent, icon: 'contract' },
                                ].map(doc => (
                                    <button
                                        key={doc.key}
                                        type="button"
                                        onClick={() => setActiveDocument(doc.key)}
                                        className={activeDocument === doc.key ? 'active' : ''}
                                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                    >
                                        <Icon name={doc.sent ? 'check_circle' : doc.icon} style={{ fontSize: 16 }} />
                                        {doc.label}
                                    </button>
                                ))}
                            </div>

                            {/* Itinerary template + status doc-card */}
                            <div className="doc-card">
                                <div className="row" style={{ marginBottom: 12 }}>
                                    <span className="doc-ico tint-blue"><Icon name="map" fill /></span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="cell-strong" style={{ fontSize: 14.5 }}>고객에게 보낼 문서</div>
                                        <div className="cell-muted" style={{ fontSize: 12 }}>템플릿 선택 후 미리보기, 링크 복사, 이메일 발송을 처리합니다.</div>
                                    </div>
                                </div>
                                <label className="field" style={{ marginBottom: 12, display: 'block' }}>
                                    <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: 6 }}>일정표 템플릿</span>
                                    <select
                                        className="inp"
                                        value={editForm.itineraryTemplateId || ''}
                                        onChange={e => {
                                            const newId = e.target.value || undefined;
                                            const updated = { ...reservation, itineraryTemplateId: newId } as Reservation;
                                            setEditForm(prev => prev ? { ...prev, itineraryTemplateId: newId } : prev);
                                            onUpdate(updated);
                                            setActiveDocument('itinerary');
                                        }}
                                    >
                                        <option value="">일정표 템플릿 선택</option>
                                        {templatesList.map((t: any) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                    <span className={`badge ${itinerarySent ? 'b-green' : itineraryReady ? 'b-blue' : 'b-amber'}`}>
                                        일정표 {itinerarySent ? '발송완료' : itineraryReady ? '준비됨' : '대기'}
                                    </span>
                                    <span className={`badge ${contractSent ? 'b-green' : contractReady ? 'b-blue' : 'b-amber'}`}>
                                        계약서 {contractSent ? '발송완료' : contractReady ? '준비됨' : '대기'}
                                    </span>
                                    <span className="badge b-gray">고객 페이지 자동 연결</span>
                                </div>
                            </div>

                            {/* Active document actions doc-card */}
                            <div className="doc-card">
                                <div className="row" style={{ marginBottom: 12 }}>
                                    <span className={`doc-ico ${activeDocument === 'itinerary' ? 'tint-blue' : 'tint-purple'}`}>
                                        <Icon name={activeDocument === 'itinerary' ? 'map' : 'description'} fill />
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="cell-strong" style={{ fontSize: 14.5 }}>
                                            {activeDocument === 'itinerary' ? '확정 일정표' : '여행 계약서'}
                                        </div>
                                        <div className="cell-muted" style={{ fontSize: 12 }}>
                                            이곳에서는 문서 상태만 확인합니다. 실제 수정은 전용 편집 화면에서 진행합니다.
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <button
                                        onClick={() => setDocEditorOpen(true)}
                                        className="btn btn-sm btn-blue"
                                    >
                                        <Icon name="edit_document" />
                                        {reservation.documentContent ? '저장된 문서 편집' : '문서 직접 편집'}
                                    </button>
                                    <button
                                        onClick={() => window.open(activeDocument === 'itinerary' ? itineraryUrl : contractUrl, '_blank')}
                                        disabled={activeDocument === 'itinerary' && !itineraryReady}
                                        className="btn btn-sm btn-ghost"
                                    >
                                        <Icon name="open_in_new" />
                                        새 창에서 열기
                                    </button>
                                    <button
                                        onClick={() => {
                                            const url = activeDocument === 'itinerary' ? itineraryUrl : contractUrl;
                                            if (activeDocument === 'itinerary' && !itineraryReady) return;
                                            navigator.clipboard.writeText(url);
                                            setCopiedDocId(activeDocument);
                                            setTimeout(() => setCopiedDocId(null), 1500);
                                        }}
                                        disabled={activeDocument === 'itinerary' && !itineraryReady}
                                        className="btn btn-sm btn-ghost"
                                    >
                                        <Icon name={copiedDocId === activeDocument ? 'check' : 'content_copy'} />
                                        {copiedDocId === activeDocument ? '복사됨' : '링크 복사'}
                                    </button>
                                    <button
                                        onClick={activeDocument === 'itinerary' ? sendItineraryToCustomer : sendContractToCustomer}
                                        disabled={activeDocument === 'itinerary' ? (!itineraryReady || sendingItinerary) : (!contractReady || sendingContract)}
                                        className="btn btn-sm btn-blue"
                                    >
                                        <Icon name="send" />
                                        {activeDocument === 'itinerary'
                                            ? (sendingItinerary ? '발송중' : '일정표 발송')
                                            : (sendingContract ? '발송중' : '계약서 발송')}
                                    </button>
                                </div>
                            </div>
                    </div>
                    )}

                    {tab === 'history' && (
                    <div className="stack" style={{ gap: 16 }}>
                            {/* Admin Memo */}
                            <div className="card">
                                <div className="card-head">
                                    <Icon name="sticky_note_2" style={{ color: 'var(--mrt-gray-600)' }} /><h2>관리자 메모</h2>
                                    <div className="spacer" style={{ flex: 1 }} />
                                    <span className="cell-muted" style={{ fontSize: 11.5 }}>고객 비공개 · 내부 전용</span>
                                </div>
                                <div className="card-pad" style={{ paddingTop: 12 }}>
                                    <div className="memo-box">
                                        <textarea
                                            value={memoDraft}
                                            onChange={e => setMemoDraft(e.target.value)}
                                            onFocus={() => setMemoFocused(true)}
                                            onBlur={() => setMemoFocused(false)}
                                            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addMemo(); }}
                                            placeholder="이 예약에 대한 메모를 남기세요. (예: 고객 특이사항, 파트너 연락 결과…)"
                                            rows={memoFocused || memoDraft ? 3 : 2}
                                        />
                                        <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                                            <span className="cell-muted" style={{ fontSize: 11.5 }}>⌘ + Enter 로 저장</span>
                                            <button
                                                onClick={addMemo}
                                                disabled={!memoDraft.trim()}
                                                className={`btn btn-sm ${memoDraft.trim() ? 'btn-ink' : 'btn-soft'}`}
                                            >
                                                메모 추가
                                            </button>
                                        </div>
                                    </div>
                                    {memos.length > 0 && (
                                        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                                            {[...memos].reverse().map((m: any) => (
                                                <div className="memo-item" key={m.timestamp}>
                                                    <p>{m.description}</p>
                                                    <div className="row" style={{ gap: 6, marginTop: 6 }}>
                                                        <b style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Admin</b>
                                                        <span className="cell-muted" style={{ fontSize: 11 }}>· {new Date(m.timestamp).toLocaleString('ko-KR')}</span>
                                                        <div className="spacer" style={{ flex: 1 }} />
                                                        <button className="act-btn danger" style={{ width: 26, height: 26 }} onClick={() => deleteMemo(m.timestamp)} title="메모 삭제">
                                                            <Icon name="delete_outline" style={{ fontSize: 15 }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* History Timeline */}
                            <div className="card">
                                <div className="card-head"><Icon name="history" style={{ color: 'var(--mrt-gray-600)' }} /><h2>처리 이력</h2></div>
                                {timelineEvents.length > 0 ? (
                                    <div style={{ padding: '8px 20px 16px' }}>
                                        {[...timelineEvents].reverse().map((e: any, i: number, arr: any[]) => (
                                            <div key={i} className="tl-row">
                                                <span className="tl-ico tint-blue"><Icon name={timelineIcon[e.type] || 'radio_button_checked'} /></span>
                                                {i < arr.length - 1 && <span className="tl-line" />}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="cell-strong" style={{ fontSize: 13, whiteSpace: 'normal' }}>{e.description}</div>
                                                    {e.detail && <div className="cell-muted" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</div>}
                                                    <div className="cell-muted" style={{ fontSize: 11.5 }}>
                                                        {e.timestamp ? new Date(e.timestamp).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty"><Icon name="history" /><p>처리 이력이 없습니다.</p></div>
                                )}
                            </div>
                    </div>
                    )}
                </div>

                {/* Footer */}
                <div className="drawer-foot">
                    {isEditing ? (
                        <>
                            <button onClick={handleCancel} className="btn btn-ghost">취소</button>
                            <div className="spacer" style={{ flex: 1 }} />
                            <button onClick={handleSave} className="btn btn-ink"><Icon name="check" />저장</button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} className="btn btn-ghost">닫기</button>
                            <div className="spacer" style={{ flex: 1 }} />
                            <button onClick={() => copyCustomerMessage('final')} className="btn btn-ghost"><Icon name="content_copy" />안내문 복사</button>
                            <button onClick={() => setIsEditing(true)} className="btn btn-ink"><Icon name="edit" />수정</button>
                        </>
                    )}
                </div>

                {copiedDocId === 'final-message' && (
                    <div className="drawer-toast"><Icon name="check_circle" fill />고객 안내문이 복사되었습니다</div>
                )}
            </div>
        </div>

        {/* Guide Selection Modal */}
        {showGuideModal && (
            <div className="picker-scrim" onClick={() => setShowGuideModal(false)}>
                <div className="picker" onClick={e => e.stopPropagation()}>
                    <div className="card-head">
                        <h2>가이드 선택</h2>
                        <div className="spacer" style={{ flex: 1 }} />
                        <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setShowGuideModal(false)}><Icon name="close" /></button>
                    </div>
                    <div className="picker-list">
                        {guideList.length === 0 ? (
                            <div className="empty"><Icon name="person_off" /><p>등록된 가이드가 없습니다</p></div>
                        ) : guideList.map((guide: any) => (
                            <button
                                key={guide.id}
                                className="picker-item"
                                onClick={() => { handleGuideAssign(guide); setShowGuideModal(false); }}
                            >
                                {guide.image ? (
                                    <img className="avatar round" src={guide.image} alt={guide.name} />
                                ) : (
                                    <span className="avatar round tint-blue"><Icon name="person" /></span>
                                )}
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div className="cell-strong">{guide.name}</div>
                                    <div className="cell-muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guide.phone}</div>
                                    {guide.languages && (
                                        <div className="row" style={{ gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                            {(typeof guide.languages === 'string' ? JSON.parse(guide.languages) : guide.languages).slice(0, 3).map((l: string) => (
                                                <span key={l} className="badge b-blue" style={{ fontSize: 10, padding: '1px 7px' }}>{l}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Icon name="add_circle" style={{ color: 'var(--mrt-blue)' }} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Accommodation Selection Modal */}
        {showAccommodationModal && (
            <div className="picker-scrim" onClick={() => setShowAccommodationModal(false)}>
                <div className="picker" onClick={e => e.stopPropagation()}>
                    <div className="card-head">
                        <h2>{selectedDay}일차 숙소 선택</h2>
                        <div className="spacer" style={{ flex: 1 }} />
                        <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setShowAccommodationModal(false)}><Icon name="close" /></button>
                    </div>
                    <div className="picker-list">
                        {accommodationList.length === 0 ? (
                            <div className="empty"><Icon name="hotel" /><p>등록된 숙소가 없습니다</p></div>
                        ) : accommodationList.map((acc: any) => (
                            <button
                                key={acc.id}
                                className="picker-item"
                                onClick={() => { handleAccommodationAssign(acc); setShowAccommodationModal(false); }}
                            >
                                {acc.thumbnail || (acc.images && JSON.parse(acc.images || '[]')[0]) ? (
                                    <img className="thumb sq" src={acc.thumbnail || JSON.parse(acc.images || '[]')[0]} alt={acc.name} />
                                ) : (
                                    <span className="thumb sq" style={{ display: 'grid', placeItems: 'center', color: 'var(--mrt-gray-400)' }}><Icon name="hotel" /></span>
                                )}
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div className="cell-strong">{acc.name}</div>
                                    {acc.type && <div className="cell-muted" style={{ fontSize: 12 }}>{acc.type}</div>}
                                    {acc.location && <div className="cell-muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.location}</div>}
                                </div>
                                <Icon name="add_circle" style={{ color: 'var(--mrt-blue)' }} />
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
                        className="btn btn-ghost"
                    >
                        <Icon name="refresh" />
                        새로고침
                    </button>
                }
            >
                <div className="stack route-anim" style={{ gap: 18, fontFamily: 'var(--font-sans)' }}>
                    {/* Summary Cards */}
                    <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                        {[
                            { label: '전체 예약 건수', value: stats.total, icon: 'folder_managed', tint: 'tint-blue' },
                            { label: '입금 대기', value: stats.pending, icon: 'payments', tint: 'tint-amber' },
                            { label: '예약 확정', value: stats.confirmed, icon: 'verified', tint: 'tint-green' },
                            { label: '맞춤 견적 진행중', value: stats.quoteTodo, icon: 'request_quote', tint: 'tint-blue' },
                            { label: '계약서 발송 완료', value: stats.contractSent, icon: 'contract', tint: 'tint-purple' },
                            { label: '여행 출발 예정', value: stats.departingSoon, icon: 'flight_takeoff', tint: 'tint-red' },
                        ].map(card => (
                            <div key={card.label} className="metric">
                                <div className="metric-top">
                                    <span className={`metric-ico ${card.tint}`}><Icon name={card.icon} fill /></span>
                                </div>
                                <div className="metric-label">{card.label}</div>
                                <div className="metric-value">{card.value}<small>건</small></div>
                            </div>
                        ))}
                    </div>

                    {/* Filter Section */}
                    <div className="card card-pad">
                        <div className="row" style={{ marginBottom: 16 }}>
                            <div style={{ minWidth: 0 }}>
                                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-strong)' }}>검색 및 필터</h2>
                                <p className="cell-muted" style={{ fontSize: 12, marginTop: 4 }}>고객명, 이메일, 전화번호, 예약번호, 여행상품으로 검색할 수 있습니다.</p>
                            </div>
                            <div className="spacer" style={{ flex: 1 }} />
                            <button
                                onClick={() => { setSearchTerm(''); setFilterStatus('전체 상태'); setFilterPayment('전체 결제'); setFilterType('전체 유형'); setFilterDeparture(''); setCurrentPage(1); }}
                                className="btn btn-soft btn-sm"
                            >
                                <Icon name="restart_alt" />
                                초기화
                            </button>
                        </div>
                        <div className="toolbar" style={{ marginBottom: 0 }}>
                            <label className="tb-search" style={{ flex: 1, minWidth: 240 }}>
                                <Icon name="search" />
                                <input
                                    type="text"
                                    placeholder="고객명 / 이메일 / 전화번호 / 예약번호 / 상품명"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </label>
                            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="select">
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
                            <select value={filterPayment} onChange={(e) => { setFilterPayment(e.target.value); setCurrentPage(1); }} className="select">
                                <option>전체 결제</option>
                                <option>예약금 미입금</option>
                                <option>예약금 입금</option>
                                <option>잔금 미입금</option>
                                <option>잔금 입금</option>
                            </select>
                            <input type="date" value={filterDeparture} onChange={(e) => { setFilterDeparture(e.target.value); setCurrentPage(1); }} className="select" style={{ paddingRight: 13 }} />
                        </div>
                        <div className="chip-row" style={{ marginTop: 14 }}>
                            {['전체 유형', '일반 상품', '맞춤 견적'].map(type => (
                                <button key={type} onClick={() => { setFilterType(type); setCurrentPage(1); }} className={`chip${filterType === type ? ' active' : ''}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reservation List */}
                    <div className="card">
                        <div className="card-head">
                            <h2>예약 · 견적 목록</h2>
                            <span className="cell-muted" style={{ fontSize: 13 }}>{filteredReservations.length}건</span>
                            <div className="spacer" />
                            <div className="seg">
                                <button className={filterType === '전체 유형' ? 'active' : ''} onClick={() => { setFilterType('전체 유형'); setCurrentPage(1); }}>전체</button>
                                <button className={filterType === '일반 상품' ? 'active' : ''} onClick={() => { setFilterType('일반 상품'); setCurrentPage(1); }}>예약</button>
                                <button className={filterType === '맞춤 견적' ? 'active' : ''} onClick={() => { setFilterType('맞춤 견적'); setCurrentPage(1); }}>견적</button>
                            </div>
                        </div>
                        <div className="tbl-wrap">
                            <table className="tbl">
                                <thead>
                                    <tr>
                                        <th>예약번호</th>
                                        <th>고객 / 연락처</th>
                                        <th>상품</th>
                                        <th className="c">인원</th>
                                        <th>투어일</th>
                                        <th>상태</th>
                                        <th className="r">금액</th>
                                        <th className="r">관리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedReservations.map((res) => {
                                        const workflow = getWorkflowMeta(res);
                                        const nextAction = getQuoteAction(res);
                                        const reservationNo = res.reservationNumber || res.id.slice(0, 8).toUpperCase();
                                        const statusTone = STATUS_TONE[res.status] || 'b-gray';
                                        return (
                                            <tr key={res.id} onClick={() => setSelectedReservation(res)}>
                                                <td>
                                                    <div className="cell-mono">#{reservationNo}</div>
                                                    <div style={{ marginTop: 3 }}>
                                                        <span className={`tag-type ${res.type === 'quote' ? 'quote' : 'reservation'}`}>
                                                            {res.type === 'quote' ? '맞춤견적' : '일반상품'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div>
                                                        <div className="cell-strong">{res.customerName}</div>
                                                        <div className="cell-muted" style={{ fontSize: 12 }}>{res.email || res.phone || '연락처 미입력'}</div>
                                                    </div>
                                                </td>
                                                <td className="cell-muted" style={{ maxWidth: 240 }}>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={res.productName}>{res.productName}</div>
                                                </td>
                                                <td className="c cell-mono">{res.headcount || '미정'}</td>
                                                <td className="cell-muted">{res.date}</td>
                                                <td>
                                                    <span className={`badge ${statusTone}`}>
                                                        <Icon name={workflow.icon} style={{ fontSize: 14 }} />
                                                        {workflow.label}
                                                    </span>
                                                </td>
                                                <td className="r cell-price">{typeof res.totalAmount === 'number' && !isNaN(res.totalAmount) && res.totalAmount > 0 ? `₩${res.totalAmount.toLocaleString()}` : '–'}</td>
                                                <td className="r" onClick={(e) => e.stopPropagation()}>
                                                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${nextAction.primary ? 'btn-blue' : 'btn-ghost'}`}
                                                            onClick={() => {
                                                                if (nextAction.nextStatus) {
                                                                    handleStatusChange(res.id, nextAction.nextStatus, res.type);
                                                                } else {
                                                                    setSelectedReservation(res);
                                                                }
                                                            }}
                                                            title={nextAction.description}
                                                        >
                                                            <Icon name={nextAction.icon} />
                                                            {nextAction.label}
                                                        </button>
                                                        <button className="act-btn" title="상세" onClick={() => setSelectedReservation(res)}>
                                                            <Icon name="visibility" />
                                                        </button>
                                                        <button className="act-btn danger" title="삭제" onClick={() => handleDelete(res.id, res.type)}>
                                                            <Icon name="delete" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {displayedReservations.length === 0 && (
                                <div className="empty"><Icon name="manage_search" /><p>검색 결과가 없습니다.</p></div>
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="row" style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                            <span className="cell-muted" style={{ fontSize: 12 }}>
                                총 {filteredReservations.length}건 중 {filteredReservations.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredReservations.length)} 표시
                            </span>
                            <div className="spacer" style={{ flex: 1 }} />
                            <div className="row" style={{ gap: 8 }}>
                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="act-btn">
                                    <Icon name="chevron_left" />
                                </button>
                                <span className="cell-mono" style={{ fontSize: 12 }}>{Math.min(currentPage, Math.max(totalPages, 1))} / {Math.max(totalPages, 1)}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.max(totalPages, 1)))} disabled={currentPage >= totalPages || totalPages === 0} className="act-btn">
                                    <Icon name="chevron_right" />
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
