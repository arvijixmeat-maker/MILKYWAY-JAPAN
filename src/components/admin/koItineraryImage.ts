/**
 * 견적 담당자용 한국어 일정표 이미지 (PNG) — 관리자만 씀, 고객에게는 나가지 않음.
 * DAY별 제목·일정·숙소·식사만 글자로 그린다 (여행지 사진 없음). 라이브러리 없이 캔버스로 직접 그린다.
 */

export interface KoItineraryDay {
    label: string;      // 「DAY 1 · 8/1(토)」
    title: string;      // 한국어 제목
    sub: string;        // 지역 · 이동 시간
    lines: string[];    // 일정 (한국어 뜻, 없으면 일본어 그대로)
    stay: string;       // 숙소
    meals: [string, string][]; // [['조식','캠프식'], ...]
}
export interface KoItinerary {
    title: string;
    meta: string[];     // 고객 · 인원 · 기간 · 1인 요금 등
    days: KoItineraryDay[];
    included: string[];
    excluded: string[];
    note?: string;
    /** 투어 비용 내역 (원가 계산 카드에서 고른 등급) — 원가·마진이 들어 있으니 고객에게 보내지 않는다 */
    cost?: KoCost | null;
}
export interface KoCost {
    grade: string;          // 「실속 (3성급 + 일반 게르)」
    pax: number;
    lines: Array<{ category: string; label: string; formula: string; amountMnt: number; warn: string }>;
    totalCostMnt: number;
    marginPct: number;
    marginMnt: number;
    teamTotalMnt: number;
    mntPerJpy: number;
    teamTotalYen: number;
    perPersonYenRaw: number;
    perPersonYen: number;
    roundedTeamYen: number;
    /** 세 등급의 1인 금액 */
    grades: Array<{ name: string; perPersonYen: number; checks: number }>;
    budgetText?: string;
}

const W = 900;          // 그림 폭 (CSS px) — 2배로 그려 선명하게
const PAD = 40;
const FONT = '"Pretendard", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const C = { ink: '#0F2A2A', sub: '#5B6B6B', faint: '#94A3A3', line: '#E3ECEB', mint: '#00A88B', mintBg: '#EAF7F4', dark: '#123B3A', card: '#FFFFFF', bg: '#F6F9F9' };

/** 글을 폭에 맞게 줄바꿈 (한국어·일본어는 글자 단위, 영어는 단어가 끊길 수 있음 — 관리자용이라 충분) */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
    const out: string[] = [];
    for (const para of String(text || '').split(/\n/)) {
        let cur = '';
        for (const ch of para) {
            if (ctx.measureText(cur + ch).width > max && cur) { out.push(cur); cur = ch.trimStart(); } else cur += ch;
        }
        out.push(cur);
    }
    return out;
}

/** 그리기 — dry 이면 높이만 잰다 */
function paint(ctx: CanvasRenderingContext2D, it: KoItinerary, dry: boolean): number {
    const font = (w: number, s: number) => { ctx.font = `${w} ${s}px ${FONT}`; };
    const text = (t: string, x: number, y: number, color: string) => { if (!dry) { ctx.fillStyle = color; ctx.fillText(t, x, y); } };
    const rect = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
        if (dry) return;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
        ctx.fillStyle = fill; ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    };
    ctx.textBaseline = 'top';
    let y = PAD;

    // 머리글
    font(700, 13); text('MILKYWAY JAPAN · 견적 담당자용 일정표 (한국어)', PAD, y, C.mint); y += 24;
    font(800, 26);
    for (const l of wrap(ctx, it.title || '일정표', W - PAD * 2)) { text(l, PAD, y, C.ink); y += 36; }
    font(500, 14);
    const meta = it.meta.filter(Boolean).join('   ·   ');
    if (meta) for (const l of wrap(ctx, meta, W - PAD * 2)) { text(l, PAD, y, C.sub); y += 22; }
    y += 14;
    if (!dry) { ctx.fillStyle = C.line; ctx.fillRect(PAD, y, W - PAD * 2, 1); }
    y += 20;

    // DAY 카드
    const cx = PAD, cw = W - PAD * 2, ip = 22, tw = cw - ip * 2;
    for (const d of it.days) {
        // 높이를 먼저 재고(draw=false) 카드·박스 배경을 깐 뒤 내용을 그린다(draw=true)
        const body = (draw: boolean, top: number) => {
            const on = draw && !dry; let yy = top + ip;
            const t = (s: string, x: number, yv: number, color: string) => { if (on) { ctx.fillStyle = color; ctx.fillText(s, x, yv); } };
            font(800, 12); const lw = ctx.measureText(d.label).width + 18;
            if (on) { ctx.beginPath(); ctx.roundRect(cx + ip, yy, lw, 24, 12); ctx.fillStyle = C.dark; ctx.fill(); }
            t(d.label, cx + ip + 9, yy + 6, '#FFFFFF');
            yy += 34;
            font(800, 19);
            for (const l of wrap(ctx, d.title || '-', tw)) { t(l, cx + ip, yy, C.ink); yy += 27; }
            if (d.sub) { font(500, 13); t(d.sub, cx + ip, yy, C.faint); yy += 22; }
            yy += 6;
            font(500, 15);
            d.lines.forEach((line, i) => {
                const ls = wrap(ctx, line, tw - 26);
                ls.forEach((l, k) => {
                    if (k === 0) { font(800, 13); t(String(i + 1), cx + ip, yy + 1, C.mint); font(500, 15); }
                    t(l, cx + ip + 26, yy, C.ink); yy += 24;
                });
                yy += 2;
            });
            if (!d.lines.length) { t('(일정 없음)', cx + ip, yy, C.faint); yy += 24; }
            yy += 8;
            // 숙소 · 식사 박스
            const boxTop = yy;
            let by = boxTop + 12;
            const row = (k: string, v: string) => {
                font(800, 13); t(k, cx + ip + 14, by + 1, C.mint);
                font(600, 14);
                const ls = wrap(ctx, v || '-', tw - 28 - 56);
                ls.forEach(l => { t(l, cx + ip + 14 + 56, by, C.ink); by += 22; });
            };
            row('숙소', d.stay || '없음');
            by += 4;
            row('식사', d.meals.map(([k, v]) => `${k} ${v || '없음'}`).join('   /   '));
            // 박스 배경은 글자보다 먼저 깔려야 하므로 바깥에서 (잰 높이로) 먼저 그린다
            const boxH = by - boxTop + 8;
            yy = boxTop + boxH + ip - 6;
            return { h: yy - top, boxTop, boxH };
        };
        const m = body(false, y);
        rect(cx, y, cw, m.h, 16, C.card, C.line);
        rect(cx + ip, m.boxTop, tw, m.boxH, 10, C.mintBg);
        body(true, y);
        y += m.h + 14;
    }

    // 포함 · 불포함 · 메모
    const list = (k: string, items: string[]) => {
        if (!items.length) return;
        font(800, 14); text(k, PAD, y, C.dark); y += 22;
        font(500, 14);
        for (const l of wrap(ctx, items.join(' · '), W - PAD * 2)) { text(l, PAD, y, C.sub); y += 22; }
        y += 10;
    };
    y += 6;
    list('포함', it.included);
    list('불포함', it.excluded);
    if (it.note) list('메모', [it.note]);
    // ── 투어 비용 (원가 계산) ──
    const cost = it.cost;
    if (cost && cost.lines.length) {
        const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
        const right = (t: string, xr: number, yy: number, color: string) => { if (!dry) { ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.fillText(t, xr, yy); ctx.textAlign = 'left'; } };
        y += 8;
        if (!dry) { ctx.fillStyle = C.line; ctx.fillRect(PAD, y, W - PAD * 2, 1); }
        y += 18;
        font(800, 18); text('투어 비용', PAD, y, C.ink);
        font(600, 13); text(`${cost.grade} · ${cost.pax}명 · 환율 ¥1 = ${cost.mntPerJpy.toFixed(2)}₮`, PAD + 96, y + 4, C.sub);
        y += 34;
        // 등급별 1인 금액
        const gw = (W - PAD * 2 - 16) / 3;
        cost.grades.forEach((g, k) => {
            const gx = PAD + k * (gw + 8);
            const on = cost.grade.startsWith(g.name);
            rect(gx, y, gw, 64, 12, on ? C.dark : C.card, on ? undefined : C.line);
            font(700, 12); text(g.name + (g.checks ? ` · 확인 필요 ${g.checks}` : ''), gx + 14, y + 12, on ? '#8CE9D8' : C.sub);
            const price = g.perPersonYen ? `¥${n0(g.perPersonYen)}` : '—';
            font(800, 20); text(price, gx + 14, y + 32, on ? '#FFFFFF' : C.ink);
            const pw = ctx.measureText(price).width;
            font(500, 11); text('/ 1인', gx + 20 + pw, y + 40, on ? '#B6C7C3' : C.faint);
        });
        y += 80;
        // 내역 표
        const xAmt = W - PAD - 14, xFormula = PAD + 430;
        rect(PAD, y, W - PAD * 2, 30, 8, C.mintBg);
        font(800, 12); text('항목', PAD + 14, y + 9, C.mint); text('계산', xFormula, y + 9, C.mint); right('금액 ₮', xAmt, y + 9, C.mint);
        y += 36;
        for (const l of cost.lines) {
            font(700, 11); const cw2 = ctx.measureText(l.category).width + 12;
            rect(PAD + 10, y, cw2, 20, 5, C.bg);
            text(l.category, PAD + 16, y + 5, C.sub);
            font(600, 13);
            const ls = wrap(ctx, l.label + (l.warn ? ` 〔${l.warn}〕` : ''), xFormula - (PAD + 22 + cw2) - 12);
            ls.forEach((t, k) => text(t, PAD + 18 + cw2, y + 3 + k * 18, l.warn ? '#8A5A00' : C.ink));
            font(500, 12); text(l.formula, xFormula, y + 4, C.sub);
            font(700, 13); right(n0(l.amountMnt), xAmt, y + 3, C.ink);
            y += Math.max(26, ls.length * 18 + 8);
            if (!dry) { ctx.fillStyle = C.line; ctx.fillRect(PAD + 10, y - 3, W - PAD * 2 - 20, 1); }
        }
        y += 8;
        const sum = (k: string, v: string, strong = false) => { font(strong ? 800 : 600, strong ? 15 : 13); text(k, PAD + 14, y, strong ? C.ink : C.sub); right(v, xAmt, y, strong ? C.ink : C.ink); y += strong ? 26 : 22; };
        sum('총원가', `${n0(cost.totalCostMnt)}₮`);
        sum(`마진 ${cost.marginPct}% (원가에 가산)`, `${n0(cost.marginMnt)}₮`);
        sum('팀 총액', `${n0(cost.teamTotalMnt)}₮  =  ¥${n0(cost.teamTotalYen)}`);
        sum('1인 금액 (반올림 전)', `¥${n0(cost.perPersonYenRaw)}`);
        y += 4;
        rect(PAD, y, W - PAD * 2, 54, 12, C.dark);
        font(700, 13); text(`1인 판매가 · ${cost.pax}명 합계 ¥${n0(cost.roundedTeamYen)}`, PAD + 16, y + 20, '#B6C7C3');
        font(800, 24); right(`¥${n0(cost.perPersonYen)}`, xAmt, y + 14, '#FFFFFF');
        y += 66;
        if (cost.budgetText) { font(500, 12); text(`고객이 적은 예산: ${cost.budgetText}`, PAD, y, C.sub); y += 20; }
        font(700, 11); text('※ 원가와 마진이 들어 있습니다 — 고객에게 보내지 마세요.', PAD, y, '#B42318'); y += 18;
    }
    font(500, 11); text('※ 관리자 확인용 — 고객에게는 일본어 견적서가 나갑니다.', PAD, y + 4, C.faint);
    return y + 4 + 18 + PAD;
}

/** 한국어 일정표를 PNG 로 그려 내려받는다 */
export async function downloadKoItineraryImage(it: KoItinerary, fileName: string): Promise<void> {
    try { await document.fonts?.ready; } catch { /* 글꼴 대기 실패는 무시 */ }
    const scale = 2;
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) throw new Error('이 브라우저에서는 이미지를 만들 수 없습니다.');
    const h = Math.ceil(paint(probe, it, true));
    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이 브라우저에서는 이미지를 만들 수 없습니다.');
    ctx.scale(scale, scale);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, h);
    paint(ctx, it, false);
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('이미지를 만들지 못했습니다.');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/[\\/:*?"<>|]+/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
