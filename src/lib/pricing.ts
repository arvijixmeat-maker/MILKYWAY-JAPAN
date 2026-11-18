/**
 * 견적 원가 계산 — 「몽골리아 은하수 견적 계산 규칙」 그대로 (편집기 · 서버 공용, 순수 함수).
 *
 * - 모든 원가와 마진은 투그릭(₮)으로 계산하고, 마지막에 엔화로 바꾼다. 최종 1인 금액만 반올림한다.
 * - 금액은 AI 가 정하지 않는다 — AI 는 원가표 항목을 고르기만 하고 계산은 여기서 한다.
 * - 단가가 0 이거나 비어 있으면 무료가 아니라 「확인 필요」다.
 */

export type CostCategory = 'stay' | 'meal' | 'activity' | 'entrance' | 'transfer' | 'vehicle' | 'staff' | 'misc';
/** 과금 단위 — 계산 방식을 정한다 */
export type CostUnit =
    | 'person_night'   // 게르·캠프: 1인 1박
    | 'room_night'     // 호텔: 객실 1박 (2인 1실)
    | 'person'         // 1인 1회 (식사·체험·1인 입장료)
    | 'vehicle'        // 차량 1대 1회 (차량당 입장료·공항 이동)
    | 'team'           // 팀 1회
    | 'day';           // 1일 (가이드·기사·차량)

export const CATEGORY_KO: Record<CostCategory, string> = {
    stay: '숙박', meal: '식사', activity: '체험', entrance: '입장료', transfer: '공항 이동', vehicle: '차량·유류', staff: '인력', misc: '기타',
};
export const UNIT_KO: Record<CostUnit, string> = {
    person_night: '1인·1박', room_night: '객실·1박', person: '1인·1회', vehicle: '차량·1회', team: '팀·1회', day: '1일',
};
/** 여행 등급 — 실속 = 3성 호텔 + 일반 게르 / 풀패키지 = 4성 + 고급 게르 / 고급 = 5성 + 럭셔리 게르(2인 1실) */
export type TripGrade = 'value' | 'full' | 'luxury';
export const GRADE_KO: Record<TripGrade, string> = { value: '실속', full: '풀패키지', luxury: '고급' };
export const GRADE_STAY: Record<TripGrade, { hotel: string; ger: string }> = {
    value: { hotel: '3성급', ger: '일반 게르' },
    full: { hotel: '4성급', ger: '고급 게르' },
    luxury: { hotel: '5성급', ger: '럭셔리 게르' },
};

/** 연료 유종 — 슈흐라이 가격표의 열 */
export type FuelGrade = 'ai92' | 'euro92' | 'ai95' | 'ai98' | 'dt' | 'eurodt';
export const FUEL_GRADE_KO: Record<FuelGrade, string> = { ai92: 'АИ-92', euro92: 'Евро-5-92', ai95: 'АИ-95', ai98: 'АИ-98', dt: 'ДТ (경유)', eurodt: 'Евро-ДТ (경유)' };
/** 유종별 리터당 가격 (₮) — 울란바타르 주유소에서 가장 많이 쓰이는 값 */
export interface FuelPrices { ai92: number; euro92: number; ai95: number; ai98: number; dt: number; eurodt: number; stations: number; fetchedAt: string; source: string; stale?: boolean }

export interface CostItem {
    id: string;
    category: CostCategory;
    region: string;
    name: string;
    /** 숙박 등급 (3성급 · 4성급 · 5성급 · 일반 게르 · 고급 게르 …) */
    grade: string;
    unit: CostUnit;
    priceMnt: number;
    /** 성수기 단가 (없으면 0 — 비수기 단가를 쓴다) */
    peakPriceMnt: number;
    supplier: string;
    note: string;
    /** 단가의 출처·적용 연도 */
    source: string;
    /** 단가나 과금 단위를 아직 확인하지 못함 */
    needsCheck: boolean;
    isActive: boolean;
    sortOrder: number;
    updatedAt?: string;
    updatedBy?: string;
}

export interface PricingConfig {
    /** 마진 — 고객이 marginLargeFrom 명 이상이면 marginLarge, 그보다 적으면 marginSmall (원가에 더하는 비율) */
    marginSmall: number;
    marginLarge: number;
    marginLargeFrom: number;
    /** 환율 — live: 실시간(매일 갱신) / manual: 직접 입력. 값은 「1엔당 투그릭」 */
    rateMode: 'live' | 'manual';
    manualMntPerJpy: number;
    /** 환율 여유분 % — 환율이 움직여도 손해 보지 않게 1엔당 투그릭을 이만큼 낮춰 계산 */
    rateBufferPct: number;
    /** 최종 1인 금액 반올림 단위 (엔) */
    roundYen: number;
    /** 1인 예약금 (엔) */
    depositYen: number;
    /** 고객이 이 인원 이하이면 가이드 겸 기사 1명, 넘으면 가이드 1명 + 기사 1명 (중앙몽골·울란바타르) */
    guideDriverMaxPax: number;
    guideDriverDayMnt: number;
    guideDayMnt: number;
    driverDayMnt: number;
    /** 가이드·기사 숙박비 — 1명 1박 */
    staffStayMnt: number;
    /** 마지막 날이 오전에 끝나면 그날 인건비를 0.5일로 */
    lastDayHalf: boolean;
    /** 조식이 포함되지 않은 게르의 조식 — 1인 1회 */
    breakfastMnt: number;
    /** 승마·낙타 — 고객 몇 명당 마부 1명 */
    horsemanPerPax: number;
    /** 4인 게르를 2명이 쓰면 최소 3인분 청구 (기본은 끔 — 2인 견적은 1인 단가 × 2명) */
    gerMinThreeForTwo: boolean;
    /** 럭셔리 게르 1실 1박 = 그 지역 고급 게르 1인 단가 × 이 값 */
    luxuryGerMultiplier: number;
    /** 유류비 = 이동 거리(km) ÷ 100 × 차량 연비(L/100km) × 리터당 가격 */
    fuelPriceMnt: number;
    /** live: 슈흐라이 주유소 가격표에서 매일 읽은 값 / manual: 위 fuelPriceMnt 로 고정 */
    fuelMode: 'live' | 'manual';
    /** 휘발유·경유 차량에 쓸 유종 */
    gasolineGrade: FuelGrade;
    dieselGrade: FuelGrade;
    /** 기본 코스 거리 (울란바타르 ↔ 테를지 국립공원 코스 가정) */
    defaultCourseKm: number;
    /** 차량별 연비 (100km 당 리터) — 첫 줄이 기본 차량 */
    vehicles: Array<{ name: string; lPer100: number; fuel: 'gasoline' | 'diesel' }>;
    /** 성수기 기간 — MM-DD ~ MM-DD */
    peakSeasons: Array<{ from: string; to: string; label: string }>;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
    marginSmall: 30, marginLarge: 20, marginLargeFrom: 5,
    rateMode: 'live', manualMntPerJpy: 0, rateBufferPct: 0, roundYen: 1000, depositYen: 20000,
    guideDriverMaxPax: 4, guideDriverDayMnt: 400000, guideDayMnt: 300000, driverDayMnt: 350000,
    staffStayMnt: 150000, lastDayHalf: true, breakfastMnt: 40000, horsemanPerPax: 2,
    gerMinThreeForTwo: false, luxuryGerMultiplier: 4,
    fuelPriceMnt: 0, fuelMode: 'live', gasolineGrade: 'ai92', dieselGrade: 'dt', defaultCourseKm: 500,
    vehicles: [
        { name: '스타렉스', lPer100: 20, fuel: 'diesel' }, { name: '알파드', lPer100: 16, fuel: 'gasoline' }, { name: '랜드크루저', lPer100: 20, fuel: 'diesel' },
        { name: '하이에이스', lPer100: 20, fuel: 'diesel' }, { name: '푸르공', lPer100: 20, fuel: 'gasoline' },
    ],
    peakSeasons: [{ from: '07-01', to: '08-31', label: '여름 성수기' }],
};

export const mergePricingConfig = (raw: unknown): PricingConfig => {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const out: any = { ...DEFAULT_PRICING_CONFIG };
    for (const k of Object.keys(DEFAULT_PRICING_CONFIG) as Array<keyof PricingConfig>) {
        const d = DEFAULT_PRICING_CONFIG[k], v = r[k];
        if (typeof d === 'number') { const n = Number(v); if (v !== undefined && v !== null && v !== '' && Number.isFinite(n) && n >= 0) out[k] = n; }
        else if (typeof d === 'boolean') { if (typeof v === 'boolean') out[k] = v; }
        else if (k === 'rateMode' || k === 'fuelMode') { if (v === 'live' || v === 'manual') out[k] = v; }
        else if (k === 'gasolineGrade' || k === 'dieselGrade') { if (typeof v === 'string' && v in FUEL_GRADE_KO) out[k] = v; }
        else if (k === 'vehicles') {
            if (Array.isArray(v)) {
                const list = v.map((x: any) => ({ name: String(x?.name || '').trim().slice(0, 40), lPer100: Number(x?.lPer100), fuel: x?.fuel === 'gasoline' || (x?.fuel === undefined && /알파드|푸르공|alphard/i.test(String(x?.name || ''))) ? 'gasoline' : 'diesel' })).filter((x: any) => x.name && x.lPer100 > 0 && x.lPer100 < 100);
                if (list.length) out[k] = list;
            }
        }
        else if (k === 'peakSeasons') {
            if (Array.isArray(v)) out[k] = v.filter((s: any) => /^\d{2}-\d{2}$/.test(s?.from) && /^\d{2}-\d{2}$/.test(s?.to)).map((s: any) => ({ from: s.from, to: s.to, label: String(s.label || '') }));
        }
    }
    return out as PricingConfig;
};

/** 출발일(YYYY-MM-DD)이 성수기인지 */
export const isPeakDate = (date: string | undefined, cfg: PricingConfig): boolean => {
    const md = String(date || '').slice(5, 10);
    if (!/^\d{2}-\d{2}$/.test(md)) return false;
    return cfg.peakSeasons.some(s => (s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to));
};

/** 견적의 원가 한 줄 — 원가표 항목(또는 직접 입력) + 수량 */
export interface QuoteCostLine {
    /** 원가표 항목 ID (직접 입력이면 비움) */
    itemId?: string;
    label: string;
    category: CostCategory;
    unit: CostUnit;
    unitPriceMnt: number;
    /** 박수 · 횟수 · 일수 */
    qty: number;
    /** 과금 인원을 직접 정할 때 (승마 참가자만 · 가이드 식사 포함 등). 없으면 고객 수 */
    billPax?: number;
    /** 객실 수 · 차량 수를 직접 정할 때 */
    units?: number;
    day?: number;
    needsCheck?: boolean;
}

export interface CostLineResult extends QuoteCostLine { count: number; amountMnt: number; formula: string; warn: string }
export interface PricingResult {
    lines: CostLineResult[];
    byCategory: Array<{ category: CostCategory; amountMnt: number }>;
    totalCostMnt: number;
    marginPct: number;
    marginMnt: number;
    teamTotalMnt: number;
    /** 계산에 쓴 환율 (여유분 반영, 1엔당 ₮) */
    mntPerJpy: number;
    teamTotalYen: number;
    perPersonYenRaw: number;
    perPersonYen: number;
    /** 반올림된 1인 금액 × 고객 수 — 반올림 전 팀 총액과 다를 수 있다 */
    roundedTeamYen: number;
    /** 확인이 필요한 줄 수 (단가 0 · 확인 필요 표시) */
    checks: number;
}

export const marginPctFor = (pax: number, cfg: PricingConfig) => (pax >= cfg.marginLargeFrom ? cfg.marginLarge : cfg.marginSmall);
/** 여유분을 뺀 계산용 환율 (1엔당 ₮) */
export const effectiveRate = (mntPerJpy: number, cfg: PricingConfig) => mntPerJpy * (1 - Math.min(50, Math.max(0, cfg.rateBufferPct)) / 100);
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** 한 줄의 과금 수량 — 단위에 따라 인원 · 객실 수 · 차량 수 */
export function lineCount(l: QuoteCostLine, pax: number, cfg: PricingConfig): { count: number; label: string } {
    if (l.unit === 'person' || l.unit === 'person_night') {
        let n = l.billPax ?? pax;
        if (l.unit === 'person_night' && l.billPax === undefined && cfg.gerMinThreeForTwo && pax === 2) n = 3;
        return { count: n, label: `${n}명` };
    }
    if (l.unit === 'room_night') { const n = l.units ?? Math.ceil(pax / 2); return { count: n, label: `${n}실` }; }
    if (l.unit === 'vehicle') { const n = l.units ?? 1; return { count: n, label: `${n}대` }; }
    const n = l.units ?? 1;
    return { count: n, label: l.unit === 'day' ? `${n}명·대` : `${n}팀` };
}

/** 원가 줄 + 고객 수 + 설정 + 환율 → 팀 총액과 1인 금액 */
export function calcQuote(input: { lines: QuoteCostLine[]; pax: number; config: PricingConfig; mntPerJpy: number; marginPct?: number }): PricingResult {
    const cfg = input.config;
    const pax = Math.max(1, Math.floor(input.pax || 1));
    const lines: CostLineResult[] = input.lines.map(l => {
        const qty = Number(l.qty) > 0 ? Number(l.qty) : 0;
        const price = Number(l.unitPriceMnt) > 0 ? Number(l.unitPriceMnt) : 0;
        const { count, label } = lineCount(l, pax, cfg);
        const amountMnt = price * count * qty;
        const qtyLabel = l.unit === 'person_night' || l.unit === 'room_night' ? `${qty}박` : l.unit === 'day' ? `${qty}일` : `${qty}회`;
        const warn = !price ? '단가 확인 필요' : !qty ? '수량 확인 필요' : l.needsCheck ? '확인 필요' : '';
        return { ...l, qty, unitPriceMnt: price, count, amountMnt, formula: `${fmt(price)}₮ × ${label} × ${qtyLabel}`, warn };
    });
    const totalCostMnt = lines.reduce((s, l) => s + l.amountMnt, 0);
    const cats = new Map<CostCategory, number>();
    for (const l of lines) cats.set(l.category, (cats.get(l.category) || 0) + l.amountMnt);
    const marginPct = input.marginPct ?? marginPctFor(pax, cfg);
    const marginMnt = totalCostMnt * marginPct / 100;
    const teamTotalMnt = totalCostMnt + marginMnt;
    const rate = effectiveRate(input.mntPerJpy, cfg);
    const teamTotalYen = rate > 0 ? teamTotalMnt / rate : 0;
    const perPersonYenRaw = teamTotalYen / pax;
    const step = Math.max(1, cfg.roundYen);
    const perPersonYen = Math.round(perPersonYenRaw / step) * step;
    return {
        lines, byCategory: [...cats.entries()].map(([category, amountMnt]) => ({ category, amountMnt })),
        totalCostMnt, marginPct, marginMnt, teamTotalMnt, mntPerJpy: rate, teamTotalYen, perPersonYenRaw, perPersonYen,
        roundedTeamYen: perPersonYen * pax, checks: lines.filter(l => l.warn).length,
    };
}

/** 가이드·기사 인건비와 숙박비 줄 (규칙 3 · 4 · 5) — nights 박 일정, 마지막 날 오전 종료면 0.5일 */
export function staffLines(pax: number, nights: number, cfg: PricingConfig, lastDayMorningEnd = true): QuoteCostLine[] {
    const days = nights + (cfg.lastDayHalf && lastDayMorningEnd ? 0.5 : 1);
    const solo = pax <= cfg.guideDriverMaxPax;
    const staff = solo ? 1 : 2;
    const out: QuoteCostLine[] = solo
        ? [{ label: '가이드 겸 기사', category: 'staff', unit: 'day', unitPriceMnt: cfg.guideDriverDayMnt, qty: days, units: 1 }]
        : [
            { label: '일본어 가이드', category: 'staff', unit: 'day', unitPriceMnt: cfg.guideDayMnt, qty: days, units: 1 },
            { label: '기사', category: 'staff', unit: 'day', unitPriceMnt: cfg.driverDayMnt, qty: days, units: 1 },
        ];
    if (nights > 0) out.push({ label: '가이드·기사 숙박', category: 'staff', unit: 'person_night', unitPriceMnt: cfg.staffStayMnt, qty: nights, billPax: staff });
    return out;
}

/** 승마·낙타 과금 인원 — 고객 2명당 마부 1명 (규칙 11) */
export const ridingBillPax = (riders: number, cfg: PricingConfig) => riders + Math.ceil(riders / Math.max(1, cfg.horsemanPerPax));

// ── AI 가 고른 원가 계획 → 등급별 원가 줄 ─────────────────────────────────────

/** AI 초안이 일정과 함께 돌려주는 원가 계획 — 금액은 없고 원가표 항목 ID 와 수량만 */
export interface CostPlan {
    /** 마지막 날이 점심 전 오전에 끝나는지 (인건비 0.5일) */
    lastDayMorningEnd: boolean;
    days: Array<{
        day: number;
        /** 그날 밤 숙박 지역 (원가표 숙박 지역 이름) — 숙박이 없으면 빈 값 */
        stayRegion: string;
        stayType: 'hotel' | 'ger' | '';
        picks: Array<{ itemId: string; qty: number; /** 참가 인원 (0 = 전원) */ pax: number }>;
    }>;
}

const HOTEL_GRADE: Record<TripGrade, string> = { value: '3성급', full: '4성급', luxury: '5성급' };
const isRiding = (name: string) => /승마|낙타|乗馬|ラクダ/.test(name);

/** 원가 계획 + 원가표 + 설정 → 그 등급의 원가 줄 (같은 항목은 한 줄로 합친다) */
/** 유류비 줄 — 거리 ÷ 100 × 연비 × 리터당 가격. 리터당 가격이 없으면 「확인 필요」 */
export const FUEL_LABEL = '유류비';
/** 그 차량의 리터당 가격 — 직접 입력이면 그 값, 아니면 가격표에서 읽은 유종 가격 */
export function fuelPriceFor(cfg: PricingConfig, fuel: 'gasoline' | 'diesel', live?: FuelPrices | null): { price: number; grade: string } {
    if (cfg.fuelMode === 'manual') return { price: cfg.fuelPriceMnt, grade: '직접 입력' };
    const g = fuel === 'gasoline' ? cfg.gasolineGrade : cfg.dieselGrade;
    return { price: Number(live?.[g]) || 0, grade: FUEL_GRADE_KO[g] };
}
export function fuelLine(cfg: PricingConfig, vehicleName?: string, km?: number, live?: FuelPrices | null): QuoteCostLine {
    const v = cfg.vehicles.find(x => x.name === vehicleName) || cfg.vehicles[0] || { name: '차량', lPer100: 20, fuel: 'diesel' as const };
    const fp = fuelPriceFor(cfg, v.fuel, live);
    const dist = km && km > 0 ? km : cfg.defaultCourseKm;
    const liters = dist / 100 * v.lPer100;
    return { label: `${FUEL_LABEL} — ${v.name} ${dist}km × ${v.lPer100}L/100km = ${Math.round(liters)}L`, category: 'vehicle', unit: 'team', unitPriceMnt: Math.round(liters * fp.price), qty: 1, needsCheck: !fp.price };
}

export function buildCostLines(input: { plan: CostPlan; items: CostItem[]; config: PricingConfig; pax: number; grade: TripGrade; startDate?: string; fuel?: { vehicle?: string; km?: number }; fuelPrices?: FuelPrices | null }): QuoteCostLine[] {
    const { plan, items, config: cfg, grade } = input;
    const pax = Math.max(1, Math.floor(input.pax || 1));
    const peak = isPeakDate(input.startDate, cfg);
    const priceOf = (it: CostItem) => (peak && it.peakPriceMnt > 0 ? it.peakPriceMnt : it.priceMnt);
    const active = items.filter(i => i.isActive);
    const byId = new Map(active.map(i => [i.id, i]));
    const out: QuoteCostLine[] = [];
    const add = (l: QuoteCostLine) => {
        const same = out.find(o => o.label === l.label && o.unit === l.unit && o.unitPriceMnt === l.unitPriceMnt && o.billPax === l.billPax && o.units === l.units);
        if (same) same.qty += l.qty; else out.push({ ...l });
    };
    const stayItem = (region: string, g: string) => active.find(i => i.category === 'stay' && i.region === region && i.grade === g);

    let nights = 0;
    for (const d of plan.days) {
        if (d.stayType && d.stayRegion) {
            nights += 1;
            if (d.stayType === 'hotel') {
                const g = HOTEL_GRADE[grade];
                const it = stayItem(d.stayRegion, g);
                add({ itemId: it?.id, label: `${d.stayRegion} 호텔 ${g}`, category: 'stay', unit: 'room_night', unitPriceMnt: it ? priceOf(it) : 0, qty: 1, needsCheck: !it || it.needsCheck });
            } else if (grade === 'luxury') {
                // 럭셔리 게르 1실 1박 = 그 지역 고급 게르 1인 단가 × 배수, 고객 2인 1실
                const it = stayItem(d.stayRegion, '고급 게르');
                add({ itemId: it?.id, label: `${d.stayRegion} 럭셔리 게르 (2인 1실)`, category: 'stay', unit: 'room_night', unitPriceMnt: it ? priceOf(it) * cfg.luxuryGerMultiplier : 0, qty: 1, needsCheck: !it || it.needsCheck });
            } else {
                const g = grade === 'value' ? '일반 게르' : '고급 게르';
                const it = stayItem(d.stayRegion, g);
                add({ itemId: it?.id, label: `${d.stayRegion} ${g}`, category: 'stay', unit: 'person_night', unitPriceMnt: it ? priceOf(it) : 0, qty: 1, needsCheck: !it || it.needsCheck });
            }
        }
        for (const p of d.picks) {
            const it = byId.get(p.itemId);
            if (!it || it.category === 'stay') continue;
            const qty = p.qty > 0 ? p.qty : 1;
            const who = p.pax > 0 ? Math.min(p.pax, pax) : pax;
            const perPerson = it.unit === 'person' || it.unit === 'person_night';
            // 승마·낙타는 고객 2명당 마부 1명분을 더한다 / 일부만 참가하면 그 인원만
            const billPax = !perPerson ? undefined : isRiding(it.name) ? ridingBillPax(who, cfg) : who !== pax ? who : undefined;
            const label = `${it.region ? `${it.region} · ` : ''}${it.name}${perPerson && isRiding(it.name) ? ` (고객 ${who}명 + 마부)` : perPerson && who !== pax ? ` (${who}명만)` : ''}`;
            add({ itemId: it.id, label, category: it.category, unit: it.unit, unitPriceMnt: priceOf(it), qty, billPax, needsCheck: it.needsCheck });
        }
    }
    add(fuelLine(cfg, input.fuel?.vehicle, input.fuel?.km, input.fuelPrices));
    for (const l of staffLines(pax, nights, cfg, plan.lastDayMorningEnd)) add(l);
    const order: CostCategory[] = ['stay', 'meal', 'activity', 'entrance', 'transfer', 'vehicle', 'staff', 'misc'];
    return out.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
}
