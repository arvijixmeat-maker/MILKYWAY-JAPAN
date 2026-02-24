import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { sendNotificationEmail } from '../lib/email';

export const Payment: React.FC = () => {
    const { t } = useTranslation();
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
            try {
                const data = await api.settings.get('bank_account');
                if (data?.value) {
                    setBankAccount(data.value);
                }
            } catch (error) {
                console.error('Failed to fetch bank account settings:', error);
            }
        };
        fetchSettings();
    }, []);

    // Auto-fill user info
    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const me = await api.auth.me();
                if (me) {
                    setCustomerInfo(prev => ({
                        ...prev,
                        name: me.name || me.full_name || prev.name,
                        email: me.email || prev.email,
                        phone: me.phone || prev.phone
                    }));
                }
            } catch (e) {
                // Ignore if not logged in
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
            alert(t('payment.messages.invalid_price'));
            navigate(-1);
        }
    }, [priceBreakdown, navigate, t]);

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
        const locale = t('reservation.date_selection.locale_date', { defaultValue: 'ko-KR' });
        if (locale === 'ja-JP') {
            return d.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            });
        }
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
            alert(t('payment.messages.invalid_access'));
            return;
        }

        // For regular products, require dates
        if (!isQuote && (!selectedStartDate || !parsedDuration)) {
            alert(t('payment.messages.missing_date'));
            return;
        }

        // Validate customer info
        if (!customerInfo.name.trim()) {
            alert(t('payment.messages.missing_name'));
            return;
        }
        if (!customerInfo.phone.trim()) {
            alert(t('payment.messages.missing_phone'));
            return;
        }
        if (!customerInfo.email.trim()) {
            alert(t('payment.messages.missing_email'));
            return;
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerInfo.email)) {
            alert(t('payment.messages.invalid_email'));
            return;
        }
        if (!agreeToTerms) {
            alert(t('payment.messages.agree_terms_required'));
            return;
        }

        try {
            setIsProcessing(true);
            const me = await api.auth.me();
            if (!me) {
                alert(t('payment.messages.login_required'));
                setIsProcessing(false);
                return;
            }

            const now = new Date().toISOString();

            const newReservation: any = {
                user_id: me.id,
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

            const data = await api.reservations.create(newReservation);
            const reservationId = data.id;

            // Update quote status if this is a quote reservation
            if (isQuote && quoteId) {
                try {
                    await (api.quotes as any).update(quoteId, { status: 'converted' });
                } catch (quoteUpdateError) {
                    console.error('Failed to update quote status:', quoteUpdateError);
                    // We don't block the reservation flow, but log it
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

            alert(`${t('payment.messages.save_failed')}${errorMessage}${errorDetails}`);
        }
    };

    // Redirect if no reservation data (quotes don't require dates)
    if (!reservationData || !product || !priceBreakdown || priceBreakdown.total <= 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">{t('payment.no_reservation')}</p>
                    <button
                        onClick={() => navigate('/products')}
                        className="px-4 py-2 bg-primary text-white rounded-lg"
                    >
                        {t('payment.return_to_products')}
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
                    <p className="text-white dark:text-zinc-900 text-sm font-medium tracking-tight">{t('payment.account_copied')}</p>
                </div>

                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-4 justify-between border-b border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-[#0e1a18] dark:text-white flex size-10 shrink-0 items-center justify-start cursor-pointer"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">{t('payment.title')}</h2>
                    <div className="size-10"></div>
                </div>

                <div className="flex-1 overflow-y-auto pb-48">
                    <div className="px-5 pt-8 pb-6">
                        <div className="mb-4">
                            <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-md mb-2">{t('payment.selected_travel_info')}</span>
                            <h3 className="text-[#0e1a18] dark:text-white text-2xl font-bold leading-tight">{product.name}</h3>
                        </div>
                        <div className="space-y-4 mt-6">
                            {/* Show dates only for regular products */}
                            {!isQuote && selectedStartDate && parsedDuration && endDate && (
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-gray-400 mt-0.5">calendar_today</span>
                                    <div>
                                        <p className="text-[13px] text-gray-400 font-medium">{t('payment.travel_duration')}</p>
                                        <p className="text-sm text-[#0e1a18] dark:text-white font-semibold">
                                            {formatDate(new Date(selectedStartDate))} - {formatDate(endDate)} • {t('payment.duration_format', { nights: parsedDuration.nights, days: parsedDuration.days })}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {/* For quotes, show duration from product if available */}
                            {isQuote && product.duration && (
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-gray-400 mt-0.5">calendar_today</span>
                                    <div>
                                        <p className="text-[13px] text-gray-400 font-medium">{t('payment.travel_duration')}</p>
                                        <p className="text-sm text-[#0e1a18] dark:text-white font-semibold">
                                            {product.duration}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-gray-400 mt-0.5">group</span>
                                <div>
                                    <p className="text-[13px] text-gray-400 font-medium">{t('payment.reservation_guests')}</p>
                                    <p className="text-sm text-[#0e1a18] dark:text-white font-semibold">{t('payment.total_guests', { count: totalPeople })}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-2 bg-gray-50 dark:bg-zinc-800/30"></div>

                    <div className="px-5 py-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold">{t('payment.customer_info_title')}</h3>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" type="checkbox" disabled />
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('payment.same_as_member')}</span>
                            </label>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">{t('payment.customer_name')}</label>
                                <input
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm text-[#0e1a18] dark:text-white placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-zinc-800 outline-none focus:border-primary"
                                    placeholder={t('payment.customer_name_placeholder')}
                                    type="text"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">{t('payment.customer_phone')}</label>
                                <input
                                    value={customerInfo.phone}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm text-[#0e1a18] dark:text-white placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-zinc-800 outline-none focus:border-primary"
                                    placeholder="010-0000-0000"
                                    type="tel"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 ml-1">{t('payment.customer_email')}</label>
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
                        <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold mb-6">{t('payment.payment_amount')}</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">{t('payment.total_travel_expense')}</span>
                                <span className="text-[#0e1a18] dark:text-white font-bold text-lg">{formatPrice(priceBreakdown.total)}{t('reservation.price_info.currency')}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 px-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <div className="flex items-center gap-2">
                                    <span className="text-primary font-bold">{t('payment.deposit_to_pay_now')}</span>
                                    <span className="material-symbols-outlined text-primary text-sm">help_outline</span>
                                </div>
                                <span className="text-primary font-bold text-xl">{formatPrice(priceBreakdown.deposit)}{t('reservation.price_info.currency')}</span>
                            </div>
                            {priceBreakdown.local > 0 && (
                                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-zinc-800/30 rounded-xl">
                                    <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">{t('payment.local_payment_balance')}</span>
                                    <span className="text-gray-700 dark:text-gray-200 font-bold text-base">{formatPrice(priceBreakdown.local)}{t('reservation.price_info.currency')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-2 bg-gray-50 dark:bg-zinc-800/30"></div>

                    <div className="px-5 py-8">
                        <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold mb-6">{t('payment.payment_method_info')}</h3>
                        <div className="border-2 border-primary rounded-2xl bg-white dark:bg-zinc-800 overflow-hidden shadow-sm">
                            <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-zinc-700 bg-primary/5">
                                <div className="size-10 bg-white dark:bg-zinc-700 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-primary">account_balance</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[#0e1a18] dark:text-white font-bold">{t('payment.bank_transfer')}</p>
                                    <p className="text-xs text-gray-500">{t('payment.bank_transfer_desc')}</p>
                                </div>
                                <span className="material-symbols-outlined text-primary">check_circle</span>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('payment.deposit_account')}</span>
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
                                            {t('payment.copy')}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('payment.account_holder')}</span>
                                    <p className="text-sm font-bold text-[#0e1a18] dark:text-white">{bankAccount.accountHolder}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                            <p className="text-[13px] font-bold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">info</span>
                                {t('payment.deposit_notices.title')}
                            </p>
                            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-2 list-disc pl-4">
                                <li>
                                    {t('payment.deposit_notices.name_match').split(t('payment.deposit_notices.name_match_highlight'))[0]}
                                    <span className="text-[#0e1a18] dark:text-white font-bold">{t('payment.deposit_notices.name_match_highlight')}</span>
                                    {t('payment.deposit_notices.name_match').split(t('payment.deposit_notices.name_match_highlight'))[1]}
                                </li>
                                <li>{t('payment.deposit_notices.auto_cancel')}</li>
                                <li>{t('payment.deposit_notices.local_payment')}</li>
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
                        <p className="text-sm font-semibold text-[#0e1a18] dark:text-white">{t('payment.agree_terms')}</p>
                    </div>
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className={`w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                    >
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                {t('payment.processing')}
                            </>
                        ) : (
                            <>
                                {t('payment.pay_amount', { amount: formatPrice(priceBreakdown.deposit) })}
                                <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">payments</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
