import React from 'react';
import type { DesignTemplateProps } from './types';

/**
 * 「몽골 승마 트레킹 상세페이지」 — Claude Design(몽골 승마 트레킹 상세페이지.dc.html)을
 * React로 이식한 860px 고정폭 롱폼 디자인.
 * 모든 문구/사진은 horseTrekFields.ts 매니페스트의 key로 편집 가능하다.
 * 화면 표시는 ScaledDesign이 컨테이너 폭에 맞춰 축소한다.
 */

const MINT = '#06C4A0';
const DEEP = '#00332E';
const TEAL = '#029F85';

/** 빈 값이면 매니페스트 default가 이미 병합돼 들어온다(v getter). */
function Slot({ k, src, label, editing, alt }: { k?: string; src: string; label: string; editing?: boolean; alt: string }) {
    if (src) {
        return <img data-df={k} src={src} alt={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" />;
    }
    if (editing) {
        return (
            <div data-df={k} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(2,159,133,0.55)', borderRadius: 'inherit', color: TEAL, fontSize: 17, fontWeight: 700, textAlign: 'center', padding: 12, boxSizing: 'border-box', background: 'rgba(6,196,160,0.06)' }}>
                {label}
            </div>
        );
    }
    return null;
}

/** \n 줄바꿈을 그대로 표시하는 문단 */
function Lines({ k, text, style }: { k?: string; text: string; style?: React.CSSProperties }) {
    return <div data-df={k} style={{ whiteSpace: 'pre-line', ...style }}>{text}</div>;
}

function SectionDot() {
    return <div style={{ width: 34, height: 34, borderRadius: '50%', background: MINT, flex: 'none' }} />;
}

export default function HorseTrekTemplate({ v, editing }: DesignTemplateProps) {
    const opBgs = [1, 2, 3].map(n => ({ n, src: v(`op_bg${n}`) })).filter(o => o.src);
    const mapStops = v('map_stops').split('\n').map(s => s.trim()).filter(Boolean).join(';');
    const mapUrl = `/designs/mongolia-map.html?stops=${encodeURIComponent(mapStops)}`;

    const dayCards = [1, 2, 3, 4, 5].map(n => ({
        n,
        img: v(`day${n}_img`),
        badge: v(`day${n}_badge`),
        title: v(`day${n}_title`),
        body: v(`day${n}_body`),
        offset: n % 2 === 0,
    }));
    const points = [1, 2, 3, 4, 5].map(n => ({ img: v(`pt${n}_img`), caption: v(`pt${n}_caption`) }));
    const tabs = [1, 2, 3, 4, 5].map(n => ({ label: v(`tab${n}_label`), text: v(`tab${n}_text`) }));
    const schedule = [1, 2, 3].map(n => ({ time: v(`d1_t${n}`), body: v(`d1_e${n}`) }));

    return (
        <div className="ht-design" style={{ width: 860, margin: '0 auto', background: '#fff', color: '#2b2b2b', overflow: 'hidden', fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", -apple-system, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
            <style>{`
                .ht-design .ht-scroll::-webkit-scrollbar { display: none; }
                @keyframes htBgCycle {
                    0% { opacity:1; } 28% { opacity:1; } 38% { opacity:0; }
                    90% { opacity:0; } 100% { opacity:1; }
                }
                @keyframes htShoot {
                    0% { top:-180px; opacity:0; }
                    8% { opacity:1; }
                    34% { opacity:0.9; }
                    40% { top:100%; opacity:0; }
                    100% { top:100%; opacity:0; }
                }
                .ht-design .ht-bubble { position:relative; }
                .ht-design .ht-bubble::after {
                    content:''; position:absolute; bottom:-14px; width:0; height:0;
                    border-top:18px solid #F1F1F1;
                }
                .ht-design .ht-bubble.tail-left::after { left:26px; border-right:22px solid transparent; }
                .ht-design .ht-bubble.tail-right::after { right:26px; border-left:22px solid transparent; }
            `}</style>

            {/* ── 01 오프닝 ─────────────────────────────────── */}
            <section style={{ position: 'relative', height: 1080, overflow: 'hidden', background: DEEP }}>
                {opBgs.length > 0 ? opBgs.map((o, i) => (
                    <img key={o.n} data-df={`op_bg${o.n}`} src={o.src} alt="" style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                        filter: 'brightness(0.42) saturate(0.85) hue-rotate(-6deg)',
                        opacity: i === 0 ? 1 : 0,
                        animation: opBgs.length > 1 ? `htBgCycle 21s ease-in-out ${-(21 / opBgs.length) * i}s infinite` : undefined,
                    }} loading="lazy" decoding="async" />
                )) : (editing && (
                    <div data-df="op_bg1" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 20, fontWeight: 700 }}>
                        $1
                    </div>
                ))}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,51,46,0.78) 0%, rgba(0,51,46,0.18) 45%, rgba(0,30,26,0.88) 100%)' }} />
                <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '150px 0 70px', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.62)' }}><span data-df="op_line1">{v('op_line1')}</span></div>
                    <div style={{ position: 'relative', overflow: 'hidden', width: 1, flex: 1, margin: '26px 0', background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.15))' }}>
                        <div style={{ position: 'absolute', left: -1, width: 3, height: 170, borderRadius: 2, background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 70%, #fff 100%)', boxShadow: '0 0 14px rgba(255,255,255,0.75)', animation: 'htShoot 3.4s cubic-bezier(.55,.06,.2,1) infinite' }} />
                    </div>
                    <div style={{ fontSize: 74, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}><span data-df="op_line2">{v('op_line2')}</span></div>
                    <div style={{ marginTop: 'auto', paddingTop: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontStyle: 'italic', fontWeight: 800, lineHeight: 1.05, color: '#fff', letterSpacing: '0.02em' }}>
                        <div style={{ fontSize: 26 }}>MILKY WAY</div>
                        <div style={{ fontSize: 26 }}>MONGOLIA</div>
                        <div style={{ marginTop: 8, width: 120, height: 1, background: 'rgba(255,255,255,0.5)' }} />
                    </div>
                </div>
            </section>

            {/* ── 02 별하늘 히어로 ──────────────────────────── */}
            <section style={{ position: 'relative', background: '#02100E', overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: 960, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: '#02100E' }}>
                        <Slot k="hero_bg" src={v('hero_bg')} label="은하수 아래 게르 (야경 사진)" editing={editing} alt="銀河の下のゲル" />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(2,16,14,0.86) 0%, rgba(2,16,14,0.5) 34%, rgba(2,16,14,0.12) 58%, rgba(2,16,14,0.4) 100%)' }} />
                    <div style={{ position: 'relative', padding: '96px 60px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.86)' }}><span data-df="hero_kicker">{v('hero_kicker')}</span></div>
                        <h2 style={{ margin: '40px 0 0', fontSize: 82, lineHeight: 1.14, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}><span data-df="hero_title">{v('hero_title')}</span></h2>
                        <Lines k="hero_body" text={v('hero_body')} style={{ margin: '44px 0 0', fontSize: 26, lineHeight: 1.75, fontWeight: 600, letterSpacing: '-0.015em', color: 'rgba(255,255,255,0.8)', textShadow: '0 2px 18px rgba(0,0,0,0.5)' }} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: '#02100E' }}>
                    <div style={{ position: 'relative', height: 290, overflow: 'hidden', background: '#061F1B' }}>
                        <Slot k="hero_img1" src={v('hero_img1')} label="밤 캠프 사진" editing={editing} alt="夜のキャンプ" />
                    </div>
                    <div style={{ position: 'relative', height: 290, overflow: 'hidden', background: '#061F1B' }}>
                        <Slot k="hero_img2" src={v('hero_img2')} label="별 관측 사진" editing={editing} alt="星空観賞" />
                        <div style={{ position: 'absolute', right: 26, bottom: 22, pointerEvents: 'none', fontStyle: 'italic', fontWeight: 800, lineHeight: 1.05, fontSize: 20, color: 'rgba(255,255,255,0.9)', textAlign: 'right', letterSpacing: '0.02em' }}>
                            <div>MILKY WAY</div>
                            <div>MONGOLIA</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 03 소개 배너 ──────────────────────────────── */}
            <section style={{ position: 'relative', height: 1000, overflow: 'hidden', background: DEEP }}>
                <Slot k="intro_bg" src={v('intro_bg')} label="산맥 아래 초원 사진" editing={editing} alt="山脈の下の草原" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(0,51,46,0.78) 0%, rgba(0,51,46,0.46) 60%, rgba(0,51,46,0.24) 100%)' }} />
                <div style={{ position: 'relative', padding: '120px 70px', color: '#fff' }}>
                    <h2 style={{ margin: 0, fontSize: 62, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.045em', textShadow: '0 3px 20px rgba(0,0,0,0.3)' }}><span data-df="intro_title">{v('intro_title')}</span></h2>
                    <Lines k="intro_body" text={v('intro_body')} style={{ margin: '38px 0 0', fontSize: 29, lineHeight: 1.62, fontWeight: 600, letterSpacing: '-0.02em', textShadow: '0 2px 14px rgba(0,0,0,0.35)', textWrap: 'pretty' } as React.CSSProperties} />
                </div>
            </section>

            {/* ── 04 이용자 특전 ────────────────────────────── */}
            <section style={{ background: '#fff', padding: '100px 40px 110px' }}>
                <h2 style={{ margin: 0, textAlign: 'center', fontSize: 51, fontWeight: 800, letterSpacing: '-0.05em', color: DEEP }}><span data-df="perks_title">{v('perks_title')}</span></h2>
                <div style={{ margin: '22px 0 0', textAlign: 'center', fontSize: 24, fontWeight: 600, color: '#5a5a5a', letterSpacing: '-0.02em' }}><span data-df="perks_sub">{v('perks_sub')}</span></div>

                <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                        <div key={n} style={{ position: 'relative', height: 250, borderRadius: 20, overflow: 'hidden', background: '#EFFEF9' }}>
                            <Slot k={`perk${n}_img`} src={v(`perk${n}_img`)} label={`특전 ${n} 사진`} editing={editing} alt={v(`perk${n}_title`)} />
                            <div style={{ position: 'absolute', inset: 'auto 0 0 0', pointerEvents: 'none', padding: '26px 16px 22px', background: 'linear-gradient(180deg, rgba(0,51,46,0) 0%, rgba(0,51,46,0.72) 100%)', textAlign: 'center', color: '#fff', wordBreak: 'keep-all' }}>
                                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}><span data-df={`perk${n}_title`}>{v(`perk${n}_title`)}</span></div>
                                <div style={{ marginTop: 6, fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em' }}><span data-df={`perk${n}_sub`}>{v(`perk${n}_sub`)}</span></div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'stretch', border: '1px solid #C8FFEF', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ position: 'relative', minHeight: 250, background: '#EFFEF9' }}>
                        <Slot k="perk_air_img" src={v('perk_air_img')} label="공항 사진" editing={editing} alt="空港" />
                    </div>
                    <div style={{ padding: '44px 34px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, textAlign: 'center', wordBreak: 'keep-all', textWrap: 'pretty' } as React.CSSProperties}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: DEEP, letterSpacing: '-0.02em' }}><span data-df="perk_air_title">{v('perk_air_title')}</span></div>
                        <Lines k="perk_air_note" text={v('perk_air_note')} style={{ fontSize: 21, lineHeight: 1.6, fontWeight: 600, color: '#5a5a5a', letterSpacing: '-0.02em' }} />
                    </div>
                </div>
            </section>

            {/* ── 05 여행 고민 (말풍선) ─────────────────────── */}
            <section style={{ background: '#fff', padding: '110px 50px 120px', wordBreak: 'keep-all' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.04em', color: '#9a9a9a' }}><span data-df="worry_kicker">{v('worry_kicker')}</span></div>
                    <h2 style={{ margin: '14px 0 0', fontSize: 43, fontWeight: 800, letterSpacing: '-0.05em', color: '#2b2b2b' }}><span data-df="worry_title">{v('worry_title')}</span></h2>
                </div>
                <div style={{ marginTop: 70, display: 'flex', flexDirection: 'column', gap: 34 }}>
                    {([
                        { key: 'worry1', align: 'center', tail: 'tail-left', max: 620, size: 25 },
                        { key: 'worry2', align: 'flex-start', tail: 'tail-right', max: 660, size: 22 },
                        { key: 'worry3', align: 'flex-start', tail: 'tail-right', max: 640, size: 25 },
                        { key: 'worry4', align: 'flex-end', tail: 'tail-left', max: 680, size: 22 },
                        { key: 'worry5', align: 'center', tail: 'tail-left', max: 600, size: 25 },
                    ] as const).map(b => (
                        <div key={b.key} style={{ display: 'flex', justifyContent: b.align }}>
                            <div className={`ht-bubble ${b.tail}`} data-df={b.key} style={{ maxWidth: b.max, padding: '24px 34px', borderRadius: 22, background: '#F1F1F1', fontSize: b.size, lineHeight: 1.45, fontWeight: 600, letterSpacing: '-0.03em', color: '#3a3a3a', whiteSpace: 'pre-line' }}>
                                {v(b.key)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 06 숙소 ──────────────────────────────────── */}
            <section style={{ background: '#fff', padding: '100px 40px 96px', wordBreak: 'keep-all' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 23, fontWeight: 700, color: MINT, letterSpacing: '-0.02em' }}><span data-df="ger_kicker">{v('ger_kicker')}</span></div>
                    <div style={{ marginTop: 14, fontSize: 30, fontWeight: 600, color: '#5a5a5a', letterSpacing: '-0.03em' }}><span data-df="ger_sub">{v('ger_sub')}</span></div>
                    <h2 style={{ margin: '20px 0 0', fontSize: 52, lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.045em', color: DEEP }}>
                        <div style={{ fontSize: 49 }}><span data-df="ger_title1">{v('ger_title1')}</span></div>
                        <div style={{ color: TEAL }}><span data-df="ger_title2">{v('ger_title2')}</span></div>
                    </h2>
                </div>
                <div style={{ marginTop: 52, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} style={{ position: 'relative', height: 280, borderRadius: 16, overflow: 'hidden', background: '#EFFEF9' }}>
                            <Slot k={`ger_img${n}`} src={v(`ger_img${n}`)} label={`숙소 사진 ${n}`} editing={editing} alt="高級ゲル" />
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 38, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px 40px' }}>
                    {[v('ger_check1'), v('ger_check2'), v('ger_check3')].map((c, i) => c && (
                        <div key={i} data-df={`ger_check${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>
                            <div style={{ color: MINT }}>✓</div>
                            <div>{c}</div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 20, fontWeight: 600, color: '#5a5a5a', letterSpacing: '-0.02em' }}><span data-df="ger_note">{v('ger_note')}</span></div>
            </section>

            {/* ── 07 루트 소개 + 지도 ───────────────────────── */}
            <section style={{ position: 'relative', background: 'linear-gradient(180deg, #C8FFEF 0%, #EFFEF9 32%, #EFFEF9 100%)', paddingBottom: 90 }}>
                <div style={{ padding: '110px 70px 60px', textAlign: 'center' }}>
                    <div style={{ fontSize: 34, color: MINT, letterSpacing: '0.2em' }}>✦</div>
                    <h2 style={{ margin: '18px 0 0', fontSize: 52, lineHeight: 1.32, fontWeight: 800, letterSpacing: '-0.04em', color: '#2b2b2b' }}><span data-df="route_intro_title">{v('route_intro_title')}</span></h2>
                    <Lines k="route_intro_p1" text={v('route_intro_p1')} style={{ margin: '46px 0 0', fontSize: 26, lineHeight: 1.75, fontWeight: 500, color: '#4a4a4a', letterSpacing: '-0.02em' }} />
                    <Lines k="route_intro_p2" text={v('route_intro_p2')} style={{ margin: '38px 0 0', fontSize: 26, lineHeight: 1.75, fontWeight: 500, color: '#4a4a4a', letterSpacing: '-0.02em' }} />
                </div>

                <div style={{ position: 'relative', height: 420, overflow: 'hidden', background: '#DFFFF4' }}>
                    <Slot k="route_wide_img" src={v('route_wide_img')} label="와이드 사진 (계곡에서 쉬는 일행)" editing={editing} alt="渓谷で休む一行" />
                </div>

                <div style={{ margin: '-60px 40px 0', position: 'relative', background: '#fff', borderRadius: 40, boxShadow: '0 24px 60px rgba(0,51,46,0.10)', padding: '70px 56px 76px' }}>
                    <h3 style={{ margin: 0, textAlign: 'center', fontSize: 61, lineHeight: 1.4, fontWeight: 800, letterSpacing: '-0.035em', color: '#2b2b2b' }}><span data-df="route_card_title">{v('route_card_title')}</span></h3>

                    <div style={{ margin: '56px 0 64px', display: 'flex', justifyContent: 'center' }}>
                        <iframe data-df="map_stops" src={mapUrl} title="몽골 지도 위 여정 지점" scrolling="no" style={{ width: '100%', maxWidth: 760, aspectRatio: '760/990', border: 0, display: 'block' }} loading="lazy" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.035em', color: DEEP }}><span data-df="spots_label">{v('spots_label')}</span></div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: TEAL, letterSpacing: '-0.02em' }}><span data-df="spots_hint">{v('spots_hint')}</span></div>
                    </div>
                    <div className="ht-scroll" style={{ margin: '20px -56px 0 0', display: 'flex', alignItems: 'flex-start', gap: 22, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '4px 56px 16px 0' } as React.CSSProperties}>
                        {dayCards.map((c, i) => (
                            <div key={i} style={{ flex: '0 0 300px', marginTop: c.offset ? 34 : 0, scrollSnapAlign: 'start', background: '#fff', borderRadius: 26, boxShadow: '0 14px 34px rgba(0,51,46,0.10)', overflow: 'hidden' }}>
                                <div style={{ position: 'relative', height: 190, background: '#C8FFEF' }}>
                                    <Slot k={`day${c.n}_img`} src={c.img} label={`${c.badge} 사진`} editing={editing} alt={c.title} />
                                    <div style={{ position: 'absolute', top: 14, left: 14, pointerEvents: 'none', padding: '7px 16px', borderRadius: 999, background: MINT, color: '#fff', fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}><span data-df={`day${c.n}_badge`}>{c.badge}</span></div>
                                </div>
                                <div style={{ padding: '22px 24px 28px' }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}><span data-df={`day${c.n}_title`}>{c.title}</span></div>
                                    <Lines k={`day${c.n}_body`} text={c.body} style={{ margin: '12px 0 0', fontSize: 19, lineHeight: 1.6, fontWeight: 500, color: '#5a5a5a', letterSpacing: '-0.02em' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 09 고비 히어로 ────────────────────────────── */}
            <section style={{ position: 'relative', height: 1180, overflow: 'hidden', background: '#0A6558' }}>
                <div style={{ position: 'absolute', inset: 0, background: '#0E5349' }}>
                    <Slot k="gobi_hero_img" src={v('gobi_hero_img')} label="고비 히어로 배경 사진" editing={editing} alt="ゴビ" />
                </div>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.35) 100%)' }} />
                <div style={{ position: 'relative', pointerEvents: 'none', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '120px 60px 80px', boxSizing: 'border-box', textAlign: 'center' }}>
                    <div style={{ fontSize: 27, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', textShadow: '0 2px 14px rgba(0,0,0,0.4)' }}><span data-df="gobi_kicker">{v('gobi_kicker')}</span></div>
                    <h2 style={{ margin: '26px 0 0', fontSize: 62, lineHeight: 1.18, fontWeight: 800, letterSpacing: '-0.045em', color: '#fff', textShadow: '0 3px 22px rgba(0,0,0,0.45)' }}><span data-df="gobi_title">{v('gobi_title')}</span></h2>
                    <div style={{ marginTop: 14, width: 520, height: 5, borderRadius: 3, background: MINT }} />
                    <Lines k="gobi_body" text={v('gobi_body')} style={{ margin: '34px 0 0', fontSize: 38, lineHeight: 1.42, fontWeight: 700, letterSpacing: '-0.035em', color: '#fff', textShadow: '0 2px 18px rgba(0,0,0,0.45)' }} />
                </div>
            </section>

            {/* ── 10 하이라이트 ─────────────────────────────── */}
            <section style={{ background: '#fff', padding: '96px 60px 100px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                    <div style={{ flex: 1, height: 1, background: '#e6e6e6' }} />
                    <div style={{ flex: '0 0 10px', height: 10, borderRadius: '50%', background: MINT }} />
                    <div style={{ padding: '16px 44px', border: '1px solid #91FEE0', borderRadius: 999, fontSize: 37, fontWeight: 800, letterSpacing: '-0.035em', color: '#2b2b2b' }}><span data-df="hl_title">{v('hl_title')}</span></div>
                    <div style={{ flex: '0 0 10px', height: 10, borderRadius: '50%', background: MINT }} />
                    <div style={{ flex: 1, height: 1, background: '#e6e6e6' }} />
                </div>
                <div style={{ marginTop: 22, textAlign: 'right', fontSize: 15, fontWeight: 600, color: TEAL, letterSpacing: '-0.02em' }}><span data-df="hl_hint">{v('hl_hint')}</span></div>
                <div className="ht-scroll" style={{ margin: '22px -60px 0 0', display: 'flex', alignItems: 'flex-start', gap: 24, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '4px 60px 12px 0' } as React.CSSProperties}>
                    {points.map((p, i) => (
                        <div key={i} style={{ flex: '0 0 340px', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                            <div style={{ position: 'relative', flex: '0 0 250px', height: 250, borderRadius: 28, overflow: 'hidden', background: '#C8FFEF' }}>
                                <Slot k={`pt${i + 1}_img`} src={p.img} label={`포인트 ${i + 1} 사진`} editing={editing} alt={p.caption} />
                                <div style={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'none', width: 44, height: 44, borderRadius: '50%', background: MINT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>{i + 1}</div>
                            </div>
                            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 24, lineHeight: 1.45, letterSpacing: '-0.025em', color: '#3a3a3a' }}><span data-df={`pt${i + 1}_caption`}>{p.caption}</span></div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 88, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                    <div style={{ fontSize: 34, fontWeight: 800, color: MINT, lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 99, fontWeight: 800, letterSpacing: '-0.04em', color: DEEP }}><span data-df="and_word">{v('and_word')}</span></div>
                    <div style={{ width: 1, height: 88, background: `linear-gradient(180deg, ${MINT}, rgba(6,196,160,0))` }} />
                </div>
            </section>

            {/* ── 11 은하수 ─────────────────────────────────── */}
            <section style={{ position: 'relative', height: 720, overflow: 'hidden', background: DEEP }}>
                <div style={{ position: 'absolute', inset: 0, background: '#0E5349' }}>
                    <Slot k="mw_img" src={v('mw_img')} label="은하수 사진" editing={editing} alt="天の川" />
                </div>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,51,46,0.35) 0%, rgba(0,51,46,0) 45%, rgba(0,51,46,0.78) 100%)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 130, pointerEvents: 'none', textAlign: 'center', color: '#fff', fontSize: 56, lineHeight: 1.6, fontWeight: 600, letterSpacing: '-0.02em', textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}><span data-df="mw_caption">{v('mw_caption')}</span></div>
            </section>

            {/* ── 12 공항 도착 ──────────────────────────────── */}
            <section style={{ background: '#fff', padding: '100px 0 0', wordBreak: 'keep-all' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', color: '#c9c9c9' }}><span data-df="arr_from">{v('arr_from')}</span></div>
                    <div style={{ marginTop: 22, width: 3, height: 78, background: MINT }} />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: MINT, boxShadow: '0 0 0 6px rgba(6,196,160,0.22)' }} />
                    <div style={{ marginTop: 34, fontSize: 60, fontWeight: 800, letterSpacing: '-0.05em', color: DEEP }}><span data-df="arr_to">{v('arr_to')}</span></div>
                </div>

                <div style={{ marginTop: 56, position: 'relative', height: 520, background: '#EFFEF9' }}>
                    <Slot k="arr_img" src={v('arr_img')} label="칭기스칸 공항 사진" editing={editing} alt="チンギス・ハーン国際空港" />
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 18%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.7) 88%, #fff 100%)' }} />
                </div>

                <div style={{ padding: '0 60px' }}>
                    <Lines k="arr_lead" text={v('arr_lead')} style={{ textAlign: 'center', fontSize: 35, fontWeight: 700, letterSpacing: '-0.03em', color: '#2b2b2b' }} />
                    <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
                        <Lines k="arr_body" text={v('arr_body')} style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.035em', color: '#2b2b2b', textAlign: 'center' }} />
                    </div>
                </div>

                <div style={{ marginTop: 56, padding: '44px 60px', background: '#C8FFEF', textAlign: 'center' }}>
                    <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.035em', color: DEEP }}><span data-df="arr_band1">{v('arr_band1')}</span></div>
                    <div style={{ marginTop: 12, fontSize: 21, fontWeight: 700, letterSpacing: '-0.035em', color: '#0A6558' }}><span data-df="arr_band2">{v('arr_band2')}</span></div>
                </div>

                <div style={{ padding: '70px 60px 100px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 20 }}>
                        <div style={{ position: 'relative', flex: '0 0 470px', height: 430, background: '#EFFEF9', borderRadius: 6, overflow: 'hidden' }}>
                            <Slot k="welcome_img" src={v('welcome_img')} label="픽업기사 웰컴카드 사진" editing={editing} alt="ウェルカムボード" />
                        </div>
                        <Lines k="welcome_side" text={v('welcome_side')} style={{ flex: '0 0 auto', paddingTop: 130, whiteSpace: 'pre-line', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#2b2b2b' }} />
                    </div>
                    <div style={{ marginTop: 34, textAlign: 'center', fontSize: 27, lineHeight: 1.5, fontWeight: 700, letterSpacing: '-0.035em', color: '#2b2b2b' }}><span data-df="welcome_caption">{v('welcome_caption')}</span></div>
                </div>
            </section>

            {/* ── 13 1일차 상세 ─────────────────────────────── */}
            <section style={{ position: 'relative', background: '#EFFEF9', padding: '60px 0 90px' }}>
                <div style={{ position: 'relative', height: 470, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: '#DFFFF4' }}>
                        <Slot k="d1_hero_img" src={v('d1_hero_img')} label="1일차 초원 사진" editing={editing} alt="草原" />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,51,46,0.62) 0%, rgba(0,51,46,0.22) 55%, rgba(0,51,46,0.1) 100%)' }} />
                    <div style={{ position: 'relative', pointerEvents: 'none', padding: '56px 60px 0' }}>
                        <h2 style={{ margin: 0, fontSize: 46, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}><span data-df="d1_title">{v('d1_title')}</span></h2>
                        <div style={{ marginTop: 38, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, wordBreak: 'keep-all' }}>
                            {tabs.map((t, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: i === 0 ? 1 : 0.72 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {i === 0
                                            ? <div style={{ width: 14, height: 14, borderRadius: '50%', background: MINT, boxShadow: '0 0 0 4px rgba(255,255,255,0.45)' }} />
                                            : <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(255,255,255,0.85)' }} />}
                                        <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}><span data-df={`tab${i + 1}_label`}>{t.label}</span></div>
                                    </div>
                                    <div style={{ fontSize: 19, fontWeight: i === 0 ? 700 : 600, color: '#fff', letterSpacing: '-0.02em' }}><span data-df={`tab${i + 1}_text`}>{t.text}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ margin: '-70px 40px 0', position: 'relative', background: '#fff', borderRadius: 40, boxShadow: '0 24px 60px rgba(0,51,46,0.10)', padding: '60px 56px 66px', wordBreak: 'keep-all' }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: DEEP, letterSpacing: '-0.03em' }}><span data-df="d1_kicker">{v('d1_kicker')}</span></div>
                    <h3 style={{ margin: '16px 0 0', fontSize: 46, fontWeight: 800, letterSpacing: '-0.045em', color: TEAL }}><span data-df="d1_head">{v('d1_head')}</span></h3>
                    <Lines k="d1_body" text={v('d1_body')} style={{ margin: '34px 0 0', fontSize: 23, lineHeight: 1.75, fontWeight: 500, color: '#4a4a4a', letterSpacing: '-0.02em', textWrap: 'pretty' } as React.CSSProperties} />

                    <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} style={{ position: 'relative', height: 250, borderRadius: 18, overflow: 'hidden', background: '#EFFEF9' }}>
                                <Slot k={`d1_img${n}`} src={v(`d1_img${n}`)} label={`1일차 사진 ${n}`} editing={editing} alt="1日目" />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 52, display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 44 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <SectionDot />
                                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}><span data-df="d1_route_title">{v('d1_route_title')}</span></div>
                            </div>
                            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {schedule.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 20 }}>
                                        <div style={{ flex: '0 0 82px', fontSize: 21, fontWeight: 800, color: TEAL, letterSpacing: '-0.02em' }}><span data-df={`d1_t${i + 1}`}>{s.time}</span></div>
                                        <Lines k={`d1_e${i + 1}`} text={s.body} style={{ fontSize: 21, lineHeight: 1.55, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <SectionDot />
                                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>식사정보</div>
                                </div>
                                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 21, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em' }}>
                                    <div>조식 <span style={{ color: '#C8FFEF' }}>|</span> <span data-df="d1_meal_b">{v('d1_meal_b')}</span></div>
                                    <div>중식 <span style={{ color: '#C8FFEF' }}>|</span> <span data-df="d1_meal_l">{v('d1_meal_l')}</span></div>
                                    <div>석식 <span style={{ color: '#C8FFEF' }}>|</span> <span data-df="d1_meal_d">{v('d1_meal_d')}</span></div>
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <SectionDot />
                                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>숙박정보</div>
                                </div>
                                <div style={{ marginTop: 20, fontSize: 21, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em' }}><span data-df="d1_stay">{v('d1_stay')}</span></div>
                                <div data-df="d1_stay_tags" style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '10px 22px', fontSize: 19, fontWeight: 600, color: TEAL, letterSpacing: '-0.02em' }}>
                                    {v('d1_stay_tags').split('\n').map(s => s.trim()).filter(Boolean).map((t, i) => <div key={i}>{t}</div>)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 48, height: 1, background: '#EFFEF9' }} />
                    <div style={{ marginTop: 36 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <SectionDot />
                            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>포함체험 / 즐길거리</div>
                        </div>
                        <div style={{ marginTop: 18, fontSize: 21, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em' }}><span data-df="d1_exp">{v('d1_exp')}</span></div>
                    </div>
                </div>
            </section>
        </div>
    );
}
