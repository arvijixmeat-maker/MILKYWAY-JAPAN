import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { C, COMPANY, IC } from './tripDocContent';
import { Photo, Svg } from './tripDocUi';
import { TRIP_DOC_CSS, useReducedMotion, useTripDocFonts, anton, inter } from './tripDocStyle';
import { type TripDoc, durationLabel, fmtJaDate, fmtWeekday, parseDate, yen } from './tripDocModel';
import type { TripImages } from './tripDocSources';
import { incIconUrl } from './incIcons';
import { TripDocSections } from './TripDocSections';
import { TripDocPerks } from './TripDocPerks';

/**
 * 견적서 / 확정일정표 — 디자인 시안 「Japan version Mobile」 · 「Japan version PC」.
 * 같은 컴포넌트로 견적(mode=quote)과 확정 일정(mode=confirmed)을 모두 그린다.
 * 문서 폭이 1040px 이상이면 PC 배치(왼쪽 목차 + 720px 본문), 아니면 휴대폰 배치.
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

/** film — DAY 제목을 고칠 때: 일정 사진 카드를 그 DAY 로 넘기고 자동 넘김을 멈춘다 */
export interface TripFocus { section: string; day?: number; film?: boolean; at: number }

const WIDE_AT = 1040;
const enHead: React.CSSProperties = { ...anton, fontWeight: 400, fontSize: 26, lineHeight: 1.05, letterSpacing: '0.01em', color: C.ink, whiteSpace: 'nowrap' };
const bigHead: React.CSSProperties = { fontSize: 20, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.03em', color: C.ink };
const STAR = 'polygon(50% 0%,61% 9%,75% 6%,80% 20%,94% 25%,91% 39%,100% 50%,91% 61%,94% 75%,80% 80%,75% 94%,61% 91%,50% 100%,39% 91%,25% 94%,20% 80%,6% 75%,9% 61%,0% 50%,9% 39%,6% 25%,20% 20%,25% 6%,39% 9%)';
const I_BED = 'M3 18v-6a9 9 0 0118 0v6M3 18h18M8 18v-3h8v3';
const I_MEAL = 'M4 3v8a3 3 0 006 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9';

export const TripDocument: React.FC<TripDocumentProps> = ({ doc, images, bar, notice, legal, printable, focusTarget }) => {
    useTripDocFonts();
    const reduce = useReducedMotion();
    const img = useCallback((slot: string) => images.slots[slot] || '', [images.slots]);
    const isQuote = doc.mode === 'quote';
    const dur = durationLabel(doc);
    const region = doc.q.region || doc.days.find(d => d.region)?.region || doc.title || 'モンゴル';
    const docLabel = isQuote ? 'お見積書' : '確定日程表';
    const p2 = (n: number) => String(n).padStart(2, '0');

    // ── PC / 휴대폰 배치 — 화면이 아니라 이 문서가 놓인 폭 기준 (관리자 미리보기에서도 휴대폰 배치) ──
    const rootRef = useRef<HTMLDivElement>(null);
    const [wide, setWide] = useState(false);
    useLayoutEffect(() => {
        const el = rootRef.current; if (!el) return;
        const check = () => setWide(el.clientWidth >= WIDE_AT);
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const pad = wide ? 40 : 16;

    // ── 유효기한 카운트다운 (견적만) ──
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        if (!isQuote) return;
        const t = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(t);
    }, [isQuote]);
    const left = doc.validUntil.getTime() - now.getTime();
    const countdown = left > 0 ? `${Math.floor(left / 86400000)}日 ${p2(Math.floor(left / 3600000) % 24)}:${p2(Math.floor(left / 60000) % 60)}:${p2(Math.floor(left / 1000) % 60)}` : '';
    const validJa = fmtJaDate(doc.validUntil);

    // ── 섹션 목차 ──
    const NAV = useMemo(() => ([
        ['q-info', isQuote ? 'お見積り' : '旅行概要'],
        doc.price ? ['q-price', 'お支払い'] : null,
        ['q-inc', '含まれるもの'],
        doc.days.length ? ['q-plan', '日程'] : null,
        doc.highlights.length ? ['q-spot', '見どころ'] : null,
        ['q-stay', '宿泊'],
        ['q-food', '食事'],
        ['q-safe', '注意事項'],
        ['q-cert', '許可証'],
        ['q-team', '会社・チーム'],
        legal ? ['q-legal', '安全情報'] : null,
    ].filter(Boolean) as Array<[string, string]>), [isQuote, doc.price, doc.days.length, doc.highlights.length, legal]);
    const barRef = useRef<HTMLDivElement>(null);
    const topOff = () => (wide ? 24 : (barRef.current?.offsetHeight || 96) + 8);
    const [sec, setSec] = useState('q-info');
    const navRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                let cur = NAV[0][0];
                const lim = topOff() + 24;
                for (const [id] of NAV) { const el = rootRef.current?.querySelector<HTMLElement>(`#${id}`); if (el && el.getBoundingClientRect().top < lim) cur = id; }
                setSec(s => (s === cur ? s : cur));
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [NAV, wide]);
    useEffect(() => {
        const btn = navRef.current?.querySelector<HTMLElement>(`[data-nav="${sec}"]`);
        const track = navRef.current;
        if (btn && track && !wide) track.scrollTo({ left: btn.offsetLeft - track.clientWidth / 2 + btn.clientWidth / 2, behavior: 'smooth' });
    }, [sec, wide]);
    /** 이 문서를 담은 스크롤 상자(관리자 미리보기) 또는 창을 el 이 상단바 바로 아래 오도록 굴린다 */
    const scrollToEl = (el: HTMLElement) => {
        const off = topOff();
        let box: HTMLElement | null = el.parentElement;
        while (box && !(box.scrollHeight > box.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
        if (box && box !== document.documentElement && box !== document.body) {
            box.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - off), behavior: 'smooth' });
        } else {
            window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' });
        }
    };
    const goSec = (id: string) => { const el = rootRef.current?.querySelector<HTMLElement>(`#${id}`); if (el) scrollToEl(el); };
    const [copied, setCopied] = useState(false);
    const share = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) { await navigator.share({ title: `モンゴリア天の川 ${docLabel}`, url }); return; }
            await navigator.clipboard.writeText(url);
            setCopied(true); window.setTimeout(() => setCopied(false), 1800);
        } catch { /* 공유 취소 */ }
    };

    // ── 일정 루트 필름 (사진 카드가 옆으로 넘어감, 진행 막대가 차면 다음) ──
    const route = doc.route;
    const rfN = route.length;
    const [rfIdx, setRfIdx] = useState(0);
    const rfi = rfN ? ((rfIdx % rfN) + rfN) % rfN : 0;
    const rfGo = (k: number) => setRfIdx(rfN ? (k + rfN) % rfN : 0);
    // 편집기에서 DAY 제목을 고치는 중이면 그 카드에 멈춰 둔다 (좌우를 누르면 다시 자동)
    const [rfHold, setRfHold] = useState(false);
    const rfTap = (k: number) => { setRfHold(false); rfGo(k); };
    const rfCur = route[rfi];

    // ── 일자별 아코디언 ──
    const [open, setOpen] = useState<number[]>(() => (doc.days[0] ? [doc.days[0].n] : []));
    const allOpen = doc.days.length > 0 && open.length === doc.days.length;

    // ── 見どころ 카드 위치 ──
    const [spotPg, setSpotPg] = useState(0);

    // ── 금액 말풍선 ──
    const [tip, setTip] = useState<'dep' | 'bal' | null>(null);

    // ── 편집기 미리보기: 고치는 곳으로 이동 + 강조 ──
    useEffect(() => {
        if (!focusTarget) return;
        const filmK = focusTarget.film && focusTarget.day ? doc.route.findIndex(r => r.day === focusTarget.day) : -1;
        if (filmK >= 0) { setRfIdx(filmK); setRfHold(true); }
        else if (focusTarget.day) setOpen(o => (o.includes(focusTarget.day!) ? o : [...o, focusTarget.day!]));
        const t = window.setTimeout(() => {
            const root = rootRef.current; if (!root) return;
            const el = (filmK >= 0 ? root.querySelector<HTMLElement>('[data-film]') : null)
                || (focusTarget.day ? root.querySelector<HTMLElement>(`[data-day="${focusTarget.day}"]`) : null)
                || root.querySelector<HTMLElement>(`#${focusTarget.section}`)
                || root.querySelector<HTMLElement>('#q-info');
            if (!el) return;
            scrollToEl(el);
            el.animate?.([{ boxShadow: `0 0 0 3px ${C.mintBright}`, borderRadius: '20px' }, { boxShadow: '0 0 0 3px rgba(6,196,160,0)', borderRadius: '20px' }], { duration: 1400, easing: 'ease-out' });
        }, 60);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusTarget]);

    // ── 여행 정보 ──
    const stayNames = Array.from(new Set(doc.days.map(d => d.stay).filter(s => s && s !== '—')));
    const staySummary = doc.q.stayLabel || stayNames.slice(0, 3).join(' · ') || '—';
    const start = parseDate(doc.startDate), end = parseDate(doc.endDate);
    const flight = [doc.q.flightIn && `IN ${doc.q.flightIn}`, doc.q.flightOut && `OUT ${doc.q.flightOut}`].filter(Boolean).join(' · ');
    const tripRows: Array<[string, string]> = [
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
    const intensity = Math.max(1, Math.min(5, doc.q.intensity || 3));
    const secStyle = (top = 28): React.CSSProperties => ({ padding: `${top}px ${pad}px 0`, display: 'flex', flexDirection: 'column', gap: 14, scrollMarginTop: 100 });

    const tipBtn = (k: 'dep' | 'bal', label: string, note: string) => {
        const on = tip === k;
        return (
            <button type="button" onClick={() => setTip(on ? null : k)} aria-expanded={on}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: 0, border: 0, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13, color: C.sub }}>{label} <span style={{ fontSize: 11, color: C.mute }}>{note}</span></span>
                <span className="tdoc-noprint" style={{ width: 16, height: 16, borderRadius: '50%', background: on ? C.mintBright : C.mintBg, ...inter, fontSize: 10, fontWeight: 700, color: on ? '#FFFFFF' : C.mintDeep, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>i</span>
            </button>
        );
    };
    const tipBox = (strong: string, rest: string) => (
        <div style={{ position: 'relative', margin: '0 0 12px', padding: '10px 12px', borderRadius: 12, background: C.ink, fontSize: 11, lineHeight: 1.6, color: '#FFFFFF' }}>
            <span aria-hidden="true" style={{ position: 'absolute', left: 18, top: -5, width: 10, height: 10, background: C.ink, transform: 'rotate(45deg)' }} />
            <strong style={{ color: C.mintPale }}>{strong}</strong>{rest}
        </div>
    );
    const priceRow = (label: React.ReactNode, value: React.ReactNode, extra?: React.ReactNode) => (
        <div style={{ position: 'relative', borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '12px 2px' }}>{label}{value}</div>
            {extra}
        </div>
    );
    const yenBig = (n: number) => <span style={{ ...inter, fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>{yen(n)}<span style={{ fontSize: 12, marginLeft: 1 }}>円</span></span>;

    const navBtnMobile = NAV.map(([id, label]) => {
        const on = sec === id;
        return (
            <button key={id} data-nav={id} type="button" onClick={() => goSec(id)}
                style={{ flexShrink: 0, height: 30, padding: '0 13px', border: 0, borderRadius: 999, background: on ? C.grad : C.gray, fontSize: 12, fontWeight: on ? 700 : 500, color: on ? '#FFFFFF' : C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {label}
            </button>
        );
    });
    const shareBtn = (
        <button type="button" aria-label="共有" onClick={share}
            style={{ position: 'relative', width: 32, height: 32, border: 0, borderRadius: '50%', background: copied ? C.mintBg : '#F2F6F5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <Svg d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" size={16} stroke={C.ink} sw={2} />
            {copied && <span style={{ position: 'absolute', right: 0, top: 38, zIndex: 2, padding: '5px 9px', borderRadius: 8, background: C.ink, color: '#FFFFFF', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>リンクをコピーしました</span>}
        </button>
    );

    const body = (
        <div style={{
            containerType: 'inline-size', width: '100%', boxSizing: 'border-box', background: '#FFFFFF', overflowX: 'clip',
            ...(wide ? { borderRadius: 28, overflow: 'clip', boxShadow: '0 0 0 1px #E1ECE9' } : { maxWidth: 480, margin: '0 auto', minHeight: '100vh', boxShadow: '0 0 0 1px #DDEBE7' }),
        }}>
            {/* ─── 앱 상단바 + 섹션 탭 (휴대폰) ─── */}
            {!wide && (
                <div ref={barRef} className="tdoc-noprint" style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #EEF4F2' }}>
                    <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px' }}>
                        <span style={{ ...anton, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap', color: C.ink }}>MONGOLIA MILKY WAY</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ height: 26, padding: '0 10px', borderRadius: 999, background: C.mintBg, fontSize: 11, fontWeight: 700, color: C.mintDeep, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{docLabel}</span>
                            {shareBtn}
                        </span>
                    </div>
                    <div ref={navRef} data-noscroll="" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 16px 10px' }}>{navBtnMobile}</div>
                </div>
            )}

            {/* ─── 01 Cover ─── */}
            <section style={{ position: 'relative', padding: '22px 20px 20px', textAlign: 'center', overflow: 'hidden', background: 'radial-gradient(120% 70% at 50% 0%,#E8FAF5 0%,#FFFFFF 70%)' }}>
                <div style={{ fontSize: 13, fontWeight: 300, letterSpacing: '0.02em', animation: reduce ? 'none' : 'qUp .8s cubic-bezier(.2,.7,.2,1) .2s both' }}>人生を見上げる時間</div>
                <h1 style={{ margin: '2px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.15, color: C.ink, animation: reduce ? 'none' : 'qUp .9s cubic-bezier(.2,.7,.2,1) .35s both' }}>モンゴリア天の川</h1>
                <div style={{ position: 'relative', width: wide ? 'min(44%,300px)' : '58%', aspectRatio: '1/1', margin: '16px auto 0' }}>
                    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: C.ink }} />
                    <svg aria-hidden="true" viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: reduce ? 'none' : 'qSpin 28s linear infinite', pointerEvents: 'none' }}>
                        <defs><path id="tdRing" d="M100,100 m-91,0 a91,91 0 1,1 182,0 a91,91 0 1,1 -182,0" /></defs>
                        <text style={{ ...anton, fontSize: 10, letterSpacing: 1.6, fill: C.mintSoft }}><textPath href="#tdRing" textLength={568} lengthAdjust="spacingAndGlyphs">{`MONGOLIA MILKY WAY ✳ ${isQuote ? 'CUSTOM ESTIMATE' : 'CONFIRMED ITINERARY'} ✳ PRIVATE TOUR ✳ MONGOLIA MILKY WAY ✳ ${isQuote ? 'CUSTOM ESTIMATE' : 'CONFIRMED ITINERARY'} ✳ PRIVATE TOUR ✳ `}</textPath></text>
                    </svg>
                    <div style={{ position: 'absolute', inset: '9%', borderRadius: '50%', overflow: 'hidden', background: '#0F2E2D' }}>
                        <Photo src={img('quote-hero')} placeholder="" eager style={{ animation: reduce ? 'none' : 'qKen 20s ease-in-out infinite alternate' }} />
                    </div>
                    <span aria-hidden="true" style={{ position: 'absolute', left: '-14%', bottom: '2%', fontFamily: "'Mrs Saint Delafield',cursive", fontSize: 52, lineHeight: 1, color: C.mintBright, transform: 'rotate(-10deg)', whiteSpace: 'nowrap', pointerEvents: 'none', textShadow: '0 2px 0 #FFFFFF' }}>Milky way</span>
                    <span aria-hidden="true" style={{ position: 'absolute', right: '-8%', top: '2%', fontSize: 24, lineHeight: 1, pointerEvents: 'none' }}>✳</span>
                </div>
                <div style={{ marginTop: 14, fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em' }}>
                    {doc.q.coverLead && <span>{doc.q.coverLead} </span>}<span style={{ color: C.mint, whiteSpace: 'nowrap' }}>{docLabel}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: C.sub }}>日本語ガイドと <strong style={{ color: C.ink }}>{doc.people}名様専用</strong>で設計</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                    {[region, dur, `${doc.people}名`].filter(Boolean).map((t, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', flex: 'none', whiteSpace: 'nowrap', height: 28, padding: '0 11px', borderRadius: 999, background: C.ink, fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>{t}</span>
                    ))}
                    {isQuote ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', flex: 'none', whiteSpace: 'nowrap', gap: 5, height: 28, padding: '0 4px 0 10px', borderRadius: 999, background: C.mintBg, fontSize: 11, fontWeight: 700, color: countdown ? C.mintDeep : C.red }}>
                            {countdown ? 'お見積り有効期限まで' : 'お見積り有効期限'}
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 7px', borderRadius: 999, background: C.mintBright, ...inter, fontSize: 10, fontWeight: 700, color: C.ink }}>
                                {countdown || `${doc.validUntil.getMonth() + 1}月${doc.validUntil.getDate()}日 終了`}
                            </span>
                        </span>
                    ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 11px', borderRadius: 999, background: C.grad, fontSize: 11, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap' }}>✓ ご予約確定</span>
                    )}
                </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', margin: `0 ${pad}px`, borderRadius: 14, background: C.paper, padding: '10px 0' }}>
                {([['ISSUED', doc.issued, true], ['MANAGER', doc.q.manager || '担当スタッフ', false], ['NO.', doc.docNo, true]] as const).map(([k, v, num], i) => (
                    <div key={k} style={{ padding: '0 12px', borderRight: i < 2 ? '1px solid #E1ECE9' : 'none', minWidth: 0 }}>
                        <div style={{ ...anton, fontWeight: 400, fontSize: 10, letterSpacing: '0.06em', color: C.mint }}>{k}</div>
                        <div style={{ ...(num ? inter : {}), fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '10px 16px 0', ...inter, fontSize: 11, color: C.mute }}>
                <span>@{COMPANY.instagram}</span><span>{COMPANY.site}</span>
            </div>

            {notice}

            {/* ─── 02 Trip info ─── */}
            <section id="q-info" style={secStyle()}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={enHead}>TRIP INFO</span>
                        <span style={bigHead}>{doc.customerName} 様の <span style={{ color: C.mint, whiteSpace: 'nowrap' }}>ご旅行</span></span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 20, background: C.paper, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, padding: '16px 18px', background: C.ink, color: '#FFFFFF' }}>
                            <span style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ ...anton, fontWeight: 400, fontSize: 10, letterSpacing: '0.08em', color: C.mintPale }}>DEPART</span>
                                <span style={{ ...inter, fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{start ? `${p2(start.getMonth() + 1)}.${p2(start.getDate())}` : '—'}</span>
                                <span style={{ fontSize: 10, color: C.faint, whiteSpace: 'nowrap' }}>{start ? `${start.getFullYear()} · ${fmtWeekday(start)}` : '日程調整中'}</span>
                            </span>
                            {dur ? <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 999, background: C.mintBright, fontSize: 11, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>{dur}</span> : <span />}
                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ ...anton, fontWeight: 400, fontSize: 10, letterSpacing: '0.08em', color: C.mintPale }}>RETURN</span>
                                <span style={{ ...inter, fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{end ? `${p2(end.getMonth() + 1)}.${p2(end.getDate())}` : '—'}</span>
                                <span style={{ fontSize: 10, color: C.faint, whiteSpace: 'nowrap' }}>{end ? `${end.getFullYear()} · ${fmtWeekday(end)}` : ''}</span>
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 18px 4px' }}>
                            {tripRows.map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '10px 0', borderBottom: '1px solid #E1ECE9', fontSize: 12 }}>
                                    <span style={{ color: C.sub, flex: 'none', whiteSpace: 'nowrap' }}>{k}</span>
                                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700, textAlign: 'right', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px 16px' }}>
                            <span style={{ ...anton, fontWeight: 400, fontSize: 13, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>TOTAL TRIP</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>{[dur, `${doc.people}名`].filter(Boolean).join(' · ')}</span>
                        </div>
                    </div>
                </div>
                {!price && (
                    <div style={{ padding: '18px 20px', borderRadius: 20, background: '#FFF8E6', textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#8A5A00' }}>ご旅行代金は担当者が確定しだいご案内いたします。</div>
                        <div style={{ fontSize: 12, color: '#B07A12', marginTop: 4 }}>日程や人数のご相談も、お気軽にお問い合わせください。</div>
                    </div>
                )}
            </section>

            {/* ─── 02 Price & Payment ─── */}
            {price && (
                <section id="q-price" style={secStyle()}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={enHead}>PRICE</span>
                        <span style={{ fontSize: 11, color: C.mute, whiteSpace: 'nowrap' }}>お一人様料金 · {doc.people}名様</span>
                    </div>
                    <div style={{ position: 'relative', marginTop: 14, padding: '18px 16px 16px', borderRadius: 20, background: '#FFFFFF', boxShadow: '0 0 0 1px #E1ECE9,0 10px 24px rgba(18,59,58,0.08)' }}>
                        <span aria-hidden="true" style={{ position: 'absolute', right: -6, top: -18, width: 66, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: C.ink, clipPath: STAR, color: C.mintPale, lineHeight: 1.05, transform: 'rotate(8deg)' }}>
                            <span style={{ ...inter, fontSize: 15, fontWeight: 800 }}>{doc.people}名</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF' }}>専用</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, paddingBottom: 12, paddingRight: 56, borderBottom: `2px solid ${C.ink}` }}>
                            <span style={{ fontSize: 17, fontWeight: 800 }}>{doc.q.planName || doc.title || 'プライベートツアー'}</span>
                            {dur && <span style={{ fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}>({dur})</span>}
                        </div>
                        {priceRow(<span style={{ fontSize: 13, color: C.sub, whiteSpace: 'nowrap' }}>ご旅行代金 <span style={{ fontSize: 11, color: C.mute }}>({doc.people}名)</span></span>, yenBig(price.total))}
                        {priceRow(tipBtn('dep', '予約金', '(PayPal)'),
                            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                {doc.depositPaid && <span style={{ alignSelf: 'center', height: 20, padding: '0 7px', borderRadius: 999, background: C.mintBg, fontSize: 10, fontWeight: 700, color: C.mintDeep, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>お支払い済み ✓</span>}
                                {yenBig(price.deposit)}
                            </span>,
                            tip === 'dep' && tipBox('事前予約金はPayPalでお支払い。', doc.payUrl ? '下のボタンから PayPal の請求書ページを開けます。' : 'ご予約確定後、メールで PayPal 請求書をお送りします。'))}
                        {priceRow(tipBtn('bal', '残金', '(現地・日本円)'), yenBig(price.balance),
                            tip === 'bal' && tipBox('残金は現地で日本円の現金払い。', '旅行当日、現地にて担当ガイドへお支払いください。'))}
                        {doc.q.adjustment && priceRow(<span style={{ fontSize: 13, color: C.sub }}>追加・割引</span>, <span style={{ fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{doc.q.adjustment}</span>)}
                        {doc.q.remark && priceRow(<span style={{ fontSize: 13, color: C.sub, whiteSpace: 'nowrap' }}>備考</span>, <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{doc.q.remark}</span>)}
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 14, padding: '14px 16px', borderRadius: 14, background: C.grad, color: '#FFFFFF' }}>
                            <span style={{ position: 'absolute', left: -6, top: -12, display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px', borderRadius: 999, background: C.red, ...inter, fontSize: 10, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(229,72,77,0.3)' }}>{doc.q.planTag || 'PRIVATE'}</span>
                            <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>お一人様</span>
                            <span style={{ ...inter, fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{yen(price.perPerson)}<span style={{ fontSize: 15, marginLeft: 2 }}>円</span></span>
                        </div>
                        {(doc.q.planSub || doc.q.stayLabel) && <span style={{ display: 'block', marginTop: 8, fontSize: 11, color: C.mute, textAlign: 'right' }}>{doc.q.planSub || doc.q.stayLabel}</span>}
                        {doc.payUrl && !doc.depositPaid && (
                            // 청구서가 발행돼 있으면 메일을 찾지 않아도 여기서 바로 결제
                            <a href={doc.payUrl} target="_blank" rel="noopener noreferrer" className="tdoc-noprint"
                                style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, padding: '0 12px', borderRadius: 14, background: '#FFC439', color: '#111111', fontSize: 15, fontWeight: 800, textAlign: 'center' }}>
                                PayPalで予約金を支払う<Svg d={IC.arrowUp} size={16} stroke="#111111" sw={2.4} />
                            </a>
                        )}
                    </div>
                    <span style={{ fontSize: 11, lineHeight: 1.6, color: C.mute }}>
                        {price.estimated && <>商品の基準料金をもとにした概算です。正式な金額は担当者が確認後にご案内します。<br /></>}
                        {isQuote ? `お見積り金額はお一人様基準です。本お見積りは${validJa}まで有効です。` : 'ご予約時に確定したご旅行代金です。残金は旅行当日、現地にて担当ガイドへ日本円の現金でお支払いください。'}
                    </span>
                </section>
            )}

            {/* ─── 이용자 특전 — 금액 바로 아래 (상품 디자인 「04 이용자 특전」과 같은 값) ─── */}
            <TripDocPerks pad={pad} wide={wide} />

            {/* ─── 03 Included ─── */}
            <section id="q-inc" style={secStyle()}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={enHead}>ALL INCLUSIVE</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 16, background: C.ink }}>
                        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <span style={{ fontSize: 11, color: C.faint, whiteSpace: 'nowrap' }}>現地での追加費用</span>
                            <span style={{ fontSize: 'min(12px,3.1cqw)', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap' }}>現地での追加費用は一切ありません。</span>
                        </span>
                        <span style={{ flex: 'none', ...inter, fontSize: 30, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: C.mintPale }}>¥0</span>
                    </div>
                    <span style={{ fontSize: 12, lineHeight: 1.7, color: C.sub }}>旅に必要なサービスをすべて含み、快適で安全な旅をご提供します。</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 20, background: C.paper }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>含まれるもの</span>
                        <span style={{ ...inter, fontSize: 20, fontWeight: 700, color: C.mint }}>{doc.included.length}<span style={{ fontSize: 10, marginLeft: 2 }}>ITEMS</span></span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${wide ? 4 : 3},minmax(0,1fr))`, gap: '14px 8px' }}>
                        {doc.included.map((t, i) => (
                            <span key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                                <span style={{ width: 48, height: 48, borderRadius: 14, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* 라인 아이콘 SVG 에 민트색을 입힌다 (mask) */}
                                    <span aria-hidden="true" style={{ width: 28, height: 28, background: C.mintDeep, WebkitMaskImage: `url("${incIconUrl(t)}")`, maskImage: `url("${incIconUrl(t)}")`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
                                </span>
                                <span style={{ width: '100%', fontSize: 11, fontWeight: 600, lineHeight: 1.4, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{t}</span>
                            </span>
                        ))}
                    </div>
                </div>
                {doc.excluded.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 2px' }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                            <span style={{ flex: 'none', fontSize: 15, fontWeight: 700, color: C.sub, whiteSpace: 'nowrap' }}>含まれないもの</span>
                            <span style={{ minWidth: 0, fontSize: 11, color: C.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>各自でご用意ください</span>
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {doc.excluded.map((e, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 999, border: '1px dashed #C9D8D4', fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}><span style={{ color: C.faint }}>×</span>{e}</span>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* ─── 04 Itinerary ─── */}
            {doc.days.length > 0 && (
                <section id="q-plan" style={secStyle()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={enHead}>ITINERARY</span>
                            <span style={{ ...bigHead, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{region} <span style={{ color: C.mint }}>{dur}</span></span>
                        </div>
                        <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingBottom: 4 }}>
                            <span style={{ fontSize: 10, color: C.mute, whiteSpace: 'nowrap' }}>移動の強度</span>
                            <span style={{ display: 'flex', gap: 3 }}>{[1, 2, 3, 4, 5].map(i => <span key={i} style={{ width: 12, height: 5, borderRadius: 3, background: i <= intensity ? C.grad : C.line }} />)}</span>
                        </span>
                    </div>

                    {rfCur && (
                        // 루트 무비 — 일자별 사진이 겹쳐 바뀌며 천천히 확대, 위쪽 진행 막대가 차면 다음 DAY (누르면 바로 다음)
                        <div data-film="" className="tdoc-noprint" role="button" tabIndex={0} aria-label="次の日程へ"
                            onClick={() => rfTap(rfi + 1)} onKeyDown={e => { if (e.key === 'Enter') rfTap(rfi + 1); }}
                            style={{ position: 'relative', aspectRatio: wide ? '16/10' : '4/5', borderRadius: 20, overflow: 'hidden', background: C.ink, cursor: 'pointer', userSelect: 'none' }}>
                            {route.map((s, k) => {
                                const on = k === rfi;
                                const prev = k === 0 ? '空港' : route[k - 1].short;
                                const time = s.time ? `約 ${s.time.replace(/^約\s*/, '')}` : '専用車で移動';
                                return (
                                    <div key={k} aria-hidden={!on} style={{ position: 'absolute', inset: 0, opacity: on ? 1 : 0, transition: 'opacity .9s cubic-bezier(.22,.61,.36,1)', pointerEvents: 'none' }}>
                                        <div style={{ position: 'absolute', inset: 0, transform: on && !reduce ? 'scale(1.12)' : 'scale(1)', transition: on ? 'transform 4.4s linear' : 'transform 0s linear .9s' }}>
                                            <Photo src={s.img} placeholder={s.name} eager={k <= rfi + 1} />
                                        </div>
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(18,59,58,0.55) 0%,rgba(18,59,58,0) 28%,rgba(18,59,58,0) 48%,rgba(18,59,58,0.88) 100%)' }} />
                                        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 20, display: 'flex', flexDirection: 'column', gap: 6, transform: on ? 'translateY(0)' : 'translateY(14px)', opacity: on ? 1 : 0, transition: 'transform .9s cubic-bezier(.22,.61,.36,1) .25s,opacity .9s ease-out .25s' }}>
                                            <span style={{ ...anton, fontSize: 44, lineHeight: 1, letterSpacing: '0.01em', color: '#FFFFFF' }}>DAY {s.day}</span>
                                            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{ height: 24, padding: '0 10px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontSize: 11, fontWeight: 600, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{prev} → {s.short}</span>
                                                <span style={{ height: 24, padding: '0 10px', borderRadius: 999, background: C.mintBright, fontSize: 11, fontWeight: 700, color: C.ink, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{time}</span>
                                            </span>
                                            {s.sub && <span style={{ fontSize: 12, color: '#DDEBE7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                            {rfN > 1 && (
                                <div style={{ position: 'absolute', left: 12, right: 12, top: 12, display: 'flex', gap: 4, pointerEvents: 'none' }}>
                                    {route.map((_, k) => (
                                        <span key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
                                            {k === rfi
                                                // 편집기에서 DAY 제목을 고치는 중(rfHold)이면 멈춘 채로 둔다
                                                ? <span key={`${rfi}-${rfHold}`} onAnimationEnd={() => rfGo(rfi + 1)} style={{ display: 'block', height: '100%', background: '#FFFFFF', width: reduce || rfHold ? '100%' : 0, animation: reduce || rfHold ? 'none' : 'qStory 3.8s linear forwards' }} />
                                                : <span style={{ display: 'block', height: '100%', background: '#FFFFFF', width: k < rfi ? '100%' : 0 }} />}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>日別スケジュール</span>
                        <button type="button" className="tdoc-noprint" onClick={() => setOpen(allOpen ? [] : doc.days.map(d => d.n))}
                            style={{ flex: 'none', whiteSpace: 'nowrap', height: 28, padding: '0 12px', border: 0, borderRadius: 999, background: '#F2F6F5', fontSize: 11, fontWeight: 700, color: C.sub, cursor: 'pointer' }}>
                            {allOpen ? 'すべて閉じる' : 'すべて開く'}
                        </button>
                    </div>
                    <div style={{ borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg,#F1FCF8 0%,#FFFFFF 60%)', boxShadow: '0 0 0 1px #DDEBE7' }}>
                        <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(90deg,#BFF1E7 0%,#E8FAF5 100%)', ...anton, fontSize: 12, letterSpacing: '0.14em', color: C.mintDeep, whiteSpace: 'nowrap' }}>MONGOLIA MILKY WAY</div>
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '2px 16px' }}>
                            {doc.days.map((d, di) => {
                                const o = open.includes(d.n);
                                const amen = d.stayDesc && d.stayDesc !== '-' ? d.stayDesc.split(/\s*[·・,、]\s*/).filter(Boolean) : [];
                                return (
                                    <div key={d.n} data-day={d.n} style={{ borderBottom: di < doc.days.length - 1 ? '1px solid #E1ECE9' : 'none', scrollMarginTop: 60 }}>
                                        <button type="button" aria-expanded={o} onClick={() => setOpen(cur => (cur.includes(d.n) ? cur.filter(x => x !== d.n) : [...cur, d.n]))}
                                            style={{ width: '100%', display: 'flex', gap: 14, alignItems: 'center', padding: '16px 0', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: C.ink }}>
                                            <span style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', background: o ? C.grad : C.ink, ...inter, fontSize: 13, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p2(d.n)}</span>
                                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <span style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{d.dateLabel || `${d.n}日目`} の旅は</span>
                                                <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                                                {d.move && <span style={{ fontSize: 11, color: C.mute, whiteSpace: 'nowrap' }}>(移動 {d.move})</span>}
                                            </span>
                                            <Svg d={IC.chev} size={16} stroke={C.mute} sw={2} style={{ flex: 'none', transform: `rotate(${o ? 180 : 0}deg)`, transition: 'transform .2s' }} />
                                        </button>
                                        {o && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 18px 4px' }}>
                                                {d.note && (
                                                    // 그날의 포인트 (편집기 「DAY 포인트」)
                                                    <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: '#E8FAF5', fontSize: 12, fontWeight: 700, lineHeight: 1.6, color: C.mintDeep, overflowWrap: 'anywhere' }}>
                                                        <span style={{ flex: 'none', ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', paddingTop: 2 }}>POINT</span>
                                                        <span style={{ flex: 1, minWidth: 0 }}>{d.note}</span>
                                                    </span>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {d.items.map((t, i) => <span key={i} style={{ fontSize: 12, lineHeight: 1.6, color: /^[（(]/.test(t) ? C.mute : C.body, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{t}</span>)}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {([['宿泊', I_BED, d.stay], ['食事', I_MEAL, d.meal]] as const).map(([k, icon, v], j) => (
                                                        <React.Fragment key={k}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '9px 12px', borderRadius: 12, background: C.paper }}>
                                                                <span style={{ flex: 'none', width: 26, height: 26, borderRadius: 8, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={icon} size={14} sw={2} /></span>
                                                                <span style={{ flex: 'none', fontSize: 10, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>{k}</span>
                                                                <span style={{ flex: 1, minWidth: 0, fontSize: 'min(12px,3.1cqw)', fontWeight: 700, overflowWrap: 'anywhere' }}>{v || '—'}</span>
                                                            </span>
                                                            {j === 0 && amen.length > 0 && (
                                                                <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingLeft: 2 }}>
                                                                    {amen.map(a => <span key={a} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 999, background: C.mintBg, fontSize: 10, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>{a}</span>)}
                                                                </span>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {doc.q.planNotes.trim() && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {doc.q.planNotes.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map((n, i) => <span key={i} style={{ fontSize: 11, lineHeight: 1.6, color: C.mute }}>* {n}</span>)}
                        </div>
                    )}
                </section>
            )}

            {/* ─── 05 Highlights — 편집기 「대표 여행지」에서 고른 관광지 ─── */}
            {doc.highlights.length > 0 && (
                <section id="q-spot" style={{ ...secStyle(32), gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={enHead}>HIGHLIGHTS</span>
                        <span style={bigHead}>今回の旅の <span style={{ color: C.mint, whiteSpace: 'nowrap' }}>見どころ {doc.highlights.length}か所</span></span>
                    </div>
                    <div data-noscroll="" onScroll={e => { const el = e.currentTarget; const c = el.children[0] as HTMLElement | undefined; const i = Math.min(doc.highlights.length - 1, Math.round(el.scrollLeft / ((c?.getBoundingClientRect().width || el.clientWidth) + 10))); if (i !== spotPg) setSpotPg(i); }}
                        style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', margin: `0 -${pad}px`, padding: `0 ${pad}px 4px`, scrollPadding: `0 ${pad}px` }}>
                        {doc.highlights.map((s, i) => (
                            <article key={i} style={{ flex: '0 0 72%', maxWidth: 360, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', background: C.paper }}>
                                <div style={{ position: 'relative', aspectRatio: '4/5', background: '#E1ECE9' }}>
                                    <Photo src={s.img} placeholder={s.name} dark={false} />
                                    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(18,59,58,0) 55%,rgba(18,59,58,0.7) 100%)', pointerEvents: 'none' }} />
                                    <span style={{ position: 'absolute', left: 12, top: 12, height: 24, padding: '0 9px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', ...inter, fontSize: 11, fontWeight: 700, color: C.mintDeep, display: 'inline-flex', alignItems: 'center', pointerEvents: 'none' }}>{p2(i + 1)}</span>
                                    <span style={{ position: 'absolute', left: 14, right: 14, bottom: 12, display: 'flex', flexDirection: 'column', gap: 2, color: '#FFFFFF', pointerEvents: 'none' }}>
                                        {s.en && <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.mintPale, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.en.toUpperCase()}</span>}
                                        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.3 }}>{s.name}</span>
                                    </span>
                                </div>
                                {s.desc && <span style={{ padding: '12px 14px 14px', fontSize: 12, lineHeight: 1.7, color: C.body, wordBreak: 'normal', overflowWrap: 'anywhere' }}>{s.desc}</span>}
                            </article>
                        ))}
                    </div>
                    {doc.highlights.length > 1 && (
                        <div className="tdoc-noprint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -4 }}>
                            {doc.highlights.map((_, k) => <span key={k} style={{ width: k === spotPg ? 18 : 6, height: 6, borderRadius: 3, background: k === spotPg ? C.mintBright : '#D6E2DF', transition: 'all .25s' }} />)}
                            <span style={{ marginLeft: 4, fontSize: 11, color: C.mute }}>横にスワイプしてください →</span>
                        </div>
                    )}
                </section>
            )}

            <TripDocSections doc={doc} images={images} pad={pad} wide={wide} legal={legal} />

            {bar && (
                // 하단 고정 바 — 왼쪽 금액, 오른쪽 확정 버튼
                <div className="tdoc-noprint" data-mw-actionbar="" style={{ position: 'sticky', bottom: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))', background: '#FFFFFF', borderTop: '1px solid #EEF4F2', boxShadow: '0 -8px 24px rgba(18,59,58,0.08)' }}>
                    {(bar.amount || bar.sub) && (
                        <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', maxWidth: '42%' }}>
                            <span style={{ fontSize: 10, color: C.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bar.amount ? (bar.amountLabel || '予約金') + (bar.sub ? ` · ${bar.sub}` : '') : bar.sub}</span>
                            {bar.amount && <span style={{ ...inter, fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>¥{bar.amount}</span>}
                        </span>
                    )}
                    <button type="button" onClick={bar.onClick} disabled={bar.disabled}
                        style={{ flex: 1, minWidth: 0, height: 48, padding: '0 14px', border: 0, borderRadius: 14, background: bar.disabled ? '#F0F5F4' : C.mintBright, fontSize: 15, fontWeight: 800, color: bar.disabled ? C.sub : C.ink, cursor: bar.disabled ? 'default' : 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bar.label}
                    </button>
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
    );

    return (
        <div ref={rootRef} className="tdoc" style={{ background: wide ? '#F3F7F6' : C.paper, minHeight: '100vh' }}>
            <style>{TRIP_DOC_CSS}</style>
            {wide ? (
                <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 24px 64px', display: 'grid', gridTemplateColumns: '260px minmax(0,720px)', justifyContent: 'center', gap: 40, alignItems: 'start' }}>
                    {/* ─── PC 왼쪽 목차 ─── */}
                    <aside className="tdoc-noprint" style={{ position: 'sticky', top: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ ...anton, fontSize: 22, letterSpacing: '0.02em', lineHeight: 1.1 }}>MONGOLIA<br />MILKY WAY</span>
                            <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', borderRadius: 999, background: C.mintBg, fontSize: 12, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>{docLabel}</span>
                        </div>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 10, borderRadius: 20, background: '#FFFFFF', border: '1px solid #E1ECE9' }}>
                            {NAV.map(([id, label]) => {
                                const on = sec === id;
                                return (
                                    <button key={id} type="button" className={on ? undefined : 'td-hov'} onClick={() => goSec(id)}
                                        style={{ display: 'flex', alignItems: 'center', height: 42, padding: '0 14px', border: 0, borderRadius: 12, background: on ? C.grad : 'transparent', fontSize: 14, fontWeight: on ? 700 : 500, color: on ? '#FFFFFF' : C.sub, cursor: 'pointer', textAlign: 'left' }}>
                                        {label}
                                    </button>
                                );
                            })}
                        </nav>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderRadius: 20, background: '#FFFFFF', border: '1px solid #E1ECE9' }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>この{docLabel}を共有</span>
                            {shareBtn}
                        </div>
                    </aside>
                    {body}
                </div>
            ) : body}
        </div>
    );
};
