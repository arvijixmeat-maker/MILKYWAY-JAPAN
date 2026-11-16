import React, { useState } from 'react';
import { C, COMPANY, IC, STAY_ROWS, BAD_STAY, STAY_FILM, STAY_SELECT, STAY_TILES_TOP, STAY_TILES_BOTTOM, TEAM, TEAM_ASSIGN, ORBIT_POS, ACT_RULES, RIDE_TIPS, CERTS, CERT_TAGS } from './tripDocContent';
import { Photo, Svg, SectionHead, BigLine, ChipTitle, Gap, Band, Dots } from './tripDocUi';
import { anton, inter } from './tripDocStyle';
import type { TripDoc } from './tripDocModel';
import type { TripImages, QuoteSpecial } from './tripDocSources';

/**
 * 견적서 공통 섹션 — 숙소 · 팀 · 식사 · 안전 · 공항 미팅 · 인허가 · 문의.
 * 사진은 관광지·호텔 마스터와 회사소개 사진에서 자동으로 고른다 (tripDocSources.resolveTripImages).
 */
interface Props {
    doc: TripDoc;
    images: TripImages;
    reduce: boolean;
    specials: QuoteSpecial[];
    legal?: React.ReactNode;
}

const sec: React.CSSProperties = { position: 'relative', padding: '32px 20px 36px', display: 'flex', flexDirection: 'column', gap: 24, scrollMarginTop: 56, overflow: 'hidden' };
const gradNum: React.CSSProperties = { ...inter, fontWeight: 700, background: C.gradText, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
const glow = (size: number, off: number): React.CSSProperties => ({ position: 'absolute', right: off, top: off, width: size, height: size, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,196,160,0.38) 0%,rgba(6,196,160,0) 70%)', pointerEvents: 'none' });

export const TripDocCompany: React.FC<Props> = ({ doc, images, reduce, specials, legal }) => {
    const img = (slot: string) => images.slots[slot] || '';
    const [filmHold, setFilmHold] = useState(false);
    const [spIdx, setSpIdx] = useState(0);
    const premium = doc.q.stayGrade !== 'standard';
    const stayLine = doc.q.stayLine || doc.q.stayLabel || (premium ? 'ホテル + 高級ゲル' : 'ホテル + スタンダードゲル');
    const anim = (name: string) => (reduce ? 'none' : name);
    const float = (i: number, base = 5) => anim(`${i % 2 ? 'qFloat2' : 'qFloat'} ${(base + (i % 3) * 0.8).toFixed(1)}s ease-in-out ${(-i * 0.7).toFixed(1)}s infinite`);

    // 식사 원형 7장 — 특별 요리 + 공통 식사 사진
    const sp = (i: number) => specials[i] ? { img: specials[i].image, t: specials[i].name } : null;
    const lf = (i: number) => images.localFoods[i] ? { img: images.localFoods[i].img, t: images.localFoods[i].t } : null;
    const orbit = [sp(2) || lf(2) || { img: img('quote-meal-2'), t: '現地料理' }, { img: img('quote-meal-1'), t: 'キャンプの朝食' }, sp(0) || lf(0) || { img: img('quote-meal-3'), t: '特別料理' }, { img: img('quote-meal-3'), t: '特別料理' }, sp(1) || lf(1) || { img: img('quote-meal-2'), t: '現地料理' }, { img: img('quote-meal-2'), t: '現地料理' }, sp(3) || lf(3) || { img: img('quote-meal-1'), t: 'キャンプの朝食' }];
    const spN = specials.length;
    const spI = spN ? ((spIdx % spN) + spN) % spN : 0;

    const tilesRow = (list: ReadonlyArray<readonly [string, number]>) => (
        <div style={{ display: 'flex', gap: 10, paddingRight: 10, height: '100%', flexShrink: 0 }}>
            {list.map(([slot, w]) => {
                const meta = { 'stay-tile-1': 'ゲル内部', 'stay-tile-2': '寝室', 'stay-tile-3': 'ゲルキャンプ全景', 'stay-tile-4': 'バスルーム', 'stay-tile-5': 'ラウンジ', 'stay-tile-6': '夜景', 'stay-tile-7': '朝食', 'stay-tile-8': 'テラス' } as Record<string, string>;
                return <div key={slot} style={{ position: 'relative', flex: `0 0 ${w}px`, height: '100%', overflow: 'hidden', background: '#1C4A48' }}><Photo src={img(slot)} placeholder={meta[slot]} /></div>;
            })}
        </div>
    );

    return (
        <>
            {/* ─── 07 Stays ─── */}
            <Band dark reduce={reduce} />
            <section id="q-stay" style={sec}>
                <div style={{ position: 'relative', margin: '-32px -20px 0', height: 680, overflow: 'hidden', backgroundColor: C.ink, backgroundImage: 'radial-gradient(ellipse at 50% 55%,#1E5A55 0%,#123B3A 58%,#0C2B2A 100%)', color: '#FFFFFF' }}>
                    <div style={{ position: 'absolute', left: 0, top: 20, height: 150, display: 'flex', width: 'max-content', animation: anim('qBand 40s linear infinite') }}>{tilesRow(STAY_TILES_TOP)}{tilesRow(STAY_TILES_TOP)}</div>
                    <div style={{ position: 'absolute', left: 0, bottom: 20, height: 150, display: 'flex', width: 'max-content', animation: anim('qRowR 46s linear infinite') }}>{tilesRow(STAY_TILES_BOTTOM)}{tilesRow(STAY_TILES_BOTTOM)}</div>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 190, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', pointerEvents: 'none' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.faint }}>旅の品質だけは決して妥協しません</span>
                        <span style={{ fontSize: 'clamp(30px,9cqw,46px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.05em', whiteSpace: 'nowrap' }}>モンゴリア天の川<br />宿泊施設の <span style={{ color: C.mintSoft }}>こだわり</span></span>
                    </div>
                    <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 418, transform: 'translateY(-50%)', overflow: 'hidden', pointerEvents: 'none' }}>
                        <div style={{ display: 'flex', width: 'max-content', ...anton, fontSize: 'clamp(60px,17cqw,96px)', lineHeight: 1, letterSpacing: '0.01em', animation: anim('qBand 22s linear infinite') }}>
                            {[0, 1].map(k => (
                                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 22, paddingRight: 22, flexShrink: 0 }}>
                                    {['GER CAMP', 'LUXURY', 'PRIVATE', 'STARLIGHT', 'GER CAMP', 'LUXURY', 'PRIVATE', 'STARLIGHT'].map((w, i) => (
                                        <span key={i} style={i % 2 ? { color: 'transparent', WebkitTextStroke: '1.2px rgba(255,255,255,0.85)' } : { color: '#FFFFFF' }}>{w}</span>
                                    ))}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div style={{ position: 'absolute', left: '50%', top: 418, zIndex: 2, width: 'min(46cqw,230px)', aspectRatio: '1/1', transform: 'translate(-50%,-50%)', borderRadius: '50%', overflow: 'hidden', background: '#1C4A48', boxShadow: '0 0 0 6px rgba(255,255,255,0.12),0 24px 40px rgba(0,0,0,0.4)' }}>
                        {['stay-hero-ger', 'stay-hero-2', 'stay-hero-3'].map((slot, i) => (
                            <div key={slot} style={{ position: 'absolute', inset: 0, opacity: reduce && i ? 0 : 1, animation: anim(`qStayFade 9s ease-in-out ${[0, -6, -3][i]}s infinite`) }}><Photo src={img(slot)} placeholder={`ゲル写真 ${i + 1}`} /></div>
                        ))}
                    </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 28, background: C.ink, color: '#FFFFFF', overflow: 'hidden' }}>
                    <span aria-hidden="true" style={glow(240, -70)} />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ alignSelf: 'flex-start', height: 24, padding: '0 10px', borderRadius: 999, background: C.grad, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>モンゴリア天の川</span>
                            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>設備がすべて揃っています</span>
                        </span>
                        <span style={{ ...inter, fontSize: 'clamp(46px,13cqw,68px)', fontWeight: 700, lineHeight: 0.85, letterSpacing: '-0.05em', color: C.mintPale }}>5<span style={{ fontSize: '0.42em', color: C.faint }}>/5</span></span>
                    </div>
                    <div onMouseEnter={() => setFilmHold(true)} onMouseLeave={() => setFilmHold(false)} style={{ position: 'relative', aspectRatio: '4/5', borderRadius: 20, overflow: 'hidden', background: '#0C2B2A' }}>
                        {STAY_FILM.map((f, i) => (
                            <div key={f.slot} style={{ position: 'absolute', inset: 0, opacity: reduce && i ? 0 : 1, visibility: reduce && i ? 'hidden' : 'visible', animation: anim(`qFilm 10s ease-in-out ${-i * 5}s infinite`), animationPlayState: filmHold ? 'paused' : 'running' }}>
                                <div style={{ position: 'absolute', inset: 0, animation: anim(`qFilmKen 5s ease-out ${i ? 5 : 0}s infinite`), animationPlayState: filmHold ? 'paused' : 'running' }}><Photo src={img(f.slot)} placeholder={`${f.name} 写真`} /></div>
                                <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(20,16,12,0.6) 0%,rgba(20,16,12,0.5) 50%,rgba(20,16,12,0.66) 100%)', pointerEvents: 'none' }} />
                                <div style={{ position: 'absolute', left: 16, right: 16, top: '50%', transform: 'translateY(-54%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, textAlign: 'center', pointerEvents: 'none' }}>
                                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 'clamp(40px,12cqw,62px)', fontWeight: 300, lineHeight: 1, color: '#F6F3EC' }}>{f.en}</span>
                                        <span style={{ fontFamily: "'Jost','Noto Sans JP',sans-serif", fontSize: 13, fontWeight: 300, letterSpacing: '0.06em', color: 'rgba(246,243,236,0.9)' }}>{f.name} · {i === 1 ? (premium ? '今回のご宿泊' : 'アップグレード可') : (premium ? 'スタンダード' : '今回のご宿泊')}</span>
                                    </span>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '24px 18px', width: '100%', maxWidth: 340 }}>
                                        {f.items.map(([d, k, v]) => (
                                            <span key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                <Svg d={d} size={26} stroke="#F6F3EC" sw={1.1} />
                                                <span style={{ fontFamily: "'Jost','Noto Sans JP',sans-serif", fontSize: 'clamp(15px,4.2cqw,18px)', fontWeight: 300, lineHeight: 1.35, color: '#F6F3EC' }}>{k}<br />{v}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div style={{ position: 'absolute', left: 18, right: 18, top: 16, display: 'flex', gap: 5, pointerEvents: 'none' }}>
                            {['qBar1', 'qBar2'].map(b => (
                                <span key={b} style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', background: '#FFFFFF', animation: anim(`${b} 10s linear infinite`), animationPlayState: filmHold ? 'paused' : 'running', width: reduce ? '100%' : undefined }} /></span>
                            ))}
                        </div>
                        <div style={{ position: 'absolute', left: 18, right: 18, top: 26, display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.08em', color: 'rgba(246,243,236,0.9)', pointerEvents: 'none' }}><span>MONGOLIA MILKY WAY</span><span>STAY</span></div>
                        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 16, display: 'flex', justifyContent: 'space-between', fontFamily: "'Jost',sans-serif", fontSize: 10, letterSpacing: '0.08em', color: 'rgba(246,243,236,0.85)', pointerEvents: 'none' }}><span>GER CAMP</span><span>PRIVATE TOUR</span></div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 12px 12px', borderRadius: 999, background: C.paper, marginTop: -8 }}>
                    <span style={{ display: 'flex', flexShrink: 0 }}>
                        {['quote-stay-tent', 'quote-stay-nomad'].map(slot => (
                            <span key={slot} style={{ position: 'relative', display: 'block', width: 48, height: 48, marginRight: -10, borderRadius: '50%', overflow: 'hidden', background: '#E6EFEC', boxShadow: `0 0 0 3px ${C.paper}`, filter: 'grayscale(0.8)' }}><Photo src={img(slot)} dark={false} /></span>
                        ))}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.mute }}>他社ツアー</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>テント · 遊牧民ゲル</span>
                    </span>
                    <span style={{ flexShrink: 0, display: 'flex', gap: 6 }}>
                        {[0, 1].map(j => {
                            const ok = STAY_ROWS.filter(([, v]) => !BAD_STAY.test(v[j])).length;
                            return <span key={j} style={{ height: 26, padding: '0 9px', borderRadius: 999, background: '#FDECEC', ...inter, fontSize: 11, fontWeight: 700, color: C.red, display: 'inline-flex', alignItems: 'center' }}>{ok} / {STAY_ROWS.length}</span>;
                        })}
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 16px 0', textAlign: 'center' }}>
                        <span style={{ fontSize: 'clamp(24px,7cqw,34px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', color: 'transparent', WebkitTextStroke: `1.2px ${C.mintBright}`, whiteSpace: 'nowrap' }}>他社ツアー vs</span>
                        <span style={{ fontSize: 'clamp(30px,9cqw,46px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.05em', color: C.mint, whiteSpace: 'nowrap' }}>モンゴリア天の川！</span>
                        <span style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: C.sub }}>同じモンゴル旅行でも<br />宿泊施設の設備に大きな差があります。</span>
                    </div>
                    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', background: '#4F5857', borderRadius: '20px 0 0 20px', color: '#E6EAE9', textAlign: 'center', padding: '22px 0 6px' }}>
                            <span style={{ padding: '0 12px', fontSize: 'clamp(15px,4.4cqw,19px)', fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.03em', color: '#F1F4F3' }}>他社ツアー<br />テント · 遊牧民ゲル</span>
                            <div style={{ position: 'relative', margin: '16px 14px 6px', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', background: '#646D6C', filter: 'grayscale(1) brightness(1.05)', opacity: 0.55 }}><Photo src={img('stay-cmp-theirs')} placeholder="テント · 遊牧民ゲル" /></div>
                            {STAY_ROWS.map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, minHeight: 76, padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.14)' }}>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: '#D3D8D7' }}>{k}</span>
                                    <span style={{ fontSize: 13, lineHeight: 1.45 }}>{v[0] === v[1] ? v[0] : `${v[0]} / ${v[1]}`}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: `2px solid ${C.mintBright}`, borderLeft: 0, borderRadius: '0 20px 20px 0', color: C.ink, textAlign: 'center', padding: '20px 0 4px', boxShadow: '0 16px 32px rgba(18,59,58,0.12)' }}>
                            <span style={{ padding: '0 12px', fontSize: 'clamp(15px,4.4cqw,19px)', fontWeight: 800, lineHeight: 1.35, letterSpacing: '-0.03em' }}>モンゴリア天の川<br />スタンダード · 高級ゲル</span>
                            <div style={{ position: 'relative', margin: '16px 14px 6px', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', background: C.mintBg }}><Photo src={img('stay-cmp-ours')} placeholder="天の川のゲル" dark={false} /></div>
                            {STAY_ROWS.map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, minHeight: 76, padding: '10px 12px', borderTop: '1px solid #E3ECE9' }}>
                                    <span style={{ fontSize: 14, fontWeight: 700 }}>{k}</span>
                                    <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.45, color: C.mintDeep }}>{v[2] === v[3] ? v[2] : `${v[2]} / ${v[3]}`}</span>
                                </div>
                            ))}
                        </div>
                        <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: 104, width: 40, height: 40, marginLeft: -20, borderRadius: '50%', background: '#FFFFFF', border: `2px solid ${C.mintBright}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...anton, fontSize: 15, color: C.mintDeep, zIndex: 2 }}>VS</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[['STANDARD', 'スタンダード', '3つ星ホテル + スタンダードゲル', !premium], ['PREMIUM', 'プレミアム', '4つ星ホテル + 高級ゲル', premium]].map(([en, ja, desc, ours]) => (
                            <div key={en as string} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px', borderRadius: 999, background: ours ? 'linear-gradient(135deg,#06C4A0 0%,#6CE3CC 100%)' : '#FFFFFF', border: ours ? 'none' : `1.5px solid ${C.mintLine}`, boxShadow: ours ? '0 10px 24px rgba(6,196,160,0.28)' : 'none' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: ours ? '#FFFFFF' : C.mintDeep }}>{en as string}</span>
                                    <strong style={{ fontSize: 15, fontWeight: 700, color: ours ? '#FFFFFF' : C.ink }}>{ours ? '今回のご宿泊' : ja as string}</strong>
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: ours ? '#FFFFFF' : C.body, textAlign: 'right' }}>{ours ? stayLine : desc as string}</span>
                            </div>
                        ))}
                    </div>
                    <span style={{ fontSize: 12, lineHeight: 1.7, color: C.sub }}>ゲルは3〜4名1室を基準に割り当てますが、キャンプごとの収容設備により客室の人数構成が多少異なる場合があります。</span>
                    <span style={{ fontSize: 11, lineHeight: 1.7, color: C.mute }}>* 高級ゲルのご予約でも、インフラが限られた一部地域ではキャンプの事情によりスタンダードゲルでの代替となる場合がございます。あらかじめご了承ください。</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.sub }}>モンゴリア天の川 現地旅行会社の</span>
                        <ChipTitle before="宿泊" chip="選定" after="基準" />
                    </span>
                    <div data-noscroll="" style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', margin: '0 -20px', padding: '4px 20px 8px', scrollPadding: '0 20px' }}>
                        {STAY_SELECT.map((s, i) => (
                            <div key={i} style={{ flex: '0 0 72%', maxWidth: 300, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 24, background: '#FFFFFF', border: `1px solid ${C.line}`, boxShadow: '0 6px 18px rgba(18,59,58,0.06)' }}>
                                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ ...gradNum, fontSize: 44, lineHeight: 0.85, letterSpacing: '-0.05em' }}>0{i + 1}</span>
                                    <span style={{ width: 40, height: 40, borderRadius: 12, background: C.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={s.icon} size={20} /></span>
                                </span>
                                <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.65 }}>{s.t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Gap />

            {/* ─── 08 Team ─── */}
            <section id="q-team" style={{ ...sec, gap: 26 }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: '30%' }}>
                    <span aria-hidden="true" style={{ position: 'absolute', right: -10, top: -18, ...gradNum, fontSize: 'clamp(130px,34cqw,220px)', lineHeight: 0.85, letterSpacing: '-0.06em', pointerEvents: 'none' }}>3+</span>
                    <span style={{ ...anton, fontSize: 'clamp(40px,12cqw,60px)', lineHeight: 0.95, marginBottom: 6 }}>MILKY WAY TEAM</span>
                    <span style={{ position: 'relative', fontSize: 'clamp(15px,4.2cqw,19px)', fontWeight: 500, letterSpacing: '-0.02em' }}>熟練の <strong style={{ fontWeight: 700 }}>天の川</strong> プロチーム</span>
                    <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 'clamp(32px,9.6cqw,52px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.04em', whiteSpace: 'nowrap' }}>
                        <span>最低</span><span style={{ padding: '2px 12px 6px', borderRadius: 14, background: C.ink, color: C.mintPale }}>3年</span><span>以上</span>
                    </span>
                </div>
                <div style={{ position: 'relative', paddingBottom: 28 }}>
                    <div style={{ position: 'relative', aspectRatio: '16/11', borderRadius: 28, overflow: 'hidden', background: C.gray, boxShadow: '0 16px 36px rgba(18,59,58,0.16)' }}><Photo src={img('quote-team')} placeholder="ガイドチーム写真" dark={false} /></div>
                    <span style={{ position: 'absolute', left: -6, top: '14%', zIndex: 2, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 8px', borderRadius: 999, background: '#FFFFFF', boxShadow: '0 10px 24px rgba(18,59,58,0.18)', animation: anim('qFloat 5.2s ease-in-out infinite') }}>
                        <span style={{ height: 28, padding: '0 9px', borderRadius: 999, background: C.grad, ...inter, fontSize: 12, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center' }}>100%</span>
                        <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>日本語対応</span>
                    </span>
                    <span style={{ position: 'absolute', right: -6, top: '46%', zIndex: 2, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 8px', borderRadius: 999, background: C.ink, boxShadow: '0 10px 24px rgba(18,59,58,0.18)', animation: anim('qFloat2 6s ease-in-out -1.4s infinite') }}>
                        <span style={{ height: 28, padding: '0 9px', borderRadius: 999, background: C.grad, ...inter, fontSize: 12, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>2名1組</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap' }}>長距離コース</span>
                    </span>
                    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 0, zIndex: 3, boxSizing: 'border-box', padding: '15px 20px', borderRadius: 999, background: C.grad, boxShadow: '0 10px 24px rgba(0,168,139,0.28)', textAlign: 'center', fontSize: 'clamp(13px,3.6cqw,15px)', fontWeight: 500, lineHeight: 1.5, color: '#FFFFFF' }}>
                        経験3年以上の <strong style={{ fontWeight: 700 }}>専門ガイドがご案内します。</strong>
                    </div>
                </div>
                {TEAM.map(t => (
                    <div key={t.en} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: `2px solid ${C.ink}` }}>
                            <span style={{ width: 46, height: 46, borderRadius: '50%', background: t.dark ? C.grad : C.ink, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={t.icon} size={22} stroke={t.dark ? '#FFFFFF' : C.mintPale} /></span>
                            <span style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 'clamp(24px,7cqw,32px)', fontWeight: 700, letterSpacing: '-0.04em' }}>{t.role}<span style={{ ...inter, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: C.mintDeep }}>{t.en}</span></span>
                        </div>
                        {t.lines.map(([a, b], j) => (
                            <div key={j} style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr)', gap: 10, alignItems: 'start', padding: '14px 0', borderBottom: `1px solid ${C.line}` }}>
                                <span style={{ ...gradNum, fontSize: 34, lineHeight: 0.95, letterSpacing: '-0.04em' }}>{String(j + 1).padStart(2, '0')}</span>
                                <span style={{ fontSize: 14, lineHeight: 1.7, color: C.sub }}>{a} <strong style={{ fontWeight: 700, color: C.ink }}>{b}</strong></span>
                            </div>
                        ))}
                    </div>
                ))}
                {doc.mode === 'confirmed' && doc.guideName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 24, background: C.mintBg, border: `1.5px solid ${C.mintLine}` }}>
                        <span style={{ width: 40, height: 40, borderRadius: '50%', background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Svg d={TEAM[0].icon} size={20} stroke="#FFFFFF" /></span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mintDeep }}>YOUR GUIDE</span>
                            <span style={{ fontSize: 16, fontWeight: 700 }}>担当ガイド：{doc.guideName}</span>
                        </span>
                    </div>
                )}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 18px 20px', borderRadius: 28, overflow: 'hidden', background: C.ink, color: '#FFFFFF' }}>
                    <span aria-hidden="true" style={glow(220, -60)} />
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.faint }}>無駄のない費用と安全なツアーのための</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'clamp(24px,7cqw,32px)', fontWeight: 700, letterSpacing: '-0.04em', whiteSpace: 'nowrap' }}>
                            <span>プロ</span><span style={{ padding: '1px 10px 5px', borderRadius: 12, background: C.grad }}>最適な</span><span>配置</span>
                        </span>
                    </div>
                    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                        {TEAM_ASSIGN.map((x, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <span style={{ ...inter, fontSize: 'clamp(18px,5cqw,24px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: C.mintPale, whiteSpace: 'nowrap' }}>{x.big}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: C.faint }}>{x.area}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{x.who}</span>
                            </div>
                        ))}
                    </div>
                    <span style={{ position: 'relative', fontSize: 11, lineHeight: 1.7, color: C.mute }}>ゴビ・フブスグルのツアーは長距離のオフロード移動が多いため、安全と疲労軽減のため2名1組で固定配置します。</span>
                </div>
            </section>

            <Gap />

            {/* ─── 09 Meals ─── */}
            <Band reduce={reduce} />
            <section id="q-meal" style={{ ...sec, padding: '32px 20px', gap: 22, overflow: 'visible' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ ...anton, fontSize: 'clamp(40px,12cqw,60px)', lineHeight: 0.95, marginBottom: 6 }}>MEALS</span>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>天の川だけのグルメツアー！</h2>
                </div>

                <div style={{ position: 'relative', margin: '0 -20px', padding: '0 20px 8px', overflow: 'hidden', background: 'radial-gradient(120% 70% at 50% 100%,#E8FAF5 0%,rgba(232,250,245,0) 70%)' }}>
                    <div style={{ position: 'relative', width: '100%', paddingTop: '80%' }}>
                        <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '22%', transform: 'translateX(-50%)', ...gradNum, fontSize: 'clamp(170px,46cqw,310px)', lineHeight: 0.82, letterSpacing: '-0.06em', pointerEvents: 'none', animation: anim('qNum 6s ease-in-out infinite') }}>{spN || 4}</span>
                        {orbit.map((o, i) => {
                            const [x, y, s] = ORBIT_POS[i];
                            return (
                                <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${s}%`, aspectRatio: '1/1', transform: 'translate(-50%,-50%)', zIndex: 2 }}>
                                    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: C.gray, boxShadow: '0 10px 24px rgba(18,59,58,0.18),0 0 0 3px #FFFFFF', animation: float(i) }}>
                                        <Photo src={o.img} dark={false} />
                                        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 70%,rgba(11,38,37,0.55) 0%,rgba(11,38,37,0) 70%)', pointerEvents: 'none' }} />
                                        <span style={{ position: 'absolute', left: '8%', right: '8%', bottom: '20%', textAlign: 'center', fontSize: 'clamp(10px,2.6cqw,14px)', fontWeight: 700, lineHeight: 1.25, color: '#FFFFFF', pointerEvents: 'none' }}>{o.t}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', marginTop: '-4%' }}>
                        <span style={{ fontSize: 'clamp(16px,4.6cqw,22px)', fontWeight: 500, letterSpacing: '-0.02em' }}>ガイド調理なしの <strong style={{ fontWeight: 700 }}>天の川</strong>だけの</span>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, fontSize: 'clamp(30px,9.5cqw,56px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.04em' }}>
                            <span>特別料理</span><span style={{ color: C.mint }}>{spN || 4}種</span><span>グルメツアー</span>
                        </span>
                        <div style={{ width: '100%', maxWidth: 520, boxSizing: 'border-box', padding: '16px 20px', borderRadius: 999, background: C.ink, color: '#FFFFFF', fontSize: 'clamp(13px,3.6cqw,15px)', lineHeight: 1.55 }}>
                            専門の調理設備を備えた厳選レストランで<br /><strong style={{ fontWeight: 700, color: C.mintPale }}>旅の安全と満足度</strong>に集中します
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13, lineHeight: 1.7, color: C.body }}>
                            <span><strong style={{ color: C.ink }}>朝食 · 夕食</strong> 宿泊先（ツーリストキャンプ）のレストランで提供されるキャンプ料理</span>
                            <span><strong style={{ color: C.ink }}>昼食</strong> 移動中に現地レストランでいただくモンゴル料理</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '28px 0 8px' }}>
                    <span style={{ ...inter, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: C.mintDeep }}>OUR PROMISE</span>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 'clamp(16px,4.4cqw,20px)', fontWeight: 500, letterSpacing: '-0.02em' }}>天の川ではガイドが</span>
                        <BigLine weight={700} parts={[{ a: '調理' }, 'しません']} />
                    </span>
                    <div style={{ position: 'relative', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 6 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '22px 14px 18px', borderRadius: 24, background: C.paper }}>
                            <span style={{ width: 48, height: 48, borderRadius: '50%', background: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={IC.x} size={22} stroke={C.red} sw={2} /></span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.mute }}>他社ツアー</span>
                            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: C.sub }}>ガイド調理</span>
                            <span style={{ fontSize: 12, lineHeight: 1.6, color: C.sub }}>食材の傷み・洗浄の問題で<br />食中毒のリスク・ツアー時間のロス</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '22px 14px 18px', borderRadius: 24, background: C.ink, boxShadow: '0 12px 28px rgba(18,59,58,0.22)' }}>
                            <span style={{ width: 48, height: 48, borderRadius: '50%', background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={IC.check} size={22} stroke="#FFFFFF" sw={2.4} /></span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.mintPale }}>モンゴリア天の川</span>
                            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>厳選レストラン</span>
                            <span style={{ fontSize: 12, lineHeight: 1.6, color: C.line }}>専門の調理設備を備えた店舗のみ<br />厳選し、安全と満足度に集中</span>
                        </div>
                        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 38, height: 38, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 4px 12px rgba(18,59,58,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...inter, fontSize: 12, fontWeight: 700 }}>VS</span>
                    </div>
                    <p style={{ margin: 0, maxWidth: 560, fontSize: 13, lineHeight: 1.8, color: C.body }}>モンゴルの奥地での調理は食材が傷みやすく十分な洗浄も難しいため、食中毒など衛生上の問題が起こる可能性が非常に高く、食事の準備と後片付けで貴重なツアー時間まで失われます。他社はガイド調理で価格を抑えていますが、モンゴリア天の川はガイド調理の代わりに<strong style={{ color: C.ink }}>'旅の安全と満足度'</strong>に集中できるよう、専門の調理設備を備えた厳選レストランのみを選び、旅の質を高めています。</p>
                </div>

                {spN > 0 && (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', padding: '28px 0 8px', margin: '0 -20px', overflow: 'hidden' }}>
                        <span aria-hidden="true" style={{ position: 'absolute', right: -6, top: 18, ...anton, fontSize: 'clamp(44px,13cqw,72px)', lineHeight: 0.95, textAlign: 'right', color: 'transparent', WebkitTextStroke: `1.2px ${C.line}`, pointerEvents: 'none' }}>SPECIAL<br />MENU</span>
                        <span style={{ position: 'relative', fontSize: 'clamp(16px,4.6cqw,22px)', fontWeight: 500, letterSpacing: '-0.02em' }}>モンゴリア天の川の自慢</span>
                        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 'clamp(34px,10cqw,52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.05em', whiteSpace: 'nowrap' }}><span>天の川</span><span style={{ color: C.mint }}>特別料理</span><span>{spN}種</span></span>
                        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '4px 20px 0' }}>
                            <span style={{ height: 28, padding: '0 12px', borderRadius: 999, background: C.ink, fontSize: 12, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center' }}>今回の旅程に含まれます</span>
                            <span style={{ fontSize: 12, color: C.sub }}>旅程に合わせてご用意します</span>
                        </span>
                        <div style={{ position: 'relative', width: '100%', height: 'calc(min(62cqw,300px) * 1.3 + 80px)', marginTop: 10 }}>
                            <span aria-hidden="true" style={{ position: 'absolute', left: '-10%', right: '-10%', bottom: 0, height: '42%', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', background: 'linear-gradient(180deg,#EEF3F1 0%,#FFFFFF 100%)', pointerEvents: 'none' }} />
                            {specials.map((c, i) => {
                                let o = i - spI; if (o > spN / 2) o -= spN; if (o < -spN / 2) o += spN;
                                const a = Math.abs(o);
                                return (
                                    <div key={c.id} onClick={() => { if (a) setSpIdx(i); }} style={{ position: 'absolute', left: '50%', top: 30, width: 'min(62cqw,300px)', aspectRatio: '10/13', borderRadius: 20, overflow: 'hidden', background: '#1C4A48', color: '#FFFFFF', textAlign: 'left', cursor: a ? 'pointer' : 'default', transform: `translateX(calc(-50% + ${o * 64}%)) translateY(${a ? 26 : 0}px) rotate(${o * 13}deg) scale(${a ? 0.84 : 1})`, opacity: a > 1 ? 0 : 1, zIndex: 3 - a, boxShadow: '0 18px 36px rgba(18,59,58,0.22)', transition: 'transform .55s cubic-bezier(.22,.61,.36,1),opacity .55s cubic-bezier(.22,.61,.36,1)' }}>
                                        <Photo src={c.image} placeholder={`${c.name} 写真`} />
                                        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,38,37,0.15) 0%,rgba(11,38,37,0.35) 40%,rgba(11,38,37,0.82) 100%)', pointerEvents: 'none' }} />
                                        <span style={{ position: 'absolute', right: 18, top: 14, ...anton, fontSize: 44, lineHeight: 1, pointerEvents: 'none' }}>{String(i + 1).padStart(2, '0')}</span>
                                        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 22, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
                                            <span style={{ fontSize: 14, fontWeight: 300, color: C.mintBg }}>{c.sub}</span>
                                            <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.04em' }}>{c.name}</span>
                                            <span style={{ height: 1, margin: '8px 0 6px', background: 'rgba(255,255,255,0.55)' }} />
                                            <span style={{ fontSize: 12, lineHeight: 1.7, color: '#F2F7F6' }}>{c.desc}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {spN > 1 && [[IC.left, -1, '前の料理', 'left'], [IC.right, 1, '次の料理', 'right']].map(([d, step, label, side]) => (
                                <button key={label as string} type="button" className="tdoc-noprint" aria-label={label as string} onClick={() => setSpIdx(spI + (step as number))}
                                    style={{ position: 'absolute', [side as string]: 'calc(50% - min(31cqw,150px) - 22px)', top: '50%', zIndex: 5, width: 44, height: 44, marginTop: -22, border: 0, borderRadius: '50%', background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Svg d={d as string} stroke="#FFFFFF" sw={2.2} />
                                </button>
                            ))}
                        </div>
                        {spN > 1 && <div style={{ marginTop: -6 }}><Dots count={spN} idx={spI} label="料理" onGo={setSpIdx} /></div>}
                    </div>
                )}

                {images.localFoods.length > 0 && <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 0 8px', margin: '0 -20px', backgroundImage: 'repeating-linear-gradient(180deg,transparent 0,transparent 39px,#EEF3F1 39px,#EEF3F1 40px)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 20px' }}>
                        <span style={{ ...anton, fontSize: 'clamp(34px,10cqw,52px)', lineHeight: 0.95 }}>LOCAL FOOD</span>
                        <BigLine size="clamp(28px,8.4cqw,42px)" parts={['おすすめ', { a: '現地料理' }]} />
                        <span style={{ fontSize: 12, lineHeight: 1.6, color: C.sub }}>旅行先・日程により提供される現地料理のメニューは異なる場合があります。</span>
                    </div>
                    <div data-noscroll="" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', padding: '4px 20px 30px', scrollPadding: '0 20px' }}>
                        {images.localFoods.map((m, i) => {
                            const full = i % 3 === 0;
                            return (
                                <div key={i} style={{ position: 'relative', flex: '0 0 min(42cqw,190px)', aspectRatio: '10/17', marginTop: i % 2 ? 44 : 0, scrollSnapAlign: 'start', borderRadius: 20, overflow: 'hidden', background: ['#123B3A', '#007F75', '#123B3A', '#0F2E2D'][i % 4], boxShadow: '0 14px 28px rgba(18,59,58,0.16)', color: '#FFFFFF' }}>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: full ? '100%' : '62%', overflow: 'hidden', borderRadius: full ? 0 : '0 0 20px 20px' }}><Photo src={m.img} placeholder={`${m.t} 写真`} /></div>
                                    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: full ? 'linear-gradient(180deg,rgba(11,38,37,0) 35%,rgba(11,38,37,0.85) 100%)' : 'none', pointerEvents: 'none' }} />
                                    <div style={{ position: 'absolute', left: 14, right: 16, bottom: 18, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, textAlign: 'right', pointerEvents: 'none' }}>
                                        <span style={{ ...anton, fontSize: 15, letterSpacing: '0.04em', opacity: 0.9 }}>{m.en}</span>
                                        <span style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.04em' }}>{m.t}</span>
                                        <span style={{ marginTop: 12, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', opacity: 0.85 }}>{m.s}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>}
            </section>

            <Gap />

            {/* ─── 10 Insurance ─── */}
            <section id="q-safe" style={sec}>
                <SectionHead en="TRAVEL INSURANCE & ACTIVITY" pill="旅行保険 & アクティビティ体験の注意事項">
                    <BigLine parts={['安全が', { a: '第一' }, 'です']} />
                </SectionHead>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, padding: '22px 20px', borderRadius: 28, background: C.ink, color: '#FFFFFF', overflow: 'hidden' }}>
                    <span aria-hidden="true" style={glow(240, -70)} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 48, height: 48, borderRadius: '50%', background: C.grad, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: anim('qFloat 5.2s ease-in-out infinite') }}><Svg d={IC.shield} size={22} stroke="#FFFFFF" /></span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mintPale }}>STRONGLY RECOMMENDED</span>
                            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>日本の海外旅行保険へのご加入</span>
                        </span>
                    </div>
                    <p style={{ position: 'relative', margin: 0, fontSize: 13, lineHeight: 1.8, color: C.line }}>モンゴル現地の旅行保険は、事故発生時の手続きが遅く補償額も少なく、実際に適用されにくい場合が多くあります。万一の際にも迅速で確実な補償を受けられるよう、<strong style={{ fontWeight: 700, color: C.mintPale }}>日本ご出発前に、必ず日本の保険会社の海外旅行保険へご加入いただくことを強くおすすめ</strong>いたします。</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.sub }}>乗馬・ラクダ乗り・砂ソリなどの</span>
                        <ChipTitle before="体験は" chip="自由に" after="選べます" />
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                        {[[IC.horse, '乗馬を体験しない場合の返金額'], [IC.camel, 'ラクダに乗らない場合の返金額']].map(([d, t]) => (
                            <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 16, borderRadius: 24, background: C.paper }}>
                                <span style={{ width: 36, height: 36, borderRadius: 12, background: C.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={d} /></span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>{t}</span>
                                <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}><span style={{ fontSize: 11, fontWeight: 600, color: C.sub }}>お一人様</span><span style={{ ...gradNum, fontSize: 20, letterSpacing: '-0.03em' }}>現地でご案内</span></span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ACT_RULES.map(([t, w]) => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px 14px 14px', borderRadius: 24, background: w ? '#FFF6F6' : 'linear-gradient(135deg,#E8FAF5 0%,#FFFFFF 100%)', border: `1.5px solid ${w ? '#FAD4D5' : C.mintLine}`, fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>
                                <span style={{ width: 44, height: 44, borderRadius: '50%', background: w ? 'linear-gradient(160deg,#E5484D 0%,#FF8A8D 100%)' : 'linear-gradient(160deg,#00A88B 0%,#6CE3CC 100%)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 14px ${w ? 'rgba(229,72,77,0.25)' : 'rgba(6,196,160,0.28)'}` }}><Svg d={w ? IC.warn : IC.check} size={22} stroke="#FFFFFF" sw={2.6} /></span>
                                <span>{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <ChipTitle before="乗馬 · ラクダ" chip="注意事項" size="clamp(20px,5.8cqw,26px)" gradient />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {RIDE_TIPS.map((t, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr)', gap: 10, alignItems: 'start', padding: '14px 0', borderBottom: `1px solid ${C.line}` }}>
                                <span style={{ ...gradNum, fontSize: 30, lineHeight: 0.95, letterSpacing: '-0.04em' }}>{i + 1}</span>
                                <span style={{ fontSize: 14, lineHeight: 1.7, color: C.body }}>{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 28, background: '#FFFFFF', border: `1.5px solid ${C.ink}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 44, height: 44, borderRadius: 14, background: C.ink, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={IC.doc} size={20} stroke={C.mintPale} /></span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mintDeep }}>BEFORE ACTIVITY</span>
                            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>体験プログラム参加のご案内</span>
                        </span>
                    </div>
                    <span style={{ alignSelf: 'flex-start', height: 30, padding: '0 14px', borderRadius: 999, background: C.grad, fontSize: 12, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center' }}>体験前に '免責同意書' ご記入</span>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: C.body }}>ツアー中のアクティビティ体験前に <strong style={{ color: C.ink }}>'免責同意書'</strong> へのご記入をお願いしています。体験中に起こりうる事故についてツアー会社へ法的責任を問うことや別途補償を求めることはできませんので、同意書の内容をよくご確認のうえ、現地ガイドの安全ルールを守って安全で楽しい体験をお楽しみください。</p>
                </div>
            </section>

            <Gap />

            {/* ─── 11 Airport ─── */}
            <section id="q-meet" style={sec}>
                <SectionHead en="ARRIVAL · GUIDE MEETING" pill="モンゴルの空港でガイドとミーティング">
                    <BigLine parts={['到着したら', { a: '3ステップ' }, 'で完了']} />
                </SectionHead>
                <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', background: C.ink, aspectRatio: '4/3' }}>
                    <Photo src={img('quote-meet-3')} placeholder="ネームボードを持ったガイド" />
                    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(11,38,37,0) 40%,rgba(11,38,37,0.85) 100%)' }} />
                    <div style={{ position: 'absolute', right: 16, top: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '12px 18px 14px', borderRadius: 16, background: '#FFFFFF', boxShadow: '0 14px 30px rgba(11,38,37,0.35)', transform: 'rotate(-4deg)', pointerEvents: 'none' }}>
                        <span style={{ ...inter, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: C.mintDeep }}>MONGOLIA MILKY WAY</span>
                        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>{doc.customerName} 様</span>
                        <span style={{ width: '100%', height: 3, borderRadius: 2, background: C.grad, marginTop: 4 }} />
                    </div>
                    <div style={{ position: 'absolute', left: 18, right: 18, bottom: 16, display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.mintPale }}>このようなネームボードをお探しください</span>
                        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>ご予約者のお名前入りボードを持ったガイド</span>
                    </div>
                </div>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <span aria-hidden="true" style={{ position: 'absolute', left: 27, top: 40, bottom: 40, width: 0, borderLeft: `2px dashed ${C.mintLine}` }} />
                    {[
                        ['GUIDE PICKUP', 'モンゴル到着時刻に合わせて、', 'モンゴリア天の川の日本語ガイド', 'がお迎えにあがります。', 'quote-meet-1', '入国ゲート'],
                        ['FIND YOUR BOARD', 'ご予約者 ', `${doc.customerName} 様`, 'のお名前入りボードを持ったガイドをお探しください。', '', ''],
                        ['MEETING POINT', '入国ゲートを出て、', doc.q.meetingPoint || 'Tom N Toms カフェ前のベンチ', '付近でお会いしましょう。', 'quote-meet-2', '待ち合わせ場所'],
                    ].map(([en, a, b, c, slot, ph], i) => (
                        <div key={en} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '56px minmax(0,1fr)', gap: 14, alignItems: 'start', padding: '12px 0' }}>
                            <span style={{ position: 'relative', zIndex: 1, width: 56, height: 56, borderRadius: '50%', background: i === 2 ? C.grad : C.ink, boxShadow: '0 0 0 5px #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', ...inter, fontSize: 18, fontWeight: 700, color: i === 2 ? '#FFFFFF' : C.mintPale }}>{String(i + 1).padStart(2, '0')}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, paddingTop: 4 }}>
                                <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mintDeep }}>{en}</span>
                                <span style={{ fontSize: 15, lineHeight: 1.65, color: C.body }}>{a}<strong style={{ fontWeight: 700, color: C.ink }}>{b}</strong>{c}</span>
                                {slot && img(slot) && (
                                    <span style={{ position: 'relative', display: 'block', aspectRatio: '16/9', borderRadius: 20, overflow: 'hidden', background: C.gray }}>
                                        <Photo src={img(slot)} placeholder={ph} />
                                        <span style={{ position: 'absolute', left: 12, bottom: 10, height: 26, padding: '0 10px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(16px)', fontSize: 11, fontWeight: 700, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', pointerEvents: 'none' }}>{ph}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px', borderRadius: 999, background: C.ink, color: '#FFFFFF' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.line, whiteSpace: 'nowrap' }}><Svg d={IC.pin} size={16} stroke={C.mintPale} sw={2} />待ち合わせ場所</span>
                    <strong style={{ fontSize: 14, fontWeight: 700, color: C.mintPale, textAlign: 'right' }}>{doc.q.meetingPoint || 'Tom N Toms カフェ前のベンチ'}</strong>
                </div>
            </section>

            <Gap />

            {/* ─── 12 Certificate ─── */}
            <section id="q-cert" style={{ ...sec, gap: 20, padding: '32px 20px 40px' }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span aria-hidden="true" style={{ position: 'absolute', right: -6, top: -14, ...gradNum, fontSize: 'clamp(110px,30cqw,190px)', lineHeight: 0.85, letterSpacing: '-0.06em', opacity: 0.9, pointerEvents: 'none' }}>{CERTS.length}</span>
                    <span style={{ ...anton, fontSize: 'clamp(40px,12cqw,60px)', lineHeight: 0.95, marginBottom: 6 }}>CERTIFICATE</span>
                    <span style={{ position: 'relative', fontSize: 'clamp(15px,4.2cqw,19px)', fontWeight: 500, letterSpacing: '-0.02em' }}>モンゴリア天の川 現地旅行会社</span>
                    <BigLine parts={['公式', { a: '許可証' }]} />
                    <span style={{ position: 'relative', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {['韓国 正式認可', 'モンゴル 正式認可'].map(t => (
                            <span key={t} style={{ height: 28, padding: '0 12px', borderRadius: 999, background: C.ink, fontSize: 12, fontWeight: 700, color: C.mintPale, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Svg d={IC.shield} size={13} stroke={C.mintPale} sw={2} />{t}</span>
                        ))}
                    </span>
                </div>
                <div data-noscroll="" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', margin: '0 -20px', padding: '8px 20px 12px', scrollPadding: '0 20px' }}>
                    {CERTS.map((c, i) => (
                        <div key={c.slot} style={{ flex: '0 0 66%', maxWidth: 260, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', borderRadius: 28, overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 12px 28px rgba(18,59,58,0.12)', border: `1px solid ${C.line}` }}>
                            {/* 허가증 사진은 등록된 자료가 없어 번호·아이콘만 있는 카드로 보여 준다 */}
                            <div style={{ position: 'relative', aspectRatio: img(c.slot) ? '3/4' : '16/9', background: img(c.slot) ? C.paper : `linear-gradient(160deg,${C.mintBg} 0%,${C.paper} 100%)` }}>
                                {img(c.slot) && <Photo src={img(c.slot)} dark={false} style={{ objectFit: 'contain', background: '#FFFFFF' }} />}
                                <span style={{ position: 'absolute', left: 14, top: 14, ...gradNum, fontSize: 30, lineHeight: 0.9, letterSpacing: '-0.05em', pointerEvents: 'none' }}>{String(i + 1).padStart(2, '0')}</span>
                                <span style={{ position: 'absolute', right: 12, top: 12, width: 34, height: 34, borderRadius: '50%', background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(0,168,139,0.3)', pointerEvents: 'none' }}><Svg d={IC.shield} size={17} stroke="#FFFFFF" sw={2.2} /></span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px 16px' }}>
                                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>{c.t}</span>
                                <span style={{ fontSize: 12, lineHeight: 1.5, color: C.mintDeep, fontWeight: 600 }}>{c.d}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 28, background: 'linear-gradient(160deg,#E8FAF5 0%,#F7FAF9 70%,#FFFFFF 100%)', border: `1.5px solid ${C.mintLine}`, overflow: 'hidden' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 40, height: 40, borderRadius: 12, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Svg d={IC.shield} size={20} stroke={C.mintPale} /></span>
                        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>法的な安全体制をすべて整えています</span>
                    </span>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: C.body }}>モンゴリア天の川は<strong style={{ color: C.ink }}>韓国とモンゴル両国政府の正式な認可</strong>を受けて登録されたグローバル現地旅行会社です。両国での事業者登録・観光事業登録はもちろん、旅行者保護のための旅行業保証保険への加入、モンゴル現地法人の設立、モンゴル旅行協会（MATA）への正式登録まで、<strong style={{ color: C.ink }}>法的に必要なすべての安全体制と証明書類</strong>を徹底して整えています。</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {CERT_TAGS.map(t => (
                            <span key={t} style={{ height: 28, padding: '0 11px 0 6px', borderRadius: 999, background: '#FFFFFF', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 16, height: 16, borderRadius: '50%', background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={IC.check} size={9} stroke="#FFFFFF" sw={3.4} /></span>{t}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <Gap />

            {legal && (
                <>
                    <section id="q-legal" style={{ scrollMarginTop: 56 }}>{legal}</section>
                    <Gap />
                </>
            )}

            {/* ─── Contact ─── */}
            <section style={{ position: 'relative', padding: '36px 20px 44px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden', background: 'radial-gradient(120% 70% at 50% 100%,#E8FAF5 0%,rgba(232,250,245,0) 70%)' }}>
                <SectionHead en="CONTACT" pill={doc.mode === 'quote' ? 'お見積りに関するお問い合わせ' : 'ご旅行に関するお問い合わせ'}>
                    <BigLine parts={['ご不明な点は', { a: 'お気軽に' }, 'ご相談ください']} />
                </SectionHead>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                    {[
                        [`https://${COMPANY.site}`, C.ink, 'rgba(140,233,216,0.16)', C.mintPale, IC.chat, '公式サイト', COMPANY.site, 'ツアー・会社情報を見る', C.faint],
                        [`https://instagram.com/${COMPANY.instagram}`, C.grad, 'rgba(255,255,255,0.22)', '#FFFFFF', IC.insta, 'Instagram', `@${COMPANY.instagram}`, '旅の写真を見る', C.mintBg],
                    ].map(([href, bg, iconBg, fg, icon, label, val, sub, labelFg]) => (
                        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="td-lift" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 28, background: bg, color: '#FFFFFF', boxShadow: '0 10px 24px rgba(18,59,58,0.12)', minWidth: 0 }}>
                            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ width: 44, height: 44, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Svg d={icon} size={22} stroke={fg} /></span>
                                <Svg d={IC.arrowUp} stroke={fg} sw={2.2} />
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: labelFg }}>{label}</span>
                                <span style={{ ...inter, fontSize: 'clamp(15px,4.2cqw,18px)', fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#FFFFFF' }}>{val}</span>
                                <span style={{ fontSize: 11, color: fg, marginTop: 2 }}>{sub}</span>
                            </span>
                        </a>
                    ))}
                </div>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, fontSize: 11, fontWeight: 600, color: C.sub, textAlign: 'center' }}>
                    <span style={{ width: 20, height: 1, background: C.faint, flexShrink: 0 }} />
                    モンゴリア天の川 現地旅行会社 {doc.mode === 'quote' ? 'オーダーメイドお見積書' : '確定日程表'}
                    <span style={{ width: 20, height: 1, background: C.faint, flexShrink: 0 }} />
                </span>
            </section>
        </>
    );
};
