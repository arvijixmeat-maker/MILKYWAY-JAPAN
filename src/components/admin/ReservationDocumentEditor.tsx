import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
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
import { HotelPickerModal } from './HotelPickerModal';
import type { TouristSpot } from '../../types/touristSpot';
import type { Hotel } from '../../types/hotel';
import { TripDocument, type TripFocus } from '../trip-doc/TripDocument';
import { MAP_DESTINATIONS } from '../product/designTemplates/mapDestinations';
import { SPOT_REGION_OPTIONS } from '../../types/touristSpot';
import { buildTripDoc, yen, DEFAULT_INCLUDED, DEFAULT_EXCLUDED } from '../trip-doc/tripDocModel';
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
const inferType = (t: string): ActivityType => {
    if (/(공항|픽업|미팅|도착|入国|空港|到着|ミーティング|お迎え)/.test(t)) return 'pickup';
    if (/(이동|출발|移動|出発|専用車で)/.test(t)) return 'transport';
    if (/(식사|조식|중식|석식|점심|저녁|食事|朝食|昼食|夕食|ランチ|ディナー)/.test(t)) return 'meal';
    if (/(체크인|숙박|チェックイン)/.test(t)) return 'checkin';
    if (/(자유|휴식|쇼핑|장보기|自由|ショッピング)/.test(t)) return 'free';
    if (/(체험|승마|낙타|공연|트레킹|体験|乗馬|ラクダ|公演|トレッキング)/.test(t)) return 'activity';
    return 'sightseeing';
};
/** 줄마다 항목 하나. 이미 있던 같은 이름 항목은 사진·설명을 그대로 유지한다 */
const linesToActivities = (text: string, prev: TemplateDay['activities']): TemplateDay['activities'] => {
    const pool = [...prev];
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(title => {
        const k = pool.findIndex(a => (a.title || '').trim() === title);
        if (k >= 0) return pool.splice(k, 1)[0];
        return { time: '', type: inferType(title), title, description: '', images: [] };
    });
};
// 관리자 화면은 한국어, 고객 화면에는 일본어가 나간다 — [고객용 일본어, 관리자용 한국어]

// ── 식사 — 朝·昼·夕 칸마다 목록에서 고른다 ──
const MEAL_SLOTS = [['breakfast', '조식'], ['lunch', '중식'], ['dinner', '석식']] as const;
const MEAL_KO: Array<[string, string]> = [
    ['O', '포함'], ['ホテル食', '호텔식'], ['ゲル食', '게르식'], ['キャンプ食', '캠프식'], ['現地食', '현지식'], ['レストラン', '레스토랑'],
    ['特別料理', '특식'], ['ホルホグ', '허르헉'], ['しゃぶしゃぶ', '샤브샤브'], ['モンゴル料理', '몽골 요리'], ['韓国料理', '한식'],
    ['バーベキュー', '바비큐'], ['お弁当', '도시락'], ['機内食', '기내식'], ['各自', '자유식(각자)'],
];

// ── 포함 / 불포함 — 체크만 하면 고객 화면에 나간다 ──
const INC_OPTS: Array<[string, string]> = [
    ['全日程の宿泊', '전 일정 숙박'], ['全日程のお食事', '전 일정 식사'], ['空港送迎', '공항 픽업·샌딩'], ['全日程 専用車両', '전 일정 전용 차량'],
    ['専用ドライバー', '전용 기사'], ['日本語専門ガイド', '일본어 가이드'], ['観光地・公演入場料', '관광지·공연 입장료'], ['アクティビティ費用', '체험 비용'],
    ['乗馬・ラクダ体験', '승마·낙타 체험'], ['伝統衣装体験', '전통의상 체험'], ['特別料理', '특식'], ['1日1本 ミネラルウォーター', '생수 1일 1병'],
    ['燃料費', '유류비'], ['キャンプチェア＆テーブルセット', '캠핑 의자·테이블'], ['プライベートツアー', '프라이빗 투어'], ['星空・天の川観賞', '별·은하수 관측'],
];
const EXC_OPTS: Array<[string, string]> = [
    ['往復航空券', '왕복 항공권'], ['海外旅行保険', '해외 여행자 보험'], ['個人的な費用', '개인 경비'], ['オプション費用', '선택 옵션 비용'],
    ['SIMカード代', '유심 비용'], ['日程表に記載のない食事', '일정에 없는 식사'], ['ガイド・ドライバーへのチップ', '가이드·기사 팁'], ['一人部屋追加料金', '1인실 추가 요금'],
];
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
const SPOT_REGIONS: Array<[string, string]> = [...SPOT_REGION_OPTIONS.filter(o => o.value !== 'food').map(o => [o.value, o.label] as [string, string]), ['', '기타']];
/** 저장된 「일본어\t한국어」 직접 추가 항목 */
const customKo = (labels: string[]) => new Map(labels.map(l => l.split('\t')).filter(p => p.length === 2) as Array<[string, string]>);
const splitLines = (t?: string) => String(t || '').split(/\r?\n/).map(x => x.replace(/^[・•\-*]\s*/, '').trim()).filter(Boolean);

const inp = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#06C4A0] dark:border-slate-700 dark:bg-slate-800 dark:text-white';
const lab = 'mb-1 block text-[11px] font-black text-slate-500';

const Section: React.FC<{ n: number; title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode; onFocusArea?: () => void }> = ({ n, title, hint, right, children, onFocusArea }) => (
    <section onFocusCapture={onFocusArea} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8FAF5] text-xs font-black text-[#007F75]">{n}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{title}</span>
            {hint && <span className="text-[11px] font-semibold text-slate-400">{hint}</span>}
            <span className="ml-auto">{right}</span>
        </div>
        {children}
    </section>
);

export const ReservationDocumentEditor: React.FC<Props> = ({
    open, onClose, title, templateMode = false, previewMode = 'quote', customer, initialContent, onSave,
    tourStartDate, tourEndDate, assignedGuide, dailyAccommodations, onAssignGuide, onAssignAccommodation, onUnassignAccommodation, previewUrl,
}) => {
    const [name, setName] = useState('');
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
    // 텍스트 칸 입력 중 상태 (빈 줄·쉼표를 치는 동안 칸이 정리되지 않게) — DAY 순서가 바뀌면 비운다
    const [itemDraft, setItemDraft] = useState<Record<number, string>>({});
    const resetDrafts = () => { setItemDraft({}); };
    // 직접 추가 — 한국어(관리자용) + 일본어(고객용)
    const [custom, setCustom] = useState<Record<'inc' | 'exc', { ko: string; ja: string }>>({ inc: { ko: '', ja: '' }, exc: { ko: '', ja: '' } });
    const [spotRegion, setSpotRegion] = useState<string>('all');
    // 미리보기 — 지금 고치는 곳(섹션·DAY)으로 따라간다 / 휴대폰 크기에서 보이는 칸
    const [focus, setFocus] = useState<TripFocus | null>(null);
    const [pane, setPane] = useState<'form' | 'preview'>('form');
    const [products, setProducts] = useState<TourProduct[]>([]);
    const [productId, setProductId] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [spotTarget, setSpotTarget] = useState<{ d: number; a: number } | null>(null);
    const [hotelDayIdx, setHotelDayIdx] = useState<number | null>(null);
    const { sources } = useTripSources();

    // ── 열릴 때 초기값 ──
    useEffect(() => {
        if (!open) return;
        const merged = mergeDocumentSettings(initialContent?.documentSettings);
        const ppl = Math.max(1, customer?.peopleCount || 1);
        // 새 문서는 기본값(예시 요금)을 쓰지 않는다 — 총액이 있으면 총액 ÷ 인원, 없으면 빈칸
        if (!initialContent) merged.overview.pricePerPerson = customer?.totalAmount ? String(Math.round(customer.totalAmount / ppl)) : '';
        setName(initialContent?.name || customer?.tripType || '');
        setDescription(initialContent?.description || '');
        setDays(Array.isArray(initialContent?.days) ? initialContent!.days : []);
        setDs(merged);
        setStartDate(tourStartDate || '');
        setEndDate(tourEndDate || '');
        setPeople(ppl);
        setDeposit(customer?.deposit || 0);
        setOpenDay(0);
        setNotice(null);
        setSaveError(null);
        setUndoDays(null);
        setDelDay(null);
        setMealEdit(null);
        resetDrafts();
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
        const pricing = p.pricingOptions?.find(o => o.people === people) || p.pricingOptions?.[0];
        const included = (p.included || []).map(textOf).map((s: string) => s.trim()).filter(Boolean);
        const excluded = (p.excluded || []).map(textOf).map((s: string) => s.trim()).filter(Boolean);
        setName(p.name || name);
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
    const spotPool = useMemo(() => sources.spots.filter(s => s.region !== 'food' && (s.images?.length || 0) > 0), [sources]);
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

    if (!open) return null;
    const nights = startDate && endDate ? Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000) : null;

    return (
        <div className="fixed inset-0 z-[210] bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6">
            <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-[#F5F7FA] shadow-2xl dark:bg-slate-900">
                {/* 상단 */}
                <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#00A88B]">{templateMode ? '일정 프리셋' : previewMode === 'confirmed' ? '확정일정표' : '견적서'}</p>
                        <p className="truncate text-base font-black text-slate-900 dark:text-white">{title}</p>
                    </div>
                    <div className="ml-auto flex flex-shrink-0 items-center gap-2">
                        {onAssignGuide && (
                            <button onClick={onAssignGuide} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <span className="material-symbols-outlined text-base">badge</span>{assignedGuide?.name || '가이드 배정'}
                            </button>
                        )}
                        {previewUrl && (
                            <a href={previewUrl} target="_blank" rel="noreferrer" title="저장된 내용으로 고객 화면을 엽니다 — 고친 내용은 먼저 저장하세요"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <span className="material-symbols-outlined text-base">open_in_new</span>고객 화면 보기
                            </a>
                        )}
                        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">취소</button>
                        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#123B3A] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">check</span>{saving ? '저장 중' : '저장'}
                        </button>
                    </div>
                </div>
                {saveError && (
                    <div role="alert" className="flex flex-shrink-0 items-center gap-2 border-b border-red-200 bg-red-50 px-5 py-2 text-xs font-bold text-red-600">
                        <span className="material-symbols-outlined text-[16px]">error</span><span>{saveError}</span>
                        <button onClick={() => setSaveError(null)} className="ml-auto text-red-300 hover:text-red-500"><span className="material-symbols-outlined text-[16px]">close</span></button>
                    </div>
                )}
                {!templateMode && days.length === 0 && (
                    <div className="flex flex-shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs font-bold text-amber-700">
                        <span className="material-symbols-outlined text-[16px]">info</span><span>일정표가 비어 있습니다 — 그대로 저장할 수 있지만, 고객 화면에 일정이 나오지 않습니다. 「상품에서 불러오기」로 채울 수 있습니다.</span>
                    </div>
                )}
                {notice && (
                    <div className="flex flex-shrink-0 items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs font-bold text-emerald-700">
                        <span className="material-symbols-outlined text-[16px]">auto_awesome</span><span>{notice}</span>
                        {undoDays && (
                            <button type="button" onClick={() => { setDays(undoDays); setUndoDays(null); resetDrafts(); setNotice('불러오기 전 일정으로 되돌렸습니다.'); }}
                                className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100">일정 되돌리기</button>
                        )}
                        <button onClick={() => { setNotice(null); setUndoDays(null); }} className="ml-auto text-emerald-400 hover:text-emerald-600"><span className="material-symbols-outlined text-[16px]">close</span></button>
                    </div>
                )}

                {/* 휴대폰 크기에서만 입력 / 미리보기 전환 — 그보다 넓으면 항상 나란히 보인다 */}
                <div className="flex flex-shrink-0 gap-1 border-b border-slate-200 bg-white p-2 md:hidden">
                    {([['form', '입력'], ['preview', '미리보기']] as const).map(([k, label]) => (
                        <button key={k} type="button" onClick={() => setPane(k)}
                            className={`flex-1 rounded-lg py-2 text-sm font-black ${pane === k ? 'bg-[#123B3A] text-white' : 'bg-slate-100 text-slate-500'}`}>{label}</button>
                    ))}
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_400px]">
                    {/* 입력 */}
                    <div className={`min-h-0 space-y-3 overflow-y-auto p-4 ${pane === 'preview' ? 'max-md:hidden' : ''}`}>
                        {!templateMode && (
                            <Section onFocusArea={() => setFocus({ section: 'q-info', at: Date.now() })} n={1} title="고객정보" hint="견적 요청·예약에서 자동">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div><span className={lab}>고객 이름</span><div className={`${inp} flex items-center bg-slate-50`}>{customer?.name || '-'}</div></div>
                                    <div><span className={lab}>인원</span><input type="number" min={1} className={inp} value={people} onChange={e => setPeople(Math.max(1, parseInt(e.target.value, 10) || 1))} /></div>
                                    <div><span className={lab}>기간</span><div className={`${inp} flex items-center bg-slate-50`}>{nights != null && nights >= 0 ? `${nights}泊${nights + 1}日` : '날짜를 입력하세요'}</div></div>
                                    <div><span className={lab}>출발일</span><input type="date" className={inp} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                                    <div><span className={lab}>도착일</span><input type="date" className={inp} min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                                    <div />
                                    <div><span className={lab}>항공편 도착 (IN · 선택)</span><input className={inp} placeholder="14:15" value={ds.quoteDoc.flightIn} onChange={e => setQ({ flightIn: e.target.value })} /></div>
                                    <div><span className={lab}>항공편 출발 (OUT · 선택)</span><input className={inp} placeholder="00:25" value={ds.quoteDoc.flightOut} onChange={e => setQ({ flightOut: e.target.value })} /></div>
                                </div>
                            </Section>
                        )}

                        <Section onFocusArea={() => setFocus({ section: 'q-price', at: Date.now() })} n={templateMode ? 1 : 2} title="여행 금액" hint={templateMode ? '프리셋 기본 1인 요금' : '총액·잔금은 자동 계산'}>
                            <div className="grid gap-3 sm:grid-cols-4">
                                <div><span className={lab}>1인 요금 (엔)</span><input inputMode="numeric" className={inp} value={perPerson ? perPerson.toLocaleString() : ''} placeholder="128,000" onChange={e => setDs(s => ({ ...s, overview: { ...s.overview, pricePerPerson: String(num(e.target.value)) } }))} /></div>
                                {!templateMode && <>
                                    <div><span className={lab}>예약금 (엔)</span><input inputMode="numeric" className={inp} value={deposit ? deposit.toLocaleString() : ''} placeholder={total ? Math.round(total * 0.1).toLocaleString() : '20,000'} onChange={e => setDeposit(num(e.target.value))} /></div>
                                    <div><span className={lab}>총액</span><div className={`${inp} flex items-center bg-slate-50 font-black text-[#007F75]`}>¥{yen(total)}</div></div>
                                    <div><span className={lab}>잔금 (현지)</span><div className={`${inp} flex items-center bg-slate-50`}>¥{yen(balance)}</div></div>
                                </>}
                            </div>
                            <button type="button" onClick={() => setShowMore(v => !v)} className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-[#00A88B]">
                                <span className="material-symbols-outlined text-[16px]">{showMore ? 'expand_less' : 'expand_more'}</span>추가·할인 · 비고 · 숙박 등급 (선택)
                            </button>
                            {showMore && (
                                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                                    <div><span className={lab}>추가·할인</span><input className={inp} placeholder="-¥10,000 (イベント割引)" value={ds.quoteDoc.adjustment} onChange={e => setQ({ adjustment: e.target.value })} /></div>
                                    <div><span className={lab}>비고</span><input className={inp} value={ds.quoteDoc.remark} onChange={e => setQ({ remark: e.target.value })} /></div>
                                    <div><span className={lab}>숙박 등급</span>
                                        <select className={inp} value={ds.quoteDoc.stayGrade} onChange={e => setQ({ stayGrade: e.target.value === 'standard' ? 'standard' : 'premium' })}>
                                            <option value="premium">프리미엄 (고급 게르)</option><option value="standard">스탠다드</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </Section>

                        <Section n={templateMode ? 2 : 3} title="일정표" hint={`${days.length}일`}
                            right={
                                <div className="flex items-center gap-2">
                                    <select value={productId} disabled={loadingProducts} onChange={e => {
                                        const v = e.target.value; setProductId(v);
                                        const p = products.find(x => x.id === v);
                                        if (p) applyProduct(p);
                                    }} className="h-8 max-w-[260px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-[#06C4A0]">
                                        <option value="">{loadingProducts ? '상품 불러오는 중…' : '상품에서 불러오기 ▾'}</option>
                                        {products.map(p => { const s = productStats(p); return <option key={p.id} value={p.id}>{p.name} ({s.days}일)</option>; })}
                                    </select>
                                </div>
                            }>
                            <div className="space-y-2">
                                {days.map((d, i) => {
                                    const isOpen = openDay === i;
                                    const assigned = assignedOf(d.day);
                                    const stayName = assigned?.name || d.accommodation?.name || '';
                                    return (
                                        <div key={i}
                                            // 이 DAY 를 고치면 미리보기가 같은 DAY 로 이동해 펼쳐진다
                                            onFocusCapture={() => setFocus({ section: 'q-plan', day: d.day, at: Date.now() })}
                                            onClick={() => setFocus({ section: 'q-plan', day: d.day, at: Date.now() })}
                                            className={`rounded-xl border ${isOpen ? 'border-[#06C4A0] bg-[#F4FCFA]' : 'border-slate-200 bg-white'} dark:border-slate-700 dark:bg-slate-900`}>
                                            <div className="flex cursor-pointer items-center gap-2 px-3 py-2.5" onClick={() => setOpenDay(isOpen ? -1 : i)}>
                                                <span className="rounded-md bg-[#123B3A] px-2 py-0.5 text-[11px] font-black text-[#8CE9D8]">DAY {d.day}</span>
                                                <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-800 dark:text-white">{d.title || '제목 없음'}</span>
                                                <span className="hidden text-[11px] font-semibold text-slate-400 sm:inline">{d.activities.length}개 · {stayName || '숙소 미정'}</span>
                                                <button type="button" title="위로" onClick={e => { e.stopPropagation(); moveDay(i, i - 1); }} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><span className="material-symbols-outlined text-[16px]">arrow_upward</span></button>
                                                <button type="button" title="아래로" onClick={e => { e.stopPropagation(); moveDay(i, i + 1); }} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><span className="material-symbols-outlined text-[16px]">arrow_downward</span></button>
                                                {delDay === i
                                                    ? <button type="button" onClick={e => { e.stopPropagation(); removeDay(i); }} className="h-7 rounded-md bg-red-500 px-2 text-[11px] font-black text-white">삭제?</button>
                                                    : <button type="button" title="DAY 삭제 (두 번 누르기)" onClick={e => { e.stopPropagation(); removeDay(i); }} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500"><span className="material-symbols-outlined text-[16px]">delete</span></button>}
                                                <span className="material-symbols-outlined text-[18px] text-slate-400">{isOpen ? 'expand_less' : 'expand_more'}</span>
                                            </div>
                                            {isOpen && (
                                                <div className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-3 dark:border-slate-700">
                                                    <div className="grid gap-2 sm:grid-cols-[1fr_160px_140px]">
                                                        <div><span className={lab}>DAY 제목 (일본어)</span><input className={inp} value={d.title} placeholder="ウランバートル" onChange={e => patchDay(i, { title: e.target.value })} /></div>
                                                        <div><span className={lab}>지역 (지도용)</span><input className={inp} value={d.region || ''} placeholder="テレルジ" onChange={e => patchDay(i, { region: e.target.value })} /></div>
                                                        <div><span className={lab}>이동 시간</span><input className={inp} value={d.move || ''} placeholder="約4時間" onChange={e => patchDay(i, { move: e.target.value })} /></div>
                                                    </div>
                                                    <div>
                                                        <span className={lab}>일정 (한 줄에 하나 — 붙여 넣으면 됩니다)</span>
                                                        <textarea
                                                            className="min-h-[132px] w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold leading-relaxed text-slate-800 outline-none focus:border-[#06C4A0] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                            placeholder={'空港でガイドとミーティング後、ウランバートルへ移動\nSIMカード購入・両替・買い物\nチンギスハーン広場・ザイサン展望台 観光\n(+国営百貨店ショッピング 選択)'}
                                                            value={itemDraft[i] ?? d.activities.map(a => a.title).join('\n')}
                                                            onChange={e => {
                                                                const text = e.target.value;
                                                                setItemDraft(m => ({ ...m, [i]: text }));
                                                                patchDay(i, { activities: linesToActivities(text, d.activities) });
                                                            }}
                                                        />
                                                        {d.activities.length > 0 && (
                                                            <div className="mt-2">
                                                                <span className="mb-1 block text-[10px] font-bold text-slate-400">사진 넣기 (선택) — 「관광지」를 누르면 관광지 마스터의 사진·설명이 붙습니다. 이름은 위 칸 그대로 둡니다.</span>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {d.activities.map((a, j) => {
                                                                        const key = `${i}-${j}`;
                                                                        const img = (a.images || [])[0];
                                                                        return (
                                                                            <div key={j} className="flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-1.5 dark:border-slate-700 dark:bg-slate-800">
                                                                                {img
                                                                                    ? <img src={img} alt="" className="h-6 w-6 flex-none rounded object-cover" />
                                                                                    : <span className="flex h-6 w-6 flex-none items-center justify-center rounded bg-slate-100 text-slate-300"><span className="material-symbols-outlined text-[14px]">image</span></span>}
                                                                                <span className="max-w-[180px] truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">{a.title}</span>
                                                                                <button type="button" onClick={() => setSpotTarget({ d: i, a: j })} className="h-6 flex-none rounded-md border border-[#9FE1CB] px-1.5 text-[10px] font-black text-[#007F75] hover:bg-[#E8FAF5]">관광지</button>
                                                                                <button type="button" title="설명" onClick={() => setDescOpen(descOpen === key ? null : key)} className={`flex h-6 w-6 flex-none items-center justify-center rounded ${a.description ? 'text-[#007F75]' : 'text-slate-300'} hover:bg-slate-100`}><span className="material-symbols-outlined text-[14px]">notes</span></button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {d.activities.map((a, j) => descOpen === `${i}-${j}` && (
                                                                    <textarea key={j} className="mt-1.5 min-h-[64px] w-full rounded-md border border-slate-200 p-2 text-xs leading-relaxed text-slate-700 outline-none focus:border-[#06C4A0] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                                        value={a.description} placeholder={`「${a.title}」 설명 (볼거리 카드에 표시)`} onChange={e => patchAct(i, j, { description: e.target.value })} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div>
                                                            <span className={lab}>숙소</span>
                                                            <div className="flex items-center gap-1.5">
                                                                {d.accommodation?.images?.[0] && <img src={d.accommodation.images[0]} alt="" className="h-9 w-9 flex-none rounded-lg object-cover" />}
                                                                <input className={inp} list="mw-hotel-master" value={d.accommodation?.name || ''} placeholder={assigned?.name ? `배정: ${assigned.name}` : '호텔 마스터에서 선택 또는 직접 입력'}
                                                                    onChange={e => {
                                                                        const name = e.target.value;
                                                                        // 호텔 마스터 목록에서 고르면 사진·설명까지 붙인다
                                                                        const hit = hotelByName(name);
                                                                        if (hit) { fillFromHotel(i, hit); return; }
                                                                        const acc = d.accommodation;
                                                                        // 마스터에서 고른 호텔 이름을 바꾸면 그 호텔 사진은 떼어 낸다
                                                                        patchDay(i, { accommodation: name ? (acc && acc.name === name ? acc : { name, images: acc?.id ? [] : (acc?.images || []) }) : null });
                                                                    }} />
                                                                <button type="button" title="호텔 마스터에서 사진으로 찾기" onClick={() => setHotelDayIdx(i)}
                                                                    className="h-9 flex-none rounded-lg border border-[#9FE1CB] px-3 text-xs font-black text-[#007F75] hover:bg-[#E8FAF5]">호텔</button>
                                                                {!templateMode && onAssignAccommodation && (
                                                                    <button type="button" title="예약의 숙소 배정 (가이드·숙소 관리와 연결)" onClick={() => onAssignAccommodation(d.day)}
                                                                        className="h-9 flex-none rounded-lg border border-slate-200 px-2.5 text-xs font-black text-slate-500 hover:bg-slate-50">배정</button>
                                                                )}
                                                                {assigned && !templateMode && onUnassignAccommodation && (
                                                                    <button type="button" title="숙소 배정 해제" onClick={() => onUnassignAccommodation(d.day)}
                                                                        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"><span className="material-symbols-outlined text-[16px]">close</span></button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className={lab}>식사 (고객 화면에는 일본어로 나갑니다)</span>
                                                            <div className="grid grid-cols-3 gap-1.5">
                                                                {MEAL_SLOTS.map(([k, label]) => {
                                                                    const v = String((d.meals as any)?.[k] || '').trim();
                                                                    const known = !v || /^(o|○|◯)$/i.test(v) || MEAL_KO.some(([ja]) => ja === v);
                                                                    return (
                                                                        <label key={k} className="block">
                                                                            <span className="mb-0.5 block text-[10px] font-black text-[#00A88B]">{label}</span>
                                                                            {mealEdit === `${d.day}-${k}` ? (
                                                                                // 직접 입력 — 고객 화면에 그대로 나가므로 일본어. Enter·칸 밖 클릭으로 확정
                                                                                <input autoFocus className={`${inp} px-1.5 text-xs`} defaultValue={known ? '' : v} placeholder="일본어로 입력"
                                                                                    onBlur={e => { const t = e.target.value.trim(); if (t) patchDay(i, { meals: { ...(d.meals || {}), [k]: t } }); setMealEdit(null); }}
                                                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setMealEdit(null); }} />
                                                                            ) : (
                                                                                <select className={`${inp} px-1.5 text-xs`} value={/^(o|○|◯)$/i.test(v) ? 'O' : v}
                                                                                    onChange={e => {
                                                                                        const next = e.target.value;
                                                                                        if (next === '__custom') { setMealEdit(`${d.day}-${k}`); return; }
                                                                                        patchDay(i, { meals: { ...(d.meals || {}), [k]: next } });
                                                                                    }}>
                                                                                    <option value="">없음</option>
                                                                                    {MEAL_KO.map(([ja, ko]) => <option key={ja} value={ja}>{ko}</option>)}
                                                                                    {!known && <option value={v}>{KO_OF.get(v) || `${v} (일본어)`}</option>}
                                                                                    <option value="__custom">직접 입력…</option>
                                                                                </select>
                                                                            )}
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button type="button" onClick={addDay} className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#9FE1CB] py-3 text-xs font-black text-[#007F75] hover:bg-[#E8FAF5]">
                                    <span className="material-symbols-outlined text-[16px]">add</span>{days.length ? 'DAY 추가' : '첫 DAY 추가 (또는 위에서 상품 불러오기)'}
                                </button>
                            </div>
                        </Section>

                        <Section onFocusArea={() => setFocus({ section: 'q-inc', at: Date.now() })} n={templateMode ? 3 : 4} title="포함 · 불포함" hint="누르면 바로 반영 · 고객 화면에는 일본어로">
                            {([['inc', '포함', INC_OPTS, incNow, excNow], ['exc', '불포함', EXC_OPTS, excNow, incNow]] as const).map(([kind, label, opts, cur, other]) => (
                                <div key={kind} className={kind === 'exc' ? 'mt-4' : ''}>
                                    <span className={lab}>{label} · {cur.length}개</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {optionsOf(opts as Array<[string, string]>, cur as string[], other as string[]).map(t => {
                                            const on = (cur as string[]).includes(t);
                                            const ko = koOf(t);
                                            return (
                                                <button key={t} type="button" title={`고객 화면: ${t}`} onClick={() => { setFocus({ section: 'q-inc', at: Date.now() }); toggleInc(kind, t); }}
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition ${on
                                                        ? (kind === 'inc' ? 'border-[#06C4A0] bg-[#E8FAF5] text-[#007F75]' : 'border-slate-400 bg-slate-100 text-slate-700')
                                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{on ? 'check_circle' : 'add'}</span>
                                                    {ko || t}{!ko && <span className="rounded bg-amber-100 px-1 text-[9px] font-black text-amber-700">일본어</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 flex max-w-lg gap-1.5">
                                        <input className={`${inp} h-8 text-xs`} value={custom[kind].ko} placeholder="직접 추가 — 한국어 (관리자용)"
                                            onChange={e => { const v = e.target.value; setCustom(c => ({ ...c, [kind]: { ...c[kind], ko: v } })); }} />
                                        <input className={`${inp} h-8 text-xs`} value={custom[kind].ja} placeholder="일본어 (고객 화면용)"
                                            onChange={e => { const v = e.target.value; setCustom(c => ({ ...c, [kind]: { ...c[kind], ja: v } })); }}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addCustom(kind); } }} />
                                        <button type="button" onClick={() => addCustom(kind)} className="h-8 flex-none rounded-lg border border-[#9FE1CB] px-3 text-xs font-black text-[#007F75] hover:bg-[#E8FAF5]">추가</button>
                                    </div>
                                </div>
                            ))}
                        </Section>

                        <Section onFocusArea={() => setFocus({ section: 'q-spot', at: Date.now() })} n={templateMode ? 4 : 5} title="대표 여행지 (見どころ)"
                            hint={spotsPicked.length ? `${spotsPicked.length}곳 선택 — 고른 순서대로 나갑니다` : '고르지 않으면 고객 화면에 나오지 않습니다'}
                            right={spotsPicked.length > 0 && <button type="button" onClick={() => setQ({ spots: [] })} className="text-[11px] font-black text-slate-400 hover:text-red-500">모두 해제</button>}>
                            {spotPool.length === 0
                                ? <p className="text-xs font-semibold text-slate-400">관광지 마스터에 사진이 있는 관광지를 등록하면 여기서 고를 수 있습니다.</p>
                                : (() => {
                                    const regions = [...SPOT_REGIONS.filter(([r]) => spotPool.some(s => (s.region || '') === r))];
                                    const list = spotPool.filter(s => spotRegion === 'all' || (s.region || '') === spotRegion);
                                    return (
                                        <>
                                            <div className="mb-2 flex flex-wrap gap-1">
                                                {[['all', '전체'] as [string, string], ...regions].map(([r, label]) => {
                                                    const n = r === 'all' ? spotsPicked.length : spotPool.filter(s => (s.region || '') === r && spotsPicked.includes(s.id)).length;
                                                    return (
                                                        <button key={r} type="button" onClick={() => setSpotRegion(r)}
                                                            className={`rounded-full px-3 py-1 text-xs font-black ${spotRegion === r ? 'bg-[#123B3A] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                                            {label}{n > 0 && <span className="ml-1 text-[#8CE9D8]">{n}</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {/* 동그란 사진 + 아래 이름 — 누르면 초록 테두리와 순서 번호 */}
                                            <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-2 gap-y-4 pt-1">
                                                {list.map(s => {
                                                    const order = spotsPicked.indexOf(s.id);
                                                    const on = order >= 0;
                                                    return (
                                                        <button key={s.id} type="button" title={`고객 화면: ${cleanSpotName(s.name_kr)}`}
                                                            onClick={() => { setFocus({ section: 'q-spot', at: Date.now() }); toggleSpot(s.id); }}
                                                            className="group flex flex-col items-center gap-1.5 text-center">
                                                            <span className={`relative block h-[72px] w-[72px] rounded-full p-[3px] transition ${on ? 'bg-[#06C4A0]' : 'bg-transparent group-hover:bg-slate-200'}`}>
                                                                <img src={s.images![0]} alt="" loading="lazy" className={`h-full w-full rounded-full border-2 border-white object-cover transition ${on ? '' : 'group-hover:scale-[1.03]'}`} />
                                                                {on && <span className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#123B3A] px-1 text-[11px] font-black text-white">{order + 1}</span>}
                                                            </span>
                                                            <span className={`line-clamp-2 w-full text-[12px] leading-tight ${on ? 'font-black text-[#007F75]' : 'font-semibold text-slate-700'}`}>{koSpotName(s.name_kr)}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                        </Section>

                        {/* 숙소 칸의 호텔 마스터 목록 */}
                        <datalist id="mw-hotel-master">
                            {hotels.map(h => <option key={h.id} value={h.name_kr}>{[h.name_local, h.city, h.star_rating ? `${h.star_rating}★` : ''].filter(Boolean).join(' · ')}</option>)}
                        </datalist>

                        <p className="px-1 pb-2 text-[11px] font-semibold leading-relaxed text-slate-400">
                            표지 문구·숙소 소개·팀·식사 안내·안전·공항·허가증·약관은 모든 고객 공통으로 자동 들어갑니다.
                            {onAssignAccommodation && !templateMode ? ' 숙소 배정은 예약의 숙소 배정과 연결됩니다.' : ''}
                        </p>
                    </div>

                    {/* 미리보기 */}
                    <div className={`flex min-h-0 flex-col border-l border-slate-200 bg-[#E9EEED] dark:border-slate-800 dark:bg-slate-950 ${pane === 'form' ? 'max-md:hidden' : ''}`}>
                        <div className="flex flex-shrink-0 items-center justify-between px-4 py-2 text-[11px] font-black text-slate-500">
                            <span>고객이 받는 화면 (미리보기)</span>
                            <span className="text-slate-400">입력하면 바로 반영</span>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                            <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[22px] border border-slate-300 bg-white shadow-lg">
                                <TripDocument doc={preview.doc} images={preview.images} focusTarget={focus} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TouristSpotPickerModal open={spotTarget !== null} onClose={() => setSpotTarget(null)} onPick={spot => { if (spotTarget) fillFromSpot(spotTarget.d, spotTarget.a, spot); setSpotTarget(null); }} />
            <HotelPickerModal open={hotelDayIdx !== null} onClose={() => setHotelDayIdx(null)} onPick={hotel => { if (hotelDayIdx !== null) fillFromHotel(hotelDayIdx, hotel); setHotelDayIdx(null); }} />
        </div>
    );
};
