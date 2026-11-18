import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../lib/api';
import {
    CATEGORY_KO, UNIT_KO, DEFAULT_PRICING_CONFIG, GRADE_KO, GRADE_STAY, calcQuote, effectiveRate, marginPctFor, staffLines,
    type CostCategory, type CostItem, type CostUnit, type PricingConfig, type TripGrade,
} from '../lib/pricing';

/**
 * 요금표 · 규칙 — 원가표(₮) · 계산 설정 · 엔화 환율.
 * 금액은 AI 가 정하지 않는다: AI 는 원가표 항목을 고르고, 계산은 여기 원가표와 설정으로 한다.
 */

type Rate = { mntPerJpy: number; fetchedAt: string; source: string; stale?: boolean } | null;
const CATS = Object.keys(CATEGORY_KO) as CostCategory[];
const UNITS = Object.keys(UNIT_KO) as CostUnit[];
const num = (v: string) => { const n = Math.round(Number(v.replace(/[^\d.]/g, ''))); return Number.isFinite(n) && n > 0 ? n : 0; };
const won = (n: number) => (n ? n.toLocaleString('en-US') : '');
const cell: React.CSSProperties = { height: 34, width: '100%', boxSizing: 'border-box', padding: '0 8px', border: '1px solid #E3E8E7', borderRadius: 8, fontSize: 13, background: '#fff', color: '#123B3A' };
const th: React.CSSProperties = { padding: '8px 8px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#5F7674', whiteSpace: 'nowrap', background: '#F7FAF9', position: 'sticky', top: 0, zIndex: 1 };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E6EFEC', borderRadius: 16, padding: 20 };
const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: '#5F7674' };

/** 붙여 넣은 표(탭·쉼표 구분) → 원가 항목. 열 순서: 분류, 지역, 항목, 등급, 단위, 단가, 성수기 단가, 공급처, 메모 */
function parsePaste(text: string): CostItem[] {
    const catOf = (t: string) => CATS.find(c => c === t || CATEGORY_KO[c] === t || CATEGORY_KO[c].includes(t)) || 'misc';
    const unitOf = (t: string) => UNITS.find(u => u === t || UNIT_KO[u] === t || UNIT_KO[u].replace(/·/g, '') === t.replace(/[·\s]/g, '')) || 'person';
    return text.split(/\r?\n/).map(l => l.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x => x.trim().replace(/^"|"$/g, ''))).filter(p => p.length >= 6 && p[2] && !/^(분류|category)$/i.test(p[0]))
        .map((p, i) => ({
            id: `cost-${Date.now().toString(36)}-p${i.toString(36)}`, category: catOf(p[0]) as CostCategory, region: p[1] || '', name: p[2], grade: p[3] || '', unit: unitOf(p[4] || '') as CostUnit,
            priceMnt: num(p[5] || ''), peakPriceMnt: num(p[6] || ''), supplier: p[7] || '', note: p[8] || '', source: '붙여넣기', needsCheck: !num(p[5] || ''), isActive: true, sortOrder: 0,
        }));
}

export const AdminPricing: React.FC = () => {
    const [tab, setTab] = useState<'items' | 'config' | 'rate'>('items');
    const [items, setItems] = useState<CostItem[]>([]);
    const [config, setConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
    const [rate, setRate] = useState<Rate>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [needMigrate, setNeedMigrate] = useState(false);
    const [cat, setCat] = useState<'all' | CostCategory>('all');
    const [region, setRegion] = useState('all');
    const [onlyCheck, setOnlyCheck] = useState(false);
    const [paste, setPaste] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const r: any = await api.pricing.get();
            setItems(r.items || []); setConfig(r.config || DEFAULT_PRICING_CONFIG); setRate(r.rate || null);
            setNeedMigrate(false); setDirty(false);
        } catch (e) {
            const t = e instanceof Error ? e.message : '불러오지 못했습니다.';
            setNeedMigrate(/migrate-db/.test(t));
            setMsg({ ok: false, text: t });
        } finally { setLoading(false); }
    };
    useEffect(() => { void load(); }, []);

    const patch = (id: string, p: Partial<CostItem>) => { setItems(list => list.map(it => (it.id === id ? { ...it, ...p } : it))); setDirty(true); };
    const setCfg = (p: Partial<PricingConfig>) => { setConfig(c => ({ ...c, ...p })); setDirty(true); };
    const addItem = () => {
        const it: CostItem = { id: `cost-${Date.now().toString(36)}`, category: cat === 'all' ? 'stay' : cat, region: region === 'all' ? '' : region, name: '', grade: '', unit: 'person', priceMnt: 0, peakPriceMnt: 0, supplier: '', note: '', source: '', needsCheck: true, isActive: true, sortOrder: 0 };
        setItems(list => [it, ...list]); setDirty(true);
    };
    const save = async () => {
        if (busy) return;
        const blank = items.filter(it => !it.name.trim()).length;
        setBusy(true); setMsg(null);
        try {
            const r: any = await api.pricing.saveItems(items.filter(it => it.name.trim()));
            await api.pricing.saveConfig(config);
            setItems(r.items || []); setDirty(false);
            setMsg({ ok: true, text: `저장했습니다 — 원가 항목 ${r.items?.length || 0}개${blank ? ` (이름이 빈 ${blank}줄은 뺐습니다)` : ''}` });
        } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '저장하지 못했습니다.' }); }
        finally { setBusy(false); }
    };
    const seed = async () => {
        setBusy(true); setMsg(null);
        try { const r: any = await api.pricing.seed(); setItems(r.items || []); setMsg({ ok: true, text: `받은 원가표에서 ${r.items?.length || 0}개 항목을 넣었습니다 — 모두 「확인 필요」 표시입니다. 단가를 확인하고 표시를 꺼 주세요.` }); }
        catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '넣지 못했습니다.' }); }
        finally { setBusy(false); }
    };
    const refreshRate = async () => {
        setBusy(true);
        try { setRate(await api.pricing.rate(true)); setMsg({ ok: true, text: '환율을 새로 받았습니다.' }); }
        catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : '환율을 받지 못했습니다.' }); }
        finally { setBusy(false); }
    };

    const regions = useMemo(() => [...new Set(items.map(i => i.region).filter(Boolean))].sort(), [items]);
    const shown = items.filter(i => (cat === 'all' || i.category === cat) && (region === 'all' || i.region === region) && (!onlyCheck || i.needsCheck || !i.priceMnt));
    const checks = items.filter(i => i.needsCheck || !i.priceMnt).length;
    const baseRate = config.rateMode === 'manual' && config.manualMntPerJpy > 0 ? config.manualMntPerJpy : rate?.mntPerJpy || 0;
    const useRate = effectiveRate(baseRate, config);

    // 설정이 어떻게 계산되는지 보여 주는 작은 예 — 테를지 2박 3일
    const sample = (pax: number, grade: TripGrade) => {
        const find = (r: string, g: string) => items.find(i => i.category === 'stay' && i.region === r && i.grade === g)?.priceMnt || 0;
        const ger = grade === 'value' ? find('테를지', '일반 게르') : find('테를지', '고급 게르');
        const lines = [
            { label: '테를지 게르', category: 'stay' as const, unit: 'person_night' as const, unitPriceMnt: ger, qty: 2 },
            ...staffLines(pax, 2, config),
        ];
        return calcQuote({ lines, pax, config, mntPerJpy: baseRate });
    };

    const tabBtn = (k: typeof tab, label: string) => (
        <button key={k} type="button" onClick={() => setTab(k)} style={{ height: 38, padding: '0 14px', border: 0, borderBottom: `2px solid ${tab === k ? '#00A88B' : 'transparent'}`, background: 'transparent', fontSize: 13.5, fontWeight: 700, color: tab === k ? '#123B3A' : '#8A9E9B', cursor: 'pointer' }}>{label}</button>
    );
    const numField = (label: string, key: keyof PricingConfig, suffix: string, hint?: string) => (
        <label style={lbl}>{label}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input inputMode="decimal" style={{ ...cell, height: 40 }} value={String(config[key] ?? '')}
                    onChange={e => { const v = e.target.value.replace(/[^\d.]/g, ''); setCfg({ [key]: v === '' ? 0 : Number(v) } as Partial<PricingConfig>); }} />
                <span style={{ flex: 'none', fontSize: 12, color: '#8A9E9B', whiteSpace: 'nowrap' }}>{suffix}</span>
            </span>
            {hint && <span style={{ fontSize: 11, fontWeight: 500, color: '#8A9E9B' }}>{hint}</span>}
        </label>
    );

    return (
        <AdminLayout activePage="pricing" title="요금표 · 규칙" eyebrow="견적"
            description="금액은 AI가 정하지 않습니다. AI는 문의를 읽고 원가표 항목을 고르고, 계산은 여기 원가표와 설정으로 합니다."
            actions={<button type="button" className="btn btn-ink" onClick={save} disabled={busy || !dirty}>{busy ? '저장 중…' : dirty ? '변경 사항 저장' : '저장됨'}</button>}>
            <div className="route-anim" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {msg && (
                    <div role="status" style={{ padding: '12px 16px', borderRadius: 12, background: msg.ok ? '#E8FAF5' : '#FFF1F0', color: msg.ok ? '#007F75' : '#B42318', fontSize: 13, fontWeight: 700, display: 'flex', gap: 8 }}>
                        <span style={{ flex: 1 }}>{msg.text}{needMigrate && <> — <a href="/api/migrate-db" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>/api/migrate-db 열기</a> 후 새로고침</>}</span>
                        <button type="button" onClick={() => setMsg(null)} style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E6EFEC' }}>
                    {tabBtn('items', `원가표 ${items.length}`)}{tabBtn('config', '계산 설정')}{tabBtn('rate', '환율')}
                </div>

                {tab === 'items' && (
                    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: 14 }}>
                            <select className="select" value={cat} onChange={e => setCat(e.target.value as typeof cat)}>
                                <option value="all">분류: 전체</option>{CATS.map(c => <option key={c} value={c}>{CATEGORY_KO[c]}</option>)}
                            </select>
                            <select className="select" value={region} onChange={e => setRegion(e.target.value)}>
                                <option value="all">지역: 전체</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: checks ? '#8A5A00' : '#8A9E9B', cursor: 'pointer' }}>
                                <input type="checkbox" checked={onlyCheck} onChange={e => setOnlyCheck(e.target.checked)} />확인 필요만 ({checks})
                            </label>
                            <span style={{ flex: 1 }} />
                            <button type="button" className="btn btn-ghost" onClick={() => setPaste('')}>표 붙여넣기</button>
                            <button type="button" className="btn btn-ghost" onClick={addItem}>+ 항목 추가</button>
                        </div>
                        {paste !== null && (
                            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <span style={{ fontSize: 12, color: '#5F7674' }}>구글 시트에서 복사해 붙여 넣으세요. 열 순서: <b>분류 · 지역 · 항목 · 등급 · 단위 · 단가 · 성수기 단가 · 공급처 · 메모</b> (분류: {CATS.map(c => CATEGORY_KO[c]).join('/')} · 단위: {UNITS.map(u => UNIT_KO[u]).join(' / ')})</span>
                                <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={5} placeholder={'숙박\t테를지\t고급 게르\t고급 게르\t1인·1박\t290000'} style={{ ...cell, height: 'auto', padding: 10, fontFamily: 'monospace' }} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className="btn btn-ink" disabled={!parsePaste(paste).length} onClick={() => { const add = parsePaste(paste); setItems(l => [...add, ...l]); setDirty(true); setPaste(null); setMsg({ ok: true, text: `${add.length}줄을 추가했습니다 — 「변경 사항 저장」을 눌러야 저장됩니다.` }); }}>{parsePaste(paste).length}줄 추가</button>
                                    <button type="button" className="btn btn-ghost" onClick={() => setPaste(null)}>닫기</button>
                                </div>
                            </div>
                        )}
                        {loading ? <div style={{ padding: 30, textAlign: 'center', color: '#8A9E9B', fontSize: 13 }}>불러오는 중…</div>
                            : items.length === 0 ? (
                                <div style={{ padding: 30, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                                    <span style={{ fontSize: 13.5, color: '#5F7674' }}>원가표가 비어 있습니다. 받은 원가표(숙박 지역·등급별 최고가, 입장료, 식사)로 시작할 수 있습니다.</span>
                                    <button type="button" className="btn btn-ink" onClick={seed} disabled={busy || needMigrate}>받은 원가표로 채우기</button>
                                </div>
                            ) : (
                                <div style={{ overflow: 'auto', maxHeight: '64vh' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
                                        <thead><tr>
                                            <th style={{ ...th, width: 96 }}>분류</th><th style={{ ...th, width: 150 }}>지역</th><th style={th}>항목</th><th style={{ ...th, width: 110 }}>등급</th>
                                            <th style={{ ...th, width: 108 }}>단위</th><th style={{ ...th, width: 108 }}>비수기 원가 ₮</th><th style={{ ...th, width: 108 }}>성수기 원가 ₮</th>
                                            <th style={th}>공급처 · 메모</th><th style={{ ...th, width: 70 }}>확인 필요</th><th style={{ ...th, width: 86 }}>최근 수정</th><th style={{ ...th, width: 34 }} />
                                        </tr></thead>
                                        <tbody>
                                            {shown.map(it => {
                                                const warn = it.needsCheck || !it.priceMnt;
                                                return (
                                                    <tr key={it.id} style={{ borderTop: '1px solid #EEF3F1', background: warn ? '#FFFCF2' : undefined }}>
                                                        <td style={{ padding: 5 }}><select style={cell} value={it.category} onChange={e => patch(it.id, { category: e.target.value as CostCategory })}>{CATS.map(c => <option key={c} value={c}>{CATEGORY_KO[c]}</option>)}</select></td>
                                                        <td style={{ padding: 5 }}><input style={cell} value={it.region} list="pricing-regions" onChange={e => patch(it.id, { region: e.target.value })} /></td>
                                                        <td style={{ padding: 5 }}><input style={{ ...cell, fontWeight: 700 }} value={it.name} placeholder="항목 이름" onChange={e => patch(it.id, { name: e.target.value })} /></td>
                                                        <td style={{ padding: 5 }}><input style={cell} value={it.grade} list="pricing-grades" onChange={e => patch(it.id, { grade: e.target.value })} /></td>
                                                        <td style={{ padding: 5 }}><select style={cell} value={it.unit} onChange={e => patch(it.id, { unit: e.target.value as CostUnit })}>{UNITS.map(u => <option key={u} value={u}>{UNIT_KO[u]}</option>)}</select></td>
                                                        <td style={{ padding: 5 }}><input inputMode="numeric" style={{ ...cell, textAlign: 'right', fontWeight: 700, borderColor: it.priceMnt ? '#E3E8E7' : '#F0B429' }} value={won(it.priceMnt)} placeholder="확인 필요" onChange={e => patch(it.id, { priceMnt: num(e.target.value) })} /></td>
                                                        <td style={{ padding: 5 }}><input inputMode="numeric" style={{ ...cell, textAlign: 'right' }} value={won(it.peakPriceMnt)} placeholder="같음" onChange={e => patch(it.id, { peakPriceMnt: num(e.target.value) })} /></td>
                                                        <td style={{ padding: 5 }}><input style={cell} value={it.note || it.supplier} onChange={e => patch(it.id, { note: e.target.value, supplier: '' })} /></td>
                                                        <td style={{ padding: 5, textAlign: 'center' }}><input type="checkbox" checked={it.needsCheck} onChange={e => patch(it.id, { needsCheck: e.target.checked })} /></td>
                                                        <td style={{ padding: 5, fontSize: 11.5, color: '#8A9E9B', whiteSpace: 'nowrap' }}>{(it.updatedAt || '').slice(0, 10) || '새 항목'}</td>
                                                        <td style={{ padding: 5 }}><button type="button" title="이 줄 지우기" onClick={() => { setItems(l => l.filter(x => x.id !== it.id)); setDirty(true); }} style={{ border: 0, background: 'transparent', color: '#B6C7C3', cursor: 'pointer', fontSize: 15 }}>✕</button></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <datalist id="pricing-regions">{regions.map(r => <option key={r} value={r} />)}</datalist>
                                    <datalist id="pricing-grades">{['3성급', '4성급', '5성급', '일반 게르', '고급 게르'].map(g => <option key={g} value={g} />)}</datalist>
                                </div>
                            )}
                        <div style={{ padding: '10px 14px', borderTop: '1px solid #EEF3F1', fontSize: 11.5, color: '#8A9E9B', lineHeight: 1.7 }}>
                            단가가 비어 있거나 0이면 무료가 아니라 「확인 필요」로 계산에 표시됩니다 · 호텔은 <b>객실·1박</b>(2인 1실 요금 그대로), 게르·캠프는 <b>1인·1박</b> · 숙박은 지역·등급마다 가장 높은 단가 한 줄
                        </div>
                    </div>
                )}

                {tab === 'config' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 14 }}>
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <b style={{ fontSize: 14 }}>마진 · 금액 표시</b>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
                                {numField('인원이 적을 때', 'marginSmall', '%')}
                                {numField('인원이 많을 때', 'marginLarge', '%')}
                                {numField('「많다」 기준', 'marginLargeFrom', '명 이상')}
                            </div>
                            <span style={{ fontSize: 11.5, color: '#8A9E9B' }}>마진은 원가에 더하는 방식입니다 (원가 × (1 + 마진)). 지금 설정: {config.marginLargeFrom - 1}명까지 {config.marginSmall}% · {config.marginLargeFrom}명부터 {config.marginLarge}%</span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                                {numField('1인 금액 반올림 단위', 'roundYen', '엔', '마지막 1인 금액만 반올림합니다')}
                                {numField('1인 예약금', 'depositYen', '엔', 'PayPal')}
                            </div>
                        </div>
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <b style={{ fontSize: 14 }}>가이드 · 기사</b>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                                {numField('가이드 겸 기사 1명으로 가는 인원', 'guideDriverMaxPax', '명 이하', '넘으면 가이드 1 + 기사 1 (중앙몽골·울란바타르)')}
                                {numField('가이드 겸 기사 1일', 'guideDriverDayMnt', '₮')}
                                {numField('일본어 가이드 1일', 'guideDayMnt', '₮')}
                                {numField('기사 1일', 'driverDayMnt', '₮')}
                                {numField('가이드·기사 숙박 (1명 1박)', 'staffStayMnt', '₮')}
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                <input type="checkbox" checked={config.lastDayHalf} onChange={e => setCfg({ lastDayHalf: e.target.checked })} />마지막 날이 오전에 끝나면 그날 인건비는 0.5일 (3박 4일 = 3.5일)
                            </label>
                        </div>
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <b style={{ fontSize: 14 }}>숙박 · 식사 · 체험</b>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: '#3F5856' }}>
                                {(Object.keys(GRADE_KO) as TripGrade[]).map(g => <span key={g}><b style={{ display: 'inline-block', width: 64 }}>{GRADE_KO[g]}</b>{GRADE_STAY[g].hotel} 호텔 + {GRADE_STAY[g].ger}{g === 'luxury' ? ' (2인 1실)' : ''}</span>)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                                {numField('럭셔리 게르 1실 = 고급 게르 1인 ×', 'luxuryGerMultiplier', '배')}
                                {numField('게르 조식 (미포함 캠프만)', 'breakfastMnt', '₮/인', '조식은 보통 캠프장·호텔 숙박에 포함 — 점심·저녁만 따로 계산')}
                                {numField('승마·낙타 — 마부 1명당 고객', 'horsemanPerPax', '명', '고객 2명 → 3인분, 4명 → 6인분')}
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                <input type="checkbox" checked={config.gerMinThreeForTwo} onChange={e => setCfg({ gerMinThreeForTwo: e.target.checked })} />4인 게르를 2명이 쓰면 최소 3인분 청구
                            </label>
                        </div>
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <b style={{ fontSize: 14 }}>유류비 <span style={{ fontWeight: 500, color: '#8A9E9B', fontSize: 12 }}>거리 ÷ 100 × 연비 × 리터당 가격</span></b>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                                {numField('연료 리터당 가격', 'fuelPriceMnt', '₮/L', config.fuelPriceMnt ? undefined : '비어 있으면 유류비가 「확인 필요」로 나옵니다')}
                                {numField('기본 코스 거리', 'defaultCourseKm', 'km', '울란바타르 ↔ 테를지 코스 가정 — 견적마다 바꿀 수 있음')}
                            </div>
                            {config.vehicles.map((v, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <input style={cell} value={v.name} placeholder="차량 이름" onChange={e => setCfg({ vehicles: config.vehicles.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
                                    <input inputMode="decimal" style={{ ...cell, width: 80, textAlign: 'right' }} value={String(v.lPer100 || '')} onChange={e => setCfg({ vehicles: config.vehicles.map((x, k) => (k === i ? { ...x, lPer100: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 } : x)) })} />
                                    <span style={{ flex: 'none', fontSize: 12, color: '#8A9E9B', whiteSpace: 'nowrap' }}>L / 100km{i === 0 ? ' · 기본' : ''}</span>
                                    <button type="button" onClick={() => setCfg({ vehicles: config.vehicles.filter((_, k) => k !== i) })} style={{ border: 0, background: 'transparent', color: '#B6C7C3', cursor: 'pointer' }}>✕</button>
                                </div>
                            ))}
                            <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setCfg({ vehicles: [...config.vehicles, { name: '', lPer100: 20 }] })}>+ 차량 추가</button>
                        </div>
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <b style={{ fontSize: 14 }}>성수기 기간 <span style={{ fontWeight: 500, color: '#8A9E9B', fontSize: 12 }}>출발일이 여기 들면 성수기 원가를 씁니다</span></b>
                            {config.peakSeasons.map((s, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <input style={{ ...cell, width: 80 }} value={s.from} placeholder="07-01" onChange={e => setCfg({ peakSeasons: config.peakSeasons.map((x, k) => (k === i ? { ...x, from: e.target.value } : x)) })} />
                                    <span>~</span>
                                    <input style={{ ...cell, width: 80 }} value={s.to} placeholder="08-31" onChange={e => setCfg({ peakSeasons: config.peakSeasons.map((x, k) => (k === i ? { ...x, to: e.target.value } : x)) })} />
                                    <input style={cell} value={s.label} placeholder="이름 (예: 나담)" onChange={e => setCfg({ peakSeasons: config.peakSeasons.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} />
                                    <button type="button" onClick={() => setCfg({ peakSeasons: config.peakSeasons.filter((_, k) => k !== i) })} style={{ border: 0, background: 'transparent', color: '#B6C7C3', cursor: 'pointer' }}>✕</button>
                                </div>
                            ))}
                            <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setCfg({ peakSeasons: [...config.peakSeasons, { from: '', to: '', label: '' }] })}>+ 기간 추가</button>
                            <span style={{ fontSize: 11.5, color: '#8A9E9B' }}>월-일 두 자리씩 (예: 07-10). 형식이 틀린 줄은 저장할 때 빠집니다.</span>
                        </div>
                    </div>
                )}

                {tab === 'rate' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 14 }}>
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <b style={{ fontSize: 14 }}>엔화 환율 <span style={{ fontWeight: 500, color: '#8A9E9B', fontSize: 12 }}>1엔 = 몇 투그릭</span></b>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>{rate ? `¥1 = ${rate.mntPerJpy.toFixed(2)}₮` : '환율 없음'}</span>
                                {rate && <span style={{ fontSize: 12, color: rate.stale ? '#B42318' : '#8A9E9B' }}>{rate.stale ? '새 환율을 받지 못해 전에 받은 값입니다 · ' : ''}{new Date(rate.fetchedAt).toLocaleString('ko-KR')} 기준 · {rate.source}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {(['live', 'manual'] as const).map(m => (
                                    <button key={m} type="button" onClick={() => setCfg({ rateMode: m })} className={`btn ${config.rateMode === m ? 'btn-ink' : 'btn-ghost'}`}>{m === 'live' ? '실시간 환율 사용 (매일 자동 갱신)' : '직접 입력한 환율로 고정'}</button>
                                ))}
                                <button type="button" className="btn btn-ghost" onClick={refreshRate} disabled={busy}>지금 새로 받기</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                                {numField('직접 입력 환율', 'manualMntPerJpy', '₮ / 엔', config.rateMode === 'manual' ? '이 값으로 계산합니다' : '「고정」을 고르면 쓰입니다')}
                                {numField('환율 여유분', 'rateBufferPct', '%', '환율이 움직여도 손해 보지 않게 엔화 금액을 이만큼 높게')}
                            </div>
                            <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F7FAF9', fontSize: 13, color: '#3F5856' }}>
                                계산에 쓰는 환율: <b style={{ color: '#123B3A' }}>{useRate ? `¥1 = ${useRate.toFixed(2)}₮` : '환율을 정해 주세요'}</b>
                                {useRate > 0 && <> · 1,000,000₮ = <b style={{ color: '#123B3A' }}>¥{Math.round(1000000 / useRate).toLocaleString('en-US')}</b></>}
                            </div>
                            <span style={{ fontSize: 11.5, color: '#8A9E9B', lineHeight: 1.7 }}>실시간 환율은 은행 고시 환율이 아니라 시장 중간 환율이며, 하루에 한 번쯤 바뀝니다. 견적에는 계산한 날의 환율이 함께 기록됩니다.</span>
                        </div>
                        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <b style={{ fontSize: 14 }}>설정 확인용 예시 <span style={{ fontWeight: 500, color: '#8A9E9B', fontSize: 12 }}>테를지 게르 2박 + 가이드·기사만 (식사·입장료 제외)</span></b>
                            {!useRate ? <span style={{ fontSize: 13, color: '#8A9E9B' }}>환율이 있어야 계산할 수 있습니다.</span> : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                                    <thead><tr><th style={th}>인원 · 등급</th><th style={{ ...th, textAlign: 'right' }}>원가 ₮</th><th style={{ ...th, textAlign: 'right' }}>마진</th><th style={{ ...th, textAlign: 'right' }}>1인 금액</th></tr></thead>
                                    <tbody>
                                        {([[2, 'value'], [2, 'full'], [5, 'value'], [5, 'full']] as Array<[number, TripGrade]>).map(([p, g]) => {
                                            const r = sample(p, g);
                                            return (
                                                <tr key={`${p}${g}`} style={{ borderTop: '1px solid #EEF3F1' }}>
                                                    <td style={{ padding: 8 }}>{p}명 · {GRADE_KO[g]}</td>
                                                    <td style={{ padding: 8, textAlign: 'right' }}>{Math.round(r.totalCostMnt).toLocaleString('en-US')}</td>
                                                    <td style={{ padding: 8, textAlign: 'right' }}>{marginPctFor(p, config)}%</td>
                                                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 800 }}>{r.checks ? '단가 확인 필요' : `¥${r.perPersonYen.toLocaleString('en-US')}`}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                            <span style={{ fontSize: 11.5, color: '#8A9E9B', lineHeight: 1.7 }}>실제 견적 금액은 견적 편집기의 「원가 계산」에서 일정의 모든 항목으로 계산합니다.</span>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};
