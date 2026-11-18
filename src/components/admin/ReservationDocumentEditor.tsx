import React, { useDeferredValue, useEffect, useMemo, useState, useRef } from 'react';
import {
    mergeDocumentSettings,
    defaultDocumentSettings,
    type DocumentSettings,
    type TemplateDay,
    type ActivityType,
} from '../../pages/AdminTemplateManage';
import { api } from '../../lib/api';
import type { DayInfoContent, DetailContentBlock, TimelineContent, TourProduct } from '../../types/product';
import { TouristSpotPickerModal } from './TouristSpotPickerModal';
import type { TouristSpot } from '../../types/touristSpot';
import type { Hotel } from '../../types/hotel';
import { TripDocument, type TripFocus } from '../trip-doc/TripDocument';
import { MAP_DESTINATIONS } from '../product/designTemplates/mapDestinations';
import { SPOT_REGION_OPTIONS } from '../../types/touristSpot';
import { buildTripDoc, yen, DEFAULT_INCLUDED, DEFAULT_EXCLUDED } from '../trip-doc/tripDocModel';
import { MEAL_KO, INC_OPTS, EXC_OPTS, inferActivityType } from '../../constants/quoteOptions';
import { downloadKoItineraryImage } from './koItineraryImage';
import { QuoteCostCard } from './QuoteCostCard';
import type { CostPlan } from '../../lib/pricing';
import { useTripSources, resolveTripImages, fallbackSpots, cleanSpotName } from '../trip-doc/tripDocSources';

/**
 * 견적서·확정일정표 간단 편집기.
 * 고객마다 바뀌는 것은 ① 고객정보 ② 여행 금액 ③ 일정표 뿐 — 이 세 가지만 입력하고,
 * 나머지(표지·포함/불포함·숙소·팀·식사·안전·약관)는 새 디자인의 공통 내용으로 자동 들어간다.
 * 오른쪽에서 고객이 받을 새 디자인 화면을 바로 확인한다.
 */

export interface ReservationDocContent {
    name: string;
    description: string;
    days: TemplateDay[];
    documentSettings: DocumentSettings;
}

/** 저장 시 함께 넘기는 금액·인원 — 견적/예약 레코드에 그대로 저장된다 */
export interface DocPricing { pricePerPerson: number; people: number; total: number; deposit: number }

interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    documentType?: 'itinerary' | 'contract';
    /** 템플릿(프리셋) 편집 — 고객정보·금액 대신 일정표만 */
    templateMode?: boolean;
    /** 미리보기 형태 (견적서 / 확정일정표) */
    previewMode?: 'quote' | 'confirmed';
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
    };
    initialContent: ReservationDocContent | null;
    onSave: (content: ReservationDocContent, tourDates?: { startDate: string; endDate: string }, pricing?: DocPricing) => Promise<void>;
    tourStartDate?: string;
    tourEndDate?: string;
    assignedGuide?: { name?: string; phone?: string; image?: string } | null;
    dailyAccommodations?: Array<{ day: number; accommodation: { name?: string; images?: string[] } }>;
    onAssignGuide?: () => void;
    onAssignAccommodation?: (day: number) => void;
    onUnassignAccommodation?: (day: number) => void;
    previewUrl?: string;
    /** 견적이면 그 견적 ID — 일정이 비어 있으면 AI 초안을 자동으로 만들고, 「AI 초안」 버튼도 보인다 */
    aiDraftQuoteId?: string;
}

const parseBlock = <T,>(content: T | string): T => {
    if (typeof content !== 'string') return content as T;
    try { return JSON.parse(content) as T; } catch { return content as T; }
};
const textOf = (item: any) => (typeof item === 'string' ? item : item?.label || item?.title || item?.name || item?.description || '');
const num = (v: any) => { const n = Number(String(v ?? '').replace(/[^\d]/g, '')); return Number.isFinite(n) ? n : 0; };

const productStats = (p: TourProduct) => {
    const blocks = p.itineraryBlocks || [];
    return { days: blocks.filter(b => b.type === 'dayInfo').length, items: blocks.filter(b => b.type === 'timeline').length };
};

const blocksToDays = (blocks: DetailContentBlock[] = []): TemplateDay[] => {
    const out: TemplateDay[] = [];
    let cur: TemplateDay | null = null;
    for (const block of blocks) {
        if (block.type === 'dayInfo') {
            const info = parseBlock<DayInfoContent>(block.content as DayInfoContent | string);
            cur = {
                day: out.length + 1, date: '', title: info.title || '', region: '', summary: info.description || '', move: '',
                activities: [], meals: info.meals || {},
                accommodation: info.accommodation ? { id: info.accommodationHotelId, name: info.accommodation, location: info.accommodationAddress, images: info.accommodationImages || [], description: info.accommodationDescription } : null,
            };
            out.push(cur);
        } else if (block.type === 'timeline') {
            if (!cur) { cur = { day: 1, title: '', region: '', summary: '', activities: [], meals: {}, accommodation: null }; out.push(cur); }
            const t = parseBlock<TimelineContent>(block.content as TimelineContent | string);
            cur.activities.push({ time: '', type: 'sightseeing', title: t.title || '', description: t.description || '', images: t.images || [] });
        }
    }
    return out;
};

// ── 한 번에 입력 (텍스트 → 일정 항목 · 식사) ──────────────────────────────
/** 항목 종류 추정 — 이동·식사·체크인은 볼거리/경로 사진 후보에서 빠진다 */
const inferType = (t: string): ActivityType => inferActivityType(t) as ActivityType;
/** 줄마다 항목 하나. 이미 있던 같은 이름 항목은 사진·설명을 그대로 유지한다 */
const linesToActivities = (text: string, prev: TemplateDay['activities']): TemplateDay['activities'] => {
    const pool = [...prev];
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(title => {
        const k = pool.findIndex(a => (a.title || '').trim() === title);
        if (k >= 0) return pool.splice(k, 1)[0];
        return { time: '', type: inferType(title), title, description: '', images: [] };
    });
};
/**
 * 「AI로 수정」 결과를 지금 일정에 합친다 — AI 는 글자만 다루므로,
 * 글자가 그대로인 줄·DAY·숙소는 지금 편집기에 있던 사진·설명·시간을 그대로 이어 쓴다.
 */
const mergeRevisedDays = (oldDays: TemplateDay[], newDays: TemplateDay[]): TemplateDay[] => {
    const same = (a?: string, b?: string) => (a || '').trim() === (b || '').trim();
    const pool = oldDays.flatMap(d => d.activities);
    return newDays.map((nd, i) => {
        const od = oldDays.find(d => same(d.title, nd.title)) || (oldDays[i] && same(oldDays[i].region, nd.region) ? oldDays[i] : undefined);
        const activities = nd.activities.map(na => {
            const k = pool.findIndex(a => same(a.title, na.title));
            if (k < 0) return na;
            const oa = pool.splice(k, 1)[0];
            return { ...oa, ko: na.ko || oa.ko, images: oa.images?.length ? oa.images : na.images };
        });
        // 숙소 — 같은 DAY(제목이 같거나 같은 순서)의 숙소와 같으면 지금 것(사진·설명)을 그대로
        const na = nd.accommodation;
        const sameAcc = (oa?: TemplateDay['accommodation']) => !!(na && oa && (na.id ? na.id === oa.id : same(na.name, oa.name)));
        const accommodation = sameAcc(od?.accommodation) ? od!.accommodation : sameAcc(oldDays[i]?.accommodation) ? oldDays[i].accommodation : na;
        return {
            ...(od || {}),
            ...nd,
            day: i + 1,
            date: oldDays[i]?.date ?? nd.date, // 날짜는 DAY 순서를 따른다
            titleImage: nd.titleImage || (od && same(od.title, nd.title) ? od.titleImage : undefined),
            summary: od && same(od.title, nd.title) ? od.summary : nd.summary,
            activities,
            accommodation,
        };
    });
};

// 관리자 화면은 한국어, 고객 화면에는 일본어가 나간다 — [고객용 일본어, 관리자용 한국어]

// ── 식사 — 朝·昼·夕 칸마다 목록에서 고른다 ──
const MEAL_SLOTS = [['breakfast', '조식'], ['lunch', '중식'], ['dinner', '석식']] as const;


// ── 포함 / 불포함 — 체크만 하면 고객 화면에 나간다 ──
/** 상품·옛 문서에서 들어온 일본어 문구의 한국어 (목록에 없는 것) */
const KO_EXTRA: Record<string, string> = {
    '専用車・ドライバー': '전용 차량·기사', '宿泊（ホテル・ゲル）': '숙박(호텔·게르)', '食事付き': '식사 포함', '日本語ガイド': '일본어 가이드',
    '伝統衣装・乗馬・ラクダ体験': '전통의상·승마·낙타 체험', '国際航空券': '국제선 항공권', '国際線航空券': '국제선 항공권', '個人的費用': '개인 경비',
    '全日程宿泊': '전 일정 숙박', '全日程食事付き': '전 일정 식사', '全日程専用車両（送迎／移動）': '전 일정 전용 차량(픽업·이동)',
    '全日程日本語ガイド同行': '전 일정 일본어 가이드 동행', '観光地入場料': '관광지 입장료', '1日1本ミネラルウォーター提供': '생수 1일 1병',
    '乗馬・ラクダ・サンドボード体験': '승마·낙타·샌드보드 체험', 'ポンチョ（6名以下のチーム限定）': '판초 제공(6인 이하 팀)',
    'モンゴル靴下 1名様につき1足プレゼント': '몽골 양말 1인 1켤레 증정', '韓国料理／ホルホグ／しゃぶしゃぶ提供': '한식·허르헉·샤브샤브 제공',
    'サンドイッチおよびハンバーガー': '샌드위치·햄버거', 'ホテル': '호텔식', 'ホテル朝食': '호텔 조식', 'キャンプ': '캠프식', '現地レストラン': '현지 레스토랑',
    '空港送迎（往復）': '공항 픽업·샌딩', '宿泊費': '숙박비', '食事代': '식사비', '専用車': '전용 차량', 'ガイド料': '가이드 비용', '入場料': '입장료',
};
const KO_OF = new Map<string, string>([...MEAL_KO, ...INC_OPTS, ...EXC_OPTS, ...Object.entries(KO_EXTRA)]);
/** 관광지 마스터 이름(일본어) → 관리자용 한국어 — 여행지 지도 이름표에서 찾고, 없으면 영어 · 일본어 */
const SPOT_KO: Array<[string, string]> = Object.entries({
    'キャンプで星空鑑賞': '캠프 별 관측', 'キャンプファイヤー': '캠프파이어', 'ゴビ砂漠・ラクダトレッキング': '고비사막 낙타 트레킹',
    'ザイサン・トルゴイ': '자이승 전망대', 'スフバートル広場': '수흐바타르 광장', 'チンギス・ハーン国立博物館': '칭기스칸 국립박물관',
    'チンギス・ハーン騎馬像': '칭기스칸 기마상', 'ツァガーン・ソブラ': '차강소브라가', 'テレルジ国立公園': '테를지 국립공원',
    'バガ・ガズリーン・チョロー': '바가 가즈링 촐로', 'ホンゴル砂丘': '홍고린엘스(모래언덕)', 'モンゴルの大草原風景': '몽골 대초원 풍경',
    'モンゴルの首都ウランバートル': '울란바토르', 'モンゴル伝統公演': '몽골 전통 공연', 'ヨリーンアム': '욜린암', '乗馬体験': '승마 체험',
    '亀岩': '거북바위', '大型スーパー': '대형 마트', 'バヤンザグ': '바양작(불타는 절벽)', '砂すべり体験': '모래 썰매 체험',
    '遊牧民生活体験': '유목민 생활 체험', '騎馬像展望台＆博物館': '기마상 전망대·박물관', '鷲体験': '독수리 체험',
    'アリヤバル寺院': '아리야발 사원', 'オボー': '어워(서낭당)', 'ホルホグ': '허르헉', 'モンゴリアンしゃぶしゃぶ': '몽골식 샤브샤브',
}).sort((a, b) => b[0].length - a[0].length);
const koSpotName = (name = '') => {
    const ja = cleanSpotName(name).replace(/[\s・]/g, '');
    const own = ja ? SPOT_KO.find(([k]) => ja.includes(k.replace(/[\s・]/g, ''))) : undefined;
    if (own) return own[1];
    const hit = ja ? MAP_DESTINATIONS.find(d => { const k = d.ja.replace(/[\s・]/g, ''); return ja.includes(k) || k.includes(ja); }) : undefined;
    return hit?.ko || (name.match(/[（(]([A-Za-z][^）)]*)[）)]/)?.[1] || '').trim() || cleanSpotName(name);
};
const SPOT_REGIONS: Array<[string, string]> = [...SPOT_REGION_OPTIONS.filter(o => o.value !== 'food' && o.value !== 'vehicle').map(o => [o.value, o.label] as [string, string]), ['', '기타']];
/** 저장된 「일본어\t한국어」 직접 추가 항목 */
const customKo = (labels: string[]) => new Map(labels.map(l => l.split('\t')).filter(p => p.length === 2) as Array<[string, string]>);
const splitLines = (t?: string) => String(t || '').split(/\r?\n/).map(x => x.replace(/^[・•\-*]\s*/, '').trim()).filter(Boolean);

// ── 디자인 토큰 — Claude Design 「Quote Editor」 시안 (민트 · 네이비) ──
const C = {
    ink: '#123B3A', sub: '#5F7674', mute: '#8A9E9B', body: '#3F5856', faint: '#B6C7C3',
    line: '#DDEBE7', line2: '#EEF3F1', cardLine: '#E6EFEC', bg: '#F7FAF9',
    mint: '#00A88B', mintDeep: '#007F75', mintHi: '#06C4A0', mintBg: '#E8FAF5', mintBg2: '#F1FCF8', mintLine: '#9FE3D2', glow: '#6CE3CC',
    amberBg: '#FFF4D6', amberFg: '#8A5A00', grayBg: '#F3F6F5',
};
const EN = "'Inter',sans-serif";
const JP = "'Noto Sans JP',sans-serif";
const EDITOR_CSS = `
.qe{font-family:'Pretendard Variable',Pretendard,'Noto Sans JP',sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;word-break:keep-all}
.qe input,.qe select,.qe textarea,.qe button{font-family:inherit}
.qe input:focus,.qe select:focus,.qe textarea:focus{outline:none;border-color:${C.mintHi} !important;box-shadow:0 0 0 3px rgba(6,196,160,0.25)}
.qe .qe-bare:focus{box-shadow:none !important}
.qe-noscroll{scrollbar-width:none}.qe-noscroll::-webkit-scrollbar{display:none}
.qe-hbd:hover{border-color:${C.mintHi} !important}
.qe-hbg:hover{background:${C.bg} !important}
.qe-hmint:hover{background:${C.mintBg2} !important}
.qe-hred:hover{background:#FFF1F0 !important}
.qe-hdark:hover{background:#0C2B2A !important}
`;
const fieldStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    height: 46, padding: '0 14px', border: `1px solid ${C.line}`, borderRadius: 12, background: '#FFFFFF',
    fontSize: 15, color: C.ink, boxSizing: 'border-box', width: '100%', ...extra,
});
const Lbl: React.FC<{ children: React.ReactNode; note?: string }> = ({ children, note }) => (
    <span style={{ fontSize: 12, fontWeight: 600, color: C.sub, whiteSpace: 'nowrap' }}>{children}{note && <span style={{ fontWeight: 500, color: C.mute }}> · {note}</span>}</span>
);
const Chevron: React.FC<{ open: boolean; size?: number; color?: string }> = ({ open, size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        style={{ transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform .2s', flex: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
);
const Sparkle: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = C.glow }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
);
const Check: React.FC<{ size?: number; color?: string; w?: number }> = ({ size = 10, color = '#FFFFFF', w = 3.2 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
);
/** 동그란(또는 둥근 네모) 사진 — 사진이 없으면 연한 민트 */
const Thumb: React.FC<{ src?: string; size: number; round?: boolean; radius?: number }> = ({ src, size, round = true, radius = 10 }) => (
    <span style={{ position: 'relative', flex: 'none', width: size, height: size, borderRadius: round ? '50%' : radius, overflow: 'hidden', background: C.mintBg, display: 'block' }}>
        {src && <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </span>
);
const SecHead: React.FC<{ n: string; title: React.ReactNode; hint?: string; right?: React.ReactNode }> = ({ n, title, hint, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, flex: 1, minWidth: 160 }}>
            <span style={{ flex: 'none', fontFamily: EN, fontSize: 12, fontWeight: 700, color: C.mint }}>{n}</span>
            <h2 style={{ flex: 'none', whiteSpace: 'nowrap', margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink }}>{title}</h2>
            {hint && <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</span>}
        </span>
        {right}
    </div>
);
const sectionStyle: React.CSSProperties = { scrollMarginTop: 12, padding: 24, borderRadius: 20, background: '#FFFFFF', border: `1px solid ${C.cardLine}`, display: 'flex', flexDirection: 'column', gap: 18 };

/** 숙소 종류 — 호텔 마스터에 종류 칸이 없어 이름으로 나눈다 */
type HotelKind = 'ger' | 'premium' | 'hotel';
const hotelKindOf = (h: Hotel): HotelKind => {
    const t = `${h.name_kr || ''} ${h.name_local || ''}`;
    if (/高級|고급|premium|deluxe|デラックス|디럭스|luxury|럭셔리/i.test(t)) return 'premium';
    if (/ゲル|게르|\bger\b|camp|キャンプ|캠프|lodge|ロッジ/i.test(t)) return 'ger';
    return 'hotel';
};
const HOTEL_KIND: Record<HotelKind | 'self', [string, string, string]> = {
    ger: ['게르 캠프', C.mintBg, C.mintDeep], premium: ['고급 게르', C.ink, C.glow], hotel: ['호텔', C.grayBg, C.body], self: ['숙박 없음', C.amberBg, C.amberFg],
};
/** 마스터에 없는 숙박 표기 — 기내박 · 고객이 직접 잡은 호텔 */
const SELF_STAYS = ['— (機内泊)', '— (お客様手配のホテル)'];
const MEMO_TAG_COLOR: Record<string, [string, string]> = {
    '일정': [C.mintBg, C.mintDeep], '숙소 확인': [C.amberBg, C.amberFg], '날짜': [C.amberBg, C.amberFg], '금액': [C.amberBg, C.amberFg], '요청': [C.grayBg, C.sub], '기타': [C.grayBg, C.sub],
};
interface AiInfo {
    base: { id: string; name: string; price: number; duration: string } | null;
    summary: string;
    memos: Array<{ tag: string; text: string }>;
    budget: string;
    budgetNote: string;
    /** 요청 반영 체크리스트 — 고객 요청 항목별로 반영 / 일부 반영 / 확인 필요 / 반영 못 함 */
    checks: Array<{ item: string; status: string; how: string }>;
    fromCache: boolean;
}
const CHECK_COLOR: Record<string, [string, string]> = {
    '반영': [C.mintBg, C.mintDeep], '일부 반영': [C.amberBg, C.amberFg], '확인 필요': [C.amberBg, C.amberFg], '반영 못 함': ['#FFF1F0', '#B42318'],
};
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export const ReservationDocumentEditor: React.FC<Props> = ({
    open, onClose, title, templateMode = false, previewMode = 'quote', customer, initialContent, onSave,
    tourStartDate, tourEndDate, assignedGuide, dailyAccommodations, onAssignGuide, onAssignAccommodation, onUnassignAccommodation, previewUrl,
    aiDraftQuoteId,
}) => {
    const [name, setName] = useState('');
    /** 여행 제목의 한국어 (AI 초안) — 한국어 일정표 이미지 제목에만 씀 */
    const [nameKo, setNameKo] = useState('');
    const [description, setDescription] = useState('');
    const [days, setDays] = useState<TemplateDay[]>([]);
    const [ds, setDs] = useState<DocumentSettings>(defaultDocumentSettings());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [people, setPeople] = useState(1);
    const [deposit, setDeposit] = useState(0);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [undoDays, setUndoDays] = useState<TemplateDay[] | null>(null);
    const [delDay, setDelDay] = useState<number | null>(null);
    /** 식사 「직접 입력」 중인 칸 — `DAY번호-slot` */
    const [mealEdit, setMealEdit] = useState<string | null>(null);
    const [openDay, setOpenDay] = useState(0);
    const [showMore, setShowMore] = useState(false);
    const [descOpen, setDescOpen] = useState<string | null>(null);
    /** DAY별 「사진·설명」 칸 펼침 (기본 접힘) */
    const [photoOpen, setPhotoOpen] = useState<Record<number, boolean>>({});
    // 텍스트 칸 입력 중 상태 (빈 줄·쉼표를 치는 동안 칸이 정리되지 않게) — DAY 순서가 바뀌면 비운다
    const [itemDraft, setItemDraft] = useState<Record<number, string>>({});
    const resetDrafts = () => { setItemDraft({}); };
    // 직접 추가 — 한국어(관리자용) + 일본어(고객용)
    const [custom, setCustom] = useState<Record<'inc' | 'exc', { ko: string; ja: string }>>({ inc: { ko: '', ja: '' }, exc: { ko: '', ja: '' } });
    const [spotRegion, setSpotRegion] = useState<string>('all');
    /** DAY 제목 「여행지에서 고르기」 패널이 열린 DAY (index) */
    const [titlePick, setTitlePick] = useState<number | null>(null);
    /** 「숙소에서 고르기」 칸이 열린 DAY (index) + 종류 탭 */
    const [hotelPick, setHotelPick] = useState<number | null>(null);
    const [hotelKindTab, setHotelKindTab] = useState<'all' | HotelKind>('all');
    // 미리보기 — 「고객 화면 보기」로 여는 오른쪽 칸. 지금 고치는 곳(섹션·DAY)으로 따라간다
    const [focus, setFocus] = useState<TripFocus | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    /** AI 초안 안내 카드 — 참고 상품 · 예산 · 확인 메모 */
    const [aiInfo, setAiInfo] = useState<AiInfo | null>(null);
    const [aiInfoOpen, setAiInfoOpen] = useState(false);
    /** AI 초안이 고른 원가 계획 (항목·수량 — 금액 없음) → 「원가 계산」 카드 */
    const [costPlan, setCostPlan] = useState<CostPlan | null>(null);
    const [budgetText, setBudgetText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    /** 열었을 때의 내용 — 바뀌었는지(작성 중) 표시용 */
    const baseSnap = useRef<string | null>(null);
    const [products, setProducts] = useState<TourProduct[]>([]);
    const [productId, setProductId] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [spotTarget, setSpotTarget] = useState<{ d: number; a: number } | null>(null);
    const { sources } = useTripSources();
    // ── AI 견적 초안 ──
    const [aiBusy, setAiBusy] = useState(false);
    const aiAutoTried = useRef(false);
    /** 「AI로 수정」 — 관리자가 한국어로 적는 수정 요청 */
    const [reviseText, setReviseText] = useState('');
    /** AI 수정 전 제목·포함·불포함 — 「일정 되돌리기」 때 일정과 함께 되돌린다 */
    const [undoRest, setUndoRest] = useState<{ name: string; included: string[]; excluded: string[] } | null>(null);

    // ── 열릴 때 초기값 ──
    useEffect(() => {
        if (!open) return;
        const merged = mergeDocumentSettings(initialContent?.documentSettings);
        const ppl = Math.max(1, customer?.peopleCount || 1);
        // 새 문서는 기본값(예시 요금)을 쓰지 않는다 — 총액이 있으면 총액 ÷ 인원, 없으면 빈칸
        if (!initialContent) merged.overview.pricePerPerson = customer?.totalAmount ? String(Math.round(customer.totalAmount / ppl)) : '';
        setName(initialContent?.name || customer?.tripType || '');
        setNameKo('');
        setDescription(initialContent?.description || '');
        setDays(Array.isArray(initialContent?.days) ? initialContent!.days : []);
        setDs(merged);
        baseSnap.current = JSON.stringify([initialContent?.name || customer?.tripType || '', Array.isArray(initialContent?.days) ? initialContent!.days : [], merged, tourStartDate || '', tourEndDate || '', ppl, customer?.deposit || 0]);
        setStartDate(tourStartDate || '');
        setEndDate(tourEndDate || '');
        setPeople(ppl);
        setDeposit(customer?.deposit || 0);
        setOpenDay(0);
        setNotice(null);
        setSaveError(null);
        setUndoDays(null);
        setUndoRest(null);
        setReviseText('');
        setDelDay(null);
        setPhotoOpen({});
        setMealEdit(null);
        setHotelPick(null);
        setTitlePick(null);
        setAiInfo(null);
        setAiInfoOpen(false);
        setCostPlan(null);
        setBudgetText('');
        resetDrafts();
        aiAutoTried.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialContent, tourStartDate, tourEndDate]);

    // ── 상품 목록 (일정 불러오기) ──
    useEffect(() => {
        if (!open || products.length > 0) return;
        setLoadingProducts(true);
        api.products.list().then((data: any) => {
            if (!Array.isArray(data)) return;
            const parse = (v: any) => { if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } } return v || []; };
            const mapped = data.map((p: any) => ({
                ...p,
                itineraryBlocks: parse(p.itineraryBlocks || p.itinerary_blocks),
                included: parse(p.included), excluded: parse(p.excluded),
                pricingOptions: parse(p.pricingOptions || p.pricing_options),
            })) as TourProduct[];
            setProducts(mapped);
            // 예약 상품명과 같은 상품을 미리 골라 두고, 일정이 비어 있으면 자동으로 채운다
            const target = (customer?.tripType || '').replace(/\s+/g, '').toLowerCase();
            const hit = target ? mapped.find(p => (p.name || '').replace(/\s+/g, '').toLowerCase() === target) : undefined;
            if (hit) {
                setProductId(hit.id);
                const empty = !initialContent || !Array.isArray(initialContent.days) || initialContent.days.length === 0;
                if (empty && !templateMode && productStats(hit).days > 0) applyProduct(hit, true);
            }
        }).finally(() => setLoadingProducts(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const applyProduct = (p: TourProduct, auto = false) => {
        const imported = blocksToDays(p.itineraryBlocks || []);
        if (!imported.length) { if (!auto) setSaveError('이 상품에는 DAY 일정이 등록되어 있지 않습니다.'); return; }
        // 확인창 대신 — 바꾸기 전 일정을 남겨 두고 안내줄에서 되돌릴 수 있게
        setUndoDays(!auto && days.length > 0 ? days : null);
        setUndoRest(null);
        const pricing = p.pricingOptions?.find(o => o.people === people) || p.pricingOptions?.[0];
        const included = (p.included || []).map(textOf).map((s: string) => s.trim()).filter(Boolean);
        const excluded = (p.excluded || []).map(textOf).map((s: string) => s.trim()).filter(Boolean);
        setName(p.name || name);
        setNameKo('');
        setDays(imported);
        setOpenDay(0);
        resetDrafts();
        setDs(cur => ({
            ...cur,
            overview: {
                ...cur.overview,
                pricePerPerson: String(pricing?.pricePerPerson || p.price || cur.overview.pricePerPerson),
                includedText: included.length ? included.join('\n') : cur.overview.includedText,
                excludedText: excluded.length ? excluded.join('\n') : cur.overview.excludedText,
            },
            // 상품의 포함/불포함을 이 문서의 체크 상태로
            quoteDoc: {
                ...cur.quoteDoc,
                included: included.length ? included : cur.quoteDoc.included,
                excluded: excluded.length ? excluded : cur.quoteDoc.excluded,
            },
        }));
        if (pricing?.depositPerPerson) setDeposit(pricing.depositPerPerson * people);
        setNotice(`「${p.name}」 일정·요금을 불러왔습니다 — 고객 요청에 맞게 DAY만 고치세요.`);
    };

    // ── AI 견적 초안 ──
    // 받은 초안은 이 브라우저에 보관 — 저장 전에 닫았다 다시 열어도 AI 를 다시 부르지 않는다 (비용 절약)
    const aiCacheKey = aiDraftQuoteId ? `mw-ai-draft:${aiDraftQuoteId}` : '';
    type AiDraft = {
        title?: string; titleKo?: string; days: TemplateDay[]; included?: string[]; excluded?: string[]; noteKo?: string;
        baseProduct?: { id: string; name: string; price: number; duration: string } | null;
        memos?: Array<{ tag: string; text: string }>; budgetNote?: string; budget?: string;
        checks?: Array<{ item: string; status: string; how: string }>;
        costPlan?: CostPlan | null;
    };
    const applyAiDraft = (draft: AiDraft, fromCache: boolean) => {
        if (!Array.isArray(draft?.days) || draft.days.length === 0) return;
        setUndoDays(days.length > 0 ? days : null);
        setUndoRest(null);
        setDays(draft.days);
        if (draft.title) setName(draft.title);
        setNameKo(draft.titleKo || '');
        if (draft.costPlan) setCostPlan(draft.costPlan);
        if (draft.budget) setBudgetText(draft.budget);
        setOpenDay(0);
        resetDrafts();
        setDs(cur => ({
            ...cur,
            quoteDoc: {
                ...cur.quoteDoc,
                included: draft.included?.length ? draft.included : cur.quoteDoc.included,
                excluded: draft.excluded?.length ? draft.excluded : cur.quoteDoc.excluded,
            },
        }));
        // 안내는 카드로 (예전 보관본은 메모가 한 줄 글이라 나눠서 보여 준다)
        const memos = draft.memos?.length
            ? draft.memos
            : String(draft.noteKo || '').split(/\s*\n\s*|\s+\/\s+/).map(t => t.trim()).filter(Boolean).map(text => ({ tag: '기타', text }));
        setAiInfo({ base: draft.baseProduct || null, summary: draft.memos?.length ? draft.noteKo || '' : '', memos, budget: draft.budget || '', budgetNote: draft.budgetNote || '', checks: draft.checks || [], fromCache });
        setNotice(null);
    };
    const runAiDraft = async (force: boolean) => {
        if (!aiDraftQuoteId || aiBusy) return;
        if (!force) {
            try {
                const cached = localStorage.getItem(aiCacheKey);
                if (cached) { applyAiDraft(JSON.parse(cached), true); return; }
            } catch { /* 보관함을 못 쓰면 새로 만든다 */ }
        }
        setAiBusy(true);
        setSaveError(null);
        setAiInfo(null);
        setNotice('AI 가 고객 요청으로 일정 초안을 만드는 중입니다… (30초~1분)');
        try {
            const res = await api.quotes.aiDraft(aiDraftQuoteId, { people, startDate: startDate || undefined, endDate: endDate || undefined });
            const draft = res?.draft as AiDraft | undefined;
            if (!draft?.days?.length) throw new Error('AI 가 일정을 만들지 못했습니다.');
            try { localStorage.setItem(aiCacheKey, JSON.stringify(draft)); } catch { /* 보관 실패는 무시 */ }
            applyAiDraft(draft, false);
        } catch (e) {
            setNotice(null);
            setSaveError(e instanceof Error ? e.message : 'AI 초안 만들기에 실패했습니다.');
        } finally {
            setAiBusy(false);
        }
    };
    // 「AI로 수정」 — 지금 일정 + 한국어 수정 요청 → AI 가 시킨 곳만 고친 일정
    const runAiRevise = async () => {
        const instruction = reviseText.trim();
        if (!aiDraftQuoteId || aiBusy || !instruction || days.length === 0) return;
        setAiBusy(true);
        setSaveError(null);
        setNotice('AI 가 수정 요청대로 일정을 고치는 중입니다… (30초~1분)');
        try {
            const res = await api.quotes.aiDraft(aiDraftQuoteId, {
                people, startDate: startDate || undefined, endDate: endDate || undefined,
                revise: { instruction, current: { title: name, days, included: ds.quoteDoc.included, excluded: ds.quoteDoc.excluded } },
            });
            const draft = res?.draft as AiDraft | undefined;
            if (!draft?.days?.length) throw new Error('AI 가 일정을 고치지 못했습니다.');
            const merged = mergeRevisedDays(days, draft.days);
            setUndoDays(days);
            setUndoRest({ name, included: ds.quoteDoc.included, excluded: ds.quoteDoc.excluded });
            setDays(merged);
            if (draft.title) setName(draft.title);
            if (draft.titleKo) setNameKo(draft.titleKo);
            if (draft.costPlan) setCostPlan(draft.costPlan);
            setDs(cur => ({ ...cur, quoteDoc: { ...cur.quoteDoc, included: draft.included || cur.quoteDoc.included, excluded: draft.excluded || cur.quoteDoc.excluded } }));
            resetDrafts();
            setReviseText('');
            // 닫았다 다시 열어도 고친 일정이 나오게 보관본도 바꾼다
            try { localStorage.setItem(aiCacheKey, JSON.stringify({ ...draft, days: merged, noteKo: '' })); } catch { /* 보관 실패는 무시 */ }
            setNotice(`AI 가 일정을 고쳤습니다 — 「${instruction.length > 40 ? `${instruction.slice(0, 40)}…` : instruction}」${draft.noteKo ? ` · 바꾼 점: ${draft.noteKo.replace(/\s*\n\s*/g, ' / ')}` : ''} — 확인 후 저장하세요.`);
        } catch (e) {
            setNotice(null);
            setSaveError(e instanceof Error ? e.message : 'AI 수정에 실패했습니다.');
        } finally {
            setAiBusy(false);
        }
    };
    // 견적을 열었는데 일정이 비어 있고 상품 일정도 불러오지 않았으면 — 자동으로 초안
    useEffect(() => {
        if (!open || !aiDraftQuoteId || templateMode || aiAutoTried.current) return;
        if (loadingProducts || products.length === 0) return; // 상품 일정 자동 불러오기가 먼저
        if (days.length > 0) { aiAutoTried.current = true; return; }
        aiAutoTried.current = true;
        void runAiDraft(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, aiDraftQuoteId, loadingProducts, products.length, days.length]);

    // ── 일정 편집 ──
    const patchDay = (i: number, patch: Partial<TemplateDay>) => setDays(d => d.map((x, k) => (k === i ? { ...x, ...patch } : x)));
    const renumber = (list: TemplateDay[]) => list.map((x, k) => ({ ...x, day: k + 1 }));
    const addDay = () => setDays(d => { setOpenDay(d.length); return [...d, { day: d.length + 1, title: '', region: '', summary: '', move: '', activities: [], meals: {}, accommodation: null }]; });
    // 삭제는 두 번 눌러야 — 첫 번째 누르면 「삭제?」로 바뀌고 3초 안에 다시 누르면 지운다
    const removeDay = (i: number) => {
        if (delDay !== i) { setDelDay(i); window.setTimeout(() => setDelDay(v => (v === i ? null : v)), 3000); return; }
        setDelDay(null); resetDrafts(); setDays(d => renumber(d.filter((_, k) => k !== i)));
    };
    const moveDay = (i: number, to: number) => { resetDrafts(); moveDayInner(i, to); };
    const moveDayInner = (i: number, to: number) => setDays(d => { if (to < 0 || to >= d.length) return d; const a = [...d]; const [m] = a.splice(i, 1); a.splice(to, 0, m); setOpenDay(to); return renumber(a); });
    const patchAct = (i: number, a: number, patch: Record<string, unknown>) => setDays(d => d.map((x, k) => (k === i ? { ...x, activities: x.activities.map((y, j) => (j === a ? { ...y, ...patch } : y)) } : x)));
    const fillFromSpot = (i: number, a: number, s: TouristSpot) => patchAct(i, a, {
        title: cleanSpotName(s.name_kr),
        description: s.description || '',
        images: s.images?.length ? [...s.images] : [],
    });
    // 호텔 마스터에서 고르면 사진·설명이 붙고, 다음 날 조식이 비어 있으면 「ホテル食」으로 채운다
    const fillFromHotel = (i: number, h: Hotel) => setDays(list => list.map((x, k) => {
        if (k === i) return { ...x, accommodation: { id: h.id, name: h.name_kr, location: h.address || '', images: h.images || [], description: h.description || '' } };
        if (k === i + 1 && !x.meals?.breakfast) return { ...x, meals: { ...(x.meals || {}), breakfast: 'ホテル食' } };
        return x;
    }));
    const hotels = sources.hotels;
    const hotelByName = (name: string) => hotels.find(h => h.name_kr === name);

    // ── 포함 / 불포함 (지금 고객 화면에 나가는 목록을 기준으로 체크) ──
    const matchedProduct = products.find(p => p.id === productId);
    const prodList = (k: 'included' | 'excluded') => (previewMode === 'confirmed' ? ((matchedProduct?.[k] || []) as any[]).map(textOf).map((s: string) => s.trim()).filter(Boolean) : []);
    const listNow = (k: 'included' | 'excluded'): string[] => {
        if (ds.quoteDoc[k].length) return ds.quoteDoc[k];
        const prod = prodList(k);
        if (prod.length) return prod;
        const text = splitLines(k === 'included' ? ds.overview.includedText : ds.overview.excludedText);
        return text.length ? text : k === 'included' ? DEFAULT_INCLUDED : DEFAULT_EXCLUDED;
    };
    const incNow = listNow('included');
    const excNow = listNow('excluded');
    const toggleInc = (kind: 'inc' | 'exc', t: string) => {
        let inc = [...incNow], exc = [...excNow];
        const [mine, other] = kind === 'inc' ? [inc, exc] : [exc, inc];
        if (mine.includes(t)) {
            if (mine.length === 1) return; // 하나는 남겨 둔다 (비우면 기본 목록으로 돌아가므로)
            const next = mine.filter(x => x !== t);
            if (kind === 'inc') inc = next; else exc = next;
        } else {
            const nextOther = other.filter(x => x !== t);
            if (kind === 'inc') { inc = [...inc, t]; exc = nextOther.length ? nextOther : exc; }
            else { exc = [...exc, t]; inc = nextOther.length ? nextOther : inc; }
        }
        setQ({ included: inc, excluded: exc });
    };
    const addCustom = (kind: 'inc' | 'exc') => {
        const { ko, ja } = custom[kind];
        const k = ko.trim(), j = ja.trim();
        // 한국어가 목록에 있는 이름이면 그 일본어를 쓰고, 아니면 일본어 칸이 필요하다
        const known = [...KO_OF.entries()].find(([, v]) => v === k)?.[0];
        const value = j || known;
        if (!value) { setSaveError('고객 화면에는 일본어로 나갑니다. 일본어 칸도 채워 주세요 (번역기에서 옮겨 붙여도 됩니다).'); return; }
        if (k && !KO_OF.has(value)) setQ({ labels: [...ds.quoteDoc.labels.filter(l => !l.startsWith(`${value}\t`)), `${value}\t${k}`] });
        if (!(kind === 'inc' ? incNow : excNow).includes(value)) toggleInc(kind, value);
        setCustom(c => ({ ...c, [kind]: { ko: '', ja: '' } }));
    };
    const labelMap = customKo(ds.quoteDoc.labels);
    /** 관리자 화면 이름 — 한국어가 없으면 일본어 그대로 */
    const koOf = (t: string) => KO_OF.get(t) || labelMap.get(t) || '';
    const optionsOf = (opts: Array<[string, string]>, cur: string[], other: string[]) => {
        // 체크된 항목(상품·직접 입력 포함)을 앞에, 나머지 자주 쓰는 항목은 뒤에 (반대편 목록에 있는 것은 빼고)
        // 한국어 이름이 같은 항목(全日程宿泊 / 全日程の宿泊 등)은 한 번만 보이게
        const shownKo = new Set([...cur, ...other].map(t => koOf(t)).filter(Boolean));
        return [...cur, ...opts.map(o => o[0]).filter(t => !cur.includes(t) && !other.includes(t) && !shownKo.has(koOf(t)))];
    };

    // ── 대표 여행지 (見どころ) — 관광지 마스터에서 지역별로 고른 곳만 고객 화면에 나간다 ──
    const designSpots = useMemo(() => fallbackSpots(sources), [sources]);
    const spotPool = useMemo(() => sources.spots.filter(s => s.region !== 'food' && s.region !== 'vehicle' && (s.images?.length || 0) > 0), [sources]);
    const spotsPicked = ds.quoteDoc.spots.filter(id => spotPool.some(s => s.id === id));
    const toggleSpot = (id: string) => setQ({ spots: spotsPicked.includes(id) ? spotsPicked.filter(x => x !== id) : [...spotsPicked, id] });

    // ── 금액 ──
    const perPerson = num(ds.overview.pricePerPerson);
    const total = perPerson * people;
    const balance = Math.max(0, total - deposit);
    const setQ = (patch: Partial<DocumentSettings['quoteDoc']>) => setDs(s => ({ ...s, quoteDoc: { ...s.quoteDoc, ...patch } }));

    // ── 미리보기 (입력이 잦으므로 지연 반영) ──
    const assignedOf = (dayNo: number) => dailyAccommodations?.find(x => x.day === dayNo)?.accommodation;
    const previewDays = useMemo(() => days.map(d => {
        const assigned = assignedOf(d.day);
        return assigned?.name ? { ...d, accommodation: { name: assigned.name, images: assigned.images || [] } } : d;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [days, dailyAccommodations]);
    const previewInput = useDeferredValue({ previewDays, ds, startDate, endDate, people, deposit, name, total });
    const preview = useMemo(() => {
        const doc = buildTripDoc({
            mode: previewMode,
            id: customer?.tripNumber || 'preview',
            docNo: customer?.tripNumber,
            customerName: templateMode ? '〇〇' : customer?.name,
            people: previewInput.people,
            startDate: previewInput.startDate,
            endDate: previewInput.endDate,
            title: previewInput.name,
            days: previewInput.previewDays,
            documentSettings: previewInput.ds,
            total: previewInput.total,
            deposit: previewInput.deposit || null,
            guideName: assignedGuide?.name,
            designSpots,
            spotMaster: sources.spots,
            // 확정일정표 고객 화면은 예약 상품의 포함/불포함을 쓴다 (체크한 항목이 있으면 그것이 우선)
            included: prodList('included'),
            excluded: prodList('excluded'),
        });
        return { doc, images: resolveTripImages(doc, sources) };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewInput, previewMode, customer, templateMode, assignedGuide, sources, designSpots, matchedProduct]);


    // 확인창(confirm/alert)은 앱 안 브라우저 등에서 막혀 아무 반응이 없어 보일 수 있으므로, 편집기 안에 안내를 띄운다
    const handleSave = async () => {
        setSaveError(null);
        if ((startDate && !endDate) || (!startDate && endDate)) { setSaveError('출발일과 도착일을 모두 입력해 주세요.'); return; }
        if (startDate && endDate && endDate < startDate) { setSaveError('도착일이 출발일보다 빠릅니다.'); return; }
        setSaving(true);
        try {
            await onSave(
                { name, description, days, documentSettings: ds },
                startDate || endDate ? { startDate, endDate } : undefined,
                templateMode ? undefined : { pricePerPerson: perPerson, people, total, deposit },
            );
            onClose();
        } catch (e: any) {
            setSaveError('저장하지 못했습니다: ' + (e?.message || e));
        } finally {
            setSaving(false);
        }
    };

    // 열었을 때와 내용이 달라졌는지 — 머리의 「작성 중 / 저장됨」
    const snap = useMemo(() => (open ? JSON.stringify([name, days, ds, startDate, endDate, people, deposit]) : ''), [open, name, days, ds, startDate, endDate, people, deposit]);
    const dirty = baseSnap.current !== null && snap !== baseSnap.current;

    if (!open) return null;
    const nights = startDate && endDate ? Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000) : null;

    // ── 견적 담당자용 한국어 일정표 이미지 (숙소·식사 중심, 사진 없음) ──
    const downloadKoImage = async () => {
        if (!days.length) return;
        const WD = ['일', '월', '화', '수', '목', '금', '토'];
        const dateOf = (dayNo: number) => {
            if (!startDate) return '';
            const d = new Date(`${startDate}T00:00:00`);
            d.setDate(d.getDate() + dayNo - 1);
            return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
        };
        const jaToKo = (t = '') => t.replace(/約/g, '약 ').replace(/時間/g, '시간').replace(/分/g, '분').replace(/\s+/g, ' ').trim();
        // 식사 — 목록 이름이면 한국어로, 섞인 글이면 아는 낱말만 바꾼다
        const mealKo = (v = '') => {
            const t = v.trim();
            if (!t) return '없음';
            if (/^(o|○|◯)$/i.test(t)) return '포함';
            return koOf(t) || MEAL_KO.reduce((acc, [ja, ko]) => (ja.length > 1 ? acc.split(ja).join(ko) : acc), t);
        };
        try {
            await downloadKoItineraryImage({
                title: nameKo || name || '일정표',
                meta: [
                    customer?.name ? `고객 ${customer.name}` : '',
                    `인원 ${people}명`,
                    startDate ? `기간 ${startDate}${endDate ? ` ~ ${endDate}` : ''}${nights != null && nights >= 0 ? ` (${nights}박 ${nights + 1}일)` : ''}` : '',
                    perPerson ? `1인 ¥${yen(perPerson)} · 총액 ¥${yen(total)}` : '',
                ],
                days: days.map(d => {
                    const stay = assignedOf(d.day)?.name || d.accommodation?.name || '';
                    return {
                        label: `DAY ${d.day}${dateOf(d.day) ? ` · ${dateOf(d.day)}` : ''}`,
                        title: d.titleKo || d.title,
                        sub: [d.region ? `지역 ${d.region}` : '', d.move ? `이동 ${jaToKo(d.move)}` : '', d.noteKo || d.note ? `포인트 ${d.noteKo || d.note}` : ''].filter(Boolean).join('  ·  '),
                        lines: d.activities.map(a => a.ko || a.title).filter(Boolean),
                        stay: stay === '—' || stay.startsWith('— ') ? `없음 ${stay.replace(/^—\s*/, '')}`.trim() : stay,
                        meals: [['조식', mealKo(d.meals?.breakfast)], ['중식', mealKo(d.meals?.lunch)], ['석식', mealKo(d.meals?.dinner)]],
                    };
                }),
                included: incNow.map(t => koOf(t) || t),
                excluded: excNow.map(t => koOf(t) || t),
            }, `일정표_${customer?.name || '견적'}_${startDate || new Date().toISOString().slice(0, 10)}.png`);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : '이미지를 만들지 못했습니다.');
        }
    };

    // ── 진행도 · 섹션 탭 ──
    const done = {
        customer: !!customer?.name && !!startDate && !!endDate,
        price: perPerson > 0,
        plan: days.length > 0,
        inc: incNow.length > 0,
        spot: spotsPicked.length > 0,
    };
    const steps = ([
        ...(templateMode ? [] : [['customer', '고객 정보', '']]),
        ['price', '여행 금액', perPerson ? `¥${yen(perPerson)}` : ''],
        ['plan', '일정표', `${days.length}일`],
        ['inc', '포함·불포함', ''],
        ['spot', '대표 여행지', `${spotsPicked.length}개`],
    ] as Array<[keyof typeof done, string, string]>).map(([id, label, meta], k) => ({ id, label, meta, n: k + 1, ok: done[id] }));
    const nDone = steps.filter(s => s.ok).length;
    const goTo = (id: string) => scrollRef.current?.querySelector(`#qe-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const status = dirty
        ? { label: '작성 중', bg: C.amberBg, fg: C.amberFg }
        : initialContent ? { label: '저장됨', bg: C.mintBg, fg: C.mintDeep } : { label: '새 문서', bg: C.grayBg, fg: C.sub };
    const kicker = templateMode ? 'PRESET' : previewMode === 'confirmed' ? 'ITINERARY' : 'QUOTATION';
    const depPer = people > 0 ? Math.round(deposit / people) : deposit;
    const dateLabel = (i: number) => {
        if (!startDate) return '';
        const d = new Date(`${startDate}T00:00:00`);
        if (Number.isNaN(d.getTime())) return '';
        d.setDate(d.getDate() + i);
        return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_KO[d.getDay()]})`;
    };
    const focusDay = (dayNo: number, film = false) => setFocus({ section: 'q-plan', day: dayNo, film, at: Date.now() });
    const undoAll = () => {
        if (!undoDays) return;
        setDays(undoDays); setUndoDays(null); resetDrafts();
        if (undoRest) {
            setName(undoRest.name);
            setDs(cur => ({ ...cur, quoteDoc: { ...cur.quoteDoc, included: undoRest.included, excluded: undoRest.excluded } }));
            setUndoRest(null);
        }
        setAiInfo(null);
        setNotice('바꾸기 전 일정으로 되돌렸습니다.');
    };
    const isTimeLike = (v: string) => !v || /^\d{1,2}:\d{2}$/.test(v.trim());
    const smallBtn: React.CSSProperties = { height: 38, padding: '0 12px', border: `1px solid ${C.line}`, borderRadius: 10, background: '#FFFFFF', fontSize: 12, fontWeight: 600, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' };
    const iconBtn: React.CSSProperties = { width: 32, height: 32, border: 0, borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' };

    return (
        <div className="qe" data-mw-overlay="" style={{ position: 'fixed', inset: 0, zIndex: 210, background: C.bg, display: 'flex', flexDirection: 'column' }}>
            <style>{EDITOR_CSS}</style>

            {/* ── 머리 (고정) ── */}
            <header style={{ flex: 'none', background: 'rgba(255,255,255,0.96)', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button type="button" aria-label="뒤로" onClick={onClose} className="qe-hbg" style={{ ...iconBtn, width: 40, height: 40, borderRadius: 12 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
                    </button>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: EN, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: C.mintDeep }}>{kicker}</span>
                            <span style={{ height: 20, padding: '0 8px', borderRadius: 6, background: status.bg, fontSize: 11, fontWeight: 700, color: status.fg, display: 'inline-flex', alignItems: 'center' }}>{status.label}</span>
                            <span style={{ fontSize: 11, color: C.mute }}>{nDone} / {steps.length} 입력됨</span>
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                    </div>
                    {onAssignGuide && (
                        <button type="button" onClick={onAssignGuide} className="qe-hbd" style={{ ...smallBtn, height: 40, borderRadius: 12, fontSize: 13 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
                            {assignedGuide?.name || '가이드 배정'}
                        </button>
                    )}
                    <button type="button" onClick={() => setPreviewOpen(v => !v)} aria-pressed={previewOpen} className="qe-hbd"
                        style={{ ...smallBtn, height: 40, borderRadius: 12, fontSize: 13, fontWeight: 700, ...(previewOpen ? { background: C.ink, color: '#FFFFFF', borderColor: C.ink } : {}) }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>
                        {previewOpen ? '미리보기 닫기' : '고객 화면 보기'}
                    </button>
                    <button type="button" onClick={onClose} className="qe-hbg" style={{ flex: 'none', height: 40, padding: '0 12px', border: 0, borderRadius: 12, background: 'transparent', fontSize: 13, fontWeight: 600, color: C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>취소</button>
                    <button type="button" onClick={handleSave} disabled={saving} className="qe-hdark"
                        style={{ flex: 'none', height: 40, padding: '0 18px', border: 0, borderRadius: 12, background: C.ink, fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: saving ? 'wait' : 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
                        <Check size={16} w={2.4} />{saving ? '저장 중…' : '저장'}
                    </button>
                </div>
                <nav className="qe-noscroll" style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '0 20px 10px' }}>
                    {steps.map(s => (
                        <button key={s.id} type="button" onClick={() => goTo(s.id)} className="qe-hbd"
                            style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px 0 8px', borderRadius: 999, background: '#FFFFFF', border: `1px solid ${C.line}`, color: C.ink, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: s.ok ? C.mint : C.line2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: EN, fontSize: 10, fontWeight: 700, color: s.ok ? '#FFFFFF' : C.sub }}>
                                {s.ok ? <Check size={10} /> : s.n}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                            {s.meta && <span style={{ fontSize: 11, color: C.mute }}>{s.meta}</span>}
                        </button>
                    ))}
                </nav>
            </header>

            {/* ── 알림 줄 ── */}
            {saveError && (
                <div role="alert" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#FFF1F0', borderBottom: '1px solid #F8D3CF', fontSize: 12, fontWeight: 700, color: '#B42318' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{saveError}</span>
                    <button type="button" aria-label="닫기" onClick={() => setSaveError(null)} style={{ ...iconBtn, width: 26, height: 26, color: '#B42318' }}>✕</button>
                </div>
            )}
            {notice && (
                <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: C.mintBg2, borderBottom: `1px solid #CFF3E9`, fontSize: 12, fontWeight: 700, color: C.mintDeep }}>
                    <Sparkle size={14} color={C.mint} />
                    <span style={{ flex: 1, minWidth: 0 }}>{notice}</span>
                    {undoDays && (
                        <button type="button" onClick={undoAll} style={{ flex: 'none', height: 28, padding: '0 10px', border: `1px solid ${C.mintLine}`, borderRadius: 8, background: '#FFFFFF', fontSize: 11, fontWeight: 700, color: C.mintDeep, cursor: 'pointer' }}>일정 되돌리기</button>
                    )}
                    <button type="button" aria-label="닫기" onClick={() => { setNotice(null); if (!aiInfo) { setUndoDays(null); setUndoRest(null); } }} style={{ ...iconBtn, width: 26, height: 26, color: C.mint }}>✕</button>
                </div>
            )}

            {/* 본문 + 미리보기 칸 (미리보기는 머리 아래에서만 겹친다) */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
            <div ref={scrollRef} style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
                {/* ── AI 초안 안내 카드 ── */}
                {aiInfo && (
                    <div style={{ background: '#FFFFFF', borderBottom: `1px solid ${C.line}` }}>
                        <div style={{ maxWidth: 880, margin: '0 auto', padding: '14px 24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${C.mint} 0%,${C.mintHi} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} /></span>
                                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>AI 초안을 넣었어요{aiInfo.fromCache ? ' (앞서 만든 초안)' : ''}</span>
                                    <span style={{ fontSize: 12, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {aiInfo.checks.length > 0 && (() => {
                                            // 요청 반영 요약 — 「요청 9개 · 반영 6 · 확인 필요 3」
                                            const cnt = (st: string) => aiInfo.checks.filter(c => c.status === st).length;
                                            const parts = [['반영', cnt('반영')], ['일부 반영', cnt('일부 반영')], ['확인 필요', cnt('확인 필요')], ['반영 못 함', cnt('반영 못 함')]].filter(([, n]) => n);
                                            return <b style={{ color: C.ink, fontWeight: 700 }}>요청 {aiInfo.checks.length}개 · {parts.map(([k, n]) => `${k} ${n}`).join(' · ')} — </b>;
                                        })()}
                                        {aiInfo.summary || '내용을 확인하고 금액을 넣은 뒤 저장해 주세요'}
                                    </span>
                                </span>
                                {undoDays && (
                                    <button type="button" onClick={undoAll} className="qe-hbg" style={{ flex: 'none', height: 32, padding: '0 10px', border: `1px solid ${C.line}`, borderRadius: 8, background: '#FFFFFF', fontSize: 12, fontWeight: 700, color: C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>되돌리기</button>
                                )}
                                {(aiInfo.base || aiInfo.memos.length > 0 || aiInfo.checks.length > 0 || aiInfo.budget || aiInfo.budgetNote) && (
                                    <button type="button" onClick={() => setAiInfoOpen(v => !v)} style={{ flex: 'none', height: 32, padding: '0 10px', border: 0, borderRadius: 8, background: C.mintBg2, fontSize: 12, fontWeight: 700, color: C.mintDeep, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {aiInfoOpen ? '접기' : aiInfo.checks.length ? '요청 반영·메모 보기' : `메모 보기${aiInfo.memos.length ? ` ${aiInfo.memos.length}` : ''}`}<Chevron open={aiInfoOpen} size={13} />
                                    </button>
                                )}
                                <button type="button" aria-label="닫기" onClick={() => { setAiInfo(null); setUndoDays(null); setUndoRest(null); }} className="qe-hbg" style={iconBtn}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                                </button>
                            </div>
                            {aiInfoOpen && (
                                <>
                                    {(aiInfo.base || aiInfo.budget || aiInfo.budgetNote) && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 8, paddingLeft: 38 }}>
                                            {aiInfo.base && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 12, background: C.bg }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: C.mute }}>참고 상품</span>
                                                    <span style={{ fontFamily: JP, fontSize: 13, fontWeight: 700 }}>{aiInfo.base.name}</span>
                                                    <span style={{ fontSize: 12, color: C.sub }}>
                                                        {aiInfo.base.duration && <span style={{ fontFamily: JP }}>{aiInfo.base.duration}</span>}
                                                        {aiInfo.base.price ? <> · 1인 <span style={{ fontFamily: EN, fontWeight: 600, color: C.ink }}>¥{yen(aiInfo.base.price)}</span></> : null}
                                                    </span>
                                                </div>
                                            )}
                                            {(aiInfo.budget || aiInfo.budgetNote) && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 12, background: C.bg }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: C.mute }}>예산</span>
                                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{aiInfo.budgetNote || aiInfo.budget}</span>
                                                    {aiInfo.budget && aiInfo.budgetNote && <span style={{ fontSize: 12, color: C.sub }}>고객이 적은 예산: {aiInfo.budget}</span>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {aiInfo.checks.length > 0 && (
                                        // 요청 반영 체크리스트 — 고객 요청서의 항목마다 일정에 어떻게 넣었는지
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 38 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: C.mute, marginBottom: 4 }}>고객 요청 반영 체크리스트</span>
                                            {aiInfo.checks.map((c, k) => {
                                                const [cb, cf] = CHECK_COLOR[c.status] || CHECK_COLOR['확인 필요'];
                                                return (
                                                    <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: k ? `1px solid ${C.line2}` : 0 }}>
                                                        <span style={{ flex: 'none', minWidth: 58, height: 20, padding: '0 7px', boxSizing: 'border-box', borderRadius: 6, background: cb, fontSize: 10, fontWeight: 700, color: cf, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>{c.status}</span>
                                                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{c.item}</span>
                                                            {c.how && <span style={{ fontSize: 12, lineHeight: 1.6, color: C.body }}>{c.how}</span>}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {aiInfo.memos.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 38 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: C.mute, marginBottom: 4 }}>확인이 필요한 메모</span>
                                            {aiInfo.memos.map((m, k) => {
                                                const [tb, tf] = MEMO_TAG_COLOR[m.tag] || MEMO_TAG_COLOR['기타'];
                                                return (
                                                    <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: k ? `1px solid ${C.line2}` : 0 }}>
                                                        <span style={{ flex: 'none', height: 20, padding: '0 7px', borderRadius: 6, background: tb, fontSize: 10, fontWeight: 700, color: tf, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{m.tag}</span>
                                                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.65, color: C.body }}>{m.text}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ maxWidth: 880, width: '100%', margin: '0 auto', padding: '16px 24px 48px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!templateMode && days.length === 0 && !aiBusy && (
                        <div style={{ padding: '12px 16px', borderRadius: 14, background: C.amberBg, fontSize: 12, fontWeight: 600, color: C.amberFg }}>
                            일정표가 비어 있어요 — 그대로 저장할 수 있지만 고객 화면에 일정이 나오지 않아요. 「상품에서 불러오기」{aiDraftQuoteId ? '나 「AI 초안 만들기」' : ''}로 채울 수 있어요.
                        </div>
                    )}

                    {/* 01 고객 정보 */}
                    {!templateMode && (
                        <section id="qe-customer" style={sectionStyle} onFocusCapture={() => setFocus({ section: 'q-info', at: Date.now() })}>
                            <SecHead n="01" title="고객 정보" hint="견적 요청·예약에서 자동으로 채워져요" />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap: 14 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                                    <Lbl>고객 이름</Lbl>
                                    <span style={{ ...fieldStyle(), display: 'flex', alignItems: 'center', background: C.bg, fontWeight: 600 }}>{customer?.name || '—'}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <Lbl>인원</Lbl>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 46, padding: '0 6px', border: `1px solid ${C.line}`, borderRadius: 12, boxSizing: 'border-box' }}>
                                        <button type="button" aria-label="인원 줄이기" onClick={() => { const n = Math.max(1, people - 1); setDeposit(depPer * n); setPeople(n); }}
                                            style={{ width: 34, height: 34, border: 0, borderRadius: 10, background: C.bg, fontSize: 18, color: C.ink, cursor: 'pointer' }}>−</button>
                                        <span style={{ fontFamily: EN, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>{people}<span style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 500, color: C.sub }}> 명</span></span>
                                        <button type="button" aria-label="인원 늘리기" onClick={() => { const n = Math.min(60, people + 1); setDeposit(depPer * n); setPeople(n); }}
                                            style={{ width: 34, height: 34, border: 0, borderRadius: 10, background: C.mintBg, fontSize: 18, color: C.mintDeep, cursor: 'pointer' }}>+</button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <Lbl note="자동">기간</Lbl>
                                    <span style={{ height: 46, padding: '0 14px', borderRadius: 12, background: C.mintBg2, display: 'flex', alignItems: 'center', fontFamily: nights != null && nights >= 0 ? JP : 'inherit', fontSize: nights != null && nights >= 0 ? 15 : 13, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>
                                        {nights != null && nights >= 0 ? `${nights}泊${nights + 1}日` : '날짜를 넣으면 자동'}
                                    </span>
                                </div>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl>출발일</Lbl>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={fieldStyle({ padding: '0 12px', fontSize: 14 })} /></label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl>도착일</Lbl>
                                    <input type="date" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} style={fieldStyle({ padding: '0 12px', fontSize: 14 })} /></label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl note="선택">항공편 IN</Lbl>
                                    <input type={isTimeLike(ds.quoteDoc.flightIn) ? 'time' : 'text'} value={ds.quoteDoc.flightIn} placeholder="14:15" onChange={e => setQ({ flightIn: e.target.value })} style={fieldStyle({ padding: '0 12px', fontSize: 14 })} /></label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl note="선택">항공편 OUT</Lbl>
                                    <input type={isTimeLike(ds.quoteDoc.flightOut) ? 'time' : 'text'} value={ds.quoteDoc.flightOut} placeholder="00:25" onChange={e => setQ({ flightOut: e.target.value })} style={fieldStyle({ padding: '0 12px', fontSize: 14 })} /></label>
                            </div>
                        </section>
                    )}

                    {/* 02 여행 금액 */}
                    <section id="qe-price" style={sectionStyle} onFocusCapture={() => setFocus({ section: 'q-price', at: Date.now() })}>
                        <SecHead n={templateMode ? '01' : '02'} title="여행 금액" hint={templateMode ? '프리셋 기본 1인 요금' : '총액·잔금은 자동 계산돼요'} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl>1인 요금</Lbl>
                                <span style={{ position: 'relative', display: 'block' }}>
                                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: EN, fontSize: 15, fontWeight: 600, color: C.mute }}>¥</span>
                                    <input inputMode="numeric" value={perPerson ? perPerson.toLocaleString('ja-JP') : ''} placeholder="128,000"
                                        onChange={e => setDs(s => ({ ...s, overview: { ...s.overview, pricePerPerson: String(num(e.target.value)) } }))}
                                        style={fieldStyle({ padding: '0 14px 0 30px', fontFamily: EN, fontWeight: 600 })} />
                                </span></label>
                            {!templateMode && (
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl note="PayPal">1인 예약금</Lbl>
                                    <span style={{ position: 'relative', display: 'block' }}>
                                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: EN, fontSize: 15, fontWeight: 600, color: C.mute }}>¥</span>
                                        <input inputMode="numeric" value={depPer ? depPer.toLocaleString('ja-JP') : ''} placeholder={perPerson ? Math.round(perPerson * 0.1).toLocaleString('ja-JP') : '20,000'}
                                            onChange={e => setDeposit(num(e.target.value) * people)}
                                            style={fieldStyle({ padding: '0 14px 0 30px', fontFamily: EN, fontWeight: 600 })} />
                                    </span></label>
                            )}
                        </div>
                        {!templateMode && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', borderRadius: 16, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 18px', background: C.ink, color: '#FFFFFF' }}>
                                    <span style={{ fontSize: 12, color: C.faint, whiteSpace: 'nowrap' }}>총액 · {people}명</span>
                                    <span style={{ fontFamily: EN, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>¥{yen(total)}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 18px', background: C.mintBg2 }}>
                                    <span style={{ fontSize: 12, color: C.sub, whiteSpace: 'nowrap' }}>예약금 합계 · PayPal</span>
                                    <span style={{ fontFamily: EN, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: C.mintDeep }}>¥{yen(deposit)}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 18px', background: C.bg }}>
                                    <span style={{ fontSize: 12, color: C.sub, whiteSpace: 'nowrap' }}>잔금 · 현지 현금</span>
                                    <span style={{ fontFamily: EN, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>¥{yen(balance)}</span>
                                </div>
                            </div>
                        )}
                        {aiDraftQuoteId && !templateMode && (
                            <QuoteCostCard quoteId={aiDraftQuoteId} pax={people} startDate={startDate} plan={costPlan} budgetText={budgetText}
                                onApply={(perYen, depPerYen) => {
                                    setDs(cur => ({ ...cur, overview: { ...cur.overview, pricePerPerson: String(perYen) } }));
                                    if (!deposit && depPerYen) setDeposit(depPerYen * people);
                                    setNotice(`원가 계산 금액을 넣었습니다 — 1인 ¥${perYen.toLocaleString('ja-JP')}`);
                                }} />
                        )}
                        <button type="button" onClick={() => setShowMore(v => !v)}
                            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 4px', border: 0, background: 'transparent', fontSize: 12, fontWeight: 600, color: C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <Chevron open={showMore} />추가·할인 · 비고 · 숙박 등급 (선택)
                        </button>
                        {showMore && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 14, marginTop: -6 }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl note="고객 화면에 그대로">추가·할인</Lbl>
                                    <input value={ds.quoteDoc.adjustment} placeholder="-¥10,000 (イベント割引)" onChange={e => setQ({ adjustment: e.target.value })} style={fieldStyle({ fontSize: 14 })} /></label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl>비고</Lbl>
                                    <input value={ds.quoteDoc.remark} onChange={e => setQ({ remark: e.target.value })} style={fieldStyle({ fontSize: 14 })} /></label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl>숙박 등급</Lbl>
                                    <select value={ds.quoteDoc.stayGrade} onChange={e => setQ({ stayGrade: e.target.value === 'standard' ? 'standard' : 'premium' })} style={fieldStyle({ padding: '0 12px', fontSize: 14 })}>
                                        <option value="premium">고급 게르 (프리미엄)</option><option value="standard">일반 게르 (스탠다드)</option>
                                    </select></label>
                            </div>
                        )}
                    </section>

                    {/* 03 일정표 */}
                    <section id="qe-plan" style={{ ...sectionStyle, gap: 16 }}>
                        <SecHead n={templateMode ? '02' : '03'} title="일정표" hint={`${days.length}일`} right={
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {!templateMode && days.length > 0 && (
                                    <button type="button" onClick={() => void downloadKoImage()} className="qe-hbd" style={smallBtn}
                                        title="견적 담당자용 — DAY별 일정·숙소·식사를 한국어로 정리한 이미지(PNG) (고객에게는 나가지 않음)">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>한국어 일정표
                                    </button>
                                )}
                                {aiDraftQuoteId && !templateMode && (
                                    <button type="button" disabled={aiBusy} onClick={() => void runAiDraft(true)} className="qe-hdark"
                                        title="고객 견적 요청 내용으로 일정 초안을 새로 만듭니다 (지금 일정은 「되돌리기」로 되돌릴 수 있음)"
                                        style={{ ...smallBtn, border: 0, background: C.ink, color: '#FFFFFF', fontWeight: 700, padding: '0 14px', opacity: aiBusy ? 0.6 : 1, cursor: aiBusy ? 'wait' : 'pointer' }}>
                                        <Sparkle />{aiBusy ? '만드는 중…' : days.length ? 'AI로 다시 만들기' : 'AI 초안 만들기'}
                                    </button>
                                )}
                                <select value={productId} disabled={loadingProducts} aria-label="상품에서 불러오기" onChange={e => {
                                    const v = e.target.value; setProductId(v);
                                    const p = products.find(x => x.id === v);
                                    if (p) applyProduct(p);
                                }} style={{ height: 38, maxWidth: 240, padding: '0 10px', border: `1px solid ${C.line}`, borderRadius: 10, background: '#FFFFFF', fontSize: 12, fontWeight: 600, color: C.ink }}>
                                    <option value="">{loadingProducts ? '상품 불러오는 중…' : '상품에서 불러오기'}</option>
                                    {products.map(p => { const st = productStats(p); return <option key={p.id} value={p.id}>{p.name} ({st.days}일)</option>; })}
                                </select>
                            </div>
                        } />

                        {aiDraftQuoteId && !templateMode && days.length > 0 && (
                            // 「AI로 수정」 — 한국어로 적으면 AI 가 그 부분만 고친다 (사진·설명은 바뀌지 않은 줄 그대로)
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 16, background: `linear-gradient(165deg,${C.mintBg2} 0%,#FFFFFF 100%)`, border: '1px solid #CFF3E9' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <span style={{ flex: 'none', width: 26, height: 26, borderRadius: 8, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkle size={14} /></span>
                                    <span style={{ flex: 'none', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 }}>AI로 일정 수정</span>
                                    <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: C.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>한국어로 적으면 일본어 일정에 반영돼요</span>
                                </span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                    <textarea rows={2} value={reviseText} disabled={aiBusy} onChange={e => setReviseText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void runAiRevise(); } }}
                                        placeholder="예: 2일차 테를지 대신 엘승타사르해로 바꾸고, 마지막 날 국영백화점 쇼핑 넣어 줘."
                                        style={{ flex: 1, minWidth: 0, minHeight: 68, padding: '12px 14px', border: `1px solid ${C.line}`, borderRadius: 12, background: '#FFFFFF', fontSize: 13, lineHeight: 1.6, color: C.ink, resize: 'vertical', boxSizing: 'border-box' }} />
                                    {(() => {
                                        const on = !!reviseText.trim() && !aiBusy;
                                        return (
                                            <button type="button" onClick={() => void runAiRevise()} disabled={!on} title="적은 부분만 고칩니다 (Ctrl+Enter)"
                                                style={{ flex: 'none', width: 96, height: 68, border: 0, borderRadius: 12, background: on ? `linear-gradient(135deg,${C.mint} 0%,${C.mintHi} 100%)` : C.line, fontSize: 13, fontWeight: 700, color: on ? '#FFFFFF' : C.mute, cursor: on ? 'pointer' : 'not-allowed' }}>
                                                {aiBusy ? '수정 중…' : 'AI로 수정'}
                                            </button>
                                        );
                                    })()}
                                </div>
                                <span style={{ fontSize: 11, color: C.mute }}>금액·날짜는 AI가 바꾸지 않아요 · 저장 전까지 고객에게 보내지 않아요 · Ctrl+Enter로 보내기</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {days.map((d, i) => {
                                const isOpen = openDay === i;
                                const assigned = assignedOf(d.day);
                                const stayName = assigned?.name || d.accommodation?.name || '';
                                const withImg = d.activities.filter(a => a.images?.length);
                                const linesOpen = !!photoOpen[i];
                                const picking = titlePick === i;
                                const hpicking = hotelPick === i;
                                const stayImg = (assigned?.images || d.accommodation?.images || [])[0];
                                return (
                                    <div key={i}
                                        // 이 DAY 를 고치면 미리보기가 같은 DAY 로 이동해 펼쳐진다 (제목·여행지 고르기는 일정 사진 카드로)
                                        onFocusCapture={e => { if (!(e.target as HTMLElement).closest('[data-film-focus]')) focusDay(d.day); }}
                                        style={{ borderRadius: 16, border: `1.5px solid ${isOpen ? C.mintHi : C.cardLine}`, background: '#FFFFFF', overflow: 'hidden', transition: 'border-color .2s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 10px 12px' }}>
                                            <button type="button" onClick={() => { setOpenDay(isOpen ? -1 : i); setTitlePick(null); setHotelPick(null); if (!isOpen) focusDay(d.day); }}
                                                style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '2px 0', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: C.ink }}>
                                                <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 12, background: isOpen ? C.ink : C.mintBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontFamily: EN, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: isOpen ? C.glow : C.mintDeep }}>DAY</span>
                                                    <span style={{ fontFamily: EN, fontSize: 16, fontWeight: 700, lineHeight: 1, color: isOpen ? '#FFFFFF' : C.ink }}>{d.day}</span>
                                                </span>
                                                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                    <span style={{ fontFamily: JP, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: d.title ? C.ink : C.mute }}>{d.title || '제목 없음'}</span>
                                                    <span style={{ display: 'flex', gap: 10, fontSize: 11, color: C.mute, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                        {dateLabel(i) && <span>{dateLabel(i)}</span>}
                                                        <span>일정 {d.activities.length}개</span>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{stayName || '숙소 미정'}</span>
                                                    </span>
                                                </span>
                                            </button>
                                            <div style={{ flex: 'none', display: 'flex', gap: 2 }}>
                                                <button type="button" aria-label="위로" onClick={() => moveDay(i, i - 1)} className="qe-hbg" style={{ ...iconBtn, opacity: i === 0 ? 0.3 : 1 }} disabled={i === 0}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M6 11l6-6 6 6" /></svg>
                                                </button>
                                                <button type="button" aria-label="아래로" onClick={() => moveDay(i, i + 1)} className="qe-hbg" style={{ ...iconBtn, opacity: i === days.length - 1 ? 0.3 : 1 }} disabled={i === days.length - 1}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M6 13l6 6 6-6" /></svg>
                                                </button>
                                                {delDay === i ? (
                                                    <button type="button" onClick={() => removeDay(i)} style={{ height: 32, padding: '0 10px', border: 0, borderRadius: 8, background: '#E5484D', fontSize: 11, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', whiteSpace: 'nowrap' }}>삭제?</button>
                                                ) : (
                                                    <button type="button" aria-label="DAY 삭제 (두 번 누르기)" title="DAY 삭제 (두 번 누르기)" onClick={() => removeDay(i)} className="qe-hred" style={iconBtn}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                                                    </button>
                                                )}
                                                <button type="button" aria-label={isOpen ? '접기' : '펼치기'} onClick={() => { setOpenDay(isOpen ? -1 : i); setTitlePick(null); setHotelPick(null); }} style={iconBtn}>
                                                    <Chevron open={isOpen} size={16} color={C.ink} />
                                                </button>
                                            </div>
                                        </div>

                                        {isOpen && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 16px 18px', borderTop: `1px solid ${C.line2}` }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 12, paddingTop: 12 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2', minWidth: 0 }}>
                                                        <Lbl note={spotPool.length ? '▾ 를 눌러 여행지에서 고르기' : undefined}>DAY 제목</Lbl>
                                                        <span data-film-focus="" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 6px', border: `1px solid ${C.line}`, borderRadius: 12, boxSizing: 'border-box' }}>
                                                            <button type="button" aria-label="여행지에서 고르기" disabled={!spotPool.length}
                                                                onClick={() => { setTitlePick(picking ? null : i); focusDay(d.day, true); }}
                                                                style={{ flex: 'none', padding: 0, border: 0, borderRadius: '50%', background: 'transparent', cursor: spotPool.length ? 'pointer' : 'default' }}>
                                                                <Thumb src={d.titleImage} size={34} />
                                                            </button>
                                                            <input className="qe-bare" value={d.title} placeholder="ウランバートル" onChange={e => patchDay(i, { title: e.target.value })} onFocus={() => focusDay(d.day, true)}
                                                                style={{ flex: 1, minWidth: 0, height: 40, border: 0, padding: '0 4px', fontFamily: JP, fontSize: 14, fontWeight: 600, color: C.ink, background: 'transparent' }} />
                                                            {spotPool.length > 0 && (
                                                                <button type="button" aria-label="여행지 목록 열기" onClick={() => { setTitlePick(picking ? null : i); focusDay(d.day, true); }}
                                                                    style={{ flex: 'none', width: 34, height: 34, border: 0, borderRadius: 10, background: picking ? C.ink : C.mintBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Chevron open={picking} size={16} color={picking ? '#FFFFFF' : C.mintDeep} />
                                                                </button>
                                                            )}
                                                        </span>
                                                        {d.titleKo && <span style={{ fontSize: 11, color: C.mute }}>뜻: {d.titleKo}</span>}
                                                    </div>
                                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}><Lbl>지역 (지도용)</Lbl>
                                                        <input value={d.region || ''} placeholder="テレルジ" onChange={e => patchDay(i, { region: e.target.value })} style={fieldStyle({ padding: '0 12px', fontFamily: JP, fontSize: 13 })} /></label>
                                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}><Lbl>이동 시간</Lbl>
                                                        <input value={d.move || ''} placeholder="約4時間" onChange={e => patchDay(i, { move: e.target.value })} style={fieldStyle({ padding: '0 12px', fontFamily: JP, fontSize: 13 })} /></label>
                                                </div>

                                                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: -6 }}>
                                                    <Lbl note="고객 화면 DAY 안에 보여요 · 선택">DAY 포인트</Lbl>
                                                    {/* 고치면 AI 가 단 한국어 뜻은 맞지 않으므로 지운다 */}
                                                    <input value={d.note || ''} placeholder="乗馬は合計約4時間。基礎から段階的に練習します"
                                                        onChange={e => patchDay(i, { note: e.target.value, noteKo: undefined })}
                                                        style={fieldStyle({ fontFamily: JP, fontSize: 13 })} />
                                                    {d.noteKo && <span style={{ fontSize: 11, color: C.mute }}>뜻: {d.noteKo}</span>}
                                                </label>

                                                {picking && (
                                                    // 관광지 마스터에서 고르면 DAY 제목(일본어)과 사진이 함께 들어간다
                                                    <div data-film-focus="" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 14, background: C.bg }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ flex: 1, fontSize: 11, color: C.sub }}>고르면 DAY 제목과 견적서 일정 카드 사진이 함께 바뀌어요</span>
                                                            {d.titleImage && <button type="button" onClick={() => { patchDay(i, { titleImage: undefined }); focusDay(d.day, true); }} style={{ flex: 'none', height: 26, padding: '0 10px', border: 0, borderRadius: 999, background: '#FFFFFF', fontSize: 11, fontWeight: 700, color: C.sub, cursor: 'pointer' }}>사진 빼기</button>}
                                                        </span>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(76px,1fr))', gap: '12px 6px', maxHeight: 212, overflowY: 'auto', paddingTop: 2 }}>
                                                            {spotPool.map(sp => {
                                                                const on = d.titleImage === sp.images![0];
                                                                return (
                                                                    <button key={sp.id} type="button" title={`고객 화면: ${cleanSpotName(sp.name_kr)}`}
                                                                        onClick={() => { patchDay(i, { title: cleanSpotName(sp.name_kr), titleImage: sp.images![0] }); setTitlePick(null); focusDay(d.day, true); }}
                                                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 0 0', border: 0, background: 'transparent', cursor: 'pointer' }}>
                                                                        <span style={{ borderRadius: '50%', boxShadow: on ? `0 0 0 3px #FFFFFF,0 0 0 5px ${C.mintHi}` : 'none' }}><Thumb src={sp.images![0]} size={52} /></span>
                                                                        <span style={{ fontSize: 11, fontWeight: on ? 700 : 500, lineHeight: 1.3, color: on ? C.mintDeep : C.body, textAlign: 'center' }}>{koSpotName(sp.name_kr)}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 12 }}>
                                                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl note="한 줄에 하나">일정 · 일본어</Lbl>
                                                        <textarea rows={6}
                                                            placeholder={'空港でガイドとミーティング後、ウランバートルへ移動\nSIMカード購入・両替・買い物\nチンギスハーン広場・ザイサン展望台 観光'}
                                                            value={itemDraft[i] ?? d.activities.map(a => a.title).join('\n')}
                                                            onChange={e => {
                                                                const text = e.target.value;
                                                                setItemDraft(m => ({ ...m, [i]: text }));
                                                                patchDay(i, { activities: linesToActivities(text, d.activities) });
                                                            }}
                                                            style={{ flex: 1, minHeight: 150, padding: '12px 14px', border: `1px solid ${C.line}`, borderRadius: 12, fontFamily: JP, fontSize: 13, lineHeight: 1.85, color: C.ink, resize: 'vertical', boxSizing: 'border-box' }} />
                                                    </label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Lbl note="관리자만 보여요">한국어 뜻</Lbl>
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 14px', borderRadius: 12, background: C.bg, minHeight: 60 }}>
                                                            {d.activities.length === 0 && <span style={{ fontSize: 12, color: C.mute }}>일정을 적으면 여기에 줄 번호가 나와요</span>}
                                                            {d.activities.map((a, j) => (
                                                                <span key={j} style={{ display: 'flex', gap: 10, padding: '3px 0', fontSize: 12, lineHeight: 1.6, color: a.ko ? C.body : C.faint }}>
                                                                    <span style={{ flex: 'none', width: 14, fontFamily: EN, fontSize: 11, fontWeight: 700, color: C.mint }}>{j + 1}</span>
                                                                    <span style={{ flex: 1, minWidth: 0 }}>{a.ko || '(직접 고친 줄 — 뜻 없음)'}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {d.activities.length > 0 && (
                                                    // 줄별 사진 — 평소에는 접어 둔다 (AI 초안이 사진을 자동으로 붙인다). 고칠 때만 펼친다
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <button type="button" onClick={() => setPhotoOpen(m => ({ ...m, [i]: !linesOpen }))} aria-expanded={linesOpen}
                                                            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 4px', border: 0, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                            <Chevron open={linesOpen} color={C.sub} />
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>줄별 사진</span>
                                                            <span style={{ fontSize: 12, fontWeight: 500, color: C.mute }}>· 선택</span>
                                                            <span style={{ height: 20, padding: '0 7px', borderRadius: 999, background: withImg.length ? C.mintBg : C.grayBg, fontSize: 11, fontWeight: 700, color: withImg.length ? C.mintDeep : C.mute, display: 'inline-flex', alignItems: 'center' }}>관광지 {withImg.length}개</span>
                                                        </button>
                                                        {linesOpen && (
                                                            <>
                                                                <span style={{ marginTop: -4, fontSize: 11, color: C.mute }}>누르면 관광지 마스터에서 골라 사진과 설명이 붙어요 (고객 견적서의 루트·見どころ 사진) · 이름은 위 칸 그대로</span>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                    {d.activities.map((a, j) => {
                                                                        const img = (a.images || [])[0];
                                                                        const key = `${i}-${j}`;
                                                                        return (
                                                                            <span key={j} style={{ display: 'flex', alignItems: 'center', maxWidth: '100%', height: 38, border: `1px solid ${img ? C.mintHi : C.line}`, borderRadius: 999, background: img ? C.mintBg2 : '#FFFFFF' }}>
                                                                                <button type="button" onClick={() => setSpotTarget({ d: i, a: j })}
                                                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, height: '100%', padding: `0 ${img ? 6 : 12}px 0 4px`, border: 0, background: 'transparent', cursor: 'pointer' }}>
                                                                                    <Thumb src={img} size={30} />
                                                                                    <span style={{ minWidth: 0, maxWidth: 200, fontFamily: JP, fontSize: 12, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</span>
                                                                                    <span style={{ flex: 'none', fontSize: 10, fontWeight: 700, color: img ? C.mintDeep : C.mute }}>{img ? '관광지 ✓' : '관광지'}</span>
                                                                                </button>
                                                                                {img && (
                                                                                    <button type="button" title="설명 고치기 (볼거리 카드에 표시)" onClick={() => setDescOpen(descOpen === key ? null : key)}
                                                                                        style={{ flex: 'none', height: '100%', padding: '0 10px 0 4px', border: 0, background: 'transparent', fontSize: 11, fontWeight: 700, color: a.description ? C.mintDeep : C.mute, cursor: 'pointer' }}>설명</button>
                                                                                )}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {d.activities.map((a, j) => descOpen === `${i}-${j}` && (
                                                                    <textarea key={j} value={a.description} placeholder={`「${a.title}」 설명 (볼거리 카드에 표시)`} onChange={e => patchAct(i, j, { description: e.target.value })}
                                                                        style={{ minHeight: 64, padding: '10px 12px', border: `1px solid ${C.line}`, borderRadius: 12, fontSize: 12, lineHeight: 1.6, color: C.body, resize: 'vertical', boxSizing: 'border-box' }} />
                                                                ))}
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 12, paddingTop: 14, borderTop: `1px solid ${C.line2}` }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                            <Lbl>숙소</Lbl>
                                                            <span style={{ display: 'flex', gap: 4 }}>
                                                                {!templateMode && onAssignAccommodation && (
                                                                    <button type="button" title="예약의 숙소 배정 (가이드·숙소 관리와 연결)" onClick={() => onAssignAccommodation(d.day)}
                                                                        style={{ flex: 'none', height: 26, padding: '0 10px', border: `1px solid ${C.line}`, borderRadius: 999, background: '#FFFFFF', fontSize: 11, fontWeight: 700, color: C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>배정</button>
                                                                )}
                                                                {assigned && !templateMode && onUnassignAccommodation && (
                                                                    <button type="button" title="숙소 배정 해제" onClick={() => onUnassignAccommodation(d.day)}
                                                                        style={{ flex: 'none', height: 26, padding: '0 10px', border: 0, borderRadius: 999, background: '#FFF1F0', fontSize: 11, fontWeight: 700, color: '#B42318', cursor: 'pointer', whiteSpace: 'nowrap' }}>배정 해제</button>
                                                                )}
                                                                <button type="button" onClick={() => setHotelPick(hpicking ? null : i)}
                                                                    style={{ flex: 'none', height: 26, padding: '0 10px', border: 0, borderRadius: 999, background: hpicking ? C.ink : C.mintBg, fontSize: 11, fontWeight: 700, color: hpicking ? '#FFFFFF' : C.mintDeep, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                                    {hpicking ? '닫기' : '숙소에서 고르기'}
                                                                </button>
                                                            </span>
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 6px', border: `1px solid ${C.line}`, borderRadius: 12, boxSizing: 'border-box' }}>
                                                            <Thumb src={stayImg} size={34} round={false} radius={10} />
                                                            <input className="qe-bare" value={d.accommodation?.name || ''} placeholder={assigned?.name ? `배정: ${assigned.name}` : '고르거나 직접 입력'}
                                                                onChange={e => {
                                                                    const nm = e.target.value;
                                                                    // 호텔 마스터 이름과 같으면 사진·설명까지 붙인다
                                                                    const hit = hotelByName(nm);
                                                                    if (hit) { fillFromHotel(i, hit); return; }
                                                                    const acc = d.accommodation;
                                                                    // 마스터에서 고른 호텔 이름을 바꾸면 그 호텔 사진은 떼어 낸다
                                                                    patchDay(i, { accommodation: nm ? (acc && acc.name === nm ? acc : { name: nm, images: acc?.id ? [] : (acc?.images || []) }) : null });
                                                                }}
                                                                style={{ flex: 1, minWidth: 0, height: 40, border: 0, padding: '0 4px', fontFamily: `${EN},'Noto Sans JP',sans-serif`, fontSize: 13, fontWeight: 600, color: C.ink, background: 'transparent' }} />
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <Lbl note="고객 화면엔 일본어로">식사</Lbl>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                                                            {MEAL_SLOTS.map(([k, label]) => {
                                                                const v = String((d.meals as any)?.[k] || '').trim();
                                                                const isO = /^(o|○|◯)$/i.test(v);
                                                                const known = !v || isO || MEAL_KO.some(([ja]) => ja === v);
                                                                const shown = !v ? '없음' : isO ? '포함' : (KO_OF.get(v) || v);
                                                                const editing = mealEdit === `${d.day}-${k}`;
                                                                const tile: React.CSSProperties = { position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, height: 46, padding: '0 10px', border: `1px solid ${v ? C.mintLine : C.line}`, borderRadius: 12, background: v ? C.mintBg2 : '#FFFFFF', boxSizing: 'border-box', cursor: 'pointer', minWidth: 0 };
                                                                if (editing) {
                                                                    return (
                                                                        // 직접 입력 — 고객 화면에 그대로 나가므로 일본어. Enter·칸 밖 클릭으로 확정
                                                                        <input key={k} autoFocus defaultValue={known ? '' : v} placeholder={`${label} (일본어)`}
                                                                            onBlur={e => { const t = e.target.value.trim(); if (t) patchDay(i, { meals: { ...(d.meals || {}), [k]: t } }); setMealEdit(null); }}
                                                                            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setMealEdit(null); }}
                                                                            style={fieldStyle({ padding: '0 10px', fontSize: 12, fontFamily: JP })} />
                                                                    );
                                                                }
                                                                return (
                                                                    <label key={k} style={tile}>
                                                                        <span style={{ fontSize: 10, fontWeight: 700, color: C.mute }}>{label}</span>
                                                                        <span style={{ fontSize: 13, fontWeight: 700, color: v ? C.mintDeep : C.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shown}</span>
                                                                        <select aria-label={label} value={isO ? 'O' : v}
                                                                            onChange={e => {
                                                                                const next = e.target.value;
                                                                                if (next === '__custom') { setMealEdit(`${d.day}-${k}`); return; }
                                                                                patchDay(i, { meals: { ...(d.meals || {}), [k]: next } });
                                                                            }}
                                                                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
                                                                            <option value="">없음</option>
                                                                            {MEAL_KO.map(([ja, ko]) => <option key={ja} value={ja}>{ko}</option>)}
                                                                            {!known && <option value={v}>{KO_OF.get(v) || `${v} (일본어)`}</option>}
                                                                            <option value="__custom">직접 입력…</option>
                                                                        </select>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {hpicking && (() => {
                                                    const list = hotels.filter(h => hotelKindTab === 'all' || hotelKindOf(h) === hotelKindTab);
                                                    const pickSelf = (nm: string) => { patchDay(i, { accommodation: { name: nm, images: [] } }); setHotelPick(null); };
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 14, background: C.bg, marginTop: -6 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>고르면 숙소 이름과 사진이 함께 바뀌어요 · 다음 날 조식이 비어 있으면 호텔식으로</span>
                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                    {([['all', '전체'], ['ger', '게르'], ['premium', '고급 게르'], ['hotel', '호텔']] as const).map(([k, label]) => {
                                                                        const on = hotelKindTab === k;
                                                                        return <button key={k} type="button" onClick={() => setHotelKindTab(k)} style={{ height: 28, padding: '0 10px', border: 0, borderRadius: 999, background: on ? C.ink : '#FFFFFF', fontSize: 11, fontWeight: 700, color: on ? '#FFFFFF' : C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>{label}</button>;
                                                                    })}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,200px),1fr))', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                                                                {list.map(h => {
                                                                    const on = d.accommodation?.name === h.name_kr;
                                                                    const [tl, tb, tf] = HOTEL_KIND[hotelKindOf(h)];
                                                                    return (
                                                                        <button key={h.id} type="button" onClick={() => { fillFromHotel(i, h); setHotelPick(null); focusDay(d.day); }}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: `1.5px solid ${on ? C.mintHi : '#FFFFFF'}`, borderRadius: 14, background: on ? C.mintBg2 : '#FFFFFF', textAlign: 'left', cursor: 'pointer', minWidth: 0 }}>
                                                                            <Thumb src={h.images?.[0]} size={52} round={false} radius={10} />
                                                                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                                                <span style={{ fontFamily: `${EN},'Noto Sans JP',sans-serif`, fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name_kr}</span>
                                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', minWidth: 0 }}>
                                                                                    <span style={{ flex: 'none', height: 18, padding: '0 6px', borderRadius: 5, background: tb, fontSize: 10, fontWeight: 700, color: tf, display: 'inline-flex', alignItems: 'center' }}>{tl}</span>
                                                                                    <span style={{ fontSize: 11, color: C.mute, overflow: 'hidden', textOverflow: 'ellipsis' }}>{[h.city, h.star_rating ? `${h.star_rating}★` : ''].filter(Boolean).join(' · ')}</span>
                                                                                </span>
                                                                            </span>
                                                                            {on && <span style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', background: C.mint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={10} w={3.4} /></span>}
                                                                        </button>
                                                                    );
                                                                })}
                                                                {hotelKindTab === 'all' && SELF_STAYS.map(nm => {
                                                                    const on = d.accommodation?.name === nm;
                                                                    const [tl, tb, tf] = HOTEL_KIND.self;
                                                                    return (
                                                                        <button key={nm} type="button" onClick={() => pickSelf(nm)}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: `1.5px solid ${on ? C.mintHi : '#FFFFFF'}`, borderRadius: 14, background: on ? C.mintBg2 : '#FFFFFF', textAlign: 'left', cursor: 'pointer' }}>
                                                                            <span style={{ flex: 'none', width: 52, height: 52, borderRadius: 10, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: C.amberFg }}>—</span>
                                                                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                                                <span style={{ fontFamily: JP, fontSize: 13, fontWeight: 700, color: C.ink }}>{nm}</span>
                                                                                <span style={{ alignSelf: 'flex-start', height: 18, padding: '0 6px', borderRadius: 5, background: tb, fontSize: 10, fontWeight: 700, color: tf, display: 'inline-flex', alignItems: 'center' }}>{tl}</span>
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {hotels.length === 0 && <span style={{ fontSize: 12, color: C.mute }}>호텔 마스터에 등록된 숙소가 없어요 — 위 칸에 직접 입력할 수 있어요.</span>}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button type="button" onClick={addDay} className="qe-hmint"
                                style={{ height: 52, border: `1.5px dashed ${C.mintLine}`, borderRadius: 16, background: 'transparent', fontSize: 13, fontWeight: 700, color: C.mintDeep, cursor: 'pointer' }}>
                                ＋ {days.length ? 'DAY 추가' : '첫 DAY 추가 (또는 위에서 상품 불러오기)'}
                            </button>
                        </div>
                    </section>

                    {/* 04 포함 · 불포함 */}
                    <section id="qe-inc" style={{ ...sectionStyle, gap: 20 }} onFocusCapture={() => setFocus({ section: 'q-inc', at: Date.now() })}>
                        <SecHead n={templateMode ? '03' : '04'} title="포함 · 불포함" hint="누르면 바로 반영돼요 · 고객 화면엔 일본어로" />
                        {([['inc', '포함', INC_OPTS, incNow, excNow, C.mint, C.mintDeep], ['exc', '불포함', EXC_OPTS, excNow, incNow, C.ink, C.sub]] as const).map(([kind, label, opts, cur, other, dot, cntFg]) => (
                            <div key={kind} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
                                    <span style={{ fontFamily: EN, fontSize: 12, fontWeight: 700, color: cntFg }}>{(cur as string[]).length}개</span>
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {optionsOf(opts as Array<[string, string]>, cur as string[], other as string[]).map(t => {
                                        const on = (cur as string[]).includes(t);
                                        const ko = koOf(t);
                                        const isInc = kind === 'inc';
                                        return (
                                            <button key={t} type="button" title={`고객 화면: ${t}`} aria-pressed={on} onClick={() => { setFocus({ section: 'q-inc', at: Date.now() }); toggleInc(kind, t); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px 0 8px', border: `1px solid ${on ? (isInc ? C.mintHi : C.ink) : C.line}`, borderRadius: 999, background: on ? (isInc ? C.mintBg2 : C.grayBg) : '#FFFFFF', fontSize: 12, fontWeight: on ? 700 : 500, color: on ? C.ink : C.mute, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: on ? (isInc ? C.mint : C.ink) : C.line2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: on ? '#FFFFFF' : C.mute }}>{on ? (isInc ? '✓' : '✕') : '+'}</span>
                                                {ko || t}
                                                {!ko && <span style={{ height: 16, padding: '0 5px', borderRadius: 4, background: C.amberBg, fontSize: 9, fontWeight: 700, color: C.amberFg, display: 'inline-flex', alignItems: 'center' }}>일본어</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <input value={custom[kind].ko} placeholder="직접 추가 — 한국어 (관리자용)"
                                        onChange={e => { const v = e.target.value; setCustom(c => ({ ...c, [kind]: { ...c[kind], ko: v } })); }}
                                        style={{ flex: '1 1 180px', minWidth: 0, height: 38, padding: '0 12px', border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 12, color: C.ink }} />
                                    <input value={custom[kind].ja} placeholder="日本語（お客様画面）"
                                        onChange={e => { const v = e.target.value; setCustom(c => ({ ...c, [kind]: { ...c[kind], ja: v } })); }}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addCustom(kind); } }}
                                        style={{ flex: '1 1 180px', minWidth: 0, height: 38, padding: '0 12px', border: `1px solid ${C.line}`, borderRadius: 10, fontFamily: JP, fontSize: 12, color: C.ink }} />
                                    <button type="button" onClick={() => addCustom(kind)} style={{ flex: 'none', height: 38, padding: '0 14px', border: 0, borderRadius: 10, background: C.mintBg, fontSize: 12, fontWeight: 700, color: C.mintDeep, cursor: 'pointer' }}>추가</button>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* 05 대표 여행지 (見どころ) */}
                    <section id="qe-spot" style={{ ...sectionStyle, gap: 16 }} onFocusCapture={() => setFocus({ section: 'q-spot', at: Date.now() })}>
                        <SecHead n={templateMode ? '04' : '05'}
                            title={<>대표 여행지 <span style={{ fontFamily: JP, fontWeight: 500, color: C.mute }}>見どころ</span></>}
                            hint={spotsPicked.length ? '고른 순서대로 고객 화면에 나가요' : '고르지 않으면 고객 화면에 나오지 않아요'}
                            right={
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {spotsPicked.length > 0 && <button type="button" onClick={() => setQ({ spots: [] })} style={{ height: 26, padding: '0 8px', border: 0, background: 'transparent', fontSize: 11, fontWeight: 700, color: C.mute, cursor: 'pointer' }}>모두 해제</button>}
                                    <span style={{ height: 26, padding: '0 10px', borderRadius: 999, background: C.ink, fontSize: 12, fontWeight: 700, color: C.glow, display: 'inline-flex', alignItems: 'center' }}>{spotsPicked.length}개 선택</span>
                                </span>
                            } />
                        {spotPool.length === 0 ? (
                            <span style={{ fontSize: 12, color: C.mute }}>관광지 마스터에 사진이 있는 관광지를 등록하면 여기서 고를 수 있어요.</span>
                        ) : (() => {
                            const regions = SPOT_REGIONS.filter(([r]) => spotPool.some(sp => (sp.region || '') === r));
                            const list = spotPool.filter(sp => spotRegion === 'all' || (sp.region || '') === spotRegion);
                            return (
                                <>
                                    <div className="qe-noscroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                                        {[['all', '전체'] as [string, string], ...regions].map(([r, label]) => {
                                            const on = spotRegion === r;
                                            const n = r === 'all' ? spotsPicked.length : spotPool.filter(sp => (sp.region || '') === r && spotsPicked.includes(sp.id)).length;
                                            return (
                                                <button key={r} type="button" onClick={() => setSpotRegion(r)}
                                                    style={{ flex: 'none', height: 34, padding: '0 14px', border: 0, borderRadius: 999, background: on ? C.ink : C.grayBg, fontSize: 12, fontWeight: 700, color: on ? '#FFFFFF' : C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                    {label}{n > 0 && <span style={{ marginLeft: 5, color: on ? C.glow : C.mint }}>{n}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))', gap: '18px 8px' }}>
                                        {list.map(sp => {
                                            const order = spotsPicked.indexOf(sp.id);
                                            const on = order >= 0;
                                            return (
                                                <button key={sp.id} type="button" aria-pressed={on} title={`고객 화면: ${cleanSpotName(sp.name_kr)}`}
                                                    onClick={() => { setFocus({ section: 'q-spot', at: Date.now() }); toggleSpot(sp.id); }}
                                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '4px 0 0', border: 0, background: 'transparent', cursor: 'pointer' }}>
                                                    <span style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', boxShadow: on ? `0 0 0 3px #FFFFFF,0 0 0 5px ${C.mintHi}` : 'none', transition: 'box-shadow .2s' }}>
                                                        <Thumb src={sp.images![0]} size={64} />
                                                        {on && <span style={{ position: 'absolute', right: -3, top: -3, minWidth: 22, height: 22, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, background: C.mint, border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: EN, fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>{order + 1}</span>}
                                                    </span>
                                                    <span style={{ fontSize: 12, fontWeight: on ? 700 : 500, lineHeight: 1.35, color: on ? C.mintDeep : C.body, textAlign: 'center' }}>{koSpotName(sp.name_kr)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                        <span style={{ paddingTop: 14, borderTop: `1px solid ${C.line2}`, fontSize: 11, color: C.mute }}>
                            표지 문구 · 숙소 소개 · 팀 · 식사 안내 · 안전 · 공항 · 허가증 · 약관은 모든 고객에게 공통으로 자동 들어가요.{onAssignAccommodation && !templateMode ? ' 숙소 배정은 예약의 숙소 배정과 연결돼요.' : ''}
                        </span>
                    </section>
                </div>
            </div>

            {/* ── 미리보기 (「고객 화면 보기」) ── */}
            {previewOpen && (
                <aside style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(440px,100%)', zIndex: 5, display: 'flex', flexDirection: 'column', background: '#E9EEED', borderLeft: `1px solid ${C.line}`, boxShadow: '-12px 0 32px rgba(18,59,58,0.12)' }}>
                    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 56, padding: '0 12px 0 16px', background: '#FFFFFF', borderBottom: `1px solid ${C.line}` }}>
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>고객이 받는 화면</span>
                            <span style={{ fontSize: 11, color: C.mute }}>입력하면 바로 반영 · 저장 전 내용</span>
                        </span>
                        {previewUrl && (
                            <a href={previewUrl} target="_blank" rel="noreferrer" title="저장된 내용으로 고객 화면을 새 탭에서 엽니다"
                                style={{ flex: 'none', height: 32, padding: '0 10px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 11, fontWeight: 700, color: C.ink, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>저장본 새 탭</a>
                        )}
                        <button type="button" aria-label="미리보기 닫기" onClick={() => setPreviewOpen(false)} className="qe-hbg" style={iconBtn}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 20px' }}>
                        <div style={{ margin: '0 auto', width: '100%', maxWidth: 390, overflow: 'hidden', borderRadius: 22, border: '1px solid #CBD5D3', background: '#FFFFFF', boxShadow: '0 10px 30px rgba(18,59,58,0.12)' }}>
                            <TripDocument doc={preview.doc} images={preview.images} focusTarget={focus} />
                        </div>
                    </div>
                </aside>
            )}

            </div>

            <TouristSpotPickerModal open={spotTarget !== null} onClose={() => setSpotTarget(null)} onPick={spot => { if (spotTarget) fillFromSpot(spotTarget.d, spotTarget.a, spot); setSpotTarget(null); }} />
        </div>
    );
};
