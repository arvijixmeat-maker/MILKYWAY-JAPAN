import React, { useEffect, useRef, useState } from 'react';
import { C, COMPANY, IC, TEAM, TEAM_ASSIGN, ACT_RULES, RIDE_TIPS, CERTS, CERT_TAGS } from './tripDocContent';
import { Photo, Svg } from './tripDocUi';
import { anton, inter, useReducedMotion } from './tripDocStyle';
import type { TripDoc } from './tripDocModel';
import type { TripImages } from './tripDocSources';
import carAlphard from '../../assets/vehicles/alphard.webp';
import carVellfire from '../../assets/vehicles/vellfire.webp';
import carStarex from '../../assets/vehicles/starex.webp';
import carLandCruiser from '../../assets/vehicles/land-cruiser.webp';
import carPurgon from '../../assets/vehicles/purgon.webp';

/**
 * 견적서·확정일정표 공통 섹션 (디자인 시안 「Japan version Mobile / PC」)
 * 숙소 · 차량 · 식사 · 안전 · 인허가 · 회사·팀 · 문의.
 * 사진은 호텔·관광지 마스터와 회사소개 사진에서 고른다 (tripDocSources.resolveTripImages).
 */
interface Props {
    doc: TripDoc;
    images: TripImages;
    /** 좌우 여백 — 휴대폰 16 / PC 40 */
    pad: number;
    /** PC 배치 — 숙소 무비를 16:10 으로 */
    wide?: boolean;
    legal?: React.ReactNode;
}

// 인허가 사진 — src/assets/certs/cert-1*.png … 를 넣으면 순서대로 표시 (없으면 번호 카드)
const CERT_FILES = import.meta.glob('../../assets/certs/cert-*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }) as Record<string, string>;
const certImg = (i: number) => Object.entries(CERT_FILES).find(([p]) => new RegExp(`/cert-${i + 1}[^/]*$`).test(p))?.[1] || '';

/** 기본 차량 사진 — 관광지 마스터 「차량」에 등록한 차가 있으면 그쪽이 우선 */
const DEFAULT_VEHICLES = [
    { name: 'Alphard', img: carAlphard },
    { name: 'Vellfire', img: carVellfire },
    { name: 'Starex', img: carStarex },
    { name: 'Land Cruiser', img: carLandCruiser },
    { name: 'Purgon', img: carPurgon },
];
const I_CAR = 'M3 13l2-6h14l2 6v5H3zM3 13h18M7 18v2M17 18v2M7 15.5h.01M17 15.5h.01';

const secStyle = (pad: number, top = 28): React.CSSProperties => ({ padding: `${top}px ${pad}px 0`, display: 'flex', flexDirection: 'column', gap: 14, scrollMarginTop: 100 });
const enHead: React.CSSProperties = { ...anton, fontWeight: 400, fontSize: 26, lineHeight: 1.05, letterSpacing: '0.01em', color: C.ink, whiteSpace: 'nowrap' };
const bigHead: React.CSSProperties = { fontSize: 20, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.03em', color: C.ink };
const lead: React.CSSProperties = { fontSize: 12, lineHeight: 1.7, color: C.sub };
const kicker: React.CSSProperties = { ...inter, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.mintDeep, whiteSpace: 'nowrap' };
const swipeHint = <span style={{ marginLeft: 4, fontSize: 11, color: C.mute }}>横にスワイプしてください →</span>;

/** 가로 스와이프 위치 점 */
const PageDots: React.FC<{ n: number; i: number }> = ({ n, i }) => (
    <>{Array.from({ length: n }, (_, k) => <span key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 3, background: k === i ? C.mintBright : '#D6E2DF', transition: 'all .25s' }} />)}</>
);

/** 스크롤 위치 → 현재 페이지 번호 */
const pageOf = (el: HTMLElement, step?: number) => Math.round(el.scrollLeft / (step || el.clientWidth || 1));

const GER_PREMIUM: Array<[string, string]> = [['温水シャワー', '(ゲル内)'], ['洋式トイレ', '(ゲル内)'], ['電気使用可能', '']];
const GER_STANDARD: Array<[string, string]> = [['温水シャワー', '(共同・外部)'], ['洋式トイレ', '(共同・外部)'], ['電気使用可能', '']];

const GerSlide: React.FC<{ imgs: string[]; tag: string; good: boolean; items: Array<[string, string]> }> = ({ imgs, tag, good, items }) => (
    <div style={{ flex: '0 0 100%', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
            {[0, 1, 2, 3].map(k => (
                <div key={k} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 14, overflow: 'hidden', background: '#EEF3F1' }}>
                    <Photo src={imgs[k] || imgs[k % Math.max(1, imgs.length)]} placeholder={`${tag}の写真`} dark={false} />
                    <span style={{ position: 'absolute', left: 8, top: 8, height: 22, padding: '0 8px', borderRadius: 6, background: 'rgba(18,30,30,0.72)', fontSize: 10, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', pointerEvents: 'none' }}>{tag}</span>
                </div>
            ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            {items.map(([t, sub]) => (
                <span key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 4px', borderRadius: 14, background: good ? C.mintBg : '#F3F6F5', textAlign: 'center' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: good ? C.mint : '#B6C2BF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{good ? '✓' : '✕'}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: good ? C.ink : C.mute, whiteSpace: 'nowrap' }}>{t}</span>
                        {sub && <span style={{ fontSize: 10, fontWeight: 600, color: good ? C.mintDeep : C.mute, whiteSpace: 'nowrap' }}>{sub}</span>}
                    </span>
                </span>
            ))}
        </div>
    </div>
);

/** 숙소 무비 — 일반 게르(흑백) 위로 고급 게르가 밀려 들어오고, 설비 체크가 하나씩 → 마지막에 「追加料金なしで 高級ゲルに宿泊」 */
const GerMovie: React.FC<{ before: string; after: string; wide?: boolean; reduce: boolean }> = ({ before, after, wide, reduce }) => {
    const [ph, setPh] = useState(0);
    useEffect(() => {
        if (reduce) return;
        const t = window.setInterval(() => setPh(p => (p + 1) % 10), 1300);
        return () => window.clearInterval(t);
    }, [reduce]);
    const p = reduce ? 7 : ph, prem = p >= 3;
    const line = (on: boolean, good: boolean, text: string) => (
        <span key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: on ? 1 : 0, transform: on ? 'translateX(0)' : 'translateX(-12px)', transition: 'opacity .5s ease-out,transform .5s cubic-bezier(.22,.61,.36,1)' }}>
            <span style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', background: good ? C.mint : C.mute, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={good ? IC.check : IC.x} size={10} stroke="#FFFFFF" sw={3.4} /></span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap' }}>{text}</span>
        </span>
    );
    return (
        <div className="tdoc-noprint" style={{ position: 'relative', aspectRatio: wide ? '16/10' : '4/5', borderRadius: 20, overflow: 'hidden', background: C.ink, userSelect: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, filter: 'grayscale(0.85) brightness(0.85)', transform: p < 3 ? 'scale(1.08)' : 'scale(1)', transition: 'transform 4s linear' }}><Photo src={before} placeholder="一般ゲル" eager /></div>
            <div style={{ position: 'absolute', inset: 0, clipPath: prem ? 'inset(0 0 0 0)' : 'inset(0 0 0 100%)', transition: 'clip-path 1.1s cubic-bezier(.7,0,.2,1)' }}>
                <div style={{ position: 'absolute', inset: 0, transform: prem ? 'scale(1.1)' : 'scale(1)', transition: 'transform 5s linear' }}><Photo src={after} placeholder="高級ゲル" eager /></div>
            </div>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(18,59,58,0.5) 0%,rgba(18,59,58,0) 30%,rgba(18,59,58,0.15) 50%,rgba(18,59,58,0.9) 100%)' }} />
            <span style={{ position: 'absolute', left: 14, top: 14, height: 28, padding: '0 12px', borderRadius: 999, background: prem ? C.mintBright : 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 700, color: prem ? C.ink : '#FFFFFF', display: 'inline-flex', alignItems: 'center', transition: 'background .6s,color .6s', pointerEvents: 'none' }}>
                {prem ? 'モンゴリア銀河 · 高級ゲル' : '一般的なツアー · 一般ゲル'}
            </span>
            <div style={{ position: 'absolute', left: 18, right: 18, bottom: 20, pointerEvents: 'none' }}>
                <div style={{ position: 'relative', minHeight: 84 }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 9, opacity: prem ? 0 : 1, transition: 'opacity .5s' }}>
                        {GER_STANDARD.map(([t, sub], i) => line(p >= i, false, `${t} ${sub}`.trim()))}
                    </div>
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 9, opacity: prem ? 1 : 0, transition: 'opacity .5s' }}>
                        {GER_PREMIUM.map(([t, sub], i) => line(p >= 4 + i, true, `${t} ${sub}`.trim()))}
                    </div>
                </div>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(18,59,58,0.62)', opacity: p >= 7 ? 1 : 0, transition: 'opacity .8s ease-out', pointerEvents: 'none', textAlign: 'center' }}>
                {[
                    <span key="a" style={{ ...inter, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: C.mintPale }}>FREE UPGRADE</span>,
                    <span key="b" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#FFFFFF' }}>追加料金なしで</span>,
                    <span key="c" style={{ height: 44, padding: '0 20px', borderRadius: 12, background: 'linear-gradient(135deg,#007F75 0%,#06C4A0 100%)', fontSize: 20, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center' }}>高級ゲルに宿泊</span>,
                ].map((el, i) => <span key={i} style={{ transform: p >= 7 ? 'translateY(0)' : 'translateY(12px)', transition: `transform .8s cubic-bezier(.22,.61,.36,1) ${i * 0.1}s` }}>{el}</span>)}
            </div>
        </div>
    );
};

export const TripDocSections: React.FC<Props> = ({ doc, images, pad, wide, legal }) => {
    const reduce = useReducedMotion();
    const img = (slot: string) => images.slots[slot] || '';
    const isQuote = doc.mode === 'quote';
    const premium = doc.q.stayGrade !== 'standard';
    const [stayPg, setStayPg] = useState(0);
    const [carPg, setCarPg] = useState(0);
    const [foodPg, setFoodPg] = useState(0);
    const specials = images.specials;
    // 관광지 마스터 「차량」에 등록한 차가 없으면 기본 5대 (src/assets/vehicles)
    const vehicles = images.vehicles.length ? images.vehicles : DEFAULT_VEHICLES;

    // 숙소 — 고급 / 일반 탭 + 옆으로 넘기는 사진. 일반 게르 사진이 없으면 고급 게르만
    const hasStandard = images.stayStandard.length > 0;
    const stayRef = useRef<HTMLDivElement>(null);
    const stayGo = (i: number) => { const el = stayRef.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); setStayPg(i); };
    // 안전 — 접고 펴는 카드 (처음엔 보험만 펼침)
    const [safeOpen, setSafeOpen] = useState<Record<string, boolean>>({ ins: true });
    const SAFE_KEYS = ['ins', 'act', 'ride', 'wv'];
    const safeAll = SAFE_KEYS.every(k => safeOpen[k]);
    const toggleSafe = (k: string) => setSafeOpen(o => ({ ...o, [k]: !o[k] }));
    // 팀 — 가이드 / 드라이버 탭
    const [teamTab, setTeamTab] = useState(0);

    return (
        <>
            {/* ─── 07 Stays ─── */}
            <section id="q-stay" style={{ ...secStyle(pad, 32), gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.mint }}>モンゴリア銀河は、違う。</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.body }}>現地視察を重ね、私たちが実際に確かめて選びました。</span>
                    <span style={{ marginTop: 6, fontSize: 20, fontWeight: 800, lineHeight: 1.35, letterSpacing: '-0.03em' }}>
                        {premium ? (
                            <><span style={{ display: 'block', fontSize: 'clamp(13px,4.6cqw,17px)', whiteSpace: 'nowrap' }}>旅行者キャンプでも、追加料金なしで</span><span style={{ color: C.mint }}>高級ゲルに宿泊</span></>
                        ) : (
                            <><span style={{ display: 'block', fontSize: 'clamp(13px,4.6cqw,17px)', whiteSpace: 'nowrap' }}>清潔で快適な旅行者キャンプの</span><span style={{ color: C.mint }}>ゲルに宿泊</span></>
                        )}
                    </span>
                </div>
                {premium && hasStandard && <GerMovie before={images.stayStandard[0]} after={images.stayPremium[0]} wide={wide} reduce={reduce} />}
                {hasStandard && (
                    <div role="tablist" className="tdoc-noprint" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 4, padding: 4, borderRadius: 14, background: C.gray }}>
                        {['高級ゲル', '一般ゲル'].map((label, i) => {
                            const on = stayPg === i;
                            return (
                                <button key={label} type="button" role="tab" aria-selected={on} onClick={() => stayGo(i)}
                                    style={{ height: 40, border: 0, borderRadius: 10, background: on ? '#FFFFFF' : 'transparent', boxShadow: on ? '0 2px 6px rgba(18,59,58,0.1)' : 'none', fontSize: 13, fontWeight: 700, color: on ? C.mintDeep : C.sub, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}
                <div ref={stayRef} data-noscroll="" onScroll={e => { const i = pageOf(e.currentTarget); if (i !== stayPg) setStayPg(i); }}
                    style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
                    <GerSlide imgs={images.stayPremium} tag="高級ゲル" good items={GER_PREMIUM} />
                    {hasStandard && <GerSlide imgs={images.stayStandard} tag="一般ゲル" good={false} items={GER_STANDARD} />}
                </div>
                {hasStandard && (
                    <button type="button" className="tdoc-noprint" onClick={() => stayGo(stayPg ? 0 : 1)}
                        style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 18px', border: `1px solid ${C.line}`, borderRadius: 999, background: '#FFFFFF', fontSize: 13, fontWeight: 700, color: C.mintDeep, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {stayPg ? '← 高級ゲルに戻る' : '一般ゲルと比べる →'}
                        <span style={{ display: 'flex', gap: 4 }}><PageDots n={2} i={stayPg} /></span>
                    </button>
                )}
                <span style={{ fontSize: 11, lineHeight: 1.6, color: C.sub, textAlign: 'center' }}>一般ゲルと高級ゲルでは、室内設備の充実度や快適さに違いがあります。</span>
            </section>

            {/* ─── 07b Vehicles ─── */}
            <section id="q-car" style={{ ...secStyle(pad, 36), gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>モンゴルのオフロードを駆け抜ける、最強のタフ車両！</span>
                    <span style={{ marginTop: 4, fontSize: 20, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em' }}>専用車両</span>
                    <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: C.mint, whiteSpace: 'nowrap' }}>プルゴン / スターレックス / アルファード</span>
                    <span style={{ marginTop: 4, fontSize: 12, lineHeight: 1.7, color: C.body }}>モンゴルの広大な草原や砂漠、険しい山岳地帯を走るために使用する専用車両です。旅程や道路状況に合わせて最適な車両をご用意します。（最大6名様）</span>
                </div>
                {vehicles.length > 0 && (
                    <>
                        <div data-noscroll="" onScroll={e => { const el = e.currentTarget; const c = el.children[0] as HTMLElement | undefined; const i = Math.min(vehicles.length - 1, pageOf(el, c ? c.getBoundingClientRect().width + 10 : 0)); if (i !== carPg) setCarPg(i); }}
                            style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', margin: `0 -${pad}px`, padding: `0 ${pad}px`, scrollPadding: `0 ${pad}px` }}>
                            {vehicles.map(v => (
                                <div key={v.name + v.img} style={{ flex: '0 0 72%', maxWidth: 380, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', background: '#F3F6F5' }}>
                                        {v.img
                                            ? <Photo src={v.img} placeholder={v.name} dark={false} style={{ objectFit: 'contain' }} />
                                            : <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={I_CAR} size={56} stroke={C.mintSoft} sw={1.3} /></span>}
                                    </div>
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, background: C.mintBg, fontSize: 15, fontWeight: 700, color: C.mint }}>{v.name}</span>
                                </div>
                            ))}
                        </div>
                        {vehicles.length > 1 && (
                            <div className="tdoc-noprint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -4 }}>
                                <PageDots n={vehicles.length} i={carPg} />{swipeHint}
                            </div>
                        )}
                    </>
                )}
                <span style={{ fontSize: 11, lineHeight: 1.6, color: C.sub, textAlign: 'center' }}>※車両はランダムでの手配となります。ご希望の車種がございましたら、できる限り対応いたしますが、現地の手配状況によりご希望に添えない場合がございます。</span>
            </section>

            {/* ─── 07c Meals ─── */}
            <section id="q-food" style={{ padding: '36px 0 0', display: 'flex', flexDirection: 'column', gap: 18, scrollMarginTop: 100 }}>
                {images.foodStrip.length > 0 && (reduce ? (
                    // 동작 줄이기 설정이면 손으로 넘기는 띠
                    <div data-noscroll="" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: `0 ${pad}px` }}>
                        {images.foodStrip.map(src => (
                            <div key={src} style={{ position: 'relative', flex: '0 0 36%', maxWidth: 200, aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', background: '#EEF3F1' }}><Photo src={src} dark={false} /></div>
                        ))}
                    </div>
                ) : (
                    // 저절로 옆으로 흐르는 띠 — 사진을 두 번 이어 붙여 -50% 까지 움직이면 끊김 없이 반복된다. 누르거나 올리면 멈춤
                    <div className="tdoc-marq" style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', width: 'max-content', animation: `qBand ${Math.max(16, images.foodStrip.length * 5)}s linear infinite` }}>
                            {[...images.foodStrip, ...images.foodStrip].map((src, i) => (
                                <div key={i} aria-hidden={i >= images.foodStrip.length || undefined} style={{ flex: 'none', width: 140, paddingRight: 8 }}>
                                    <div style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', background: '#EEF3F1' }}><Photo src={src} dark={false} eager /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: `0 ${pad}px`, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>旅の楽しみは、やっぱり食事！</span>
                    <span style={{ marginTop: 4, fontSize: 'clamp(17px,6cqw,20px)', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>モンゴル旅行 <span style={{ color: C.mint }}>お食事のご案内</span></span>
                    <span style={{ marginTop: 6, fontSize: 13, fontWeight: 700, lineHeight: 1.75 }}>朝食からしっかり満足<br />モンゴル料理も食べやすく<br />1日3食すべてご提供</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: `0 ${pad}px` }}>
                    {[
                        ['現地食', '移動中に道路沿いのローカルレストランやフードトラックなどでいただく、モンゴルの伝統料理です。羊肉や牛肉を中心とした料理が多く、味付けは比較的シンプルで、香辛料も控えめです。'],
                        ['キャンプ食', '宿泊先となるゲルキャンプ内の専用レストランで提供される食事です。外国人観光客の好みに合わせて調理されているため、比較的食べやすく、モンゴル料理に慣れていない方でも楽しみやすい食事です。'],
                    ].map(([t, d]) => (
                        <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: C.mint }}>{t}</span>
                            <span style={{ fontSize: 12, lineHeight: 1.75, color: C.body }}>{d}</span>
                        </div>
                    ))}
                </div>
                {specials.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: `0 ${pad}px` }}>
                        <div data-noscroll="" onScroll={e => { const i = pageOf(e.currentTarget); if (i !== foodPg) setFoodPg(i); }}
                            style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
                            {specials.map(sp => (
                                <div key={sp.id} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ position: 'relative', aspectRatio: '16/10', borderRadius: 18, overflow: 'hidden', background: '#EEF3F1' }}><Photo src={sp.image} placeholder={sp.name} dark={false} /></div>
                                    <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, fontWeight: 700, color: C.mint }}>
                                        <span>#特別料理</span>{sp.sub && <span>#{sp.sub.replace(/\s+/g, '')}</span>}
                                    </span>
                                    <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.45, letterSpacing: '-0.02em', color: C.mintDeep }}>特別料理：{sp.name}</span>
                                    {sp.desc && <span style={{ fontSize: 12, lineHeight: 1.75, color: C.body }}>{sp.desc}</span>}
                                </div>
                            ))}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.mint }}>※日程により、ご提供のタイミングが変更になる場合がございます。</span>
                        {specials.length > 1 && (
                            <div className="tdoc-noprint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <PageDots n={specials.length} i={foodPg} />{swipeHint}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ─── 10 Safety — 접고 펴는 카드 ─── */}
            <section id="q-safe" style={{ ...secStyle(pad, 32), gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
                    <span style={enHead}>SAFETY</span>
                    <span style={bigHead}>安全が <span style={{ color: C.mint, whiteSpace: 'nowrap' }}>第一</span> です</span>
                    <span style={lead}>旅行保険 &amp; アクティビティ体験の注意事項</span>
                    <button type="button" className="tdoc-noprint" onClick={() => setSafeOpen(safeAll ? {} : { ins: true, act: true, ride: true, wv: true })}
                        style={{ alignSelf: 'flex-start', marginTop: 6, height: 30, padding: '0 12px', border: `1px solid ${C.line}`, borderRadius: 999, background: '#FFFFFF', fontSize: 11, fontWeight: 700, color: C.mintDeep, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {safeAll ? 'すべて閉じる' : 'すべて開く'}
                    </button>
                </div>
                {([
                    ['ins', (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ flex: 'none', width: 32, height: 32, borderRadius: 10, background: C.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" size={18} sw={2} /></span>
                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={kicker}>STRONGLY RECOMMENDED</span>
                                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>日本の海外旅行保険へのご加入</span>
                            </span>
                        </span>
                    ), (
                        <span style={{ fontSize: 12, lineHeight: 1.75, color: C.sub }}>モンゴル現地の旅行保険は、事故発生時の手続きが遅く補償額も少なく、実際に適用されにくい場合が多くあります。万一の際にも迅速で確実な補償を受けられるよう、<strong style={{ color: C.ink }}>日本ご出発前に、必ず日本の保険会社の海外旅行保険へご加入いただくことを強くおすすめ</strong>いたします。</span>
                    )],
                    ['act', (
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={kicker}>ACTIVITY</span><span style={{ fontSize: 15, fontWeight: 700 }}>体験は自由に選べます</span></span>
                    ), (
                        <>
                            <span style={{ fontSize: 12, color: C.sub }}>乗馬・ラクダ乗り・砂ソリなど</span>
                            <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 14, background: '#FFFFFF' }}>
                                {['乗馬を体験しない場合の返金額', 'ラクダに乗らない場合の返金額'].map((t, i) => (
                                    <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 14px', borderTop: i ? '1px solid #EEF3F1' : 'none' }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.5 }}>{t}</span>
                                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                                            <span style={{ fontSize: 10, color: C.mute, whiteSpace: 'nowrap' }}>お一人様</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>現地でご案内</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {ACT_RULES.map(([t, warn]) => (
                                    <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <span style={{ flex: 'none', width: 20, height: 20, marginTop: 1, borderRadius: '50%', background: warn ? C.red : C.mintBright, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Svg d={warn ? IC.warn : IC.check} size={10} stroke="#FFFFFF" sw={3} />
                                        </span>
                                        <span style={{ fontSize: 12, lineHeight: 1.65, color: C.body }}>{t}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )],
                    ['ride', (
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={kicker}>CAUTION</span><span style={{ fontSize: 15, fontWeight: 700 }}>乗馬 · ラクダの注意事項</span></span>
                    ), (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {RIDE_TIPS.map((t, i) => (
                                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: `1px solid ${C.line}` }}>
                                    <span style={{ flex: 'none', width: 16, ...inter, fontSize: 15, fontWeight: 700, color: C.mint }}>{i + 1}</span>
                                    <span style={{ fontSize: 12, lineHeight: 1.65, color: C.sub }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    )],
                    ['wv', (
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}><span style={kicker}>BEFORE ACTIVITY</span><span style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>体験プログラム参加のご案内</span></span>
                    ), (
                        <span style={{ fontSize: 12, lineHeight: 1.7, color: C.sub }}>ツアー中のアクティビティ体験前に<strong style={{ color: C.ink }}>「免責同意書」</strong>へのご記入をお願いしています。体験中に起こりうる事故についてツアー会社へ法的責任を問うことや別途補償を求めることはできませんので、同意書の内容をよくご確認のうえ、現地ガイドの安全ルールを守って安全で楽しい体験をお楽しみください。</span>
                    )],
                ] as Array<[string, React.ReactNode, React.ReactNode]>).map(([k, head, body]) => {
                    const on = !!safeOpen[k];
                    return (
                        <div key={k} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 20, background: C.paper }}>
                            <button type="button" aria-expanded={on} onClick={() => toggleSafe(k)}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 18, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}>
                                <span style={{ flex: 1, minWidth: 0, display: 'flex' }}>{head}</span>
                                <span className="tdoc-noprint" style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: on ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .25s cubic-bezier(.22,.61,.36,1)' }}>
                                    <Svg d={IC.chev} size={14} sw={2.4} />
                                </span>
                            </button>
                            {/* 인쇄할 때는 모두 펼쳐서 */}
                            <div className={on ? undefined : 'tdoc-printonly'} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 18px 18px' }}>{body}</div>
                        </div>
                    );
                })}
            </section>

            {/* ─── 12 Certificate ─── */}
            <section id="q-cert" style={secStyle(pad)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={enHead}>CERTIFICATE</span>
                        <span style={bigHead}>公式 <span style={{ color: C.mint, whiteSpace: 'nowrap' }}>許可証</span></span>
                        <span style={{ ...lead, whiteSpace: 'nowrap' }}>モンゴリア天の川 現地旅行会社</span>
                    </div>
                    <span style={{ ...inter, fontSize: 44, fontWeight: 700, lineHeight: 1, color: C.mintBright }}>{CERTS.length}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['韓国 正式認可', 'モンゴル 正式認可'].map(t => <span key={t} style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', borderRadius: 999, background: C.ink, fontSize: 11, fontWeight: 700, color: C.mintPale, whiteSpace: 'nowrap' }}>{t}</span>)}
                </div>
                {/* 허가증 카드가 저절로 옆으로 흐른다 (두 번 이어 붙여 끊김 없이) — 올리거나 누르면 멈춤 */}
                <div className={reduce ? undefined : 'tdoc-marq'} data-noscroll="" style={{ margin: `0 -${pad}px`, overflowX: reduce ? 'auto' : 'hidden', scrollbarWidth: 'none' }}>
                    <div style={{ display: 'flex', width: 'max-content', padding: reduce ? `0 ${pad}px` : 0, animation: reduce ? 'none' : 'qBand 30s linear infinite' }}>
                        {(reduce ? CERTS : [...CERTS, ...CERTS]).map((c, k) => {
                            const i = k % CERTS.length;
                            const src = certImg(i);
                            return (
                                <div key={k} aria-hidden={k >= CERTS.length || undefined} style={{ flex: 'none', width: 210, paddingRight: 10, boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', background: C.paper }}>
                                        <div style={{ position: 'relative', aspectRatio: '3/4', background: src ? '#FFFFFF' : `linear-gradient(160deg,${C.mintBg} 0%,${C.paper} 100%)`, borderBottom: `1px solid ${C.line}` }}>
                                            {src ? <Photo src={src} alt={c.t} dark={false} eager style={{ objectFit: 'contain' }} /> : (
                                                <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={IC.doc} size={44} stroke={C.mintSoft} sw={1.4} /></span>
                                            )}
                                            <span style={{ position: 'absolute', left: 10, top: 10, ...inter, fontSize: 15, fontWeight: 700, color: C.mint, pointerEvents: 'none' }}>{String(i + 1).padStart(2, '0')}</span>
                                        </div>
                                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px 12px' }}>
                                            <span style={{ fontSize: 13, fontWeight: 700 }}>{c.t}</span>
                                            <span style={{ fontSize: 11, lineHeight: 1.5, color: C.mintDeep }}>{c.d}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 20, background: C.paper }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>法的な安全体制をすべて整えています</span>
                    <span style={lead}>モンゴリア天の川は<strong style={{ color: C.ink }}>韓国とモンゴル両国政府の正式な認可</strong>を受けて登録されたグローバル現地旅行会社です。両国での事業者登録・観光事業登録はもちろん、旅行者保護のための旅行業保証保険への加入、モンゴル現地法人の設立、モンゴル旅行協会（MATA）への正式登録まで、<strong style={{ color: C.ink }}>法的に必要なすべての安全体制と証明書類</strong>を徹底して整えています。</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {CERT_TAGS.map(t => <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 9px', borderRadius: 999, background: '#FFFFFF', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}><span style={{ color: C.mint }}>✓</span>{t}</span>)}
                    </div>
                </div>
            </section>

            {/* ─── 13 About & Team ─── */}
            <section id="q-team" style={secStyle(pad)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, color: C.sub, whiteSpace: 'nowrap' }}>モンゴル現地で直接運営する</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>モンゴリア天の川<span style={{ padding: '0 9px 2px', borderRadius: 10, background: C.ink, color: C.mintPale }}>現地旅行会社</span></span>
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                        {[['モンゴル 事業者番号', COMPANY.mnRegNo, COMPANY.mnRegName], ['韓国 事業者番号', COMPANY.krRegNo, COMPANY.krRegName]].map(([k, v, s]) => (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 14px', borderRadius: 16, background: C.paper }}>
                                <span style={{ fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}>{k}</span>
                                <span style={{ ...inter, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>{v}</span>
                                <span style={{ fontSize: 10, color: C.mute, whiteSpace: 'nowrap' }}>{s}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ height: 1, background: '#EEF4F2', margin: '6px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={enHead}>MILKY WAY TEAM</span>
                    <span style={bigHead}>最低 <span style={{ color: C.mint, whiteSpace: 'nowrap' }}>3年</span> 以上</span>
                    <span style={{ ...lead, whiteSpace: 'nowrap' }}>熟練の 天の川 プロチーム</span>
                </div>
                <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 20, overflow: 'hidden', background: '#E1ECE9' }}>
                    <Photo src={img('quote-team')} placeholder="ガイドチーム写真" dark={false} />
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(18,59,58,0) 45%,rgba(18,59,58,0.82) 100%)' }} />
                    <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 6, pointerEvents: 'none' }}>
                        {['日本語対応 100%', '長距離は2名1組'].map(t => (
                            <span key={t} style={{ height: 26, padding: '0 10px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', fontSize: 11, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t}</span>
                        ))}
                    </div>
                    <span style={{ position: 'absolute', left: 16, right: 16, bottom: 14, fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: '#FFFFFF', pointerEvents: 'none' }}>経験3年以上の<br />専門ガイドがご案内します。</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '6px 6px 16px', borderRadius: 20, background: C.paper }}>
                    <div role="tablist" style={{ display: 'grid', gridTemplateColumns: `repeat(${TEAM.length},minmax(0,1fr))`, gap: 4, padding: 4, borderRadius: 14, background: '#EAF1EF' }}>
                        {TEAM.map((t, i) => {
                            const on = teamTab === i;
                            return (
                                <button key={t.role} type="button" role="tab" aria-selected={on} onClick={() => setTeamTab(i)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, border: 0, borderRadius: 10, background: on ? '#FFFFFF' : 'transparent', boxShadow: on ? '0 2px 6px rgba(18,59,58,0.1)' : 'none', fontSize: 13, fontWeight: 700, color: on ? C.mintDeep : C.sub, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                                    <Svg d={t.icon} size={16} stroke={on ? C.mintDeep : C.mute} />{t.role}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 10px 0' }}>
                        {(TEAM[teamTab]?.lines || []).map(([a, b], i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <span style={{ flex: 'none', width: 22, height: 22, marginTop: 1, borderRadius: '50%', background: C.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center', ...inter, fontSize: 10, fontWeight: 700, color: C.mintDeep }}>{String(i + 1).padStart(2, '0')}</span>
                                <span style={{ fontSize: 13, lineHeight: 1.7, color: C.sub }}>{a}<strong style={{ color: C.ink }}>{b}</strong></span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 20, background: C.paper }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, color: C.sub }}>無駄のない費用と安全なツアーのための</span>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>プロ<span style={{ color: C.mint }}>最適な</span>配置</span>
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 14, background: '#FFFFFF' }}>
                        {TEAM_ASSIGN.map((x, i) => (
                            <div key={x.big + x.area} style={{ display: 'grid', gridTemplateColumns: '76px minmax(0,1fr)', alignItems: 'center', gap: 10, padding: '12px 14px', borderTop: i ? '1px solid #EEF3F1' : 0 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>{x.big}</span>
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 10, color: C.mute, whiteSpace: 'nowrap' }}>{x.area}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.who}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                    <span style={{ fontSize: 11, lineHeight: 1.6, color: C.sub }}>ゴビ・フブスグルのツアーは長距離のオフロード移動が多いため、安全と疲労軽減のため2名1組で固定配置します。</span>
                </div>
            </section>

            {/* 안전·약관 블록은 자체 여백(16px)이 있어 PC 에서만 나머지 여백을 더한다 */}
            {legal && <section id="q-legal" style={{ padding: `0 ${pad - 16}px`, scrollMarginTop: 100 }}>{legal}</section>}

            {/* ─── Contact ─── */}
            <section id="q-contact" style={secStyle(pad)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={enHead}>CONTACT</span>
                    <span style={bigHead}>ご不明な点は <span style={{ color: C.mint, whiteSpace: 'nowrap' }}>お気軽に</span> ご相談ください</span>
                    <span style={{ ...lead, whiteSpace: 'nowrap' }}>{isQuote ? 'お見積りに関するお問い合わせ' : 'ご旅行に関するお問い合わせ'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                    {[
                        [`https://${COMPANY.site}`, true, 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18', '公式サイト', COMPANY.site, 'ツアー・会社情報を見る'],
                        [`https://instagram.com/${COMPANY.instagram}`, false, IC.insta, 'Instagram', `@${COMPANY.instagram}`, '旅の写真を見る'],
                    ].map(([href, dark, icon, label, val, sub]) => (
                        <a key={label as string} href={href as string} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 14, borderRadius: 20, background: dark ? C.ink : C.paper, color: dark ? '#FFFFFF' : C.ink, minWidth: 0 }}>
                            <Svg d={icon as string} size={20} stroke={dark ? C.mintPale : C.mintDeep} />
                            <span style={{ marginTop: 14, fontSize: 11, color: dark ? C.faint : C.sub, whiteSpace: 'nowrap' }}>{label as string}</span>
                            <span style={{ ...inter, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: dark ? '#FFFFFF' : C.ink }}>{val as string}</span>
                            <span style={{ fontSize: 10, color: dark ? C.mintPale : C.mintDeep, whiteSpace: 'nowrap' }}>{sub as string}</span>
                        </a>
                    ))}
                </div>
                <span style={{ padding: '8px 0 24px', fontSize: 10, color: C.mute, textAlign: 'center' }}>モンゴリア天の川 現地旅行会社 {isQuote ? 'オーダーメイドお見積書' : '確定日程表'}</span>
            </section>
        </>
    );
};
