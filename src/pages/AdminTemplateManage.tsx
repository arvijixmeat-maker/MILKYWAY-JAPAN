import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
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
export interface TemplateDay { day: number; title: string; region?: string; activities: Activity[]; }
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
        return { time: m ? m[1] : '', type: inferTypeForText(title), title, description: '' };
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
    onDayChange: (dayIdx: number, field: 'title' | 'region', value: string) => void;
    onActivityChange: (dayIdx: number, actIdx: number, field: 'time' | 'title' | 'description', value: string) => void;
    onAddDay: () => void;
    onAddActivity: (dayIdx: number) => void;
    onRemoveDay: (dayIdx: number) => void;
    onRemoveActivity: (dayIdx: number, actIdx: number) => void;
    onDayActivitiesText?: (dayIdx: number, text: string) => void;
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
};

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ name, description, days, documentSettings, customer, onNameChange, onDescriptionChange, onDocSection, onIncluded, onCancellation, onGuideNotice, onDayChange, onActivityChange, onAddDay, onAddActivity, onRemoveDay, onRemoveActivity, onDayActivitiesText }) => {
    const [activePage, setActivePage] = useState<'overview' | 'contract' | 'detail' | 'guide'>('overview');
    const [textDays, setTextDays] = useState<Set<number>>(new Set());
    const toggleTextDay = (i: number) => setTextDays(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
    const totalDays = days.length;
    const nights = Math.max(0, totalDays - 1);
    const settings = mergeDocumentSettings(documentSettings);
    const peopleCount = customer?.peopleCount || 2;
    const samplePrice = (customer?.totalAmount && peopleCount) ? Math.round(customer.totalAmount / peopleCount) : (Number(settings.overview.pricePerPerson || 0) || 128000);
    const sampleTotal = customer?.totalAmount ?? samplePrice * peopleCount;
    const sampleDeposit = customer?.deposit ?? Math.floor(sampleTotal * 0.1);
    const sampleLocal = customer?.localAmount ?? (sampleTotal - sampleDeposit);
    const tripLength = customer?.tripLength || `${nights}泊${totalDays || 0}日`;
    const pages = [
        { id: 'overview' as const, label: '日程表', icon: 'article' },
        { id: 'contract' as const, label: '契約書', icon: 'contract' },
        { id: 'detail' as const, label: '詳細', icon: 'route' },
        { id: 'guide' as const, label: '案内', icon: 'info' },
    ];
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
            <div className="border-b border-[#8FE7DE]/60 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
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
            </div>
            {customer ? (
                <div className="flex items-center gap-1.5 border-b border-teal-200 bg-teal-50 px-4 py-2 text-[11px] font-bold text-[#0F8F84] dark:border-teal-800 dark:bg-teal-900/20">
                    <span className="material-symbols-outlined text-[15px]">person</span>
                    {customer.name || '고객'}님 문서 — 고객 정보·금액이 자동 반영되었습니다
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
                    <div className="p-5"><h4 className="mb-2 flex items-center gap-1.5 text-sm font-black text-[#0F8F84]"><span className="material-symbols-outlined text-base">check_circle</span>ご旅行概要</h4><textarea value={settings.overview.intro} onChange={e => onDocSection('overview', { intro: e.target.value })} rows={3} className={`${fieldClass} mb-3 resize-none text-[11px] font-semibold leading-relaxed text-slate-500`} /><div className="overflow-hidden rounded-xl border border-[#8FE7DE] text-xs">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[112px_1fr] border-b border-[#8FE7DE] last:border-b-0"><div className="bg-[#F7FAFA] px-3 py-2 font-black text-[#0F8F84]">{label}</div><div className="px-3 py-2 font-semibold text-slate-700">{value}</div></div>)}</div>
                    <div className="mt-4 grid grid-cols-2 gap-3"><div><h4 className="mb-1 text-sm font-black text-[#0F8F84]">含まれているもの</h4><textarea value={settings.overview.includedText} onChange={e => onDocSection('overview', { includedText: e.target.value })} rows={5} className={`${fieldClass} resize-none text-[11px] font-semibold leading-relaxed text-slate-600`} placeholder="1行に1項目" /></div><div><h4 className="mb-1 text-sm font-black text-slate-500">含まれないもの</h4><textarea value={settings.overview.excludedText} onChange={e => onDocSection('overview', { excludedText: e.target.value })} rows={5} className={`${fieldClass} resize-none text-[11px] font-semibold leading-relaxed text-slate-600`} placeholder="1行に1項目" /></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-[#8FE7DE] bg-white p-3 text-center"><p className="text-[9px] font-black text-slate-400">参加人数</p><p className="text-base font-black text-slate-700">{peopleCount}名</p></div><div className="rounded-xl bg-gradient-to-br from-[#0F8F84] to-[#39C4B7] p-3 text-center text-white"><p className="text-[9px] font-black">ご請求金額（合計）</p><p className="text-xl font-black">{sampleTotal.toLocaleString()}円</p></div></div><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-xl border border-[#39C4B7] bg-[#EAF8F7] p-3 text-center"><p className="text-[9px] font-black text-[#0F8F84]">ご予約金（お申込時にお支払い）</p><p className="text-lg font-black text-[#0F8F84]">{sampleDeposit.toLocaleString()}円</p></div><div className="rounded-xl border border-[#8FE7DE] bg-white p-3 text-center"><p className="text-[9px] font-black text-slate-400">現地払い残金</p><p className="text-lg font-black text-slate-700">{sampleLocal.toLocaleString()}円</p></div></div></div>
                </Frame>}
                {activePage === 'contract' && <Frame><div className="p-5"><div className="mb-5 flex items-start justify-between"><div className="text-[#0F8F84]"><p className="text-[12px] font-black">モンゴル銀河旅行社</p><p className="text-[8px] font-bold tracking-widest">MILKYWAY JAPAN</p></div><div className="rounded-lg bg-[#39C4B7]/10 px-3 py-2 text-[9px] font-black text-[#0F8F84]">契約日：2026年6月4日</div></div><h3 className="text-center text-[30px] font-black tracking-[0.18em] text-[#0F8F84]">ご旅行契約書</h3><p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">Travel Contract</p><textarea value={settings.contract.intro} onChange={e => onDocSection('contract', { intro: e.target.value })} rows={3} className={`${fieldClass} mx-auto mt-4 block max-w-[520px] resize-none text-center text-[11px] font-semibold leading-relaxed text-slate-500`} /><div className="mt-5 overflow-hidden rounded-xl border border-[#8FE7DE] text-xs">{[['ご旅行名', name || '銀河・大自然パッケージ'], ['ご旅行期間', tripLength], ['旅行代金', `${samplePrice.toLocaleString()}円（一人）`], ['合計金額', `${sampleTotal.toLocaleString()}円`], ['ガイド', '日本語ガイドが全日程同行します']].map(([label, value]) => <div key={label} className="grid grid-cols-[112px_1fr] border-b border-[#8FE7DE] last:border-b-0"><div className="bg-[#F7FAFA] px-3 py-2 font-black text-[#0F8F84]">{label}</div><div className="px-3 py-2 font-semibold text-slate-700">{value}</div></div>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#8FE7DE] p-3"><p className="text-xs font-black text-[#0F8F84]">キャンセル規定</p><div className="mt-2 space-y-1">{settings.contract.cancellationRows.slice(0, 5).map((row, idx) => <div key={idx} className="grid grid-cols-[1fr_90px] gap-1"><input value={row.period} onChange={e => onCancellation(idx, 'period', e.target.value)} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /><input value={row.fee} onChange={e => onCancellation(idx, 'fee', e.target.value)} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /></div>)}</div></div><div className="rounded-xl border border-[#8FE7DE] p-3"><p className="text-xs font-black text-[#0F8F84]">お支払い</p><input value={settings.contract.paymentMethod} onChange={e => onDocSection('contract', { paymentMethod: e.target.value })} className={`${fieldClass} mt-2 text-[10px] font-semibold text-slate-500`} /><input value={settings.contract.paymentDeadline} onChange={e => onDocSection('contract', { paymentDeadline: e.target.value })} className={`${fieldClass} mt-1 text-[10px] font-semibold text-slate-500`} /><textarea value={settings.contract.bankInfo} onChange={e => onDocSection('contract', { bankInfo: e.target.value })} rows={3} placeholder="振込先・お支払い案内（自由入力）" className={`${fieldClass} mt-1 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><div className="mt-4 border-b border-slate-300 pb-1 text-[10px] text-slate-400">旅行者署名</div></div></div></div></Frame>}
                {activePage === 'detail' && <Frame><div className="p-5"><div className="mb-5 flex items-center justify-between"><input value={settings.detail.title} onChange={e => onDocSection('detail', { title: e.target.value })} className={`${fieldClass} text-[24px] font-black tracking-[0.12em] text-[#0F8F84]`} /><span className="rounded-full bg-[#39C4B7]/10 px-3 py-1 text-xs font-black text-[#0F8F84]">{totalDays || 0}日間</span></div>
                    <div className="space-y-3">{days.map((day, dayIdx) => { const inText = textDays.has(dayIdx); return (<div key={dayIdx} className="grid grid-cols-[64px_1fr] gap-3">
                        <div className="flex flex-col items-center rounded-xl bg-gradient-to-b from-[#0F8F84] to-[#39C4B7] px-2 py-4 text-center text-white"><p className="text-[10px] font-black">DAY {day.day}</p><p className="mt-1 text-[11px] font-bold">{day.day}日目</p><button onClick={() => onRemoveDay(dayIdx)} className="mt-2 text-white/60 hover:text-white" title="이 일차 삭제"><span className="material-symbols-outlined text-[15px]">delete</span></button></div>
                        <div className="rounded-xl border border-[#8FE7DE] p-3">
                            <input value={day.title} onChange={e => onDayChange(dayIdx, 'title', e.target.value)} placeholder={`${day.day}日目のタイトル`} className={`${fieldClass} text-sm font-black text-[#0F8F84]`} />
                            <input value={day.region || ''} onChange={e => onDayChange(dayIdx, 'region', e.target.value)} placeholder="地域（例：ウランバートル）" className={`${fieldClass} mt-0.5 text-[10px] font-semibold text-slate-400`} />
                            <div className="mt-2 flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">スケジュール</span>{onDayActivitiesText && <button onClick={() => toggleTextDay(dayIdx)} className="text-[10px] font-bold text-[#0F8F84] hover:text-[#0a7d6a]">{inText ? '↩ 칸별 편집' : '✎ 텍스트로 한번에'}</button>}</div>
                            {inText && onDayActivitiesText ? (
                                <textarea value={day.activities.map(a => `${a.time ? a.time + ' ' : ''}${a.title}`).join('\n')} onChange={e => onDayActivitiesText(dayIdx, e.target.value)} rows={Math.max(4, day.activities.length + 1)} placeholder={'09:00 ウランバートル到着\n12:00 昼食\n宿泊：ホテル\n(한 줄에 한 항목, 맨 앞에 시간 선택)'} className={`${fieldClass} mt-1 resize-y text-[11px] font-semibold leading-relaxed text-slate-700`} />
                            ) : (
                                <div className="relative mt-1 border-l-2 border-dashed border-[#8FE7DE] pl-4">{day.activities.map((activity, index) => <div key={index} className="relative pb-1.5 last:pb-0"><span className="absolute -left-[23px] top-2 h-3 w-3 rounded-full bg-[#0F8F84] ring-2 ring-white" /><div className="flex items-center gap-1"><input value={activity.time || ''} onChange={e => onActivityChange(dayIdx, index, 'time', e.target.value)} placeholder="--:--" className={`${fieldClass} w-[58px] font-mono text-[11px] font-bold text-slate-400`} /><input value={activity.title} onChange={e => onActivityChange(dayIdx, index, 'title', e.target.value)} placeholder="項目名（例：亀石 観光）" className={`${fieldClass} flex-1 text-[11px] font-semibold text-slate-700`} /><button onClick={() => onRemoveActivity(dayIdx, index)} className="shrink-0 text-slate-300 hover:text-red-500" title="삭제"><span className="material-symbols-outlined text-[15px]">close</span></button></div></div>)}
                                    <button onClick={() => onAddActivity(dayIdx)} className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-black text-[#0F8F84] hover:text-[#0a7d6a]"><span className="material-symbols-outlined text-[14px]">add</span>項目を追加</button>
                                </div>
                            )}
                        </div>
                    </div>); })}
                        {days.length === 0 && <p className="rounded-xl border border-dashed border-[#8FE7DE] py-6 text-center text-[11px] font-bold text-slate-400">아래 「日程（DAY）を追加」로 일정을 시작하세요.</p>}
                        <button onClick={onAddDay} className="w-full rounded-xl border-2 border-dashed border-[#8FE7DE] py-3 text-xs font-black text-[#0F8F84] transition-colors hover:bg-[#EAF8F7]"><span className="material-symbols-outlined align-middle text-[16px]">add</span> 日程（DAY）を追加</button>
                    </div>
                    <textarea value={settings.detail.note} onChange={e => onDocSection('detail', { note: e.target.value })} rows={2} className={`${fieldClass} mt-4 resize-none text-[11px] font-semibold leading-relaxed text-slate-500`} /></div></Frame>}
                {activePage === 'guide' && <Frame><div className="grid gap-4 p-5 sm:grid-cols-2"><div className="rounded-xl border border-[#8FE7DE] p-4"><h3 className="text-sm font-black text-[#0F8F84]">ご案内・ご注意事項</h3>{settings.guide.notices.slice(0, 5).map((item, idx) => <div key={idx} className="mt-3 flex gap-2"><span className="material-symbols-outlined text-[20px] text-[#0F8F84]">info</span><div className="flex-1"><input value={item.title} onChange={e => onGuideNotice(idx, 'title', e.target.value)} className={`${fieldClass} text-xs font-black text-[#0F8F84]`} /><textarea value={item.body} onChange={e => onGuideNotice(idx, 'body', e.target.value)} rows={2} className={`${fieldClass} mt-1 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /></div></div>)}</div><div className="rounded-xl border border-[#8FE7DE] p-4"><h3 className="text-sm font-black text-[#0F8F84]">旅行条件（要約）</h3><textarea value={settings.guide.conditions} onChange={e => onDocSection('guide', { conditions: e.target.value })} rows={4} className={`${fieldClass} mt-2 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><h3 className="mt-5 text-sm font-black text-[#0F8F84]">旅行代金のお支払い</h3><textarea value={settings.guide.paymentInfo} onChange={e => onDocSection('guide', { paymentInfo: e.target.value })} rows={3} className={`${fieldClass} mt-2 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><h3 className="mt-5 text-sm font-black text-[#0F8F84]">担当ガイド</h3><input value={settings.guide.guideName} onChange={e => onDocSection('guide', { guideName: e.target.value })} placeholder="ガイド氏名" className={`${fieldClass} mt-2 text-[10px] font-semibold text-slate-500`} /><input value={settings.guide.guidePhone} onChange={e => onDocSection('guide', { guidePhone: e.target.value })} placeholder="ガイド連絡先（電話）" className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /><h3 className="mt-5 text-sm font-black text-[#0F8F84]">宿泊先のご案内</h3><textarea value={settings.guide.accommodationInfo} onChange={e => onDocSection('guide', { accommodationInfo: e.target.value })} rows={3} placeholder="確定した宿泊先（1行に1泊）" className={`${fieldClass} mt-2 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><h3 className="mt-5 text-sm font-black text-[#0F8F84]">緊急連絡先</h3><input value={settings.guide.emergencyPhone} onChange={e => onDocSection('guide', { emergencyPhone: e.target.value })} className={`${fieldClass} mt-2 text-[10px] font-semibold text-slate-500`} /><input value={settings.guide.emergencyEmail} onChange={e => onDocSection('guide', { emergencyEmail: e.target.value })} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /></div></div><div className="relative h-[104px] overflow-hidden"><img src={mongoliaHero} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-transparent" /><input value={settings.guide.closingMessage} onChange={e => onDocSection('guide', { closingMessage: e.target.value })} className={`${fieldClass} absolute left-5 top-7 max-w-[360px] text-sm font-black text-[#0F8F84]`} /><div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-[#0F8F84] px-5 py-2 text-[10px] font-bold text-white"><span>モンゴル銀河旅行社</span><span>{settings.guide.emergencyEmail}</span></div></div></Frame>}
            </div>
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
    const [bulkText, setBulkText] = useState('');
    const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
    // 마스터 picker — 어느 일자에 추가할지(day index) 저장
    // 마스터 picker — 특정 항목(일자 d, 항목 a)을 채움
    const [spotPickerTarget, setSpotPickerTarget] = useState<{ d: number; a: number } | null>(null);
    const [hotelPickerTarget, setHotelPickerTarget] = useState<{ d: number; a: number } | null>(null);
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

    const resetForm = () => { setForm({ name: '', description: '', days: [], documentSettings: defaultDocumentSettings() }); setEditing(null); setBulkText(''); setQuickDays(4); setShowAdvancedEditor(false); setShowPasteBox(false); setAddMenuDay(null); };

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
                region: f.days[idx]?.region || '',
                activities: f.days[idx]?.activities || [],
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
            '09:00 호텔 출발 - 테를지 국립공원 이동',
            '11:00 거북바위 관광',
            '13:00 현지식 점심',
            '15:00 승마 체험',
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
                const [titleLine, ...rest] = cleaned.split('\n');
                currentDay.activities.push({
                    time: '',
                    type: 'other',
                    title: titleLine,
                    description: rest.join('\n').trim(),
                });
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
                currentDay = { day: parsedDays.length + 1, title: dayMatch[2]?.trim() || '', region: '', activities: [] };
                section = 'intro';
                return;
            }

            if (!currentDay) {
                currentDay = { day: 1, title: '', region: '', activities: [] };
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
                currentDay.activities.push({ time: '', type: 'checkin', title, description: '숙박' });
                return;
            }

            const activityMatch = line.match(/^(\d{1,2}:\d{2})\s+(.+?)(?:\s*[-–]\s*(.+))?$/);
            if (activityMatch) {
                flushIntro();
                const title = activityMatch[2].trim();
                const description = activityMatch[3]?.trim() || '';
                currentDay.activities.push({
                    time: activityMatch[1],
                    type: inferActivityType(`${title} ${description}`),
                    title,
                    description,
                });
                return;
            }

            if (section === 'stay') {
                currentDay.activities.push({ time: '', type: 'checkin', title: line, description: '宿泊' });
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
    const addDay = () => setForm(f => ({ ...f, days: [...f.days, { day: f.days.length + 1, title: '', region: '', activities: [] }] }));
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
        const copy = { ...src, activities: src.activities.map(a => ({ ...a })) };
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
    const removeActivity = (dayIdx: number, actIdx: number) => setForm(f => { const d = [...f.days]; d[dayIdx].activities = d[dayIdx].activities.filter((_, i) => i !== actIdx); return { ...f, days: d }; });
    const removeActivityImage = (dayIdx: number, actIdx: number, imgIdx: number) => setForm(f => {
        const d = [...f.days];
        const acts = [...d[dayIdx].activities];
        acts[actIdx] = { ...acts[actIdx], images: (acts[actIdx].images || []).filter((_, i) => i !== imgIdx) };
        d[dayIdx] = { ...d[dayIdx], activities: acts };
        return { ...f, days: d };
    });
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

    const handleEdit = (t: ItineraryTemplate) => { setEditing(t); setForm({ name: t.name, description: t.description, days: t.days, documentSettings: mergeDocumentSettings(t.documentSettings) }); setShowAdvancedEditor(false); setIsModalOpen(true); };
    const handleDelete = async (id: string) => { if (!confirm('삭제하시겠습니까?')) return; try { await api.itineraryTemplates.delete(id); await load(); } catch (e: any) { alert('삭제 실패'); } };
    const handleDuplicate = (t: ItineraryTemplate) => {
        setEditing(null);
        setForm({
            name: `${t.name} (복사본)`,
            description: t.description,
            documentSettings: mergeDocumentSettings(t.documentSettings),
            days: t.days.map(d => ({ ...d, activities: d.activities.map(a => ({ ...a })) })),
        });
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">고객에게 발송할 여행 문서 디자인을 만듭니다.</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">일정 내용은 문서 안에 들어가고, 고객 화면은 여행 개요·계약서·상세 일정·공통 안내 패키지로 구성됩니다.</p>
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-sm">add</span> 문서 템플릿 추가
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <span className="material-symbols-outlined text-5xl mb-2">event_note</span>
                    <p>등록된 템플릿이 없습니다</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(t => (
                        <div key={t.id} className="overflow-hidden rounded-2xl border border-[#8FE7DE]/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-teal-500/20 dark:bg-slate-800">
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

                            <div className="p-5">
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

                                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
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

                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(t)} className="flex-1 rounded-xl bg-[#39C4B7] py-2 text-sm font-black text-white transition-colors hover:bg-[#0F8F84]">문서 디자인 수정</button>
                                    <button onClick={() => handleDuplicate(t)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600" title="이 템플릿 복제">
                                        <span className="material-symbols-outlined text-sm">content_copy</span>
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-500 transition-colors hover:bg-red-100" title="삭제">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 p-3 sm:p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl">

                        {/* Sticky header */}
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button onClick={closeEditor} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{editing ? '템플릿 수정' : '새 템플릿'}</p>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="템플릿 이름 (예: 고비사막 4박5일 기본형)"
                                        className="w-full text-lg font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={closeEditor} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">취소</button>
                                <button onClick={handleSubmit} className="px-5 py-2 text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-lg inline-flex items-center gap-1.5 shadow-md shadow-teal-500/20">
                                    <span className="material-symbols-outlined text-base">check</span>{editing ? '저장' : '생성'}
                                </button>
                            </div>
                        </div>

                        {/* Body: editor + preview */}
                        <div className="flex-1 overflow-hidden">

{/* Live preview */}
                            <div className="h-full overflow-hidden bg-white dark:bg-slate-900">
                                <TemplatePreview name={form.name} description={form.description} days={form.days} documentSettings={form.documentSettings} onNameChange={(value) => setForm(f => ({ ...f, name: value }))} onDescriptionChange={(value) => setForm(f => ({ ...f, description: value }))} onDocSection={updateDocSection} onIncluded={updateIncluded} onCancellation={updateCancellation} onGuideNotice={updateGuideNotice} onDayChange={(d, field, v) => updateDay(d, field, v)} onActivityChange={(d, a, field, v) => field === 'time' ? updateActivity(d, a, 'time', v) : updateActivityText(d, a, field, v)} onAddDay={addDay} onAddActivity={(d) => addActivity(d)} onRemoveDay={removeDay} onRemoveActivity={removeActivity} onDayActivitiesText={(d, text) => setForm(f => { const days = [...f.days]; days[d] = { ...days[d], activities: parseDayActivitiesText(text) }; return { ...f, days }; })} />
                            </div>
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
                        open={hotelPickerTarget !== null}
                        onClose={() => setHotelPickerTarget(null)}
                        onPick={(hotel) => {
                            if (hotelPickerTarget) fillItemFromHotel(hotelPickerTarget.d, hotelPickerTarget.a, hotel);
                            setHotelPickerTarget(null);
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
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">가이드를 등록하고 관리합니다.</p>
                    {pendingCount > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">승인대기 {pendingCount}</span>}
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-sm">add</span> 가이드 등록
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {guides.map(g => (
                    <div key={g.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-[72px_1fr_auto] gap-4 items-center">
                        <div className="relative w-18 h-18 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0" style={{ width: 72, height: 72 }}>
                            {g.image ? <img src={g.image} alt={g.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-3xl text-slate-300">person</span></div>}
                            {g.status === 'pending' && <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded">대기</span>}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-bold text-slate-800 dark:text-white truncate">{g.name}</h3>
                                {g.experienceYears > 0 && <span className="text-[11px] text-slate-500 inline-flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">workspace_premium</span>{g.experienceYears}년</span>}
                                <span className="text-[11px] text-slate-400 font-mono inline-flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">phone</span>{g.phone}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">{g.introduction || '소개글 없음'}</p>
                            {g.languages.length > 0 && <div className="flex flex-wrap gap-1">{g.languages.map(l => <span key={l} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-semibold rounded">{l}</span>)}</div>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {g.status === 'pending' && <button onClick={() => handleApprove(g)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold">승인</button>}
                            <button onClick={() => { setEditing(g); setForm({ name: g.name, image: g.image, introduction: g.introduction, phone: g.phone, experienceYears: g.experienceYears, languages: g.languages, specialties: g.specialties }); setIsModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" title="수정"><span className="material-symbols-outlined text-base">edit</span></button>
                            <button onClick={() => handleDelete(g.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500" title="삭제"><span className="material-symbols-outlined text-base">delete</span></button>
                        </div>
                    </div>
                ))}
                {guides.length === 0 && <div className="col-span-full text-center py-20 text-slate-400"><span className="material-symbols-outlined text-5xl mb-2">person_off</span><p>등록된 가이드가 없습니다</p></div>}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 dark:text-white">{editing ? '가이드 수정' : '가이드 등록'}</h2>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }}><span className="material-symbols-outlined text-slate-400">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    {form.image ? <img src={form.image} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-3xl text-slate-300">person</span>}
                                </div>
                                <label className="cursor-pointer px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                                    사진 선택 <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">이름 *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">연락처 *</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">경력 연수</label><div className="flex items-center gap-2"><input type="number" min={0} value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: Number(e.target.value) }))} className="w-24 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-center" /><span className="text-sm text-slate-500">년</span></div></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">소개글</label><textarea value={form.introduction} onChange={e => setForm(f => ({ ...f, introduction: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">언어</label><div className="flex flex-wrap gap-2">{LANGUAGES.map(l => <button key={l} type="button" onClick={() => toggle('languages', l)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.languages.includes(l) ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{l}</button>)}</div></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">전문 분야</label><div className="flex flex-wrap gap-2">{SPECIALTIES.map(s => <button key={s} type="button" onClick={() => toggle('specialties', s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.specialties.includes(s) ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{s}</button>)}</div></div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium">취소</button>
                                <button onClick={handleSubmit} className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold">{editing ? '수정' : '등록'}</button>
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
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">숙소를 등록하고 예약에 배정합니다.</p>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-sm">add</span> 숙소 등록
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {accommodations.map(a => (
                    <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-[96px_1fr_auto] gap-4 items-center">
                        <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0" style={{ width: 96, height: 72 }}>
                            {a.images.length > 0 ? <img src={a.images[0]} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-3xl text-slate-300">hotel</span></div>}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-bold text-slate-800 dark:text-white truncate">{a.name}</h3>
                                {a.type && <span className="px-1.5 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 text-[10px] font-semibold rounded">{a.type}</span>}
                            </div>
                            <div className="text-[11px] text-slate-500 mb-1 inline-flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">location_on</span>{a.location}</div>
                            <p className="text-xs text-slate-500 line-clamp-1">{a.description || '설명 없음'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => { setEditing(a); setForm({ name: a.name, images: a.images, description: a.description, type: a.type, location: a.location }); setIsModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" title="수정"><span className="material-symbols-outlined text-base">edit</span></button>
                            <button onClick={() => handleDelete(a.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500" title="삭제"><span className="material-symbols-outlined text-base">delete</span></button>
                        </div>
                    </div>
                ))}
                {accommodations.length === 0 && <div className="col-span-full text-center py-20 text-slate-400"><span className="material-symbols-outlined text-5xl mb-2">hotel</span><p>등록된 숙소가 없습니다</p></div>}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 dark:text-white">{editing ? '숙소 수정' : '숙소 등록'}</h2>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }}><span className="material-symbols-outlined text-slate-400">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">이미지</label>
                                {form.images.length > 0 && <div className="grid grid-cols-3 gap-2 mb-2">{form.images.map((img, i) => <div key={i} className="relative aspect-video"><img src={img} className="w-full h-full object-cover rounded-lg" /><button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><span className="material-symbols-outlined text-xs">close</span></button></div>)}</div>}
                                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="text-sm" />
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">숙소명 *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">위치 *</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="예: 울란바토르 시내, 테를지 국립공원" /></div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">숙소 타입</label>
                                {Object.entries(ACCOM_TYPES).map(([cat, subs]) => (
                                    <div key={cat} className="mb-3">
                                        <p className="text-xs font-semibold text-slate-500 mb-1.5">{cat}</p>
                                        <div className="grid grid-cols-2 gap-2">{subs.map(s => <button key={s} type="button" onClick={() => setForm(f => ({ ...f, type: s }))} className={`py-2 rounded-lg text-sm font-medium transition-all ${form.type === s ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{s}</button>)}</div>
                                    </div>
                                ))}
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">설명</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium">취소</button>
                                <button onClick={handleSubmit} className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold">{editing ? '수정' : '등록'}</button>
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
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [activeTab, setActiveTab] = useState('templates');

    const toggleTheme = () => { setIsDarkMode(!isDarkMode); document.documentElement.classList.toggle('dark'); };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            <AdminSidebar activePage="templates" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center">
                    <h1 className="text-xl font-bold">템플릿 관리</h1>
                </header>

                <div className="px-8 pt-6">
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit mb-6">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="pb-8">
                        {activeTab === 'templates' && <TemplatesTab />}
                        {activeTab === 'guides' && <GuidesTab />}
                        {activeTab === 'accommodations' && <AccommodationsTab />}
                    </div>
                </div>
            </main>
        </div>
    );
};
