import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Icon } from '../components/admin/console/Icon';
import { api } from '../lib/api';

/**
 * Байр захиалгын удирдлага (дотоод) — байрны хариуцсан ажилтанд зориулсан, монгол хэлээр.
 * Баталгаажсан захиалгыг нэг дороос харж, өдөр тутмын байр/өрөө/хүн/захиалгын төлвийг удирдана.
 * Аяллын мэдээлэл (нислэг·аялагч) нь reservations.contractData-аас, байр нь dailyAccommodations(JSON)-д хадгална.
 * Схемийн миграци шаардлагагүй.
 */

type BookingStatus = 'Илгээгээгүй' | 'Имэйл илгээсэн' | 'Хариу ирсэн' | 'Баталгаажсан';
const STATUS_OPTIONS: BookingStatus[] = ['Илгээгээгүй', 'Имэйл илгээсэн', 'Хариу ирсэн', 'Баталгаажсан'];
const OCCUPANCY_OPTIONS = ['', '1 хүн/өрөө', '2 хүн/өрөө', '3 хүн/өрөө', '4 хүн/өрөө', '5 хүн/өрөө', '6 хүн/өрөө'];
const WD = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

interface DailyAcc {
    day: number;
    accommodation: {
        id?: string;
        name?: string;
        type?: string;
        location?: string;
        images?: string[];
        description?: string;
        facilities?: string[];
        roomCount?: number;
        occupancy?: string;
        bookingStatus?: BookingStatus;
    };
}
interface Traveler { name?: string; passportName?: string; birthdate?: string; gender?: string; phone?: string }
interface Flight { date?: string; time?: string; flight?: string }
interface Reservation {
    id: string;
    type?: string;
    productName?: string;
    customerName?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    depositStatus?: string;
    travelers?: number;
    reservationNumber?: string | null;
    createdAt?: string;
    dailyAccommodations?: DailyAcc[];
    assignedGuide?: { id?: string; name?: string; phone?: string; image?: string; kakaoId?: string; languages?: string[]; specialties?: string[] };
    contractData?: {
        region?: string; category?: string;
        travelers?: Traveler[];
        arrival?: Flight; departure?: Flight;
        agreement?: { agreed?: boolean; name?: string; agreedAt?: string };
        vehicle?: { type?: string; phone?: string };
    };
}

const statusStyle = (s?: BookingStatus | 'Хуваарилаагүй' | 'Явагдаж байна'): { bg: string; fg: string } => ({
    'Хуваарилаагүй': { bg: '#F1F2F4', fg: '#8A8F99' },
    'Илгээгээгүй': { bg: '#EEF1F5', fg: '#5F636B' },
    'Имэйл илгээсэн': { bg: '#E8F2FF', fg: '#0B6FE0' },
    'Хариу ирсэн': { bg: '#FEF6E7', fg: '#B45309' },
    'Явагдаж байна': { bg: '#FEF6E7', fg: '#B45309' },
    'Баталгаажсан': { bg: '#E4F7EC', fg: '#0F7A43' },
}[s || 'Хуваарилаагүй'] || { bg: '#F1F2F4', fg: '#8A8F99' });

const nightsOf = (r: Reservation): number => {
    if (!r.startDate || !r.endDate) return 0;
    const s = new Date(r.startDate), e = new Date(r.endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
    const n = Math.round((e.getTime() - s.getTime()) / 86400000);
    return n > 0 ? n : 0;
};
const fmtDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};
const monthKey = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const nightDate = (start?: string, dayNum?: number) => {
    if (!start || !dayNum) return '';
    const d = new Date(start);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + dayNum - 1);
    return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
};
const regionOf = (r: Reservation) => (r.contractData?.region || r.contractData?.category || r.productName || '-');
const genderMn = (g?: string) => g === '男性' || g === 'male' ? 'Эрэгтэй' : g === '女性' || g === 'female' ? 'Эмэгтэй' : (g || '-');
const flightLine = (f?: Flight) => [f?.date, f?.time, f?.flight].filter(Boolean).join(' · ') || '-';

// 저장된 dailyAccommodations이 있으면 그대로(추가/삭제 보존), 없으면 박일수만큼 빈 행 생성
const daysOf = (r: Reservation): DailyAcc[] => {
    const existing = Array.isArray(r.dailyAccommodations) ? r.dailyAccommodations : [];
    if (existing.length > 0) return existing;
    const nights = nightsOf(r);
    if (nights <= 0) return [];
    return Array.from({ length: nights }, (_, i) => ({ day: i + 1, accommodation: {} }));
};
const summaryOf = (r: Reservation) => {
    const rows = daysOf(r);
    const total = rows.length;
    const assigned = rows.filter(d => (d.accommodation?.name || '').trim()).length;
    const confirmed = rows.filter(d => d.accommodation?.bookingStatus === 'Баталгаажсан').length;
    const allConfirmed = total > 0 && confirmed === total;
    const label: BookingStatus | 'Хуваарилаагүй' | 'Явагдаж байна' = allConfirmed ? 'Баталгаажсан' : (assigned > 0 || confirmed > 0) ? 'Явагдаж байна' : 'Хуваарилаагүй';
    return { total, assigned, confirmed, allConfirmed, label };
};

const CONFIRMED_STATUSES = ['confirmed', 'paid', 'completed'];

export const AdminAccommodationOps: React.FC = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState<Set<string>>(new Set());
    const [savingId, setSavingId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [materialized, setMaterialized] = useState<Set<string>>(new Set());

    const [q, setQ] = useState('');
    const [month, setMonth] = useState('all');
    const [region, setRegion] = useState('all');
    const [confirmFilter, setConfirmFilter] = useState<'all' | 'pending' | 'done'>('all');
    const [scope, setScope] = useState<'confirmed' | 'all'>('confirmed');

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.reservations.list();
            // 사이트 예약 + 맞춤 견적(전환되어 type='quote'로 생성된 예약)을 모두 포함
            const arr: Reservation[] = (Array.isArray(data) ? data : []).filter((r: any) => !!r && !!r.id);
            setReservations(arr);
            setMaterialized(new Set());
        } catch (e) {
            console.error('Байр захиалга — ачаалал амжилтгүй:', e);
            setReservations([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const base = useMemo(() => reservations.filter(r => scope === 'all' ? true
        : (CONFIRMED_STATUSES.includes(r.status || '') || r.depositStatus === 'paid' || r.type === 'quote')), [reservations, scope]);
    const monthOptions = useMemo(() => {
        const set = new Set<string>();
        base.forEach(r => { const k = monthKey(r.startDate); if (k) set.add(k); });
        return Array.from(set).sort().reverse();
    }, [base]);
    const regionOptions = useMemo(() => {
        const set = new Set<string>();
        base.forEach(r => { const k = regionOf(r); if (k && k !== '-') set.add(k); });
        return Array.from(set).sort();
    }, [base]);
    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return base.filter(r => {
            if (month !== 'all' && monthKey(r.startDate) !== month) return false;
            if (region !== 'all' && regionOf(r) !== region) return false;
            if (confirmFilter !== 'all') {
                const done = summaryOf(r).allConfirmed;
                if (confirmFilter === 'done' && !done) return false;
                if (confirmFilter === 'pending' && done) return false;
            }
            if (needle) {
                const hay = `${r.customerName || ''} ${r.productName || ''} ${r.reservationNumber || ''} ${regionOf(r)}`.toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        }).sort((a, b) => {
            const da = summaryOf(a).allConfirmed ? 1 : 0;
            const db = summaryOf(b).allConfirmed ? 1 : 0;
            if (da !== db) return da - db;
            return (a.startDate || '').localeCompare(b.startDate || '');
        });
    }, [base, q, month, region, confirmFilter]);
    const counts = useMemo(() => {
        let done = 0, pending = 0;
        filtered.forEach(r => { summaryOf(r).allConfirmed ? done++ : pending++; });
        return { total: filtered.length, done, pending };
    }, [filtered]);

    // ── 펼침/구체화 ──
    const openRow = (r: Reservation) => {
        if (!materialized.has(r.id)) {
            setReservations(prev => prev.map(x => x.id === r.id ? { ...x, dailyAccommodations: daysOf(x) } : x));
            setMaterialized(prev => new Set(prev).add(r.id));
        }
        setExpanded(prev => new Set(prev).add(r.id));
    };
    const toggleExpand = (r: Reservation) => expanded.has(r.id) ? setExpanded(prev => { const n = new Set(prev); n.delete(r.id); return n; }) : openRow(r);

    // ── 편집 ──
    const markDirty = (rId: string) => setDirty(prev => new Set(prev).add(rId));
    const patchDay = (rId: string, day: number, patch: Partial<DailyAcc['accommodation']>) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = (r.dailyAccommodations || []).map(d => d.day === day ? { ...d, accommodation: { ...d.accommodation, ...patch } } : d);
            return { ...r, dailyAccommodations: rows };
        }));
        markDirty(rId);
    };
    const addDay = (rId: string) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = [...(r.dailyAccommodations || [])];
            rows.push({ day: rows.length + 1, accommodation: {} });
            return { ...r, dailyAccommodations: rows };
        }));
        markDirty(rId);
    };
    const removeDay = (rId: string, day: number) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = (r.dailyAccommodations || []).filter(d => d.day !== day).map((d, i) => ({ ...d, day: i + 1 }));
            return { ...r, dailyAccommodations: rows };
        }));
        markDirty(rId);
    };
    // 담당 가이드(assignedGuide)·차량(contractData.vehicle) 편집 — 기존 컬럼에 저장(마이그레이션 불필요)
    const patchGuide = (rId: string, patch: { name?: string; phone?: string }) => {
        setReservations(prev => prev.map(r => r.id === rId ? { ...r, assignedGuide: { ...(r.assignedGuide || {}), ...patch } } : r));
        markDirty(rId);
    };
    const patchVehicle = (rId: string, patch: { type?: string; phone?: string }) => {
        setReservations(prev => prev.map(r => r.id === rId
            ? { ...r, contractData: { ...(r.contractData || {}), vehicle: { ...(r.contractData?.vehicle || {}), ...patch } } }
            : r));
        markDirty(rId);
    };
    const save = async (r: Reservation) => {
        setSavingId(r.id);
        try {
            await api.reservations.update(r.id, { ...r, dailyAccommodations: r.dailyAccommodations || [] });
            setDirty(prev => { const n = new Set(prev); n.delete(r.id); return n; });
        } catch (e: any) {
            alert('Хадгалах амжилтгүй: ' + (e?.message || e));
        } finally {
            setSavingId(null);
        }
    };

    return (
        <AdminLayout
            activePage="accommodation-ops"
            title="Байр захиалгын удирдлага"
            actions={<button type="button" onClick={load} className="btn"><Icon name="refresh" />Шинэчлэх</button>}
        >
            <div className="route-anim">
                <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <label className="tb-search">
                        <Icon name="search" />
                        <input placeholder="Үйлчлүүлэгч, аялал, захиалгын дугаараар хайх" value={q} onChange={e => setQ(e.target.value)} />
                    </label>
                    <select className="select" value={scope} onChange={e => setScope(e.target.value as any)}>
                        <option value="confirmed">Зөвхөн баталгаажсан</option>
                        <option value="all">Бүх захиалга</option>
                    </select>
                    <select className="select" value={month} onChange={e => setMonth(e.target.value)}>
                        <option value="all">Бүх сар (ирэх)</option>
                        {monthOptions.map(m => <option key={m} value={m}>{m.replace('-', '.')}</option>)}
                    </select>
                    <select className="select" value={region} onChange={e => setRegion(e.target.value)}>
                        <option value="all">Бүх бүс нутаг</option>
                        {regionOptions.map(rg => <option key={rg} value={rg}>{rg}</option>)}
                    </select>
                    <select className="select" value={confirmFilter} onChange={e => setConfirmFilter(e.target.value as any)}>
                        <option value="all">Бүх төлөв</option>
                        <option value="pending">Батлаагүй</option>
                        <option value="done">Баталгаажсан</option>
                    </select>
                    <div className="spacer" />
                    <span className="cell-muted" style={{ fontSize: 13 }}>
                        Харагдаж буй <b style={{ color: 'var(--text-strong)' }}>{counts.total}</b> ·{' '}
                        <span style={{ color: '#B45309', fontWeight: 700 }}>Батлаагүй {counts.pending}</span> ·{' '}
                        <span style={{ color: '#0F7A43', fontWeight: 700 }}>Баталгаажсан {counts.done}</span>
                    </span>
                </div>

                <div className="card">
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th style={{ width: 34 }}></th>
                                    <th style={{ width: 116 }}>Төлөв</th>
                                    <th>Үйлчлүүлэгч</th>
                                    <th style={{ width: 200 }}>Ирэх ~ Явах</th>
                                    <th style={{ width: 120 }}>Хоног</th>
                                    <th>Бүс нутаг</th>
                                    <th style={{ width: 100 }}>Захиалсан</th>
                                    <th style={{ width: 64 }}>Хүн</th>
                                    <th style={{ width: 130 }}>Явц</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28 }} className="cell-muted">Ачааллаж байна…</td></tr>}
                                {!loading && filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28 }} className="cell-muted">Тохирох захиалга алга.</td></tr>}
                                {!loading && filtered.map(r => {
                                    const sum = summaryOf(r);
                                    const sty = statusStyle(sum.label);
                                    const open = expanded.has(r.id);
                                    const isDirty = dirty.has(r.id);
                                    const rows = open ? (r.dailyAccommodations || []) : [];
                                    const cd = r.contractData || {};
                                    const travelers = cd.travelers || [];
                                    return (
                                        <React.Fragment key={r.id}>
                                            <tr style={{ cursor: 'pointer', background: open ? 'var(--surface-canvas, #F7F8FA)' : undefined }} onClick={() => toggleExpand(r)}>
                                                <td style={{ textAlign: 'center' }}><Icon name={open ? 'expand_more' : 'chevron_right'} /></td>
                                                <td><span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: sty.bg, color: sty.fg }}>{sum.label}</span></td>
                                                <td style={{ fontWeight: 700 }}>
                                                    {r.customerName || '-'}
                                                    {r.type === 'quote' && <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: '#EEEDFE', color: '#534AB7' }}>Үнийн санал</span>}
                                                    {r.reservationNumber && <span className="cell-muted" style={{ marginLeft: 6, fontSize: 11 }}>#{r.reservationNumber}</span>}
                                                </td>
                                                <td>{fmtDate(r.startDate)} ~ {fmtDate(r.endDate)}</td>
                                                <td>{nightsOf(r) > 0 ? `${nightsOf(r)} шөнө ${nightsOf(r) + 1} өдөр` : '-'}</td>
                                                <td>{regionOf(r)}</td>
                                                <td>{fmtDate(r.createdAt)}</td>
                                                <td>{r.travelers || '-'} хүн</td>
                                                <td style={{ fontWeight: 700, color: sum.allConfirmed ? '#0F7A43' : '#B45309' }}>{sum.confirmed}/{sum.total} баталгаажсан</td>
                                            </tr>
                                            {open && (
                                                <tr>
                                                    <td colSpan={9} style={{ padding: 0, background: 'var(--surface-canvas, #F7F8FA)' }}>
                                                        <div style={{ padding: '14px 18px 18px' }}>

                                                            {/* ── Аяллын мэдээлэл (수배서 정보) ── */}
                                                            <div style={{ background: '#fff', border: '1px solid var(--color-border-tertiary, #E6E8EC)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                                                                <b style={{ fontSize: 13 }}>Аяллын мэдээлэл</b>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                                                                    <div style={{ background: 'var(--surface-canvas, #F7F8FA)', borderRadius: 8, padding: '10px 12px' }}>
                                                                        <div className="cell-muted" style={{ fontSize: 11 }}>✈ Ирэх нислэг (Монгол ирэх)</div>
                                                                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{flightLine(cd.arrival)}</div>
                                                                    </div>
                                                                    <div style={{ background: 'var(--surface-canvas, #F7F8FA)', borderRadius: 8, padding: '10px 12px' }}>
                                                                        <div className="cell-muted" style={{ fontSize: 11 }}>✈ Буцах нислэг (Монголоос явах)</div>
                                                                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{flightLine(cd.departure)}</div>
                                                                    </div>
                                                                </div>
                                                                {travelers.length > 0 ? (
                                                                    <div style={{ overflowX: 'auto', marginTop: 10 }}>
                                                                        <table className="tbl" style={{ minWidth: 640 }}>
                                                                            <thead><tr>
                                                                                <th style={{ width: 56 }}>Аялагч</th>
                                                                                <th>Паспортын нэр</th>
                                                                                <th>Нэр</th>
                                                                                <th style={{ width: 110 }}>Төрсөн огноо</th>
                                                                                <th style={{ width: 80 }}>Хүйс</th>
                                                                                <th style={{ width: 130 }}>Утас</th>
                                                                            </tr></thead>
                                                                            <tbody>
                                                                                {travelers.map((t, i) => (
                                                                                    <tr key={i}>
                                                                                        <td style={{ fontWeight: 700 }}>{i + 1}</td>
                                                                                        <td style={{ fontWeight: 700 }}>{t.passportName || '-'}</td>
                                                                                        <td>{t.name || '-'}</td>
                                                                                        <td>{t.birthdate || '-'}</td>
                                                                                        <td>{genderMn(t.gender)}</td>
                                                                                        <td>{t.phone || '-'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : <div className="cell-muted" style={{ fontSize: 12, marginTop: 10 }}>Аялагчийн мэдээлэл алга (гэрээ ирээгүй).</div>}
                                                                {cd.agreement?.name && <div style={{ marginTop: 10, fontSize: 12 }}><span className="cell-muted">Цахим гарын үсэг:</span> <b>{cd.agreement.name}</b></div>}
                                                            </div>

                                                            {/* ── Өдөр тутмын байр ── */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                                                <b style={{ fontSize: 13 }}>Өдөр тутмын байрны захиалга</b>
                                                                <div style={{ flex: 1 }} />
                                                                {isDirty && <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>Өөрчлөгдсөн ·</span>}
                                                                <button type="button" className="btn btn-ink btn-sm" disabled={!isDirty || savingId === r.id} onClick={() => save(r)}>
                                                                    <Icon name="save" />{savingId === r.id ? 'Хадгалж байна…' : 'Хадгалах'}
                                                                </button>
                                                            </div>
                                                            <div style={{ overflowX: 'auto' }}>
                                                                <table className="tbl" style={{ minWidth: 800 }}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th style={{ width: 110 }}>Өдөр</th>
                                                                            <th>Байрны нэр</th>
                                                                            <th style={{ width: 80 }}>Өрөө</th>
                                                                            <th style={{ width: 130 }}>Хүн/өрөө</th>
                                                                            <th style={{ width: 150 }}>Захиалгын төлөв</th>
                                                                            <th style={{ width: 44 }}></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {rows.map(d => {
                                                                            const acc = d.accommodation || {};
                                                                            const hasName = (acc.name || '').trim().length > 0;
                                                                            const st: BookingStatus | 'Хуваарилаагүй' = hasName ? (acc.bookingStatus || 'Илгээгээгүй') : 'Хуваарилаагүй';
                                                                            const sts = statusStyle(st);
                                                                            return (
                                                                                <tr key={d.day}>
                                                                                    <td style={{ fontWeight: 700 }}>Өдөр {d.day}<span className="cell-muted" style={{ marginLeft: 6, fontSize: 11 }}>{nightDate(r.startDate, d.day)}</span></td>
                                                                                    <td><input className="inp" style={{ width: '100%', minWidth: 200 }} value={acc.name || ''} placeholder="Зочид буудал эсвэл гэрийн нэр" onChange={e => patchDay(r.id, d.day, { name: e.target.value })} /></td>
                                                                                    <td><input className="inp" type="number" min={0} style={{ width: 66 }} value={acc.roomCount ?? ''} placeholder="0" onChange={e => patchDay(r.id, d.day, { roomCount: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value) || 0) })} /></td>
                                                                                    <td>
                                                                                        <select className="select" style={{ width: 120 }} value={acc.occupancy || ''} onChange={e => patchDay(r.id, d.day, { occupancy: e.target.value || undefined })}>
                                                                                            {OCCUPANCY_OPTIONS.map(o => <option key={o} value={o}>{o || 'Тодорхойгүй'}</option>)}
                                                                                        </select>
                                                                                    </td>
                                                                                    <td>
                                                                                        <select className="select" style={{ width: 140, fontWeight: 700, background: sts.bg, color: sts.fg, borderColor: 'transparent' }}
                                                                                            value={hasName ? (acc.bookingStatus || 'Илгээгээгүй') : 'Илгээгээгүй'} disabled={!hasName}
                                                                                            onChange={e => patchDay(r.id, d.day, { bookingStatus: e.target.value as BookingStatus })}>
                                                                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                                                        </select>
                                                                                    </td>
                                                                                    <td style={{ textAlign: 'center' }}>
                                                                                        <button type="button" className="btn btn-sm" title="Энэ өдрийг устгах" onClick={() => { if (window.confirm(`Өдөр ${d.day}-г устгах уу?`)) removeDay(r.id, d.day); }} style={{ color: '#E24B4A' }}>
                                                                                            <Icon name="delete" />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                        {rows.length === 0 && <tr><td colSpan={6} className="cell-muted" style={{ textAlign: 'center', padding: 14 }}>Өдөр алга. ‘Өдөр нэмэх’ дарж нэмнэ үү.</td></tr>}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => addDay(r.id)}><Icon name="add" />Өдөр нэмэх</button>

                                                            {/* ── Хариуцсан гайд ба тээвэр (가이드·차량) ── */}
                                                            <div style={{ background: '#fff', border: '1px solid var(--color-border-tertiary, #E6E8EC)', borderRadius: 12, padding: 14, marginTop: 14 }}>
                                                                <b style={{ fontSize: 13 }}>Хариуцсан гайд ба тээвэр</b>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginTop: 10 }}>
                                                                    <div>
                                                                        <label className="cell-muted" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Гайдын нэр</label>
                                                                        <input className="inp" style={{ width: '100%' }} value={r.assignedGuide?.name || ''} placeholder="Гайдын нэр" onChange={e => patchGuide(r.id, { name: e.target.value })} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="cell-muted" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Гайдын утас</label>
                                                                        <input className="inp" style={{ width: '100%' }} value={r.assignedGuide?.phone || ''} placeholder="Гайдын утас" onChange={e => patchGuide(r.id, { phone: e.target.value })} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="cell-muted" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Машины төрөл</label>
                                                                        <input className="inp" style={{ width: '100%' }} value={r.contractData?.vehicle?.type || ''} placeholder="Жишээ: Land Cruiser 76" onChange={e => patchVehicle(r.id, { type: e.target.value })} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="cell-muted" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Жолоочийн утас</label>
                                                                        <input className="inp" style={{ width: '100%' }} value={r.contractData?.vehicle?.phone || ''} placeholder="Жолоочийн утас" onChange={e => patchVehicle(r.id, { phone: e.target.value })} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};
