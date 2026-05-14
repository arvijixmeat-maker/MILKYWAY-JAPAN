import React, { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import koLocale from '@fullcalendar/core/locales/ko';
import { AdminLayout } from '../components/admin/AdminLayout';
import { api } from '../lib/api';
import '../styles/CalendarStyles.css';

type CalendarItemType = 'reservation' | 'quote';

interface CalendarItem {
    id: string;
    itemType: CalendarItemType;
    reservationNumber?: string;
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
    assignedGuide?: { name?: string; phone?: string; image?: string };
    dailyAccommodations?: unknown[];
    dateSource?: 'confirmed' | 'requested';
    requestedPeriod?: string;
}

const STATUS_LABEL: Record<string, string> = {
    new: '신규 견적',
    processing: '견적 작성 중',
    answered: '견적 발송 완료',
    reservation_requested: '예약 요청',
    converted: '예약 전환 완료',
    pending_payment: '입금 대기',
    paid: '결제 완료',
    confirmed: '예약 확정',
    cancelled: '취소',
};

const STATUS_TONE: Record<string, { bg: string; border: string; text: string }> = {
    new: { bg: '#fff1f2', border: '#fb7185', text: '#be123c' },
    processing: { bg: '#fff7ed', border: '#fb923c', text: '#c2410c' },
    answered: { bg: '#eff6ff', border: '#60a5fa', text: '#1d4ed8' },
    reservation_requested: { bg: '#f5f3ff', border: '#8b5cf6', text: '#6d28d9' },
    pending_payment: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' },
    paid: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
    confirmed: { bg: '#0f766e', border: '#0f766e', text: '#ffffff' },
};

const normalizeDate = (value: unknown): string => {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (trimmed.includes('.')) return trimmed.replace(/\./g, '-').replace(/\s/g, '');
    return trimmed;
};

const toDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (dateKey: string, days: number): string => {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toDateKey(date);
};

const parseDateRange = (period?: string): { startDate: string; endDate?: string } => {
    if (!period) return { startDate: '' };
    const matches = period.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g) || [];
    const normalized = matches.map(normalizeDate);
    return {
        startDate: normalized[0] || '',
        endDate: normalized[1] || normalized[0] || undefined,
    };
};

const parseMaybeJson = <T,>(value: unknown, fallback: T): T => {
    if (!value) return fallback;
    if (typeof value !== 'string') return value as T;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
};

const isInMonth = (item: CalendarItem, month: Date) => {
    if (!item.startDate) return false;
    const start = new Date(`${item.startDate}T00:00:00`);
    const end = new Date(`${item.endDate || item.startDate}T00:00:00`);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return start <= monthEnd && end >= monthStart;
};

const isOnDate = (item: CalendarItem, dateKey: string) => {
    if (!item.startDate) return false;
    const start = item.startDate;
    const end = item.endDate || item.startDate;
    return start <= dateKey && end >= dateKey;
};

const getItemTone = (item: CalendarItem) => {
    if (item.itemType === 'quote') return STATUS_TONE[item.status] || STATUS_TONE.processing;
    if ((item.status === 'confirmed' || item.status === 'paid') && !item.assignedGuide) {
        return { bg: '#fff7ed', border: '#f97316', text: '#c2410c' };
    }
    return STATUS_TONE[item.status] || STATUS_TONE.pending_payment;
};

const getNextAction = (item: CalendarItem): { label: string; tone: string; icon: string } => {
    if (item.itemType === 'quote') {
        if (item.status === 'new') return { label: '요청 검토', tone: 'text-rose-700 bg-rose-50 border-rose-200', icon: 'fiber_new' };
        if (item.status === 'processing') return { label: '견적 작성', tone: 'text-orange-700 bg-orange-50 border-orange-200', icon: 'edit_note' };
        if (item.status === 'answered') return { label: '고객 확인 대기', tone: 'text-blue-700 bg-blue-50 border-blue-200', icon: 'mark_email_read' };
        if (item.status === 'reservation_requested') return { label: '예약 전환', tone: 'text-purple-700 bg-purple-50 border-purple-200', icon: 'sync_alt' };
        return { label: '견적 관리', tone: 'text-slate-700 bg-slate-50 border-slate-200', icon: 'request_quote' };
    }

    if (item.status === 'pending_payment' || item.depositStatus !== 'paid') {
        return { label: '입금 확인', tone: 'text-amber-700 bg-amber-50 border-amber-200', icon: 'payments' };
    }
    if (!item.assignedGuide) {
        return { label: '가이드 배정', tone: 'text-orange-700 bg-orange-50 border-orange-200', icon: 'person_add' };
    }
    if (!item.dailyAccommodations || item.dailyAccommodations.length === 0) {
        return { label: '숙소 확인', tone: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: 'hotel' };
    }
    return { label: '운영 체크', tone: 'text-teal-700 bg-teal-50 border-teal-200', icon: 'task_alt' };
};

const formatRange = (item: CalendarItem) => {
    if (!item.startDate) return '일정 미정';
    return item.endDate && item.endDate !== item.startDate ? `${item.startDate} ~ ${item.endDate}` : item.startDate;
};

const StatCard = ({
    label,
    value,
    icon,
    tone,
}: {
    label: string;
    value: number;
    icon: string;
    tone: string;
}) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
            <span className={`material-symbols-outlined flex h-8 w-8 items-center justify-center rounded-lg text-[18px] ${tone}`}>
                {icon}
            </span>
        </div>
        <p className="text-2xl font-black text-slate-950 dark:text-white">
            {value}
            <span className="ml-1 text-sm font-semibold text-slate-400">건</span>
        </p>
    </div>
);

const ItemCard = ({ item, compact = false }: { item: CalendarItem; compact?: boolean }) => {
    const action = getNextAction(item);
    return (
        <a
            href="/admin/reservations"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${item.itemType === 'quote' ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-teal-200 bg-teal-50 text-teal-700'}`}>
                            {item.itemType === 'quote' ? '견적' : '예약'}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${action.tone}`}>
                            {action.label}
                        </span>
                    </div>
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">{item.productName}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.customerName || '고객명 미입력'} · {item.headcount || '인원 미정'}
                    </p>
                </div>
                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
            </div>
            {!compact && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                        <p className="font-bold text-slate-400">일정</p>
                        <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{formatRange(item)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                        <p className="font-bold text-slate-400">담당</p>
                        <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{item.assignedGuide?.name || '미배정'}</p>
                    </div>
                </div>
            )}
        </a>
    );
};

const CalendarDetailModal = ({ item, onClose }: { item: CalendarItem | null; onClose: () => void }) => {
    if (!item) return null;
    const action = getNextAction(item);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label="닫기" />
            <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${item.itemType === 'quote' ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-teal-200 bg-teal-50 text-teal-700'}`}>
                                    {item.itemType === 'quote' ? '맞춤 견적' : '예약'}
                                </span>
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${action.tone}`}>
                                    {STATUS_LABEL[item.status] || item.status}
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-slate-950 dark:text-white">{item.productName}</h2>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                                No. {item.reservationNumber || item.id.slice(0, 8).toUpperCase()}
                            </p>
                        </div>
                        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4 overflow-y-auto p-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-bold text-slate-400">고객</p>
                                <p className="mt-1 font-bold text-slate-900 dark:text-white">{item.customerName || '미입력'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400">연락처</p>
                                <p className="mt-1 font-bold text-slate-900 dark:text-white">{item.phone || item.email || '미입력'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400">일정</p>
                                <p className="mt-1 font-bold text-slate-900 dark:text-white">{formatRange(item)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400">인원</p>
                                <p className="mt-1 font-bold text-slate-900 dark:text-white">{item.headcount || '미정'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400">금액</p>
                            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                                {(item.totalAmount || 0).toLocaleString()} 엔
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400">다음 처리</p>
                            <p className="mt-2 flex items-center gap-1 text-sm font-black text-slate-950 dark:text-white">
                                <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
                                {action.label}
                            </p>
                        </div>
                    </div>

                    {item.itemType === 'quote' && (
                        <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-900 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-200">
                            <p className="font-black">견적 처리 포인트</p>
                            <p className="mt-1 text-xs leading-5">
                                이 일정은 아직 확정 예약이 아닙니다. 캘린더에서 다른 확정 일정과 겹치는지 확인한 뒤 견적 금액, 안내문, 견적서 링크를 입력하면 됩니다.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <button onClick={onClose} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200">
                        닫기
                    </button>
                    <a href="/admin/reservations" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700">
                        통합 관리로 이동
                    </a>
                </div>
            </div>
        </div>
    );
};

export const AdminCalendar: React.FC = () => {
    const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
    const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [items, setItems] = useState<CalendarItem[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
        document.documentElement.classList.toggle('dark');
    };

    const fetchCalendarItems = async () => {
        setIsLoading(true);
        try {
            const [reservationSettled, quoteSettled] = await Promise.allSettled([
                api.reservations.list(),
                api.quotes.list(),
            ]);

            const reservationData = reservationSettled.status === 'fulfilled' && Array.isArray(reservationSettled.value)
                ? reservationSettled.value
                : [];
            const quoteData = quoteSettled.status === 'fulfilled' && Array.isArray(quoteSettled.value)
                ? quoteSettled.value
                : [];

            const mappedReservations: CalendarItem[] = reservationData
                .filter((reservation: any) => reservation.status !== 'cancelled')
                .map((reservation: any) => {
                    const totalAmount = reservation.totalAmount || reservation.total_amount || reservation.totalPrice || reservation.price_breakdown?.total || 0;
                    const deposit = reservation.deposit || reservation.depositAmount || reservation.deposit_amount || reservation.price_breakdown?.deposit || 0;
                    const assignedGuide = parseMaybeJson(reservation.assignedGuide || reservation.assigned_guide, undefined);
                    return {
                        id: reservation.id,
                        itemType: 'reservation',
                        reservationNumber: reservation.reservationNumber || reservation.reservation_number,
                        productName: reservation.productName || reservation.product_name || '상품명 없음',
                        customerName: reservation.customerName || reservation.customer_name || reservation.customer_info?.name || '고객명 없음',
                        startDate: normalizeDate(reservation.startDate || reservation.start_date || reservation.date),
                        endDate: normalizeDate(reservation.endDate || reservation.end_date),
                        status: reservation.status || 'pending_payment',
                        totalAmount,
                        deposit,
                        depositStatus: reservation.depositStatus || reservation.deposit_status || (reservation.status === 'pending_payment' ? 'unpaid' : 'paid'),
                        balance: reservation.balance || reservation.balanceAmount || reservation.balance_amount || Math.max(totalAmount - deposit, 0),
                        balanceStatus: reservation.balanceStatus || reservation.balance_status || 'unpaid',
                        headcount: reservation.headcount || (reservation.totalPeople || reservation.total_people ? `${reservation.totalPeople || reservation.total_people}명` : '인원 미정'),
                        phone: reservation.phone || reservation.customerPhone || reservation.customer_phone || reservation.customer_info?.phone || '',
                        email: reservation.email || reservation.customerEmail || reservation.customer_email || reservation.customer_info?.email || '',
                        assignedGuide,
                        dailyAccommodations: parseMaybeJson(reservation.dailyAccommodations || reservation.daily_accommodations, []),
                        dateSource: 'confirmed',
                    };
                });

            const mappedQuotes: CalendarItem[] = quoteData
                .filter((quote: any) => quote.status !== 'converted' && quote.status !== 'cancelled')
                .map((quote: any) => {
                    const requestedRange = parseDateRange(quote.period);
                    const confirmedStart = normalizeDate(quote.confirmed_start_date || quote.confirmedStartDate);
                    const confirmedEnd = normalizeDate(quote.confirmed_end_date || quote.confirmedEndDate);
                    const startDate = confirmedStart || requestedRange.startDate;
                    const endDate = confirmedEnd || requestedRange.endDate;
                    const confirmedPrice = quote.confirmedPrice || quote.confirmed_price || 0;
                    const deposit = quote.deposit || 0;
                    return {
                        id: quote.id,
                        itemType: 'quote',
                        productName: `${quote.destination || '맞춤 여행'} 맞춤 견적`,
                        customerName: quote.name || '고객명 없음',
                        startDate,
                        endDate,
                        status: quote.status || 'new',
                        totalAmount: confirmedPrice,
                        deposit,
                        depositStatus: quote.deposit_status || quote.depositStatus || 'unpaid',
                        balance: Math.max(confirmedPrice - deposit, 0),
                        balanceStatus: quote.balance_status || quote.balanceStatus || 'unpaid',
                        headcount: quote.headcount || '인원 미정',
                        phone: quote.phone || '',
                        email: quote.email || '',
                        dateSource: confirmedStart ? 'confirmed' : 'requested',
                        requestedPeriod: quote.period,
                    };
                });

            setItems([...mappedReservations, ...mappedQuotes].filter(item => item.startDate));
        } catch (error) {
            console.error('Calendar fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendarItems();
    }, []);

    const monthItems = useMemo(() => items.filter(item => isInMonth(item, currentMonth)), [items, currentMonth]);

    const monthStats = useMemo(() => ({
        total: monthItems.length,
        quotes: monthItems.filter(item => item.itemType === 'quote').length,
        confirmed: monthItems.filter(item => item.itemType === 'reservation' && ['confirmed', 'paid'].includes(item.status)).length,
        needsAction: monthItems.filter(item => {
            if (item.itemType === 'quote') return ['new', 'processing', 'reservation_requested'].includes(item.status);
            return item.status === 'pending_payment' || !item.assignedGuide;
        }).length,
    }), [monthItems]);

    const selectedDateItems = useMemo(
        () => items.filter(item => isOnDate(item, selectedDate)).sort((a, b) => a.itemType.localeCompare(b.itemType)),
        [items, selectedDate],
    );

    const actionItems = useMemo(
        () => monthItems
            .filter(item => {
                if (item.itemType === 'quote') return ['new', 'processing', 'reservation_requested'].includes(item.status);
                return item.status === 'pending_payment' || !item.assignedGuide;
            })
            .slice(0, 5),
        [monthItems],
    );

    const calendarEvents: EventInput[] = items.map(item => {
        const tone = getItemTone(item);
        return {
            id: item.id,
            title: `${item.itemType === 'quote' ? '견적' : '예약'} · ${item.customerName}`,
            start: item.startDate,
            end: item.endDate ? addDays(item.endDate, 1) : undefined,
            backgroundColor: tone.bg,
            borderColor: tone.border,
            textColor: tone.text,
            extendedProps: item,
        };
    });

    const handleEventClick = (info: EventClickArg) => {
        setSelectedEvent(info.event.extendedProps as CalendarItem);
    };

    const handleDateClick = (arg: DateClickArg) => {
        setSelectedDate(arg.dateStr);
    };

    const handleDatesSet = (arg: DatesSetArg) => {
        setCurrentMonth(arg.view.currentStart);
    };

    return (
        <AdminLayout
            activePage="calendar"
            title="투어 캘린더"
            description="확정 예약과 맞춤 견적 요청을 날짜 기준으로 함께 확인합니다."
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            actions={(
                <button
                    onClick={fetchCalendarItems}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                    <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                    새로고침
                </button>
            )}
        >
            <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="이번 달 전체" value={monthStats.total} icon="event_note" tone="bg-slate-100 text-slate-600" />
                    <StatCard label="견적 일정" value={monthStats.quotes} icon="request_quote" tone="bg-purple-50 text-purple-600" />
                    <StatCard label="확정/결제 예약" value={monthStats.confirmed} icon="verified" tone="bg-teal-50 text-teal-600" />
                    <StatCard label="처리 필요" value={monthStats.needsAction} icon="priority_high" tone="bg-orange-50 text-orange-600" />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span className="mr-1 text-slate-800 dark:text-slate-100">표시 기준</span>
                        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-purple-100 ring-1 ring-purple-300" />견적중</span>
                        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-teal-600" />예약 확정</span>
                        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-100 ring-1 ring-blue-300" />결제 완료</span>
                        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300" />입금 대기</span>
                        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-orange-100 ring-1 ring-orange-300" />가이드 미배정</span>
                    </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" style={{ minHeight: '690px' }}>
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            locale={koLocale}
                            events={calendarEvents}
                            eventClick={handleEventClick}
                            dateClick={handleDateClick}
                            datesSet={handleDatesSet}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek',
                            }}
                            buttonText={{
                                today: '오늘',
                                month: '월',
                                week: '주',
                            }}
                            height="100%"
                            eventDisplay="block"
                            dayMaxEvents={4}
                            eventDidMount={(info) => {
                                const item = info.event.extendedProps as CalendarItem;
                                info.el.title = `${item.customerName} | ${item.productName} | ${STATUS_LABEL[item.status] || item.status} | ${getNextAction(item).label}`;
                            }}
                        />
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-teal-600">Selected Date</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{selectedDate}</h2>
                                </div>
                                <span className="material-symbols-outlined text-slate-300">calendar_month</span>
                            </div>
                            <div className="space-y-3">
                                {selectedDateItems.length > 0 ? (
                                    selectedDateItems.map(item => <ItemCard key={`${item.itemType}-${item.id}`} item={item} compact />)
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                                        <span className="material-symbols-outlined text-3xl text-slate-300">event_busy</span>
                                        <p className="mt-2 text-sm font-bold text-slate-500">이 날짜에는 일정이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-orange-600">Needs Action</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">이번 달 처리 목록</h2>
                                </div>
                                <span className="material-symbols-outlined text-orange-300">notification_important</span>
                            </div>
                            <div className="space-y-3">
                                {actionItems.length > 0 ? (
                                    actionItems.map(item => <ItemCard key={`action-${item.itemType}-${item.id}`} item={item} compact />)
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                                        <span className="material-symbols-outlined text-3xl text-slate-300">task_alt</span>
                                        <p className="mt-2 text-sm font-bold text-slate-500">현재 처리할 항목이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <CalendarDetailModal item={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </AdminLayout>
    );
};
