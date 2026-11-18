import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import {
    CATEGORY_KO, UNIT_KO, GRADE_KO, GRADE_STAY, FUEL_LABEL, buildCostLines, calcQuote, effectiveRate, fuelLine,
    type CostItem, type CostPlan, type PricingConfig, type QuoteCostLine, type TripGrade,
} from '../../lib/pricing';

/**
 * 견적 편집기 「원가 계산」 카드 (관리자 전용 — 고객 견적서에는 나가지 않는다).
 * AI 초안이 고른 원가 계획(항목·수량)을 원가표·설정으로 계산해 실속 / 풀패키지 / 고급의 1인 금액을 보여 준다.
 * 줄은 고칠 수 있고, 「1인 요금에 넣기」로 여행 금액 칸에 넣는다. 내역은 견적별로 따로 저장된다.
 */

const GRADES: TripGrade[] = ['value', 'full', 'luxury'];
type Lines = Record<TripGrade, QuoteCostLine[]>;
interface Costing { planKey: string; plan: CostPlan | null; grade: TripGrade; lines: Lines; fuel?: { vehicle?: string; km?: number }; mntPerJpy?: number; calcAt?: string }
type Rate = { mntPerJpy: number; fetchedAt: string; source: string; stale?: boolean } | null;

const C = { ink: '#123B3A', sub: '#5F7674', mute: '#8A9E9B', line: '#DDEBE7', line2: '#EEF3F1', bg: '#F7FAF9', mint: '#00A88B', mintDeep: '#007F75', mintBg: '#E8FAF5', mintBg2: '#F1FCF8', amberBg: '#FFF4D6', amberFg: '#8A5A00' };
const EN = "'Inter',sans-serif";
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const num = (v: string) => { const n = Number(v.replace(/[^\d.]/g, '')); return Number.isFinite(n) && n > 0 ? n : 0; };
const inCell: React.CSSProperties = { height: 30, width: '100%', boxSizing: 'border-box', padding: '0 6px', border: `1px solid ${C.line}`, borderRadius: 8, fontFamily: EN, fontSize: 12, textAlign: 'right', color: C.ink, background: '#fff' };

export const QuoteCostCard: React.FC<{
    quoteId: string;
    pax: number;
    startDate?: string;
    /** AI 초안이 돌려준 원가 계획 — 새 계획이 오면 줄을 다시 만든다 */
    plan: CostPlan | null;
    /** 고객이 적은 예산 글 (참고 표시) */
    budgetText?: string;
    onApply: (perPersonYen: number, depositPerPersonYen: number) => void;
}> = ({ quoteId, pax, startDate, plan, budgetText, onApply }) => {
    const [items, setItems] = useState<CostItem[]>([]);
    const [config, setConfig] = useState<PricingConfig | null>(null);
    const [rate, setRate] = useState<Rate>(null);
    const [costing, setCosting] = useState<Costing | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(true);
    const [addId, setAddId] = useState('');
    const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
    const dirty = useRef(false);

    // 원가표 · 설정 · 환율 + 이 견적에 저장해 둔 원가 내역
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [p, q]: any[] = await Promise.all([api.pricing.get(), api.pricing.quoteCost(quoteId)]);
                if (!alive) return;
                setItems(p.items || []); setConfig(p.config); setRate(p.rate || null);
                if (q?.costing?.lines) setCosting(q.costing);
            } catch (e) {
                if (alive) setError(e instanceof Error ? e.message : '원가표를 불러오지 못했습니다.');
            } finally { if (alive) setLoaded(true); }
        })();
        return () => { alive = false; };
    }, [quoteId]);

    const build = (pl: CostPlan, cfg: PricingConfig, fuel = costing?.fuel): Lines => ({
        value: buildCostLines({ plan: pl, items, config: cfg, pax, grade: 'value', startDate, fuel }),
        full: buildCostLines({ plan: pl, items, config: cfg, pax, grade: 'full', startDate, fuel }),
        luxury: buildCostLines({ plan: pl, items, config: cfg, pax, grade: 'luxury', startDate, fuel }),
    });
    /** 차량·거리를 바꾸면 세 등급의 유류비 줄만 바꾼다 (없으면 추가) */
    const setFuel = (p: { vehicle?: string; km?: number }) => change(c => {
        const fuel = { ...c.fuel, ...p };
        const line = fuelLine(config!, fuel.vehicle, fuel.km);
        const swap = (ls: QuoteCostLine[]) => (ls.some(l => l.label.startsWith(FUEL_LABEL)) ? ls.map(l => (l.label.startsWith(FUEL_LABEL) ? { ...line } : l)) : [...ls, { ...line }]);
        return { ...c, fuel, lines: { value: swap(c.lines.value), full: swap(c.lines.full), luxury: swap(c.lines.luxury) } };
    });

    // AI 가 새 원가 계획을 주면 (저장해 둔 것과 다를 때만) 줄을 다시 만든다
    const planKey = useMemo(() => (plan ? JSON.stringify(plan) : ''), [plan]);
    useEffect(() => {
        if (!loaded || !config || !plan || !items.length) return;
        if (costing?.planKey === planKey) return;
        dirty.current = true;
        setCosting({ planKey, plan, grade: costing?.grade || 'value', lines: build(plan, config) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, planKey, items.length, config]);

    const baseRate = config ? (config.rateMode === 'manual' && config.manualMntPerJpy > 0 ? config.manualMntPerJpy : rate?.mntPerJpy || 0) : 0;
    const results = useMemo(() => {
        if (!config || !costing) return null;
        const out = {} as Record<TripGrade, ReturnType<typeof calcQuote>>;
        for (const g of GRADES) out[g] = calcQuote({ lines: costing.lines[g] || [], pax, config, mntPerJpy: baseRate });
        return out;
    }, [costing, config, pax, baseRate]);

    // 바뀌면 잠시 뒤 자동 저장 (견적별 · 관리자 전용 보관함)
    useEffect(() => {
        if (!costing || !dirty.current) return;
        setSaved('saving');
        const t = window.setTimeout(async () => {
            try {
                await api.pricing.saveQuoteCost(quoteId, { ...costing, mntPerJpy: effectiveRate(baseRate, config!), calcAt: new Date().toISOString() });
                dirty.current = false; setSaved('saved');
            } catch { setSaved('failed'); }
        }, 1200);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [costing]);

    const change = (fn: (c: Costing) => Costing) => { dirty.current = true; setCosting(c => (c ? fn(c) : c)); };
    const patchLine = (i: number, p: Partial<QuoteCostLine>) => change(c => ({ ...c, lines: { ...c.lines, [c.grade]: c.lines[c.grade].map((l, k) => (k === i ? { ...l, ...p, needsCheck: p.unitPriceMnt !== undefined ? false : l.needsCheck } : l)) } }));
    const removeLine = (i: number) => change(c => ({ ...c, lines: { ...c.lines, [c.grade]: c.lines[c.grade].filter((_, k) => k !== i) } }));
    const addLine = (id: string) => {
        const it = items.find(x => x.id === id);
        const line: QuoteCostLine = it
            ? { itemId: it.id, label: `${it.region ? `${it.region} · ` : ''}${it.name}`, category: it.category, unit: it.unit, unitPriceMnt: it.priceMnt, qty: 1, needsCheck: it.needsCheck }
            : { label: '직접 입력 항목', category: 'misc', unit: 'team', unitPriceMnt: 0, qty: 1, needsCheck: true };
        if (!costing) { dirty.current = true; setCosting({ planKey: '', plan: null, grade: 'value', lines: { value: [line], full: [{ ...line }], luxury: [{ ...line }] } }); }
        else change(c => ({ ...c, lines: { ...c.lines, [c.grade]: [...c.lines[c.grade], line] } }));
        setAddId('');
    };

    const box: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 16, border: `1px solid ${C.line}`, background: '#FFFFFF' };
    if (!loaded) return <div style={{ ...box, fontSize: 12, color: C.mute }}>원가표를 불러오는 중…</div>;
    if (error || !config) {
        return (
            <div style={{ ...box, background: C.amberBg, borderColor: 'transparent', fontSize: 12, fontWeight: 600, color: C.amberFg }}>
                원가 계산을 쓸 수 없습니다 — {error || '설정을 불러오지 못했습니다.'} <a href="/admin/pricing" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>요금표 · 규칙 열기</a>
            </div>
        );
    }
    if (!items.length) {
        return (
            <div style={{ ...box, background: C.amberBg, borderColor: 'transparent', fontSize: 12, fontWeight: 600, color: C.amberFg }}>
                원가표가 비어 있어 금액을 계산할 수 없습니다. <a href="/admin/pricing" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>요금표 · 규칙에서 원가표 채우기</a>
            </div>
        );
    }

    const grade = costing?.grade || 'value';
    const res = results?.[grade];
    const useRate = effectiveRate(baseRate, config);
    const pill = (on: boolean): React.CSSProperties => ({ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${on ? C.mint : C.line}`, background: on ? C.mintBg2 : '#FFFFFF', cursor: 'pointer', textAlign: 'left' });

    return (
        <div style={box}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0, border: 0, background: 'transparent', cursor: 'pointer', color: C.ink }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>원가 계산</span>
                    <span style={{ height: 20, padding: '0 7px', borderRadius: 6, background: C.bg, fontSize: 10, fontWeight: 700, color: C.sub, display: 'inline-flex', alignItems: 'center' }}>관리자만 보여요</span>
                </button>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: C.mute }}>
                    {useRate ? `¥1 = ${useRate.toFixed(2)}₮${config.rateBufferPct ? ` (여유 ${config.rateBufferPct}% 반영)` : ''}${rate?.stale ? ' · 환율이 오래됨' : ''}` : '환율 없음 — 요금표 · 규칙에서 정해 주세요'}
                    {saved === 'saving' ? ' · 저장 중…' : saved === 'saved' ? ' · 저장됨' : saved === 'failed' ? ' · 저장 실패' : ''}
                </span>
                {costing?.plan && (
                    <button type="button" title="AI 가 고른 항목으로 지금 인원·원가표에 맞춰 다시 만듭니다 (직접 고친 줄은 사라집니다)"
                        onClick={() => change(c => ({ ...c, lines: build(c.plan!, config) }))}
                        style={{ height: 30, padding: '0 10px', border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', fontSize: 11, fontWeight: 700, color: C.sub, cursor: 'pointer', whiteSpace: 'nowrap' }}>인원·원가표로 다시 계산</button>
                )}
                <a href="/admin/pricing" target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>요금표 · 규칙</a>
            </div>

            {!costing ? (
                <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
                    아직 원가 내역이 없습니다. <b>「AI 초안 만들기 / AI로 다시 만들기」</b>를 누르면 일정에 맞는 원가 항목이 자동으로 들어옵니다. 직접 넣으려면 아래에서 항목을 고르세요.
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {GRADES.map(g => {
                        const r = results?.[g];
                        return (
                            <button key={g} type="button" onClick={() => change(c => ({ ...c, grade: g }))} style={pill(grade === g)}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: grade === g ? C.mintDeep : C.ink }}>{GRADE_KO[g]}</span>
                                <span style={{ fontSize: 10.5, color: C.mute }}>{GRADE_STAY[g].hotel} + {GRADE_STAY[g].ger}</span>
                                <span style={{ fontFamily: EN, fontSize: 17, fontWeight: 700, color: C.ink }}>{r && useRate ? `¥${n0(r.perPersonYen)}` : '—'}<span style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 500, color: C.sub }}> / 1인</span></span>
                                {!!r?.checks && <span style={{ fontSize: 10.5, fontWeight: 700, color: C.amberFg }}>확인 필요 {r.checks}줄</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {open && costing && res && (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead><tr style={{ color: C.mute, textAlign: 'left' }}>
                                <th style={{ padding: '6px 4px', fontWeight: 700 }}>항목</th>
                                <th style={{ padding: '6px 4px', fontWeight: 700, width: 104, textAlign: 'right' }}>단가 ₮</th>
                                <th style={{ padding: '6px 4px', fontWeight: 700, width: 92 }}>과금</th>
                                <th style={{ padding: '6px 4px', fontWeight: 700, width: 64, textAlign: 'right' }}>수량</th>
                                <th style={{ padding: '6px 4px', fontWeight: 700, width: 104, textAlign: 'right' }}>금액 ₮</th>
                                <th style={{ width: 26 }} />
                            </tr></thead>
                            <tbody>
                                {res.lines.map((l, i) => (
                                    <tr key={i} style={{ borderTop: `1px solid ${C.line2}`, background: l.warn ? '#FFFCF2' : undefined }}>
                                        <td style={{ padding: '5px 4px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                                <span style={{ flex: 'none', height: 18, padding: '0 6px', borderRadius: 5, background: C.bg, fontSize: 10, fontWeight: 700, color: C.sub, display: 'inline-flex', alignItems: 'center' }}>{CATEGORY_KO[l.category]}</span>
                                                {l.itemId
                                                    ? <span style={{ fontWeight: 600, color: C.ink, minWidth: 0 }}>{l.label}</span>
                                                    : <input value={l.label} onChange={e => patchLine(i, { label: e.target.value })} style={{ ...inCell, textAlign: 'left', fontFamily: 'inherit' }} />}
                                                {l.warn && <span style={{ flex: 'none', height: 18, padding: '0 6px', borderRadius: 5, background: C.amberBg, fontSize: 10, fontWeight: 700, color: C.amberFg, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{l.warn}</span>}
                                            </span>
                                        </td>
                                        <td style={{ padding: '5px 4px' }}><input inputMode="numeric" value={l.unitPriceMnt ? n0(l.unitPriceMnt) : ''} placeholder="확인 필요" onChange={e => patchLine(i, { unitPriceMnt: num(e.target.value) })} style={{ ...inCell, borderColor: l.unitPriceMnt ? C.line : '#F0B429' }} /></td>
                                        <td style={{ padding: '5px 4px', color: C.sub, whiteSpace: 'nowrap' }}>{UNIT_KO[l.unit]} × {l.count}</td>
                                        <td style={{ padding: '5px 4px' }}><input inputMode="decimal" value={String(l.qty || '')} onChange={e => patchLine(i, { qty: num(e.target.value) })} style={inCell} /></td>
                                        <td style={{ padding: '5px 4px', textAlign: 'right', fontFamily: EN, fontWeight: 700, color: C.ink }} title={l.formula}>{n0(l.amountMnt)}</td>
                                        <td><button type="button" title="이 줄 빼기" onClick={() => removeLine(i)} style={{ border: 0, background: 'transparent', color: '#B6C7C3', cursor: 'pointer' }}>✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 10, background: C.bg, fontSize: 12, color: C.sub }}>
                        <b style={{ color: C.ink }}>유류비</b>
                        <select value={costing.fuel?.vehicle || config.vehicles[0]?.name || ''} onChange={e => setFuel({ vehicle: e.target.value })} style={{ height: 30, padding: '0 6px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, background: '#fff', color: C.ink }}>
                            {config.vehicles.map(v => <option key={v.name} value={v.name}>{v.name} · {v.lPer100}L/100km</option>)}
                        </select>
                        <span>이동 거리</span>
                        <input inputMode="numeric" value={String(costing.fuel?.km ?? config.defaultCourseKm)} onChange={e => setFuel({ km: num(e.target.value) })} style={{ ...inCell, width: 76 }} />
                        <span>km</span>
                        <span style={{ color: config.fuelPriceMnt ? C.mute : C.amberFg, fontWeight: config.fuelPriceMnt ? 400 : 700 }}>{config.fuelPriceMnt ? `리터당 ${n0(config.fuelPriceMnt)}₮` : '리터당 가격이 없어요 — 요금표 · 규칙 → 계산 설정에서 넣어 주세요'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <select value={addId} onChange={e => { if (e.target.value) addLine(e.target.value); }} style={{ flex: '1 1 240px', height: 34, padding: '0 8px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, color: C.ink, background: '#fff' }}>
                            <option value="">+ 원가표에서 항목 추가 ({GRADE_KO[grade]})</option>
                            {items.filter(i => i.isActive).map(i => <option key={i.id} value={i.id}>{CATEGORY_KO[i.category]} · {i.region ? `${i.region} · ` : ''}{i.name} — {i.priceMnt ? `${n0(i.priceMnt)}₮` : '확인 필요'} / {UNIT_KO[i.unit]}</option>)}
                        </select>
                        <button type="button" onClick={() => addLine('')} style={{ height: 34, padding: '0 12px', border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 700, color: C.sub, cursor: 'pointer' }}>+ 직접 입력</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 8 }}>
                        {([
                            ['총원가', `${n0(res.totalCostMnt)}₮`, ''],
                            [`마진 ${res.marginPct}%`, `${n0(res.marginMnt)}₮`, `${pax}명 기준`],
                            ['팀 총액', `${n0(res.teamTotalMnt)}₮`, useRate ? `¥${n0(res.teamTotalYen)}` : ''],
                            ['1인 (반올림 전)', useRate ? `¥${n0(res.perPersonYenRaw)}` : '—', `반올림 ${n0(config.roundYen)}엔 단위`],
                        ] as const).map(([k, v, s]) => (
                            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderRadius: 12, background: C.bg }}>
                                <span style={{ fontSize: 11, color: C.sub }}>{k}</span>
                                <span style={{ fontFamily: EN, fontSize: 14, fontWeight: 700, color: C.ink }}>{v}</span>
                                {s && <span style={{ fontSize: 10.5, color: C.mute }}>{s}</span>}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 12, background: C.ink, color: '#FFFFFF' }}>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 200 }}>
                            <span style={{ fontSize: 11, color: '#B6C7C3' }}>{GRADE_KO[grade]} · 1인 판매가 · 팀 합계 ¥{n0(res.roundedTeamYen)} ({pax}명)</span>
                            <span style={{ fontFamily: EN, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{useRate ? `¥${n0(res.perPersonYen)}` : '환율 없음'}</span>
                            {budgetText && <span style={{ fontSize: 11, color: '#B6C7C3' }}>고객이 적은 예산: {budgetText}</span>}
                        </span>
                        {res.checks > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#FFD66B' }}>확인 필요 {res.checks}줄 — 금액이 빠져 있을 수 있어요</span>}
                        <button type="button" disabled={!useRate || !res.perPersonYen} onClick={() => onApply(res.perPersonYen, config.depositYen)}
                            style={{ flex: 'none', height: 40, padding: '0 16px', border: 0, borderRadius: 10, background: useRate && res.perPersonYen ? `linear-gradient(135deg,${C.mint} 0%,#06C4A0 100%)` : '#3F5856', fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: useRate && res.perPersonYen ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>1인 요금에 넣기</button>
                    </div>
                    <span style={{ fontSize: 10.5, color: C.mute, lineHeight: 1.7 }}>
                        금액은 AI가 아니라 원가표와 계산 설정으로 계산합니다 · 조식은 숙박에 포함으로 보고 점심·저녁만 계산 · 식사 인원은 고객 수 기준(가이드·기사 식사는 필요하면 줄을 추가) · 유류비 = 거리 ÷ 100 × 연비 × 리터당 가격
                    </span>
                </>
            )}
            {!costing && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <select value={addId} onChange={e => { if (e.target.value) addLine(e.target.value); }} style={{ flex: '1 1 240px', height: 34, padding: '0 8px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, color: C.ink, background: '#fff' }}>
                        <option value="">+ 원가표에서 항목 추가</option>
                        {items.filter(i => i.isActive).map(i => <option key={i.id} value={i.id}>{CATEGORY_KO[i.category]} · {i.region ? `${i.region} · ` : ''}{i.name}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
};
