import React, { useMemo, useState } from 'react';
import type { TourProduct, DayInfoContent, TimelineContent, DetailSlide } from '../../../types/product';
import { ImageLightbox } from '../../common/ImageLightbox';
import { getOptimizedImageUrl } from '../../../utils/cloudflareImage';
import { ScaledDesign } from './DesignBlockView';

/**
 * 「일정 상세 (1일차)」 — Claude Design(일정 상세 (1일차).dc.html)을 React로 이식한
 * 860px 고정폭 일정표 디자인. 상품 「일정」 탭의 블록(dayInfo / timeline / image / slide)을
 * 그대로 읽어 일차마다 [다크 히어로 + DAY 진행 스트립] → [흰 카드: 제목·설명 → 사진 그리드
 * → 세로 타임라인 → 식사 → 숙박 안내] 순으로 그린다.
 * 디자인 템플릿(공항 도착 뒤)에 끼워 넣기 위한 것이라 ScaledDesign으로 같은 배율로 축소된다.
 * 모바일은 430px 캔버스로 치수를 절반 비율로 줄여 그린다 (모바일 템플릿과 같은 방식).
 */

const MINT = '#06C4A0';
const TEAL = '#029F85';
const INK = '#2b2b2b';
const DARK = '#0B1513';
const LINE = '#E3EEEA';

interface Block { id?: string; type: string; content: unknown }
interface DayGroup { dayInfo: DayInfoContent; events: Block[] }

/** 관리자가 내용을 넣은 블록만 (ProductDetailDesktop / MobileItineraryTimeline과 같은 기준) */
function isMeaningful(b: Block): boolean {
    if (b.type === 'image' || b.type === 'slide') return true;
    if (b.type === 'dayInfo') {
        const c = b.content as DayInfoContent | undefined;
        if (!c) return false;
        const hasMeals = !!(c.meals?.breakfast || c.meals?.lunch || c.meals?.dinner);
        return !!(c.title || c.description || c.accommodation || hasMeals);
    }
    if (b.type === 'timeline') {
        const c = b.content as TimelineContent | undefined;
        if (!c) return false;
        return !!(c.title || c.description || c.time || (Array.isArray(c.images) && c.images.length > 0));
    }
    return false;
}

function groupByDay(blocks: Block[]): { pre: Block[]; days: DayGroup[] } {
    const days: DayGroup[] = [];
    const pre: Block[] = [];
    let cur: DayGroup | null = null;
    for (const b of blocks) {
        if (b.type === 'dayInfo') {
            if (cur) days.push(cur);
            cur = { dayInfo: b.content as DayInfoContent, events: [] };
        } else if (cur) cur.events.push(b);
        else pre.push(b);
    }
    if (cur) days.push(cur);
    // dayInfo보다 앞에 만든 블록은 1일차 일정으로 본다 (기존 렌더러와 동일)
    if (pre.length > 0 && days.length > 0) {
        days[0] = { dayInfo: days[0].dayInfo, events: [...pre, ...days[0].events] };
        return { pre: [], days };
    }
    return { pre, days };
}

/** image / slide 블록의 사진 (타임라인 사진과 별도 — 카드 상단 그리드에 쓴다) */
function blockImages(b: Block): string[] {
    if (b.type === 'image') return typeof b.content === 'string' && b.content ? [b.content] : [];
    if (b.type === 'slide') return ((b.content as DetailSlide)?.images ?? []).filter(Boolean);
    return [];
}

const img = (src: string) => getOptimizedImageUrl(src) || src;

export function DesignItinerary({ product, variant = 'desktop' }: { product: TourProduct; variant?: 'desktop' | 'mobile' }) {
    const canvasWidth = variant === 'mobile' ? 430 : 860;
    const k = canvasWidth / 860;
    // 치수는 디자인(860px) 값 그대로 쓰고 모바일에서만 비율로 줄인다. 글자는 너무 작아지지 않게 하한을 둔다.
    const u = (n: number) => Math.round(n * k);
    const fs = (n: number, min = 12) => Math.max(Math.round(n * k), min);

    const [lightbox, setLightbox] = useState<{ images: string[]; startIndex: number } | null>(null);
    const open = (images: string[], startIndex: number) => setLightbox({ images, startIndex });

    const { days, pre, legacy } = useMemo(() => {
        const blocks = ((product.itineraryBlocks ?? []) as Block[]).filter(isMeaningful);
        const g = groupByDay(blocks);
        return { ...g, legacy: blocks.length === 0 ? (product.itineraryImages ?? []) : [] };
    }, [product.itineraryBlocks, product.itineraryImages]);

    // dayInfo 없이 사진/타임라인만 있는 상품 → 하나의 일정으로 묶어서 같은 디자인으로
    const groups: DayGroup[] = days.length > 0
        ? days
        : pre.length > 0
            ? [{ dayInfo: { id: 'all', dayLabel: '', title: product.name }, events: pre }]
            : [];

    const root: React.CSSProperties = {
        width: canvasWidth, margin: '0 auto', background: '#fff', color: INK, overflow: 'hidden',
        fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", -apple-system, sans-serif', WebkitFontSmoothing: 'antialiased',
    };

    if (groups.length === 0 && legacy.length === 0) return null;

    return (
        <ScaledDesign canvasWidth={canvasWidth}>
            <div className="dit-design" style={root}>
                <style>{`
                    .dit-design { word-break: normal; overflow-wrap: break-word; line-break: strict; }
                    .dit-design * { text-wrap: pretty; }
                    .dit-design h2, .dit-design h3 { text-wrap: balance; }
                    @keyframes ditPulse { 0%,100% { box-shadow: 0 0 0 4px rgba(255,255,255,0.45); } 50% { box-shadow: 0 0 0 10px rgba(6,196,160,0.25); } }
                    .dit-design .dit-photo { cursor: zoom-in; }
                `}</style>

                {/* 레거시(사진만 올린 상품) — 세로로 이어 붙인다 */}
                {groups.length === 0 && legacy.map((src, i) => (
                    <img key={i} src={img(src)} alt={`${product.name} 行程${i + 1}`} loading="lazy" decoding="async" style={{ width: '100%', height: 'auto', display: 'block' }} />
                ))}

                {groups.map((day, i) => (
                    <DaySection
                        key={day.dayInfo.id || i}
                        day={day}
                        index={i}
                        all={groups}
                        u={u}
                        fs={fs}
                        onOpen={open}
                    />
                ))}
            </div>
            {lightbox && <ImageLightbox images={lightbox.images} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />}
        </ScaledDesign>
    );
}

function DaySection({ day, index, all, u, fs, onOpen }: {
    day: DayGroup; index: number; all: DayGroup[];
    u: (n: number) => number; fs: (n: number, min?: number) => number;
    onOpen: (images: string[], startIndex: number) => void;
}) {
    const d = day.dayInfo;
    const dayLabel = d.dayLabel || `${index + 1}日目`;
    const timeline = day.events.filter(b => b.type === 'timeline').map(b => b.content as TimelineContent);
    const gridPhotos = day.events.flatMap(blockImages);
    const timelinePhotos = timeline.flatMap(t => (t.images ?? []).filter(Boolean));
    const accPhotos = (d.accommodationImages ?? []).filter(Boolean);
    // 히어로 사진: 상단 그리드 → 타임라인 → 숙소 순으로 처음 나오는 사진
    const hero = gridPhotos[0] || timelinePhotos[0] || accPhotos[0] || '';
    const meals = [
        d.meals?.breakfast && `朝食：${d.meals.breakfast}`,
        d.meals?.lunch && `昼食：${d.meals.lunch}`,
        d.meals?.dinner && `夕食：${d.meals.dinner}`,
    ].filter(Boolean) as string[];
    const multi = all.length > 1;
    const progress = multi ? (index / (all.length - 1)) * 80 : 0;

    const dot: React.CSSProperties = { position: 'absolute', left: u(-58), top: u(6), width: u(14), height: u(14), borderRadius: '50%', background: INK, boxShadow: `0 0 0 ${u(5)}px #fff` };
    const spine: React.CSSProperties = { position: 'absolute', left: u(-52), top: u(26), bottom: 0, width: 2, background: LINE };
    const itemTitle: React.CSSProperties = { fontSize: fs(23, 15), fontWeight: 800, color: INK, letterSpacing: '-0.03em' };
    const itemBody: React.CSSProperties = { marginTop: u(10), fontSize: fs(20, 13), lineHeight: 1.7, fontWeight: 600, color: '#4a4a4a', letterSpacing: '-0.02em', whiteSpace: 'pre-line' };
    const badge: React.CSSProperties = { display: 'inline-block', padding: `${u(8)}px ${u(16)}px`, borderRadius: 6, background: INK, color: '#fff', fontSize: fs(19, 12), fontWeight: 800, letterSpacing: '-0.03em' };

    const Photo = ({ src, group, idx, height, radius }: { src: string; group: string[]; idx: number; height: number; radius: number }) => (
        <div className="dit-photo" onClick={() => onOpen(group, idx)} style={{ position: 'relative', height, borderRadius: radius, overflow: 'hidden', background: '#EFFEF9' }}>
            <img src={img(src)} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
    );

    return (
        <section style={{ position: 'relative', background: DARK }}>
            {/* ── 히어로: 일차 제목 + DAY 진행 스트립 ── */}
            <div style={{ position: 'relative', minHeight: u(330), overflow: 'hidden' }}>
                {hero && (
                    <img src={img(hero)} alt="" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.35) 45%, ${DARK} 100%)` }} />
                <div style={{ position: 'relative', padding: `${u(48)}px ${u(50)}px ${u(40)}px`, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: fs(40, 22), fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', textShadow: '0 2px 18px rgba(0,0,0,0.4)' }}>
                        {dayLabel}{d.title ? `. ${d.title}` : ''}
                    </h2>
                    {multi && (
                        <div style={{ marginTop: u(34), position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${all.length}, 1fr)`, gap: u(8) }}>
                            <div style={{ position: 'absolute', left: '10%', right: '10%', top: u(8), height: 2, background: 'rgba(255,255,255,0.28)' }} />
                            <div style={{ position: 'absolute', left: '10%', width: `${progress}%`, top: u(8), height: 2, background: MINT }} />
                            {all.map((other, j) => {
                                const active = j === index;
                                return (
                                    <div key={j} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(10), opacity: active ? 1 : 0.45 }}>
                                        <div style={{ width: u(18), height: u(18), borderRadius: '50%', background: active ? MINT : '#fff', animation: active ? 'ditPulse 2.2s ease-in-out infinite' : undefined }} />
                                        <div style={{ fontSize: fs(16, 11), fontWeight: active ? 800 : 700, color: '#fff', letterSpacing: '0.02em' }}>{j + 1}DAY</div>
                                        <div style={{ marginTop: u(-6), fontSize: fs(18, all.length > 5 ? 10 : 11), fontWeight: active ? 800 : 600, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.3 }}>
                                            {other.dayInfo.title || other.dayInfo.dayLabel || ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 흰 카드 ── */}
            <div style={{ margin: `0 ${u(30)}px`, position: 'relative', background: '#fff', borderRadius: `${u(32)}px ${u(32)}px 0 0`, padding: `${u(54)}px ${u(46)}px ${u(90)}px` }}>
                <div style={{ textAlign: 'center' }}>
                    {(d.dayDate || dayLabel) && (
                        <div style={{ fontSize: fs(22, 13), fontWeight: 800, color: INK, letterSpacing: '-0.03em' }}>{d.dayDate || dayLabel}</div>
                    )}
                    <h3 style={{ margin: `${u(10)}px 0 0`, fontSize: fs(44, 22), fontWeight: 800, letterSpacing: '-0.045em', color: TEAL }}>{d.title || dayLabel}</h3>
                    {d.description && (
                        <div style={{ margin: `${u(26)}px auto 0`, maxWidth: u(640), fontSize: fs(21, 13), lineHeight: 1.7, fontWeight: 600, color: '#3a3a3a', letterSpacing: '-0.02em', whiteSpace: 'pre-line' }}>{d.description}</div>
                    )}
                </div>

                {/* 상단 사진 그리드: 2열, 홀수면 마지막 한 장은 와이드 */}
                {gridPhotos.length > 0 && (
                    <div style={{ marginTop: u(40), display: 'grid', gridTemplateColumns: '1fr 1fr', gap: u(14) }}>
                        {gridPhotos.map((src, i) => {
                            const wide = gridPhotos.length % 2 === 1 && i === gridPhotos.length - 1;
                            return (
                                <div key={i} style={wide ? { gridColumn: '1 / -1' } : undefined}>
                                    <Photo src={src} group={gridPhotos} idx={i} height={u(wide ? 400 : 240)} radius={u(16)} />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 세로 타임라인 */}
                {(timeline.length > 0 || meals.length > 0 || d.accommodation) && (
                    <div style={{ marginTop: u(64), position: 'relative', paddingLeft: u(64) }}>
                        {timeline.map((t, i) => {
                            const photos = (t.images ?? []).filter(Boolean);
                            return (
                                <div key={t.id || i} style={{ position: 'relative', marginTop: i === 0 ? 0 : u(44), paddingBottom: u(12) }}>
                                    <div style={dot} />
                                    <div style={spine} />
                                    <div style={itemTitle}>{[t.time, t.title].filter(Boolean).join(' ')}</div>
                                    {t.badge ? (
                                        // 강조 박스 — 검은 배지 + 설명 (디자인의 「환전 / 장보기」 박스)
                                        <div style={{ marginTop: u(20), padding: `${u(24)}px ${u(26)}px`, borderRadius: u(14), background: '#F3F8F6' }}>
                                            <div style={badge}>{t.badge}</div>
                                            {t.description && <div style={{ ...itemBody, marginTop: u(14), fontSize: fs(19, 13) }}>{t.description}</div>}
                                        </div>
                                    ) : (
                                        t.description && <div style={itemBody}>{t.description}</div>
                                    )}
                                    {photos.length > 0 && (
                                        <div style={{ marginTop: u(22), display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr' : '1fr 1fr', gap: u(14) }}>
                                            {photos.map((src, j) => <Photo key={j} src={src} group={photos} idx={j} height={u(230)} radius={u(14)} />)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {meals.length > 0 && (
                            <div style={{ position: 'relative', marginTop: timeline.length ? u(44) : 0, paddingBottom: u(12) }}>
                                <div style={dot} />
                                <div style={spine} />
                                <div style={itemTitle}>お食事</div>
                                <div style={{ marginTop: u(20), padding: `${u(24)}px ${u(26)}px`, borderRadius: u(14), background: '#F3F8F6' }}>
                                    <div style={badge}>お食事のご案内</div>
                                    <div style={{ marginTop: u(14), display: 'flex', flexWrap: 'wrap', gap: `${u(8)}px ${u(22)}px`, fontSize: fs(19, 13), fontWeight: 700, color: TEAL, letterSpacing: '-0.02em' }}>
                                        {meals.map((m, i) => <div key={i}>· {m}</div>)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {d.accommodation && (
                            <div style={{ position: 'relative', marginTop: (timeline.length || meals.length) ? u(44) : 0, paddingBottom: u(12) }}>
                                <div style={dot} />
                                <div style={{ ...spine, bottom: u(12) }} />
                                <div style={itemTitle}>{d.accommodation}</div>
                                <div style={{ marginTop: u(20), padding: `${u(22)}px ${u(26)}px`, borderRadius: u(14), border: `2px solid ${LINE}` }}>
                                    <div style={badge}>宿泊のご案内</div>
                                    <div style={{ marginTop: u(14), display: 'flex', flexWrap: 'wrap', gap: `${u(8)}px ${u(22)}px`, fontSize: fs(19, 13), fontWeight: 700, color: TEAL, letterSpacing: '-0.02em' }}>
                                        {(d.accommodationAmenities ?? []).filter(Boolean).map((a, i) => <div key={i}>· {a}</div>)}
                                        {d.accommodationSubtitle && <div>· {d.accommodationSubtitle}</div>}
                                        {d.accommodationAddress && <div>· {d.accommodationAddress}</div>}
                                    </div>
                                    {d.accommodationDescription && (
                                        <div style={{ ...itemBody, marginTop: u(12), fontSize: fs(18, 13) }}>{d.accommodationDescription}</div>
                                    )}
                                </div>
                                {accPhotos.length > 0 && (
                                    <div style={{ marginTop: u(20), display: 'grid', gridTemplateColumns: `repeat(${Math.min(accPhotos.length, 3)}, 1fr)`, gap: u(12) }}>
                                        {accPhotos.slice(0, 3).map((src, j) => <Photo key={j} src={src} group={accPhotos} idx={j} height={u(180)} radius={u(12)} />)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export default DesignItinerary;
