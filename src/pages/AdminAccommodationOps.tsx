import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import {
    BedDouble, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, ListChecks, ListOrdered, MapPin,
    PlaneLanding, PlaneTakeoff, Plus, RefreshCw, Save, Search, Trash2, Users,
} from 'lucide-react';
import { Button, ChipFilter, EmptyState, Input } from '../components/admin/ui';
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
// 숙소 등급 — 선택명은 한국어로 유지(요청)
const GRADE_OPTIONS = ['', '고급 게르', '일반 게르', '5성급 호텔', '4성급호텔', '목조하우스'];
const WD = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

interface DailyAcc {
    day: number;
    date?: string; // 직접 편집 가능한 날짜(yyyy-mm-dd). 없으면 startDate 기준 자동
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
        agreement?: { agreed?: boolean; name?: string; agreedAt?: string; signature?: string };
        vehicle?: { type?: string; phone?: string };
    };
}

/** 수배 상태 → 공통 뱃지 톤 (미배정·미발송 회색 / 메일 발송 연민트 / 회신·진행 중 대기 / 확정 진녹색) */
const statusTone = (s?: BookingStatus | 'Хуваарилаагүй' | 'Явагдаж байна'): string => ({
    'Хуваарилаагүй': 'b-new',
    'Илгээгээгүй': 'b-new',
    'Имэйл илгээсэн': 'b-sent',
    'Хариу ирсэн': 'b-wait',
    'Явагдаж байна': 'b-wait',
    'Баталгаажсан': 'b-confirmed',
}[s || 'Хуваарилаагүй'] || 'b-new');

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
// 오늘 (yyyy-mm-dd, 로컬 기준)
const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// 투어가 이미 끝났는가 — 종료일(없으면 출발일)이 오늘보다 앞이면 지난 투어
const isPastTour = (r: { startDate?: string; endDate?: string }, today: string) => {
    const last = r.endDate || r.startDate;
    if (!last) return false;
    const d = new Date(last);
    if (Number.isNaN(d.getTime())) return false;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return key < today;
};
// startDate + offset일 → yyyy-mm-dd (date input용 기본값)
const isoOffset = (start?: string, offset = 0) => {
    if (!start) return '';
    const d = new Date(start);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const weekdayMn = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : WD[d.getDay()];
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
    return Array.from({ length: nights }, (_, i) => ({ day: i + 1, date: isoOffset(r.startDate, i), accommodation: {} }));
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
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [region, setRegion] = useState('all');
    const [confirmFilter, setConfirmFilter] = useState<'all' | 'pending' | 'done'>('all');
    const [scope, setScope] = useState<'confirmed' | 'all'>('confirmed');
    const [hotels, setHotels] = useState<Array<{ id: string; name_kr?: string; name_local?: string; region?: string; address?: string; description?: string; images?: string[]; amenities?: string[] }>>([]);
    // 호텔 마스터에 없는 숙소를 직접 입력 중인 칸 (key = `${reservationId}:${dayIndex}`)
    const [manualHotels, setManualHotels] = useState<Set<string>>(new Set());

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
    // 호텔 마스터 목록 — байрны нэр 셀렉트에 사용
    useEffect(() => {
        (api as any).hotels.list({ active: true })
            .then((d: any) => setHotels(Array.isArray(d) ? d : []))
            .catch(() => setHotels([]));
    }, []);
    const hotelNames = useMemo(() => Array.from(new Set(hotels.map(h => h.name_kr || h.name_local || '').filter(Boolean))), [hotels]);
    // 표시명 → 호텔 마스터 레코드 (선택 시 이미지·지역·설명 등 전체 정보를 숙소에 채우기 위함)
    const hotelByName = useMemo(() => {
        const map = new Map<string, typeof hotels[number]>();
        hotels.forEach(h => { const n = h.name_kr || h.name_local || ''; if (n) map.set(n, h); });
        return map;
    }, [hotels]);

    const base = useMemo(() => reservations.filter(r => scope === 'all' ? true
        : (CONFIRMED_STATUSES.includes(r.status || '') || r.depositStatus === 'paid' || r.type === 'quote')), [reservations, scope]);
    /** 연도 막대에 표시할 월별 건수 + 이동 가능한 연도 범위 */
    const monthStats = useMemo(() => {
        const perMonth = new Map<string, number>();
        const years = new Set<number>();
        base.forEach(r => {
            const k = monthKey(r.startDate);
            if (!k) return;
            perMonth.set(k, (perMonth.get(k) || 0) + 1);
            years.add(Number(k.slice(0, 4)));
        });
        years.add(new Date().getFullYear());
        const list = Array.from(years).sort();
        return { perMonth, minYear: list[0], maxYear: list[list.length - 1], total: base.length };
    }, [base]);
    const regionOptions = useMemo(() => {
        const set = new Set<string>();
        base.forEach(r => { const k = regionOf(r); if (k && k !== '-') set.add(k); });
        return Array.from(set).sort();
    }, [base]);
    const filtered = useMemo(() => {
        const today = todayKey();
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
            // 끝난 투어는 항상 아래로, 그 안에서는 최근에 끝난 것부터
            const pa = isPastTour(a, today) ? 1 : 0;
            const pb = isPastTour(b, today) ? 1 : 0;
            if (pa !== pb) return pa - pb;
            if (pa === 1) return (b.startDate || '').localeCompare(a.startDate || '');
            // 다가오는 투어는 미확정 먼저 → 출발일 가까운 순
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
            setReservations(prev => prev.map(x => x.id === r.id ? { ...x, dailyAccommodations: daysOf(x).map((d, i) => ({ ...d, date: d.date || isoOffset(x.startDate, i) })) } : x));
            setMaterialized(prev => new Set(prev).add(r.id));
        }
        setExpanded(prev => new Set(prev).add(r.id));
    };
    const toggleExpand = (r: Reservation) => expanded.has(r.id) ? setExpanded(prev => { const n = new Set(prev); n.delete(r.id); return n; }) : openRow(r);

    // ?open=<reservationId> — 예약 상세의 「숙소 보드에서 수배 관리」 링크로 진입 시 해당 예약을 자동 펼침
    const openedFromUrl = useRef(false);
    useEffect(() => {
        if (openedFromUrl.current || reservations.length === 0) return;
        const id = new URLSearchParams(window.location.search).get('open');
        if (!id) return;
        const target = reservations.find(x => x.id === id);
        if (!target) return;
        openedFromUrl.current = true;
        // 확정 전 예약이면 기본 필터(Зөвхөн баталгаажсан)에 걸려 안 보이므로 전체 보기로 전환
        if (!(CONFIRMED_STATUSES.includes(target.status || '') || target.depositStatus === 'paid' || target.type === 'quote')) setScope('all');
        openRow(target);
        setTimeout(() => { try { document.getElementById(`acc-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* noop */ } }, 200);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reservations]);

    // ── 편집 ──
    const markDirty = (rId: string) => setDirty(prev => new Set(prev).add(rId));
    // Хадгалах(저장) 전 새로고침·이탈 시 편집 내용이 사라지는 것을 경고 —
    // "다 바꿨는데 어느 순간 되돌아간다"의 흔한 원인이 저장 전 이탈이다.
    useEffect(() => {
        const h = (e: BeforeUnloadEvent) => { if (dirty.size > 0) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [dirty]);
    // 일차 번호를 날짜순으로 1..N 재부여 — 2~5처럼 어긋난 옛 데이터를 예약 상세·확정 일정표와 맞춘다
    const renumberDays = (rId: string) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = [...(r.dailyAccommodations || [])];
            rows.sort((a, b) => String(a.date || '9999-99-99').localeCompare(String(b.date || '9999-99-99')) || ((a.day || 0) - (b.day || 0)));
            return { ...r, dailyAccommodations: rows.map((d, i) => ({ ...d, day: i + 1, date: d.date || isoOffset(r.startDate, i) })) };
        }));
        markDirty(rId);
    };
    // 인덱스 기준 편집(일차 번호·날짜를 직접 수정해도 안전)
    const patchDay = (rId: string, idx: number, patch: Partial<DailyAcc['accommodation']>) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = (r.dailyAccommodations || []).map((d, i) => i === idx ? { ...d, accommodation: { ...d.accommodation, ...patch } } : d);
            return { ...r, dailyAccommodations: rows };
        }));
        markDirty(rId);
    };
    // 일차(번호)·날짜 직접 편집
    const patchDayMeta = (rId: string, idx: number, patch: { day?: number; date?: string }) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = (r.dailyAccommodations || []).map((d, i) => i === idx ? { ...d, ...patch } : d);
            return { ...r, dailyAccommodations: rows };
        }));
        markDirty(rId);
    };
    const addDay = (rId: string) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = [...(r.dailyAccommodations || [])];
            const maxDay = rows.reduce((m, d) => Math.max(m, d.day || 0), 0);
            const last = rows[rows.length - 1]?.date;
            const nextDate = last ? isoOffset(last, 1) : isoOffset(r.startDate, rows.length);
            rows.push({ day: maxDay + 1, date: nextDate, accommodation: {} });
            return { ...r, dailyAccommodations: rows };
        }));
        markDirty(rId);
    };
    const removeDay = (rId: string, idx: number) => {
        setReservations(prev => prev.map(r => {
            if (r.id !== rId) return r;
            const rows = (r.dailyAccommodations || []).filter((_, i) => i !== idx);
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
            // 전체 객체를 보내면 이 화면이 로드된 뒤 다른 곳(예약 상세·고객 계약서)에서 바뀐
            // 필드를 오래된 복사본으로 덮어쓴다. 최신본을 다시 읽어, 이 보드가 편집하는
            // 필드(숙소 배정·가이드·차량)만 얹어 부분 저장한다.
            let fresh: any = null;
            try { fresh = await api.reservations.get(r.id); } catch { fresh = null; }
            const payload: any = {
                dailyAccommodations: r.dailyAccommodations || [],
                assignedGuide: { ...((fresh?.assignedGuide) || {}), ...(r.assignedGuide || {}) },
                contractData: { ...((fresh?.contractData) || (r.contractData || {})), vehicle: r.contractData?.vehicle },
            };
            await api.reservations.update(r.id, payload);
            setDirty(prev => { const n = new Set(prev); n.delete(r.id); return n; });
        } catch (e: any) {
            alert('Хадгалах амжилтгүй: ' + (e?.message || e));
        } finally {
            setSavingId(null);
        }
    };

    const monthChips = Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, '0')}`;
        return { key, label: `${i + 1}-р сар`, n: monthStats.perMonth.get(key) || 0 };
    });

    return (
        <AdminLayout
            activePage="accommodation-ops"
            title="Байр захиалгын удирдлага"
            description={`숙소배정 · ${counts.total}건`}
            actions={<Button icon={<RefreshCw />} onClick={load}>Шинэчлэх</Button>}
        >
            <div className="acc route-anim">
                <div className="filterbar">
                    <label className="tb-search acc-search">
                        <Search size={18} strokeWidth={1.5} aria-hidden="true" />
                        <span className="sr-only">Хайх</span>
                        <input type="search" placeholder="Үйлчлүүлэгч, аялал, захиалгын дугаараар хайх" value={q} onChange={e => setQ(e.target.value)} />
                    </label>
                    <select aria-label="Хамрах хүрээ" className="select" value={scope} onChange={e => setScope(e.target.value as any)}>
                        <option value="confirmed">Зөвхөн баталгаажсан</option>
                        <option value="all">Бүх захиалга</option>
                    </select>
                    <select aria-label="Бүс нутаг" className="select" value={region} onChange={e => setRegion(e.target.value)}>
                        <option value="all">Бүх бүс нутаг</option>
                        {regionOptions.map(rg => <option key={rg} value={rg}>{rg}</option>)}
                    </select>
                </div>

                {/* 출발월 — 연도 이동 + 월별 건수 칩, 누르면 그 달만 표시 */}
                <div className="acc-year">
                    <div className="acc-year-nav">
                        <button type="button" aria-label="Өмнөх жил" disabled={year <= monthStats.minYear} onClick={() => setYear(y => y - 1)}>
                            <ChevronLeft size={18} strokeWidth={1.5} />
                        </button>
                        <b>{year} он</b>
                        <button type="button" aria-label="Дараа жил" disabled={year >= monthStats.maxYear} onClick={() => setYear(y => y + 1)}>
                            <ChevronRight size={18} strokeWidth={1.5} />
                        </button>
                    </div>
                    <span className="acc-year-sum">Батлаагүй <b>{counts.pending}</b> · Баталгаажсан <b>{counts.done}</b></span>
                </div>
                <div className="chip-row" role="group" aria-label="Явах сар">
                    <button type="button" className="chip" aria-pressed={month === 'all'} onClick={() => setMonth('all')}>
                        Бүгд<span className="ct">{monthStats.total}</span>
                    </button>
                    {monthChips.map(m => (
                        <button
                            key={m.key} type="button" className="chip" aria-pressed={month === m.key} disabled={m.n === 0}
                            title={m.n === 0 ? 'Захиалга байхгүй' : `${m.label} — ${m.n} захиалга`}
                            onClick={() => setMonth(m.key)}
                        >
                            {m.label}<span className="ct">{m.n === 0 ? '-' : m.n}</span>
                        </button>
                    ))}
                </div>

                <ChipFilter
                    label="Төлөв"
                    value={confirmFilter}
                    onChange={(v) => setConfirmFilter(v)}
                    options={[
                        { value: 'all', label: 'Бүх төлөв' },
                        { value: 'pending', label: 'Батлаагүй' },
                        { value: 'done', label: 'Баталгаажсан' },
                    ]}
                />

                <div className="acc-list">
                    <div className="acc-cols d-only" aria-hidden="true">
                        <span /><span>Төлөв</span><span>Үйлчлүүлэгч</span><span>Ирэх ~ Явах</span><span>Хоног</span><span>Бүс нутаг</span><span>Хүн</span><span>Явц</span>
                    </div>
                    {loading && <EmptyState small>Ачааллаж байна…</EmptyState>}
                    {!loading && filtered.length === 0 && <EmptyState icon={<BedDouble strokeWidth={1.5} />}>Тохирох захиалга алга.</EmptyState>}
                    {!loading && filtered.map(r => {
                        const sum = summaryOf(r);
                        const open = expanded.has(r.id);
                        const isDirty = dirty.has(r.id);
                        const rows = open ? (r.dailyAccommodations || []) : [];
                        const cd = r.contractData || {};
                        const travelers = cd.travelers || [];
                        const nights = nightsOf(r);
                        const nightsText = nights > 0 ? `${nights} шөнө ${nights + 1} өдөр` : '-';
                        const extraRows = nights > 0 && sum.total > nights ? sum.total - nights : 0;
                        const pct = sum.total > 0 ? Math.round((sum.confirmed / sum.total) * 100) : 0;
                        const progress = (
                            <span className="acc-progress">
                                <span className="acc-bar"><span style={{ width: `${pct}%` }} /></span>
                                <b>{sum.confirmed}/{sum.total}</b>
                            </span>
                        );
                        return (
                            <article key={r.id} id={`acc-row-${r.id}`} className={`acc-item${open ? ' open' : ''}`}>
                                <button type="button" className="acc-row" aria-expanded={open} onClick={() => toggleExpand(r)}>
                                    {/* PC: 한 줄 */}
                                    <span className="acc-line d-only">
                                        <span>{open ? <ChevronDown size={18} strokeWidth={1.5} /> : <ChevronRight size={18} strokeWidth={1.5} />}</span>
                                        <span><span className={`badge ${statusTone(sum.label)}`}>{sum.label}</span></span>
                                        <span className="acc-who">
                                            <b>{r.customerName || '-'}</b>
                                            {r.reservationNumber && <span>#{r.reservationNumber}</span>}
                                            {r.type === 'quote' && <span className="badge sm b-new">Үнийн санал</span>}
                                        </span>
                                        <span className="tnum">{fmtDate(r.startDate)} ~ {fmtDate(r.endDate)}</span>
                                        <span>{nightsText}</span>
                                        <span className="acc-region">{regionOf(r)}</span>
                                        <span>{r.travelers || '-'} хүн</span>
                                        <span>
                                            {progress}
                                            {extraRows > 0 && <span className="acc-warn">шөнөөс {extraRows} мөр илүү — устгана уу</span>}
                                        </span>
                                    </span>
                                    {/* 휴대폰: 카드 */}
                                    <span className="acc-card m-only">
                                        <span className="acc-card-top">
                                            <span className={`badge ${statusTone(sum.label)}`}>{sum.label}</span>
                                            {open ? <ChevronUp size={20} strokeWidth={1.5} /> : <ChevronDown size={20} strokeWidth={1.5} />}
                                        </span>
                                        <span className="acc-who"><b>{r.customerName || '-'}</b>{r.reservationNumber && <span>#{r.reservationNumber}</span>}</span>
                                        <span className="acc-meta">
                                            <span><CalendarDays size={14} strokeWidth={1.5} aria-hidden="true" />{fmtDate(r.startDate).slice(5)} ~ {fmtDate(r.endDate).slice(5)} · {nightsText}</span>
                                            <span><MapPin size={14} strokeWidth={1.5} aria-hidden="true" />{regionOf(r)}</span>
                                            <span><Users size={14} strokeWidth={1.5} aria-hidden="true" />{r.travelers || '-'} хүн</span>
                                        </span>
                                        {progress}
                                        {extraRows > 0 && <span className="acc-warn">шөнөөс {extraRows} мөр илүү — устгана уу</span>}
                                    </span>
                                </button>

                                {open && (
                                    <div className="acc-detail">
                                        {/* ── Аяллын мэдээлэл (수배서 정보) ── */}
                                        <div className="acc-sec-title">Аяллын мэдээлэл</div>
                                        <div className="acc-sec">
                                            <div className="acc-flights">
                                                <div><span><PlaneLanding size={14} strokeWidth={1.5} aria-hidden="true" />Ирэх нислэг (Монгол ирэх)</span><b>{flightLine(cd.arrival)}</b></div>
                                                <div><span><PlaneTakeoff size={14} strokeWidth={1.5} aria-hidden="true" />Буцах нислэг (Монголоос явах)</span><b>{flightLine(cd.departure)}</b></div>
                                            </div>
                                            {travelers.length > 0 ? (
                                                <div className="tbl-wrap acc-travelers">
                                                    <table className="tbl static" style={{ minWidth: 640 }}>
                                                        <thead><tr>
                                                            <th scope="col">Аялагч</th>
                                                            <th scope="col">Паспортын нэр</th>
                                                            <th scope="col">Нэр</th>
                                                            <th scope="col">Төрсөн огноо</th>
                                                            <th scope="col">Хүйс</th>
                                                            <th scope="col">Утас</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {travelers.map((t, i) => (
                                                                <tr key={i}>
                                                                    <td><b>{i + 1}</b></td>
                                                                    <td><b>{t.passportName || '-'}</b></td>
                                                                    <td>{t.name || '-'}</td>
                                                                    <td className="tnum">{t.birthdate || '-'}</td>
                                                                    <td>{genderMn(t.gender)}</td>
                                                                    <td className="tnum">{t.phone || '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : <p className="acc-note">Аялагчийн мэдээлэл алга (гэрээ ирээгүй).</p>}
                                            {cd.agreement?.name && (
                                                <p className="acc-note acc-sign">
                                                    Цахим гарын үсэг: <b>{cd.agreement.name}</b>
                                                    {cd.agreement.signature && <img src={cd.agreement.signature} alt="" />}
                                                </p>
                                            )}
                                        </div>

                                        {/* ── Өдөр тутмын байр ── */}
                                        <div className="acc-sec-title">Өдөр тутмын байрны захиалга</div>
                                        <div className="acc-days">
                                            <div className="acc-day acc-day-head d-only" aria-hidden="true">
                                                <span>Өдөр · Огноо</span><span>Бүс / Байршил</span><span>Байрны нэр</span><span>Зэрэглэл</span><span>Өрөө</span><span>Хүн/өрөө</span><span>Захиалгын төлөв</span><span />
                                            </div>
                                            {rows.map((d, idx) => {
                                                const acc = d.accommodation || {};
                                                const hasName = (acc.name || '').trim().length > 0;
                                                const st: BookingStatus | 'Хуваарилаагүй' = hasName ? (acc.bookingStatus || 'Илгээгээгүй') : 'Хуваарилаагүй';
                                                // 호텔 마스터에서 셀렉트로 선택. 목록에 없는 숙소만 "Гараар бичих"로 직접 입력.
                                                const mKey = `${r.id}:${idx}`;
                                                const nm = acc.name || '';
                                                const inMaster = !!nm && hotelNames.includes(nm);
                                                const manual = manualHotels.has(mKey) || (!!nm && !inMaster);
                                                return (
                                                    <div className="acc-day" key={idx}>
                                                        <div className="acc-day-when">
                                                            <label className="acc-day-no">
                                                                <span>ӨДӨР</span>
                                                                <input type="number" min={1} value={d.day} onChange={e => patchDayMeta(r.id, idx, { day: parseInt(e.target.value) || idx + 1 })} />
                                                            </label>
                                                            <input aria-label="Огноо" type="date" className="inp" value={d.date || ''} onChange={e => patchDayMeta(r.id, idx, { date: e.target.value })} />
                                                            {d.date && <span className="acc-wd">{weekdayMn(d.date)}</span>}
                                                        </div>
                                                        <input aria-label="Бүс / Байршил" className="inp acc-f-loc" value={acc.location || ''} placeholder="지역 입력" onChange={e => patchDay(r.id, idx, { location: e.target.value })} />
                                                        <div className="acc-f-name">
                                                            {manual ? (
                                                                <div className="acc-manual">
                                                                    <input aria-label="Байрны нэр" className="inp" value={nm} placeholder="Буудлын нэр бичих"
                                                                        onChange={e => { if (!manualHotels.has(mKey)) setManualHotels(prev => new Set(prev).add(mKey)); patchDay(r.id, idx, { name: e.target.value }); }} />
                                                                    <button type="button" className="act-btn" title="Жагсаалтаас сонгох" aria-label="Жагсаалтаас сонгох"
                                                                        onClick={() => { setManualHotels(prev => { const n = new Set(prev); n.delete(mKey); return n; }); patchDay(r.id, idx, { name: '' }); }}>
                                                                        <ListChecks size={16} strokeWidth={1.5} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <select aria-label="Байрны нэр" className="select" value={inMaster ? nm : ''}
                                                                    onChange={e => {
                                                                        const v = e.target.value;
                                                                        if (v === '__manual__') { setManualHotels(prev => new Set(prev).add(mKey)); patchDay(r.id, idx, { name: '', id: undefined, images: [] }); return; }
                                                                        // 호텔 마스터에서 선택 → 이미지·지역·설명·시설까지 전체를 숙소에 채운다.
                                                                        // (이름만 넣으면 예약 상세·확정 일정표에 이미지가 안 나옴)
                                                                        const h = hotelByName.get(v);
                                                                        const patch: Partial<DailyAcc['accommodation']> = { name: v };
                                                                        if (h) {
                                                                            patch.id = h.id;
                                                                            patch.images = Array.isArray(h.images) ? h.images : [];
                                                                            patch.description = h.description || '';
                                                                            if (!acc.location && h.region) patch.location = h.region;
                                                                            if (Array.isArray(h.amenities) && h.amenities.length) patch.facilities = h.amenities;
                                                                        }
                                                                        patchDay(r.id, idx, patch);
                                                                    }}>
                                                                    <option value="">Буудал сонгох…</option>
                                                                    {hotelNames.map(n => <option key={n} value={n}>{n}</option>)}
                                                                    <option value="__manual__">Гараар бичих (жагсаалтад байхгүй)</option>
                                                                </select>
                                                            )}
                                                        </div>
                                                        <select aria-label="Зэрэглэл" className="select acc-f-grade" value={acc.type || ''} onChange={e => patchDay(r.id, idx, { type: e.target.value || undefined })}>
                                                            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g || 'Тодорхойгүй'}</option>)}
                                                        </select>
                                                        <input aria-label="Өрөө" className="inp acc-f-rooms" type="number" min={0} value={acc.roomCount ?? ''} placeholder="0" onChange={e => patchDay(r.id, idx, { roomCount: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value) || 0) })} />
                                                        <select aria-label="Хүн/өрөө" className="select acc-f-occ" value={acc.occupancy || ''} onChange={e => patchDay(r.id, idx, { occupancy: e.target.value || undefined })}>
                                                            {OCCUPANCY_OPTIONS.map(o => <option key={o} value={o}>{o || 'Тодорхойгүй'}</option>)}
                                                        </select>
                                                        <select aria-label="Захиалгын төлөв" className={`select acc-f-status ${statusTone(st)}`}
                                                            value={hasName ? (acc.bookingStatus || 'Илгээгээгүй') : 'Илгээгээгүй'} disabled={!hasName}
                                                            onChange={e => patchDay(r.id, idx, { bookingStatus: e.target.value as BookingStatus })}>
                                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                        <button type="button" className="act-btn danger acc-f-del" title="Энэ өдрийг устгах" aria-label={`Өдөр ${d.day}-г устгах`}
                                                            onClick={() => { if (window.confirm(`Өдөр ${d.day}-г устгах уу?`)) removeDay(r.id, idx); }}>
                                                            <Trash2 size={16} strokeWidth={1.5} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {rows.length === 0 && <p className="acc-note">Өдөр алга. ‘Өдөр нэмэх’ дарж нэмнэ үү.</p>}
                                        </div>
                                        <div className="acc-sec acc-day-tools">
                                            <Button icon={<Plus />} onClick={() => addDay(r.id)}>Өдөр нэмэх</Button>
                                            <Button icon={<ListOrdered />} title="일차 번호를 날짜순으로 1..N 재정렬합니다." onClick={() => renumberDays(r.id)}>Огноогоор цэгцлэх</Button>
                                        </div>

                                        {/* ── Хариуцсан гайд ба тээвэр (가이드·차량) ── */}
                                        <div className="acc-sec-title">Хариуцсан гайд ба тээвэр</div>
                                        <div className="acc-sec form-grid">
                                            <Input label="Гайдын нэр" value={r.assignedGuide?.name || ''} placeholder="Гайдын нэр" onChange={e => patchGuide(r.id, { name: e.target.value })} />
                                            <Input label="Гайдын утас" value={r.assignedGuide?.phone || ''} placeholder="Гайдын утас" onChange={e => patchGuide(r.id, { phone: e.target.value })} />
                                            <Input label="Машины төрөл" value={r.contractData?.vehicle?.type || ''} placeholder="Жишээ: Land Cruiser 76" onChange={e => patchVehicle(r.id, { type: e.target.value })} />
                                            <Input label="Жолоочийн утас" value={r.contractData?.vehicle?.phone || ''} placeholder="Жолоочийн утас" onChange={e => patchVehicle(r.id, { phone: e.target.value })} />
                                        </div>

                                        <div className="acc-foot">
                                            {isDirty && <span className="acc-dirty">Өөрчлөгдсөн</span>}
                                            <Button href={`/admin/reservations?open=${r.id}`} icon={<ExternalLink />} title="통합 예약 관리에서 이 예약 상세를 엽니다.">Захиалга нээх</Button>
                                            <Button variant="primary" icon={<Save />} disabled={!isDirty || savingId === r.id} onClick={() => save(r)}>
                                                {savingId === r.id ? 'Хадгалж байна…' : 'Хадгалах'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>
        </AdminLayout>
    );
};
