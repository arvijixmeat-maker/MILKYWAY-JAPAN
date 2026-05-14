import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AdminLayout } from '../components/admin/AdminLayout';

type Reservation = {
    id: string;
    status?: string;
    createdAt?: string;
    customerName?: string;
    productName?: string;
    confirmedPrice?: number;
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

const statusLabel: Record<string, { label: string; className: string }> = {
    confirmed: { label: '예약 확정', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    pending_payment: { label: '결제 대기', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
    cancelled: { label: '취소', className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
    completed: { label: '완료', className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
};

const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [guides, setGuides] = useState<Guide[]>([]);

    useEffect(() => {
        const fetchData = async () => {
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
                })));
                setQuotes(quoteData || []);
                setGuides(guideData || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
                setErrorMessage('대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const metrics = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayReservations = reservations.filter((item) => item.createdAt?.startsWith(today)).length;
        const unpaidReservations = reservations.filter((item) => item.status === 'pending_payment').length;
        const newQuotes = quotes.filter((item) => item.status === 'pending').length;
        const ongoingTours = reservations.filter((item) => item.status === 'confirmed').length;
        const confirmedSales = reservations
            .filter((item) => item.status === 'confirmed' || item.status === 'completed')
            .reduce((sum, item) => sum + Number(item.confirmedPrice || 0), 0);

        return { todayReservations, unpaidReservations, newQuotes, ongoingTours, confirmedSales };
    }, [reservations, quotes]);

    const toggleTheme = () => {
        setIsDarkMode((current) => {
            document.documentElement.classList.toggle('dark', !current);
            return !current;
        });
    };

    const recentReservations = reservations.slice(0, 6);
    const recentQuotes = quotes.slice(0, 4);

    return (
        <AdminLayout
            activePage="dashboard"
            title="관리자 대시보드"
            description="예약, 견적, 투어 운영 상태를 빠르게 확인합니다."
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            actions={
                <button
                    type="button"
                    onClick={() => navigate('/admin/quotes')}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600"
                >
                    <span className="material-symbols-outlined text-[20px]">request_quote</span>
                    견적 확인
                </button>
            }
        >
                <div className="space-y-6">
                    {errorMessage && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {errorMessage}
                        </div>
                    )}

                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard icon="today" label="오늘 신규 예약" value={`${metrics.todayReservations}건`} loading={isLoading} tone="teal" />
                        <MetricCard icon="request_quote" label="새 견적 요청" value={`${metrics.newQuotes}건`} loading={isLoading} tone="blue" />
                        <MetricCard icon="payments" label="결제 대기" value={`${metrics.unpaidReservations}건`} loading={isLoading} tone="amber" />
                        <MetricCard icon="paid" label="확정 예약 금액" value={`${formatNumber(metrics.confirmedSales)}원`} loading={isLoading} tone="indigo" />
                    </section>

                    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <QuickLink title="견적 응답 대기" value={metrics.newQuotes} icon="request_quote" href="/admin/quotes" onClick={navigate} />
                        <QuickLink title="입금 확인 필요" value={metrics.unpaidReservations} icon="payments" href="/admin/reservations" onClick={navigate} />
                        <QuickLink title="투어 캘린더 확인" value={metrics.ongoingTours} icon="calendar_today" href="/admin/calendar" onClick={navigate} />
                    </section>

                    <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <Panel title="최근 예약" actionLabel="전체 보기" onAction={() => navigate('/admin/reservations')} className="xl:col-span-2">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-slate-100 text-xs font-bold text-slate-400 dark:border-slate-800">
                                        <tr>
                                            <th className="px-5 py-3">예약 번호</th>
                                            <th className="px-5 py-3">고객명</th>
                                            <th className="px-5 py-3">상품명</th>
                                            <th className="px-5 py-3">상태</th>
                                            <th className="px-5 py-3">등록일</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {recentReservations.map((reservation) => {
                                            const status = statusLabel[reservation.status || ''] || statusLabel.pending_payment;

                                            return (
                                                <tr key={reservation.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">#{reservation.id.slice(0, 8)}</td>
                                                    <td className="px-5 py-4">{reservation.customerName}</td>
                                                    <td className="max-w-[260px] truncate px-5 py-4 text-slate-600 dark:text-slate-300">{reservation.productName}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-slate-500">{formatDate(reservation.createdAt)}</td>
                                                </tr>
                                            );
                                        })}
                                        {!isLoading && recentReservations.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">최근 예약이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>

                        <div className="space-y-6">
                            <Panel title="최근 견적 요청" actionLabel="견적 관리" onAction={() => navigate('/admin/quotes')}>
                                <div className="space-y-3 p-5">
                                    {recentQuotes.map((quote) => (
                                        <button
                                            key={quote.id}
                                            type="button"
                                            onClick={() => navigate('/admin/quotes')}
                                            className="flex w-full items-center justify-between rounded-lg border border-slate-100 p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                                        >
                                            <span>
                                                <span className="block text-sm font-bold text-slate-900 dark:text-white">{quote.name || '이름 없음'}</span>
                                                <span className="mt-1 block text-xs text-slate-500">{quote.destination || '목적지 미정'} · {formatDate(quote.createdAt || quote.created_at)}</span>
                                            </span>
                                            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                                        </button>
                                    ))}
                                    {!isLoading && recentQuotes.length === 0 && (
                                        <div className="py-10 text-center text-sm text-slate-400">대기 중인 견적 요청이 없습니다.</div>
                                    )}
                                </div>
                            </Panel>

                            <Panel title="가이드 현황" actionLabel="가이드 관리" onAction={() => navigate('/admin/templates')}>
                                <div className="space-y-4 p-5">
                                    {guides.slice(0, 5).map((guide) => (
                                        <div key={guide.id} className="flex items-center justify-between">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                                                    {guide.image ? (
                                                        <img src={guide.image} alt={guide.name || '가이드'} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-slate-400">person</span>
                                                    )}
                                                </div>
                                                <span className="truncate text-sm font-semibold">{guide.name || '이름 없음'}</span>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                {guide.status || '대기'}
                                            </span>
                                        </div>
                                    ))}
                                    {!isLoading && guides.length === 0 && (
                                        <div className="py-10 text-center text-sm text-slate-400">등록된 가이드가 없습니다.</div>
                                    )}
                                </div>
                            </Panel>
                        </div>
                    </section>
                </div>
        </AdminLayout>
    );
};

const toneClasses = {
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
};

const MetricCard = ({ icon, label, value, loading, tone }: { icon: string; label: string; value: string; loading: boolean; tone: keyof typeof toneClasses }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <span className="material-symbols-outlined">{icon}</span>
        </span>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{loading ? '-' : value}</p>
    </div>
);

const QuickLink = ({ title, value, icon, href, onClick }: { title: string; value: number; icon: string; href: string; onClick: (path: string) => void }) => (
    <button
        type="button"
        onClick={() => onClick(href)}
        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500/50"
    >
        <span className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span className="material-symbols-outlined">{icon}</span>
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{title}</span>
        </span>
        <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
    </button>
);

const Panel = ({ title, actionLabel, onAction, children, className = '' }: { title: string; actionLabel: string; onAction: () => void; children: React.ReactNode; className?: string }) => (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-teal-600 transition-colors hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-500/10"
            >
                {actionLabel}
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
        </div>
        {children}
    </div>
);
