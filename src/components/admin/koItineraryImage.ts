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
    /** 고객 요청 정리 (한국어) — 있으면 일정 위에 상자로 그린다 */
    request?: { headline: string; who: string; groups: [string, string[]][] };
}

const W = 900;          // 그림 폭 (CSS px) — 2배로 그려 선명하게
const PAD = 40;
const FONT = '"Pretendard", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const C = { ink: '#0F2A2A', sub: '#5B6B6B', faint: '#94A3A3', line: '#E3ECEB', mint: '#00A88B', mintBg: '#EAF7F4', amber: '#8A5A00', amberBg: '#FFF4D6', dark: '#123B3A', card: '#FFFFFF', bg: '#F6F9F9' };

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

    const cx = PAD, cw = W - PAD * 2, ip = 22, tw = cw - ip * 2;

    // 고객 요청 정리
    const rq = it.request;
    if (rq && (rq.headline || rq.groups.some(g => g[1].length))) {
        const body = (draw: boolean, top: number) => {
            const on = draw && !dry; let yy = top + ip;
            const t = (s: string, x: number, yv: number, color: string) => { if (on) { ctx.fillStyle = color; ctx.fillText(s, x, yv); } };
            font(800, 12); const lw = ctx.measureText('고객 요청 정리').width + 18;
            if (on) { ctx.beginPath(); ctx.roundRect(cx + ip, yy, lw, 24, 12); ctx.fillStyle = C.amberBg; ctx.fill(); }
            t('고객 요청 정리', cx + ip + 9, yy + 6, C.amber);
            yy += 34;
            if (rq.headline) { font(800, 18); for (const l of wrap(ctx, rq.headline, tw)) { t(l, cx + ip, yy, C.ink); yy += 26; } }
            if (rq.who) { font(500, 13); for (const l of wrap(ctx, rq.who, tw)) { t(l, cx + ip, yy, C.sub); yy += 20; } }
            // 묶음마다 색 상자 — 편집기 카드처럼 두 칸으로 나란히
            const tones: [string, string][] = [[C.mintBg, '#007F75'], [C.amberBg, C.amber], ['#FFF1F0', '#B42318'], ['#F3F6F5', C.sub]];
            const boxes = rq.groups.map((g, i) => ({ k: g[0], items: g[1], tone: tones[i % tones.length] })).filter(g => g.items.length);
            const gap = 10, bp = 14;
            const box = (g: typeof boxes[number], x: number, top2: number, w: number, h: number) => {
                // h 가 0 이면 높이만 잰다
                const go = on && h > 0;
                if (go) { ctx.beginPath(); ctx.roundRect(x, top2, w, h, 12); ctx.fillStyle = g.tone[0]; ctx.fill(); }
                let by = top2 + bp;
                font(800, 13); if (go) { ctx.fillStyle = g.tone[1]; ctx.fillText(`${g.k} ${g.items.length}`, x + bp, by); } by += 24;
                font(500, 14);
                for (const item of g.items) {
                    wrap(ctx, item, w - bp * 2 - 14).forEach((l, i) => {
                        if (go) { if (i === 0) { ctx.fillStyle = g.tone[1]; ctx.fillText('·', x + bp + 1, by); } ctx.fillStyle = C.ink; ctx.fillText(l, x + bp + 14, by); }
                        by += 22;
                    });
                    by += 2;
                }
                return by + bp - 6 - top2;
            };
            if (boxes.length) yy += 12;
            for (let i = 0; i < boxes.length; i += 2) {
                const pair = boxes.slice(i, i + 2);
                const w = pair.length === 2 ? (tw - gap) / 2 : tw;
                const h = Math.max(...pair.map(g => box(g, 0, 0, w, 0)));
                pair.forEach((g, k) => box(g, cx + ip + k * (w + gap), yy, w, h));
                yy += h + gap;
            }
            if (boxes.length) yy -= gap;
            return yy + ip - top;
        };
        const h = body(false, y);
        rect(cx, y, cw, h, 16, C.card, C.line);
        body(true, y);
        y += h + 14;
    }

    // DAY 카드
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
