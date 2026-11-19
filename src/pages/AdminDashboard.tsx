import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BadgeCheck, CalendarDays, CalendarPlus, CircleAlert, ContactRound, Inbox, ReceiptText, RefreshCw, Ticket, Wallet, type LucideIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { AdminLayout } from '../components/admin/AdminLayout';
import { useAdminPending } from '../components/admin/adminNav';
import { Badge, Button, Card, DataTable, EmptyState, KpiCard, Notice, StatusBadge, type Column } from '../components/admin/ui';

type Reservation = {
    id: string;
    status?: string;
    createdAt?: string;
    customerName: string;
    productName: string;
    confirmedPrice: number;
    reservationNumber: string;
    phone: string;
    headcount: string;
    startDate: string;
    endDate: string;
    guideName: string;
};

type Quote = { id: string; status?: string };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const todayLabel = () => {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일 · 오늘 처리할 일을 먼저 보여드려요`;
};
const pad = (n: number) => `${n}`.padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** '2027-05-03T…' · '2027/5/3' → '2027-05-03' (읽지 못하면 빈 문자열) */
const dayOf = (value: unknown): string => {
    const m = String(value ?? '').match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    return m ? `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}` : '';
};
const dots = (day: string) => day.replace(/-/g, '.');
const tourRange = (r: Reservation) => {
    if (!r.startDate) return '일정 미정';
    if (!r.endDate || r.endDate === r.startDate) return dots(r.startDate);
    return `${dots(r.startDate)} – ${r.endDate.slice(0, 4) === r.startDate.slice(0, 4) ? dots(r.endDate.slice(5)) : dots(r.endDate)}`;
};
const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value);
const bookingNo = (r: Reservation) => r.reservationNumber || `#${r.id.slice(0, 6).toUpperCase()}`;
const guideNameOf = (raw: unknown): string => {
    if (!raw) return '';
    if (typeof raw === 'object') return String((raw as any).name || '');
    try { return String(JSON.parse(String(raw))?.name || ''); } catch { return ''; }
};

export const AdminDashboard: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const pending = useAdminPending();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const [reservationData, quoteData] = await Promise.all([api.reservations.list(), api.quotes.list()]);
            setReservations((reservationData || []).map((item: any) => {
                const people = item.totalPeople || item.total_people;
                return {
                    id: String(item.id),
                    status: item.status,
                    createdAt: item.createdAt || item.created_at,
                    customerName: item.customerName || item.customer_name || item.customer_info?.name || '이름 없음',
                    productName: item.productName || item.product_name || '상품 미정',
                    confirmedPrice: Number(item.confirmedPrice || item.confirmed_price || 0),
                    reservationNumber: item.reservationNumber || item.reservation_number || '',
                    phone: item.phone || item.customerPhone || item.customer_phone || item.customer_info?.phone || '',
                    headcount: item.headcount || (people ? `${people}명` : ''),
                    startDate: dayOf(item.startDate || item.start_date || item.date),
                    endDate: dayOf(item.endDate || item.end_date),
                    guideName: guideNameOf(item.assignedGuide || item.assigned_guide),
                };
            }));
            setQuotes(quoteData || []);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
            setErrorMessage('대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const metrics = useMemo(() => {
        const now = new Date();
        const today = localDay(now);
        const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
        const createdOn = (day: string) => reservations.filter((item) => item.createdAt && localDay(new Date(item.createdAt)) === day).length;
        const sold = reservations.filter((item) => item.status === 'confirmed' || item.status === 'completed' || item.status === 'paid');
        return {
            todayReservations: createdOn(today),
            yesterdayReservations: createdOn(yesterday),
            unpaid: reservations.filter((item) => item.status === 'pending_payment').length,
            requested: reservations.filter((item) => item.status === 'reservation_requested').length,
            newQuotes: quotes.filter((item) => item.status === 'pending' || item.status === 'new').length,
            draftQuotes: quotes.filter((item) => item.status === 'processing').length,
            soldCount: sold.length,
            confirmedSales: sold.reduce((sum, item) => sum + item.confirmedPrice, 0),
        };
    }, [reservations, quotes]);

    const upcoming = useMemo(() => {
        const today = localDay(new Date());
        return reservations
            .filter((r) => r.status === 'confirmed' && r.startDate && r.startDate >= today)
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .slice(0, 4);
    }, [reservations]);

    const recent = reservations.slice(0, 6);
    const failed = !!errorMessage;
    const openHref = (r: Reservation) => `/admin/reservations?open=${encodeURIComponent(r.id)}`;
    const priceOf = (r: Reservation) => (r.confirmedPrice ? `₩${formatNumber(r.confirmedPrice)}` : '–');
    const diff = metrics.todayReservations - metrics.yesterdayReservations;

    const todos: { icon: LucideIcon; title: string; count: number; sub: string; action: string; href: string }[] = [
        { icon: Wallet, title: '예약금 미입금', count: metrics.unpaid, sub: '입금이 확인되면 예약을 확정해 주세요', action: '입금 확인', href: '/admin/reservations' },
        { icon: ReceiptText, title: '새 견적 요청', count: metrics.newQuotes, sub: '아직 견적을 보내지 않은 요청', action: '견적 작성', href: '/admin/quotes' },
        { icon: Ticket, title: '예약 요청', count: metrics.requested, sub: '고객이 견적을 보고 예약을 요청했어요', action: '예약 확인', href: '/admin/reservations' },
        { icon: Inbox, title: '미답변 문의', count: pending?.newInquiries ?? 0, sub: '아직 읽지 않은 문의', action: '답변하기', href: '/admin/inquiries' },
    ].filter((t) => t.count > 0);

    const columns: Column<Reservation>[] = [
        { key: 'no', header: '예약번호', render: (r) => <a className="cell-link" href={openHref(r)}>{bookingNo(r)}</a> },
        { key: 'who', header: '고객 / 연락처', render: (r) => <div className="cell-2"><b>{r.customerName}</b>{r.phone && <span>{r.phone}</span>}</div> },
        { key: 'product', header: '상품', wrap: true, render: (r) => r.productName },
        { key: 'people', header: '인원', align: 'center', render: (r) => r.headcount || '–' },
        { key: 'date', header: '투어일', numeric: true, render: (r) => tourRange(r) },
        { key: 'status', header: '상태', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'price', header: '금액', align: 'right', numeric: true, render: (r) => <span className="cell-price">{priceOf(r)}</span> },
        { key: 'act', header: '관리', align: 'right', render: (r) => <Button size="sm" href={openHref(r)}>상세</Button> },
    ];

    return (
        <AdminLayout
            activePage="dashboard"
            title="대시보드"
            description={todayLabel()}
            actions={<>
                <Button href="/admin/guides" icon={<ContactRound />}>가이드 관리</Button>
                <Button href="/admin/calendar" icon={<CalendarDays />}>투어 캘린더</Button>
                <Button variant="primary" href="/admin/quotes" icon={<ReceiptText />}>견적 확인</Button>
            </>}
        >
            <div className="dash route-anim">
                {failed && (
                    <Notice
                        error icon={<CircleAlert size={20} strokeWidth={2} />}
                        action={<Button size="sm" icon={<RefreshCw />} onClick={fetchData}>다시 시도</Button>}
                    >
                        {errorMessage}
                    </Notice>
                )}

                {!failed && (
                    <section className="kpi-grid" aria-label="오늘 지표" aria-busy={isLoading}>
                        <KpiCard
                            loading={isLoading} tone="green" icon={<CalendarPlus size={20} strokeWidth={1.5} />} label="오늘 신규 예약"
                            value={`${metrics.todayReservations}건`}
                            sub={diff === 0 ? '어제와 같아요' : `어제보다 ${Math.abs(diff)}건 ${diff > 0 ? '많아요' : '적어요'}`}
                        />
                        <KpiCard
                            loading={isLoading} tone={metrics.unpaid > 0 ? 'red' : 'gray'} icon={<Wallet size={20} strokeWidth={1.5} />} label="입금 확인 필요"
                            value={`${metrics.unpaid}건`} sub="예약금 미입금" href="/admin/reservations"
                        />
                        <KpiCard
                            loading={isLoading} icon={<ReceiptText size={20} strokeWidth={1.5} />} label="신규·작성중 견적"
                            value={`${metrics.newQuotes + metrics.draftQuotes}건`}
                            sub={`신규 ${metrics.newQuotes}건 · 작성중 ${metrics.draftQuotes}건`} href="/admin/quotes"
                        />
                        <KpiCard
                            loading={isLoading} tone="accent" icon={<BadgeCheck size={20} strokeWidth={1.5} />} label="확정 매출"
                            value={`₩${formatNumber(metrics.confirmedSales)}`} sub={`결제 완료·확정 ${metrics.soldCount}건 기준`}
                        />
                    </section>
                )}

                {!failed && (
                    <div className="dash-cols">
                        <Card title="오늘 처리할 일" action={<a className="link-action" href="/admin/reservations">전체 보기</a>}>
                            {isLoading ? (
                                <ul className="rows">{[0, 1, 2].map((i) => <li key={i}><span className="sk" style={{ width: 36, height: 36, borderRadius: 8 }} /><span className="sk" style={{ width: 160 }} /></li>)}</ul>
                            ) : todos.length === 0 ? (
                                <EmptyState small icon={<BadgeCheck strokeWidth={1.5} />}>지금 처리할 일이 없습니다.</EmptyState>
                            ) : (
                                <ul className="rows">
                                    {todos.map((t) => (
                                        <li key={t.title}>
                                            <span className="ico-chip"><t.icon size={18} strokeWidth={1.5} aria-hidden="true" /></span>
                                            <div className="row-text"><b>{t.title} <em>{t.count}건</em></b><span>{t.sub}</span></div>
                                            <Button variant="soft" size="sm" href={t.href}>{t.action}</Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <Card title="다가오는 확정 투어" action={<a className="link-action" href="/admin/calendar">캘린더 열기</a>}>
                            {isLoading ? (
                                <ul className="rows">{[0, 1, 2].map((i) => <li key={i}><span className="sk" style={{ width: 52, height: 44, borderRadius: 8 }} /><span className="sk" style={{ width: 160 }} /></li>)}</ul>
                            ) : upcoming.length === 0 ? (
                                <EmptyState small icon={<CalendarDays strokeWidth={1.5} />}>출발을 앞둔 확정 투어가 없습니다.</EmptyState>
                            ) : (
                                <div className="rows">
                                    {upcoming.map((r) => (
                                        <a key={r.id} href={openHref(r)}>
                                            <div className="date-chip"><span>{r.startDate.slice(0, 4)}</span><b>{dots(r.startDate.slice(5))}</b></div>
                                            <div className="row-text"><b>{r.productName}</b><span>{r.customerName}{r.headcount ? ` · ${r.headcount}` : ''}</span></div>
                                            {r.guideName ? <Badge tone="paid">{r.guideName}</Badge> : <Badge tone="wait">가이드 미배정</Badge>}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                <Card title="최근 예약" action={<a className="link-action" href="/admin/reservations">통합 예약 관리로</a>}>
                    <div className="dash-table">
                        <DataTable
                            framed={false} columns={columns} rows={recent} rowKey={(r) => r.id} loading={isLoading} caption="최근 예약"
                            empty={<EmptyState icon={<Ticket strokeWidth={1.5} />}>최근 예약이 없습니다.</EmptyState>}
                        />
                    </div>
                    {/* 768px 이하: 표 대신 카드 목록 */}
                    <div className="dash-cards">
                        {isLoading && [0, 1, 2].map((i) => (
                            <div key={i} className="mcard"><span className="sk" style={{ width: 120 }} /><span className="sk" style={{ width: 200 }} /></div>
                        ))}
                        {!isLoading && recent.map((r) => (
                            <a key={r.id} className="mcard" href={openHref(r)}>
                                <span className="mcard-top"><span className="mcard-no">{bookingNo(r)}</span><StatusBadge status={r.status} /></span>
                                <span className="mcard-mid"><b>{r.customerName}</b><b>{priceOf(r)}</b></span>
                                <span className="mcard-sub">{r.productName}</span>
                            </a>
                        ))}
                        {!isLoading && recent.length === 0 && <EmptyState small icon={<Ticket strokeWidth={1.5} />}>최근 예약이 없습니다.</EmptyState>}
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
};
