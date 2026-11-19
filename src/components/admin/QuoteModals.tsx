import React, { useState, useEffect, useRef } from 'react';
import { STATUS_META, toneClass } from './ui';
import { Icon } from './console/Icon';

import { api } from '../../lib/api';
import { ReservationDocumentEditor, type ReservationDocContent, type DocPricing } from './ReservationDocumentEditor';
import { periodDates } from '../../constants/quoteOptions';
import { decodeTemplateDescription, mergeDocumentSettings } from '../../pages/AdminTemplateManage';
import { parseQuoteDoc } from './quoteConvert';

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

const parsePeopleCount = (value?: string) => {
    const matches = String(value || '').match(/\d+/g);
    if (!matches || matches.length === 0) return 1;
    return Math.max(1, matches.reduce((sum, count) => sum + parseInt(count, 10), 0));
};

const parseDocumentPricePerPerson = (content?: ReservationDocContent | null) => {
    const raw = content?.documentSettings?.overview?.pricePerPerson;
    const parsed = typeof raw === 'string' ? parseInt(raw.replace(/[^\d]/g, ''), 10) : Number(raw || 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const syncDocumentPrice = (content: ReservationDocContent | null, pricePerPerson: number): ReservationDocContent | null => {
    if (!content) return content;
    const settings = mergeDocumentSettings(content.documentSettings);
    return {
        ...content,
        documentSettings: {
            ...settings,
            overview: {
                ...settings.overview,
                pricePerPerson: pricePerPerson > 0 ? String(pricePerPerson) : settings.overview.pricePerPerson,
            },
        },
    };
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
        // (견적 관리 화면은 camelCase, 통합 예약관리는 snake_case 로 넘겨준다)
        const confirmedStart = request.confirmed_start_date || (request as any).confirmedStartDate || '';
        const confirmedEnd = request.confirmed_end_date || (request as any).confirmedEndDate || '';
        if (confirmedStart) setStartDate(String(confirmedStart).substring(0, 10));
        if (confirmedEnd) setEndDate(String(confirmedEnd).substring(0, 10));
        if (request.confirmed_price) {
            setTotalAmount(request.confirmed_price);
            setDeposit(request.deposit || Math.floor(request.confirmed_price * 0.1));
            return;
        }

        // 2순위: 확정 데이터 없으면 period 문자열 파싱
        if (!confirmedStart && request.period && /[~〜～]/.test(request.period)) {
            const parts = request.period.split(/[~〜～]/).map(p => p.trim());
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

        // 3순위: 견적 문서의 1인 요금 × 인원
        const docForPrice = parseQuoteDoc(request.documentContent ?? request.document_content);
        const perPerson = parseDocumentPricePerPerson(docForPrice);
        if (!request.confirmed_price && perPerson > 0) {
            const total = perPerson * parsePeopleCount(request.headcount);
            setTotalAmount(total);
            setDeposit(request.deposit || Math.floor(total * 0.1));
            return;
        }

        // 4순위: 금액은 예산 문자열에서 파싱
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
    const convertDoc = parseQuoteDoc(request.documentContent ?? request.document_content);
    const convertDays = Array.isArray(convertDoc?.days) ? convertDoc.days.length : 0;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[rgba(0,0,0,0.45)] backdrop-blur-sm">
            <div className="bg-[var(--mw-surface)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-[color:var(--mw-line)] flex items-center justify-between bg-[var(--mw-gray-50)]">
                    <h3 className="text-lg font-bold text-[color:var(--mw-ink)] flex items-center gap-2">
                        <Icon name="sync_alt" className="text-[color:var(--mw-green-700)]" />
                        예약 확정 및 전환
                    </h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-[var(--mw-gray-200)]">
                        <Icon name="close" className="text-[color:var(--mw-muted)]" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-3 bg-[var(--mw-green-50)] text-[color:var(--mw-green-700)] text-sm rounded-lg mb-4">
                        <b>{request.name}</b>님의 견적 요청을 정식 예약으로 전환합니다.<br />
                        견적 값이 미리 채워져 있으니 날짜·금액만 확인해 주세요.
                    </div>
                    {convertDays > 0 ? (
                        <div className="flex items-start gap-2 rounded-lg border border-[color:var(--mw-line)] bg-[var(--mw-gray-100)] p-3 text-xs font-semibold text-[color:var(--mw-gray-800)]">
                            <Icon name="task_alt" className="text-[16px]" />
                            <span>고객정보·인원·금액과 견적서 일정 <b>{convertDays}일</b>(관광지·숙소 사진 포함)이 <b>확정일정표로 그대로</b> 옮겨집니다. 전환 후 새 예약이 열리면 바로 발송할 수 있습니다.</span>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 rounded-lg border border-[color:var(--mw-line)] bg-[var(--mw-gray-100)] p-3 text-xs font-semibold text-[color:var(--mw-gray-800)]">
                            <Icon name="warning" className="text-[16px]" />
                            <span>아직 견적서 일정이 없습니다. 전환은 되지만 확정일정표는 예약 화면에서 새로 작성해야 합니다. 먼저 「견적 제안서 작성」을 하는 것을 권장합니다.</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[color:var(--mw-muted)] mb-1">여행 시작일</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg bg-[var(--mw-surface)] border-[color:var(--mw-line)] focus:ring-2 focus:ring-[color:var(--mw-green-700)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[color:var(--mw-muted)] mb-1">여행 종료일</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg bg-[var(--mw-surface)] border-[color:var(--mw-line)] focus:ring-2 focus:ring-[color:var(--mw-green-700)]"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-[color:var(--mw-muted)] mb-1 ml-1">총 확정 금액 (원)</label>
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
                                    className="w-full px-3 py-2.5 border rounded-lg bg-[var(--mw-surface)] border-[color:var(--mw-line)] focus:ring-2 focus:ring-[color:var(--mw-green-700)] font-bold text-right pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[color:var(--mw-gray-500)]">원</span>
                            </div>
                            {totalAmount > 0 && (
                                <p className="text-[10px] font-bold text-[color:var(--mw-green-700)] ml-1">
                                    ≈ {typeof totalAmount === 'number' && !isNaN(totalAmount) ? (totalAmount / 10000).toLocaleString() : 0}만원
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-[color:var(--mw-muted)] mb-1 ml-1">예약금 (원)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="0"
                                    value={formatNumber(deposit)}
                                    onChange={e => setDeposit(unformatNumber(e.target.value))}
                                    className="w-full px-3 py-2.5 border rounded-lg bg-[var(--mw-surface)] border-[color:var(--mw-line)] focus:ring-2 focus:ring-[color:var(--mw-green-700)] font-bold text-right text-[color:var(--mw-green-700)] pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[color:var(--mw-gray-500)]">원</span>
                            </div>
                            {deposit > 0 && (
                                <p className="text-[10px] font-bold text-[color:var(--mw-green-700)] ml-1">
                                    ≈ {typeof deposit === 'number' && !isNaN(deposit) ? (deposit / 10000).toLocaleString() : 0}만원
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Balance Preview */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${totalAmount - deposit < 0 ? 'bg-[var(--mw-error-soft)] border-[color:var(--mw-line)]' : 'bg-[var(--mw-green-50)] border-[color:var(--mw-green-700)]'}`}>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${totalAmount - deposit < 0 ? 'text-[color:var(--mw-error-ink)]' : 'text-[color:var(--mw-green-700)]'}`}>예상 현지 지불 잔금</span>
                            {totalAmount - deposit < 0 && (
                                <span className="text-[9px] text-[color:var(--mw-error-ink)] font-bold mt-0.5 animate-pulse">! 예약금이 총액을 초과했습니다</span>
                            )}
                        </div>
                        <span className={`text-base font-extrabold ${totalAmount - deposit < 0 ? 'text-[color:var(--mw-error-ink)]' : 'text-[color:var(--mw-green-700)]'}`}>
                            {typeof totalAmount === 'number' && typeof deposit === 'number' && !isNaN(totalAmount) && !isNaN(deposit) ? (totalAmount - deposit).toLocaleString() : 0}원
                        </span>
                    </div>
                </div>

                <div className="p-5 border-t border-[color:var(--mw-line)] bg-[var(--mw-gray-50)] flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[color:var(--mw-muted)] font-bold hover:bg-[var(--mw-gray-200)] rounded-lg text-sm"
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
                        className="px-4 py-2 bg-[var(--mw-primary)] hover:bg-[var(--mw-primary-hover)] text-[color:var(--mw-accent)] font-bold rounded-lg text-sm shadow-lg "
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
    onUpdateQuote: (id: string, updates: Partial<QuoteRequest>) => Promise<boolean | void>;
    initialEditorOpen?: boolean;
}> = ({ request, onClose, onSendEstimate, onOpenConvert, onUpdateQuote, initialEditorOpen }) => {
    const [estimateUrl, setEstimateUrl] = useState(request?.estimateUrl || '');
    const [adminNote, setAdminNote] = useState(request?.adminNote || '');
    const [copiedEstimateUrl, setCopiedEstimateUrl] = useState(false);
    const [previewSaving, setPreviewSaving] = useState(false);

    // 맞춤 일정표 — 고객 견적 페이지에 함께 보낼 일정표 템플릿
    const [templatesList, setTemplatesList] = useState<any[]>([]);
    const [itineraryTemplateId, setItineraryTemplateId] = useState<string>(request?.itineraryTemplateId || request?.itinerary_template_id || '');
    const [quoteDocumentContent, setQuoteDocumentContent] = useState<ReservationDocContent | null>(
        normalizeDocumentContent(request?.documentContent || request?.document_content)
    );
    // 「견적 직접 만들기」로 방금 만든 견적이면 편집기를 바로 연다
    const [docEditorOpen, setDocEditorOpen] = useState(!!initialEditorOpen);
    const [activeSec, setActiveSec] = useState<'info' | 'quote'>('info');
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const scrollToSec = (id: 'info' | 'quote') => {
        setActiveSec(id);
        bodyRef.current?.querySelector(`#qsec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    useEffect(() => {
        api.itineraryTemplates.list().then((d: any) => { if (Array.isArray(d)) setTemplatesList(d); }).catch(() => {});
    }, []);

    // --- Added for Centralized UI Integration ---
    const [priceDetail, setPriceDetail] = useState({
        totalAmount: request?.confirmed_price || ((parseDocumentPricePerPerson(normalizeDocumentContent(request?.documentContent || request?.document_content)) || 0) * parsePeopleCount(request?.headcount)),
        deposit: request?.deposit || 0,
        depositStatus: request?.deposit_status || 'unpaid',
        balanceStatus: request?.balance_status || 'unpaid',
        pricePerPerson: parseDocumentPricePerPerson(normalizeDocumentContent(request?.documentContent || request?.document_content)) || 0,
        peopleCount: parsePeopleCount(request?.headcount),
        manualTotal: Boolean(request?.confirmed_price)
    });

    // Confirmed Dates
    // 견적 관리 화면은 camelCase, 통합 예약관리는 snake_case 로 넘겨준다
    const [confirmedStartDate, setConfirmedStartDate] = useState(String(request?.confirmed_start_date || (request as any)?.confirmedStartDate || '').slice(0, 10));
    const [confirmedEndDate, setConfirmedEndDate] = useState(String(request?.confirmed_end_date || (request as any)?.confirmedEndDate || '').slice(0, 10));

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
            const content = normalizeDocumentContent(request.documentContent || request.document_content);
            const peopleCount = parsePeopleCount(request.headcount);
            const pricePerPerson = parseDocumentPricePerPerson(content) || (request.confirmed_price && peopleCount ? Math.round(request.confirmed_price / peopleCount) : 0);
            const calculatedTotal = pricePerPerson * peopleCount;
            // Reset priceDetail when request changes
            setPriceDetail({
                totalAmount: request.confirmed_price || calculatedTotal,
                deposit: request.deposit || 0,
                depositStatus: request.deposit_status || 'unpaid',
                balanceStatus: request.balance_status || 'unpaid',
                pricePerPerson,
                peopleCount,
                manualTotal: Boolean(request.confirmed_price && calculatedTotal && request.confirmed_price !== calculatedTotal)
            });
            setConfirmedStartDate(request.confirmed_start_date || '');
            setConfirmedEndDate(request.confirmed_end_date || '');
            setItineraryTemplateId(request.itineraryTemplateId || request.itinerary_template_id || '');
            setQuoteDocumentContent(content);
        }
    }, [request]);

    const handleSaveEdit = async () => {
        if (!request) return;

        const saved = await onUpdateQuote(request.id, {
            ...editForm
        } as any);
        if (saved !== false) setIsEditing(false);
    };

    if (!request) return null;

    // 문서 편집기 (견적용) — 고객 데이터 자동 채움, document_content 저장
    const quotePeople = priceDetail.peopleCount || parsePeopleCount(request.headcount);
    const quoteHeadcount = quotePeople === parsePeopleCount(request.headcount)
        ? request.headcount
        : `${quotePeople}名`;
    const quoteBalance = Math.max(0, (priceDetail.totalAmount || 0) - (priceDetail.deposit || 0));
    const updatePricePerPerson = (nextPricePerPerson: number) => {
        setPriceDetail(prev => {
            const peopleCount = prev.peopleCount || 1;
            const nextTotal = nextPricePerPerson * peopleCount;
            return {
                ...prev,
                pricePerPerson: nextPricePerPerson,
                totalAmount: prev.manualTotal ? prev.totalAmount : nextTotal,
                deposit: prev.deposit ? prev.deposit : Math.floor(nextTotal * 0.1),
            };
        });
    };
    const updatePeopleCount = (nextPeopleCount: number) => {
        setPriceDetail(prev => {
            const peopleCount = Math.max(1, nextPeopleCount || 1);
            const nextTotal = (prev.pricePerPerson || 0) * peopleCount;
            return {
                ...prev,
                peopleCount,
                totalAmount: prev.manualTotal ? prev.totalAmount : nextTotal,
                deposit: prev.deposit ? prev.deposit : Math.floor(nextTotal * 0.1),
            };
        });
    };
    const updateManualTotal = (manualTotal: boolean) => {
        setPriceDetail(prev => ({
            ...prev,
            manualTotal,
            totalAmount: manualTotal ? prev.totalAmount : (prev.pricePerPerson || 0) * (prev.peopleCount || 1),
        }));
    };
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
        headcount: quoteHeadcount || '',
        name: request.name,
        tripType: request.destination,
        totalAmount: priceDetail.totalAmount || undefined,
        deposit: priceDetail.deposit || undefined,
        localAmount: priceDetail.totalAmount ? quoteBalance : undefined,
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
            return syncDocumentPrice({ name: dc.name || '', description: dc.description || '', days: dc.days || [], documentSettings: mergeDocumentSettings(dc.documentSettings) }, priceDetail.pricePerPerson);
        }
        return syncDocumentPrice(templateToDocumentContent(itineraryTemplateId), priceDetail.pricePerPerson);
    })();
    const saveQuoteDoc = async (content: ReservationDocContent, dates?: { startDate: string; endDate: string }, pricing?: DocPricing) => {
        // 간단 편집기 — 고객정보(인원·날짜)·금액을 편집기에서 바로 받아 견적에 그대로 저장
        if (pricing) {
            const headcount = pricing.people === parsePeopleCount(request.headcount) ? request.headcount : `大人${pricing.people}名`;
            setPriceDetail(prev => ({ ...prev, pricePerPerson: pricing.pricePerPerson, peopleCount: pricing.people, totalAmount: pricing.total, deposit: pricing.deposit, manualTotal: false }));
            if (dates) { setConfirmedStartDate(dates.startDate); setConfirmedEndDate(dates.endDate); }
            setQuoteDocumentContent(content);
            const saved = await onUpdateQuote(request.id, {
                itineraryTemplateId,
                documentContent: content,
                headcount,
                confirmed_price: pricing.total,
                deposit: pricing.deposit,
                ...(dates ? { confirmed_start_date: dates.startDate || null, confirmed_end_date: dates.endDate || null } : {}),
            } as any);
            if (saved === false) throw new Error('견적 저장에 실패했습니다.');
            return;
        }
        const incomingPricePerPerson = parseDocumentPricePerPerson(content);
        const syncedPricePerPerson = incomingPricePerPerson || priceDetail.pricePerPerson;
        const syncedContent = syncDocumentPrice(content, syncedPricePerPerson) || content;
        const peopleCount = priceDetail.peopleCount || quotePeople || 1;
        const nextTotal = incomingPricePerPerson > 0 && !priceDetail.manualTotal
            ? incomingPricePerPerson * peopleCount
            : priceDetail.totalAmount;
        const nextDeposit = priceDetail.deposit || Math.floor(nextTotal * 0.1);
        if (incomingPricePerPerson > 0 && incomingPricePerPerson !== priceDetail.pricePerPerson) {
            setPriceDetail(prev => ({
                ...prev,
                pricePerPerson: incomingPricePerPerson,
                totalAmount: nextTotal,
                deposit: nextDeposit,
            }));
        }
        setQuoteDocumentContent(syncedContent);
        const saved = await onUpdateQuote(request.id, {
            itineraryTemplateId,
            documentContent: syncedContent,
            confirmed_price: nextTotal,
            deposit: nextDeposit,
        } as any);
        if (saved === false) return;
        // 저장 검증 — 서버에 실제로 일정이 남았는지 재조회로 확인.
        // 세션 만료(401)·마이그레이션 누락 등으로 조용히 실패하면 고객 미리보기에
        // 「準備中」만 떠서 원인을 알 수 없으므로, 여기서 바로 드러낸다.
        try {
            const fresh: any = await api.quotes.get(request.id);
            const savedDays = fresh?.documentContent?.days ?? fresh?.itinerary?.days;
            if (!Array.isArray(savedDays) || savedDays.length === 0) {
                alert('⚠️ 일정이 서버에 저장되지 않았습니다.\n\n관리자 로그인이 풀렸을 수 있습니다 — 로그인 상태를 확인하고 다시 저장해 주세요.\n반복되면 /api/migrate-db 실행이 필요할 수 있습니다.');
            }
        } catch { /* 재조회 실패는 무시 — 저장 실패는 위 update 에러로 이미 드러남 */ }
    };
    const saveQuoteBasics = async (): Promise<boolean> => {
        const syncedContent = syncDocumentPrice(quoteDocumentContent, priceDetail.pricePerPerson);
        if (syncedContent) setQuoteDocumentContent(syncedContent);
        const saved = await onUpdateQuote(request.id, {
            headcount: quoteHeadcount,
            confirmed_price: priceDetail.totalAmount,
            deposit: priceDetail.deposit,
            confirmed_start_date: confirmedStartDate,
            confirmed_end_date: confirmedEndDate,
            itineraryTemplateId,
            documentContent: syncedContent,
        } as any);
        return saved !== false;
    };
    const handleTemplateChange = async (templateId: string) => {
        setItineraryTemplateId(templateId);
        const content = templateId ? templateToDocumentContent(templateId) : null;
        const incomingPricePerPerson = parseDocumentPricePerPerson(content);
        const syncedContent = syncDocumentPrice(content, incomingPricePerPerson || priceDetail.pricePerPerson);
        if (incomingPricePerPerson > 0) {
            const nextTotal = incomingPricePerPerson * (priceDetail.peopleCount || quotePeople || 1);
            setPriceDetail(prev => ({
                ...prev,
                pricePerPerson: incomingPricePerPerson,
                totalAmount: prev.manualTotal ? prev.totalAmount : nextTotal,
                deposit: prev.deposit ? prev.deposit : Math.floor(nextTotal * 0.1),
            }));
        }
        setQuoteDocumentContent(syncedContent);
        const saved = await onUpdateQuote(request.id, {
            itineraryTemplateId: templateId,
            documentContent: syncedContent,
        } as any);
        if (saved === false) return;
    };

    const quoteStatusMeta: Record<string, { label: string; tone: string }> = {
        new: { label: '신규 요청', tone: 'bg-[var(--mw-gray-100)] text-[color:var(--mw-gray-800)] border-[color:var(--mw-line)]' },
        processing: { label: '견적 작성 중', tone: 'bg-[var(--mw-gray-100)] text-[color:var(--mw-gray-800)] border-[color:var(--mw-line)]' },
        answered: { label: '견적 발송 완료', tone: 'bg-[var(--mw-gray-100)] text-[color:var(--mw-gray-800)] border-[color:var(--mw-line)]' },
        reservation_requested: { label: '예약 요청', tone: 'bg-[var(--mw-gray-100)] text-[color:var(--mw-gray-800)] border-[color:var(--mw-line)]' },
        converted: { label: '예약 전환 완료', tone: 'bg-[var(--mw-gray-100)] text-[color:var(--mw-muted)] border-[color:var(--mw-line)]' },
        completed: { label: '완료', tone: 'bg-[var(--mw-green-50)] text-[color:var(--mw-green-700)] border-[color:var(--mw-green-700)]' },
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
    const hasQuoteItinerary = (docInitialContent?.days?.length ?? 0) > 0;
    const hasQuoteSchedule = hasQuoteItinerary || Boolean(confirmedStartDate && confirmedEndDate);
    const effectivePricePerPerson = priceDetail.pricePerPerson || parseDocumentPricePerPerson(docInitialContent);
    const effectiveTotalAmount = priceDetail.totalAmount || (effectivePricePerPerson * (priceDetail.peopleCount || quotePeople || 1));
    const effectiveDeposit = priceDetail.deposit || (effectiveTotalAmount > 0 ? Math.floor(effectiveTotalAmount * 0.1) : 0);
    const missingSendItems = [
        !request.destination || !request.headcount || !request.period ? '여행 조건' : '',
        !hasQuoteSchedule ? '제안 일정 또는 시작/종료일' : '',
        effectiveTotalAmount <= 0 ? '총 견적금액' : '',
        effectiveTotalAmount < effectiveDeposit ? '예약금이 총액보다 작거나 같아야 함' : '',
    ].filter(Boolean);
    const checklistItems = [
        { label: '여행 조건 확인', done: Boolean(request.destination && request.headcount && request.period) },
        { label: '제안 일정 확인', done: hasQuoteSchedule },
        { label: '금액/예약금 입력', done: effectiveTotalAmount > 0 && effectiveTotalAmount >= effectiveDeposit },
        { label: '견적서 링크', done: Boolean(estimateUrl), optional: true },
        { label: '고객 안내문', done: Boolean(adminNote.trim()), optional: true },
    ];
    // 발송 필수 = 여행 조건 + 제안 일정(문서 일정 또는 날짜) + 금액. 견적서 링크/안내문은 선택.
    const canSendEstimate = missingSendItems.length === 0;
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

    const handleSend = async () => {
        if (!canSendEstimate) {
            alert(`견적 발송 전에 아래 항목을 확인해 주세요.\n\n- ${missingSendItems.join('\n- ')}`);
            scrollToSec('quote');
            return;
        }
        const normalizedPriceDetail = {
            ...priceDetail,
            pricePerPerson: effectivePricePerPerson,
            totalAmount: effectiveTotalAmount,
            deposit: effectiveDeposit,
        };
        const syncedContent = syncDocumentPrice(quoteDocumentContent, normalizedPriceDetail.pricePerPerson);
        if (syncedContent) setQuoteDocumentContent(syncedContent);
        const saved = await onUpdateQuote(request.id, {
            headcount: quoteHeadcount,
            confirmed_price: normalizedPriceDetail.totalAmount,
            deposit: normalizedPriceDetail.deposit,
            confirmed_start_date: confirmedStartDate,
            confirmed_end_date: confirmedEndDate,
            itineraryTemplateId,
            documentContent: syncedContent,
        } as any);
        if (saved === false) return;
        onSendEstimate(estimateUrl, adminNote, normalizedPriceDetail, confirmedStartDate, confirmedEndDate, itineraryTemplateId);
    };
    const estimatePageUrl = `${window.location.origin}/estimate/${request.id}`;
    const quoteSent = request.status === 'answered';
    const handlePreview = async () => {
        if (previewSaving) return;
        if (!quoteSent && !hasQuoteItinerary) {
            const shouldEdit = window.confirm('일정표가 아직 없어 고객 화면에는 「準備中」로 표시됩니다.\n문서 편집기를 열어 일정을 만들까요?\n\n(취소를 누르면 현재 금액을 저장한 뒤 미리보기를 엽니다)');
            if (shouldEdit) {
                setDocEditorOpen(true);
                return;
            }
        }

        // 팝업 차단을 피하려고 사용자 클릭 시점에 창을 먼저 만들고,
        // 현재 입력값 저장이 끝난 뒤 최신 고객 페이지로 이동시킨다.
        const previewWindow = window.open('about:blank', '_blank');
        if (previewWindow) {
            previewWindow.document.title = '견적 미리보기 준비 중';
            previewWindow.document.body.textContent = '최신 견적 내용을 저장하는 중입니다…';
        }

        setPreviewSaving(true);
        try {
            const saved = await saveQuoteBasics();
            if (!saved) {
                previewWindow?.close();
                return;
            }
            if (!previewWindow) {
                alert('견적 내용은 저장되었습니다. 브라우저에서 팝업을 허용한 뒤 미리보기를 다시 눌러 주세요.');
                return;
            }
            previewWindow.location.replace(`${estimatePageUrl}?preview=${Date.now()}`);
        } finally {
            setPreviewSaving(false);
        }
    };
    const quoteDocStatusText = quoteSent
        ? '발송 완료 · 재발송 가능'
        : hasQuoteItinerary && !canSendEstimate
            ? `일정 작성됨 · ${missingSendItems[0] || '확인 필요'}`
        : canSendEstimate
            ? hasQuoteItinerary ? '작성됨 · 발송 대기' : '금액만 발송 가능'
            : '확정 일정·금액 입력 필요';
    const copyEstimatePageUrl = async () => {
        await navigator.clipboard.writeText(estimatePageUrl);
        setCopiedEstimateUrl(true);
        setTimeout(() => setCopiedEstimateUrl(false), 1500);
    };
    const copyEstimateCustomerMessage = async () => {
        const message = [
            `${request.name}様`,
            '',
            'お見積りのご用意ができました。',
            '下記リンクより日程・料金をご確認ください。',
            estimatePageUrl,
            '',
            '内容に問題がなければ、ページ内の予約相談へお進みください。',
        ].join('\n');
        await navigator.clipboard.writeText(message);
        setCopiedEstimateUrl(true);
        setTimeout(() => setCopiedEstimateUrl(false), 1500);
    };
    const statusTone: Record<string, string> = Object.fromEntries(Object.entries(STATUS_META).map(([key, meta]) => [key, toneClass(meta.tone)]));
    const nextAction = (() => {
        if (request.status === 'converted' || request.status === 'completed') return null;
        if (request.status === 'reservation_requested') return { label: '예약으로 전환', desc: '고객이 예약을 요청했습니다 — 확정 내용으로 전환하세요.', icon: 'sync_alt', onClick: onOpenConvert };
        if (!canSendEstimate) return { label: '견적 작성 · 누락 항목 확인', desc: `${missingSendItems[0] || '필수 항목'} 확인이 필요합니다.`, icon: 'edit_note', onClick: () => scrollToSec('quote') };
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
                    <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={onClose}><Icon name="close" /></button>
                </div>

                {/* NEXT — 견적 워크플로의 다음 할 일 */}
                <div className={`next-bar${nextAction ? '' : ' all-done'}`}>
                    <span className="nb-label">{nextAction ? '다음 할 일' : '처리 완료'}</span>
                    {nextAction ? (
                        <>
                            <button className="btn btn-sm btn-ink" onClick={nextAction.onClick}>
                                <Icon name={nextAction.icon} style={{ fontSize: 16 }} />{nextAction.label}
                            </button>
                            <span className="nb-desc">{nextAction.desc}</span>
                        </>
                    ) : (
                        <span className="row" style={{ gap: 6, fontSize: 13, fontWeight: 800, color: 'var(--mrt-green)' }}>
                            <Icon name="check_circle" style={{ fontSize: 17 }} />예약 전환까지 완료된 견적입니다
                        </span>
                    )}
                    <span className="step-dots">
                        {workflowSteps.map((s, i) => <span key={s.key} className={`sd${i < currentStepIndex ? ' on' : ''}`} title={s.label} />)}
                        <span className="sd-n">{currentStepIndex}/{workflowSteps.length}</span>
                    </span>
                </div>

                {/* 섹션 앵커 */}
                <div className="tc-anchors">
                    {([['info', '요청 정보'], ['quote', '견적 제안서 작성']] as const).map(([id, label]) => (
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
                                <div className="card-head"><Icon name="person" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }} /><h2>신청자 정보</h2></div>
                                <div className="card-pad" style={{ paddingTop: 12 }}>
                                    <div className="kv"><span>이름</span><b>{request.name}</b></div>
                                    <div className="kv"><span>연락처</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{request.phone || '—'}</b></div>
                                    <div className="kv" style={{ borderBottom: 'none' }}><span>이메일</span><b style={{ textAlign: 'right' }}>{request.email || '—'}</b></div>
                                </div>
                            </div>
                            <div className="card">
                                <div className="card-head"><Icon name="explore" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }} /><h2>여행 조건</h2>
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
                            <div className="card-head"><Icon name="format_list_bulleted" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }} /><h2>상세 요청</h2></div>
                            <div className="card-pad" style={{ paddingTop: 12 }}>
                                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {(request.travelTypes || []).map(t => <span key={t} className="badge b-blue">{t}</span>)}
                                    {(request.accommodations || []).map(t => <span key={t} className="badge b-gray">{t}</span>)}
                                </div>
                                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{request.additionalRequest || '추가 요청사항이 없습니다.'}</p>
                            </div>
                        </div>
                        </div>
                    </section>

                    <section id="qsec-quote" style={{ scrollMarginTop: 8 }}>
                        <div className="card">
                            <div className="card-head"><Icon name="edit_note" style={{ fontSize: 17, color: 'var(--mrt-gray-600)' }} /><h2>견적 제안서 작성 — 일정·금액</h2>
                                <div className="spacer" style={{ flex: 1 }} />
                                <button className="btn btn-sm btn-ghost" onClick={saveQuoteBasics}>
                                    <Icon name="save" style={{ fontSize: 16 }} />일정·금액 저장
                                </button>
                            </div>
                            <div className="card-pad" style={{ paddingTop: 12 }}>
                                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <label className="field" style={{ marginBottom: 0 }}><span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: 5 }}>시작일</span>
                                        <input type="date" className="inp" value={confirmedStartDate} onChange={(e) => setConfirmedStartDate(e.target.value)} /></label>
                                    <label className="field" style={{ marginBottom: 0 }}><span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: 5 }}>종료일</span>
                                        <input type="date" className="inp" value={confirmedEndDate} onChange={(e) => setConfirmedEndDate(e.target.value)} /></label>
                                </div>
                                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                    <div className="pay-cell">
                                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>1인 기준가</span></div>
                                        <div className="row" style={{ gap: 4 }}>
                                            <input type="text" className="inp" style={{ textAlign: 'right', fontWeight: 800 }} value={formatNumber(priceDetail.pricePerPerson)} placeholder="0"
                                                onChange={(e) => updatePricePerPerson(unformatNumber(e.target.value))} />
                                            <span className="cell-muted" style={{ fontSize: 12, flex: 'none' }}>엔</span>
                                        </div>
                                    </div>
                                    <div className="pay-cell">
                                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>인원</span></div>
                                        <div className="row" style={{ gap: 4 }}>
                                            <input type="number" min={1} className="inp" style={{ textAlign: 'right', fontWeight: 800 }} value={priceDetail.peopleCount}
                                                onChange={(e) => updatePeopleCount(Number(e.target.value))} />
                                            <span className="cell-muted" style={{ fontSize: 12, flex: 'none' }}>명</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                    <div className="pay-cell">
                                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>총 견적금액</span>
                                            <label className="row" style={{ gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)' }}>
                                                <input type="checkbox" checked={priceDetail.manualTotal} onChange={(e) => updateManualTotal(e.target.checked)} />
                                                직접 입력
                                            </label>
                                        </div>
                                        <div className="row" style={{ gap: 4 }}>
                                            <input type="text" className="inp" style={{ textAlign: 'right', fontWeight: 800 }} value={formatNumber(priceDetail.totalAmount)} placeholder="0"
                                                disabled={!priceDetail.manualTotal}
                                                onChange={(e) => setPriceDetail(prev => ({ ...prev, totalAmount: unformatNumber(e.target.value) }))} />
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
                                    <b className="cell-price" style={{ fontSize: 15 }}>{quoteBalance.toLocaleString()}엔</b>
                                </div>
                            </div>
                        </div>
                    </section>

                    </div>
                </div>

                {/* 우측 액션 레일 — 확정 문서 발송과 같은 문서 단위 흐름 */}
                <aside className="reservation-action-rail">
                    <div className="action-rail-head">
                        <div>
                            <span className="action-rail-eyebrow">DOCUMENTS</span>
                            <h2>문서와 고객 발송</h2>
                        </div>
                        <span className={`badge ${quoteSent ? 'b-green' : canSendEstimate ? 'b-blue' : 'b-amber'}`}>
                            {quoteSent ? '1/1 완료' : '0/1 대기'}
                        </span>
                    </div>

                    <div className="action-rail-stack">
                        <section className="action-doc active">
                            <button type="button" className="action-doc-title">
                                <span className="action-doc-icon tint-blue"><Icon name="request_quote" /></span>
                                <span>
                                    <b>견적 제안서</b>
                                    <small>{quoteDocStatusText}</small>
                                </span>
                                <Icon name={quoteSent ? 'check_circle' : 'chevron_right'} />
                            </button>
                            {!quoteSent && (
                                <select className="inp" value={itineraryTemplateId} onChange={(e) => handleTemplateChange(e.target.value)}>
                                    <option value="">일정표 없음 (비용만 안내)</option>
                                    {templatesList.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                                </select>
                            )}
                            <div className="action-doc-buttons">
                                {!quoteSent ? (
                                    <>
                                        <button className="btn btn-sm btn-blue" onClick={handleSend} title={!canSendEstimate ? `확인 필요: ${missingSendItems.join(', ')}` : undefined}>
                                            <Icon name="send" style={{ fontSize: 16 }} />고객에게 발송
                                        </button>
                                        <button className="btn btn-sm btn-ghost" onClick={() => setDocEditorOpen(true)}>
                                            <Icon name="edit_document" style={{ fontSize: 16 }} />{request.documentContent || request.document_content ? '편집' : '견적서 만들기'}
                                        </button>
                                        <button className="btn btn-sm btn-ghost" onClick={handlePreview} disabled={previewSaving}>
                                            <Icon name="visibility" style={{ fontSize: 16 }} />{previewSaving ? '저장 중…' : '미리보기'}
                                        </button>
                                        <button className="btn btn-sm btn-ghost" onClick={copyEstimatePageUrl}>
                                            <Icon name={copiedEstimateUrl ? 'check' : 'content_copy'} style={{ fontSize: 16 }} />{copiedEstimateUrl ? '복사됨' : '링크'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn btn-sm btn-blue" onClick={handlePreview} disabled={previewSaving}>
                                            <Icon name="visibility" style={{ fontSize: 16 }} />{previewSaving ? '저장 중…' : '미리보기'}
                                        </button>
                                        <button className="btn btn-sm btn-ghost" onClick={() => setDocEditorOpen(true)}>
                                            <Icon name="edit_document" style={{ fontSize: 16 }} />편집
                                        </button>
                                        <button className="btn btn-sm btn-ghost" onClick={copyEstimatePageUrl}>
                                            <Icon name={copiedEstimateUrl ? 'check' : 'content_copy'} style={{ fontSize: 16 }} />{copiedEstimateUrl ? '복사됨' : '링크'}
                                        </button>
                                        <button className="btn btn-sm btn-ghost" onClick={handleSend}>
                                            <Icon name="forward_to_inbox" style={{ fontSize: 16 }} />재발송
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* 사이트 예약 요청뿐 아니라 LINE·메일로 확정한 경우에도 바로 전환할 수 있게 발송된 견적에도 표시 */}
                        {(request.status === 'reservation_requested' || request.status === 'answered') && (
                            <button className="btn btn-blue action-send-all" onClick={onOpenConvert} title="견적서 일정·사진·금액을 그대로 옮겨 예약과 확정일정표를 만듭니다">
                                <Icon name="sync_alt" style={{ fontSize: 17 }} />예약으로 전환
                            </button>
                        )}
                    </div>

                    <div className="action-rail-group">
                        <h3>고객 공유</h3>
                        <button className="action-link" onClick={copyEstimateCustomerMessage}>
                            <Icon name="content_copy" />
                            <span><b>고객 안내문 복사</b><small>견적 페이지 링크와 확인 안내를 함께 복사합니다.</small></span>
                            <Icon name="chevron_right" />
                        </button>
                        <button className="action-link" onClick={copyEstimatePageUrl}>
                            <Icon name="link" />
                            <span><b>고객 페이지 링크</b><small>고객이 견적 내용과 일정을 확인하는 페이지입니다.</small></span>
                            <Icon name="chevron_right" />
                        </button>
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
                                <Icon name={item.done ? 'check_circle' : 'radio_button_unchecked'} style={{ fontSize: 17, color: item.done ? 'var(--mrt-green)' : 'var(--mrt-gray-300)' }} />
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
                previewMode="quote"
                // 확정 날짜가 없으면 고객이 적은 희망 일정(예: 2027-08-01 ~ 2027-08-04)으로
                tourStartDate={confirmedStartDate || periodDates(request.period).start}
                tourEndDate={confirmedEndDate || (confirmedStartDate ? '' : periodDates(request.period).end)}
                previewUrl={estimatePageUrl}
                aiDraftQuoteId={request.id}
            />

    </>
    );
};
