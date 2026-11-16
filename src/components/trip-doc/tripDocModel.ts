import { lookupFirst } from './gazetteer';
import { MAP_DESTINATIONS } from '../product/designTemplates/mapDestinations';

/**
 * 견적서·확정일정표(새 디자인) 데이터 모델.
 * 견적(quotes)·예약(reservations) 어느 쪽에서 와도 같은 TripDoc 으로 정규화해
 * TripDocument 한 컴포넌트로 그린다.
 */

// ─── 문서별 설정 (documentSettings.quoteDoc) ───────────────────────────
export interface QuoteDocSettings {
    /** 표지 큰 제목 앞 단어 — 「冬旅」→ 「冬旅 お見積書-!」 */
    coverLead: string;
    /** 旅行先 — 「中央モンゴル」 */
    region: string;
    /** 担当者 — 표지 MANAGER */
    manager: string;
    /** 견적 유효기한 YYYY-MM-DD (비우면 발행일 + 7일) */
    validUntil: string;
    /** 요금 카드 — 플랜 이름 / 설명 / 태그 */
    planName: string;
    planSub: string;
    planTag: string;
    /** 航空便 IN / OUT (예: 14:15 / 00:25) */
    flightIn: string;
    flightOut: string;
    /** 空港送迎 (예: 11.29 14:15 · 12.02 夜) */
    pickup: string;
    vehicle: string;
    /** 宿泊 요약 (영수증) — 예: UBホテル1泊 + 高級ゲル2泊 */
    stayLabel: string;
    /** 今回のご宿泊 등급 */
    stayGrade: 'standard' | 'premium';
    /** 今回のご宿泊 한 줄 — 예: UBホテル + 高級ゲル */
    stayLine: string;
    guideLabel: string;
    /** 追加・割引 / 備考 (요금 요약) */
    adjustment: string;
    remark: string;
    /** 移動の強度 1~5 */
    intensity: number;
    meetingPoint: string;
    /** 포함할 特別料理 = 관광지 마스터 「음식」 분류의 관광지 id. 빈 배열이면 자동(앞 4개), ['none'] 이면 섹션 숨김 */
    specials: string[];
    /** 포함 / 불포함 — 편집기에서 체크한 항목. 빈 배열이면 상품 → 문서 기본 문구 순으로 자동 */
    included: string[];
    excluded: string[];
    /** 見どころ(대표 여행지) — 관광지 마스터 id. 고른 것만 표시, 비우면 섹션 숨김 */
    spots: string[];
    /** 편집기에서 직접 추가한 항목의 한국어 이름 — 「일본어\t한국어」 (관리자 화면 표시용) */
    labels: string[];
    /** 일정 하단 주의사항 (줄바꿈 구분) */
    planNotes: string;
}

export const DEFAULT_PLAN_NOTES = [
    'モンゴルの地域特性上、現地の事情（断水・停電など）により宿泊施設やアクティビティのスケジュールが一部変更になる場合があります。',
    '移動時間と日程は現地の状況により変動するため、おおよその目安としてご参照ください。',
    '天候や現地の状況により、一部の体験内容が変更になる場合があります。',
    '本書に掲載されたすべての情報およびプログラム構成はモンゴリア天の川 現地旅行会社に帰属し、書面による同意なく複製・転載することを禁じます。',
].join('\n');

export const defaultQuoteDocSettings = (): QuoteDocSettings => ({
    coverLead: '',
    region: '',
    manager: '',
    validUntil: '',
    planName: '',
    planSub: '',
    planTag: 'PRIVATE',
    flightIn: '',
    flightOut: '',
    pickup: '',
    vehicle: '全日程 専用車両',
    stayLabel: '',
    stayGrade: 'premium',
    stayLine: '',
    guideLabel: '日本語専門ガイド同行',
    adjustment: '',
    remark: '',
    intensity: 0,
    meetingPoint: 'Tom N Toms カフェ前のベンチ',
    specials: [],
    included: [],
    excluded: [],
    spots: [],
    labels: [],
    planNotes: DEFAULT_PLAN_NOTES,
});

export const mergeQuoteDocSettings = (value: any): QuoteDocSettings => {
    const base = defaultQuoteDocSettings();
    if (!value || typeof value !== 'object') return base;
    const out: any = { ...base };
    for (const k of Object.keys(base) as Array<keyof QuoteDocSettings>) {
        const v = value[k];
        if (v === undefined || v === null) continue;
        if (Array.isArray((base as any)[k])) { if (Array.isArray(v)) out[k] = v.filter((x: any) => typeof x === 'string' && x.trim()); continue; }
        if (k === 'intensity') { const n = Number(v); if (Number.isFinite(n)) out.intensity = Math.max(0, Math.min(5, Math.round(n))); continue; }
        if (k === 'stayGrade') { out.stayGrade = v === 'standard' ? 'standard' : 'premium'; continue; }
        out[k] = String(v);
    }
    return out as QuoteDocSettings;
};

// ─── 정규화된 문서 ─────────────────────────────────────────────────────
export interface TripActivity { title: string; desc: string; images: string[]; type?: string }
export interface TripDay {
    n: number;
    /** 「11.29(日)」 또는 관리자가 직접 쓴 날짜 */
    dateLabel: string;
    title: string;
    region: string;
    move: string;
    items: string[];
    activities: TripActivity[];
    stay: string;
    stayDesc: string;
    stayImages: string[];
    meal: string;
}
export interface TripPrice {
    total: number;
    perPerson: number;
    deposit: number;
    depositPer: number;
    balance: number;
    balancePer: number;
    /** 상품 기준가로 계산한 개산(확정 전) */
    estimated: boolean;
}
export interface RouteStop {
    img: string;
    name: string;
    short: string;
    sub: string;
    day: number;
    time: string;
    ll: [number, number] | null;
}
export interface Highlight { img: string; thumbs: string[]; en: string; name: string; desc: string }

export interface TripDoc {
    mode: 'quote' | 'confirmed';
    docNo: string;
    issued: string;
    customerName: string;
    people: number;
    startDate: string;
    endDate: string;
    nights: number | null;
    dayCount: number;
    title: string;
    q: QuoteDocSettings;
    included: string[];
    excluded: string[];
    days: TripDay[];
    price: TripPrice | null;
    guideName: string;
    depositPaid: boolean;
    payUrl: string;
    adminNote: string;
    validUntil: Date;
    route: RouteStop[];
    highlights: Highlight[];
}

export interface DesignSpotLite { name: string; en?: string; image: string }

export interface BuildInput {
    mode: 'quote' | 'confirmed';
    id: string;
    docNo?: string | null;
    issuedAt?: string | null;
    customerName?: string | null;
    people?: number | string | null;
    startDate?: string | null;
    endDate?: string | null;
    title?: string | null;
    days?: any[];
    documentSettings?: any;
    included?: string[];
    excluded?: string[];
    /** 금액 원천값 */
    total?: number | string | null;
    deposit?: number | string | null;
    balance?: number | string | null;
    depositPaid?: boolean;
    /** 예약금 PayPal 결제 링크 (미입금일 때만) */
    payUrl?: string | null;
    guideName?: string | null;
    adminNote?: string | null;
    designSpots?: DesignSpotLite[];
    /** 관광지 마스터 — 見どころ(q.spots) 사진·설명 */
    spotMaster?: Array<{ id: string; name_kr: string; description?: string; images?: any }>;
}

// ─── 유틸 ──────────────────────────────────────────────────────────────
export const yen = (n: number) => Math.round(n || 0).toLocaleString('en-US');

export const toImages = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && !!v.trim());
    if (typeof value === 'string') {
        const t = value.trim();
        if (t.startsWith('[')) {
            try { const p = JSON.parse(t); return Array.isArray(p) ? p.filter((v: any) => typeof v === 'string' && v) : []; } catch { return []; }
        }
        return t ? [t] : [];
    }
    return [];
};

const money = (v: any): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
};

export const countPeople = (v: any): number => {
    if (typeof v === 'number' && v > 0) return Math.round(v);
    const nums = String(v ?? '').match(/\d+/g);
    if (!nums) return 1;
    return Math.max(1, nums.reduce((s, x) => s + parseInt(x, 10), 0));
};

const WD = ['日', '月', '火', '水', '木', '金', '土'];
const WD_FULL = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

export const parseDate = (iso?: string | null): Date | null => {
    if (!iso) return null;
    const m = String(iso).match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return Number.isNaN(d.getTime()) ? null : d;
};
const pad = (n: number) => String(n).padStart(2, '0');
export const fmtMD = (d: Date) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
export const fmtYMD = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
export const fmtWeekday = (d: Date) => WD_FULL[d.getDay()];
export const fmtJaDate = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

/** 문서 번호 — 발행일 YYMMDD + id 앞 4자리 숫자화 */
const makeDocNo = (id: string, issued: Date) => {
    const yy = String(issued.getFullYear()).slice(2);
    const digits = (id.replace(/[^0-9]/g, '') + '0000').slice(0, 4);
    return `${yy}${pad(issued.getMonth() + 1)}${pad(issued.getDate())}-${digits}`;
};

const lines = (t?: string) => String(t || '').split(/\r?\n/).map(x => x.replace(/^[・•\-*]\s*/, '').trim()).filter(Boolean);

const firstParagraph = (t?: string) => String(t || '').split(/\n\s*\n/)[0].trim();

const NO_MEAL = /^(x|×|✕|-|—|なし|無し|없음|불포함)$/i;
const MEAL_MARK = /^(o|○|◯|有|有り|あり|포함|include|included)$/i;
const mealText = (meals: any): string => {
    if (!meals || typeof meals !== 'object') return '—';
    const parts: string[] = [];
    const add = (label: string, v: any) => {
        const s = String(v ?? '').trim();
        if (!s || NO_MEAL.test(s)) return;
        parts.push(MEAL_MARK.test(s) ? label : `${label}（${s}）`);
    };
    add('朝食', meals.breakfast);
    add('昼食', meals.lunch);
    add('夕食', meals.dinner);
    return parts.length ? parts.join(' · ') : '—';
};

export const SKIP_HIGHLIGHT = new Set(['pickup', 'transport', 'meal', 'checkin', 'free']);

const toEn = (name: string): string => {
    const n = name.replace(/\s/g, '');
    const hit = MAP_DESTINATIONS.find(d => n.includes(d.ja.replace(/\s/g, '')) || d.ja.replace(/\s/g, '').includes(n) || n.includes(d.ko));
    return hit ? hit.en.replace(/\s*\(.*\)\s*/, '') : '';
};

export const matchSpot = (spots: DesignSpotLite[] | undefined, ...names: string[]): string => {
    if (!spots?.length) return '';
    for (const raw of names) {
        const n = (raw || '').replace(/\s/g, '');
        if (n.length < 2) continue;
        const hit = spots.find(s => {
            const sn = s.name.replace(/\s/g, '');
            return sn && (n.includes(sn) || sn.includes(n));
        });
        if (hit?.image) return hit.image;
    }
    return '';
};

// ─── 포함 항목 아이콘 ──────────────────────────────────────────────────
export const INC_ICONS: Record<string, string> = {
    home: 'M4 20V10l8-6 8 6v10H4zM10 20v-6h4v6',
    dish: 'M3 17h18M5 17a7 7 0 0114 0M12 7V5M10 5h4',
    star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
    plane: 'M3 14l18-7-6 13-3-5zM12 15l3-3',
    car: 'M4 16V11l2-5h12l2 5v5M4 16h16M7 16v2M17 16v2M4 11h16',
    guide: 'M12 11a4 4 0 100-8 4 4 0 000 8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8',
    ticket: 'M3 8V6h18v2a2 2 0 000 4v2a2 2 0 000 4v2H3v-2a2 2 0 000-4v-2a2 2 0 000-4zM10 6v14',
    water: 'M10 3h4v3l2 3v12H8V9l2-3z',
    camel: 'M4 20v-6c0-3 2-5 4-5l2-4 3 4c2 0 3-2 5-2l2 2-2 2v9M8 20v-5M16 20v-5',
    clip: 'M8 4h8v3H8zM6 6h12v15H6zM9 12h6M9 16h4',
    moon: 'M20 14A8 8 0 1110 4a6 6 0 0010 10zM17 3v3M15.5 4.5h3',
};
export const incIcon = (t: string): string => {
    if (/特別|スペシャル/.test(t)) return INC_ICONS.star;
    if (/宿泊|ホテル|ゲル|숙박/.test(t)) return INC_ICONS.home;
    if (/食事|朝食|昼食|夕食|식사/.test(t)) return INC_ICONS.dish;
    if (/空港|送迎|픽업|공항/.test(t)) return INC_ICONS.plane;
    if (/車|ドライバー|차량/.test(t)) return INC_ICONS.car;
    if (/ガイド|가이드/.test(t)) return INC_ICONS.guide;
    if (/入場|公演|チケット|입장/.test(t)) return INC_ICONS.ticket;
    if (/水|ウォーター|생수/.test(t)) return INC_ICONS.water;
    if (/ラクダ|乗馬|体験|アクティビティ|체험/.test(t)) return INC_ICONS.camel;
    if (/プライベート|貸切|전용/.test(t)) return INC_ICONS.clip;
    if (/星|天の川|별/.test(t)) return INC_ICONS.moon;
    return INC_ICONS.star;
};

export const DEFAULT_INCLUDED = ['全日程の宿泊', '全日程のお食事', '空港送迎', '全日程 専用車両', '日本語専門ガイド', '観光地・公演入場料', '1日1本 ミネラルウォーター', 'アクティビティ費用', 'プライベートツアー', '星空・天の川観賞'];
export const DEFAULT_EXCLUDED = ['往復航空券', '個人的な費用', 'オプション費用', '海外旅行保険', 'SIMカード代'];

// ─── 빌드 ──────────────────────────────────────────────────────────────
export function buildTripDoc(input: BuildInput): TripDoc {
    const ds = input.documentSettings || {};
    const q = mergeQuoteDocSettings(ds.quoteDoc);
    const people = countPeople(input.people);
    const issuedDate = parseDate(input.issuedAt) || new Date();
    const start = parseDate(input.startDate);
    const end = parseDate(input.endDate);
    const rawDays: any[] = Array.isArray(input.days) ? input.days : [];

    const nights = start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000)) : (rawDays.length ? Math.max(0, rawDays.length - 1) : null);
    const dayCount = start && end ? (nights ?? 0) + 1 : rawDays.length;

    const days: TripDay[] = rawDays.map((d, i) => {
        const n = Number(d?.day) || i + 1;
        let dateLabel = String(d?.date || '').trim();
        if (start) {
            const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (n - 1));
            dateLabel = `${fmtMD(dt)}(${WD[dt.getDay()]})`;
        }
        const acts: TripActivity[] = (Array.isArray(d?.activities) ? d.activities : [])
            .filter((a: any) => a && (a.title || a.description))
            .map((a: any) => ({
                title: String(a.title || '').trim(),
                desc: String(a.description || '').trim(),
                images: toImages(a.images),
                type: a.type,
            }));
        const items = acts.map(a => (a.title ? a.title : firstParagraph(a.desc)).trim()).filter(Boolean);
        const acc = d?.accommodation ? (typeof d.accommodation === 'string' ? { name: d.accommodation } : d.accommodation) : null;
        const accDesc = acc?.description ? String(acc.description).split(/\r?\n/)[0].trim() : '';
        return {
            n,
            dateLabel,
            title: String(d?.title || '').trim() || String(d?.region || '').trim() || `DAY ${n}`,
            region: String(d?.region || '').trim(),
            move: String(d?.move || '').trim(),
            items: items.length ? items : (d?.summary ? lines(d.summary) : []),
            activities: acts,
            stay: acc?.name ? String(acc.name) : '—',
            stayDesc: accDesc || (acc?.type ? String(acc.type) : '') || (acc?.location ? String(acc.location) : ''),
            stayImages: toImages(acc?.images),
            meal: mealText(d?.meals),
        };
    });

    // ── 금액 ──
    let price: TripPrice | null = null;
    const perFromSettings = money(ds?.overview?.pricePerPerson);
    const totalRaw = money(input.total);
    const total = totalRaw > 0 ? totalRaw : (perFromSettings > 0 ? perFromSettings * people : 0);
    if (total > 0) {
        let deposit = money(input.deposit);
        if (deposit <= 0) {
            const guideAmounts = String(ds?.guide?.paymentInfo || '').match(/\d[\d,]{3,}/g)?.map(money).filter(Boolean) || [];
            deposit = guideAmounts[0] ? guideAmounts[0] * (/1人|お一人|1인/.test(String(ds?.guide?.paymentInfo || '')) ? people : 1) : Math.round(total * 0.1);
        }
        deposit = Math.min(deposit, total);
        const balanceRaw = money(input.balance);
        const balance = balanceRaw > 0 ? balanceRaw : Math.max(0, total - deposit);
        price = {
            total,
            perPerson: totalRaw > 0 ? Math.round(total / people) : perFromSettings,
            deposit,
            depositPer: Math.round(deposit / people),
            balance,
            balancePer: Math.round(balance / people),
            estimated: input.mode === 'quote' && totalRaw <= 0,
        };
    }

    // ── 포함 / 불포함 ──
    const incText = lines(ds?.overview?.includedText);
    const excText = lines(ds?.overview?.excludedText);
    // 편집기에서 체크한 항목이 우선 → 상품 → 문서 기본 문구 → 공통 기본값
    const included = (q.included.length ? q.included : input.included && input.included.length ? input.included : incText.length ? incText : DEFAULT_INCLUDED).slice(0, 16);
    const excluded = (q.excluded.length ? q.excluded : input.excluded && input.excluded.length ? input.excluded : excText.length ? excText : DEFAULT_EXCLUDED).slice(0, 12);

    // ── 경로 (일자별 1 정거장) ──
    const route: RouteStop[] = days.map(d => {
        const actImg = d.activities.find(a => a.images.length && !SKIP_HIGHLIGHT.has(String(a.type)))?.images[0]
            || d.activities.find(a => a.images.length)?.images[0] || '';
        const img = actImg || d.stayImages[0] || matchSpot(input.designSpots, d.title, d.region, ...d.items);
        const firstSight = d.activities.find(a => !SKIP_HIGHLIGHT.has(String(a.type)) && a.title)?.title || d.items[0] || '';
        const ll = lookupFirst(d.region, d.title, ...d.activities.map(a => a.title), d.stay);
        return {
            img,
            name: d.title,
            short: (d.region || d.title).replace(/国立公園$/, '').slice(0, 12),
            sub: firstSight.length > 16 ? firstSight.slice(0, 16) + '…' : firstSight,
            day: d.n,
            time: d.move,
            ll,
        };
    });

    // ── 見どころ ──
    // 편집기에서 관광지 마스터로 고른 곳만, 고른 순서대로 (일정 항목에서 자동으로 뽑지 않는다)
    const highlights: Highlight[] = [];
    for (const id of q.spots) {
        const s = (input.spotMaster || []).find(x => x.id === id);
        const imgs = toImages(s?.images);
        if (!s || !imgs.length) continue;
        const name = String(s.name_kr || '').replace(/[（(].*?[）)]/g, '').replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').replace(/️/g, '').trim();
        const en = (String(s.name_kr || '').match(/[（(]([A-Za-z][^）)]*)[）)]/)?.[1] || '').trim() || toEn(name);
        highlights.push({ img: imgs[0], thumbs: imgs.slice(1, 4), en, name, desc: firstParagraph(String(s.description || '')) });
    }

    // ── 자동으로 정하는 공통 항목 ──
    // 표지 계절 단어: 비워 두면 출발 월로 (12~2 冬旅, 3~5 春旅, 6~8 夏旅, 9~11 秋旅)
    if (!q.coverLead && start) {
        const mo = start.getMonth() + 1;
        q.coverLead = mo === 12 || mo <= 2 ? '冬旅' : mo <= 5 ? '春旅' : mo <= 8 ? '夏旅' : '秋旅';
    }
    // 이동 강도: 0(자동)이면 DAY 이동 시간 중 가장 긴 날 기준 (~2h:1, ~4h:2, ~6h:3, ~8h:4, 그 이상 5)
    if (!q.intensity) {
        const hours = days.map(d => { const m = d.move.match(/(\d+(?:\.\d+)?)\s*(?:時間|h|시간)/i); return m ? parseFloat(m[1]) : 0; });
        const maxH = Math.max(0, ...hours);
        q.intensity = maxH === 0 ? 3 : maxH <= 2 ? 1 : maxH <= 4 ? 2 : maxH <= 6 ? 3 : maxH <= 8 ? 4 : 5;
    }

    const validFromSetting = parseDate(q.validUntil);
    const validUntil = validFromSetting
        ? new Date(validFromSetting.getFullYear(), validFromSetting.getMonth(), validFromSetting.getDate(), 23, 59, 59)
        : new Date(issuedDate.getFullYear(), issuedDate.getMonth(), issuedDate.getDate() + 7, 23, 59, 59);

    return {
        mode: input.mode,
        docNo: input.docNo || makeDocNo(input.id, issuedDate),
        issued: fmtYMD(issuedDate),
        customerName: String(input.customerName || '').trim() || '〇〇',
        people,
        startDate: start ? fmtYMD(start) : '',
        endDate: end ? fmtYMD(end) : '',
        nights,
        dayCount,
        title: String(input.title || '').trim(),
        q,
        included,
        excluded,
        days,
        price,
        guideName: String(input.guideName || '').trim(),
        depositPaid: !!input.depositPaid,
        payUrl: input.depositPaid ? '' : String(input.payUrl || ''),
        adminNote: String(input.adminNote || '').trim(),
        validUntil,
        route,
        highlights,
    };
}

/** 「3泊5日」 */
export const durationLabel = (doc: TripDoc) =>
    doc.nights != null && doc.dayCount ? `${doc.nights}泊${doc.dayCount}日` : (doc.days.length ? `全${doc.days.length}日間` : '');
