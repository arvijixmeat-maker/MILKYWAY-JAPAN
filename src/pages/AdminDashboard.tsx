import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AdminLayout } from '../components/admin/AdminLayout';
import { StrokeIcon, type StrokeIconName } from '../components/admin/console/StrokeIcon';

type Reservation = {
    id: string;
    status?: string;
    createdAt?: string;
    customerName?: string;
    productName?: string;
    confirmedPrice?: number;
    reservationNumber?: string;
};

type Quote = {
    id: string;
    status?: string;
    name?: string;
    destination?: string;
    createdAt?: string;
    created_at?: string;
};

type Guide = {
    id: string;
    name?: string;
    status?: string;
    image?: string;
};

/** 상태 배지 — UI 키트의 다섯 가지 톤(attention · waiting · progress · done · closed) */
const STATUS_BADGE: Record<string, { label: string; tone: string }> = {
    new: { label: '신규 견적', tone: 'b-purple' },
    processing: { label: '견적 작성중', tone: 'b-amber' },
    answered: { label: '견적 발송됨', tone: 'b-blue' },
    reservation_requested: { label: '예약 요청됨', tone: 'b-purple' },
    pending_payment: { label: '입금 대기', tone: 'b-amber' },
    paid: { label: '결제 완료', tone: 'b-blue' },
    confirmed: { label: '예약 확정', tone: 'b-green' },
    completed: { label: '여행 완료', tone: 'b-gray' },
    cancelled: { label: '취소됨', tone: 'b-gray' },
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const todayLabel = () => {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]}) 기준`;
};
const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.getMonth() + 1}. ${date.getDate()}.`;
};
const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value);
const initials = (name?: string) => (name || '?').trim().slice(0, 2);
const bookingNo = (r: Reservation) => `#${r.reservationNumber || r.id.slice(0, 6).toUpperCase()}`;

const SKELETON_ROWS = [0, 1, 2, 3, 4];

export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [guides, setGuides] = useState<Guide[]>([]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const [reservationData, quoteData, guideData] = await Promise.all([
                api.reservations.list(),
                api.quotes.list(),
                api.guides.list(),
            ]);
            setReservations((reservationData || []).map((item: any) => ({
                ...item,
                createdAt: item.createdAt || item.created_at,
                customerName: item.customerName || item.customer_name || '이름 없음',
                productName: item.productName || item.product_name || '상품 미정',
                confirmedPrice: item.confirmedPrice || item.confirmed_price || 0,
                reservationNumber: item.reservationNumber || item.reservation_number || '',
            })));
            setQuotes(quoteData || []);
            setGuides(guideData || []);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
            setErrorMessage('대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const metrics = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayReservations = reservations.filter((item) => item.createdAt?.startsWith(today)).length;
        const unpaidReservations = reservations.filter((item) => item.status === 'pending_payment').length;
        const newQuotes = quotes.filter((item) => item.status === 'pending' || item.status === 'new').length;
        const ongoingTours = reservations.filter((item) => item.status === 'confirmed').length;
        const confirmedSales = reservations
            .filter((item) => item.status === 'confirmed' || item.status === 'completed' || item.status === 'paid')
            .reduce((sum, item) => sum + Number(item.confirmedPrice || 0), 0);
        return { todayReservations, unpaidReservations, newQuotes, ongoingTours, confirmedSales };
    }, [reservations, quotes]);

    const recentReservations = reservations.slice(0, 6);
    const recentQuotes = quotes.slice(0, 3);
    const shownGuides = guides.slice(0, 5);
    const failed = !!errorMessage;

    const metricCards: { icon: StrokeIconName; label: string; value: string; unit: string }[] = [
        { icon: 'navCal', label: '오늘 신규 예약', value: `${metrics.todayReservations}`, unit: '건' },
        { icon: 'uiDoc', label: '새 견적 요청', value: `${metrics.newQuotes}`, unit: '건' },
        { icon: 'uiCard', label: '입금 대기', value: `${metrics.unpaidReservations}`, unit: '건' },
        { icon: 'uiCheck', label: '확정 매출', value: `₩${formatNumber(metrics.confirmedSales)}`, unit: '' },
    ];
    const quickLinks: { t: string; s: string; v: number; icon: StrokeIconName; tone: 'wait' | 'ok'; go: string }[] = [
        { t: '견적 응답 대기', s: '신규·작성중 견적', v: metrics.newQuotes, icon: 'uiDoc', tone: 'wait', go: '/admin/quotes' },
        { t: '입금 확인 필요', s: '예약금 미입금', v: metrics.unpaidReservations, icon: 'uiCard', tone: 'wait', go: '/admin/reservations' },
        { t: '투어 캘린더', s: '확정 투어 일정', v: metrics.ongoingTours, icon: 'navCal', tone: 'ok', go: '/admin/calendar' },
    ];

    const badgeOf = (status?: string) => STATUS_BADGE[status || ''] || { label: status || '-', tone: 'b-gray' };
    const priceOf = (r: Reservation) => (r.confirmedPrice ? `₩${formatNumber(r.confirmedPrice)}` : '–');
    const openReservation = (r: Reservation) => `/admin/reservations?open=${encodeURIComponent(r.id)}`;

    return (
        <AdminLayout
            activePage="dashboard"
            title="대시보드"
            description={todayLabel()}
            actions={
                <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/quotes')}>
                    <StrokeIcon name="uiDoc" size={18} />견적 확인
                </button>
            }
        >
            <div className="dash route-anim">
                {failed && (
                    <div className="dash-alert" role="alert">
                        <StrokeIcon name="uiAlert" color="#fa5b4a" strokeWidth={2} />
                        <span>{errorMessage}</span>
                        <button type="button" className="btn btn-ghost" onClick={fetchData}>
                            <StrokeIcon name="uiRetry" size={16} />다시 시도
                        </button>
                    </div>
                )}

                {!failed && (
                    <section className="dash-metrics" aria-label="오늘 지표" aria-busy={isLoading}>
                        {metricCards.map((m) => (
                            <div className="dash-metric" key={m.label}>
                                <div className="dash-metric-top">
                                    <span className="dash-ico"><StrokeIcon name={m.icon} /></span>
                                    <span className="dash-metric-label">{m.label}</span>
                                </div>
                                <div className="dash-metric-value">
                                    {isLoading ? <span className="sk sk-value" /> : <>{m.value}{m.unit && <small>{m.unit}</small>}</>}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {!failed && !isLoading && (
                    <section className="dash-quick" aria-labelledby="dash-quick-h">
                        <h2 id="dash-quick-h" className="dash-quick-title">바로 처리</h2>
                        {quickLinks.map((q) => (
                            <a className="dash-qlink" key={q.t} href={q.go}>
                                <span className={`dash-qi ${q.tone}`}><StrokeIcon name={q.icon} /></span>
                                <span className="dash-qtext"><b>{q.t}</b><span>{q.s}</span></span>
                                <span className={`dash-qv ${q.tone}`}>{q.v}</span>
                                <StrokeIcon name="uiChevRight" size={18} color="#848c94" />
                            </a>
                        ))}
                    </section>
                )}

                <section className="dash-cols">
                    <div className="dash-main">
                        <section className="card">
                            <div className="card-head">
                                <h2>최근 예약</h2><div className="spacer" />
                                <a className="link-action" href="/admin/reservations">전체 보기</a>
                            </div>
                            <div className="tbl-wrap dash-table">
                                <table className="tbl">
                                    <thead><tr>
                                        <th scope="col">예약번호</th><th scope="col">고객</th><th scope="col">상품</th>
                                        <th scope="col">상태</th><th scope="col" className="r">금액</th>
                                    </tr></thead>
                                    <tbody>
                                        {isLoading && SKELETON_ROWS.map((i) => (
                                            <tr key={i} className="sk-row">
                                                <td><span className="sk" style={{ width: 64 }} /></td>
                                                <td><span className="sk" style={{ width: 96 }} /></td>
                                                <td><span className="sk" style={{ width: 180 }} /></td>
                                                <td><span className="sk" style={{ width: 64 }} /></td>
                                                <td><span className="sk" style={{ width: 72, marginLeft: 'auto' }} /></td>
                                            </tr>
                                        ))}
                                        {!isLoading && recentReservations.map((r) => {
                                            const s = badgeOf(r.status);
                                            return (
                                                <tr key={r.id}>
                                                    <td><a className="dash-no" href={openReservation(r)}>{bookingNo(r)}</a></td>
                                                    <td>
                                                        <span className="dash-who">
                                                            <span className="dash-av">{initials(r.customerName)}</span>
                                                            <b>{r.customerName}</b>
                                                        </span>
                                                    </td>
                                                    <td className="dash-product"><span>{r.productName}</span></td>
                                                    <td><span className={`badge ${s.tone}`}>{s.label}</span></td>
                                                    <td className="r dash-price">{priceOf(r)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {/* 767px 이하: 표 대신 한 줄씩 카드 */}
                            <div className="dash-cards">
                                {isLoading && SKELETON_ROWS.map((i) => (
                                    <div key={i} className="dash-rcard"><span className="sk" style={{ width: 120 }} /><span className="sk" style={{ width: 200 }} /></div>
                                ))}
                                {!isLoading && recentReservations.map((r) => {
                                    const s = badgeOf(r.status);
                                    return (
                                        <a key={r.id} className="dash-rcard" href={openReservation(r)}>
                                            <span className="dash-rcard-top"><span className="dash-rcard-no">{bookingNo(r)}</span><span className={`badge sm ${s.tone}`}>{s.label}</span></span>
                                            <span className="dash-rcard-mid"><b>{r.customerName}</b><b>{priceOf(r)}</b></span>
                                            <span className="dash-rcard-sub">{r.productName}</span>
                                        </a>
                                    );
                                })}
                            </div>
                            {!isLoading && recentReservations.length === 0 && (
                                <div className="dash-empty lg"><StrokeIcon name="uiDoc" size={28} color="#848c94" />최근 예약이 없습니다.</div>
                            )}
                        </section>
                    </div>

                    <div className="dash-aside">
                        <section className="card">
                            <div className="card-head">
                                <h2>새 견적 요청</h2><div className="spacer" />
                                <a className="link-action" href="/admin/quotes">견적 관리</a>
                            </div>
                            <div className="dash-list">
                                {isLoading && [0, 1, 2].map((i) => (
                                    <div key={i} className="dash-quote"><span className="sk" style={{ width: 36, height: 36, borderRadius: 10 }} /><span className="sk" style={{ width: 140 }} /></div>
                                ))}
                                {!isLoading && recentQuotes.map((q) => (
                                    <a key={q.id} className="dash-quote" href="/admin/quotes">
                                        <span className="dash-ico"><StrokeIcon name="uiDoc" size={18} /></span>
                                        <span className="dash-qtext">
                                            <b>{q.name || '이름 없음'}</b>
                                            <span>{q.destination || '목적지 미정'} · {formatDate(q.createdAt || q.created_at)}</span>
                                        </span>
                                        <StrokeIcon name="uiChevRight" size={18} color="#848c94" />
                                    </a>
                                ))}
                                {!isLoading && recentQuotes.length === 0 && (
                                    <div className="dash-empty"><StrokeIcon name="uiDoc" size={24} color="#848c94" />대기 중인 견적 요청이 없습니다.</div>
                                )}
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <h2>가이드 현황</h2><div className="spacer" />
                                <a className="link-action" href="/admin/guides">가이드 관리</a>
                            </div>
                            <div className="dash-list">
                                {isLoading && [0, 1, 2].map((i) => (
                                    <div key={i} className="dash-guide"><span className="sk" style={{ width: 32, height: 32, borderRadius: 99 }} /><span className="sk" style={{ width: 120 }} /></div>
                                ))}
                                {!isLoading && shownGuides.map((g) => (
                                    <div key={g.id} className="dash-guide">
                                        {g.image
                                            ? <img className="dash-av" src={g.image} alt="" />
                                            : <span className="dash-av">{(g.name || '?').trim().slice(0, 1)}</span>}
                                        <b>{g.name || '이름 없음'}</b>
                                        <span className={`badge ${g.status === '활동중' ? 'b-blue' : 'b-gray'}`}>{g.status || '대기'}</span>
                                    </div>
                                ))}
                                {!isLoading && guides.length === 0 && (
                                    <div className="dash-empty"><StrokeIcon name="uiPeople" size={24} color="#848c94" />등록된 가이드가 없습니다.</div>
                                )}
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
};
