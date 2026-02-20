import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { sendNotificationEmail } from '../lib/email';
import type { QuoteRequest } from '../components/admin/QuoteModals';
import { QuoteDetailModal, ConvertSelectionModal } from '../components/admin/QuoteModals';
import { GuideSelectionModal, AccommodationSelectionModal } from '../components/admin/SelectionModals';



// Local Modal definitions removed in favor of centralized QuoteModals.tsx


export const AdminQuoteManage: React.FC = () => {
    const navigate = useNavigate();
    const [isDarkMode, setIsDarkMode] = useState(false);
    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('전체 상태');
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    // Modal State
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

    // Data State
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch quotes from Supabase
    const fetchQuotes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('quotes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching quotes:', error);
        } else if (data) {
            // Map snake_case to camelCase
            const mappedQuotes = data.map(q => ({
                ...q,
                travelTypes: q.travel_types || [],
                accommodations: q.accommodations || [],
                additionalRequest: q.additional_request,
                adminNote: q.admin_note,
                estimateUrl: q.estimate_url,
                attachmentUrl: q.attachment_url, // Map from DB
                createdAt: q.created_at,
                userId: q.user_id,
                // Make sure date format matches UI expectations (YYYY-MM-DD)
                date: new Date(q.created_at).toLocaleDateString()
            }));
            setRequests(mappedQuotes);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    // Handle Status Change
    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('quotes')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            // Reflect in local state
            setRequests(prev => prev.map(req =>
                req.id === id ? { ...req, status: newStatus } : req
            ));

        } catch (error) {
            console.error("Failed to update status:", error);
            alert("상태 변경 중 오류가 발생했습니다.");
        }
    };

    // Filter Logic
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesSearch = req.name.includes(searchTerm) || req.destination.includes(searchTerm);
            const matchesStatus = filterStatus === '전체 상태' ||
                (filterStatus === '답변 대기' && req.status === 'new') ||
                (filterStatus === '상담 중' && req.status === 'processing') ||
                (filterStatus === '답변 완료' && req.status === 'answered') ||
                (filterStatus === '예약 전환' && req.status === 'converted') ||
                (filterStatus === '예약 요청' && req.status === 'reservation_requested');

            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, filterStatus, requests]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const displayedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats Logic
    const stats = useMemo(() => {
        return {
            total: requests.length,
            new: requests.filter(r => r.status === 'new').length,
            completed: requests.filter(r => r.status === 'answered' || r.status === 'converted').length
        };
    }, [requests]);

    // Get bank account settings (Hardcoded for now or fetch from Supabase later)
    const bankAccount = {
        bankName: '국민은행',
        accountNumber: '1234-56-7890',
        accountHolder: '몽골리아 은하수'
    };

    const handleConvertToReservation = async (data: { startDate: string; endDate: string; totalAmount: number; deposit: number }) => {
        if (!selectedRequest) return;

        try {
            // Calculate Duration (Nights & Days)
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const durationText = `${diffDays}박 ${diffDays + 1}일`;

            // 1. Create New Reservation Object in Supabase
            // Using only the most basic columns that definitely exist
            const { data: newReservation, error: insertError } = await supabase
                .from('reservations')
                .insert({
                    user_id: selectedRequest.userId || null,
                    type: 'quote', // Explicitly set type
                    product_name: `${selectedRequest.destination} 맞춤 견적`,
                    customer_name: selectedRequest.name,
                    customer_phone: selectedRequest.phone,
                    customer_email: selectedRequest.email,
                    total_people: selectedRequest.headcount,
                    start_date: data.startDate,
                    end_date: data.endDate,
                    status: 'pending',
                    price_breakdown: {
                        total: data.totalAmount,
                        deposit: data.deposit,
                        local: data.totalAmount - data.deposit
                    },
                    bank_account: {
                        bankName: '국민은행',
                        accountNumber: '123-456-789012',
                        accountHolder: '밀키웨이투어'
                    }
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 2. Update Quote Status to 'converted' AND sync final prices
            const requestId = selectedRequest.id;

            // Update Admin Storage
            const { error: updateError } = await supabase
                .from('quotes')
                .update({
                    status: 'converted',
                    confirmed_price: data.totalAmount,
                    deposit: data.deposit,
                    confirmed_start_date: data.startDate,
                    confirmed_end_date: data.endDate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Reflect in local state
            setRequests(prev => prev.map(req =>
                req.id === requestId ? { ...req, status: 'converted' } : req
            ));

            // 4. Close Modals & Notify
            setIsConvertModalOpen(false);
            setSelectedRequest(null);

            if (confirm('예약이 성공적으로 생성되었습니다!\n[예약 관리] 페이지로 이동하여 확인하시겠습니까?')) {
                navigate('/admin/reservations');
            }

        } catch (error: any) {
            console.error("Failed to convert reservation:", error);
            alert(`예약 변환 중 오류가 발생했습니다: ${error.message || error}`);
        }
    };

    const handleSendEstimate = async (url: string, note: string, priceDetail: any, confirmedStartDate: string, confirmedEndDate: string) => {
        if (!selectedRequest) return;
        const requestId = selectedRequest.id;

        try {
            // Update Supabase with confirmed values
            const { error } = await supabase
                .from('quotes')
                .update({
                    status: 'answered',
                    admin_note: note,
                    estimate_url: url,
                    confirmed_price: priceDetail.totalAmount || null,
                    deposit: priceDetail.deposit || null,
                    confirmed_start_date: confirmedStartDate || null,
                    confirmed_end_date: confirmedEndDate || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (error) throw error;

            // 2. Send email notification via Gmail SMTP
            try {
                await sendNotificationEmail(
                    selectedRequest.email,
                    'ESTIMATE_COMPLETED',
                    {
                        customerName: selectedRequest.name,
                        destination: selectedRequest.destination,
                        estimateUrl: url,
                        adminNote: note
                    }
                );
                console.log('Notification email sent successfully');
            } catch (emailError) {
                console.error('Failed to send notification email:', emailError);
            }

            alert(`견적서 발송 완료!\nURL: ${url}\n확정 금액: ${priceDetail.totalAmount ? priceDetail.totalAmount.toLocaleString() + '원' : '미입력'}\n(고객에게 Gmail 알림이 발송되었습니다)`);

            // Reflect in local state
            setRequests(prev => prev.map(req =>
                req.id === requestId ? {
                    ...req,
                    status: 'answered',
                    adminNote: note,
                    estimateUrl: url,
                    confirmed_price: priceDetail.totalAmount || undefined,
                    deposit: priceDetail.deposit || undefined,
                    confirmed_start_date: confirmedStartDate || undefined,
                    confirmed_end_date: confirmedEndDate || undefined
                } : req
            ));

            setSelectedRequest(null);
        } catch (error) {
            console.error("Failed to send estimate:", error);
            alert("견적서 발송 처리 중 오류가 발생했습니다.");
        }
    };

    const handleUpdateQuote = async (id: string, updates: Partial<QuoteRequest>) => {
        try {
            // Map camelCase to snake_case for DB
            const dbUpdates: any = {};
            if (updates.destination) dbUpdates.destination = updates.destination;
            if (updates.headcount) dbUpdates.headcount = updates.headcount;
            if (updates.period) dbUpdates.period = updates.period;
            if (updates.budget) dbUpdates.budget = updates.budget;

            // If we support other fields later, map them here
            if (updates.travelTypes) dbUpdates.travel_types = updates.travelTypes;
            if (updates.accommodations) dbUpdates.accommodations = updates.accommodations;
            if (updates.vehicle) dbUpdates.vehicle = updates.vehicle;
            if (updates.confirmed_price !== undefined) dbUpdates.confirmed_price = updates.confirmed_price;
            if (updates.deposit !== undefined) dbUpdates.deposit = updates.deposit;

            dbUpdates.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('quotes')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setRequests(prev => prev.map(req =>
                req.id === id ? { ...req, ...updates } : req
            ));

            // Also update selectedRequest if it's the same
            if (selectedRequest && selectedRequest.id === id) {
                setSelectedRequest(prev => ({ ...prev, ...updates }));
            }

            // alert('정보가 수정되었습니다.'); // Optional: feedback

        } catch (error) {
            console.error("Failed to update quote:", error);
            alert("정보 수정 중 오류가 발생했습니다.");
        }
    };

    const StatusDropdown = ({ status, onChange }: { status: string, onChange: (s: QuoteRequest['status']) => void }) => {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = React.useRef<HTMLDivElement>(null);

        // Close dropdown when clicking outside
        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const styles = {
            pending_payment: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
            paid: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
            confirmed: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
            cancelled: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
            converted: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
            reservation_requested: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
        };

        const labels: Record<string, string> = {
            pending_payment: '입금 대기',
            paid: '결제 완료',
            confirmed: '예약 확정',
            cancelled: '취소됨',
            converted: '예약 전환',
            reservation_requested: '예약 요청'
        };

        const statusKey = status as keyof typeof styles;

        const handleSelect = (newStatus: QuoteRequest['status'] | 'pending_payment' | 'paid' | 'confirmed' | 'cancelled') => {
            onChange(newStatus as any);
            setIsOpen(false);
        };

        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${styles[statusKey] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${statusKey === 'confirmed' ? 'bg-teal-500' : statusKey === 'paid' ? 'bg-blue-500' : statusKey === 'pending_payment' ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                    {labels[statusKey as keyof typeof labels] || status}
                    <span className="material-symbols-outlined text-[14px]">expand_more</span>
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                        {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
                            <button
                                key={key}
                                onClick={() => handleSelect(key as any)}
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between group"
                            >
                                <span className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${key === 'confirmed' ? 'bg-teal-500' : key === 'paid' ? 'bg-blue-500' : key === 'pending_payment' ? 'bg-amber-500' : 'bg-red-400'}`}></div>
                                    {labels[key]}
                                </span>
                                {status === key && <span className="material-symbols-outlined text-teal-500 text-[14px]">check</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };





    const getActionButton = (status: string, request: QuoteRequest) => {
        if (status === 'converted') {
            return (
                <button
                    onClick={() => setSelectedRequest(request)}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors"
                >
                    예약확인
                </button>
            );
        } else if (status === 'completed') {
            return (
                <button
                    onClick={() => setSelectedRequest(request)}
                    className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                >
                    답변완료
                </button>
            );
        }
        return (
            <button
                onClick={() => setSelectedRequest(request)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition-colors"
            >
                답변하기
            </button>
        );
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    // Pagination helper to generate page numbers
    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxDisplayed = 5; // Max page buttons to show
        let startPage = Math.max(1, currentPage - Math.floor(maxDisplayed / 2));
        const endPage = Math.min(totalPages, startPage + maxDisplayed - 1);

        if (endPage - startPage + 1 < maxDisplayed) {
            startPage = Math.max(1, endPage - maxDisplayed + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            {/* Sidebar */}
            <AdminSidebar
                activePage="quotes"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">견적 관리 리스트</h1>
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

                <div className="p-8 space-y-6 bg-slate-50 dark:bg-slate-900">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">전체 요청</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{stats.total}건</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">list_alt</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">답변 대기</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{stats.new}건</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">완료된 견적</p>
                                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{stats.completed}건</h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Section */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-slate-400 mb-2">날짜 범위</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">calendar_today</span>
                                    <input
                                        type="text"
                                        value="2024.01.01 - 2024.12.31"
                                        readOnly
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-xs font-bold text-slate-400 mb-2">고객명 검색</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                    <input
                                        type="text"
                                        placeholder="고객 이름 또는 여행지 검색"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-2">상태</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                                >
                                    <option>전체 상태</option>
                                    <option>답변 대기</option>
                                    <option>상담 중</option>
                                    <option>답변 완료</option>
                                    <option>예약 요청</option>
                                    <option>예약 전환</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <button onClick={() => { setSearchTerm(''); setFilterStatus('전체 상태'); }} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-lg">refresh</span>
                                    초기화
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Check List Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">요청일</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">고객명</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">희망 여행지</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">인원</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">희망 일정</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">상태</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {displayedRequests.length > 0 ? displayedRequests.map((request) => (
                                        <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">{request.date}</td>
                                            <td className="px-6 py-5 text-sm font-bold text-slate-800 dark:text-slate-200">{request.name}</td>
                                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{request.destination}</td>
                                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{request.headcount}</td>
                                            <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{request.period}</td>
                                            <td className="px-6 py-5 text-center">
                                                <StatusDropdown
                                                    status={request.status}
                                                    onChange={(newStatus) => handleStatusChange(request.id, newStatus)}
                                                />
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    {getActionButton(request.status, request)}
                                                    <button
                                                        onClick={() => setSelectedRequest(request)}
                                                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                                                    >
                                                        상세 보기
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                                                검색 결과가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span className="text-xs">
                                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} entries
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                {getPageNumbers().map(pageNum => (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === pageNum
                                            ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detail Modal */}
                {selectedRequest && (
                    <QuoteDetailModal
                        request={selectedRequest}
                        onClose={() => setSelectedRequest(null)}
                        onSendEstimate={handleSendEstimate}
                        onOpenConvert={() => setIsConvertModalOpen(true)}
                        onUpdateQuote={handleUpdateQuote}
                    />
                )}

                {/* Convert Logic Modal */}
                {isConvertModalOpen && selectedRequest && (
                    <ConvertSelectionModal
                        request={selectedRequest}
                        onClose={() => setIsConvertModalOpen(false)}
                        onConvert={handleConvertToReservation}
                    />
                )}
            </main>
        </div>
    );
};
