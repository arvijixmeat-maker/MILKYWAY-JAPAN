import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';
import koLocale from '@fullcalendar/core/locales/ko';
import '../styles/CalendarStyles.css';

// Reservation Interface
interface Reservation {
    id: string;
    type: 'product' | 'quote';
    productName: string;
    customerName: string;
    date: string;
    bookedAt: string;
    status: 'pending_payment' | 'paid' | 'confirmed' | 'cancelled';

    totalAmount: number;
    deposit: number;
    depositStatus: 'unpaid' | 'paid';
    balance: number;
    balanceStatus: 'unpaid' | 'paid';

    contractUrl?: string;
    itineraryUrl?: string;

    headcount: string;
    phone: string;
    email: string;

    assignedGuide?: {
        name: string;
        phone: string;
        image: string;
    };
    dailyAccommodations?: any[];
    endDate?: string;
}

const ReservationDetailModal = ({ reservation, onClose }: { reservation: Reservation | null, onClose: () => void }) => {
    if (!reservation) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-gray-100 font-sans">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${reservation.type === 'product' ? 'bg-indigo-500' : 'bg-purple-500'}`}></div>
                        <div>
                            <h2 className="text-xl font-bold">예약 상세 정보</h2>
                            <p className="text-sm text-slate-500 font-medium">No. {reservation.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">payments</span>
                                결제 정보 확인
                            </h3>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold">
                                    <tr>
                                        <th className="px-4 py-3">항목</th>
                                        <th className="px-4 py-3 text-right">금액</th>
                                        <th className="px-4 py-3 text-center">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    <tr>
                                        <td className="px-4 py-3 font-medium">총 상품 금액</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">
                                            {typeof reservation.totalAmount === 'number' && !isNaN(reservation.totalAmount) ? reservation.totalAmount.toLocaleString() : 0}원
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {reservation.status === 'paid' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">전액완납</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">미납/진행중</span>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                                            예약금 (Deposit)
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-teal-600">
                                            {typeof reservation.deposit === 'number' && !isNaN(reservation.deposit) ? reservation.deposit.toLocaleString() : 0}원
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {reservation.depositStatus === 'paid' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-700">완납</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">미납</span>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            잔금 (Balance)
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-blue-600">
                                            {typeof reservation.balance === 'number' && !isNaN(reservation.balance) ? reservation.balance.toLocaleString() : 0}원
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {reservation.balanceStatus === 'paid' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">완납</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">미납</span>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">info</span>
                            기본 정보
                        </h3>
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500 text-xs">상품명</span>
                                <span className="font-bold text-sm">{reservation.productName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 text-xs">고객명</span>
                                <span className="font-bold text-sm">{reservation.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 text-xs">연락처</span>
                                <span className="text-sm">{reservation.phone}</span>
                            </div>
                            {reservation.assignedGuide && (
                                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-600 mt-2">
                                    <span className="text-slate-500 text-xs">담당 가이드</span>
                                    <span className="font-bold text-sm text-teal-600">{reservation.assignedGuide.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors text-sm"
                    >
                        닫기
                    </button>
                    <a href="/admin/reservations" className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold transition-colors text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined">edit</span>
                        예약 관리에서 수정
                    </a>
                </div>
            </div>
        </div>
    );
};

export const AdminCalendar: React.FC = () => {
    const [selectedEvent, setSelectedEvent] = useState<Reservation | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [events, setEvents] = useState<Reservation[]>([]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    const fetchEvents = async () => {
        try {
            const data = await api.reservations.list();

            if (Array.isArray(data)) {
                const filtered = data.filter((res: any) => res.status === 'confirmed' || res.status === 'paid');
                const mappedEvents: Reservation[] = filtered.map((res: any) => ({
                    id: res.id,
                    type: res.type || 'product',
                    productName: res.product_name,
                    customerName: res.customer_info?.name || res.customer_name || 'Unknown',
                    date: res.start_date || res.date,
                    endDate: res.end_date,
                    bookedAt: res.created_at,
                    status: res.status,
                    totalAmount: res.total_amount || res.price_breakdown?.total || 0,
                    deposit: res.deposit_amount || res.price_breakdown?.deposit || 0,
                    depositStatus: res.deposit_status || (res.status === 'pending_payment' ? 'unpaid' : 'paid'),
                    balance: (res.total_amount || res.price_breakdown?.total || 0) - (res.deposit_amount || res.price_breakdown?.deposit || 0),
                    balanceStatus: res.balance_status || 'unpaid',
                    headcount: res.headcount || (res.total_people ? `총 ${res.total_people}명` : '미정'),
                    phone: res.customer_info?.phone || res.customer_phone || '',
                    email: res.customer_info?.email || res.customer_email || '',
                    assignedGuide: res.assigned_guide,
                    dailyAccommodations: res.daily_accommodations
                }));
                setEvents(mappedEvents);
            }
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const calendarEvents = events.map(event => {
        let start = event.date;
        let end = event.endDate;

        // Helper to normalize date to YYYY-MM-DD
        const normalizeDate = (dateStr: string | undefined): string | undefined => {
            if (!dateStr) return undefined;
            // If ISO string (contains T), extract YYYY-MM-DD
            if (dateStr.includes('T')) {
                return dateStr.split('T')[0];
            }
            // If dot format (YYYY.MM.DD), convert to YYYY-MM-DD
            if (dateStr.includes('.')) {
                return dateStr.replace(/\./g, '-');
            }
            return dateStr;
        };

        start = normalizeDate(start) || '';
        end = normalizeDate(end) || undefined;

        // Adjust end date for FullCalendar (exclusive) to include the last day
        if (end) {
            const endDateObj = new Date(end);
            endDateObj.setDate(endDateObj.getDate() + 1);
            end = endDateObj.toISOString().split('T')[0];
        }

        const isUnassigned = !event.assignedGuide;
        const guideName = event.assignedGuide ? event.assignedGuide.name : '미배정';

        // Visual Logic
        let backgroundColor, borderColor, textColor;

        if (isUnassigned && (event.status === 'confirmed' || event.status === 'paid')) {
            // Unassigned Warning Style (Red/Orange) - Critical for Confirmed logic
            backgroundColor = '#fff7ed'; // orange-50
            borderColor = '#f97316'; // orange-500
            textColor = '#c2410c'; // orange-700
        } else if (event.status === 'pending_payment') {
            // Pending Payment (Amber/Yellow)
            backgroundColor = '#fffbeb'; // amber-50
            borderColor = '#f59e0b'; // amber-500
            textColor = '#b45309'; // amber-700
        } else {
            // Normal Style based on status
            backgroundColor = event.status === 'confirmed' ? '#14b8a6' : (event.status === 'paid' ? '#3b82f6' : '#6366f1');
            borderColor = event.status === 'confirmed' ? '#0d9488' : (event.status === 'paid' ? '#2563eb' : '#4f46e5');
            textColor = '#ffffff';
        }

        return {
            id: event.id,
            title: `[${guideName}] ${event.customerName} (${event.productName})`,
            start: start,
            end: end ? end : undefined,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            textColor: textColor,
            classNames: isUnassigned ? ['unassigned-event'] : [],
            extendedProps: {
                ...event,
                description: `담당 가이드: ${guideName} / 인원: ${event.headcount}`
            }
        };
    });

    const handleEventClick = (clickInfo: EventClickArg) => {
        setSelectedEvent(clickInfo.event.extendedProps as Reservation);
    };

    const handleEventDidMount = (info: any) => {
        // Native tooltip
        info.el.title = info.event.extendedProps.description || info.event.title;
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            <AdminSidebar
                activePage="calendar"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold">투어 일정 캘린더</h1>
                </header>

                <div className="p-8 h-[calc(100vh-64px)] overflow-hidden">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 shadow-sm h-full p-4">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            locale={koLocale}
                            events={calendarEvents}
                            eventClick={handleEventClick}
                            eventDidMount={handleEventDidMount}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek'
                            }}
                            height="100%"
                        />
                    </div>
                </div>
            </main>

            {selectedEvent && (
                <ReservationDetailModal
                    reservation={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </div>
    );
};
