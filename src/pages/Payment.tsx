import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { sendNotificationEmail } from '../lib/email';

export const Payment: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showToast, setShowToast] = useState(false);

    // Customer info state
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    // Bank account settings
    const [bankAccount, setBankAccount] = useState({
        bankName: '',
        accountNumber: '',
        accountHolder: ''
    });

    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);

    // Load bank account settings from Supabase
    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase.from('settings').select('*').eq('key', 'bank_account').single();
            if (data?.value) {
                setBankAccount(data.value);
            } else {
                console.error('Failed to fetch bank account settings:', error);
            }
        };
        fetchSettings();
    }, []);

    // Auto-fill user info
    useEffect(() => {
        const loadUserInfo = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { user } = session;
                setCustomerInfo(prev => ({
                    ...prev,
                    name: user.user_metadata.full_name || prev.name,
                    email: user.email || prev.email,
                    phone: user.phone || user.user_metadata.phone || prev.phone
                }));
            }
        };
        loadUserInfo();
    }, []);

    // Extract reservation data from navigation state
    const reservationData = location.state as {
        product: any;
        selectedStartDate?: Date;
        totalPeople: number;
        parsedDuration?: { nights: number; days: number };
        priceBreakdown: { total: number; deposit: number; local: number };
        selectedAccomId?: string;
        selectedVehicleId?: string;
        // Quote specific fields
        isQuote?: boolean;
        quoteId?: string;
        customerInfo?: { name: string; phone: string; email: string };
    } | null;

    // Derived state from reservationData
    const product = reservationData?.product;
    const isQuote = reservationData?.isQuote || false;
    const quoteId = reservationData?.quoteId;
    const selectedStartDate = reservationData?.selectedStartDate;
    const totalPeople = reservationData?.totalPeople;
    const parsedDuration = reservationData?.parsedDuration;
    const priceBreakdown = reservationData?.priceBreakdown;

    // Safety check for 0 won payments (especially for quotes)
    useEffect(() => {
        if (priceBreakdown && priceBreakdown.total <= 0) {
            alert('금액 정보가 올바르지 않습니다. 관리자에게 문의해주세요.');
            navigate(-1);
        }
    }, [priceBreakdown, navigate]);

    // Auto-fill customer info from quote if passed
    useEffect(() => {
        if (reservationData?.customerInfo) {
            setCustomerInfo(prev => ({
                ...prev,
                name: reservationData.customerInfo?.name || prev.name,
                phone: reservationData.customerInfo?.phone || prev.phone,
                email: reservationData.customerInfo?.email || prev.email
            }));
        }
    }, [reservationData?.customerInfo]);

    // Calculate endDate safely (for regular products)
    const endDate = (selectedStartDate && parsedDuration)
        ? new Date(new Date(selectedStartDate).getTime() + parsedDuration.nights * 24 * 60 * 60 * 1000)
        : null;

    // Format date helper
    const formatDate = (date: Date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short'
        }).replace(/\. /g, '.').replace('.', '년 ').replace('.', '.').replace(' ', '(').replace(/\.$/, ')');
    };

    const formatPrice = (price: number) => price ? price.toLocaleString() : '0';

    const handleCopy = () => {
        navigator.clipboard.writeText(bankAccount.accountNumber);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    const handlePayment = async () => {
        // Prevent double click
        if (isProcessing) return;

        // For regular products, dates are required; for quotes, they are optional
        if (!reservationData || !product || !priceBreakdown) {
            alert('잘못된 접근입니다.');
            return;
        }

        // For regular products, require dates
        if (!isQuote && (!selectedStartDate || !parsedDuration)) {
            alert('날짜 정보가 없습니다.');
            return;
        }

        // Validate customer info
        if (!customerInfo.name.trim()) {
            alert('이름을 입력해주세요.');
            return;
        }
        if (!customerInfo.phone.trim()) {
            alert('휴대폰 번호를 입력해주세요.');
            return;
        }
        if (!customerInfo.email.trim()) {
            alert('이메일 주소를 입력해주세요.');
            return;
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerInfo.email)) {
            alert('올바른 이메일 주소를 입력해주세요.');
            return;
        }
        if (!agreeToTerms) {
            alert('주문 내용 확인 및 결제 동의가 필요합니다.');
            return;
        }

        try {
            setIsProcessing(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('로그인이 필요합니다.');
                setIsProcessing(false);
                return;
            }

            const now = new Date().toISOString();

            const newReservation: any = {
                user_id: user.id,
                type: isQuote ? 'quote' : 'tour',
                status: 'pending_payment',
                product_name: product.name,
                product_id: isQuote ? null : product.id,
                total_people: totalPeople,
                customer_info: customerInfo,
                price_breakdown: priceBreakdown,
                bank_account: bankAccount,
                created_at: now
            };

            // Add date fields only for regular products
            if (!isQuote && selectedStartDate && parsedDuration) {
                newReservation.start_date = new Date(selectedStartDate).toISOString();
                newReservation.end_date = endDate ? endDate.toISOString() : null;
                newReservation.duration = `${parsedDuration.nights}박 ${parsedDuration.days}일`;
            } else if (isQuote) {
                // For quotes, use duration string from product if available
                newReservation.duration = product.duration || null;
            }

            const { data, error } = await supabase
                .from('reservations')
                .insert(newReservation)
                .select()
                .single();

            if (error) {
                throw error;
            }

            const reservationId = data.id;

            // Update quote status if this is a quote reservation
            // Update quote status if this is a quote reservation
            if (isQuote && quoteId) {
                const { error: quoteUpdateError } = await supabase
                    .from('quotes')
                    .update({ status: 'converted' })
                    .eq('id', quoteId);

                if (quoteUpdateError) {
                    console.error('Failed to update quote status:', quoteUpdateError);
                    // We don't block the reservation flow, but log it
                    // Maybe show a non-blocking toast?
                }
            }

            // Send Email Notification
            await sendNotificationEmail(
                newReservation.customer_info.email,
                'RESERVATION_REQUESTED',
                {
                    customerName: newReservation.customer_info.name,
                    productName: newReservation.product_name,
                    reservationId: reservationId,
                    depositAmount: formatPrice(newReservation.price_breakdown.deposit),
                    bankAccount: newReservation.bank_account
                }
            );

            // Proceed to reservation complete
            navigate('/reservation-complete', { state: { reservationId }, replace: true });
        } catch (e) {
            console.error('Failed to save reservation', e);
            setIsProcessing(false);

            // Handle Supabase error object (which is not an Error instance)
            let errorMessage = 'Unknown error';
            let errorDetails = '';

            if (e instanceof Error) {
                errorMessage = e.message;
            } else if (typeof e === 'object' && e !== null) {
                // Supabase error format
                const sbError = e as { message?: string; details?: string; hint?: string; code?: string };
                errorMessage = sbError.message || JSON.stringify(sbError);
                if (sbError.details) errorDetails = `\nDetails: ${sbError.details}`;
                if (sbError.hint) errorDetails += `\nHint: ${sbError.hint}`;
            }

            alert(`예약 저장 실패: ${errorMessage}${errorDetails}`);
        }
    };

    // Redirect if no reservation data (quotes don't require dates)
    if (!reservationData || !product || !priceBreakdown || priceBreakdown.total <= 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">예약 정보가 없습니다.</p>
                    <button
                        onClick={() => navigate('/products')}
                        className="px-4 py-2 bg-primary text-white rounded-lg"
                    >
                        상품 목록으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="max-w-[430px] mx-auto bg-white dark:bg-zinc-900 min-h-screen flex flex-col relative overflow-x-hidden shadow-2xl">

                {/* Toast Notification */}
                <div
                    className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-max px-5 py-3.5 bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md rounded-2xl flex items-center gap-2.5 shadow-xl border border-white/10 dark:border-black/5 transition-opacity duration-300 ${showToast ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                >
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <p className="text-white dark:text-zinc-900 text-sm font-medium tracking-tight">계좌번호가 복사되었습니다</p>
                </div>

                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-4 justify-between border-b border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-[#0e1a18] dark:text-white flex size-10 shrink-0 items-center justify-start cursor-pointer"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">예약 정보 및 계좌 확인</h2>
                    <div className="size-10"></div>
                </div>

                <div className="flex-1 overflow-y-auto pb-48">
                    <div className="px-5 pt-8 pb-6">
                        <div className="mb-4">
                            <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-md mb-2">선택한 여행 정보</span>
                            <h3 className="text-[#0e1a18] dark:text-white text-2xl font-bold leading-tight">{product.name}</h3>
                        </div>
                        <div className="space-y-4 mt-6">
                            {/* Show dates only for regular products */}
                            {!isQuote && selectedStartDate && parsedDuration && endDate && (
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-gray-400 mt-0.5">calendar_today</span>
                                    <div>
                                        <p className="text-[13px] text-gray-400 font-medium">여행 기간</p>
                                        <p className="text-sm text-[#0e1a18] dark:text-white font-semibold">
                                            {formatDate(new Date(selectedStartDate))} - {formatDate(endDate)} • {parsedDuration.nights}박 {parsedDuration.days}일
                                        </p>
                                    </div>
                                </div>
                            )}
                            {/* For quotes, show duration from product if available */}
                            {isQuote && product.duration && (
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-gray-400 mt-0.5">calendar_today</span>
                                    <div>
                                        <p className="text-[13px] text-gray-400 font-medium">여행 기간</p>
                                        <p className="text-sm text-[#0e1a18] dark:text-white font-semibold">
                                            {product.duration}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-gray-400 mt-0.5">group</span>
                                <div>
                                    <p className="text-[13px] text-gray-400 font-medium">예약 인원</p>
                                    <p className="text-sm text-[#0e1a18] dark:text-white font-semibold">총 {totalPeople}명</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-2 bg-gray-50 dark:bg-zinc-800/30"></div>

                    <div className="px-5 py-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold">예약자 정보</h3>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" type="checkbox" disabled />
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">회원 정보와 동일</span>
                            </label>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">이름</label>
                                <input
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm text-[#0e1a18] dark:text-white placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-zinc-800 outline-none focus:border-primary"
                                    placeholder="성함을 입력해주세요"
                                    type="text"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">휴대폰 번호</label>
                                <input
                                    value={customerInfo.phone}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm text-[#0e1a18] dark:text-white placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-zinc-800 outline-none focus:border-primary"
                                    placeholder="010-0000-0000"
                                    type="tel"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">이메일 주소</label>
                                <input
                                    value={customerInfo.email}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm text-[#0e1a18] dark:text-white placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-zinc-800 outline-none focus:border-primary"
                                    placeholder="example@mail.com"
                                    type="email"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-2 bg-gray-50 dark:bg-zinc-800/30"></div>

                    <div className="px-5 py-8">
                        <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold mb-6">결제 금액</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">총 여행 경비</span>
                                <span className="text-[#0e1a18] dark:text-white font-bold text-lg">{formatPrice(priceBreakdown.total)}원</span>
                            </div>
                            <div className="flex justify-between items-center py-4 px-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <div className="flex items-center gap-2">
                                    <span className="text-primary font-bold">지금 결제할 예약금</span>
                                    <span className="material-symbols-outlined text-primary text-sm">help_outline</span>
                                </div>
                                <span className="text-primary font-bold text-xl">{formatPrice(priceBreakdown.deposit)}원</span>
                            </div>
                            {priceBreakdown.local > 0 && (
                                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-zinc-800/30 rounded-xl">
                                    <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">현지 지불 잔금</span>
                                    <span className="text-gray-700 dark:text-gray-200 font-bold text-base">{formatPrice(priceBreakdown.local)}원</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-2 bg-gray-50 dark:bg-zinc-800/30"></div>

                    <div className="px-5 py-8">
                        <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold mb-6">결제 수단 및 계좌 정보</h3>
                        <div className="border-2 border-primary rounded-2xl bg-white dark:bg-zinc-800 overflow-hidden shadow-sm">
                            <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-zinc-700 bg-primary/5">
                                <div className="size-10 bg-white dark:bg-zinc-700 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-primary">account_balance</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[#0e1a18] dark:text-white font-bold">무통장 입금</p>
                                    <p className="text-xs text-gray-500">24시간 이내 입금 시 예약 확정</p>
                                </div>
                                <span className="material-symbols-outlined text-primary">check_circle</span>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">입금 계좌</span>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-[#0e1a18] dark:text-white">{bankAccount.bankName}</span>
                                            <span className="text-lg font-bold text-[#0e1a18] dark:text-white tracking-tight">{bankAccount.accountNumber}</span>
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-1 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-sm">content_copy</span>
                                            복사
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">예금주</span>
                                    <p className="text-sm font-bold text-[#0e1a18] dark:text-white">{bankAccount.accountHolder}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                            <p className="text-[13px] font-bold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">info</span>
                                입금 시 주의사항
                            </p>
                            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-2 list-disc pl-4">
                                <li>입금자명은 반드시 <span className="text-[#0e1a18] dark:text-white font-bold">예약자 성함</span>과 동일해야 합니다.</li>
                                <li>24시간 이내 미입금 시 예약이 자동 취소됩니다.</li>
                                <li>현지 잔금은 여행 당일 가이드에게 직접 전달합니다.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 p-4 pb-10 z-[60] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                    <div
                        onClick={() => setAgreeToTerms(!agreeToTerms)}
                        className="flex items-center gap-2 mb-4 px-1 cursor-pointer"
                    >
                        <div className={`size-5 border-2 rounded flex items-center justify-center transition-all ${agreeToTerms
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800'
                            }`}>
                            {agreeToTerms && <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>}
                        </div>
                        <p className="text-sm font-semibold text-[#0e1a18] dark:text-white">주문 내용을 확인하였으며, 결제에 동의합니다.</p>
                    </div>
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className={`w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                    >
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                처리 중...
                            </>
                        ) : (
                            <>
                                {formatPrice(priceBreakdown.deposit)}원 결제하기
                                <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">payments</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
