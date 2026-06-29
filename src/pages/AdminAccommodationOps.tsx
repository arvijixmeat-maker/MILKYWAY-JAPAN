import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Icon } from '../components/admin/console/Icon';
import { api } from '../lib/api';

/**
 * 숙소 배정 관리 (내부 전용) — 숙소 담당 직원용.
 * 확정 예약을 한눈에 보고, 일차별로 숙소명·방수·몇인몇실·호텔 수배 상태(미발송/메일발송/회신/확정)를 관리한다.
 * 데이터는 reservations.dailyAccommodations(JSON)에 저장 — 스키마 마이그레이션 없음.
 */

type BookingStatus = '미발송' | '메일발송' | '회신' | '확정';
const STATUS_OPTIONS: BookingStatus[] = ['미발송', '메일발송', '회신', '확정'];
const OCCUPANCY_OPTIONS = ['', '1인1실', '2인1실', '3인1실', '4인1실', '5인1실', '6인1실'];

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
        // ─── 신규(내부 숙소 관리용) ───
        roomCount?: number;
        occupancy?: string;
        bookingStatus?: BookingStatus;
    };
}

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
    duration?: string;
    dailyAccommodations?: DailyAcc[];
    contractData?: { region?: string; category?: string };
    history?: any[];
}

const statusStyle = (s?: BookingStatus | '미배정'): { bg: string; fg: string } => ({
    '미배정': { bg: '#F1F2F4', fg: '#8A8F99' },
    '미발송': { bg: '#EEF1F5', fg: '#5F636B' },
    '메일발송': { bg: '#E8F2FF', fg: '#0B6FE0' },
    '회신': { bg: '#FEF6E7', fg: '#B45309' },
    '확정': { bg: '#E4F7EC', fg: '#0F7A43' },
}[s || '미배정'] || { bg: '#F1F2F4', fg: '#8A8F99' });

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
    const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
};
const regionOf = (r: Reservation) => (r.contractData?.region || r.contractData?.category || r.productName || '-');

// 예약의 박일수만큼 일차 행을 만들어 기존 dailyAccommodations와 병합
const dayRowsOf = (r: Reservation): DailyAcc[] => {
    const nights = nightsOf(r);
    const existing = Array.isArray(r.dailyAccommodations) ? r.dailyAccommodations : [];
    const count = Math.max(nights, existing.reduce((m, d) => Math.max(m, d.day || 0), 0));
    if (count <= 0) return existing;
    return Array.from({ length: count }, (_, i) => {
        const day = i + 1;
        const found = existing.find(d => d.day === day);
        return found || { day, accommodation: {} };
    });
};

const summaryOf = (r: Reservation) => {
    const rows = dayRowsOf(r);
    const total = rows.length;
    const assigned = rows.filter(d => (d.accommodation?.name || '').trim()).length;
    const confirmed = rows.filter(d => d.accommodation?.bookingStatus === '확정').length;
    const allConfirmed = total > 0 && confirmed === total;
    const label: BookingStatus | '미배정' | '진행중' = allConfirmed ? '확정' : (assigned > 0 || confirmed > 0) ? '진행중' as any : '미배정';
    return { total, assigned, confirmed, allConfirmed, label };
};

const CONFIRMED_STATUSES = ['confirmed', 'paid', 'completed'];

export const AdminAccommodationOps: React.FC = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState<Set<string>>(new Set());
    const [savingId, setSavingId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // filters
    const [q, setQ] = useState('');
    const [month, setMonth] = useState('all');
    const [region, setRegion] = useState('all');
    const [confirmFilter, setConfirmFilter] = useState<'all' | 'pending' | 'done'>('all');
    const [scope, setScope] = useState<'confirmed' | 'all'>('confirmed');

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.reservations.list();
            const arr: Reservation[] = (Array.isArray(data) ? data : []).filter((r: any) => r && r.type !== 'quote');
            setReservations(arr);
        } catch (e) {
            console.error('숙소 관리 예약 로드 실패:', e);
            setReservations([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const base = useMemo(() => reservations.filter(r => scope === 'all' ? true
        : (CONFIRMED_STATUSES.includes(r.status || '') || (r as any).depositStatus === 'paid')), [reservations, scope]);

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
            // 미확정 우선 → 도착일 빠른 순
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

    // ── 편집 ──
    const patchDay = (rId: string, day: number, patch: Partial<DailyAcc['accommodation']>) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = dayRowsOf(r);
            const next = rows.map(d => d.day === day ? { ...d, accommodation: { ...d.accommodation, ...patch } } : d);
            return { ...r, dailyAccommodations: next };
        }));
        setDirty(prev => new Set(prev).add(rId));
    };
    const applyFirstToAll = (rId: string) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = dayRowsOf(r);
            const first = rows[0]?.accommodation || {};
            const next = rows.map(d => ({ ...d, accommodation: { ...d.accommodation, roomCount: first.roomCount, occupancy: first.occupancy } }));
            return { ...r, dailyAccommodations: next };
        }));
        setDirty(prev => new Set(prev).add(rId));
    };
    const setAllStatus = (rId: string, status: BookingStatus) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = dayRowsOf(r);
            const next = rows.map(d => ({ ...d, accommodation: { ...d.accommodation, bookingStatus: status } }));
            return { ...r, dailyAccommodations: next };
        }));
        setDirty(prev => new Set(prev).add(rId));
    };
    const save = async (r: Reservation) => {
        setSavingId(r.id);
        try {
            const rows = dayRowsOf(r).filter(d => (d.accommodation?.name || '').trim() || d.accommodation?.roomCount || d.accommodation?.occupancy || d.accommodation?.bookingStatus);
            await api.reservations.update(r.id, { ...r, dailyAccommodations: rows });
            setDirty(prev => { const n = new Set(prev); n.delete(r.id); return n; });
        } catch (e: any) {
            alert('저장 실패: ' + (e?.message || e));
        } finally {
            setSavingId(null);
        }
    };
    const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    return (
        <AdminLayout
            activePage="accommodation-ops"
            title="숙소 배정 관리"
            actions={<button type="button" onClick={load} className="btn"><Icon name="refresh" />새로고침</button>}
        >
            <div className="route-anim">
                <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <label className="tb-search">
                        <Icon name="search" />
                        <input placeholder="고객명·상품·예약번호 검색" value={q} onChange={e => setQ(e.target.value)} />
                    </label>
                    <select className="select" value={scope} onChange={e => setScope(e.target.value as any)}>
                        <option value="confirmed">확정 예약만</option>
                        <option value="all">전체 예약</option>
                    </select>
                    <select className="select" value={month} onChange={e => setMonth(e.target.value)}>
                        <option value="all">전체 월(도착)</option>
                        {monthOptions.map(m => <option key={m} value={m}>{m.replace('-', '.')}</option>)}
                    </select>
                    <select className="select" value={region} onChange={e => setRegion(e.target.value)}>
                        <option value="all">전체 지역</option>
                        {regionOptions.map(rg => <option key={rg} value={rg}>{rg}</option>)}
                    </select>
                    <select className="select" value={confirmFilter} onChange={e => setConfirmFilter(e.target.value as any)}>
                        <option value="all">전체 상태</option>
                        <option value="pending">미확정</option>
                        <option value="done">확정완료</option>
                    </select>
                    <div className="spacer" />
                    <span className="cell-muted" style={{ fontSize: 13 }}>
                        표시 <b style={{ color: 'var(--text-strong)' }}>{counts.total}</b>건 ·{' '}
                        <span style={{ color: '#B45309', fontWeight: 700 }}>미확정 {counts.pending}</span> ·{' '}
                        <span style={{ color: '#0F7A43', fontWeight: 700 }}>확정 {counts.done}</span>
                    </span>
                </div>

                <div className="card">
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th style={{ width: 34 }}></th>
                                    <th style={{ width: 92 }}>확정상태</th>
                                    <th>고객명</th>
                                    <th style={{ width: 200 }}>도착 ~ 출발</th>
                                    <th style={{ width: 78 }}>박일수</th>
                                    <th>지역</th>
                                    <th style={{ width: 96 }}>예약일</th>
                                    <th style={{ width: 60 }}>인원</th>
                                    <th style={{ width: 110 }}>숙소 진행</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28 }} className="cell-muted">불러오는 중…</td></tr>}
                                {!loading && filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28 }} className="cell-muted">해당 조건의 예약이 없습니다.</td></tr>}
                                {!loading && filtered.map(r => {
                                    const sum = summaryOf(r);
                                    const sty = statusStyle(sum.label as any);
                                    const open = expanded.has(r.id);
                                    const isDirty = dirty.has(r.id);
                                    const rows = dayRowsOf(r);
                                    return (
                                        <React.Fragment key={r.id}>
                                            <tr style={{ cursor: 'pointer', background: open ? 'var(--surface-canvas, #F7F8FA)' : undefined }} onClick={() => toggleExpand(r.id)}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <Icon name={open ? 'expand_more' : 'chevron_right'} />
                                                </td>
                                                <td>
                                                    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: sty.bg, color: sty.fg }}>{sum.label}</span>
                                                </td>
                                                <td style={{ fontWeight: 700 }}>
                                                    {r.customerName || '-'}
                                                    {r.reservationNumber && <span className="cell-muted" style={{ marginLeft: 6, fontSize: 11 }}>#{r.reservationNumber}</span>}
                                                </td>
                                                <td>{fmtDate(r.startDate)} ~ {fmtDate(r.endDate)}</td>
                                                <td>{nightsOf(r) > 0 ? `${nightsOf(r)}泊${nightsOf(r) + 1}日` : '-'}</td>
                                                <td>{regionOf(r)}</td>
                                                <td>{fmtDate(r.createdAt)}</td>
                                                <td>{r.travelers || '-'}名</td>
                                                <td style={{ fontWeight: 700, color: sum.allConfirmed ? '#0F7A43' : '#B45309' }}>{sum.confirmed}/{sum.total} 확정</td>
                                            </tr>
                                            {open && (
                                                <tr>
                                                    <td colSpan={9} style={{ padding: 0, background: 'var(--surface-canvas, #F7F8FA)' }}>
                                                        <div style={{ padding: '14px 18px 18px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                                                <b style={{ fontSize: 13 }}>일차별 숙소 수배</b>
                                                                <button type="button" className="btn btn-sm" onClick={() => applyFirstToAll(r.id)} title="1일차 방수·인실을 전체 일차에 적용">방·인실 전체적용</button>
                                                                <button type="button" className="btn btn-sm" onClick={() => setAllStatus(r.id, '메일발송')}>전체 메일발송</button>
                                                                <button type="button" className="btn btn-sm" onClick={() => setAllStatus(r.id, '확정')}>전체 확정</button>
                                                                <div style={{ flex: 1 }} />
                                                                {isDirty && <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>변경됨 ·</span>}
                                                                <button type="button" className="btn btn-ink btn-sm" disabled={!isDirty || savingId === r.id} onClick={() => save(r)}>
                                                                    <Icon name="save" />{savingId === r.id ? '저장중…' : '저장'}
                                                                </button>
                                                            </div>
                                                            <div style={{ overflowX: 'auto' }}>
                                                                <table className="tbl" style={{ minWidth: 760 }}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th style={{ width: 96 }}>일차</th>
                                                                            <th>숙소 이름</th>
                                                                            <th style={{ width: 84 }}>방수</th>
                                                                            <th style={{ width: 120 }}>몇인몇실</th>
                                                                            <th style={{ width: 150 }}>호텔 수배 상태</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {rows.map(d => {
                                                                            const acc = d.accommodation || {};
                                                                            const st: BookingStatus | '미배정' = (acc.name || '').trim() ? (acc.bookingStatus || '미발송') : '미배정';
                                                                            const sts = statusStyle(st);
                                                                            return (
                                                                                <tr key={d.day}>
                                                                                    <td style={{ fontWeight: 700 }}>
                                                                                        DAY {d.day}
                                                                                        <span className="cell-muted" style={{ marginLeft: 6, fontSize: 11 }}>{nightDate(r.startDate, d.day)}</span>
                                                                                    </td>
                                                                                    <td>
                                                                                        <input className="inp" style={{ width: '100%', minWidth: 180 }} value={acc.name || ''} placeholder="호텔 또는 게르명"
                                                                                            onChange={e => patchDay(r.id, d.day, { name: e.target.value })} />
                                                                                    </td>
                                                                                    <td>
                                                                                        <input className="inp" type="number" min={0} style={{ width: 70 }} value={acc.roomCount ?? ''} placeholder="0"
                                                                                            onChange={e => patchDay(r.id, d.day, { roomCount: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value) || 0) })} />
                                                                                    </td>
                                                                                    <td>
                                                                                        <select className="select" style={{ width: 110 }} value={acc.occupancy || ''} onChange={e => patchDay(r.id, d.day, { occupancy: e.target.value || undefined })}>
                                                                                            {OCCUPANCY_OPTIONS.map(o => <option key={o} value={o}>{o || '미정'}</option>)}
                                                                                        </select>
                                                                                    </td>
                                                                                    <td>
                                                                                        <select
                                                                                            className="select"
                                                                                            style={{ width: 130, fontWeight: 700, background: sts.bg, color: sts.fg, borderColor: 'transparent' }}
                                                                                            value={(acc.name || '').trim() ? (acc.bookingStatus || '미발송') : '미발송'}
                                                                                            disabled={!(acc.name || '').trim()}
                                                                                            onChange={e => patchDay(r.id, d.day, { bookingStatus: e.target.value as BookingStatus })}
                                                                                        >
                                                                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                                                        </select>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                        {rows.length === 0 && <tr><td colSpan={5} className="cell-muted" style={{ textAlign: 'center', padding: 16 }}>도착·출발일이 없어 일차를 계산할 수 없습니다. 예약 정보를 확인하세요.</td></tr>}
                                                                    </tbody>
                                                                </table>
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
