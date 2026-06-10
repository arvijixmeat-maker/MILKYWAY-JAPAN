import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Icon } from '../components/admin/console/Icon';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';
import { TouristSpotPickerModal } from '../components/admin/TouristSpotPickerModal';
import { HotelPickerModal } from '../components/admin/HotelPickerModal';
import type { TouristSpot } from '../types/touristSpot';
import type { Hotel } from '../types/hotel';
import mongoliaHero from '../assets/login_bg_3.jpg';

// ─── Types ───────────────────────────────────────────────
export type ActivityType = 'pickup' | 'transport' | 'meal' | 'sightseeing' | 'activity' | 'checkin' | 'free' | 'other';
export interface Activity { time?: string; type?: ActivityType; title: string; description: string; images?: string[]; }
export interface TemplateDay {
    day: number;
    date?: string;
    title: string;
    region?: string;
    summary?: string;
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
        bankInfo: string;
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
        paymentMethod: '銀行振込',
        paymentDeadline: 'ご案内メールに記載の期日まで',
        bankInfo: '三井住友銀行 新宿支店（普通）1234567\nモンゴル銀河旅行社（カ',
        includedText: '宿泊費、食事代、専用車、ドライバー、日本語ガイド、日程表記載の体験料金',
        excludedText: '国際航空券、海外旅行保険、個人的費用、日程表に記載のない食事',
        cancellationRows: [
            { period: '30日〜15日前まで', fee: '旅行代金の10%' },
            { period: '14日〜8日前まで', fee: '旅行代金の20%' },
            { period: '7日〜3日前まで', fee: '旅行代金の30%' },
            { period: '2日前〜当日', fee: '旅行代金の50%' },
            { period: '無連絡不参加', fee: '旅行代金の100%' },
        ],
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
        paymentInfo: 'お支払い方法：銀行振込\nお支払い期限：ご案内メールに記載の期日まで',
        guideName: '',
        guidePhone: '',
        accommodationInfo: '',
        emergencyPhone: '+976-80-1234-5678',
        emergencyEmail: 'info@mongolryokou.com',
        closingMessage: 'モンゴルの大自然と文化を心ゆくまでお楽しみください。',
        qrLabel: 'お客様専用ページ',
    },
});

export const mergeDocumentSettings = (value: any): DocumentSettings => {
    const base = defaultDocumentSettings();
    if (!value || typeof value !== 'object') return base;
    return {
        overview: { ...base.overview, ...(value.overview || {}), included: Array.isArray(value.overview?.included) ? value.overview.included : base.overview.included },
        contract: { ...base.contract, ...(value.contract || {}), cancellationRows: Array.isArray(value.contract?.cancellationRows) ? value.contract.cancellationRows : base.contract.cancellationRows },
        detail: { ...base.detail, ...(value.detail || {}), footerBadges: Array.isArray(value.detail?.footerBadges) ? value.detail.footerBadges : base.detail.footerBadges },
        guide: { ...base.guide, ...(value.guide || {}), notices: Array.isArray(value.guide?.notices) ? value.guide.notices : base.guide.notices },
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

// 줄 단위 텍스트 → 일정 항목 배열 (전체 텍스트 편집용)
const inferTypeForText = (text: string): ActivityType => {
    const v = (text || '').toLowerCase();
    if (/(공항|픽업|도착|미팅|空港|到着|arrival|airport)/i.test(v)) return 'pickup';
    if (/(이동|출발|전용차|차량|버스|移動|出発|専用車|transfer|drive)/i.test(v)) return 'transport';
    if (/(식사|조식|중식|석식|점심|저녁|아침|食事|朝食|昼食|夕食|meal|lunch|dinner|breakfast)/i.test(v)) return 'meal';
    if (/(숙박|호텔|게르|체크인|宿泊|ホテル|ゲル|hotel|stay|check[-\s]?in)/i.test(v)) return 'checkin';
    if (/(체험|승마|낙타|트레킹|공연|乗馬|ラクダ|activity|experience)/i.test(v)) return 'activity';
    if (/(자유|휴식|自由|free)/i.test(v)) return 'free';
    return 'sightseeing';
};
export const parseDayActivitiesText = (text: string): Activity[] =>
    (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
        const m = line.match(/^(\d{1,2}:\d{2})\s+(.*)$/);
        const title = m ? m[2] : line;
        return { time: '', type: inferTypeForText(title), title, description: '' };
    });

const encodeTemplateDescription = (description: string, documentSettings: DocumentSettings) =>
    `${description || ''}${DOC_SETTINGS_MARKER}${JSON.stringify(documentSettings)}`;

const ACTIVITY_TYPES: { id: ActivityType; label: string; icon: string }[] = [
    { id: 'pickup', label: '픽업', icon: 'flight_land' },
    { id: 'transport', label: '이동', icon: 'directions_car' },
    { id: 'meal', label: '식사', icon: 'restaurant' },
    { id: 'sightseeing', label: '관광', icon: 'photo_camera' },
    { id: 'activity', label: '체험', icon: 'sports_handball' },
    { id: 'checkin', label: '체크인', icon: 'hotel' },
    { id: 'free', label: '자유시간', icon: 'park' },
    { id: 'other', label: '기타', icon: 'more_horiz' },
];
const TYPE_MAP = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t]));

// 항목 유형별 액센트 색 (목업 디자인: 관광=teal, 숙박=violet, 이동=blue, 식사=amber)
const typeAccent = (type?: ActivityType): { c: string; cb: string } => {
    switch (type) {
        case 'checkin': return { c: '#6a55d6', cb: '#efedfd' };
        case 'pickup':
        case 'transport': return { c: '#2767cf', cb: '#e8f0fd' };
        case 'meal': return { c: '#c97a16', cb: '#fcf2e0' };
        default: return { c: '#0e9c84', cb: '#e4f6f1' };
    }
};

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

// 모듈 스코프 컴포넌트 — 컴포넌트 내부에 정의하면 입력마다 리마운트되어 포커스·스크롤이 튐
const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mx-auto max-w-[960px] rounded-[22px] border border-[#8FE7DE] bg-white shadow-sm">{children}</div>
);

// ─── Live Preview (editable PC document preview) ───
type TemplatePreviewProps = {
    name: string;
    description: string;
    days: TemplateDay[];
    documentSettings: DocumentSettings;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onDocSection: <K extends keyof DocumentSettings>(section: K, patch: Partial<DocumentSettings[K]>) => void;
    onIncluded: (idx: number, field: 'icon' | 'label', value: string) => void;
    onCancellation: (idx: number, field: 'period' | 'fee', value: string) => void;
    onGuideNotice: (idx: number, field: 'title' | 'body', value: string) => void;
    // 일정(日程) 직접 편집
    onDayChange: (dayIdx: number, field: keyof TemplateDay, value: any) => void;
    onActivityChange: (dayIdx: number, actIdx: number, field: 'time' | 'title' | 'description', value: string) => void;
    onAddDay: () => void;
    onAddActivity: (dayIdx: number) => void;
    onRemoveDay: (dayIdx: number) => void;
    onRemoveActivity: (dayIdx: number, actIdx: number) => void;
    onDayActivitiesText?: (dayIdx: number, text: string) => void;
    onPickSpot?: (dayIdx: number, actIdx: number) => void;
    onPickHotel?: (dayIdx: number) => void;
    defaultPage?: 'overview' | 'contract' | 'detail' | 'guide';
    focusDayIndex?: number;
    showPageTabs?: boolean;
    visiblePages?: Array<'overview' | 'contract' | 'detail' | 'guide'>;
    // 예약/견적에서 열 때 실제 고객 데이터 자동 표시 (없으면 샘플)
    customer?: {
        tripNumber?: string;
        period?: string;
        tripLength?: string;
        headcount?: string;
        name?: string;
        tripType?: string;
        totalAmount?: number;
        deposit?: number;
        localAmount?: number;
        peopleCount?: number;
    } | null;
    assignedGuide?: { name?: string; phone?: string; image?: string } | null;
    dailyAccommodations?: Array<{ day: number; accommodation: { name?: string; type?: string; location?: string } }>;
};

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ name, description, days, documentSettings, customer, assignedGuide, dailyAccommodations, onNameChange, onDescriptionChange, onDocSection, onIncluded, onCancellation, onGuideNotice, onDayChange, onActivityChange, onAddDay, onAddActivity, onRemoveDay, onRemoveActivity, onDayActivitiesText, onPickSpot, onPickHotel, defaultPage = 'overview', focusDayIndex, showPageTabs = true, visiblePages }) => {
    const [activePage, setActivePage] = useState<'overview' | 'contract' | 'detail' | 'guide'>(defaultPage);
    useEffect(() => setActivePage(defaultPage), [defaultPage]);
    const totalDays = days.length;
    const nights = Math.max(0, totalDays - 1);
    const settings = mergeDocumentSettings(documentSettings);
    const peopleCount = customer?.peopleCount || 2;
    const samplePrice = (customer?.totalAmount && peopleCount) ? Math.round(customer.totalAmount / peopleCount) : (Number(settings.overview.pricePerPerson || 0) || 128000);
    const sampleTotal = customer?.totalAmount ?? samplePrice * peopleCount;
    const sampleDeposit = customer?.deposit ?? Math.floor(sampleTotal * 0.1);
    const sampleLocal = customer?.localAmount ?? (sampleTotal - sampleDeposit);
    const tripLength = customer?.tripLength || `${nights}泊${totalDays || 0}日`;
    const guideText = assignedGuide?.name
        ? `${assignedGuide.name}${assignedGuide.phone ? `（${assignedGuide.phone}）` : ''}`
        : '日本語ガイドが全日程同行します';
    const getAccommodation = (day: number) =>
        dailyAccommodations?.find(item => item.day === day)?.accommodation
        || days.find(item => item.day === day)?.accommodation
        || null;
    const accommodationSummary = days
        .map(day => ({ day: day.day, accommodation: getAccommodation(day.day) }))
        .filter(item => item.accommodation?.name)
        .map(item => `${item.day}日目：${item.accommodation?.name}`)
        .join(' / ') || '出発前までにご案内します';
    const pages = [
        { id: 'overview' as const, label: '日程表', icon: 'article' },
        { id: 'contract' as const, label: '契約書', icon: 'contract' },
        { id: 'detail' as const, label: '詳細', icon: 'route' },
        { id: 'guide' as const, label: '案内', icon: 'info' },
    ].filter(page => !visiblePages || visiblePages.includes(page.id));
    const rows = [
        ['ご旅行番号', customer?.tripNumber || 'QT-20240604-001'],
        ['ご旅行期間', `${customer?.period || '2026年6月10日（火）〜 2026年6月13日（金）'} ${tripLength}`],
        ['参加人数', customer?.headcount || '大人 2名 / 子供 0名'],
        ['お客様名', `${customer?.name || '山田 太郎'} 様`],
        ['旅行形態', customer?.tripType || '貸切プライベートツアー'],
    ];
    const fieldClass = 'w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 outline-none transition-colors hover:border-[#8FE7DE] hover:bg-white/80 focus:border-[#39C4B7] focus:bg-white focus:ring-2 focus:ring-[#39C4B7]/15';
    // Frame은 모듈 스코프로 이동 (입력마다 리마운트되어 스크롤·포커스가 튀던 문제 수정)

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[#F7FAFA] dark:bg-slate-900">
            {showPageTabs && <div className="border-b border-[#8FE7DE]/60 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        <span className="material-symbols-outlined text-[15px]">edit_note</span>PDF 화면에서 직접 편집
                    </p>
                    <span className="rounded-full bg-[#39C4B7]/10 px-3 py-1 text-[11px] font-black text-[#0F8F84]">클릭해서 수정</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-[#EAF8F7] p-1">
                    {pages.map(page => (
                        <button key={page.id} onClick={() => setActivePage(page.id)} className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black transition-colors ${activePage === page.id ? 'bg-white text-[#0F8F84] shadow-sm' : 'text-slate-500 hover:bg-white/60'}`} title={page.label}>
                            <span className="material-symbols-outlined text-[15px]">{page.icon}</span><span className="truncate">{page.label}</span>
                        </button>
                    ))}
                </div>
            </div>}
            {customer ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-teal-200 bg-teal-50 px-4 py-2 text-[11px] font-bold text-[#0F8F84] dark:border-teal-800 dark:bg-teal-900/20">
                    <span className="material-symbols-outlined text-[15px]">person</span>
                    <span>{customer.name || '고객'}님 문서 — 고객 정보·금액이 자동 반영되었습니다</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5"><span className="material-symbols-outlined text-[13px]">badge</span>{guideText}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5"><span className="material-symbols-outlined text-[13px]">hotel</span>{dailyAccommodations?.length ? `${dailyAccommodations.length}일 숙소 배정` : '숙소 미배정'}</span>
                </div>
            ) : (
                <div className="flex items-start gap-1.5 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    <span className="material-symbols-outlined text-[15px]">info</span>
                    <span>샘플(예시) 표시입니다. 실제 고객 정보는 <b>통합 예약 관리 → 예약/견적 → 「문서 편집」</b>으로 열면 자동으로 채워집니다.</span>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-4">
                {activePage === 'overview' && <Frame>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-2 text-[#0F8F84]"><span className="material-symbols-outlined text-[28px]">landscape</span><div><p className="text-[12px] font-black">モンゴル銀河旅行社</p><p className="text-[8px] font-bold tracking-widest">MILKYWAY JAPAN</p></div></div>
                        <div className="text-right"><p className="text-[22px] font-black tracking-[0.12em] text-[#0F8F84]">ご旅行日程表</p><input value={settings.overview.subtitle} onChange={e => onDocSection('overview', { subtitle: e.target.value })} className={`${fieldClass} max-w-[260px] text-right text-[10px] font-semibold leading-snug text-slate-400`} /></div>
                    </div>
                    <div className="relative h-[220px] overflow-hidden"><img src={mongoliaHero} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#00796F]/90 via-[#0F8F84]/45 to-transparent" /><div className="absolute bottom-5 left-5 right-5 text-white"><span className="rounded-xl bg-[#0F8F84] px-3 py-2 text-xs font-black">{tripLength}</span><input value={name} onChange={e => onNameChange(e.target.value)} placeholder="銀河・大自然パッケージ" className={`${fieldClass} mt-3 block max-w-[520px] text-[28px] font-black leading-tight text-white placeholder:text-white/70`} /><input value={description || settings.overview.heroTagline} onChange={e => onDescriptionChange(e.target.value)} className={`${fieldClass} mt-1 max-w-[560px] text-xs font-semibold text-white/90`} /></div></div>
                    <div className="p-5"><h4 className="mb-2 flex items-center gap-1.5 text-sm font-black text-[#0F8F84]"><span className="material-symbols-outlined text-base">check_circle</span>ご旅行概要</h4><textarea value={settings.overview.intro} onChange={e => onDocSection('overview', { intro: e.target.value })} rows={3} className={`${fieldClass} mb-3 resize-none text-[11px] font-semibold leading-relaxed text-slate-500`} /><div className="overflow-hidden rounded-xl border border-[#8FE7DE] text-xs">{[...rows, ['担当ガイド', guideText], ['宿泊', accommodationSummary]].map(([label, value]) => <div key={label} className="grid grid-cols-[112px_1fr] border-b border-[#8FE7DE] last:border-b-0"><div className="bg-[#F7FAFA] px-3 py-2 font-black text-[#0F8F84]">{label}</div><div className="px-3 py-2 font-semibold text-slate-700">{value}</div></div>)}</div>
                    <div className="mt-4 grid grid-cols-2 gap-3"><div><h4 className="mb-1 text-sm font-black text-[#0F8F84]">含まれているもの</h4><textarea value={settings.overview.includedText} onChange={e => onDocSection('overview', { includedText: e.target.value })} rows={5} className={`${fieldClass} resize-none text-[11px] font-semibold leading-relaxed text-slate-600`} placeholder="1行に1項目" /></div><div><h4 className="mb-1 text-sm font-black text-slate-500">含まれないもの</h4><textarea value={settings.overview.excludedText} onChange={e => onDocSection('overview', { excludedText: e.target.value })} rows={5} className={`${fieldClass} resize-none text-[11px] font-semibold leading-relaxed text-slate-600`} placeholder="1行に1項目" /></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-[#8FE7DE] bg-white p-3 text-center"><p className="text-[9px] font-black text-slate-400">参加人数</p><p className="text-base font-black text-slate-700">{peopleCount}名</p></div><div className="rounded-xl bg-gradient-to-br from-[#0F8F84] to-[#39C4B7] p-3 text-center text-white"><p className="text-[9px] font-black">ご請求金額（合計）</p><p className="text-xl font-black">{sampleTotal.toLocaleString()}円</p></div></div><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-xl border border-[#39C4B7] bg-[#EAF8F7] p-3 text-center"><p className="text-[9px] font-black text-[#0F8F84]">ご予約金（お申込時にお支払い）</p><p className="text-lg font-black text-[#0F8F84]">{sampleDeposit.toLocaleString()}円</p></div><div className="rounded-xl border border-[#8FE7DE] bg-white p-3 text-center"><p className="text-[9px] font-black text-slate-400">現地払い残金</p><p className="text-lg font-black text-slate-700">{sampleLocal.toLocaleString()}円</p></div></div></div>
                </Frame>}
                {activePage === 'contract' && <Frame><div className="p-5"><div className="mb-5 flex items-start justify-between"><div className="text-[#0F8F84]"><p className="text-[12px] font-black">モンゴル銀河旅行社</p><p className="text-[8px] font-bold tracking-widest">MILKYWAY JAPAN</p></div><div className="rounded-lg bg-[#39C4B7]/10 px-3 py-2 text-[9px] font-black text-[#0F8F84]">契約日：2026年6月4日</div></div><h3 className="text-center text-[30px] font-black tracking-[0.18em] text-[#0F8F84]">ご旅行契約書</h3><p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">Travel Contract</p><textarea value={settings.contract.intro} onChange={e => onDocSection('contract', { intro: e.target.value })} rows={3} className={`${fieldClass} mx-auto mt-4 block max-w-[520px] resize-none text-center text-[11px] font-semibold leading-relaxed text-slate-500`} /><div className="mt-5 overflow-hidden rounded-xl border border-[#8FE7DE] text-xs">{[['ご旅行名', name || '銀河・大自然パッケージ'], ['ご旅行期間', tripLength], ['旅行代金', `${samplePrice.toLocaleString()}円（一人）`], ['合計金額', `${sampleTotal.toLocaleString()}円`], ['ガイド', guideText], ['宿泊', accommodationSummary]].map(([label, value]) => <div key={label} className="grid grid-cols-[112px_1fr] border-b border-[#8FE7DE] last:border-b-0"><div className="bg-[#F7FAFA] px-3 py-2 font-black text-[#0F8F84]">{label}</div><div className="px-3 py-2 font-semibold text-slate-700">{value}</div></div>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#8FE7DE] p-3"><p className="text-xs font-black text-[#0F8F84]">キャンセル規定</p><div className="mt-2 space-y-1">{settings.contract.cancellationRows.slice(0, 5).map((row, idx) => <div key={idx} className="grid grid-cols-[1fr_90px] gap-1"><input value={row.period} onChange={e => onCancellation(idx, 'period', e.target.value)} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /><input value={row.fee} onChange={e => onCancellation(idx, 'fee', e.target.value)} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /></div>)}</div></div><div className="rounded-xl border border-[#8FE7DE] p-3"><p className="text-xs font-black text-[#0F8F84]">お支払い</p><input value={settings.contract.paymentMethod} onChange={e => onDocSection('contract', { paymentMethod: e.target.value })} className={`${fieldClass} mt-2 text-[10px] font-semibold text-slate-500`} /><input value={settings.contract.paymentDeadline} onChange={e => onDocSection('contract', { paymentDeadline: e.target.value })} className={`${fieldClass} mt-1 text-[10px] font-semibold text-slate-500`} /><textarea value={settings.contract.bankInfo} onChange={e => onDocSection('contract', { bankInfo: e.target.value })} rows={3} placeholder="振込先・お支払い案内（自由入力）" className={`${fieldClass} mt-1 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><div className="mt-4 border-b border-slate-300 pb-1 text-[10px] text-slate-400">旅行者署名</div></div></div></div></Frame>}
                {activePage === 'detail' && <Frame>
                    <div className="p-5">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Travel itinerary</p>
                                <input value={settings.detail.title} onChange={e => onDocSection('detail', { title: e.target.value })} className={`${fieldClass} mt-1 text-[24px] font-black tracking-[0.08em] text-[#0F8F84]`} />
                            </div>
                            <span className="rounded-full bg-[#39C4B7]/10 px-3 py-1 text-xs font-black text-[#0F8F84]">{totalDays || 0}日間</span>
                        </div>

                        <div className="space-y-4">
                            {days.map((day, dayIdx) => {
                                if (focusDayIndex !== undefined && dayIdx !== focusDayIndex) return null;
                                const accommodation = getAccommodation(day.day);
                                const meals = day.meals || {};
                                return (
                                    <article key={dayIdx} className="overflow-hidden rounded-2xl border border-[#8FE7DE] bg-white">
                                        <div className="grid grid-cols-[88px_1fr_auto] items-stretch border-b border-[#8FE7DE]">
                                            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#0F8F84] to-[#39C4B7] px-3 py-4 text-white">
                                                <p className="text-xs font-black">DAY {day.day}</p>
                                                <p className="mt-1 text-[10px] font-bold text-white/80">{day.date || `${day.day}日目`}</p>
                                            </div>
                                            <div className="min-w-0 px-4 py-3">
                                                <input value={day.region || ''} onChange={e => onDayChange(dayIdx, 'region', e.target.value)} placeholder="地域（例：ウランバートル）" className={`${fieldClass} text-[10px] font-black uppercase tracking-wider text-[#0F8F84]`} />
                                                <input value={day.title} onChange={e => onDayChange(dayIdx, 'title', e.target.value)} placeholder={`${day.day}日目のタイトル`} className={`${fieldClass} mt-1 text-base font-black text-slate-900`} />
                                            </div>
                                            <button onClick={() => onRemoveDay(dayIdx)} className="m-3 h-8 w-8 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500" title="이 일차 삭제">
                                                <span className="material-symbols-outlined text-[17px]">delete</span>
                                            </button>
                                        </div>

                                        <div className="p-4">
                                            <label className="text-[10px] font-black uppercase tracking-wide text-slate-400">여행 소개</label>
                                            <textarea
                                                value={day.summary || ''}
                                                onChange={e => onDayChange(dayIdx, 'summary', e.target.value)}
                                                rows={3}
                                                placeholder="이날의 여행 흐름과 고객에게 전달할 설명을 입력하세요."
                                                className={`${fieldClass} mt-1 resize-y text-[11px] font-semibold leading-relaxed text-slate-600`}
                                            />

                                            <div className="mt-4 flex items-center justify-between gap-3">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">주요 일정</p>
                                                {onDayActivitiesText && (
                                                    <button
                                                        onClick={() => {
                                                            const text = prompt('한 줄에 하나씩 주요 일정을 붙여넣으세요.', day.activities.map(a => a.title).join('\n'));
                                                            if (text !== null) onDayActivitiesText(dayIdx, text);
                                                        }}
                                                        className="inline-flex items-center gap-1 text-[10px] font-black text-[#0F8F84]"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">content_paste</span>여러 줄 붙여넣기
                                                    </button>
                                                )}
                                            </div>

                                            <div className="relative mt-2 border-l-2 border-dashed border-[#8FE7DE] pl-5">
                                                {day.activities.map((activity, index) => (
                                                    <div key={index} className="relative pb-3 last:pb-0">
                                                        <span className="absolute -left-[30px] top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F8F84] ring-4 ring-white">
                                                            <span className="material-symbols-outlined text-[9px] text-white">{TYPE_MAP[activity.type || 'sightseeing']?.icon || 'place'}</span>
                                                        </span>
                                                        <div className="rounded-xl bg-[#F7FAFA] p-3">
                                                            <div className="flex items-center gap-2">
                                                                <input value={activity.title} onChange={e => onActivityChange(dayIdx, index, 'title', e.target.value)} placeholder="주요 일정 (예: 공항 도착 및 가이드 미팅)" className={`${fieldClass} flex-1 text-[12px] font-black text-slate-800`} />
                                                                {onPickSpot && <button onClick={() => onPickSpot(dayIdx, index)} className="h-7 rounded-lg border border-[#8FE7DE] bg-white px-2 text-[9px] font-black text-[#0F8F84]">관광지</button>}
                                                                <button onClick={() => onRemoveActivity(dayIdx, index)} className="text-slate-300 hover:text-red-500" title="삭제"><span className="material-symbols-outlined text-[16px]">close</span></button>
                                                            </div>
                                                            <textarea value={activity.description || ''} onChange={e => onActivityChange(dayIdx, index, 'description', e.target.value)} rows={2} placeholder="상세 설명 (선택)" className={`${fieldClass} mt-1 resize-y text-[10px] font-semibold leading-relaxed text-slate-500`} />
                                                            {(activity.images || []).length > 0 && (
                                                                <div className="mt-2 grid grid-cols-3 gap-2">
                                                                    {(activity.images || []).slice(0, 3).map((image, imageIndex) => <img key={imageIndex} src={image} alt="" className="h-16 w-full rounded-lg object-cover" />)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <button onClick={() => onAddActivity(dayIdx)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-[#0F8F84]">
                                                    <span className="material-symbols-outlined text-[15px]">add_circle</span>주요 일정 추가
                                                </button>
                                            </div>

                                            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.1fr]">
                                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                                    <p className="mb-2 flex items-center gap-1 text-[11px] font-black text-slate-700"><span className="material-symbols-outlined text-[16px] text-[#0F8F84]">restaurant</span>식사</p>
                                                    <div className="grid grid-cols-3 gap-1.5">
                                                        {([
                                                            ['breakfast', '朝食'],
                                                            ['lunch', '昼食'],
                                                            ['dinner', '夕食'],
                                                        ] as const).map(([key, label]) => (
                                                            <label key={key} className="rounded-lg bg-[#F7FAFA] p-2">
                                                                <span className="block text-[9px] font-black text-slate-400">{label}</span>
                                                                <input value={meals[key] || ''} onChange={e => onDayChange(dayIdx, 'meals', { ...meals, [key]: e.target.value })} placeholder="미정" className={`${fieldClass} mt-1 text-[10px] font-bold text-slate-700`} />
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                                    <div className="mb-2 flex items-center justify-between gap-2">
                                                        <p className="flex items-center gap-1 text-[11px] font-black text-slate-700"><span className="material-symbols-outlined text-[16px] text-[#0F8F84]">hotel</span>숙소</p>
                                                        {onPickHotel && <button onClick={() => onPickHotel(dayIdx)} className="text-[10px] font-black text-[#0F8F84]">숙소 마스터에서 선택</button>}
                                                    </div>
                                                    <input
                                                        value={accommodation?.name || ''}
                                                        onChange={e => onDayChange(dayIdx, 'accommodation', { ...(day.accommodation || {}), name: e.target.value })}
                                                        placeholder="호텔 또는 게르명"
                                                        className={`${fieldClass} text-[11px] font-black text-slate-800`}
                                                    />
                                                    {accommodation?.location && <p className="mt-1 text-[9px] font-semibold text-slate-400">{accommodation.location}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}

                            {days.length === 0 && <p className="rounded-xl border border-dashed border-[#8FE7DE] py-8 text-center text-[11px] font-bold text-slate-400">아래 버튼으로 첫 번째 DAY를 추가하세요.</p>}
                            <button onClick={onAddDay} className="w-full rounded-xl border-2 border-dashed border-[#8FE7DE] py-3 text-xs font-black text-[#0F8F84] transition-colors hover:bg-[#EAF8F7]">
                                <span className="material-symbols-outlined align-middle text-[16px]">add</span> DAY 추가
                            </button>
                        </div>

                        <textarea value={settings.detail.note} onChange={e => onDocSection('detail', { note: e.target.value })} rows={2} className={`${fieldClass} mt-4 resize-none text-[11px] font-semibold leading-relaxed text-slate-500`} />
                    </div>
                </Frame>}
                {activePage === 'guide' && <Frame><div className="grid gap-4 p-5 sm:grid-cols-2"><div className="rounded-xl border border-[#8FE7DE] p-4"><h3 className="text-sm font-black text-[#0F8F84]">ご案内・ご注意事項</h3>{settings.guide.notices.slice(0, 5).map((item, idx) => <div key={idx} className="mt-3 flex gap-2"><span className="material-symbols-outlined text-[20px] text-[#0F8F84]">info</span><div className="flex-1"><input value={item.title} onChange={e => onGuideNotice(idx, 'title', e.target.value)} className={`${fieldClass} text-xs font-black text-[#0F8F84]`} /><textarea value={item.body} onChange={e => onGuideNotice(idx, 'body', e.target.value)} rows={2} className={`${fieldClass} mt-1 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /></div></div>)}</div><div className="rounded-xl border border-[#8FE7DE] p-4"><h3 className="text-sm font-black text-[#0F8F84]">旅行条件（要約）</h3><textarea value={settings.guide.conditions} onChange={e => onDocSection('guide', { conditions: e.target.value })} rows={4} className={`${fieldClass} mt-2 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><h3 className="mt-5 text-sm font-black text-[#0F8F84]">旅行代金のお支払い</h3><textarea value={settings.guide.paymentInfo} onChange={e => onDocSection('guide', { paymentInfo: e.target.value })} rows={3} className={`${fieldClass} mt-2 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><h3 className="mt-5 text-sm font-black text-[#0F8F84]">緊急連絡先</h3><input value={settings.guide.emergencyPhone} onChange={e => onDocSection('guide', { emergencyPhone: e.target.value })} className={`${fieldClass} mt-2 text-[10px] font-semibold text-slate-500`} /><input value={settings.guide.emergencyEmail} onChange={e => onDocSection('guide', { emergencyEmail: e.target.value })} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /></div></div><div className="relative h-[104px] overflow-hidden"><img src={mongoliaHero} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-transparent" /><input value={settings.guide.closingMessage} onChange={e => onDocSection('guide', { closingMessage: e.target.value })} className={`${fieldClass} absolute left-5 top-7 max-w-[360px] text-sm font-black text-[#0F8F84]`} /><div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-[#0F8F84] px-5 py-2 text-[10px] font-bold text-white"><span>モンゴル銀河旅行社</span><span>{settings.guide.emergencyEmail}</span></div></div></Frame>}
            </div>
        </div>
    );
};

type ProductStyleItineraryEditorProps = {
    days: TemplateDay[];
    quickDays: number;
    onQuickDaysChange: (value: number) => void;
    onCreateSkeleton: () => void;
    onAddDay: () => void;
    onUpdateDay: (dayIdx: number, field: keyof TemplateDay, value: any) => void;
    onMoveDay: (dayIdx: number, direction: -1 | 1) => void;
    onDuplicateDay: (dayIdx: number) => void;
    onRemoveDay: (dayIdx: number) => void;
    onAddActivity: (dayIdx: number, type: ActivityType) => void;
    onUpdateActivity: (dayIdx: number, activityIdx: number, field: keyof Activity, value: any) => void;
    onMoveActivity: (dayIdx: number, activityIdx: number, direction: -1 | 1) => void;
    onRemoveActivity: (dayIdx: number, activityIdx: number) => void;
    onRemoveActivityImage: (dayIdx: number, activityIdx: number, imageIdx: number) => void;
    onUploadActivityImages: (dayIdx: number, activityIdx: number, files: FileList | null) => void;
    onPickSpot: (dayIdx: number, activityIdx: number) => void;
    onPickHotelActivity: (dayIdx: number, activityIdx: number) => void;
    onPickDayHotel: (dayIdx: number) => void;
};

const ProductStyleItineraryEditor: React.FC<ProductStyleItineraryEditorProps> = ({
    days,
    quickDays,
    onQuickDaysChange,
    onCreateSkeleton,
    onAddDay,
    onUpdateDay,
    onMoveDay,
    onDuplicateDay,
    onRemoveDay,
    onAddActivity,
    onUpdateActivity,
    onMoveActivity,
    onRemoveActivity,
    onRemoveActivityImage,
    onUploadActivityImages,
    onPickSpot,
    onPickHotelActivity,
    onPickDayHotel,
}) => {
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);

    useEffect(() => {
        setSelectedDayIndex(current => Math.max(0, Math.min(current, days.length - 1)));
    }, [days.length]);

    const selectedDay = days[selectedDayIndex];
    const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#39C4B7] focus:ring-2 focus:ring-[#39C4B7]/15';
    const iconButtonClass = 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-[#8FE7DE] hover:text-[#0F8F84] disabled:cursor-not-allowed disabled:opacity-30';

    return (
        <div className="grid h-full grid-cols-[230px_minmax(580px,1fr)_260px] overflow-hidden bg-[#F7FAFA] max-xl:grid-cols-[210px_minmax(520px,1fr)] max-lg:block max-lg:overflow-y-auto">
            <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4 max-lg:border-b max-lg:border-r-0">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-black text-amber-900">N일 일정 골격 만들기</p>
                    <p className="mt-1 text-[10px] font-semibold leading-relaxed text-amber-700">상품관리 일정탭과 같은 방식으로 DAY를 먼저 생성합니다.</p>
                    <div className="mt-3 flex gap-2">
                        <select
                            value={quickDays}
                            onChange={event => onQuickDaysChange(Number(event.target.value))}
                            className="h-9 flex-1 rounded-lg border border-amber-200 bg-white px-2 text-xs font-black text-slate-700 outline-none"
                        >
                            {Array.from({ length: 14 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{day}일</option>)}
                        </select>
                        <button type="button" onClick={onCreateSkeleton} className="h-9 rounded-lg bg-amber-500 px-3 text-xs font-black text-white hover:bg-amber-600">생성</button>
                    </div>
                </div>

                <div className="mb-3 mt-5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">일정 구성</p>
                        <p className="mt-1 text-base font-black text-slate-900">{days.length}일 일정</p>
                    </div>
                    <button type="button" onClick={onAddDay} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F8F84] text-white" title="DAY 추가">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                </div>

                <div className="space-y-2">
                    {days.map((day, index) => (
                        <button
                            key={`${day.day}-${index}`}
                            type="button"
                            onClick={() => setSelectedDayIndex(index)}
                            className={`w-full rounded-xl border p-3 text-left transition ${selectedDayIndex === index ? 'border-[#39C4B7] bg-[#EAF8F7] shadow-sm' : 'border-slate-200 bg-white hover:border-[#8FE7DE]'}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#0F8F84]">DAY {day.day}</span>
                                <span className="text-[9px] font-bold text-slate-400">{day.activities.length}개 일정</span>
                            </div>
                            <p className="mt-1 truncate text-xs font-black text-slate-800">{day.title || '일차 제목을 입력하세요'}</p>
                            <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{[day.date, day.region].filter(Boolean).join(' · ') || '날짜·지역 미정'}</p>
                        </button>
                    ))}
                    {days.length === 0 && (
                        <button type="button" onClick={onCreateSkeleton} className="w-full rounded-xl border-2 border-dashed border-[#8FE7DE] px-3 py-8 text-xs font-black text-[#0F8F84]">
                            일정 골격 생성
                        </button>
                    )}
                </div>
            </aside>

            <main className="min-w-0 overflow-y-auto p-5">
                {!selectedDay ? (
                    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border-2 border-dashed border-[#8FE7DE] bg-white text-center">
                        <div>
                            <span className="material-symbols-outlined text-4xl text-[#39C4B7]">calendar_add_on</span>
                            <p className="mt-3 text-sm font-black text-slate-800">먼저 여행 일수를 선택해 일정 골격을 생성하세요.</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">생성 후 일차별 제목, 일정, 식사와 숙소를 입력할 수 있습니다.</p>
                        </div>
                    </div>
                ) : (
                    <section className="overflow-hidden rounded-2xl border border-[#8FE7DE] bg-white shadow-sm">
                        <header className="flex items-start gap-3 border-b border-[#8FE7DE] bg-[#EAF8F7]/50 p-4">
                            <div className="flex h-14 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#0F8F84] to-[#39C4B7] text-white">
                                <span className="text-xs font-black">DAY {selectedDay.day}</span>
                                <span className="mt-0.5 text-[9px] font-bold text-white/80">{selectedDay.day}日目</span>
                            </div>
                            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[130px_170px_1fr]">
                                <input value={selectedDay.date || ''} onChange={event => onUpdateDay(selectedDayIndex, 'date', event.target.value)} placeholder="날짜 (예: 06/10)" className={inputClass} />
                                <input value={selectedDay.region || ''} onChange={event => onUpdateDay(selectedDayIndex, 'region', event.target.value)} placeholder="지역 (예: 울란바토르)" className={inputClass} />
                                <input value={selectedDay.title} onChange={event => onUpdateDay(selectedDayIndex, 'title', event.target.value)} placeholder="일정 제목 (예: 공항 도착 및 시내 이동)" className={`${inputClass} font-black`} />
                            </div>
                            <div className="flex flex-shrink-0 gap-1">
                                <button type="button" onClick={() => onMoveDay(selectedDayIndex, -1)} disabled={selectedDayIndex === 0} className={iconButtonClass} title="앞으로 이동"><Icon name="arrow_upward" /></button>
                                <button type="button" onClick={() => onMoveDay(selectedDayIndex, 1)} disabled={selectedDayIndex === days.length - 1} className={iconButtonClass} title="뒤로 이동"><Icon name="arrow_downward" /></button>
                                <button type="button" onClick={() => onDuplicateDay(selectedDayIndex)} className={iconButtonClass} title="일차 복제"><Icon name="content_copy" /></button>
                                <button type="button" onClick={() => onRemoveDay(selectedDayIndex)} className={`${iconButtonClass} hover:border-rose-200 hover:text-rose-500`} title="일차 삭제"><Icon name="delete" /></button>
                            </div>
                        </header>

                        <div className="p-5">
                            <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">여행 소개</label>
                            <textarea
                                value={selectedDay.summary || ''}
                                onChange={event => onUpdateDay(selectedDayIndex, 'summary', event.target.value)}
                                rows={3}
                                placeholder="이날의 여행 흐름과 고객에게 전달할 설명을 입력하세요."
                                className={`${inputClass} mt-2 resize-y leading-relaxed`}
                            />

                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black text-slate-900">주요 일정</p>
                                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">시간 없이 방문지와 이동 흐름을 순서대로 구성합니다.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {([
                                        ['sightseeing', 'add_location_alt', '관광 일정'],
                                        ['transport', 'directions_car', '이동'],
                                        ['activity', 'hiking', '체험'],
                                        ['free', 'park', '자유 일정'],
                                    ] as Array<[ActivityType, string, string]>).map(([type, icon, label]) => (
                                        <button key={type} type="button" onClick={() => onAddActivity(selectedDayIndex, type)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 hover:border-[#39C4B7] hover:text-[#0F8F84]">
                                            <span className="material-symbols-outlined text-[16px]">{icon}</span>{label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {selectedDay.activities.map((activity, activityIdx) => (
                                    <article key={activityIdx} className="rounded-2xl border border-slate-200 bg-[#F7FAFA] p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#EAF8F7] text-[#0F8F84]">
                                                <span className="material-symbols-outlined text-[19px]">{TYPE_MAP[activity.type || 'sightseeing']?.icon || 'place'}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
                                                    <select value={activity.type || 'sightseeing'} onChange={event => onUpdateActivity(selectedDayIndex, activityIdx, 'type', event.target.value as ActivityType)} className={inputClass}>
                                                        {ACTIVITY_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                                                    </select>
                                                    <input value={activity.title} onChange={event => onUpdateActivity(selectedDayIndex, activityIdx, 'title', event.target.value)} placeholder="일정 제목" className={`${inputClass} font-black`} />
                                                </div>
                                                <textarea value={activity.description || ''} onChange={event => onUpdateActivity(selectedDayIndex, activityIdx, 'description', event.target.value)} rows={2} placeholder="상세 설명 (선택)" className={`${inputClass} mt-2 resize-y text-xs leading-relaxed`} />
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <button type="button" onClick={() => onPickSpot(selectedDayIndex, activityIdx)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#8FE7DE] bg-white px-2.5 text-[10px] font-black text-[#0F8F84]"><Icon name="location_on" />관광지에서 선택</button>
                                                    <button type="button" onClick={() => onPickHotelActivity(selectedDayIndex, activityIdx)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600"><Icon name="hotel" />호텔에서 선택</button>
                                                    <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600">
                                                        <Icon name="add_photo_alternate" />사진 추가
                                                        <input type="file" accept="image/*" multiple className="hidden" onChange={event => onUploadActivityImages(selectedDayIndex, activityIdx, event.target.files)} />
                                                    </label>
                                                </div>
                                                {(activity.images || []).length > 0 && (
                                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                                        {(activity.images || []).map((image, imageIdx) => (
                                                            <div key={`${image}-${imageIdx}`} className="relative flex-none">
                                                                <img src={image} alt="" className="h-20 w-28 rounded-xl object-cover" />
                                                                <button type="button" onClick={() => onRemoveActivityImage(selectedDayIndex, activityIdx, imageIdx)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white"><Icon name="close" style={{ fontSize: 13 }} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-shrink-0 flex-col gap-1">
                                                <button type="button" onClick={() => onMoveActivity(selectedDayIndex, activityIdx, -1)} disabled={activityIdx === 0} className={iconButtonClass} title="위로"><Icon name="arrow_upward" /></button>
                                                <button type="button" onClick={() => onMoveActivity(selectedDayIndex, activityIdx, 1)} disabled={activityIdx === selectedDay.activities.length - 1} className={iconButtonClass} title="아래로"><Icon name="arrow_downward" /></button>
                                                <button type="button" onClick={() => onRemoveActivity(selectedDayIndex, activityIdx)} className={`${iconButtonClass} hover:border-rose-200 hover:text-rose-500`} title="삭제"><Icon name="delete" /></button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                                {selectedDay.activities.length === 0 && (
                                    <button type="button" onClick={() => onAddActivity(selectedDayIndex, 'sightseeing')} className="w-full rounded-2xl border-2 border-dashed border-[#8FE7DE] py-8 text-xs font-black text-[#0F8F84] hover:bg-[#EAF8F7]">
                                        <Icon name="add_circle" /> 첫 일정 항목 추가
                                    </button>
                                )}
                            </div>

                            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 p-4">
                                    <p className="flex items-center gap-1.5 text-sm font-black text-slate-900"><Icon name="restaurant" />식사 정보</p>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {([
                                            ['breakfast', '조식'],
                                            ['lunch', '중식'],
                                            ['dinner', '석식'],
                                        ] as const).map(([key, label]) => (
                                            <label key={key} className="rounded-xl bg-slate-50 p-2">
                                                <span className="text-[9px] font-black text-slate-400">{label}</span>
                                                <input value={selectedDay.meals?.[key] || ''} onChange={event => onUpdateDay(selectedDayIndex, 'meals', { ...(selectedDay.meals || {}), [key]: event.target.value })} placeholder="미정" className="mt-1 w-full bg-transparent text-xs font-bold text-slate-700 outline-none" />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="flex items-center gap-1.5 text-sm font-black text-slate-900"><Icon name="hotel" />숙소 정보</p>
                                        <button type="button" onClick={() => onPickDayHotel(selectedDayIndex)} className="text-[10px] font-black text-[#0F8F84]">호텔 마스터에서 선택</button>
                                    </div>
                                    <input value={selectedDay.accommodation?.name || ''} onChange={event => onUpdateDay(selectedDayIndex, 'accommodation', { ...(selectedDay.accommodation || {}), name: event.target.value })} placeholder="호텔 또는 게르명" className={`${inputClass} mt-3`} />
                                    {selectedDay.accommodation?.location && <p className="mt-2 text-[10px] font-semibold text-slate-400">{selectedDay.accommodation.location}</p>}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <aside className="overflow-y-auto border-l border-slate-200 bg-white p-4 max-xl:hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">일정 요약</p>
                <div className="mt-3 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">전체 일정</span>
                        <span className="rounded-full bg-[#EAF8F7] px-2 py-1 text-[10px] font-black text-[#0F8F84]">{days.length}일</span>
                    </div>
                    <dl className="mt-4 space-y-3 text-[11px]">
                        <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">주요 일정</dt><dd className="font-black text-slate-700">{days.reduce((sum, day) => sum + day.activities.length, 0)}개</dd></div>
                        <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">숙소 입력</dt><dd className="font-black text-slate-700">{days.filter(day => day.accommodation?.name).length}일</dd></div>
                        <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">식사 입력</dt><dd className="font-black text-slate-700">{days.filter(day => Object.values(day.meals || {}).some(Boolean)).length}일</dd></div>
                    </dl>
                </div>
                {selectedDay && (
                    <div className="mt-4 rounded-2xl border border-[#8FE7DE] bg-[#F7FAFA] p-4">
                        <p className="text-[10px] font-black text-[#0F8F84]">현재 DAY {selectedDay.day}</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{selectedDay.title || '제목 미입력'}</p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">{[selectedDay.date, selectedDay.region].filter(Boolean).join(' · ') || '날짜·지역 미정'}</p>
                        <div className="mt-4 space-y-2">
                            {selectedDay.activities.slice(0, 5).map((activity, index) => (
                                <div key={index} className="flex items-start gap-2 text-[10px] font-semibold text-slate-600">
                                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#39C4B7]" />
                                    <span>{activity.title || '일정 제목 미입력'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
};

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
    const [bulkText, setBulkText] = useState('');
    const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
    // 마스터 picker — 어느 일자에 추가할지(day index) 저장
    // 마스터 picker — 특정 항목(일자 d, 항목 a)을 채움
    const [spotPickerTarget, setSpotPickerTarget] = useState<{ d: number; a: number } | null>(null);
    const [hotelPickerTarget, setHotelPickerTarget] = useState<{ d: number; a: number } | null>(null);
    const [dayHotelTarget, setDayHotelTarget] = useState<number | null>(null);
    // UX 정리: 일정이 만들어지면 붙여넣기 박스를 접고, 항목 추가는 작은 메뉴로
    const [showPasteBox, setShowPasteBox] = useState(false);
    const [addMenuDay, setAddMenuDay] = useState<number | null>(null);
    // 식사 종류(조식/중식/석식) 선택 메뉴 — 어느 일자에서 열렸는지
    const [mealMenuDay, setMealMenuDay] = useState<number | null>(null);
    // 항목별 "상세 설명" 펼침 상태 (key: `${dayIdx}-${actIdx}`)
    const [openDesc, setOpenDesc] = useState<Set<string>>(new Set());
    const toggleDesc = (key: string) => setOpenDesc(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
    });

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

    const resetForm = () => { setForm({ name: '', description: '', days: [], documentSettings: defaultDocumentSettings() }); setEditing(null); setBulkText(''); setQuickDays(4); setEditorMode('itinerary'); setShowAdvancedEditor(false); setShowPasteBox(false); setAddMenuDay(null); };

    const DAY_LABELS_JP = [
        '1日目', '2日目', '3日目', '4日目', '5日目',
        '6日目', '7日目', '8日目', '9日目', '10日目',
    ];

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

    const addActivityToLastDay = () => setForm(f => {
        const days = f.days.length > 0 ? [...f.days] : [{ day: 1, title: '', region: '', activities: [] as Activity[] }];
        const lastIdx = days.length - 1;
        days[lastIdx] = {
            ...days[lastIdx],
            activities: [...days[lastIdx].activities, { time: '', type: 'sightseeing', title: '', description: '' }],
        };
        return { ...f, days };
    });

    const loadBulkSample = () => {
        setBulkText([
            'DAY 1｜ウランバートル到着',
            'モンゴルの旅、はじまりの日。',
            '',
            'チンギスハーン国際空港に到着後、',
            '「MILKYWAY」のサインボードを持った日本語ガイドがお出迎えいたします。',
            '',
            '長時間のフライト後も安心してご移動いただけるよう、',
            '軽食（ハンバーガー・サンドイッチ）をご用意しております。',
            '',
            'スケジュール',
            'チンギスハーン国際空港 到着',
            '日本語ガイド・ドライバーと合流',
            'SIMカード（USIM）購入・両替サポート可能',
            '専用車にてホテルへ移動',
            'ホテルチェックイン・休憩',
            '宿泊',
            'ウランバートル市内 4つ星ホテル（2名1室）',
            '',
            'Day 2 테를지 국립공원',
            '호텔 출발 및 테를지 국립공원 이동',
            '거북바위 관광',
            '현지식 점심',
            '승마 체험',
            '숙박: 게르 캠프',
        ].join('\n'));
    };

    const importBulkText = () => {
        const rawLines = bulkText.split(/\r?\n/);
        if (rawLines.every(line => !line.trim())) {
            alert('붙여넣을 일정표 내용을 입력해 주세요.');
            return;
        }

        const parsedDays: TemplateDay[] = [];
        let currentDay: TemplateDay | null = null;
        let section: 'intro' | 'schedule' | 'stay' = 'intro';
        let introLines: string[] = [];

        const flushIntro = () => {
            if (!currentDay) return;
            const cleaned = introLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
            if (cleaned) {
                currentDay.summary = [currentDay.summary, cleaned].filter(Boolean).join('\n\n');
            }
            introLines = [];
        };

        const commitDay = () => {
            flushIntro();
            if (currentDay) parsedDays.push(currentDay);
            currentDay = null;
            section = 'intro';
        };

        rawLines.forEach(rawLine => {
            const line = rawLine.trim();
            if (!line) {
                if (section === 'intro' && introLines.length > 0 && introLines[introLines.length - 1] !== '') {
                    introLines.push('');
                }
                return;
            }

            const dayMatch = line.match(/^(?:day|d)\s*[-\s]*(\d+)\s*(?:[|｜:.)-]\s*)?(.*)$/i) || line.match(/^(\d+)\s*일차\s*[:.)-]?\s*(.*)$/);
            if (dayMatch) {
                commitDay();
                currentDay = { day: parsedDays.length + 1, title: dayMatch[2]?.trim() || '', region: '', summary: '', activities: [], meals: {}, accommodation: null };
                section = 'intro';
                return;
            }

            if (!currentDay) {
                currentDay = { day: 1, title: '', region: '', summary: '', activities: [], meals: {}, accommodation: null };
            }

            if (/^(スケジュール|일정|schedule)$/i.test(line)) {
                flushIntro();
                section = 'schedule';
                return;
            }

            if (/^(宿泊|숙박|hotel|stay)$/i.test(line)) {
                flushIntro();
                section = 'stay';
                return;
            }

            const stayMatch = line.match(/^(숙박|宿泊|hotel|stay)\s*[:：]\s*(.+)$/i);
            if (stayMatch) {
                flushIntro();
                const title = stayMatch[2].trim();
                currentDay.accommodation = { name: title };
                return;
            }

            const mealMatch = line.match(/^(조식|아침|朝食|breakfast|중식|점심|昼食|lunch|석식|저녁|夕食|dinner)\s*[:：｜|-]\s*(.+)$/i);
            if (mealMatch) {
                flushIntro();
                const key = /조식|아침|朝食|breakfast/i.test(mealMatch[1])
                    ? 'breakfast'
                    : /중식|점심|昼食|lunch/i.test(mealMatch[1])
                        ? 'lunch'
                        : 'dinner';
                currentDay.meals = { ...(currentDay.meals || {}), [key]: mealMatch[2].trim() };
                return;
            }

            const activityMatch = line.match(/^(\d{1,2}:\d{2})\s+(.+?)(?:\s*[-–]\s*(.+))?$/);
            if (activityMatch) {
                flushIntro();
                const title = activityMatch[2].trim();
                const description = activityMatch[3]?.trim() || '';
                currentDay.activities.push({
                    time: '',
                    type: inferActivityType(`${title} ${description}`),
                    title,
                    description,
                });
                return;
            }

            if (section === 'stay') {
                currentDay.accommodation = { name: line };
                return;
            }

            if (section === 'schedule') {
                currentDay.activities.push({ time: '', type: inferActivityType(line), title: line, description: '' });
                return;
            }

            if (!currentDay.title) {
                currentDay.title = line;
            } else {
                introLines.push(line);
            }
        });

        commitDay();
        const days = parsedDays.map((day, idx) => ({ ...day, day: idx + 1 }));
        setForm(f => ({ ...f, days }));
        setShowAdvancedEditor(false);
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
    // 식사 항목 추가 — 일본어 식사명(朝食/昼食/夕食)을 제목에 미리 넣고 뒤에 음식명 입력
    const addMeal = (dayIdx: number, jp: string) => setForm(f => {
        const d = [...f.days];
        d[dayIdx] = { ...d[dayIdx], activities: [...d[dayIdx].activities, { time: '', type: 'meal' as ActivityType, title: `${jp} ｜ `, description: '' }] };
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
    const sortByTime = (dayIdx: number) => setForm(f => {
        const acts = [...f.days[dayIdx].activities].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
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

    const handleEdit = (t: ItineraryTemplate) => { setEditing(t); setForm({ name: t.name, description: t.description, days: t.days, documentSettings: mergeDocumentSettings(t.documentSettings) }); setEditorMode('itinerary'); setShowAdvancedEditor(false); setIsModalOpen(true); };
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
        setShowAdvancedEditor(false);
        setIsModalOpen(true);
    };

    const closeEditor = () => {
        if (form.name || form.days.length > 0) {
            if (!confirm('편집 중인 내용이 사라집니다. 닫으시겠습니까?')) return;
        }
        setIsModalOpen(false); resetForm();
    };

    return (
        <div>
            <div className="toolbar">
                <div style={{ minWidth: 0 }}>
                    <div className="cell-strong" style={{ fontSize: 14 }}>고객에게 발송할 여행 문서 디자인을 만듭니다.</div>
                    <div className="cell-muted" style={{ fontSize: 12.5, marginTop: 2 }}>일정 내용은 문서 안에 들어가고, 고객 화면은 여행 개요·계약서·상세 일정·공통 안내 패키지로 구성됩니다.</div>
                </div>
                <div className="spacer" />
                <button className="btn btn-ink" onClick={() => { resetForm(); setIsModalOpen(true); }}>
                    <Icon name="add" /> 문서 템플릿 추가
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
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0F8F84]/95 via-[#0F8F84]/65 to-transparent" />
                                <div className="absolute left-5 top-4 text-white">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[24px]">landscape</span>
                                        <div>
                                            <p className="text-[11px] font-black">モンゴル銀河旅行社</p>
                                            <p className="text-[8px] font-bold tracking-widest text-white/70">DOCUMENT PACKAGE</p>
                                        </div>
                                    </div>
                                    <h3 className="mt-4 max-w-[420px] truncate text-xl font-black tracking-tight">{t.name}</h3>
                                    {t.description && <p className="mt-1 max-w-[420px] truncate text-xs font-semibold text-white/80">{t.description}</p>}
                                </div>
                                <span className="absolute right-4 top-4 rounded-xl bg-white/90 px-3 py-1 text-xs font-black text-[#0F8F84] shadow-sm">{Math.max(0, t.days.length - 1)}박{t.days.length}일</span>
                            </div>

                            <div className="card-pad">
                                <div className="mb-4 grid grid-cols-4 gap-2">
                                    {[
                                        { icon: 'article', label: '개요' },
                                        { icon: 'contract', label: '계약서' },
                                        { icon: 'route', label: '상세일정' },
                                        { icon: 'qr_code_2', label: '안내/QR' },
                                    ].map(item => (
                                        <div key={item.label} className="rounded-xl border border-[#8FE7DE]/80 bg-[#F7FAFA] px-2 py-2 text-center text-[#0F8F84]">
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
                                                <span className="flex h-7 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#39C4B7]/15 text-[11px] font-black text-[#0F8F84]">{d.day}일</span>
                                                <span className="truncate font-semibold">{d.region ? `${d.region} · ` : ''}{d.title || '제목 없음'}</span>
                                                <span className="flex-shrink-0 text-slate-300">({d.activities.length})</span>
                                            </div>
                                        ))}
                                        {t.days.length > 3 && <p className="pl-11 text-xs text-slate-400">+ {t.days.length - 3}일 더...</p>}
                                    </div>
                                </div>

                                <div className="row" style={{ gap: 8 }}>
                                    <button onClick={() => handleEdit(t)} className="btn btn-ink" style={{ flex: 1 }}>문서 디자인 수정</button>
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

            {isModalOpen && (
                <div className="fixed inset-0 z-50 p-3 sm:p-6" style={{ background: 'rgba(26,27,30,0.42)', backdropFilter: 'blur(2px)' }}>
                    <div className="bg-white rounded-2xl w-full h-full flex flex-col overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>

                        {/* Sticky header */}
                        <div className="bg-white px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button onClick={closeEditor} className="act-btn" title="닫기">
                                    <Icon name="arrow_back" />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <div className="eyebrow" style={{ marginBottom: 2 }}><span className="dot" />{editing ? '템플릿 수정' : '새 템플릿'}</div>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="템플릿 이름 (예: 고비사막 4박5일 기본형)"
                                        className="w-full text-lg font-bold bg-transparent text-slate-900 focus:outline-none placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={closeEditor} className="btn btn-ghost">취소</button>
                                <button onClick={handleSubmit} className="btn btn-ink">
                                    <Icon name="check" />{editing ? '저장' : '생성'}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                            <div className="inline-flex rounded-xl bg-slate-100 p-1">
                                <button
                                    type="button"
                                    onClick={() => setEditorMode('itinerary')}
                                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-black transition ${editorMode === 'itinerary' ? 'bg-white text-[#0F8F84] shadow-sm' : 'text-slate-500'}`}
                                >
                                    <Icon name="route" />일정 구성
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditorMode('documents')}
                                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-black transition ${editorMode === 'documents' ? 'bg-white text-[#0F8F84] shadow-sm' : 'text-slate-500'}`}
                                >
                                    <Icon name="description" />문서 디자인
                                </button>
                            </div>
                            <p className="hidden text-[11px] font-semibold text-slate-400 md:block">
                                {editorMode === 'itinerary' ? '상품관리 일정탭 방식으로 고객용 일정을 구성합니다.' : '일정표 표지, 계약서와 공통 안내 문구를 편집합니다.'}
                            </p>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            {editorMode === 'itinerary' ? (
                                <ProductStyleItineraryEditor
                                    days={form.days}
                                    quickDays={quickDays}
                                    onQuickDaysChange={setQuickDays}
                                    onCreateSkeleton={() => createBlankDays()}
                                    onAddDay={addDay}
                                    onUpdateDay={updateDay}
                                    onMoveDay={moveDay}
                                    onDuplicateDay={duplicateDay}
                                    onRemoveDay={removeDay}
                                    onAddActivity={addActivityTyped}
                                    onUpdateActivity={updateActivity}
                                    onMoveActivity={moveActivity}
                                    onRemoveActivity={removeActivity}
                                    onRemoveActivityImage={removeActivityImage}
                                    onUploadActivityImages={uploadActivityImages}
                                    onPickSpot={(d, a) => setSpotPickerTarget({ d, a })}
                                    onPickHotelActivity={(d, a) => setHotelPickerTarget({ d, a })}
                                    onPickDayHotel={setDayHotelTarget}
                                />
                            ) : (
                            <div className="h-full overflow-hidden bg-white">
                                <TemplatePreview
                                    name={form.name}
                                    description={form.description}
                                    days={form.days}
                                    documentSettings={form.documentSettings}
                                    onNameChange={(value) => setForm(f => ({ ...f, name: value }))}
                                    onDescriptionChange={(value) => setForm(f => ({ ...f, description: value }))}
                                    onDocSection={updateDocSection}
                                    onIncluded={updateIncluded}
                                    onCancellation={updateCancellation}
                                    onGuideNotice={updateGuideNotice}
                                    onDayChange={(d, field, v) => updateDay(d, field, v)}
                                    onActivityChange={(d, a, field, v) => field === 'time' ? updateActivity(d, a, 'time', v) : updateActivityText(d, a, field, v)}
                                    onAddDay={addDay}
                                    onAddActivity={(d) => addActivity(d)}
                                    onRemoveDay={removeDay}
                                    onRemoveActivity={removeActivity}
                                    onDayActivitiesText={(d, text) => setForm(f => {
                                        const days = [...f.days];
                                        days[d] = { ...days[d], activities: parseDayActivitiesText(text) };
                                        return { ...f, days };
                                    })}
                                    onPickSpot={(d, a) => setSpotPickerTarget({ d, a })}
                                    onPickHotel={(d) => setDayHotelTarget(d)}
                                    defaultPage="overview"
                                    visiblePages={['overview', 'contract', 'guide']}
                                />
                            </div>
                            )}
                        </div>
                    </div>

                    {/* 마스터 picker — 선택 시 해당 항목의 제목·설명을 채움 */}
                    <TouristSpotPickerModal
                        open={spotPickerTarget !== null}
                        onClose={() => setSpotPickerTarget(null)}
                        onPick={(spot) => {
                            if (spotPickerTarget) fillItemFromSpot(spotPickerTarget.d, spotPickerTarget.a, spot);
                            setSpotPickerTarget(null);
                        }}
                    />
                    <HotelPickerModal
                        open={hotelPickerTarget !== null || dayHotelTarget !== null}
                        onClose={() => { setHotelPickerTarget(null); setDayHotelTarget(null); }}
                        onPick={(hotel) => {
                            if (dayHotelTarget !== null) fillDayFromHotel(dayHotelTarget, hotel);
                            else if (hotelPickerTarget) fillItemFromHotel(hotelPickerTarget.d, hotelPickerTarget.a, hotel);
                            setHotelPickerTarget(null);
                            setDayHotelTarget(null);
                        }}
                    />
                </div>
            )}
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
