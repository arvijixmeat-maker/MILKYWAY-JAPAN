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
type ActivityType = 'pickup' | 'transport' | 'meal' | 'sightseeing' | 'activity' | 'checkin' | 'free' | 'other';
interface Activity { time?: string; type?: ActivityType; title: string; description: string; images?: string[]; }
interface TemplateDay { day: number; title: string; region?: string; activities: Activity[]; }
interface DocumentSettings {
    overview: {
        subtitle: string;
        heroTagline: string;
        intro: string;
        included: { icon: string; label: string }[];
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
        emergencyPhone: string;
        emergencyEmail: string;
        closingMessage: string;
        qrLabel: string;
    };
}
interface ItineraryTemplate { id: string; name: string; description: string; days: TemplateDay[]; createdAt: string; documentSettings: DocumentSettings; }

const DOC_SETTINGS_MARKER = '\n\n__MILKYWAY_DOCUMENT_SETTINGS__=';

const defaultDocumentSettings = (): DocumentSettings => ({
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
        pricePerPerson: '128000',
        paymentNote: '上記料金には、日程表に記載のサービスが含まれております。',
    },
    contract: {
        intro: '本旅行条件書および下記の旅行条件に基づき、募集型企画旅行契約を締結いたします。',
        paymentMethod: '銀行振込',
        paymentDeadline: 'ご案内メールに記載の期日まで',
        bankInfo: '三井住友銀行 新宿支店（普通）1234567\nモンゴル大自然ツアー（カ',
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
        emergencyPhone: '+976-80-1234-5678',
        emergencyEmail: 'info@mongolia-naturetour.com',
        closingMessage: 'モンゴルの大自然と文化を心ゆくまでお楽しみください。',
        qrLabel: 'お客様専用ページ',
    },
});

const mergeDocumentSettings = (value: any): DocumentSettings => {
    const base = defaultDocumentSettings();
    if (!value || typeof value !== 'object') return base;
    return {
        overview: { ...base.overview, ...(value.overview || {}), included: Array.isArray(value.overview?.included) ? value.overview.included : base.overview.included },
        contract: { ...base.contract, ...(value.contract || {}), cancellationRows: Array.isArray(value.contract?.cancellationRows) ? value.contract.cancellationRows : base.contract.cancellationRows },
        detail: { ...base.detail, ...(value.detail || {}), footerBadges: Array.isArray(value.detail?.footerBadges) ? value.detail.footerBadges : base.detail.footerBadges },
        guide: { ...base.guide, ...(value.guide || {}), notices: Array.isArray(value.guide?.notices) ? value.guide.notices : base.guide.notices },
    };
};

const decodeTemplateDescription = (raw = '') => {
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
};

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ name, description, days, documentSettings, onNameChange, onDescriptionChange, onDocSection, onIncluded, onCancellation, onGuideNotice }) => {
    const [activePage, setActivePage] = useState<'overview' | 'contract' | 'detail' | 'guide'>('overview');
    const totalDays = days.length;
    const nights = Math.max(0, totalDays - 1);
    const settings = mergeDocumentSettings(documentSettings);
    const samplePrice = Number(settings.overview.pricePerPerson || 0) || 128000;
    const sampleTotal = samplePrice * 2;
    const tripLength = `${nights}泊${totalDays || 0}日`;
    const pages = [
        { id: 'overview' as const, label: '日程表', icon: 'article' },
        { id: 'contract' as const, label: '契約書', icon: 'contract' },
        { id: 'detail' as const, label: '詳細', icon: 'route' },
        { id: 'guide' as const, label: '案内', icon: 'info' },
    ];
    const rows = [
        ['ご旅行番号', 'QT-20240604-001'],
        ['ご旅行期間', `2026年6月10日（火）〜 2026年6月13日（金） ${tripLength}`],
        ['参加人数', '大人 2名 / 子供 0名'],
        ['お客様名', '山田 太郎 様'],
        ['旅行形態', '貸切プライベートツアー'],
    ];
    const fieldClass = 'w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 outline-none transition-colors hover:border-[#8FE7DE] hover:bg-white/80 focus:border-[#39C4B7] focus:bg-white focus:ring-2 focus:ring-[#39C4B7]/15';
    const Frame = ({ children }: { children: React.ReactNode }) => <div className="mx-auto max-w-[760px] rounded-[22px] border border-[#8FE7DE] bg-white shadow-sm">{children}</div>;

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
            <div className="flex-1 overflow-y-auto p-4">
                {activePage === 'overview' && <Frame>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-2 text-[#0F8F84]"><span className="material-symbols-outlined text-[28px]">landscape</span><div><p className="text-[12px] font-black">モンゴル大自然ツアー</p><p className="text-[8px] font-bold tracking-widest">MONGOLIA NATURE TOUR</p></div></div>
                        <div className="text-right"><p className="text-[22px] font-black tracking-[0.12em] text-[#0F8F84]">ご旅行日程表</p><input value={settings.overview.subtitle} onChange={e => onDocSection('overview', { subtitle: e.target.value })} className={`${fieldClass} max-w-[260px] text-right text-[10px] font-semibold leading-snug text-slate-400`} /></div>
                    </div>
                    <div className="relative h-[220px] overflow-hidden"><img src={mongoliaHero} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#00796F]/90 via-[#0F8F84]/45 to-transparent" /><div className="absolute bottom-5 left-5 right-5 text-white"><span className="rounded-xl bg-[#0F8F84] px-3 py-2 text-xs font-black">{tripLength}</span><input value={name} onChange={e => onNameChange(e.target.value)} placeholder="銀河・大自然パッケージ" className={`${fieldClass} mt-3 block max-w-[520px] text-[28px] font-black leading-tight text-white placeholder:text-white/70`} /><input value={description || settings.overview.heroTagline} onChange={e => onDescriptionChange(e.target.value)} className={`${fieldClass} mt-1 max-w-[560px] text-xs font-semibold text-white/90`} /></div></div>
                    <div className="p-5"><h4 className="mb-2 flex items-center gap-1.5 text-sm font-black text-[#0F8F84]"><span className="material-symbols-outlined text-base">check_circle</span>ご旅行概要</h4><textarea value={settings.overview.intro} onChange={e => onDocSection('overview', { intro: e.target.value })} rows={3} className={`${fieldClass} mb-3 resize-none text-[11px] font-semibold leading-relaxed text-slate-500`} /><div className="overflow-hidden rounded-xl border border-[#8FE7DE] text-xs">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[112px_1fr] border-b border-[#8FE7DE] last:border-b-0"><div className="bg-[#F7FAFA] px-3 py-2 font-black text-[#0F8F84]">{label}</div><div className="px-3 py-2 font-semibold text-slate-700">{value}</div></div>)}</div>
                    <h4 className="mb-2 mt-4 text-sm font-black text-[#0F8F84]">含まれているもの</h4><div className="grid grid-cols-3 gap-2">{settings.overview.included.slice(0, 6).map((item, idx) => <div key={idx} className="min-h-[76px] rounded-xl border border-[#8FE7DE] bg-white p-2 text-center text-[#0F8F84]"><input value={item.icon} onChange={e => onIncluded(idx, 'icon', e.target.value)} className={`${fieldClass} mx-auto w-[78px] text-center text-[9px] font-bold text-slate-400`} /><span className="material-symbols-outlined block text-[22px]">{item.icon || 'check_circle'}</span><input value={item.label} onChange={e => onIncluded(idx, 'label', e.target.value)} className={`${fieldClass} mt-1 text-center text-[9px] font-black leading-tight text-[#0F8F84]`} /></div>)}</div>
                    <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl border border-amber-200 bg-white p-3 text-center"><p className="text-[9px] font-black text-[#0F8F84]">旅行代金</p><input value={settings.overview.pricePerPerson} onChange={e => onDocSection('overview', { pricePerPerson: e.target.value.replace(/[^0-9]/g, '') })} className={`${fieldClass} text-center text-lg font-black text-[#0F8F84]`} /></div><div className="rounded-xl border border-[#8FE7DE] bg-white p-3 text-center"><p className="text-[9px] font-black text-slate-400">参加人数</p><p className="text-sm font-black text-slate-700">大人 2名</p></div><div className="rounded-xl bg-gradient-to-br from-[#0F8F84] to-[#39C4B7] p-3 text-center text-white"><p className="text-[9px] font-black">ご請求金額</p><p className="text-lg font-black">{sampleTotal.toLocaleString()}円</p></div></div></div>
                </Frame>}
                {activePage === 'contract' && <Frame><div className="p-5"><div className="mb-5 flex items-start justify-between"><div className="text-[#0F8F84]"><p className="text-[12px] font-black">モンゴル大自然ツアー</p><p className="text-[8px] font-bold tracking-widest">MONGOLIA NATURE TOUR</p></div><div className="rounded-lg bg-[#39C4B7]/10 px-3 py-2 text-[9px] font-black text-[#0F8F84]">契約日：2026年6月4日</div></div><h3 className="text-center text-[30px] font-black tracking-[0.18em] text-[#0F8F84]">ご旅行契約書</h3><p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">Travel Contract</p><textarea value={settings.contract.intro} onChange={e => onDocSection('contract', { intro: e.target.value })} rows={3} className={`${fieldClass} mx-auto mt-4 block max-w-[520px] resize-none text-center text-[11px] font-semibold leading-relaxed text-slate-500`} /><div className="mt-5 overflow-hidden rounded-xl border border-[#8FE7DE] text-xs">{[['ご旅行名', name || '銀河・大自然パッケージ'], ['ご旅行期間', tripLength], ['旅行代金', `${samplePrice.toLocaleString()}円（一人）`], ['合計金額', `${sampleTotal.toLocaleString()}円`], ['ガイド', '日本語ガイドが全日程同行します']].map(([label, value]) => <div key={label} className="grid grid-cols-[112px_1fr] border-b border-[#8FE7DE] last:border-b-0"><div className="bg-[#F7FAFA] px-3 py-2 font-black text-[#0F8F84]">{label}</div><div className="px-3 py-2 font-semibold text-slate-700">{value}</div></div>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#8FE7DE] p-3"><p className="text-xs font-black text-[#0F8F84]">キャンセル規定</p><div className="mt-2 space-y-1">{settings.contract.cancellationRows.slice(0, 5).map((row, idx) => <div key={idx} className="grid grid-cols-[1fr_90px] gap-1"><input value={row.period} onChange={e => onCancellation(idx, 'period', e.target.value)} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /><input value={row.fee} onChange={e => onCancellation(idx, 'fee', e.target.value)} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /></div>)}</div></div><div className="rounded-xl border border-[#8FE7DE] p-3"><p className="text-xs font-black text-[#0F8F84]">お支払い</p><input value={settings.contract.paymentMethod} onChange={e => onDocSection('contract', { paymentMethod: e.target.value })} className={`${fieldClass} mt-2 text-[10px] font-semibold text-slate-500`} /><input value={settings.contract.paymentDeadline} onChange={e => onDocSection('contract', { paymentDeadline: e.target.value })} className={`${fieldClass} mt-1 text-[10px] font-semibold text-slate-500`} /><div className="mt-4 border-b border-slate-300 pb-1 text-[10px] text-slate-400">旅行者署名</div></div></div></div></Frame>}
                {activePage === 'detail' && <Frame><div className="p-5"><div className="mb-5 flex items-center justify-between"><input value={settings.detail.title} onChange={e => onDocSection('detail', { title: e.target.value })} className={`${fieldClass} text-[24px] font-black tracking-[0.12em] text-[#0F8F84]`} /><span className="rounded-full bg-[#39C4B7]/10 px-3 py-1 text-xs font-black text-[#0F8F84]">{totalDays || 0}日間</span></div>{days.length === 0 ? <div className="rounded-xl border border-dashed border-[#8FE7DE] py-12 text-center text-xs font-bold text-slate-400">일정을 입력하면 상세 일정이 표시됩니다.</div> : <div className="space-y-3">{days.slice(0, 5).map(day => <div key={day.day} className="grid grid-cols-[72px_1fr] gap-3"><div className="rounded-xl bg-gradient-to-b from-[#0F8F84] to-[#39C4B7] px-2 py-4 text-center text-white"><p className="text-[10px] font-black">DAY {day.day}</p><p className="mt-1 text-[11px] font-bold">{day.day}日目</p></div><div className="rounded-xl border border-[#8FE7DE] p-3"><p className="text-sm font-black text-[#0F8F84]">{day.title || `${day.day}日目`}</p><div className="relative mt-3 border-l-2 border-dashed border-[#8FE7DE] pl-4">{day.activities.slice(0, 5).map((activity, index) => <div key={index} className="relative pb-2 last:pb-0 text-[11px]"><span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-[#0F8F84] ring-2 ring-white" /><span className="font-mono font-bold text-slate-400">{activity.time || '--:--'}</span><span className="ml-3 font-semibold text-slate-700">{activity.title || 'ご案内'}</span></div>)}</div></div></div>)}</div>}<textarea value={settings.detail.note} onChange={e => onDocSection('detail', { note: e.target.value })} rows={2} className={`${fieldClass} mt-4 resize-none text-[11px] font-semibold leading-relaxed text-slate-500`} /></div></Frame>}
                {activePage === 'guide' && <Frame><div className="grid gap-4 p-5 sm:grid-cols-2"><div className="rounded-xl border border-[#8FE7DE] p-4"><h3 className="text-sm font-black text-[#0F8F84]">ご案内・ご注意事項</h3>{settings.guide.notices.slice(0, 5).map((item, idx) => <div key={idx} className="mt-3 flex gap-2"><span className="material-symbols-outlined text-[20px] text-[#0F8F84]">info</span><div className="flex-1"><input value={item.title} onChange={e => onGuideNotice(idx, 'title', e.target.value)} className={`${fieldClass} text-xs font-black text-[#0F8F84]`} /><textarea value={item.body} onChange={e => onGuideNotice(idx, 'body', e.target.value)} rows={2} className={`${fieldClass} mt-1 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /></div></div>)}</div><div className="rounded-xl border border-[#8FE7DE] p-4"><h3 className="text-sm font-black text-[#0F8F84]">旅行条件（要約）</h3><textarea value={settings.guide.conditions} onChange={e => onDocSection('guide', { conditions: e.target.value })} rows={4} className={`${fieldClass} mt-2 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><h3 className="mt-5 text-sm font-black text-[#0F8F84]">旅行代金のお支払い</h3><textarea value={settings.guide.paymentInfo} onChange={e => onDocSection('guide', { paymentInfo: e.target.value })} rows={3} className={`${fieldClass} mt-2 resize-none text-[10px] font-semibold leading-relaxed text-slate-500`} /><h3 className="mt-5 text-sm font-black text-[#0F8F84]">緊急連絡先</h3><input value={settings.guide.emergencyPhone} onChange={e => onDocSection('guide', { emergencyPhone: e.target.value })} className={`${fieldClass} mt-2 text-[10px] font-semibold text-slate-500`} /><input value={settings.guide.emergencyEmail} onChange={e => onDocSection('guide', { emergencyEmail: e.target.value })} className={`${fieldClass} text-[10px] font-semibold text-slate-500`} /></div></div><div className="relative h-[104px] overflow-hidden"><img src={mongoliaHero} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-white via-white/75 to-transparent" /><input value={settings.guide.closingMessage} onChange={e => onDocSection('guide', { closingMessage: e.target.value })} className={`${fieldClass} absolute left-5 top-7 max-w-[360px] text-sm font-black text-[#0F8F84]`} /><div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-[#0F8F84] px-5 py-2 text-[10px] font-bold text-white"><span>モンゴル大自然ツアー</span><span>{settings.guide.emergencyEmail}</span></div></div></Frame>}
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
                                            <p className="text-[11px] font-black">モンゴル大自然ツアー</p>
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
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] overflow-hidden">

                            {/* Editor */}
                            <div className="overflow-y-auto px-6 py-5 bg-slate-50/50 dark:bg-slate-950/30">

                                {/* Description */}
                                <div className="mb-5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">설명 (선택)</label>
                                    <input
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="이 템플릿이 어떤 일정인지 한 줄 설명"
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>

                                {/* Quick builder — 일정이 있으면 접고, 없으면 펼쳐서 시작 경로로 */}
                                {(form.days.length === 0 || showPasteBox) ? (
                                <div className="mb-5 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm dark:border-teal-500/20 dark:bg-slate-800">
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300">
                                                <span className="material-symbols-outlined">content_paste_go</span>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">일정표 원문 붙여넣기</h3>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                                    DAY 1, スケジュール, 宿泊 형식을 그대로 붙여넣으면 고객용 타임라인으로 정리됩니다.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={loadBulkSample} className="h-9 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                                                예시 넣기
                                            </button>
                                            {form.days.length > 0 && (
                                                <button onClick={() => setShowPasteBox(false)} className="h-9 rounded-lg px-2 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1" title="붙여넣기 영역 접기">
                                                    <span className="material-symbols-outlined text-base">expand_less</span>접기
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <textarea
                                        value={bulkText}
                                        onChange={e => setBulkText(e.target.value)}
                                        rows={10}
                                        placeholder={'DAY 1｜ウランバートル到着\nモンゴルの旅、はじまりの日。\n\nチンギスハーン国際空港に到着後、\n日本語ガイドがお出迎えいたします。\n\nスケジュール\nチンギスハーン国際空港 到着\n日本語ガイド・ドライバーと合流\n専用車にてホテルへ移動\n宿泊\nウランバートル市内 4つ星ホテル'}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                    />
                                    <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <p className="text-[11px] leading-relaxed text-slate-400">
                                            유형 선택은 필요 없습니다. 붙여넣은 문장은 일정표 안에 보존되고, 시간/숙박/이동만 자동 분류됩니다.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                                                <span className="text-xs font-semibold text-slate-500">빈 일정</span>
                                                <select
                                                    value={quickDays}
                                                    onChange={e => setQuickDays(Number(e.target.value))}
                                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}일</option>)}
                                                </select>
                                                <button onClick={() => { createBlankDays(quickDays); setShowAdvancedEditor(true); }} className="rounded-md px-2 py-1 text-xs font-bold text-slate-500 hover:bg-white hover:text-teal-600 dark:hover:bg-slate-800">
                                                    만들기
                                                </button>
                                            </div>
                                            <button onClick={importBulkText} className="h-10 rounded-xl bg-teal-500 px-4 text-sm font-black text-white shadow-md shadow-teal-500/20 transition-colors hover:bg-teal-600 inline-flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-base">bolt</span>일정표 만들기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                ) : (
                                    <button onClick={() => setShowPasteBox(true)} className="mb-5 w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:border-teal-400 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 inline-flex items-center justify-center gap-1.5">
                                        <span className="material-symbols-outlined text-base">content_paste_go</span>원문 붙여넣기로 다시 만들기
                                    </button>
                                )}

                                {/* Days */}
                                <div className="mb-3 flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                        정리 결과 <span className="ml-1 normal-case text-teal-600 dark:text-teal-400">{form.days.length}일 · {form.days.reduce((s, d) => s + d.activities.length, 0)}개 항목</span>
                                    </label>
                                    {form.days.length > 0 && (
                                        <button onClick={addDay} className="text-xs px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold inline-flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">add</span>일차 추가
                                        </button>
                                    )}
                                </div>

                                {form.days.length === 0 && (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 py-10 text-center text-slate-400">
                                        <span className="material-symbols-outlined mb-2 text-3xl">content_paste</span>
                                        <p className="text-sm font-semibold">위에 일정표 원문을 붙여넣거나, "빈 일정 만들기"로 시작하세요.</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {form.days.map((day, dayIdx) => (
                                        <div key={dayIdx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                            {/* Day header */}
                                            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-700" style={{ background: 'linear-gradient(180deg,#f7f9fb,#ffffff)' }}>
                                                <span className="flex h-[46px] w-[46px] flex-shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-sm" style={{ background: '#0e9c84' }}>
                                                    <span className="text-[17px] font-extrabold leading-none">{day.day}</span>
                                                    <span className="mt-0.5 text-[9px] font-bold leading-none tracking-wide opacity-90">日目</span>
                                                </span>
                                                <div className="grid min-w-0 flex-1 gap-2.5" style={{ gridTemplateColumns: '150px 1fr' }}>
                                                    <input
                                                        value={day.region || ''}
                                                        onChange={e => updateDay(dayIdx, 'region', e.target.value)}
                                                        placeholder="지역"
                                                        className="min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-[13.5px] font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                                                    />
                                                    <input
                                                        value={day.title}
                                                        onChange={e => updateDay(dayIdx, 'title', e.target.value)}
                                                        placeholder="일차 제목 (예: ウランバートル到着)"
                                                        className="min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-[13.5px] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    <button onClick={() => moveDay(dayIdx, -1)} disabled={dayIdx === 0} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-default" title="위로">
                                                        <span className="material-symbols-outlined text-base">arrow_upward</span>
                                                    </button>
                                                    <button onClick={() => moveDay(dayIdx, 1)} disabled={dayIdx === form.days.length - 1} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-default" title="아래로">
                                                        <span className="material-symbols-outlined text-base">arrow_downward</span>
                                                    </button>
                                                    <button onClick={() => duplicateDay(dayIdx)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30" title="이 일차 복제">
                                                        <span className="material-symbols-outlined text-base">content_copy</span>
                                                    </button>
                                                    <button onClick={() => removeDay(dayIdx)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50" title="삭제">
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Activities */}
                                            <div className="p-4">
                                                <div className="space-y-0">
                                                {day.activities.map((act, actIdx) => {
                                                    const t = act.type ? TYPE_MAP[act.type] : null;
                                                    const acc = typeAccent(act.type);
                                                    const last = actIdx === day.activities.length - 1;
                                                    return (
                                                        <div key={actIdx} className="group flex gap-3">
                                                            <div className="flex w-8 flex-shrink-0 flex-col items-center">
                                                                <span className="z-10 flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[9px]" style={{ color: acc.c, background: acc.cb }}>
                                                                    <span className="material-symbols-outlined text-[18px]">{t?.icon || 'radio_button_checked'}</span>
                                                                </span>
                                                                {!last && <span className="my-1 min-h-[8px] w-0 flex-1 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />}
                                                            </div>
                                                            <div className="mb-2 min-w-0 flex-1 rounded-[11px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="rounded-md px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap" style={{ color: acc.c, background: acc.cb }}>{t?.label || '일정'}</span>
                                                                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-400">
                                                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                                        <input
                                                                            value={act.time || ''}
                                                                            onChange={e => updateActivity(dayIdx, actIdx, 'time', e.target.value)}
                                                                            placeholder="시간"
                                                                            className="w-14 rounded bg-transparent px-1 text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                        />
                                                                    </span>
                                                                    <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                                        <button onClick={() => moveActivity(dayIdx, actIdx, -1)} disabled={actIdx === 0} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30" title="위로"><span className="material-symbols-outlined text-[15px]">arrow_upward</span></button>
                                                                        <button onClick={() => moveActivity(dayIdx, actIdx, 1)} disabled={last} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30" title="아래로"><span className="material-symbols-outlined text-[15px]">arrow_downward</span></button>
                                                                        <button onClick={() => removeActivity(dayIdx, actIdx)} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500" title="삭제"><span className="material-symbols-outlined text-[15px]">close</span></button>
                                                                    </div>
                                                                </div>
                                                                <input
                                                                    value={act.title}
                                                                    onChange={e => updateActivityText(dayIdx, actIdx, 'title', e.target.value)}
                                                                    placeholder="항목 제목 (예: 亀石 観光)"
                                                                    className="mt-1.5 w-full border-none bg-transparent text-[13.5px] font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 dark:text-white"
                                                                />
                                                                {(openDesc.has(`${dayIdx}-${actIdx}`) || act.description) ? (
                                                                    <div className="mt-1">
                                                                        <input
                                                                            value={act.description}
                                                                            onChange={e => updateActivityText(dayIdx, actIdx, 'description', e.target.value)}
                                                                            placeholder="상세 설명"
                                                                            className="w-full border-none bg-transparent text-[12.5px] text-slate-500 outline-none placeholder:text-slate-400 dark:text-slate-400"
                                                                        />
                                                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                                            <button onClick={() => setSpotPickerTarget({ d: dayIdx, a: actIdx })} className="inline-flex items-center gap-1 rounded-md border border-dashed bg-white px-2 py-1 text-[11px] font-bold dark:bg-slate-800" style={{ color: '#0e9c84', borderColor: '#9ad9cb' }}>
                                                                                <span className="material-symbols-outlined text-[14px]">location_on</span>관광지 마스터에서
                                                                            </button>
                                                                            <button onClick={() => setHotelPickerTarget({ d: dayIdx, a: actIdx })} className="inline-flex items-center gap-1 rounded-md border border-dashed bg-white px-2 py-1 text-[11px] font-bold dark:bg-slate-800" style={{ color: '#6a55d6', borderColor: '#c3b9f2' }}>
                                                                                <span className="material-symbols-outlined text-[14px]">hotel</span>호텔 마스터에서
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => toggleDesc(`${dayIdx}-${actIdx}`)} className="mt-0.5 text-[12.5px] font-medium text-slate-400 hover:text-teal-600 dark:hover:text-teal-400">
                                                                        + 상세 설명 (선택)
                                                                    </button>
                                                                )}
                                                                {act.images && act.images.length > 0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                                        {act.images.map((img, k) => (
                                                                            <div key={k} className="group/img relative h-12 w-12 overflow-hidden rounded-md border border-slate-200 dark:border-slate-600">
                                                                                <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                                                                                <button onClick={() => removeActivityImage(dayIdx, actIdx, k)} className="absolute right-0 top-0 hidden h-4 w-4 items-center justify-center bg-black/60 text-white group-hover/img:flex" title="사진 삭제">
                                                                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                </div>
                                                <div className="ml-11 mt-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <button onClick={() => setMealMenuDay(mealMenuDay === dayIdx ? null : dayIdx)} className="inline-flex items-center gap-1.5 rounded-[9px] border border-dashed bg-white px-3 py-1.5 text-[12.5px] font-bold transition-colors dark:bg-slate-800" style={{ color: '#c97a16', borderColor: '#ecca8e' }}>
                                                            <span className="material-symbols-outlined text-[16px]">restaurant</span>식사
                                                            <span className={`material-symbols-outlined text-[14px] transition-transform ${mealMenuDay === dayIdx ? 'rotate-180' : ''}`}>expand_more</span>
                                                        </button>
                                                        <button onClick={() => addActivityTyped(dayIdx, 'sightseeing')} className="inline-flex items-center gap-1.5 rounded-[9px] border border-dashed border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                            <span className="material-symbols-outlined text-[16px]">add</span>항목 추가
                                                        </button>
                                                        {day.activities.length > 1 && (
                                                            <button onClick={() => sortByTime(dayIdx)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600" title="시간 순으로 정렬">
                                                                <span className="material-symbols-outlined text-sm">sort</span>시간순 정렬
                                                            </button>
                                                        )}
                                                    </div>
                                                    {mealMenuDay === dayIdx && (
                                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                            {[{ jp: '朝食', kr: '조식' }, { jp: '昼食', kr: '중식' }, { jp: '夕食', kr: '석식' }].map(m => (
                                                                <button key={m.jp} onClick={() => { addMeal(dayIdx, m.jp); setMealMenuDay(null); }} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-[12px] font-bold transition-colors hover:bg-amber-50 dark:bg-slate-800" style={{ color: '#c97a16', borderColor: '#ecca8e' }}>
                                                                    {m.jp}<span className="text-[10px] font-medium text-slate-400">{m.kr}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {form.days.length === 0 && (
                                        <button onClick={addDay} className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 hover:text-teal-500 hover:border-teal-400 hover:bg-teal-50/30 transition-colors flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-2xl">add_circle</span>
                                            <span className="text-sm font-semibold">첫 번째 일차 추가</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Live preview */}
                            <div className="hidden lg:block border-l border-slate-200 dark:border-slate-800 overflow-hidden p-4 bg-white dark:bg-slate-900">
                                <TemplatePreview name={form.name} description={form.description} days={form.days} documentSettings={form.documentSettings} onNameChange={(value) => setForm(f => ({ ...f, name: value }))} onDescriptionChange={(value) => setForm(f => ({ ...f, description: value }))} onDocSection={updateDocSection} onIncluded={updateIncluded} onCancellation={updateCancellation} onGuideNotice={updateGuideNotice} />
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
