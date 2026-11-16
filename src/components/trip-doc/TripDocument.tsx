import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { C, COMPANY, IC } from './tripDocContent';
import { Photo, Svg, SectionHead, BigLine, ChipTitle, Gap, Band, Dots } from './tripDocUi';
import { TRIP_DOC_CSS, useReducedMotion, useTripDocFonts, anton, inter } from './tripDocStyle';
import { type TripDoc, durationLabel, fmtJaDate, fmtWeekday, incIcon, parseDate, yen } from './tripDocModel';
import type { TripImages } from './tripDocSources';
import { RouteMap, type MapStop } from './RouteMap';
import { TripDocCompany } from './TripDocCompany';

/**
 * 견적서 / 확정일정표 — 디자인 시안 「Japan version」.
 * 같은 컴포넌트로 견적(mode=quote)과 확정 일정(mode=confirmed)을 모두 그린다.
 */
export interface TripDocumentProps {
    doc: TripDoc;
    /** 관광지·호텔 마스터 등 기존 자료에서 고른 사진 (resolveTripImages) */
    images: TripImages;
    /** 하단 고정 바 (견적: 예약 버튼) */
    bar?: { sub?: string; amount?: string; amountLabel?: string; label: string; onClick?: () => void; disabled?: boolean } | null;
    /** 표지 아래 안내 (담당자 메시지 · 예약 완료 배너 등) */
    notice?: React.ReactNode;
    /** 확정 일정표 전용 — 안전·약관 섹션 */
    legal?: React.ReactNode;
    /** 인쇄 버튼 표시 */
    printable?: boolean;
    /** 관리자 편집기 미리보기 — 지금 고치는 섹션·DAY 로 스크롤하고 잠깐 강조한다 */
    focusTarget?: TripFocus | null;
}

export interface TripFocus { section: string; day?: number; at: number }

const rowLine: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, fontSize: 13, lineHeight: 1.5 };
const dash: React.CSSProperties = { height: 0, borderTop: '1.5px dashed #C9D3D1', margin: '2px 0' };
const secPad: React.CSSProperties = { padding: '32px 20px 36px', display: 'flex', flexDirection: 'column', gap: 20, scrollMarginTop: 56 };

export const TripDocument: React.FC<TripDocumentProps> = ({ doc, images, bar, notice, legal, printable, focusTarget }) => {
    useTripDocFonts();
    const reduce = useReducedMotion();
    const img = useCallback((slot: string) => images.slots[slot] || '', [images.slots]);
    const isQuote = doc.mode === 'quote';
    const dur = durationLabel(doc);
    const region = doc.q.region || doc.days.find(d => d.region)?.region || doc.title || 'モンゴル';
    const docLabel = isQuote ? 'お見積書' : '確定日程表';

    // ── 유효기한 카운트다운 (견적만) ──
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        if (!isQuote) return;
        const t = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(t);
    }, [isQuote]);
    const left = doc.validUntil.getTime() - now.getTime();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const countdown = left > 0 ? `${Math.floor(left / 86400000)}日 ${p2(Math.floor(left / 3600000) % 24)}:${p2(Math.floor(left / 60000) % 60)}:${p2(Math.floor(left / 1000) % 60)}` : '';
    const validJa = fmtJaDate(doc.validUntil);

    // ── 섹션 내비 ──
    const specialsOn = images.specials;
    const NAV = useMemo(() => ([
        ['q-info', isQuote ? 'お見積り' : '旅行概要'],
        doc.price ? ['q-price', 'お支払い'] : null,
        ['q-inc', '含まれるもの'],
        doc.days.length ? ['q-plan', '日程'] : null,
        doc.highlights.length ? ['q-spot', '見どころ'] : null,
        ['q-stay', '宿泊'],
        ['q-team', 'チーム'],
        ['q-meal', '食事'],
        ['q-safe', '注意事項'],
        ['q-meet', '空港'],
        ['q-cert', '許可証'],
        legal ? ['q-legal', '安全情報'] : null,
    ].filter(Boolean) as Array<[string, string]>), [isQuote, doc.price, doc.days.length, doc.highlights.length, legal]);
    const [sec, setSec] = useState('q-info');
    const navRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                let cur = NAV[0][0];
                for (const [id] of NAV) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 120) cur = id; }
                setSec(s => (s === cur ? s : cur));
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
    }, [NAV]);
    useEffect(() => {
        const btn = navRef.current?.querySelector<HTMLElement>(`[data-nav="${sec}"]`);
        const track = navRef.current;
        if (btn && track) track.scrollTo({ left: btn.offsetLeft - track.clientWidth / 2 + btn.clientWidth / 2, behavior: 'smooth' });
    }, [sec]);
    const goSec = (id: string) => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 56, behavior: 'smooth' }); };

    // ── 일정 경로 캐러셀 ──
    const route = doc.route;
    const [rtIdx, setRtIdx] = useState(0);
    const rtPause = useRef(0);
    useEffect(() => {
        if (reduce || route.length < 2) return;
        const t = window.setInterval(() => { if (Date.now() - rtPause.current < 6000) return; setRtIdx(i => (i + 1) % route.length); }, 3500);
        return () => window.clearInterval(t);
    }, [reduce, route.length]);
    const rtN = route.length;
    const rti = rtN ? ((rtIdx % rtN) + rtN) % rtN : 0;
    const rtCur = route[rti];
    const rtPrev = rtN ? route[(rti - 1 + rtN) % rtN] : undefined;

    const mapStops: MapStop[] = useMemo(() => {
        const pts = route.filter(r => r.ll).map(r => ({ name: r.name, sub: `${r.day}日目${r.sub ? ' · ' + r.sub : ''}`, lat: r.ll![0], lon: r.ll![1] }));
        const dedup: typeof pts = [];
        for (const p of pts) { const last = dedup[dedup.length - 1]; if (last && Math.abs(last.lat - p.lat) < 0.02 && Math.abs(last.lon - p.lon) < 0.02) continue; dedup.push(p); }
        const cLon = dedup.reduce((s, p) => s + p.lon, 0) / (dedup.length || 1);
        return dedup.map(p => ({ ...p, side: p.lon < cLon ? 'left' as const : 'right' as const }));
    }, [route]);

    // ── 일자별 아코디언 ──
    const [open, setOpen] = useState<number[]>(() => (doc.days[0] ? [doc.days[0].n] : []));
    const allOpen = doc.days.length > 0 && open.length === doc.days.length;

    // ── 편집기 미리보기: 고치는 곳으로 이동 + 강조 ──
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!focusTarget) return;
        if (focusTarget.day) setOpen(o => (o.includes(focusTarget.day!) ? o : [...o, focusTarget.day!]));
        const t = window.setTimeout(() => {
            const root = rootRef.current; if (!root) return;
            const el = (focusTarget.day ? root.querySelector<HTMLElement>(`[data-day="${focusTarget.day}"]`) : null)
                || root.querySelector<HTMLElement>(`#${focusTarget.section}`)
                || root.querySelector<HTMLElement>('#q-info');
            if (!el) return;
            // scrollIntoView 는 모달·페이지까지 같이 굴려서 부드러운 스크롤이 끊기므로, 미리보기 상자만 움직인다
            let box: HTMLElement | null = root.parentElement;
            while (box && !(box.scrollHeight > box.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
            if (box) {
                const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12;
                box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
            } else {
                window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 60, behavior: 'smooth' });
            }
            el.animate?.([{ boxShadow: `0 0 0 3px ${C.mintBright}`, borderRadius: '24px' }, { boxShadow: '0 0 0 3px rgba(6,196,160,0)', borderRadius: '24px' }], { duration: 1400, easing: 'ease-out' });
        }, 60);
        return () => window.clearTimeout(t);
    }, [focusTarget]);

    // ── 見どころ 트랙 ──
    const spotRef = useRef<HTMLDivElement>(null);
    const [spotIdx, setSpotIdx] = useState(0);
    const spotGo = (i: number) => {
        const el = spotRef.current; if (!el) return;
        const cards = el.querySelectorAll('article'); if (!cards.length) return;
        const k = Math.max(0, Math.min(cards.length - 1, i));
        const c = cards[k] as HTMLElement;
        el.scrollTo({ left: el.scrollLeft + c.getBoundingClientRect().left - el.getBoundingClientRect().left - 20, behavior: 'smooth' });
        setSpotIdx(k);
    };
    const onSpotScroll = () => {
        const el = spotRef.current; if (!el) return;
        const cards = el.querySelectorAll('article'); const L = el.getBoundingClientRect().left + 20;
        let i = 0, bd = Infinity;
        cards.forEach((c, k) => { const d = Math.abs(c.getBoundingClientRect().left - L); if (d < bd) { bd = d; i = k; } });
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) i = cards.length - 1;
        setSpotIdx(s => (s === i ? s : i));
    };
    const drag = useRef<{ x: number; s: number; moved: boolean } | null>(null);
    const [dragging, setDragging] = useState(false);
    const onSpotDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || !spotRef.current) return;
        drag.current = { x: e.clientX, s: spotRef.current.scrollLeft, moved: false };
        setDragging(true);
        const mv = (ev: MouseEvent) => { if (!drag.current || !spotRef.current) return; const dx = ev.clientX - drag.current.x; if (Math.abs(dx) > 4) drag.current.moved = true; spotRef.current.scrollLeft = drag.current.s - dx; };
        const up = (ev: MouseEvent) => {
            window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up);
            setDragging(false);
            const dx = ev.clientX - (drag.current?.x || 0);
            drag.current = null;
            spotGo(Math.abs(dx) > 40 ? spotIdx + (dx < 0 ? 1 : -1) : spotIdx);
        };
        window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    };

    // ── 영수증 숙박 요약 ──
    const stayNames = Array.from(new Set(doc.days.map(d => d.stay).filter(s => s && s !== '—')));
    const staySummary = doc.q.stayLabel || stayNames.slice(0, 3).join(' · ') || '—';
    const start = parseDate(doc.startDate), end = parseDate(doc.endDate);
    const flight = [doc.q.flightIn && `IN ${doc.q.flightIn}`, doc.q.flightOut && `OUT ${doc.q.flightOut}`].filter(Boolean).join(' · ');
    const receiptRows: Array<[string, string]> = [
        ['旅行先', region],
        ['人数', `大人 ${doc.people}名`],
        ...(flight ? [['航空便', flight] as [string, string]] : []),
        ...(doc.q.pickup ? [['空港送迎', doc.q.pickup] as [string, string]] : []),
        ['車両', doc.q.vehicle || '全日程 専用車両'],
        ['宿泊', staySummary],
        ['ガイド', [doc.q.guideLabel || '日本語専門ガイド同行', !isQuote && doc.guideName ? `（${doc.guideName}）` : ''].join('')],
        ['形態', '完全プライベート（他グループ合流なし）'],
    ];

    const price = doc.price;
    const depPct = price ? `${Math.max(4, Math.min(100, (price.deposit / price.total) * 100)).toFixed(1)}%` : '0%';
    const barSub = price ? `お一人様 ¥${yen(price.perPerson)} × ${doc.people}名` : '';
    const intensity = Math.max(1, Math.min(5, doc.q.intensity || 3));

    return (
        // containerType — 글자 크기를 화면 폭(vw) 대신 이 문서 폭(cqw) 기준으로 잡아,
        // 관리자 편집기의 좁은 미리보기에서도 휴대폰 화면과 똑같이 보이게 한다
        <div ref={rootRef} className="tdoc" style={{ background: '#FFFFFF', minHeight: '100vh', containerType: 'inline-size' }}>
            <style>{TRIP_DOC_CSS}</style>
            <div style={{ maxWidth: 720, width: '100%', boxSizing: 'border-box', margin: '0 auto', background: '#FFFFFF', minHeight: '100vh', boxShadow: '0 0 0 1px rgba(18,59,58,0.04)' }}>

                {/* ─── 01 Cover ─── */}
                <section style={{ position: 'relative', overflow: 'hidden', background: '#FFFFFF', color: C.ink, padding: '0 0 26px' }}>
                    <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 20px 0' }}>
                        <span style={{ ...anton, fontSize: 18, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>MONGOLIA MILKY WAY</span>
                        <span style={{ display: 'flex', alignItems: 'center', height: 30, padding: '0 14px', border: `1.5px solid ${C.ink}`, borderRadius: '50%', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.6)' }}>{docLabel}</span>
                    </header>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '30px 20px 0', textAlign: 'center' }}>
                        <span style={{ fontSize: 'clamp(16px,4.6cqw,22px)', fontWeight: 300, letterSpacing: '-0.02em', animation: reduce ? 'none' : 'qUp .8s cubic-bezier(.2,.7,.2,1) .2s both' }}>人生を見上げる時間</span>
                        <h1 style={{ margin: 0, fontSize: 'clamp(38px,12.4cqw,84px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.06em', whiteSpace: 'nowrap', animation: reduce ? 'none' : 'qUp .9s cubic-bezier(.2,.7,.2,1) .35s both' }}>モンゴリア天の川</h1>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                        <div style={{ position: 'relative', width: 'min(78cqw,420px)', aspectRatio: '1/1' }}>
                            <span aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: C.ink }} />
                            <svg aria-hidden="true" viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: reduce ? 'none' : 'qSpin 28s linear infinite', pointerEvents: 'none' }}>
                                <defs><path id="tdRing" d="M100,100 m-91,0 a91,91 0 1,1 182,0 a91,91 0 1,1 -182,0" /></defs>
                                <text style={{ ...anton, fontSize: 9.6, letterSpacing: 1.2, fill: C.mintSoft }}><textPath href="#tdRing" textLength={568} lengthAdjust="spacingAndGlyphs">{`MONGOLIA MILKY WAY ✳ ${isQuote ? 'CUSTOM ESTIMATE' : 'CONFIRMED ITINERARY'} ✳ PRIVATE TOUR ✳ MONGOLIA MILKY WAY ✳ ${isQuote ? 'CUSTOM ESTIMATE' : 'CONFIRMED ITINERARY'} ✳ PRIVATE TOUR ✳ `}</textPath></text>
                            </svg>
                            <div style={{ position: 'absolute', inset: '9%', borderRadius: '50%', overflow: 'hidden', background: '#0F2E2D' }}>
                                <Photo src={img('quote-hero')} placeholder="" eager style={{ animation: reduce ? 'none' : 'qKen 20s ease-in-out infinite alternate' }} />                            </div>
                            <span aria-hidden="true" style={{ position: 'absolute', left: '-6%', bottom: '6%', fontFamily: "'Mrs Saint Delafield',cursive", fontSize: 'clamp(64px,18cqw,104px)', lineHeight: 1, color: C.mintBright, transform: 'rotate(-10deg)', whiteSpace: 'nowrap', pointerEvents: 'none', textShadow: '0 2px 0 #FFFFFF' }}>Milky way</span>
                            <span aria-hidden="true" style={{ position: 'absolute', right: '-4%', top: '4%', fontSize: 34, lineHeight: 1, pointerEvents: 'none' }}>✳</span>
                        </div>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '22px 20px 0', textAlign: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'center', gap: 10, fontSize: 'clamp(40px,12cqw,72px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.06em', animation: reduce ? 'none' : 'qUp .8s cubic-bezier(.2,.7,.2,1) .55s both' }}>
                            {doc.q.coverLead && <span>{doc.q.coverLead}</span>}<span style={{ color: C.mint }}>{docLabel}</span>{isQuote && <span>-!</span>}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: '4px 26px', border: `1.5px solid ${C.ink}`, borderRadius: '50%', fontSize: 13, whiteSpace: 'nowrap' }}>
                            日本語ガイドと <strong style={{ fontWeight: 700, marginLeft: 4 }}>{doc.people}名様専用</strong>で設計
                        </span>
                        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', animation: reduce ? 'none' : 'qUp .8s cubic-bezier(.2,.7,.2,1) .7s both' }}>
                            {[region, dur, `${doc.people}名`].filter(Boolean).map((t, i) => (
                                <span key={i} style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 999, background: C.ink, fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{t}</span>
                            ))}
                            {isQuote ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 6px 0 12px', borderRadius: 999, background: C.mintBg, fontSize: 12, fontWeight: 700, color: countdown ? C.mintDeep : C.red }}>
                                    {countdown ? 'お見積り有効期限まで' : 'お見積り有効期限'}
                                    <span style={{ height: 24, padding: '0 9px', borderRadius: 999, background: C.mintBright, ...inter, fontSize: 11, fontWeight: 700, color: C.ink, display: 'inline-flex', alignItems: 'center' }}>
                                        {countdown || `${doc.validUntil.getMonth() + 1}月${doc.validUntil.getDate()}日 終了`}
                                    </span>
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 999, background: C.grad, fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>✓ ご予約確定</span>
                            )}
                        </span>
                    </div>
                    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', margin: '24px 20px 0', border: `1.5px solid ${C.ink}`, background: 'rgba(255,255,255,0.7)', animation: reduce ? 'none' : 'qUp .8s cubic-bezier(.2,.7,.2,1) .9s both' }}>
                        {[['ISSUED', doc.issued, true], ['MANAGER', doc.q.manager || '担当スタッフ', false], ['NO.', doc.docNo, true]].map(([k, v, num], i) => (
                            <span key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderRight: i < 2 ? `1.5px solid ${C.ink}` : 'none', minWidth: 0 }}>
                                <span style={{ ...anton, fontSize: 12, letterSpacing: '0.04em', color: C.mint }}>{k as string}</span>
                                <span style={{ ...(num ? inter : {}), fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v as string}</span>
                            </span>
                        ))}
                    </div>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 14, padding: '12px 20px 0', fontSize: 11, color: C.sub }}>
                        <span>@{COMPANY.instagram}</span><span>{COMPANY.site}</span>
                    </div>
                </section>

                {/* ─── 섹션 내비 ─── */}
                <nav className="tdoc-noprint" style={{ position: 'sticky', top: 0, zIndex: 15, background: '#FFFFFF', borderBottom: `1px solid ${C.line}` }}>
                    <div ref={navRef} data-noscroll="" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', padding: '10px 20px' }}>
                        {NAV.map(([id, label]) => {
                            const on = sec === id;
                            return (
                                <button key={id} data-nav={id} type="button" onClick={() => goSec(id)}
                                    style={{ flexShrink: 0, height: 34, padding: '0 14px', border: 0, borderRadius: 999, background: on ? C.grad : C.gray, fontSize: 13, fontWeight: on ? 700 : 500, color: on ? '#FFFFFF' : C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {notice}

                {/* ─── 02 Estimate / Trip info ─── */}
                <section id="q-info" style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 24, scrollMarginTop: 56 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: C.sub }}>モンゴル現地で直接運営する</span>
                            <ChipTitle before="モンゴリア天の川" chip="現地旅行会社" />
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                            {[['モンゴル 事業者番号', COMPANY.mnRegNo, COMPANY.mnRegName], ['韓国 事業者番号', COMPANY.krRegNo, COMPANY.krRegName]].map(([k, v, s]) => (
                                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px', borderRadius: 20, background: C.paper }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: C.sub }}>{k}</span>
                                    <span style={{ ...inter, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{v}</span>
                                    <span style={{ fontSize: 11, color: C.mute }}>{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ ...anton, fontSize: 'clamp(40px,12cqw,60px)', lineHeight: 0.95, marginBottom: 6 }}>TRIP INFO</span>
                            <BigLine size="clamp(28px,8.4cqw,42px)" parts={[`${doc.customerName} 様の`, { a: 'ご旅行' }]} />
                        </div>
                        {/* 영수증 */}
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 18px 40px', borderRadius: 24, background: 'linear-gradient(180deg,#E9EEED 0%,#F4F7F6 100%)', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 400, height: 30, borderRadius: 15, background: 'linear-gradient(180deg,#FFFFFF 0%,#D9E0DF 100%)', boxShadow: '0 6px 14px rgba(18,59,58,0.12),inset 0 1px 0 #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ width: '88%', height: 8, borderRadius: 4, background: '#2A3332', boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.6)' }} />
                            </div>
                            <div style={{ position: 'relative', width: '88%', maxWidth: 352, marginTop: -15, overflow: 'hidden', paddingBottom: 10 }}>
                                <div style={{ position: 'relative', animation: reduce ? 'none' : 'qPrint 2.4s cubic-bezier(.45,.05,.3,1) .4s both' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '40px 26px 28px', background: 'linear-gradient(90deg,#F3F5F5 0%,#FFFFFF 18%,#FFFFFF 82%,#F3F5F5 100%)', boxShadow: '0 10px 24px rgba(18,59,58,0.12)' }}>
                                        <span style={dash} />
                                        <span style={{ textAlign: 'center', ...anton, fontSize: 24, letterSpacing: '0.08em' }}>TRIP RECEIPT</span>
                                        <span style={dash} />
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                                            <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mintDeep }}>DEPART</span>
                                                <span style={{ ...inter, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>{start ? `${p2(start.getMonth() + 1)}.${p2(start.getDate())}` : '—'}</span>
                                                <span style={{ fontSize: 11, color: C.sub }}>{start ? `${start.getFullYear()} · ${fmtWeekday(start)}` : '日程調整中'}</span>
                                            </span>
                                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                {dur && <span style={{ height: 24, padding: '0 10px', borderRadius: 999, background: C.ink, fontSize: 11, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{dur}</span>}
                                                <span style={{ width: 44, borderTop: `1.5px dashed ${C.mintBright}` }} />
                                            </span>
                                            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                                                <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mintDeep }}>RETURN</span>
                                                <span style={{ ...inter, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>{end ? `${p2(end.getMonth() + 1)}.${p2(end.getDate())}` : '—'}</span>
                                                <span style={{ fontSize: 11, color: C.sub }}>{end ? `${end.getFullYear()} · ${fmtWeekday(end)}` : ''}</span>
                                            </span>
                                        </div>
                                        <span style={dash} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            {receiptRows.map(([k, v]) => (
                                                <div key={k} style={rowLine}><span style={{ color: C.sub, whiteSpace: 'nowrap' }}>{k}</span><span style={{ fontWeight: 700, textAlign: 'right' }}>{v}</span></div>
                                            ))}
                                        </div>
                                        <span style={dash} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                                            <span style={{ ...inter, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>TOTAL TRIP</span>
                                            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: C.mintDeep }}>{[dur, `${doc.people}名`].filter(Boolean).join(' · ')}</span>
                                        </div>
                                        <span style={dash} />
                                        <span style={{ marginTop: 4, textAlign: 'center', ...anton, fontSize: 26, letterSpacing: '0.08em' }}>THANK YOU</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                            <span aria-hidden="true" style={{ width: '86%', height: 36, background: `repeating-linear-gradient(90deg,${C.ink} 0 2px,transparent 2px 4px,${C.ink} 4px 5px,transparent 5px 8px,${C.ink} 8px 11px,transparent 11px 12px,${C.ink} 12px 13px,transparent 13px 16px)` }} />
                                            <span style={{ ...inter, fontSize: 10, letterSpacing: '0.24em', color: C.sub }}>NO. {doc.docNo}</span>
                                        </div>
                                    </div>
                                    <span aria-hidden="true" style={{ display: 'block', height: 10, background: 'radial-gradient(circle at 7px 0,#FFFFFF 6.5px,transparent 7px) 0 0/14px 10px repeat-x' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {price ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                                    <ChipTitle before="ツアー" chip="料金" />
                                    <span style={{ fontSize: 12, color: C.mute }}>お一人様料金 · {doc.people}名様</span>
                                </div>
                                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 16px', borderRadius: 28, border: `2px solid ${C.mintBright}`, background: C.ink, color: '#FFFFFF', boxShadow: '0 14px 30px rgba(18,59,58,0.22)' }}>
                                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                        <span style={{ height: 22, padding: '0 9px', borderRadius: 999, background: C.grad, ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center' }}>{doc.q.planTag || 'PRIVATE'}</span>
                                        <span style={{ width: 24, height: 24, borderRadius: '50%', boxSizing: 'border-box', border: `2px solid ${C.mintPale}`, background: C.mintPale, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.ink }}>✓</span>
                                    </span>
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>{doc.q.planName || doc.title || 'プライベートツアー'}</span>
                                        {(doc.q.planSub || doc.q.stayLabel) && <span style={{ fontSize: 12, lineHeight: 1.5, color: C.faint }}>{doc.q.planSub || doc.q.stayLabel}</span>}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                        <span style={{ ...inter, fontSize: 'clamp(30px,8.4cqw,40px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em', color: C.mintPale }}>{yen(price.perPerson)}</span>
                                        <span style={{ fontSize: 14, fontWeight: 700 }}>円</span>
                                    </span>
                                </div>
                            </div>

                            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderRadius: 28, background: 'linear-gradient(160deg,#E8FAF5 0%,#F7FAF9 60%,#FFFFFF 100%)', border: `1.5px solid ${C.mintLine}`, overflow: 'hidden' }}>
                                <span aria-hidden="true" style={{ position: 'absolute', right: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,227,204,0.35),rgba(108,227,204,0) 70%)', pointerEvents: 'none' }} />
                                <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 6px' }}>
                                    <span style={{ ...inter, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: C.mintDeep }}>PAYMENT SUMMARY</span>
                                    <span style={{ height: 24, padding: '0 10px', borderRadius: 999, background: '#FFFFFF', fontSize: 11, fontWeight: 700, color: C.mintDeep, display: 'inline-flex', alignItems: 'center' }}>{doc.people}名様基準</span>
                                </span>
                                {[
                                    [IC.card, <>予約金 <span style={{ fontSize: 11, fontWeight: 500, color: C.mute }}>(お一人様 × 人数)</span></>, `¥${yen(price.deposit)}`, true],
                                    [IC.plus, '追加・割引', doc.q.adjustment || '-', !!doc.q.adjustment],
                                    [IC.memo, '備考', doc.q.remark || '-', !!doc.q.remark],
                                ].map(([icon, label, val, strong], i) => (
                                    <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18, background: '#FFFFFF' }}>
                                        <span style={{ width: 36, height: 36, borderRadius: 12, background: C.mintBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={icon as string} /></span>
                                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: C.body }}>{label as React.ReactNode}</span>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: strong ? C.ink : C.mute, textAlign: 'right' }}>{val as string}</span>
                                    </div>
                                ))}
                                <div style={{ position: 'relative', marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '18px 20px', borderRadius: 22, background: C.grad, color: '#FFFFFF', boxShadow: '0 12px 26px rgba(0,168,139,0.3)', overflow: 'hidden' }}>
                                    <span aria-hidden="true" style={{ position: 'absolute', right: -30, bottom: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
                                    <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                                        <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>ご旅行代金 合計</span>
                                        <span style={{ fontSize: 11, color: C.mintBg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{barSub}</span>
                                    </span>
                                    <span style={{ position: 'relative', ...inter, fontSize: 'clamp(26px,7.6cqw,40px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, whiteSpace: 'nowrap' }}>¥{yen(price.total)}</span>
                                </div>
                            </div>
                            <div style={{ marginTop: -12, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 16, background: C.paper }}>
                                <Svg d={IC.info} size={16} stroke={C.mint} sw={2} style={{ flexShrink: 0, marginTop: 2 }} />
                                <span style={{ fontSize: 12, lineHeight: 1.7, color: C.sub }}>
                                    {price.estimated && <>商品の基準料金をもとにした概算です。正式な金額は担当者が確認後にご案内します。<br /></>}
                                    {isQuote ? `お見積り金額はお一人様基準です。本お見積りは${validJa}まで有効です。` : 'ご予約時に確定したご旅行代金です。'}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: '18px 20px', borderRadius: 24, background: '#FFF8E6', textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#8A5A00' }}>ご旅行代金は担当者が確定しだいご案内いたします。</div>
                            <div style={{ fontSize: 12, color: '#B07A12', marginTop: 4 }}>日程や人数のご相談も、お気軽にお問い合わせください。</div>
                        </div>
                    )}
                </section>

                <Gap />

                {/* ─── 02 Payment ─── */}
                {price && (
                    <>
                        <Band dark reduce={reduce} />
                        <section id="q-price" style={secPad}>
                            <SectionHead en="PAYMENT" pill="お支払い案内">
                                <BigLine parts={['お支払いは', { a: '2ステップ' }, 'でかんたん']} />
                            </SectionHead>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 24, background: C.paper }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: C.body }}>ご旅行代金 <span style={{ fontSize: 12, fontWeight: 500, color: C.mute }}>· {doc.people}名</span></span>
                                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ ...inter, fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em' }}>{yen(price.total)}</span><span style={{ fontSize: 15, fontWeight: 700 }}>円</span></span>
                                </div>
                                <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', background: C.ink }}><span style={{ width: depPct, minWidth: 14, background: C.mintBright }} /></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 12, fontWeight: 600 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mintDeep }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.mintBright }} />予約金 ¥{yen(price.deposit)} · ご予約時</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.ink }} />残金 ¥{yen(price.balance)} · 旅行当日</span>
                                </div>
                            </div>

                            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, padding: '22px 20px 20px', borderRadius: 28, background: C.ink, color: '#FFFFFF', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ height: 28, padding: '0 12px', borderRadius: 999, background: C.mintBright, ...inter, fontSize: 12, fontWeight: 700, color: C.ink, display: 'inline-flex', alignItems: 'center' }}>STEP 01</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: C.faint }}>ご予約確定時</span>
                                    </span>
                                    <span style={{ height: 28, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)', background: doc.depositPaid ? C.mintBright : 'transparent', fontSize: 12, fontWeight: 700, color: doc.depositPaid ? C.ink : '#FFFFFF', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{doc.depositPaid ? 'お支払い済み ✓' : 'PayPal'}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 17, fontWeight: 700 }}>予約金</span>
                                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ ...inter, fontSize: 'clamp(40px,12cqw,56px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.05em', color: C.mintSoft }}>{yen(price.deposit)}</span>
                                        <span style={{ fontSize: 20, fontWeight: 700 }}>円</span>
                                        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.faint }}>¥{yen(price.depositPer)} × {doc.people}名</span>
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 20, background: '#FFFFFF', color: C.ink }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#003087', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>P</span>
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>お支払い方法 · PayPal</span>
                                            <span style={{ fontSize: 12, color: C.sub }}>クレジットカード払いにも対応</span>
                                        </span>
                                    </span>
                                    <span style={{ ...inter, fontSize: 'clamp(24px,7cqw,32px)', fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>PayPal 請求書</span>
                                    {doc.payUrl ? (
                                        // 청구서가 발행돼 있으면 메일을 찾지 않아도 여기서 바로 결제
                                        <a href={doc.payUrl} target="_blank" rel="noopener noreferrer" className="tdoc-noprint"
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, padding: '0 12px', borderRadius: 14, background: '#FFC439', color: '#111111', fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
                                            PayPalで予約金を支払う
                                            <Svg d={IC.arrowUp} size={16} stroke="#111111" sw={2.4} />
                                        </a>
                                    ) : (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 50, padding: '0 12px', borderRadius: 14, background: C.gray, fontSize: 13, fontWeight: 700, lineHeight: 1.5, textAlign: 'center' }}>
                                            {doc.depositPaid ? '予約金のお支払いを確認いたしました' : 'ご予約確定後、PayPal 請求書をお送りします'}
                                        </span>
                                    )}
                                    {doc.payUrl && <span style={{ fontSize: 11, lineHeight: 1.6, color: C.sub, textAlign: 'center' }}>PayPal の安全なお支払いページが開きます（クレジットカード払い可）。</span>}
                                </div>
                                <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.6, color: C.line }}>
                                    <span style={{ width: 18, height: 18, marginTop: 1, borderRadius: '50%', background: C.mint, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={IC.check} size={10} stroke="#FFFFFF" sw={3.2} /></span>
                                    お支払いが確認できしだいご予約確定となり、確定のご案内をメールでお送りします。
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '22px 20px 20px', borderRadius: 28, background: '#FFFFFF', border: `2px solid ${C.ink}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ height: 28, padding: '0 12px', borderRadius: 999, background: C.ink, ...inter, fontSize: 12, fontWeight: 700, color: C.mintSoft, display: 'inline-flex', alignItems: 'center' }}>STEP 02</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>旅行当日 · 現地</span>
                                    </span>
                                    <span style={{ height: 28, padding: '0 12px', borderRadius: 999, background: '#FFF4D6', fontSize: 12, fontWeight: 700, color: '#8A5A00', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>日本円 現金</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 17, fontWeight: 700 }}>残金</span>
                                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ ...inter, fontSize: 'clamp(40px,12cqw,56px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.05em', color: C.mintDeep }}>{yen(price.balance)}</span>
                                        <span style={{ fontSize: 20, fontWeight: 700 }}>円</span>
                                        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.mute, textAlign: 'right' }}>¥{yen(price.balancePer)} × {doc.people}名</span>
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                                    {[['いつ', '旅行当日'], ['お支払い先', '担当ガイド'], ['方法', '現金（日本円）']].map(([k, v]) => (
                                        <span key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 12, borderRadius: 16, background: C.paper }}>
                                            <span style={{ fontSize: 11, color: C.sub }}>{k}</span><span style={{ fontSize: 14, fontWeight: 700 }}>{v}</span>
                                        </span>
                                    ))}
                                </div>
                                <span style={{ fontSize: 12, lineHeight: 1.6, color: C.sub }}>残金は旅行当日、現地にて担当ガイドへ日本円の現金でお支払いください。</span>
                            </div>
                            {isQuote && <span style={{ padding: '0 4px', fontSize: 12, lineHeight: 1.6, color: C.mute }}>お見積り金額はお一人様基準です。本お見積りは{validJa}まで有効です。</span>}
                        </section>
                        <Gap />
                    </>
                )}

                {/* ─── 03 Included ─── */}
                <section id="q-inc" style={{ padding: '48px 24px 56px', display: 'flex', flexDirection: 'column', gap: 36, scrollMarginTop: 56 }}>
                    <SectionHead en="ALL INCLUSIVE" pill="ツアーに含まれるもの・含まれないもの">
                        <BigLine parts={['現地での追加費用', { a: '¥0' }]} />
                        <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.7, color: C.sub }}>旅に必要なサービスをすべて含み、快適で安全な旅をご提供します。 <strong style={{ color: C.ink }}>現地での追加費用は一切ありません。</strong></p>
                    </SectionHead>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, padding: '0 2px' }}>
                            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>含まれるもの</span>
                            <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}><span style={{ ...inter, fontSize: 34, fontWeight: 700, lineHeight: 0.9, letterSpacing: '-0.05em', color: C.mint }}>{doc.included.length}</span><span style={{ ...inter, fontSize: 11, fontWeight: 700, color: C.mintDeep }}>ITEMS</span></span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '34px 14px' }}>
                            {doc.included.map((t, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', minWidth: 0 }}>
                                    <span style={{ width: 58, height: 58, borderRadius: '50%', border: '1.5px solid #9DB0AC', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><Svg d={incIcon(t)} size={26} stroke={C.body} sw={1.5} /></span>
                                    <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: C.body }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <span style={{ height: 1, background: '#E3ECE9', margin: '4px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 2px' }}><span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: C.sub }}>含まれないもの</span><span style={{ fontSize: 12, color: C.mute }}>各自でご用意ください</span></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '34px 14px' }}>
                            {doc.excluded.map((t, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', minWidth: 0 }}>
                                    <span style={{ width: 58, height: 58, borderRadius: '50%', border: '1.5px dashed #B9C6C3', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><Svg d={IC.x} size={18} stroke={C.mute} sw={1.6} /></span>
                                    <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: C.sub }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <Gap />

                {/* ─── 04 Itinerary ─── */}
                {doc.days.length > 0 && (
                    <>
                        <Band reduce={reduce} />
                        <section id="q-plan" style={secPad}>
                            <SectionHead en="ITINERARY" pill="旅行ルート">
                                <BigLine parts={[region, { a: dur }]} />
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, fontSize: 12, fontWeight: 600, color: C.sub }}>
                                    移動の強度
                                    <span style={{ display: 'flex', gap: 4 }}>{[1, 2, 3, 4, 5].map(i => <span key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i <= intensity ? C.grad : C.line }} />)}</span>
                                </span>
                            </SectionHead>

                            {rtCur && (
                                <div style={{ position: 'relative', margin: '0 -20px', padding: '8px 0 4px', overflow: 'hidden', background: 'radial-gradient(120% 70% at 50% 100%,#E8FAF5 0%,rgba(232,250,245,0) 70%)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center', padding: '0 20px' }}>
                                        <span style={{ ...anton, fontSize: 'clamp(84px,26cqw,140px)', lineHeight: 0.9, color: C.mint, letterSpacing: '0.01em' }}>DAY {rtCur.day}</span>
                                        <span style={{ fontSize: 'clamp(20px,5.8cqw,26px)', fontWeight: 800, letterSpacing: '-0.04em' }}>{rtCur.name}</span>
                                        {rtCur.sub && <span style={{ fontSize: 14, color: C.sub }}>[{rtCur.sub}]</span>}
                                    </div>
                                    <div style={{ position: 'relative', height: 'calc(min(34cqw,170px) + 40px)', marginTop: 18 }} onMouseEnter={() => { rtPause.current = Date.now() + 20000; }} onMouseLeave={() => { rtPause.current = Date.now(); }}>
                                        <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(min(34cqw,170px) / 2 + 20px)', borderTop: `2px dashed ${C.mintPale}` }} />
                                        {route.map((s, i) => {
                                            let o = i - rti; if (o > rtN / 2) o -= rtN; if (o < -rtN / 2 + 0.5) o += rtN;
                                            const a = Math.abs(o), on = o === 0;
                                            return (
                                                <div key={i} role="button" tabIndex={0} aria-label={s.name}
                                                    onClick={() => { rtPause.current = Date.now(); if (!on) setRtIdx(i); }}
                                                    onKeyDown={e => { if (e.key === 'Enter') { rtPause.current = Date.now(); setRtIdx(i); } }}
                                                    style={{ position: 'absolute', left: '50%', top: 20, width: 'min(34cqw,170px)', aspectRatio: '1/1', borderRadius: '50%', overflow: 'hidden', background: '#2C5552', color: '#FFFFFF', cursor: on ? 'default' : 'pointer', transform: `translateX(calc(-50% + ${o * 118}%)) scale(${on ? 1.12 : 0.86})`, opacity: a > 1.5 ? 0 : 1, zIndex: on ? 3 : 2 - a, boxShadow: on ? `0 0 0 5px #FFFFFF,0 0 0 7px ${C.mintBright},0 16px 30px rgba(18,59,58,0.28)` : '0 8px 18px rgba(18,59,58,0.18)', transition: a > 1.5 ? 'opacity .35s ease-out, transform 0s linear .4s, box-shadow 0s' : 'transform .7s cubic-bezier(.22,.61,.36,1), opacity .7s cubic-bezier(.22,.61,.36,1) .2s, box-shadow .7s' }}>
                                                    <span style={{ position: 'absolute', inset: 0, filter: 'saturate(0.85) contrast(1.05)' }}><Photo src={s.img} placeholder={`${s.name}`} /></span>
                                                    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,22,22,0.05) 30%,rgba(14,22,22,0.72) 100%)', pointerEvents: 'none' }} />
                                                    <span style={{ position: 'absolute', left: 8, right: 8, bottom: '15%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textShadow: '0 2px 8px rgba(0,0,0,0.35)', pointerEvents: 'none', transform: `scale(${(on ? 1 / 1.12 : 1 / 0.86).toFixed(4)})`, transformOrigin: '50% 100%', transition: 'transform .7s cubic-bezier(.22,.61,.36,1)' }}>
                                                        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.04em', whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.short}</span>
                                                        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>DAY {s.day}</span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ marginTop: 6 }}><Dots count={rtN} idx={rti} label="DAY" onGo={i => { rtPause.current = Date.now(); setRtIdx(i); }} /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', margin: '16px 20px 4px', borderRadius: 20, overflow: 'hidden', background: C.ink, color: '#FFFFFF' }}>
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 12px' }}><span style={{ ...anton, fontSize: 11, letterSpacing: '0.06em', color: C.mintSoft }}>ROUTE</span><span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{rti === 0 ? `空港 → ${rtCur.short}` : `${rtPrev?.short} → ${rtCur.short}`}</span></span>
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 12px', borderLeft: '1px solid rgba(255,255,255,0.14)' }}><span style={{ ...anton, fontSize: 11, letterSpacing: '0.06em', color: C.mintSoft }}>所要時間（目安）</span><span style={{ fontSize: 'clamp(15px,4.2cqw,20px)', fontWeight: 800, letterSpacing: '-0.03em', wordBreak: 'keep-all' }}>{rtCur.time ? `約 ${rtCur.time.replace(/^約\s*/, '')}` : '—'}</span></span>
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 12px', borderLeft: '1px solid rgba(255,255,255,0.14)' }}><span style={{ ...anton, fontSize: 11, letterSpacing: '0.06em', color: C.mintSoft }}>移動</span><span style={{ fontSize: 'clamp(15px,4.2cqw,20px)', fontWeight: 800, letterSpacing: '-0.03em', wordBreak: 'keep-all' }}>全日程 専用車</span></span>
                                    </div>
                                </div>
                            )}

                            {mapStops.length >= 2 && (
                                <div style={{ position: 'relative', aspectRatio: '760/500', borderRadius: 28, overflow: 'hidden', background: C.paper, boxShadow: '0 14px 32px rgba(18,59,58,0.12)' }}>
                                    <RouteMap stops={mapStops} />
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                <ChipTitle before="日別" chip="スケジュール" size="clamp(20px,5.8cqw,26px)" />
                                <button type="button" className="td-hov tdoc-noprint" onClick={() => setOpen(allOpen ? [] : doc.days.map(d => d.n))}
                                    style={{ height: 34, padding: '0 14px', border: `1px solid ${C.line}`, borderRadius: 999, background: '#FFFFFF', fontSize: 12, fontWeight: 700, color: C.ink, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    {allOpen ? 'すべて閉じる' : 'すべて開く'}
                                </button>
                            </div>

                            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span aria-hidden="true" style={{ position: 'absolute', left: 27, top: 28, bottom: 28, borderLeft: `2px dashed ${C.mintLine}` }} />
                                {doc.days.map(d => {
                                    const o = open.includes(d.n);
                                    return (
                                        <div key={d.n} data-day={d.n} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '56px minmax(0,1fr)', gap: 12, alignItems: 'start', scrollMarginTop: 60 }}>
                                            <span style={{ position: 'relative', zIndex: 1, width: 56, height: 56, borderRadius: '50%', background: o ? C.grad : C.ink, boxShadow: '0 0 0 5px #FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ ...inter, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: o ? C.mintBg : C.faint }}>DAY</span>
                                                <span style={{ ...inter, fontSize: 20, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: o ? '#FFFFFF' : C.mintPale }}>{d.n}</span>
                                            </span>
                                            <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 24, background: o ? C.mintBg : '#FFFFFF', border: `1.5px solid ${o ? C.mintPale : C.line}`, overflow: 'hidden', transition: 'background .25s,border-color .25s' }}>
                                                <button type="button" aria-expanded={o} onClick={() => setOpen(cur => (cur.includes(d.n) ? cur.filter(x => x !== d.n) : [...cur, d.n]))}
                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: C.ink }}>
                                                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        {d.dateLabel && <span style={{ ...inter, fontSize: 11, fontWeight: 600, color: C.mintDeep }}>{d.dateLabel}</span>}
                                                        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em' }}>{d.title}</span>
                                                        {d.move && <span style={{ fontSize: 12, color: C.sub }}>移動 {d.move}</span>}
                                                    </span>
                                                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: o ? C.ink : C.gray, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Svg d={IC.chev} size={16} stroke={o ? C.mintPale : C.body} sw={2.2} style={{ transform: `rotate(${o ? 180 : 0}deg)`, transition: 'transform .2s' }} />
                                                    </span>
                                                </button>
                                                {o && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            {d.items.map((t, i) => (
                                                                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.6, color: /^[（(]/.test(t) ? C.mute : C.body }}>
                                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.mintBright, flexShrink: 0, marginTop: 8 }} />{t}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 14px', borderRadius: 18, background: '#FFFFFF' }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: C.mintDeep }}><Svg d={IC.home} size={13} sw={2} />宿泊</span>
                                                                <span style={{ fontSize: 13, fontWeight: 700 }}>{d.stay}</span>
                                                                {d.stayDesc && <span style={{ fontSize: 11, color: C.mute }}>{d.stayDesc}</span>}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 14px', borderRadius: 18, background: '#FFFFFF' }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: C.mintDeep }}><Svg d={IC.fork} size={13} sw={2} />食事</span>
                                                                <span style={{ fontSize: 13, fontWeight: 700 }}>{d.meal}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {doc.q.planNotes.trim() && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px', borderRadius: 24, background: C.paper, fontSize: 12, lineHeight: 1.7, color: C.sub }}>
                                    {doc.q.planNotes.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map((n, i) => <span key={i}>* {n}</span>)}
                                </div>
                            )}
                        </section>
                        <Gap />
                    </>
                )}

                {/* ─── 05 Highlights ─── */}
                {doc.highlights.length > 0 && (
                    <>
                        <section id="q-spot" style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 16, scrollMarginTop: 56 }}>
                            <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                                <SectionHead en="TOUR HIGHLIGHTS" pill="今回の旅の見どころ">
                                    <BigLine parts={['必見スポット', { a: `${doc.highlights.length}か所` }]} />
                                </SectionHead>
                                <div className="tdoc-noprint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ ...inter, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', marginRight: 4 }}>{spotIdx + 1} / {doc.highlights.length}</span>
                                    {[[IC.left, -1, '前のスポット', spotIdx <= 0], [IC.right, 1, '次のスポット', spotIdx >= doc.highlights.length - 1]].map(([d, step, label, dis]) => (
                                        <button key={label as string} type="button" className="td-hov" aria-label={label as string} disabled={dis as boolean} onClick={() => spotGo(spotIdx + (step as number))}
                                            style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${C.line}`, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: dis ? 0.35 : 1, transition: 'opacity .2s,background .2s' }}>
                                            <Svg d={d as string} stroke={C.ink} sw={2} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div ref={spotRef} data-noscroll="" tabIndex={0} onScroll={() => { if (!dragging) onSpotScroll(); }} onMouseDown={onSpotDown}
                                onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); spotGo(spotIdx + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); spotGo(spotIdx - 1); } }}
                                style={{ cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: dragging ? 'none' : 'x mandatory', scrollbarWidth: 'none', padding: '0 20px 4px', scrollPadding: '0 20px' }}>
                                {doc.highlights.map((s, i) => (
                                    <article key={i} style={{ flex: '0 0 84%', maxWidth: 420, alignSelf: 'stretch', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', borderRadius: 28, overflow: 'hidden', background: C.ink, color: '#FFFFFF', boxShadow: '0 12px 28px rgba(18,59,58,0.16)' }}>
                                        <div style={{ position: 'relative', aspectRatio: '4/5', background: 'rgba(255,255,255,0.06)' }}>
                                            <Photo src={s.img} placeholder={s.name} style={{ pointerEvents: 'none' }} />
                                            <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(11,38,37,0.45) 0%,rgba(11,38,37,0) 28%,rgba(11,38,37,0) 52%,rgba(18,59,58,1) 100%)' }} />
                                            <div style={{ position: 'absolute', left: 18, top: 16, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
                                                <span style={{ ...inter, fontSize: 40, fontWeight: 700, lineHeight: 0.9, letterSpacing: '-0.05em' }}>{String(i + 1).padStart(2, '0')}</span>
                                                <span style={{ width: 34, height: 2, background: C.mintPale }} />
                                            </div>
                                            <div style={{ position: 'absolute', left: 18, right: 18, bottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, pointerEvents: 'none' }}>
                                                {s.en && <span style={{ height: 24, padding: '0 10px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(16px)', ...inter, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Svg d={IC.pin} size={11} stroke={C.mintPale} sw={2.2} />{s.en}</span>}
                                                <h3 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#FFFFFF' }}>{s.name}</h3>
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 18px 18px' }}>
                                            <p style={{ margin: 0, minHeight: 49, fontSize: 14, lineHeight: 1.75, color: C.line, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.desc}</p>
                                            {s.thumbs.length > 0 && (
                                                <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                                                    {s.thumbs.map((t, k) => <span key={k} style={{ position: 'relative', display: 'block', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}><Photo src={t} style={{ pointerEvents: 'none' }} /></span>)}
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <Dots count={doc.highlights.length} idx={spotIdx} label="スポット" onGo={spotGo} activeW={18} activeBg={C.mint} idleBg={C.line} />
                        </section>
                        <Gap />
                    </>
                )}

                <TripDocCompany doc={doc} images={images} reduce={reduce} specials={specialsOn} legal={legal} />

                {bar && (
                    <div className="tdoc-noprint" style={{ position: 'sticky', bottom: 0, zIndex: 20, padding: '10px 12px calc(10px + env(safe-area-inset-bottom))', background: 'linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.92) 40%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px 8px 22px', borderRadius: 999, background: 'rgba(18,59,58,0.94)', backdropFilter: 'blur(16px)', boxShadow: '0 14px 32px rgba(18,59,58,0.28)' }}>
                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {bar.sub && <span style={{ fontSize: 10, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bar.sub}</span>}
                                {bar.amount && <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: C.line }}>{bar.amountLabel || '予約金'}</span>
                                    <span style={{ ...inter, fontSize: 22, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.mintPale }}>{bar.amount}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>円</span>
                                </span>}
                            </span>
                            <button type="button" onClick={bar.onClick} disabled={bar.disabled}
                                style={{ height: 52, padding: '0 22px', border: 0, borderRadius: 999, background: bar.disabled ? C.gray : C.grad, fontSize: 15, fontWeight: 700, color: bar.disabled ? C.sub : '#FFFFFF', cursor: bar.disabled ? 'default' : 'pointer', whiteSpace: 'nowrap', boxShadow: bar.disabled ? 'none' : '0 6px 16px rgba(6,196,160,0.35)' }}>
                                {bar.label}
                            </button>
                        </div>
                    </div>
                )}

                {printable && (
                    <div className="tdoc-noprint" style={{ position: 'sticky', bottom: 0, zIndex: 20, display: 'flex', justifyContent: 'center', padding: '10px 12px calc(14px + env(safe-area-inset-bottom))', pointerEvents: 'none' }}>
                        <button type="button" onClick={() => window.print()} style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 22px', border: 0, borderRadius: 999, background: 'rgba(18,59,58,0.94)', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 12px 26px rgba(18,59,58,0.28)' }}>
                            <Svg d={IC.print} stroke={C.mintPale} sw={2} />印刷 / PDF保存
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
