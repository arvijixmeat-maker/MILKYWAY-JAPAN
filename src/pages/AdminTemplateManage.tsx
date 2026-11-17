import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ReservationDocumentEditor, type ReservationDocContent } from '../components/admin/ReservationDocumentEditor';
import { Icon } from '../components/admin/console/Icon';
import { api } from '../lib/api';
import { CONTRACT_CANCELLATION_ROWS, DEPOSIT_PAYMENT_METHOD, resolveCancellationRows, resolveDepositMethod } from '../constants/company';
import { uploadImage } from '../utils/upload';
import type { TouristSpot } from '../types/touristSpot';
import type { Hotel } from '../types/hotel';
import mongoliaHero from '../assets/login_bg_3.jpg';
import { defaultQuoteDocSettings, mergeQuoteDocSettings, type QuoteDocSettings } from '../components/trip-doc/tripDocModel';

// ─── Types ───────────────────────────────────────────────
export type ActivityType = 'pickup' | 'transport' | 'meal' | 'sightseeing' | 'activity' | 'checkin' | 'free' | 'other';
export interface Activity { time?: string; type?: ActivityType; title: string; description: string; images?: string[]; }
export interface TemplateDay {
    day: number;
    date?: string;
    title: string;
    region?: string;
    summary?: string;
    /** 이동 시간(목안) — 새 견적서 「移動 約4時間」 표시 */
    move?: string;
    activities: Activity[];
    meals?: { breakfast?: string; lunch?: string; dinner?: string };
    accommodation?: {
        id?: string;
        name: string;
        type?: string;
        location?: string;
        images?: string[];
        description?: string;
    } | null;
}
export interface DocumentSettings {
    overview: {
        subtitle: string;
        heroTagline: string;
        intro: string;
        included: { icon: string; label: string }[];
        includedText: string;
        excludedText: string;
        pricePerPerson: string;
        paymentNote: string;
    };
    contract: {
        intro: string;
        paymentMethod: string;
        paymentDeadline: string;
        includedText: string;
        excludedText: string;
        cancellationRows: { period: string; fee: string }[];
        signatureNote: string;
    };
    detail: {
        title: string;
        note: string;
        footerBadges: string[];
    };
    guide: {
        notices: { title: string; body: string }[];
        conditions: string;
        paymentInfo: string;
        guideName: string;
        guidePhone: string;
        accommodationInfo: string;
        emergencyPhone: string;
        emergencyEmail: string;
        closingMessage: string;
        qrLabel: string;
    };
    /** 새 견적서·확정일정표 디자인 전용 항목 (표지 문구·유효기한·항공편·특별요리 등) */
    quoteDoc: QuoteDocSettings;
}
interface ItineraryTemplate { id: string; name: string; description: string; days: TemplateDay[]; createdAt: string; documentSettings: DocumentSettings; }

const DOC_SETTINGS_MARKER = '\n\n__MILKYWAY_DOCUMENT_SETTINGS__=';

export const defaultDocumentSettings = (): DocumentSettings => ({
    overview: {
        subtitle: '銀河の下で、大自然と文化を体験する特別な旅へ',
        heroTagline: '伝統衣装体験・乗馬体験・ラクダ体験・ゲル体験 すべて込み',
        intro: 'ご予約内容に基づき、旅行概要・日程・代金をまとめた確認用のご旅行日程表です。',
        included: [
            { icon: 'hiking', label: 'モンゴル伝統衣装体験' },
            { icon: 'pets', label: '乗馬体験' },
            { icon: 'local_taxi', label: '専用車・ドライバー' },
            { icon: 'hotel', label: '宿泊' },
            { icon: 'restaurant', label: '食事付き' },
            { icon: 'support_agent', label: '日本語ガイド' },
        ],
        includedText: '専用車・ドライバー\n宿泊（ホテル・ゲル）\n食事付き\n日本語ガイド\n伝統衣装・乗馬・ラクダ体験',
        excludedText: '国際航空券\n海外旅行保険\n個人的費用\n日程表に記載のない食事',
        pricePerPerson: '128000',
        paymentNote: '上記料金には、日程表に記載のサービスが含まれております。',
    },
    contract: {
        intro: '本旅行条件書および下記の旅行条件に基づき、募集型企画旅行契約を締結いたします。',
        paymentMethod: DEPOSIT_PAYMENT_METHOD,
        paymentDeadline: 'ご案内メールに記載の期日まで',
        includedText: '宿泊費、食事代、専用車、ドライバー、日本語ガイド、日程表記載の体験料金',
        excludedText: '国際航空券、海外旅行保険、個人的費用、日程表に記載のない食事',
        cancellationRows: CONTRACT_CANCELLATION_ROWS.map((row) => ({ ...row })),
        signatureNote: '上記内容を確認し、同意の上、本契約を締結いたします。',
    },
    detail: {
        title: 'ご旅行日程表（詳細）',
        note: '天候・交通状況により、スケジュールは変更となる場合がございます。',
        footerBadges: ['追加料金なしのすべて込みプラン', '日程調整可能', '貸切専用車で安心移動', '日本語ガイドが全日程サポート'],
    },
    guide: {
        notices: [
            { title: '服装について', body: '朝夕は冷え込む場合があるため、羽織れる上着をご用意ください。' },
            { title: '宿泊について', body: 'ホテルおよびゲル宿泊は、現地事情により同等クラスへ変更となる場合があります。' },
            { title: 'お食事について', body: 'アレルギーや食事制限がある場合は事前にお知らせください。' },
            { title: '持ち物について', body: 'パスポート、保険証券、常備薬、充電器などをご準備ください。' },
        ],
        conditions: '本旅行は、当社旅行条件書および旅行業約款に基づいて実施いたします。',
        paymentInfo: `お支払い方法：${DEPOSIT_PAYMENT_METHOD}\nお支払い期限：ご案内メールに記載の期日まで`,
        guideName: '',
        guidePhone: '',
        accommodationInfo: '',
        emergencyPhone: '+976-80-1234-5678',
        emergencyEmail: 'info@mongolryokou.com',
        closingMessage: 'モンゴルの大自然と文化を心ゆくまでお楽しみください。',
        qrLabel: 'お客様専用ページ',
    },
    quoteDoc: defaultQuoteDocSettings(),
});

/** 템플릿에 저장돼 있을 수 있는 옛 기본 문구(은행 송금 안내). */
const LEGACY_GUIDE_PAYMENT_INFO = 'お支払い方法：銀行振込\nお支払い期限：ご案内メールに記載の期日まで';

export const mergeDocumentSettings = (value: any): DocumentSettings => {
    const base = defaultDocumentSettings();
    if (!value || typeof value !== 'object') return base;
    // 예약금은 PayPal로만 받는다 — 예전에 저장된 계좌 안내(bankInfo)는 버리고, 옛 기본값 「銀行振込」는 PayPal로 바꾼다.
    const { bankInfo: _legacyBankInfo, ...savedContract } = (value.contract || {}) as Record<string, unknown>;
    void _legacyBankInfo;
    const savedGuide = { ...(value.guide || {}) };
    if (savedGuide.paymentInfo === LEGACY_GUIDE_PAYMENT_INFO) savedGuide.paymentInfo = base.guide.paymentInfo;
    return {
        overview: { ...base.overview, ...(value.overview || {}), included: Array.isArray(value.overview?.included) ? value.overview.included : base.overview.included },
        contract: {
            ...base.contract,
            ...savedContract,
            paymentMethod: resolveDepositMethod(savedContract.paymentMethod),
            cancellationRows: resolveCancellationRows(value.contract?.cancellationRows).map((row) => ({ ...row })),
        },
        detail: { ...base.detail, ...(value.detail || {}), footerBadges: Array.isArray(value.detail?.footerBadges) ? value.detail.footerBadges : base.detail.footerBadges },
        guide: { ...base.guide, ...savedGuide, notices: Array.isArray(value.guide?.notices) ? value.guide.notices : base.guide.notices },
        quoteDoc: mergeQuoteDocSettings(value.quoteDoc),
    };
};

export const decodeTemplateDescription = (raw = '') => {
    const [description, encoded] = raw.split(DOC_SETTINGS_MARKER);
    if (!encoded) return { description: raw, documentSettings: defaultDocumentSettings() };
    try {
        return { description, documentSettings: mergeDocumentSettings(JSON.parse(encoded)) };
    } catch {
        return { description, documentSettings: defaultDocumentSettings() };
    }
};

const encodeTemplateDescription = (description: string, documentSettings: DocumentSettings) =>
    `${description || ''}${DOC_SETTINGS_MARKER}${JSON.stringify(documentSettings)}`;

interface Guide {
    id: string; name: string; image: string; introduction: string;
    phone: string; languages: string[]; specialties: string[]; status: string; experienceYears: number;
}

interface Accommodation {
    id: string; name: string; images: string[]; description: string;
    type: string; location: string;
}

const LANGUAGES = ['한국어', '영어', '몽골어', '중국어', '일본어'];
const SPECIALTIES = ['고비사막', '홉스골', '테를지', '승마', '문화체험', '사진촬영'];
const ACCOM_TYPES = { '호텔': ['2성급 호텔', '3성급 호텔', '4성급 호텔', '5성급 호텔'], '게르': ['일반 게르', '고급 게르', '럭셔리 게르'], '게스트하우스': ['게스트하우스'] };

// ─── Tab: Itinerary Templates ────────────────────────────
const TemplatesTab: React.FC = () => {
    const [templates, setTemplates] = useState<ItineraryTemplate[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<ItineraryTemplate | null>(null);
    const [form, setForm] = useState<{ name: string; description: string; days: TemplateDay[]; documentSettings: DocumentSettings }>({
        name: '',
        description: '',
        days: [],
        documentSettings: defaultDocumentSettings(),
    });
    const [quickDays, setQuickDays] = useState(4);
    const [editorMode, setEditorMode] = useState<'itinerary' | 'documents'>('itinerary');
    const [spotPickerTarget, setSpotPickerTarget] = useState<{ d: number; a: number } | null>(null);
    const [hotelPickerTarget, setHotelPickerTarget] = useState<{ d: number; a: number } | null>(null);
    const [dayHotelTarget, setDayHotelTarget] = useState<number | null>(null);

    const load = async () => {
        try {
            const data = await api.itineraryTemplates.list();
            if (Array.isArray(data)) {
                setTemplates(data.map((t: any) => {
                    const decoded = decodeTemplateDescription(t.description || '');
                    return {
                        id: t.id,
                        name: t.name,
                        description: decoded.description,
                        documentSettings: decoded.documentSettings,
                        days: typeof t.days === 'string' ? JSON.parse(t.days || '[]') : (t.days || []),
                        createdAt: t.created_at || t.createdAt
                    };
                }));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ name: '', description: '', days: [], documentSettings: defaultDocumentSettings() }); setEditing(null); setQuickDays(4); setEditorMode('itinerary'); };

    const inferActivityType = (text: string): ActivityType => {
        const value = text.toLowerCase();
        if (/(공항|픽업|도착|미팅|arrival|airport)/i.test(value)) return 'pickup';
        if (/(이동|출발|전용차|차량|버스|transfer|drive)/i.test(value)) return 'transport';
        if (/(식사|조식|중식|석식|점심|저녁|아침|meal|lunch|dinner|breakfast)/i.test(value)) return 'meal';
        if (/(숙박|호텔|게르|체크인|hotel|stay|check[-\s]?in)/i.test(value)) return 'checkin';
        if (/(체험|승마|낙타|트레킹|공연|activity|experience)/i.test(value)) return 'activity';
        if (/(자유|휴식|free)/i.test(value)) return 'free';
        return 'sightseeing';
    };

    const createBlankDays = (days = quickDays) => {
        const count = Math.max(1, Math.min(14, days || 1));
        setForm(f => ({
            ...f,
            days: Array.from({ length: count }, (_, idx) => ({
                day: idx + 1,
                title: f.days[idx]?.title || '',
                date: f.days[idx]?.date || '',
                region: f.days[idx]?.region || '',
                summary: f.days[idx]?.summary || '',
                activities: f.days[idx]?.activities || [],
                meals: f.days[idx]?.meals || { breakfast: '', lunch: '', dinner: '' },
                accommodation: f.days[idx]?.accommodation || null,
            })),
        }));
    };

    // Day operations
    const addDay = () => setForm(f => ({ ...f, days: [...f.days, { day: f.days.length + 1, title: '', region: '', summary: '', activities: [], meals: {}, accommodation: null }] }));
    const removeDay = (idx: number) => setForm(f => ({ ...f, days: f.days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1 })) }));
    const updateDay = (idx: number, field: keyof TemplateDay, value: any) => setForm(f => { const d = [...f.days]; d[idx] = { ...d[idx], [field]: value }; return { ...f, days: d }; });
    const moveDay = (idx: number, dir: -1 | 1) => setForm(f => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= f.days.length) return f;
        const d = [...f.days];
        [d[idx], d[newIdx]] = [d[newIdx], d[idx]];
        return { ...f, days: d.map((x, i) => ({ ...x, day: i + 1 })) };
    });
    const duplicateDay = (idx: number) => setForm(f => {
        const src = f.days[idx];
        const copy = {
            ...src,
            meals: { ...(src.meals || {}) },
            accommodation: src.accommodation ? { ...src.accommodation, images: [...(src.accommodation.images || [])] } : null,
            activities: src.activities.map(a => ({ ...a, images: [...(a.images || [])] })),
        };
        const d = [...f.days.slice(0, idx + 1), copy, ...f.days.slice(idx + 1)];
        return { ...f, days: d.map((x, i) => ({ ...x, day: i + 1 })) };
    });

    // Activity operations
    const addActivity = (dayIdx: number) => setForm(f => { const d = [...f.days]; d[dayIdx].activities = [...d[dayIdx].activities, { time: '', type: 'sightseeing', title: '', description: '' }]; return { ...f, days: d }; });
    // 유형을 지정해 빈 항목 추가 (이동/식사/직접입력 버튼용)
    const addActivityTyped = (dayIdx: number, type: ActivityType) => setForm(f => {
        const d = [...f.days];
        d[dayIdx] = { ...d[dayIdx], activities: [...d[dayIdx].activities, { time: '', type, title: '', description: '' }] };
        return { ...f, days: d };
    });
    // 관광지 마스터에서 선택 → 상세 설명을 채움. 직접 쓴 제목은 보존(비어 있을 때만 마스터명 사용)
    const fillItemFromSpot = (d: number, a: number, spot: TouristSpot) => setForm(f => {
        const desc = [spot.description, spot.address].filter(Boolean).join('\n\n');
        const days = [...f.days];
        const acts = [...days[d].activities];
        const cur = acts[a];
        const keepTitle = (cur.title || '').trim().length > 0;
        acts[a] = {
            ...cur,
            title: keepTitle ? cur.title : spot.name_kr,
            description: desc || cur.description,
            type: keepTitle ? cur.type : inferActivityType(`${spot.name_kr} ${desc}`),
            images: (spot.images && spot.images.length > 0) ? [...spot.images] : cur.images,
        };
        days[d] = { ...days[d], activities: acts };
        return { ...f, days };
    });
    // 호텔 마스터에서 선택 → 상세 설명을 채움. 직접 쓴 제목은 보존(비어 있을 때만 호텔명 사용)
    const fillItemFromHotel = (d: number, a: number, hotel: Hotel) => setForm(f => {
        const desc = [hotel.description, hotel.address].filter(Boolean).join('\n\n');
        const days = [...f.days];
        const acts = [...days[d].activities];
        const cur = acts[a];
        const keepTitle = (cur.title || '').trim().length > 0;
        acts[a] = {
            ...cur,
            title: keepTitle ? cur.title : hotel.name_kr,
            description: desc || cur.description || '宿泊',
            type: keepTitle ? cur.type : 'checkin',
            images: (hotel.images && hotel.images.length > 0) ? [...hotel.images] : cur.images,
        };
        days[d] = { ...days[d], activities: acts };
        return { ...f, days };
    });
    const fillDayFromHotel = (d: number, hotel: Hotel) => setForm(f => {
        const days = [...f.days];
        days[d] = {
            ...days[d],
            accommodation: {
                id: hotel.id,
                name: hotel.name_kr,
                type: hotel.star_rating ? `${hotel.star_rating}성급 호텔` : undefined,
                location: hotel.address,
                images: [...(hotel.images || [])],
                description: hotel.description || '',
            },
        };
        return { ...f, days };
    });
    const removeActivity = (dayIdx: number, actIdx: number) => setForm(f => { const d = [...f.days]; d[dayIdx].activities = d[dayIdx].activities.filter((_, i) => i !== actIdx); return { ...f, days: d }; });
    const removeActivityImage = (dayIdx: number, actIdx: number, imgIdx: number) => setForm(f => {
        const d = [...f.days];
        const acts = [...d[dayIdx].activities];
        acts[actIdx] = { ...acts[actIdx], images: (acts[actIdx].images || []).filter((_, i) => i !== imgIdx) };
        d[dayIdx] = { ...d[dayIdx], activities: acts };
        return { ...f, days: d };
    });
    const uploadActivityImages = async (dayIdx: number, actIdx: number, files: FileList | null) => {
        if (!files?.length) return;
        try {
            const urls = await Promise.all(Array.from(files).map(file => uploadImage(file, 'itinerary-templates')));
            setForm(f => {
                const days = [...f.days];
                const activities = [...days[dayIdx].activities];
                activities[actIdx] = { ...activities[actIdx], images: [...(activities[actIdx].images || []), ...urls] };
                days[dayIdx] = { ...days[dayIdx], activities };
                return { ...f, days };
            });
        } catch {
            alert('일정 사진 업로드에 실패했습니다.');
        }
    };
    const updateActivity = (dayIdx: number, actIdx: number, field: keyof Activity, value: any) => setForm(f => { const d = [...f.days]; d[dayIdx].activities[actIdx] = { ...d[dayIdx].activities[actIdx], [field]: value }; return { ...f, days: d }; });
    const updateActivityText = (dayIdx: number, actIdx: number, field: 'title' | 'description', value: string) => setForm(f => {
        const d = [...f.days];
        const activity = d[dayIdx].activities[actIdx];
        const next = { ...activity, [field]: value };
        next.type = inferActivityType(`${field === 'title' ? value : next.title} ${field === 'description' ? value : next.description}`);
        d[dayIdx].activities[actIdx] = next;
        return { ...f, days: d };
    });
    const moveActivity = (dayIdx: number, actIdx: number, dir: -1 | 1) => setForm(f => {
        const acts = [...f.days[dayIdx].activities];
        const newIdx = actIdx + dir;
        if (newIdx < 0 || newIdx >= acts.length) return f;
        [acts[actIdx], acts[newIdx]] = [acts[newIdx], acts[actIdx]];
        const d = [...f.days];
        d[dayIdx] = { ...d[dayIdx], activities: acts };
        return { ...f, days: d };
    });
    const updateDocSection = <K extends keyof DocumentSettings>(section: K, patch: Partial<DocumentSettings[K]>) => {
        setForm(f => ({
            ...f,
            documentSettings: {
                ...f.documentSettings,
                [section]: { ...f.documentSettings[section], ...patch },
            },
        }));
    };

    const updateIncluded = (idx: number, field: 'icon' | 'label', value: string) => {
        setForm(f => {
            const included = [...f.documentSettings.overview.included];
            included[idx] = { ...included[idx], [field]: value };
            return { ...f, documentSettings: { ...f.documentSettings, overview: { ...f.documentSettings.overview, included } } };
        });
    };

    const updateCancellation = (idx: number, field: 'period' | 'fee', value: string) => {
        setForm(f => {
            const cancellationRows = [...f.documentSettings.contract.cancellationRows];
            cancellationRows[idx] = { ...cancellationRows[idx], [field]: value };
            return { ...f, documentSettings: { ...f.documentSettings, contract: { ...f.documentSettings.contract, cancellationRows } } };
        });
    };

    const updateGuideNotice = (idx: number, field: 'title' | 'body', value: string) => {
        setForm(f => {
            const notices = [...f.documentSettings.guide.notices];
            notices[idx] = { ...notices[idx], [field]: value };
            return { ...f, documentSettings: { ...f.documentSettings, guide: { ...f.documentSettings.guide, notices } } };
        });
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) { alert('템플릿 이름을 입력하세요.'); return; }
        try {
            const payload = {
                name: form.name,
                description: encodeTemplateDescription(form.description, form.documentSettings),
                days: form.days,
            };
            if (editing) { await api.itineraryTemplates.update(editing.id, payload); }
            else { await api.itineraryTemplates.create(payload); }
            await load(); setIsModalOpen(false); resetForm();
        } catch (e: any) { alert('저장 실패: ' + e.message); }
    };

    const handleEdit = (t: ItineraryTemplate) => { setEditing(t); setForm({ name: t.name, description: t.description, days: t.days, documentSettings: mergeDocumentSettings(t.documentSettings) }); setEditorMode('itinerary'); setIsModalOpen(true); };
    const handleDelete = async (id: string) => { if (!confirm('삭제하시겠습니까?')) return; try { await api.itineraryTemplates.delete(id); await load(); } catch (e: any) { alert('삭제 실패'); } };
    const handleDuplicate = (t: ItineraryTemplate) => {
        setEditing(null);
        setForm({
            name: `${t.name} (복사본)`,
            description: t.description,
            documentSettings: mergeDocumentSettings(t.documentSettings),
            days: t.days.map(d => ({ ...d, activities: d.activities.map(a => ({ ...a })) })),
        });
        setEditorMode('itinerary');
        setIsModalOpen(true);
    };

    const closeEditor = () => {
        if (form.name || form.days.length > 0) {
            if (!confirm('편집 중인 내용이 사라집니다. 닫으시겠습니까?')) return;
        }
        setIsModalOpen(false); resetForm();
    };

    // RDE에 넘길 초기 내용 — 모달 오픈 시점에만 계산(편집 중 리렌더로 초기화되지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const editorInitial = useMemo<ReservationDocContent>(() => ({ name: form.name, description: form.description, days: form.days, documentSettings: form.documentSettings }), [isModalOpen]);

    return (
        <div>
            <div className="toolbar">
                <div style={{ minWidth: 0 }}>
                    <div className="cell-strong" style={{ fontSize: 14 }}>일정 프리셋(템플릿)을 만들어 견적·예약 문서에 재사용합니다.</div>
                    <div className="cell-muted" style={{ fontSize: 12.5, marginTop: 2 }}>편집 화면은 예약 상세의 문서 편집기와 동일합니다. 문서 디자인은 브랜드 1벌로 고정되고, 여기서는 일정·포함사항·계약 조건을 편집합니다.</div>
                </div>
                <div className="spacer" />
                <button className="btn btn-ink" onClick={() => { resetForm(); setIsModalOpen(true); }}>
                    <Icon name="add" /> 일정 프리셋 추가
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="empty">
                    <Icon name="event_note" />
                    <p>등록된 템플릿이 없습니다</p>
                </div>
            ) : (
                <div className="grid-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {templates.map(t => (
                        <div key={t.id} className="card" style={{ overflow: 'hidden' }}>
                            <div className="relative h-36 overflow-hidden">
                                <img src={mongoliaHero} alt="" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0B1B45]/95 via-[#16275F]/70 to-transparent" />
                                <div className="absolute left-5 top-4 text-white">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[24px]">nights_stay</span>
                                        <div>
                                            <p className="text-[11px] font-black">モンゴル銀河旅行社</p>
                                            <p className="text-[8px] font-bold tracking-widest text-white/70">DOCUMENT PACKAGE</p>
                                        </div>
                                    </div>
                                    <h3 className="mt-4 max-w-[420px] truncate text-xl font-black tracking-tight">{t.name}</h3>
                                    {t.description && <p className="mt-1 max-w-[420px] truncate text-xs font-semibold text-white/80">{t.description}</p>}
                                </div>
                                <span className="absolute right-4 top-4 rounded-xl bg-white/90 px-3 py-1 text-xs font-black text-[#1656D6] shadow-sm">{Math.max(0, t.days.length - 1)}박{t.days.length}일</span>
                            </div>

                            <div className="card-pad">
                                <div className="mb-4 grid grid-cols-4 gap-2">
                                    {[
                                        { icon: 'article', label: '개요' },
                                        { icon: 'contract', label: '계약서' },
                                        { icon: 'route', label: '상세일정' },
                                        { icon: 'qr_code_2', label: '안내/QR' },
                                    ].map(item => (
                                        <div key={item.label} className="rounded-xl border border-[#9CC5FF]/80 bg-[#F7FAFA] px-2 py-2 text-center text-[#1656D6]">
                                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                            <p className="mt-1 text-[10px] font-black">{item.label}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">문서에 들어갈 일정 내용</p>
                                    <div className="space-y-1">
                                        {t.days.slice(0, 3).map(d => (
                                            <div key={d.day} className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="flex h-7 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#287DFA]/15 text-[11px] font-black text-[#1656D6]">{d.day}일</span>
                                                <span className="truncate font-semibold">{d.region ? `${d.region} · ` : ''}{d.title || '제목 없음'}</span>
                                                <span className="flex-shrink-0 text-slate-300">({d.activities.length})</span>
                                            </div>
                                        ))}
                                        {t.days.length > 3 && <p className="pl-11 text-xs text-slate-400">+ {t.days.length - 3}일 더...</p>}
                                    </div>
                                </div>

                                <div className="row" style={{ gap: 8 }}>
                                    <button onClick={() => handleEdit(t)} className="btn btn-ink" style={{ flex: 1 }}>프리셋 편집</button>
                                    <button onClick={() => handleDuplicate(t)} className="act-btn" title="이 템플릿 복제">
                                        <Icon name="content_copy" />
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} className="act-btn danger" title="삭제">
                                        <Icon name="delete" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 편집기 단일화 — 예약 상세와 동일한 문서 워크스페이스(템플릿 모드) 재사용 */}
            <ReservationDocumentEditor
                open={isModalOpen}
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title={editing ? editing.name : '새 일정 프리셋'}
                templateMode
                initialContent={editorInitial}
                onSave={async (content) => {
                    if (!content.name.trim()) { throw new Error('프리셋 이름(문서 표지 제목)을 입력하세요.'); }
                    const payload = {
                        name: content.name,
                        description: encodeTemplateDescription(content.description, content.documentSettings),
                        days: content.days,
                    };
                    if (editing) { await api.itineraryTemplates.update(editing.id, payload); }
                    else { await api.itineraryTemplates.create(payload); }
                    await load();
                }}
            />
        </div>
    );
};

// ─── Tab: Guides ─────────────────────────────────────────
const GuidesTab: React.FC = () => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Guide | null>(null);
    const [form, setForm] = useState({ name: '', image: '', introduction: '', phone: '', experienceYears: 0, languages: [] as string[], specialties: [] as string[] });

    const load = async () => {
        try {
            const data = await api.tourGuides.list();
            if (Array.isArray(data)) setGuides(data.map((g: any) => ({
                id: g.id, name: g.name, image: g.image || '', introduction: g.bio || g.introduction || '',
                phone: g.phone || '', languages: typeof g.languages === 'string' ? JSON.parse(g.languages || '[]') : (g.languages || []),
                specialties: typeof g.specialties === 'string' ? JSON.parse(g.specialties || '[]') : (g.specialties || []),
                status: g.status || 'active', experienceYears: g.experience_years || 0,
            })));
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ name: '', image: '', introduction: '', phone: '', experienceYears: 0, languages: [], specialties: [] }); setEditing(null); };
    const toggle = (field: 'languages' | 'specialties', val: string) => setForm(f => ({ ...f, [field]: f[field].includes(val) ? f[field].filter(v => v !== val) : [...f[field], val] }));

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        try { const url = await uploadImage(file, 'guides'); setForm(f => ({ ...f, image: url })); } catch { alert('이미지 업로드 실패'); }
    };

    const handleSubmit = async () => {
        if (!form.name || !form.phone) { alert('이름과 연락처는 필수입니다.'); return; }
        try {
            const payload = { name: form.name, bio: form.introduction, phone: form.phone, image: form.image, experience_years: form.experienceYears, languages: form.languages, specialties: form.specialties };
            if (editing) { await api.tourGuides.update(editing.id, { ...payload, status: editing.status }); }
            else { await api.tourGuides.create({ ...payload, status: 'active' }); }
            await load(); setIsModalOpen(false); resetForm();
        } catch (e: any) { alert('저장 실패: ' + e.message); }
    };

    const handleApprove = async (g: Guide) => {
        try { await api.tourGuides.update(g.id, { name: g.name, bio: g.introduction, phone: g.phone, image: g.image, experience_years: g.experienceYears, languages: g.languages, specialties: g.specialties, status: 'active' }); await load(); }
        catch (e: any) { alert('승인 실패'); }
    };

    const handleDelete = async (id: string) => { if (!confirm('삭제하시겠습니까?')) return; try { await api.tourGuides.delete(id); await load(); } catch { alert('삭제 실패'); } };

    const pendingCount = guides.filter(g => g.status === 'pending').length;

    return (
        <div>
            <div className="toolbar">
                <div className="row" style={{ minWidth: 0 }}>
                    <div className="cell-muted" style={{ fontSize: 13 }}>가이드를 등록하고 관리합니다.</div>
                    {pendingCount > 0 && <span className="badge b-amber">승인대기 {pendingCount}</span>}
                </div>
                <div className="spacer" />
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn btn-ink">
                    <Icon name="add" /> 가이드 등록
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {guides.map(g => (
                    <div key={g.id} className="card card-pad grid grid-cols-[72px_1fr_auto] gap-4 items-center" style={{ padding: 14 }}>
                        <div className="avatar flex-shrink-0" style={{ width: 72, height: 72, borderRadius: 'var(--r-md)', position: 'relative' }}>
                            {g.image ? <img src={g.image} alt={g.name} className="w-full h-full object-cover" /> : <Icon name="person" style={{ fontSize: 30, color: 'var(--mrt-gray-300)' }} />}
                            {g.status === 'pending' && <span className="badge b-amber" style={{ position: 'absolute', top: 4, left: 4, padding: '1px 6px', fontSize: 9 }}>대기</span>}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="cell-strong truncate" style={{ fontSize: 15 }}>{g.name}</h3>
                                {g.experienceYears > 0 && <span className="cell-muted inline-flex items-center gap-0.5" style={{ fontSize: 11 }}><Icon name="workspace_premium" style={{ fontSize: 14 }} />{g.experienceYears}년</span>}
                                <span className="cell-muted inline-flex items-center gap-0.5" style={{ fontSize: 11 }}><Icon name="phone" style={{ fontSize: 14 }} />{g.phone}</span>
                            </div>
                            <p className="cell-muted line-clamp-1 mb-1.5" style={{ fontSize: 12.5 }}>{g.introduction || '소개글 없음'}</p>
                            {g.languages.length > 0 && <div className="flex flex-wrap gap-1">{g.languages.map(l => <span key={l} className="badge b-blue" style={{ padding: '2px 7px', fontSize: 10.5 }}>{l}</span>)}</div>}
                        </div>
                        <div className="row-actions items-center" style={{ alignItems: 'center' }}>
                            {g.status === 'pending' && <button onClick={() => handleApprove(g)} className="btn btn-sm btn-blue">승인</button>}
                            <button onClick={() => { setEditing(g); setForm({ name: g.name, image: g.image, introduction: g.introduction, phone: g.phone, experienceYears: g.experienceYears, languages: g.languages, specialties: g.specialties }); setIsModalOpen(true); }} className="act-btn" title="수정"><Icon name="edit" /></button>
                            <button onClick={() => handleDelete(g.id)} className="act-btn danger" title="삭제"><Icon name="delete" /></button>
                        </div>
                    </div>
                ))}
                {guides.length === 0 && <div className="col-span-full empty"><Icon name="person_off" /><p>등록된 가이드가 없습니다</p></div>}
            </div>

            {isModalOpen && (
                <div className="picker-scrim">
                    <div className="picker" style={{ width: 520, maxHeight: '90vh' }}>
                        <div className="card-head" style={{ flexShrink: 0 }}>
                            <h2>{editing ? '가이드 수정' : '가이드 등록'}</h2>
                            <div className="spacer" />
                            <button className="act-btn" onClick={() => { setIsModalOpen(false); resetForm(); }} title="닫기"><Icon name="close" /></button>
                        </div>
                        <div className="picker-list" style={{ padding: '20px 22px' }}>
                            <div className="field">
                                <label>프로필 사진</label>
                                <div className="row" style={{ gap: 16 }}>
                                    <div className="avatar round" style={{ width: 64, height: 64 }}>
                                        {form.image ? <img src={form.image} className="w-full h-full object-cover" /> : <Icon name="person" style={{ fontSize: 28, color: 'var(--mrt-gray-300)' }} />}
                                    </div>
                                    <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                                        사진 선택 <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                </div>
                            </div>
                            <div className="field"><label>이름 *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="inp" /></div>
                            <div className="field"><label>연락처 *</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="inp" /></div>
                            <div className="field"><label>경력 연수</label><div className="row"><input type="number" min={0} value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: Number(e.target.value) }))} className="inp" style={{ width: 110, textAlign: 'center' }} /><span className="cell-muted" style={{ fontSize: 13 }}>년</span></div></div>
                            <div className="field"><label>소개글</label><textarea value={form.introduction} onChange={e => setForm(f => ({ ...f, introduction: e.target.value }))} rows={3} className="inp" /></div>
                            <div className="field"><label>언어</label><div className="chip-row">{LANGUAGES.map(l => <button key={l} type="button" onClick={() => toggle('languages', l)} className={`chip${form.languages.includes(l) ? ' active' : ''}`}>{l}</button>)}</div></div>
                            <div className="field"><label>전문 분야</label><div className="chip-row">{SPECIALTIES.map(s => <button key={s} type="button" onClick={() => toggle('specialties', s)} className={`chip${form.specialties.includes(s) ? ' active' : ''}`}>{s}</button>)}</div></div>
                            <div className="row" style={{ gap: 10, paddingTop: 4 }}>
                                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="btn btn-ghost" style={{ flex: 1 }}>취소</button>
                                <button onClick={handleSubmit} className="btn btn-ink" style={{ flex: 1 }}>{editing ? '수정' : '등록'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Tab: Accommodations ─────────────────────────────────
const AccommodationsTab: React.FC = () => {
    const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Accommodation | null>(null);
    const [form, setForm] = useState({ name: '', images: [] as string[], description: '', type: '3성급 호텔', location: '' });

    const load = async () => {
        try {
            const data = await api.accommodations.list();
            if (Array.isArray(data)) setAccommodations(data.map((a: any) => ({
                id: a.id, name: a.name, images: typeof a.images === 'string' ? JSON.parse(a.images || '[]') : (a.images || []),
                description: a.description || '', type: a.type || '', location: a.location || '',
            })));
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ name: '', images: [], description: '', type: '3성급 호텔', location: '' }); setEditing(null); };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files; if (!files) return;
        try { const urls = await Promise.all(Array.from(files).map(f => uploadImage(f, 'accommodations'))); setForm(f => ({ ...f, images: [...f.images, ...urls] })); }
        catch { alert('이미지 업로드 실패'); }
    };

    const handleSubmit = async () => {
        if (!form.name || !form.location) { alert('숙소명과 위치는 필수입니다.'); return; }
        try {
            const payload = { name: form.name, images: form.images, description: form.description, type: form.type, location: form.location };
            if (editing) { await api.accommodations.update(editing.id, payload); }
            else { await api.accommodations.create({ ...payload, id: `ACCOM-${Date.now()}` }); }
            await load(); setIsModalOpen(false); resetForm();
        } catch (e: any) { alert('저장 실패: ' + e.message); }
    };

    const handleDelete = async (id: string) => { if (!confirm('삭제하시겠습니까?')) return; try { await api.accommodations.delete(id); await load(); } catch { alert('삭제 실패'); } };

    return (
        <div>
            <div className="toolbar">
                <div className="cell-muted" style={{ fontSize: 13, minWidth: 0 }}>숙소를 등록하고 예약에 배정합니다.</div>
                <div className="spacer" />
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn btn-ink">
                    <Icon name="add" /> 숙소 등록
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {accommodations.map(a => (
                    <div key={a.id} className="card card-pad grid grid-cols-[96px_1fr_auto] gap-4 items-center" style={{ padding: 14 }}>
                        <div className="flex-shrink-0 overflow-hidden" style={{ width: 96, height: 72, borderRadius: 'var(--r-md)', background: 'var(--mrt-gray-100)' }}>
                            {a.images.length > 0 ? <img src={a.images[0]} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon name="hotel" style={{ fontSize: 30, color: 'var(--mrt-gray-300)' }} /></div>}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="cell-strong truncate" style={{ fontSize: 15 }}>{a.name}</h3>
                                {a.type && <span className="badge b-gray" style={{ padding: '2px 7px', fontSize: 10.5 }}>{a.type}</span>}
                            </div>
                            <div className="cell-muted mb-1 inline-flex items-center gap-0.5" style={{ fontSize: 11 }}><Icon name="location_on" style={{ fontSize: 14 }} />{a.location}</div>
                            <p className="cell-muted line-clamp-1" style={{ fontSize: 12.5 }}>{a.description || '설명 없음'}</p>
                        </div>
                        <div className="row-actions items-center" style={{ alignItems: 'center' }}>
                            <button onClick={() => { setEditing(a); setForm({ name: a.name, images: a.images, description: a.description, type: a.type, location: a.location }); setIsModalOpen(true); }} className="act-btn" title="수정"><Icon name="edit" /></button>
                            <button onClick={() => handleDelete(a.id)} className="act-btn danger" title="삭제"><Icon name="delete" /></button>
                        </div>
                    </div>
                ))}
                {accommodations.length === 0 && <div className="col-span-full empty"><Icon name="hotel" /><p>등록된 숙소가 없습니다</p></div>}
            </div>

            {isModalOpen && (
                <div className="picker-scrim">
                    <div className="picker" style={{ width: 520, maxHeight: '90vh' }}>
                        <div className="card-head" style={{ flexShrink: 0 }}>
                            <h2>{editing ? '숙소 수정' : '숙소 등록'}</h2>
                            <div className="spacer" />
                            <button className="act-btn" onClick={() => { setIsModalOpen(false); resetForm(); }} title="닫기"><Icon name="close" /></button>
                        </div>
                        <div className="picker-list" style={{ padding: '20px 22px' }}>
                            <div className="field">
                                <label>이미지</label>
                                {form.images.length > 0 && <div className="grid grid-cols-3 gap-2 mb-2">{form.images.map((img, i) => <div key={i} className="relative aspect-video"><img src={img} className="w-full h-full object-cover rounded-lg" /><button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><span className="material-symbols-outlined text-xs">close</span></button></div>)}</div>}
                                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                                    <Icon name="add_photo_alternate" /> 이미지 추가 <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                </label>
                            </div>
                            <div className="field"><label>숙소명 *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="inp" /></div>
                            <div className="field"><label>위치 *</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="inp" placeholder="예: 울란바토르 시내, 테를지 국립공원" /></div>
                            <div className="field">
                                <label>숙소 타입</label>
                                {Object.entries(ACCOM_TYPES).map(([cat, subs]) => (
                                    <div key={cat} style={{ marginBottom: 12 }}>
                                        <p className="cell-muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{cat}</p>
                                        <div className="chip-row">{subs.map(s => <button key={s} type="button" onClick={() => setForm(f => ({ ...f, type: s }))} className={`chip${form.type === s ? ' active' : ''}`}>{s}</button>)}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="field"><label>설명</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="inp" /></div>
                            <div className="row" style={{ gap: 10, paddingTop: 4 }}>
                                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="btn btn-ghost" style={{ flex: 1 }}>취소</button>
                                <button onClick={handleSubmit} className="btn btn-ink" style={{ flex: 1 }}>{editing ? '수정' : '등록'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────
const TABS = [
    { id: 'templates', label: '일정 템플릿', icon: 'event_note' },
    { id: 'guides', label: '가이드 관리', icon: 'badge' },
    { id: 'accommodations', label: '숙소 관리', icon: 'hotel' },
];

export const AdminTemplateManage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('templates');

    return (
        <AdminLayout activePage="templates" title="템플릿 관리">
            <div className="seg" style={{ marginBottom: 18 }}>
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'active' : ''}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'templates' && <TemplatesTab />}
            {activeTab === 'guides' && <GuidesTab />}
            {activeTab === 'accommodations' && <AccommodationsTab />}
        </AdminLayout>
    );
};
