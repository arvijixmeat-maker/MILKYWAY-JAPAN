import React, { useState, useEffect, useMemo } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import koLocale from '@fullcalendar/core/locales/ko';
import '../styles/CalendarStyles.css';

interface Reservation {
    id: string;
    reservationNumber?: string;
    type: string;
    productName: string;
    customerName: string;
    startDate: string;
    endDate?: string;
    status: string;
    totalAmount: number;
    deposit: number;
    depositStatus: string;
    balance: number;
    balanceStatus: string;
    headcount: string;
    phone: string;
    email: string;
    assignedGuide?: { name: string; phone: string; image: string };
    dailyAccommodations?: any[];
}

const STATUS_LABEL: Record<string, string> = {
    pending_payment: '입금대기',
    paid: '결제완료',
    confirmed: '예약확정',
    cancelled: '취소',
};

const ReservationDetailModal = ({ reservation, onClose }: { reservation: Reservation | null; onClose: () => void }) => {
    if (!reservation) return null;
    const isUnassigned = !reservation.assignedGuide;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${reservation.type !== 'quote' ? 'bg-indigo-500' : 'bg-purple-500'}`} />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">예약 상세</h2>
                            <p className="text-xs text-slate-400">No. {reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            reservation.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
                            reservation.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                            reservation.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                            {STATUS_LABEL[reservation.status] || reservation.status}
                        </span>
                        {isUnassigned && reservation.status !== 'cancelled' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">가이드 미배정</span>
                        )}
                    </div>

                    {/* Basic Info */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">상품명</span>
                            <span className="font-bold text-slate-800 dark:text-white">{reservation.productName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">고객명</span>
                            <span className="font-semibold">{reservation.customerName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">연락처</span>
                            <span>{reservation.phone}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">인원</span>
                            <span>{reservation.headcount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">일정</span>
                            <span className="font-semibold">
                                {reservation.startDate}
                                {reservation.endDate ? ` ~ ${reservation.endDate}` : ''}
                            </span>
                        </div>
                        {reservation.assignedGuide && (
                            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-600">
                                <span className="text-slate-500">담당 가이드</span>
                                <span className="font-bold text-teal-600">{reservation.assignedGuide.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Payment */}
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">총 금액</span>
                            <span className="font-bold">{(reservation.totalAmount || 0).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">예약금</span>
                            <span className={`font-semibold ${reservation.depositStatus === 'paid' ? 'text-teal-600' : 'text-amber-600'}`}>
                                {(reservation.deposit || 0).toLocaleString()}원
                                <span className="ml-1 text-xs">({reservation.depositStatus === 'paid' ? '납부' : '미납'})</span>
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">잔금</span>
                            <span className={`font-semibold ${reservation.balanceStatus === 'paid' ? 'text-blue-600' : 'text-slate-400'}`}>
                                {(reservation.balance || 0).toLocaleString()}원
                                <span className="ml-1 text-xs">({reservation.balanceStatus === 'paid' ? '납부' : '미납'})</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition-colors">
                        닫기
                    </button>
                    <a href="/admin/reservations" className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm flex items-center gap-1 transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                        예약 관리
                    </a>
                </div>
            </div>
        </div>
    );
};

const normalizeDate = (d: string | undefined): string => {
    if (!d) return '';
    if (d.includes('T')) return d.split('T')[0];
    if (d.includes('.')) return d.replace(/\./g, '-');
    return d;
};

export const AdminCalendar: React.FC = () => {
    const [selectedEvent, setSelectedEvent] = useState<Reservation | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    const fetchReservations = async () => {
        try {
            const data = await api.reservations.list();
            if (!Array.isArray(data)) return;

            const mapped: Reservation[] = data
                .filter((r: any) => r.status !== 'cancelled')
                .map((r: any) => ({
                    id: r.id,
                    reservationNumber: r.reservationNumber || r.reservation_number,
                    type: r.type || 'tour',
                    productName: r.productName || r.product_name || '상품명 없음',
                    customerName: r.customerName || r.customer_name || r.customer_info?.name || '고객명 없음',
                    startDate: normalizeDate(r.startDate || r.start_date || r.date),
                    endDate: normalizeDate(r.endDate || r.end_date),
                    status: r.status,
                    totalAmount: r.totalAmount || r.total_amount || r.totalPrice || 0,
                    deposit: r.deposit || r.depositAmount || r.deposit_amount || 0,
                    depositStatus: r.depositStatus || r.deposit_status || 'unpaid',
                    balance: r.balance || r.balanceAmount || r.balance_amount || 0,
                    balanceStatus: r.balanceStatus || r.balance_status || 'unpaid',
                    headcount: r.headcount || (r.totalPeople ? `${r.totalPeople}명` : '미정'),
                    phone: r.phone || r.customerPhone || r.customer_phone || r.customer_info?.phone || '',
                    email: r.email || r.customerEmail || r.customer_email || '',
                    assignedGuide: r.assignedGuide || r.assigned_guide,
                    dailyAccommodations: r.dailyAccommodations || r.daily_accommodations,
                }));
            setReservations(mapped);
        } catch (e) {
            console.error('Calendar fetch error:', e);
        }
    };

    useEffect(() => { fetchReservations(); }, []);

    // Stats for current month
    const monthStats = useMemo(() => {
        const y = currentMonth.getFullYear();
        const m = currentMonth.getMonth();
        const inMonth = reservations.filter(r => {
            if (!r.startDate) return false;
            const d = new Date(r.startDate);
            return d.getFullYear() === y && d.getMonth() === m;
        });
        return {
            total: inMonth.length,
            confirmed: inMonth.filter(r => r.status === 'confirmed').length,
            pending: inMonth.filter(r => r.status === 'pending_payment').length,
            unassigned: inMonth.filter(r => !r.assignedGuide).length,
        };
    }, [reservations, currentMonth]);

    const calendarEvents = reservations
        .filter(r => r.startDate)
        .map(r => {
            let end = r.endDate;
            if (end) {
                const d = new Date(end);
                d.setDate(d.getDate() + 1);
                end = d.toISOString().split('T')[0];
            }

            const isUnassigned = !r.assignedGuide;
            let bg, border, text;

            if (r.status === 'confirmed' && isUnassigned) {
                bg = '#fff7ed'; border = '#f97316'; text = '#c2410c'; // 오렌지 - 확정+미배정 경고
            } else if (r.status === 'confirmed') {
                bg = '#0d9488'; border = '#0f766e'; text = '#ffffff'; // 초록 - 확정
            } else if (r.status === 'paid') {
                bg = '#3b82f6'; border = '#2563eb'; text = '#ffffff'; // 파랑 - 결제완료
            } else {
                bg = '#f59e0b'; border = '#d97706'; text = '#ffffff'; // 노랑 - 입금대기
            }

            const guideName = r.assignedGuide?.name || '미배정';
            return {
                id: r.id,
                title: `${r.customerName} · ${r.productName}`,
                start: r.startDate,
                end: end || undefined,
                backgroundColor: bg,
                borderColor: border,
                textColor: text,
                extendedProps: { ...r, guideName },
            };
        });

    const handleEventClick = (info: EventClickArg) => {
        setSelectedEvent(info.event.extendedProps as Reservation);
    };

    const handleDatesSet = (arg: DatesSetArg) => {
        setCurrentMonth(arg.view.currentStart);
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            <AdminSidebar activePage="calendar" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold">투어 일정 캘린더</h1>
                    <button onClick={fetchReservations} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-base">refresh</span>
                        새로고침
                    </button>
                </header>

                <div className="px-8 pt-5 pb-2 grid grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs text-slate-400 mb-1">이번 달 전체</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{monthStats.total}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs text-slate-400 mb-1">예약 확정</p>
                        <p className="text-2xl font-bold text-teal-600">{monthStats.confirmed}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs text-slate-400 mb-1">입금 대기</p>
                        <p className="text-2xl font-bold text-amber-500">{monthStats.pending}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
                    </div>
                    <div className={`rounded-xl border p-4 ${monthStats.unassigned > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <p className="text-xs text-slate-400 mb-1">가이드 미배정</p>
                        <p className={`text-2xl font-bold ${monthStats.unassigned > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                            {monthStats.unassigned}<span className="text-sm font-normal text-slate-400 ml-1">건</span>
                        </p>
                    </div>
                </div>

                {/* Legend */}
                <div className="px-8 pb-3 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />예약 확정</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />결제 완료</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />입금 대기</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" />확정+가이드 미배정</div>
                </div>

                <div className="px-8 pb-8 flex-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-full p-4" style={{ minHeight: 'calc(100vh - 260px)' }}>
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            locale={koLocale}
                            events={calendarEvents}
                            eventClick={handleEventClick}
                            datesSet={handleDatesSet}
                            eventDidMount={(info) => {
                                const r = info.event.extendedProps as any;
                                info.el.title = `${r.customerName} | ${r.productName} | 가이드: ${r.guideName} | ${STATUS_LABEL[r.status] || r.status}`;
                            }}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek',
                            }}
                            height="100%"
                            eventDisplay="block"
                            dayMaxEvents={4}
                        />
                    </div>
                </div>
            </main>

            {selectedEvent && (
                <ReservationDetailModal reservation={selectedEvent} onClose={() => setSelectedEvent(null)} />
            )}
        </div>
    );
};