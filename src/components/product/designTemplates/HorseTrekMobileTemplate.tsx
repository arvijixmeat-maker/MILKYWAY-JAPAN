import React from 'react';
import type { DesignTemplateProps } from './types';

/**
 * 「몽골 승마 트레킹 상세페이지 (모바일)」 — Claude Design(몽골 승마 트레킹 상세페이지 (모바일).dc.html)을
 * React로 이식한 430px 고정폭 디자인. 데스크톱(HorseTrekTemplate)과 같은 필드 매니페스트를 공유한다.
 * 폰트 크기·간격은 디자인 원본 수치를 그대로 사용한다 (일괄 축소가 아니라 모바일 전용으로 다듬어진 값).
 */

const MINT = '#06C4A0';
const DEEP = '#00332E';
const TEAL = '#029F85';

function Slot({ src, label, editing, alt }: { src: string; label: string; editing?: boolean; alt: string }) {
    if (src) {
        return <img src={src} alt={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" />;
    }
    if (editing) {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(2,159,133,0.55)', borderRadius: 'inherit', color: TEAL, fontSize: 12, fontWeight: 700, textAlign: 'center', padding: 8, boxSizing: 'border-box', background: 'rgba(6,196,160,0.06)' }}>
                {label}
            </div>
        );
    }
    return null;
}

/** \n 줄바꿈을 그대로 표시하는 문단 */
function Lines({ text, style }: { text: string; style?: React.CSSProperties }) {
    return <div style={{ whiteSpace: 'pre-line', ...style }}>{text}</div>;
}

function SectionDot() {
    return <div style={{ width: 17, height: 17, borderRadius: '50%', background: MINT, flex: 'none' }} />;
}

export default function HorseTrekMobileTemplate({ v, editing }: DesignTemplateProps) {
    const opBgs = [v('op_bg1'), v('op_bg2'), v('op_bg3')].filter(Boolean);
    const mapStops = v('map_stops').split('\n').map(s => s.trim()).filter(Boolean).join(';');
    const mapUrl = `/designs/mongolia-map.html?stops=${encodeURIComponent(mapStops)}`;

    const dayCards = [1, 2, 3, 4, 5].map(n => ({
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
        <div className="htm-design" style={{ width: 430, margin: '0 auto', background: '#fff', color: '#2b2b2b', overflow: 'hidden', fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", -apple-system, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
            <style>{`
                .htm-design .htm-scroll::-webkit-scrollbar { display: none; }
                @keyframes htmBgCycle {
                    0% { opacity:1; } 28% { opacity:1; } 38% { opacity:0; }
                    90% { opacity:0; } 100% { opacity:1; }
                }
                @keyframes htmShoot {
                    0% { top:-90px; opacity:0; }
                    8% { opacity:1; }
                    34% { opacity:0.9; }
                    40% { top:100%; opacity:0; }
                    100% { top:100%; opacity:0; }
                }
                .htm-design .htm-bubble { position:relative; }
                .htm-design .htm-bubble::after {
                    content:''; position:absolute; bottom:-7px; width:0; height:0;
                    border-top:18px solid #F1F1F1;
                }
                .htm-design .htm-bubble.tail-left::after { left:13px; border-right:22px solid transparent; }
                .htm-design .htm-bubble.tail-right::after { right:13px; border-left:22px solid transparent; }
            `}</style>

            {/* ── 01 오프닝 ─────────────────────────────────── */}
            <section style={{ position: 'relative', height: 540, overflow: 'hidden', background: DEEP }}>
                {opBgs.length > 0 ? opBgs.map((src, i) => (
                    <img key={i} src={src} alt="" style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                        filter: 'brightness(0.42) saturate(0.85) hue-rotate(-6deg)',
                        opacity: i === 0 ? 1 : 0,
                        animation: opBgs.length > 1 ? `htmBgCycle 21s ease-in-out ${-(21 / opBgs.length) * i}s infinite` : undefined,
                    }} loading="lazy" decoding="async" />
                )) : (editing && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700 }}>
                        오프닝 배경 사진 1~3을 업로드하세요
                    </div>
                ))}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,51,46,0.78) 0%, rgba(0,51,46,0.18) 45%, rgba(0,30,26,0.88) 100%)' }} />
                <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '75px 0 35px', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.62)' }}>{v('op_line1')}</div>
                    <div style={{ position: 'relative', overflow: 'hidden', width: 1, flex: 1, margin: '13px 0', background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.15))' }}>
                        <div style={{ position: 'absolute', left: -1, width: 2, height: 85, borderRadius: 2, background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 70%, #fff 100%)', boxShadow: '0 0 14px rgba(255,255,255,0.75)', animation: 'htmShoot 3.4s cubic-bezier(.55,.06,.2,1) infinite' }} />
                    </div>
                    <div style={{ fontSize: 41, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>{v('op_line2')}</div>
                    <div style={{ marginTop: 'auto', paddingTop: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontStyle: 'italic', fontWeight: 800, lineHeight: 1.05, color: '#fff', letterSpacing: '0.02em' }}>
                        <div style={{ fontSize: 14 }}>MILKY WAY</div>
                        <div style={{ fontSize: 14 }}>MONGOLIA</div>
                        <div style={{ marginTop: 4, width: 60, height: 1, background: 'rgba(255,255,255,0.5)' }} />
                    </div>
                </div>
            </section>

            {/* ── 02 별하늘 히어로 ──────────────────────────── */}
            <section style={{ position: 'relative', background: '#02100E', overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: 480, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: '#02100E' }}>
                        <Slot src={v('hero_bg')} label="은하수 아래 게르 (야경 사진)" editing={editing} alt="銀河の下のゲル" />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(2,16,14,0.86) 0%, rgba(2,16,14,0.5) 34%, rgba(2,16,14,0.12) 58%, rgba(2,16,14,0.4) 100%)' }} />
                    <div style={{ position: 'relative', padding: '48px 30px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.86)' }}>{v('hero_kicker')}</div>
                        <h2 style={{ margin: '20px 0 0', fontSize: 45, lineHeight: 1.14, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}>{v('hero_title')}</h2>
                        <Lines text={v('hero_body')} style={{ margin: '22px 0 0', fontSize: 14, lineHeight: 1.75, fontWeight: 600, letterSpacing: '-0.015em', color: 'rgba(255,255,255,0.8)', textShadow: '0 2px 18px rgba(0,0,0,0.5)' }} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: '#02100E' }}>
                    <div style={{ position: 'relative', height: 145, overflow: 'hidden', background: '#061F1B' }}>
                        <Slot src={v('hero_img1')} label="밤 캠프 사진" editing={editing} alt="夜のキャンプ" />
                    </div>
                    <div style={{ position: 'relative', height: 145, overflow: 'hidden', background: '#061F1B' }}>
                        <Slot src={v('hero_img2')} label="별 관측 사진" editing={editing} alt="星空観賞" />
                        <div style={{ position: 'absolute', right: 13, bottom: 11, pointerEvents: 'none', fontStyle: 'italic', fontWeight: 800, lineHeight: 1.05, fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'right', letterSpacing: '0.02em' }}>
                            <div>MILKY WAY</div>
                            <div>MONGOLIA</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 03 소개 배너 ──────────────────────────────── */}
            <section style={{ position: 'relative', height: 500, overflow: 'hidden', background: DEEP }}>
                <Slot src={v('intro_bg')} label="산맥 아래 초원 사진" editing={editing} alt="山脈の下の草原" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(0,51,46,0.78) 0%, rgba(0,51,46,0.46) 60%, rgba(0,51,46,0.24) 100%)' }} />
                <div style={{ position: 'relative', padding: '60px 35px', color: '#fff' }}>
                    <h2 style={{ margin: 0, fontSize: 34, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.045em', textShadow: '0 3px 20px rgba(0,0,0,0.3)' }}>{v('intro_title')}</h2>
                    <Lines text={v('intro_body')} style={{ margin: '19px 0 0', fontSize: 16, lineHeight: 1.62, fontWeight: 600, letterSpacing: '-0.02em', textShadow: '0 2px 14px rgba(0,0,0,0.35)', textWrap: 'pretty' } as React.CSSProperties} />
                </div>
            </section>

            {/* ── 04 이용자 특전 ────────────────────────────── */}
            <section style={{ background: '#fff', padding: '50px 20px 55px' }}>
                <h2 style={{ margin: 0, textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: '-0.05em', color: DEEP }}>{v('perks_title')}</h2>
                <div style={{ margin: '11px 0 0', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#5a5a5a', letterSpacing: '-0.02em' }}>{v('perks_sub')}</div>

                <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                        <div key={n} style={{ position: 'relative', height: 125, borderRadius: 10, overflow: 'hidden', background: '#EFFEF9' }}>
                            <Slot src={v(`perk${n}_img`)} label={`특전 ${n} 사진`} editing={editing} alt={v(`perk${n}_title`)} />
                            <div style={{ position: 'absolute', inset: 'auto 0 0 0', pointerEvents: 'none', padding: '13px 8px 11px', background: 'linear-gradient(180deg, rgba(0,51,46,0) 0%, rgba(0,51,46,0.72) 100%)', textAlign: 'center', color: '#fff', wordBreak: 'keep-all' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em' }}>{v(`perk${n}_title`)}</div>
                                <div style={{ marginTop: 3, fontSize: 13, fontWeight: 600, letterSpacing: '-0.02em' }}>{v(`perk${n}_sub`)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'stretch', border: '1px solid #C8FFEF', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ position: 'relative', minHeight: 125, background: '#EFFEF9' }}>
                        <Slot src={v('perk_air_img')} label="공항 사진" editing={editing} alt="空港" />
                    </div>
                    <div style={{ padding: '22px 17px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 13, textAlign: 'center', wordBreak: 'keep-all', textWrap: 'pretty' } as React.CSSProperties}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: DEEP, letterSpacing: '-0.02em' }}>{v('perk_air_title')}</div>
                        <Lines text={v('perk_air_note')} style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 600, color: '#5a5a5a', letterSpacing: '-0.02em' }} />
                    </div>
                </div>
            </section>

            {/* ── 05 여행 고민 (말풍선) ─────────────────────── */}
            <section style={{ background: '#fff', padding: '55px 25px 60px', wordBreak: 'keep-all' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: '#9a9a9a' }}>{v('worry_kicker')}</div>
                    <h2 style={{ margin: '7px 0 0', fontSize: 24, fontWeight: 800, letterSpacing: '-0.05em', color: '#2b2b2b' }}>{v('worry_title')}</h2>
                </div>
                <div style={{ marginTop: 35, display: 'flex', flexDirection: 'column', gap: 17 }}>
                    {([
                        { key: 'worry1', align: 'center', tail: 'tail-left', max: 310, size: 14 },
                        { key: 'worry2', align: 'flex-start', tail: 'tail-right', max: 330, size: 13 },
                        { key: 'worry3', align: 'flex-start', tail: 'tail-right', max: 320, size: 14 },
                        { key: 'worry4', align: 'flex-end', tail: 'tail-left', max: 340, size: 13 },
                        { key: 'worry5', align: 'center', tail: 'tail-left', max: 300, size: 14 },
                    ] as const).map(b => (
                        <div key={b.key} style={{ display: 'flex', justifyContent: b.align }}>
                            <div className={`htm-bubble ${b.tail}`} style={{ maxWidth: b.max, padding: '12px 17px', borderRadius: 11, background: '#F1F1F1', fontSize: b.size, lineHeight: 1.45, fontWeight: 600, letterSpacing: '-0.03em', color: '#3a3a3a', whiteSpace: 'pre-line' }}>
                                {v(b.key)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 06 숙소 ──────────────────────────────────── */}
            <section style={{ background: '#fff', padding: '50px 20px 48px', wordBreak: 'keep-all' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: MINT, letterSpacing: '-0.02em' }}>{v('ger_kicker')}</div>
                    <div style={{ marginTop: 7, fontSize: 17, fontWeight: 600, color: '#5a5a5a', letterSpacing: '-0.03em' }}>{v('ger_sub')}</div>
                    <h2 style={{ margin: '10px 0 0', fontSize: 29, lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.045em', color: DEEP }}>
                        <div style={{ fontSize: 27 }}>{v('ger_title1')}</div>
                        <div style={{ color: TEAL }}>{v('ger_title2')}</div>
                    </h2>
                </div>
                <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} style={{ position: 'relative', height: 140, borderRadius: 8, overflow: 'hidden', background: '#EFFEF9' }}>
                            <Slot src={v(`ger_img${n}`)} label={`숙소 사진 ${n}`} editing={editing} alt="高級ゲル" />
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 19, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px' }}>
                    {[v('ger_check1'), v('ger_check2'), v('ger_check3')].filter(Boolean).map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>
                            <div style={{ color: MINT }}>✓</div>
                            <div>{c}</div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#5a5a5a', letterSpacing: '-0.02em' }}>{v('ger_note')}</div>
            </section>

            {/* ── 07 루트 소개 + 지도 ───────────────────────── */}
            <section style={{ position: 'relative', background: 'linear-gradient(180deg, #C8FFEF 0%, #EFFEF9 32%, #EFFEF9 100%)', paddingBottom: 45 }}>
                <div style={{ padding: '55px 35px 30px', textAlign: 'center' }}>
                    <div style={{ fontSize: 19, color: MINT, letterSpacing: '0.2em' }}>✦</div>
                    <h2 style={{ margin: '9px 0 0', fontSize: 29, lineHeight: 1.32, fontWeight: 800, letterSpacing: '-0.04em', color: '#2b2b2b' }}>{v('route_intro_title')}</h2>
                    <Lines text={v('route_intro_p1')} style={{ margin: '23px 0 0', fontSize: 14, lineHeight: 1.75, fontWeight: 500, color: '#4a4a4a', letterSpacing: '-0.02em' }} />
                    <Lines text={v('route_intro_p2')} style={{ margin: '19px 0 0', fontSize: 14, lineHeight: 1.75, fontWeight: 500, color: '#4a4a4a', letterSpacing: '-0.02em' }} />
                </div>

                <div style={{ position: 'relative', height: 210, overflow: 'hidden', background: '#DFFFF4' }}>
                    <Slot src={v('route_wide_img')} label="와이드 사진 (계곡에서 쉬는 일행)" editing={editing} alt="渓谷で休む一行" />
                </div>

                <div style={{ margin: '-30px 20px 0', position: 'relative', background: '#fff', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,51,46,0.10)', padding: '35px 28px 38px' }}>
                    <h3 style={{ margin: 0, textAlign: 'center', fontSize: 34, lineHeight: 1.4, fontWeight: 800, letterSpacing: '-0.035em', color: '#2b2b2b' }}>{v('route_card_title')}</h3>

                    <div style={{ margin: '28px 0 32px', display: 'flex', justifyContent: 'center' }}>
                        <iframe src={mapUrl} title="몽골 지도 위 여정 지점" scrolling="no" style={{ width: '100%', maxWidth: 380, aspectRatio: '760/990', border: 0, display: 'block' }} loading="lazy" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.035em', color: DEEP }}>{v('spots_label')}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEAL, letterSpacing: '-0.02em' }}>{v('spots_hint')}</div>
                    </div>
                    <div className="htm-scroll" style={{ margin: '10px -28px 0 0', display: 'flex', alignItems: 'flex-start', gap: 11, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '2px 28px 8px 0' } as React.CSSProperties}>
                        {dayCards.map((c, i) => (
                            <div key={i} style={{ flex: '0 0 150px', marginTop: c.offset ? 17 : 0, scrollSnapAlign: 'start', background: '#fff', borderRadius: 13, boxShadow: '0 14px 34px rgba(0,51,46,0.10)', overflow: 'hidden' }}>
                                <div style={{ position: 'relative', height: 95, background: '#C8FFEF' }}>
                                    <Slot src={c.img} label={`${c.badge} 사진`} editing={editing} alt={c.title} />
                                    <div style={{ position: 'absolute', top: 7, left: 7, pointerEvents: 'none', padding: '4px 8px', borderRadius: 999, background: MINT, color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em' }}>{c.badge}</div>
                                </div>
                                <div style={{ padding: '11px 12px 14px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>{c.title}</div>
                                    <Lines text={c.body} style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, fontWeight: 500, color: '#5a5a5a', letterSpacing: '-0.02em' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 09 고비 히어로 ────────────────────────────── */}
            <section style={{ position: 'relative', height: 590, overflow: 'hidden', background: '#0A6558' }}>
                <div style={{ position: 'absolute', inset: 0, background: '#0E5349' }}>
                    <Slot src={v('gobi_hero_img')} label="고비 히어로 배경 사진" editing={editing} alt="ゴビ" />
                </div>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.35) 100%)' }} />
                <div style={{ position: 'relative', pointerEvents: 'none', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 30px 40px', boxSizing: 'border-box', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', textShadow: '0 2px 14px rgba(0,0,0,0.4)' }}>{v('gobi_kicker')}</div>
                    <h2 style={{ margin: '13px 0 0', fontSize: 34, lineHeight: 1.18, fontWeight: 800, letterSpacing: '-0.045em', color: '#fff', textShadow: '0 3px 22px rgba(0,0,0,0.45)' }}>{v('gobi_title')}</h2>
                    <div style={{ marginTop: 7, width: 260, height: 3, borderRadius: 2, background: MINT }} />
                    <Lines text={v('gobi_body')} style={{ margin: '17px 0 0', fontSize: 21, lineHeight: 1.42, fontWeight: 700, letterSpacing: '-0.035em', color: '#fff', textShadow: '0 2px 18px rgba(0,0,0,0.45)' }} />
                </div>
            </section>

            {/* ── 10 하이라이트 ─────────────────────────────── */}
            <section style={{ background: '#fff', padding: '48px 30px 50px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ flex: 1, height: 1, background: '#e6e6e6' }} />
                    <div style={{ flex: '0 0 5px', height: 5, borderRadius: '50%', background: MINT }} />
                    <div style={{ padding: '8px 22px', border: '1px solid #91FEE0', borderRadius: 999, fontSize: 20, fontWeight: 800, letterSpacing: '-0.035em', color: '#2b2b2b' }}>{v('hl_title')}</div>
                    <div style={{ flex: '0 0 5px', height: 5, borderRadius: '50%', background: MINT }} />
                    <div style={{ flex: 1, height: 1, background: '#e6e6e6' }} />
                </div>
                <div style={{ marginTop: 11, textAlign: 'right', fontSize: 13, fontWeight: 600, color: TEAL, letterSpacing: '-0.02em' }}>{v('hl_hint')}</div>
                <div className="htm-scroll" style={{ margin: '11px -30px 0 0', display: 'flex', alignItems: 'flex-start', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '2px 30px 6px 0' } as React.CSSProperties}>
                    {points.map((p, i) => (
                        <div key={i} style={{ flex: '0 0 170px', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                            <div style={{ position: 'relative', flex: '0 0 125px', height: 125, borderRadius: 14, overflow: 'hidden', background: '#C8FFEF' }}>
                                <Slot src={p.img} label={`포인트 ${i + 1} 사진`} editing={editing} alt={p.caption} />
                                <div style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none', width: 22, height: 22, borderRadius: '50%', background: MINT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{i + 1}</div>
                            </div>
                            <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, lineHeight: 1.45, letterSpacing: '-0.025em', color: '#3a3a3a' }}>{p.caption}</div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: MINT, lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: '-0.04em', color: DEEP }}>{v('and_word')}</div>
                    <div style={{ width: 1, height: 44, background: `linear-gradient(180deg, ${MINT}, rgba(6,196,160,0))` }} />
                </div>
            </section>

            {/* ── 11 은하수 ─────────────────────────────────── */}
            <section style={{ position: 'relative', height: 360, overflow: 'hidden', background: DEEP }}>
                <div style={{ position: 'absolute', inset: 0, background: '#0E5349' }}>
                    <Slot src={v('mw_img')} label="은하수 사진" editing={editing} alt="天の川" />
                </div>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,51,46,0.35) 0%, rgba(0,51,46,0) 45%, rgba(0,51,46,0.78) 100%)' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 65, pointerEvents: 'none', textAlign: 'center', color: '#fff', fontSize: 31, lineHeight: 1.6, fontWeight: 600, letterSpacing: '-0.02em', textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>{v('mw_caption')}</div>
            </section>

            {/* ── 12 공항 도착 ──────────────────────────────── */}
            <section style={{ background: '#fff', padding: '50px 0 0', wordBreak: 'keep-all' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.04em', color: '#c9c9c9' }}>{v('arr_from')}</div>
                    <div style={{ marginTop: 11, width: 2, height: 39, background: MINT }} />
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: MINT, boxShadow: '0 0 0 6px rgba(6,196,160,0.22)' }} />
                    <div style={{ marginTop: 17, fontSize: 33, fontWeight: 800, letterSpacing: '-0.05em', color: DEEP }}>{v('arr_to')}</div>
                </div>

                <div style={{ marginTop: 28, position: 'relative', height: 260, background: '#EFFEF9' }}>
                    <Slot src={v('arr_img')} label="칭기스칸 공항 사진" editing={editing} alt="チンギス・ハーン国際空港" />
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 18%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.7) 88%, #fff 100%)' }} />
                </div>

                <div style={{ padding: '0 30px' }}>
                    <Lines text={v('arr_lead')} style={{ textAlign: 'center', fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', color: '#2b2b2b' }} />
                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                        <Lines text={v('arr_body')} style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.035em', color: '#2b2b2b', textAlign: 'center' }} />
                    </div>
                </div>

                <div style={{ marginTop: 28, padding: '22px 30px', background: '#C8FFEF', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.035em', color: DEEP }}>{v('arr_band1')}</div>
                    <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, letterSpacing: '-0.035em', color: '#0A6558' }}>{v('arr_band2')}</div>
                </div>

                <div style={{ padding: '35px 30px 50px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 10 }}>
                        <div style={{ position: 'relative', flex: '0 0 235px', height: 215, background: '#EFFEF9', borderRadius: 3, overflow: 'hidden' }}>
                            <Slot src={v('welcome_img')} label="픽업기사 웰컴카드 사진" editing={editing} alt="ウェルカムボード" />
                        </div>
                        <Lines text={v('welcome_side')} style={{ flex: '0 0 auto', paddingTop: 65, whiteSpace: 'pre-line', fontSize: 13, fontWeight: 700, letterSpacing: '-0.03em', color: '#2b2b2b' }} />
                    </div>
                    <div style={{ marginTop: 17, textAlign: 'center', fontSize: 15, lineHeight: 1.5, fontWeight: 700, letterSpacing: '-0.035em', color: '#2b2b2b' }}>{v('welcome_caption')}</div>
                </div>
            </section>

            {/* ── 13 1일차 상세 ─────────────────────────────── */}
            <section style={{ position: 'relative', background: '#EFFEF9', padding: '30px 0 45px' }}>
                <div style={{ position: 'relative', height: 235, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: '#DFFFF4' }}>
                        <Slot src={v('d1_hero_img')} label="1일차 초원 사진" editing={editing} alt="草原" />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,51,46,0.62) 0%, rgba(0,51,46,0.22) 55%, rgba(0,51,46,0.1) 100%)' }} />
                    <div style={{ position: 'relative', pointerEvents: 'none', padding: '28px 30px 0' }}>
                        <h2 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}>{v('d1_title')}</h2>
                        <div style={{ marginTop: 19, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, wordBreak: 'keep-all' }}>
                            {tabs.map((t, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: i === 0 ? 1 : 0.72 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        {i === 0
                                            ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: MINT, boxShadow: '0 0 0 4px rgba(255,255,255,0.45)' }} />
                                            : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.85)' }} />}
                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{t.label}</div>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 600, color: '#fff', letterSpacing: '-0.02em' }}>{t.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ margin: '-35px 20px 0', position: 'relative', background: '#fff', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,51,46,0.10)', padding: '30px 28px 33px', wordBreak: 'keep-all' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: DEEP, letterSpacing: '-0.03em' }}>{v('d1_kicker')}</div>
                    <h3 style={{ margin: '8px 0 0', fontSize: 25, fontWeight: 800, letterSpacing: '-0.045em', color: TEAL }}>{v('d1_head')}</h3>
                    <Lines text={v('d1_body')} style={{ margin: '17px 0 0', fontSize: 13, lineHeight: 1.75, fontWeight: 500, color: '#4a4a4a', letterSpacing: '-0.02em', textWrap: 'pretty' } as React.CSSProperties} />

                    <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} style={{ position: 'relative', height: 125, borderRadius: 9, overflow: 'hidden', background: '#EFFEF9' }}>
                                <Slot src={v(`d1_img${n}`)} label={`1일차 사진 ${n}`} editing={editing} alt="1日目" />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 22 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <SectionDot />
                                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>{v('d1_route_title')}</div>
                            </div>
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {schedule.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10 }}>
                                        <div style={{ flex: '0 0 41px', fontSize: 13, fontWeight: 800, color: TEAL, letterSpacing: '-0.02em' }}>{s.time}</div>
                                        <Lines text={s.body} style={{ fontSize: 13, lineHeight: 1.55, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <SectionDot />
                                    <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>식사정보</div>
                                </div>
                                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em' }}>
                                    <div>조식 <span style={{ color: '#C8FFEF' }}>|</span> {v('d1_meal_b')}</div>
                                    <div>중식 <span style={{ color: '#C8FFEF' }}>|</span> {v('d1_meal_l')}</div>
                                    <div>석식 <span style={{ color: '#C8FFEF' }}>|</span> {v('d1_meal_d')}</div>
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <SectionDot />
                                    <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>숙박정보</div>
                                </div>
                                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em' }}>{v('d1_stay')}</div>
                                <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: '5px 11px', fontSize: 13, fontWeight: 600, color: TEAL, letterSpacing: '-0.02em' }}>
                                    {v('d1_stay_tags').split('\n').map(s => s.trim()).filter(Boolean).map((t, i) => <div key={i}>{t}</div>)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 24, height: 1, background: '#EFFEF9' }} />
                    <div style={{ marginTop: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <SectionDot />
                            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em', color: DEEP }}>포함체험 / 즐길거리</div>
                        </div>
                        <div style={{ marginTop: 9, fontSize: 13, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em' }}>{v('d1_exp')}</div>
                    </div>
                </div>
            </section>
        </div>
    );
}
