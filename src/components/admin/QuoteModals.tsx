import React, { useState, useEffect, useRef } from 'react';

import { GuideSelectionModal, AccommodationSelectionModal } from './SelectionModals';
import { sendNotificationEmail } from '../../lib/email';
import { api } from '../../lib/api';
import { ReservationDocumentEditor, type ReservationDocContent } from './ReservationDocumentEditor';
import { decodeTemplateDescription, mergeDocumentSettings } from '../../pages/AdminTemplateManage';

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
    itineraryTemplateId?: string;
    itinerary_template_id?: string;
    documentContent?: ReservationDocContent | null;
    document_content?: any;
}

// Helper functions for currency formatting
const formatNumber = (num: number | string) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const unformatNumber = (str: string) => {
    return parseInt(str.replace(/,/g, '')) || 0;
};

const normalizeDocumentContent = (value: any): ReservationDocContent | null => {
    if (!value) return null;
    let parsed = value;
    for (let depth = 0; depth < 2 && typeof parsed === 'string'; depth += 1) {
        try { parsed = JSON.parse(parsed); } catch { return null; }
    }
    return parsed && typeof parsed === 'object' ? parsed as ReservationDocContent : null;
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
    onSendEstimate: (url: string, note: string, priceDetail: any, startDate: string, endDate: string, itineraryTemplateId?: string) => void;
    onOpenConvert: () => void;
    onUpdateQuote: (id: string, updates: Partial<QuoteRequest>) => Promise<void>;
}> = ({ request, onClose, onSendEstimate, onOpenConvert, onUpdateQuote }) => {
    const [estimateUrl, setEstimateUrl] = useState(request?.estimateUrl || '');
    const [adminNote, setAdminNote] = useState(request?.adminNote || '');
    const [copiedEstimateUrl, setCopiedEstimateUrl] = useState(false);

    // 맞춤 일정표 — 고객 견적 페이지에 함께 보낼 일정표 템플릿
    const [templatesList, setTemplatesList] = useState<any[]>([]);
    const [itineraryTemplateId, setItineraryTemplateId] = useState<string>(request?.itineraryTemplateId || request?.itinerary_template_id || '');
    const [quoteDocumentContent, setQuoteDocumentContent] = useState<ReservationDocContent | null>(
        normalizeDocumentContent(request?.documentContent || request?.document_content)
    );
    const [docEditorOpen, setDocEditorOpen] = useState(false);
    const [activeSec, setActiveSec] = useState<'info' | 'quote' | 'assign'>('info');
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const scrollToSec = (id: 'info' | 'quote' | 'assign') => {
        setActiveSec(id);
        bodyRef.current?.querySelector(`#qsec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    useEffect(() => {
        api.itineraryTemplates.list().then((d: any) => { if (Array.isArray(d)) setTemplatesList(d); }).catch(() => {});
    }, []);

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
            setItineraryTemplateId(request.itineraryTemplateId || request.itinerary_template_id || '');
            setQuoteDocumentContent(normalizeDocumentContent(request.documentContent || request.document_content));
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

    // 문서 편집기 (견적용) — 고객 데이터 자동 채움, document_content 저장
    const quotePeople = parseInt(String(request.headcount || '').replace(/[^0-9]/g, '')) || 0;
    const docTripLength = (() => {
        if (!confirmedStartDate || !confirmedEndDate) return '';
        const s = new Date(confirmedStartDate); const e = new Date(confirmedEndDate);
        const ms = e.getTime() - s.getTime();
        if (isNaN(ms) || ms < 0) return '';
        const nights = Math.round(ms / 86400000);
        return `${nights}泊${nights + 1}日`;
    })();
    const docCustomer = {
        tripNumber: request.id.slice(0, 8).toUpperCase(),
        period: request.period || '',
        tripLength: docTripLength || undefined,
        headcount: request.headcount || '',
        name: request.name,
        tripType: request.destination,
        totalAmount: priceDetail.totalAmount || undefined,
        deposit: priceDetail.deposit || undefined,
        localAmount: priceDetail.totalAmount ? (priceDetail.totalAmount - (priceDetail.deposit || 0)) : undefined,
        peopleCount: quotePeople || undefined,
    };
    const templateToDocumentContent = (templateId: string): ReservationDocContent | null => {
        const tpl = templatesList.find((t: any) => t.id === templateId);
        if (!tpl) return null;
        const decoded = decodeTemplateDescription(tpl.description || '');
        let templateDays: any[] = [];
        try { templateDays = typeof tpl.days === 'string' ? JSON.parse(tpl.days || '[]') : (tpl.days || []); } catch { templateDays = []; }
        return {
            name: tpl.name || '',
            description: decoded.description || '',
            days: structuredClone(templateDays),
            documentSettings: structuredClone(decoded.documentSettings),
        };
    };
    const docInitialContent: ReservationDocContent | null = (() => {
        const dc = quoteDocumentContent;
        if (dc && (Array.isArray(dc.days) || dc.documentSettings)) {
            return { name: dc.name || '', description: dc.description || '', days: dc.days || [], documentSettings: mergeDocumentSettings(dc.documentSettings) };
        }
        return templateToDocumentContent(itineraryTemplateId);
    })();
    const saveQuoteDoc = async (content: ReservationDocContent) => {
        setQuoteDocumentContent(content);
        await onUpdateQuote(request.id, {
            itineraryTemplateId,
            documentContent: content,
        } as any);
    };
    const handleTemplateChange = async (templateId: string) => {
        setItineraryTemplateId(templateId);
        const content = templateId ? templateToDocumentContent(templateId) : null;
        setQuoteDocumentContent(content);
        await onUpdateQuote(request.id, {
            itineraryTemplateId: templateId,
            documentContent: content,
        } as any);
    };

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

    const handleSend = () => onSendEstimate(estimateUrl, adminNote, priceDetail, confirmedStartDate, confirmedEndDate, itineraryTemplateId);
    const estimatePageUrl = `${window.location.origin}/estimate/${request.id}`;
    const statusTone: Record<string, string> = { new: 'b-red', processing: 'b-amber', answered: 'b-blue', reservation_requested: 'b-purple', converted: 'b-gray', completed: 'b-green' };
    const nextAction = (() => {
        if (request.status === 'converted' || request.status === 'completed') return null;
        if (request.status === 'reservation_requested') return { label: '예약으로 전환', desc: '고객이 예약을 요청했습니다 — 확정 내용으로 전환하세요.', icon: 'sync_alt', onClick: onOpenConvert };
        if (!canSendEstimate) return { label: '견적 작성 · 일정·금액 입력', desc: '확정 일정과 금액·예약금을 입력하면 발송할 수 있습니다.', icon: 'edit_note', onClick: () => scrollToSec('quote') };
        if (request.status !== 'answered') return { label: '견적서 발송 처리', desc: '입력 완료 — 고객에게 견적을 발송하세요.', icon: 'send', onClick: handleSend };
        return { label: '재발송 · 고객 응답 대기', desc: '발송 완료 — 예약 요청을 기다리는 중입니다.', icon: 'mark_email_read', onClick: handleSend };
    })();

    return (<>
        <div className="drawer-scrim reservation-workspace-scrim" style={{ zIndex: 100 }} onClick={onClose}>
            <div className="drawer reservation-workspace tcom" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="drawer-head">
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="row" style={{ gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span className="tag-type quote">맞춤견적</span>
                            <span className="cell-mono" style={{ fontSize: 13 }}>#{request.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="page-title" style={{ fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{request.destination || '맞춤 견적'} · {request.name}</div>
                    </div>
                    <span className={`badge ${statusTone[request.status] || 'b-gray'}`}>{statusMeta.label}</span>
                    <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={onClose}><span className="material-symbols-outlined">close</span></button>
                </div>

                {/* NEXT — 견적 워크플로의 다음 할 일 */}
                <div className={`next-bar${nextAction ? '' : ' all-done'}`}>
                    <span className="nb-label">{nextAction ? '다음 할 일' : '처리 완료'}</span>
                    {nextAction ? (
                        <>
                            <button className="btn btn-sm btn-ink" onClick={nextAction.onClick}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{nextAction.icon}</span>{nextAction.label}
                            </button>
                            <span className="nb-desc">{nextAction.desc}</span>
                        </>
                    ) : (
                        <span className="row" style={{ gap: 6, fontSize: 13, fontWeight: 800, color: 'var(--mrt-green)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>check_circle</span>예약 전환까지 완료된 견적입니다
                        </span>
                    )}
                    <span className="step-dots">
                        {workflowSteps.map((s, i) => <span key={s.key} className={`sd${i < currentStepIndex ? ' on' : ''}`} title={s.label} />)}
                        <span className="sd-n">{currentStepIndex}/{workflowSteps.length}</span>
                    </span>
                </div>

                {/* 섹션 앵커 */}
                <div className="tc-anchors">
                    {([['info', '요청 정보'], ['quote', '견적 작성'], ['assign', '가이드·숙소']] as const).map(([id, label]) => (
                        <button key={id} type="button" className={activeSec === id ? 'active' : ''} onClick={() => scrollToSec(id)}>{label}</button>
                    ))}
                </div>

                <div className="reservation-workspace-main">
                <div className="drawer-body reservation-workspace-body" ref={bodyRef}>
                    <div className="stack" style={{ gap: 18 }}>

                    <section id="qsec-info" style={{ scrollMarginTop: 8 }}>
                        <div className="stack" style={{ gap: 14 }}>
                        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'stretch' }}>
                            <div className="card">
                                <div className="card-head"><span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }}>person</span><h2>신청자 정보</h2></div>
                                <div className="card-pad" style={{ paddingTop: 12 }}>
                                    <div className="kv"><span>이름</span><b>{request.name}</b></div>
                                    <div className="kv"><span>연락처</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{request.phone || '—'}</b></div>
                                    <div className="kv" style={{ borderBottom: 'none' }}><span>이메일</span><b style={{ textAlign: 'right' }}>{request.email || '—'}</b></div>
                                </div>
                            </div>
                            <div className="card">
                                <div className="card-head"><span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }}>explore</span><h2>여행 조건</h2>
                                    <div className="spacer" style={{ flex: 1 }} />
                                    <button className="link-action" onClick={() => isEditing ? handleSaveEdit() : setIsEditing(true)}>{isEditing ? '저장 완료' : '정보 수정'}</button>
                                </div>
                                <div className="card-pad" style={{ paddingTop: 12 }}>
                                    <div className="kv"><span>여행지</span>{isEditing ? <input className="inp" style={{ width: 160, height: 30 }} value={editForm.destination} onChange={e => setEditForm({ ...editForm, destination: e.target.value })} /> : <b>{request.destination || '미정'}</b>}</div>
                                    <div className="kv"><span>인원</span>{isEditing ? <input className="inp" style={{ width: 120, height: 30 }} value={editForm.headcount} onChange={e => setEditForm({ ...editForm, headcount: e.target.value })} /> : <b>{request.headcount || '미정'}</b>}</div>
                                    <div className="kv"><span>희망 일정</span>{isEditing ? <input className="inp" style={{ width: 160, height: 30 }} value={editForm.period} onChange={e => setEditForm({ ...editForm, period: e.target.value })} /> : <b>{request.period || '미정'}</b>}</div>
                                    <div className="kv" style={{ borderBottom: 'none' }}><span>예산 / 차량</span>{isEditing ? <input className="inp" style={{ width: 120, height: 30 }} value={editForm.budget} onChange={e => setEditForm({ ...editForm, budget: e.target.value })} /> : <b>{request.budget || '미정'} · {request.vehicle || '차량 미정'}</b>}</div>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-head"><span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }}>format_list_bulleted</span><h2>상세 요청</h2></div>
                            <div className="card-pad" style={{ paddingTop: 12 }}>
                                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {request.travelTypes.map(t => <span key={t} className="badge b-blue">{t}</span>)}
                                    {request.accommodations.map(t => <span key={t} className="badge b-gray">{t}</span>)}
                                </div>
                                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{request.additionalRequest || '추가 요청사항이 없습니다.'}</p>
                            </div>
                        </div>
                        </div>
                    </section>

                    <section id="qsec-quote" style={{ scrollMarginTop: 8 }}>
                        <div className="card">
                            <div className="card-head"><span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }}>edit_note</span><h2>견적 작성 — 확정 일정·금액</h2></div>
                            <div className="card-pad" style={{ paddingTop: 12 }}>
                                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <label className="field" style={{ marginBottom: 0 }}><span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: 5 }}>시작일</span>
                                        <input type="date" className="inp" value={confirmedStartDate} onChange={(e) => setConfirmedStartDate(e.target.value)} /></label>
                                    <label className="field" style={{ marginBottom: 0 }}><span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: 5 }}>종료일</span>
                                        <input type="date" className="inp" value={confirmedEndDate} onChange={(e) => setConfirmedEndDate(e.target.value)} /></label>
                                </div>
                                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                    <div className="pay-cell">
                                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>총 결제금액</span></div>
                                        <div className="row" style={{ gap: 4 }}>
                                            <input type="text" className="inp" style={{ textAlign: 'right', fontWeight: 800 }} value={formatNumber(priceDetail.totalAmount)} placeholder="0"
                                                onChange={(e) => { const total = unformatNumber(e.target.value); setPriceDetail(prev => ({ ...prev, totalAmount: total, deposit: prev.deposit ? prev.deposit : Math.floor(total * 0.1) })); }} />
                                            <span className="cell-muted" style={{ fontSize: 12, flex: 'none' }}>엔</span>
                                        </div>
                                    </div>
                                    <div className="pay-cell paid">
                                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>예약금</span></div>
                                        <div className="row" style={{ gap: 4 }}>
                                            <input type="text" className="inp" style={{ textAlign: 'right', fontWeight: 800 }} value={formatNumber(priceDetail.deposit)} placeholder="0"
                                                onChange={(e) => setPriceDetail({ ...priceDetail, deposit: unformatNumber(e.target.value) })} />
                                            <span className="cell-muted" style={{ fontSize: 12, flex: 'none' }}>엔</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--mrt-gray-50)' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>예상 잔금 (현지 결제)</span>
                                    <b className="cell-price" style={{ fontSize: 15 }}>{(priceDetail.totalAmount - priceDetail.deposit).toLocaleString()}엔</b>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="qsec-assign" style={{ scrollMarginTop: 8 }}>
                        <div className="stack" style={{ gap: 14 }}>
                        <div className="card">
                            <div className="card-head"><span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }}>badge</span><h2>담당 가이드</h2>
                                <div className="spacer" style={{ flex: 1 }} />
                                <button className="link-action" onClick={() => setShowGuideModal(true)}>{assignedGuide ? '변경' : '배정'}<span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span></button>
                            </div>
                            <div className="card-pad" style={{ paddingTop: 12 }}>
                                {assignedGuide ? (
                                    <div className="assign-row">
                                        <span className="avatar round tint-blue"><span className="material-symbols-outlined">person</span></span>
                                        <div style={{ minWidth: 0 }}>
                                            <div className="cell-strong">{assignedGuide.name}</div>
                                            <div className="cell-muted" style={{ fontSize: 12 }}>{assignedGuide.phone}</div>
                                        </div>
                                        <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={handleSendGuideInfo}>정보 발송</button>
                                    </div>
                                ) : (
                                    <div className="assign-empty" onClick={() => setShowGuideModal(true)}>
                                        <span className="material-symbols-outlined">person_add</span>가이드를 배정하세요
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-head"><span className="material-symbols-outlined" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }}>hotel</span><h2>일자별 숙소 배정</h2>
                                <div className="spacer" style={{ flex: 1 }} />
                                <span className="row" style={{ gap: 4 }}>
                                    <button className="act-btn" style={{ width: 26, height: 26 }} onClick={() => setExtraDays(Math.max(0, extraDays - 1))}><span className="material-symbols-outlined" style={{ fontSize: 15 }}>remove</span></button>
                                    <span className="cell-mono" style={{ fontSize: 12 }}>{getTripDays()}일차</span>
                                    <button className="act-btn" style={{ width: 26, height: 26 }} onClick={() => setExtraDays(extraDays + 1)}><span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span></button>
                                </span>
                            </div>
                            <div className="card-pad" style={{ paddingTop: 12 }}>
                                <div className="stack" style={{ gap: 8 }}>
                                    {Array.from({ length: getTripDays() }).map((_, i) => {
                                        const dayNum = i + 1;
                                        const assigned = dailyAccommodations.find(d => d.day === dayNum);
                                        return (
                                            <div className="accom-day" key={dayNum}>
                                                <span className="th-day">{dayNum}일차</span>
                                                {assigned ? (
                                                    <div className="assign-row" style={{ flex: 1, padding: 0 }}>
                                                        <span className="thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--mrt-gray-400)' }}><span className="material-symbols-outlined">hotel</span></span>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div className="cell-strong">{assigned.accommodation.name}</div>
                                                            <div className="cell-muted" style={{ fontSize: 12 }}>{assigned.accommodation.type || '—'}</div>
                                                        </div>
                                                        <button className="act-btn" title="변경" onClick={() => { setSelectedDay(dayNum); setShowAccommodationModal(true); }}><span className="material-symbols-outlined" style={{ fontSize: 17 }}>edit</span></button>
                                                    </div>
                                                ) : (
                                                    <button className="accom-empty" onClick={() => { setSelectedDay(dayNum); setShowAccommodationModal(true); }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add</span>숙소 선택
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        </div>
                    </section>

                    </div>
                </div>

                {/* 우측 액션 레일 — 견적 발송 작업의 단일 면 */}
                <aside className="reservation-action-rail">
                    <div className="action-rail-head">
                        <div>
                            <span className="action-rail-eyebrow">ESTIMATE</span>
                            <h2>견적서와 고객 발송</h2>
                        </div>
                        <span className={`badge ${statusTone[request.status] || 'b-gray'}`}>{statusMeta.label}</span>
                    </div>

                    <div className="action-rail-stack">
                        <section className="action-doc active">
                            <button type="button" className="action-doc-title">
                                <span className="action-doc-icon tint-blue"><span className="material-symbols-outlined">request_quote</span></span>
                                <span>
                                    <b>견적 제안서</b>
                                    <small>{request.status === 'answered' ? '발송 완료 · 재발송 가능' : canSendEstimate ? '발송 준비 완료' : '확정 일정·금액 입력 필요'}</small>
                                </span>
                                <span className="material-symbols-outlined">{request.status === 'answered' ? 'check_circle' : 'chevron_right'}</span>
                            </button>
                            <select className="inp" value={itineraryTemplateId} onChange={(e) => setItineraryTemplateId(e.target.value)}>
                                <option value="">일정표 없음 (비용만 안내)</option>
                                {templatesList.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                            </select>
                            <div className="action-doc-buttons">
                                <button className="btn btn-sm btn-blue" disabled={!canSendEstimate} onClick={handleSend} title={!canSendEstimate ? '확정 일정과 금액·예약금을 입력하면 발송할 수 있습니다.' : undefined}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>{request.status === 'answered' ? '재발송 처리' : '견적서 발송 처리'}
                                </button>
                                <button className="btn btn-sm btn-ghost" onClick={() => setDocEditorOpen(true)}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_document</span>{request.documentContent || request.document_content ? '문서 편집' : '문서 만들기'}
                                </button>
                                <button className="btn btn-sm btn-ghost" onClick={() => window.open(estimatePageUrl, '_blank')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>고객 화면 미리보기
                                </button>
                                <button className="btn btn-sm btn-ghost" onClick={async () => { await navigator.clipboard.writeText(estimatePageUrl); setCopiedEstimateUrl(true); setTimeout(() => setCopiedEstimateUrl(false), 1500); }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copiedEstimateUrl ? 'check' : 'content_copy'}</span>{copiedEstimateUrl ? '복사됨' : '견적 페이지 링크'}
                                </button>
                            </div>
                        </section>

                        {request.status === 'reservation_requested' && (
                            <button className="btn btn-blue action-send-all" onClick={onOpenConvert}>
                                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>sync_alt</span>예약으로 전환
                            </button>
                        )}
                    </div>

                    <div className="action-rail-group">
                        <h3>외부 견적서 링크 <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>(선택)</span></h3>
                        <input type="url" className="inp" value={estimateUrl} onChange={(e) => setEstimateUrl(e.target.value)} placeholder="https://... (비우면 시스템 견적 페이지)" />
                    </div>

                    <div className="action-rail-group">
                        <h3>고객 안내문 <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>(선택)</span></h3>
                        <div className="row" style={{ gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                            {quickNotes.map((note) => (
                                <button key={note.label} className="btn btn-sm btn-ghost" onClick={() => setAdminNote(note.text)}>{note.label}</button>
                            ))}
                        </div>
                        <textarea className="inp" style={{ height: 84, padding: '8px 10px', resize: 'vertical' }} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="고객 화면에는 일본어로 보이므로 일본어 안내문을 입력하세요." />
                    </div>

                    <div className="action-rail-group">
                        <h3>발송 전 체크</h3>
                        {checklistItems.map((item) => (
                            <div key={item.label} className="row" style={{ justifyContent: 'space-between', padding: '4px 0' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{item.label}{item.optional && <span style={{ marginLeft: 4, fontSize: 10.5, color: 'var(--text-tertiary)' }}>선택</span>}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 17, color: item.done ? 'var(--mrt-green)' : 'var(--mrt-gray-300)' }}>{item.done ? 'check_circle' : 'radio_button_unchecked'}</span>
                            </div>
                        ))}
                    </div>
                </aside>
                </div>

                {/* Footer */}
                <div className="drawer-foot">
                    <span className="cell-muted" style={{ fontSize: 12 }}>요청 일시: {request.date} ({request.createdAt})</span>
                    <div className="spacer" style={{ flex: 1 }} />
                    <button className="btn btn-ghost" onClick={onClose}>닫기</button>
                </div>
            </div>
        </div>


            <ReservationDocumentEditor
                open={docEditorOpen}
                onClose={() => setDocEditorOpen(false)}
                title={`${request.name || '고객'} · 見積提案書`}
                customer={docCustomer}
                initialContent={docInitialContent}
                onSave={saveQuoteDoc}
            />

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
    </>
    );
};
