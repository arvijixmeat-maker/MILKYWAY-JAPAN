import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { AdminSidebar } from '../components/admin/AdminSidebar';


export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isDarkMode, setIsDarkMode] = useState(false);

    // State for data
    const [reservations, setReservations] = useState<any[]>([]);
    const [adminQuotes, setAdminQuotes] = useState<any[]>([]);
    const [guides, setGuides] = useState<any[]>([]);

    // Fetch data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Reservations
                const resData = await api.reservations.list();
                if (resData) {
                    setReservations(resData.map((r: any) => ({
                        ...r,
                        createdAt: r.createdAt || r.created_at, // Handle potential casing diffs
                        customerName: r.customerName || r.customer_name || 'Unknown',
                        productName: r.productName || r.product_name
                    })));
                }

                // Fetch Quotes
                const quoteData = await api.quotes.list();
                if (quoteData) {
                    setAdminQuotes(quoteData);
                }

                // Fetch Guides
                const guideData = await api.guides.list();
                if (guideData) {
                    setGuides(guideData);
                }

            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            }
        };

        fetchData();
    }, []);

    // Calculate statistics
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = reservations.filter(r => r.createdAt?.startsWith(today)).length;
    const unpaidReservations = reservations.filter(r => r.status === 'pending_payment').length;
    const newQuotes = adminQuotes.filter(q => q.status === 'pending').length;
    const ongoingTours = reservations.filter(r => r.status === 'confirmed').length;

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            {/* Sidebar */}
            <AdminSidebar
                activePage="dashboard"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">메인 대시보드</h1>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button className="p-2 text-slate-400 hover:text-teal-500 transition-colors">
                                <span className="material-symbols-outlined">notifications</span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                            </button>
                        </div>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">관리자님, 환영합니다</span>
                            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-500">
                                <span className="material-symbols-outlined">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-teal-500 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-teal-500/10 rounded-lg text-teal-500">
                                    <span className="material-symbols-outlined">add_task</span>
                                </div>
                                {todayReservations > 0 && (
                                    <span className="text-xs font-medium text-green-500 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">trending_up</span> +{todayReservations}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">오늘의 신규 예약</h3>
                            <p className="text-2xl font-bold mt-1">{todayReservations}건</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">미결제 예약 건수</h3>
                            <p className="text-2xl font-bold mt-1">{unpaidReservations}건</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-500 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <span className="material-symbols-outlined">request_quote</span>
                                </div>
                                {newQuotes > 0 && (
                                    <span className="text-xs font-medium text-blue-500 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">new_releases</span> 신규
                                    </span>
                                )}
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">신규 견적 요청</h3>
                            <p className="text-2xl font-bold mt-1">{newQuotes}건</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-indigo-500 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                                    <span className="material-symbols-outlined">explore</span>
                                </div>
                            </div>
                            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">진행 중인 투어</h3>
                            <p className="text-2xl font-bold mt-1">{ongoingTours}팀</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">


                            {/* Recent Reservations Table */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">실시간 예약 현황</h2>
                                    <button className="text-xs text-teal-500 font-medium hover:underline">전체 보기</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">예약 번호</th>
                                                <th className="px-6 py-3">고객명</th>
                                                <th className="px-6 py-3">상품명</th>
                                                <th className="px-6 py-3">상태</th>
                                                <th className="px-6 py-3">예약일</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                            {reservations.slice(0, 5).map((reservation) => {
                                                const statusConfig = {
                                                    confirmed: { label: '예약확정', class: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
                                                    pending_payment: { label: '결제대기', class: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
                                                    cancelled: { label: '취소', class: 'bg-slate-100 dark:bg-slate-800 text-slate-500' },
                                                    completed: { label: '완료', class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' }
                                                };
                                                const status = statusConfig[reservation.status] || statusConfig.pending_payment;

                                                return (
                                                    <tr key={reservation.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium">#{reservation.id.slice(0, 10)}</td>
                                                        <td className="px-6 py-4">{reservation.customerName}</td>
                                                        <td className="px-6 py-4">{reservation.productName}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${status.class}`}>
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500">
                                                            {reservation.createdAt ? new Date(reservation.createdAt).toLocaleDateString('ko-KR') : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {reservations.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                                                        예약 내역이 없습니다
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Notifications */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-teal-500">campaign</span>
                                    오늘의 알림
                                </h3>
                                <div className="space-y-4">
                                    {newQuotes > 0 && (
                                        <div className="flex gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0"></div>
                                            <div>
                                                <p className="text-sm font-medium">새로운 견적 요청 {newQuotes}건</p>
                                                <p className="text-[10px] text-slate-400 mt-1">확인 필요</p>
                                            </div>
                                        </div>
                                    )}
                                    {unpaidReservations > 0 && (
                                        <div className="flex gap-4 p-3 rounded-xl">
                                            <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 shrink-0"></div>
                                            <div>
                                                <p className="text-sm font-medium">결제 대기 중인 예약 {unpaidReservations}건</p>
                                                <p className="text-[10px] text-slate-400 mt-1">결제 확인 필요</p>
                                            </div>
                                        </div>
                                    )}
                                    {ongoingTours > 0 && (
                                        <div className="flex gap-4 p-3 rounded-xl">
                                            <div className="w-2 h-2 mt-1.5 rounded-full bg-teal-500 shrink-0"></div>
                                            <div>
                                                <p className="text-sm font-medium">진행 중인 투어 {ongoingTours}팀</p>
                                                <p className="text-[10px] text-slate-400 mt-1">현재 진행 중</p>
                                            </div>
                                        </div>
                                    )}
                                    {newQuotes === 0 && unpaidReservations === 0 && ongoingTours === 0 && (
                                        <div className="text-center py-8 text-slate-400 text-sm">
                                            새로운 알림이 없습니다
                                        </div>
                                    )}
                                </div>
                                <button className="w-full mt-6 py-2 text-xs font-bold text-slate-400 hover:text-teal-500 transition-colors border-t border-slate-100 dark:border-slate-800">모든 알림 보기</button>
                            </div>

                            {/* Guides Status */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-teal-500">groups</span>
                                        가이드 현황
                                    </div>
                                    <span className="text-xs font-normal text-slate-400">Total {guides.length}</span>
                                </h3>
                                <div className="space-y-4">
                                    {guides.slice(0, 4).map((guide) => {
                                        const statusConfig = {
                                            available: { label: '대기중', class: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
                                            busy: { label: '투어중', class: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' },
                                            off: { label: '휴무', class: 'bg-slate-100 dark:bg-slate-800 text-slate-400' }
                                        };
                                        const status = statusConfig[guide.status] || statusConfig.available;

                                        return (
                                            <div key={guide.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                                        {guide.image ? (
                                                            <img src={guide.image} alt={guide.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium">{guide.name}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${status.class}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {guides.length === 0 && (
                                        <div className="text-center py-8 text-slate-400 text-sm">
                                            등록된 가이드가 없습니다
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="mt-auto p-8 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
                    © 2024 Mongolia Travel Agency Admin Dashboard. All rights reserved.
                </footer>
            </main>

            <button className="fixed bottom-8 right-8 w-14 h-14 bg-teal-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-[90]">
                <span className="material-symbols-outlined text-2xl">add</span>
            </button>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 9999px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #334155;
                }
            `}</style>
        </div>
    );
};
