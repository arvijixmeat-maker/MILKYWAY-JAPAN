import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TourProduct } from '../types/product';
import { api } from '../lib/api';

export const Reservation: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<TourProduct | null>(null);
    const [loading, setLoading] = useState(true);

    // State
    const [totalPeople, setTotalPeople] = useState<number>(2);
    const [selectedAccomId, setSelectedAccomId] = useState<string>('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);

    // Parse duration to get number of nights and days (robust to handle multiple languages)
    const parsedDuration = useMemo(() => {
        if (!product?.duration) return { nights: 0, days: 0 };
        // Extract all numbers to handle formats like "3박 4일", "3泊4日", "3 nights 4 days"
        const matches = product.duration.match(/\d+/g);
        if (matches && matches.length >= 2) {
            return { nights: parseInt(matches[0], 10), days: parseInt(matches[1], 10) };
        }
        return { nights: 0, days: 0 };
    }, [product?.duration]);

    // Load Product
    useEffect(() => {
        const loadProduct = async () => {
            if (!id) return;
            try {
                const data = await api.products.get(id);

                if (data) {
                    const found: TourProduct = {
                        id: data.id,
                        name: data.name,
                        price: data.price,
                        originalPrice: data.original_price,
                        duration: data.duration,
                        category: data.category,
                        mainImages: data.main_images || [],
                        isPopular: data.is_popular,
                        tags: data.tags || [],
                        description: data.description,
                        galleryImages: data.gallery_images || [],
                        detailImages: data.detail_images || [],
                        itineraryImages: data.itinerary_images || [],
                        detailSlides: data.detail_slides || [],
                        status: data.status,
                        isFeatured: data.is_featured,
                        highlights: data.highlights || [],
                        included: data.included || [],
                        excluded: data.excluded || [],
                        pricingOptions: Array.isArray(data.pricing_options) ? data.pricing_options : (typeof data.pricing_options === 'string' ? JSON.parse(data.pricing_options) : []),
                        accommodationOptions: Array.isArray(data.accommodation_options) ? data.accommodation_options : (typeof data.accommodation_options === 'string' ? JSON.parse(data.accommodation_options) : []),
                        vehicleOptions: Array.isArray(data.vehicle_options) ? data.vehicle_options : (typeof data.vehicle_options === 'string' ? JSON.parse(data.vehicle_options) : []),
                        viewCount: data.view_count || 0,
                        bookingCount: data.booking_count || 0,
                        createdAt: data.created_at,
                        updatedAt: data.updated_at
                    };

                    setProduct(found);
                    // Set defaults
                    if (found.accommodationOptions && found.accommodationOptions.length > 0) {
                        const def = found.accommodationOptions.find(o => o.isDefault) || found.accommodationOptions[0];
                        setSelectedAccomId(def.id);
                    }
                    if (found.vehicleOptions && found.vehicleOptions.length > 0) {
                        const def = found.vehicleOptions.find(o => o.isDefault) || found.vehicleOptions[0];
                        setSelectedVehicleId(def.id);
                    }
                    // Set initial people count to first pricing tier
                    if (found.pricingOptions && found.pricingOptions.length > 0) {
                        const sorted = [...found.pricingOptions].sort((a, b) => a.people - b.people);
                        setTotalPeople(sorted[0].people);
                    }
                }
            } catch (error) {
                console.error('Product not found or error:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProduct();
    }, [id]);

    // Calculation Logic
    // Calculation Logic
    const baseOption = useMemo(() => {
        if (!product || !product.pricingOptions || product.pricingOptions.length === 0) return null;

        // Find exact match or closest
        const exactMatch = product.pricingOptions.find(p => p.people === totalPeople);
        if (exactMatch) return exactMatch;

        // If no exact match, find closest smaller or max
        const sorted = [...product.pricingOptions].sort((a, b) => a.people - b.people);

        if (totalPeople < sorted[0].people) return sorted[0];
        if (totalPeople > sorted[sorted.length - 1].people) return sorted[sorted.length - 1];

        // Logic: find largest count <= totalPeople
        const tier = sorted.filter(p => p.people <= totalPeople).pop();
        return tier || sorted[0];
    }, [product, totalPeople]);

    const priceBreakdown = useMemo(() => {
        if (!product || !baseOption) return { total: 0, deposit: 0, local: 0 };

        const baseTotal = baseOption.pricePerPerson * totalPeople;
        const baseDeposit = (baseOption.depositPerPerson || 0) * totalPeople;
        const baseLocal = (baseOption.localPaymentPerPerson || 0) * totalPeople;

        let vehicleTotal = 0;
        if (selectedVehicleId && product.vehicleOptions) {
            const v = product.vehicleOptions.find(o => o.id === selectedVehicleId);
            if (v) vehicleTotal = v.priceModifier;
        }

        let accomTotal = 0;
        if (selectedAccomId && product.accommodationOptions) {
            const a = product.accommodationOptions.find(o => o.id === selectedAccomId);
            if (a) accomTotal = a.priceModifier;
        }

        return {
            total: baseTotal + vehicleTotal + accomTotal,
            deposit: baseDeposit, // 예약금 (기본)
            local: baseLocal,     // 현지 지불 (기본)
            // Add-ons are usually added to total. 
            // If add-ons need to be in deposit or local, logic needs to adjust.
            // For now, assume add-ons are just adding to the Total Price.
        };
    }, [baseOption, totalPeople, selectedVehicleId, selectedAccomId, product]);

    const formatPrice = (price: number) => price.toLocaleString();

    if (loading) return <div className="min-h-screen flex items-center justify-center">{t('reservation.messages.loading')}</div>;
    if (!product) return <div className="min-h-screen flex items-center justify-center">{t('reservation.messages.not_found')}</div>;

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="max-w-[430px] mx-auto bg-white dark:bg-zinc-900 min-h-screen flex flex-col relative overflow-x-hidden shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-4 justify-between border-b border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-[#0e1a18] dark:text-white flex size-10 shrink-0 items-center justify-start cursor-pointer"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">{t('reservation.title')}</h2>
                    <div className="size-10"></div>
                </div>

                <div className="flex-1 overflow-y-auto pb-48">
                    {/* Date Selection */}
                    <div className="px-4 pt-6 pb-2">
                        <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-tight">{t('reservation.date_selection.title')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            {parsedDuration.nights > 0
                                ? t('reservation.date_selection.subtitle_with_duration', { nights: parsedDuration.nights, days: parsedDuration.days })
                                : t('reservation.date_selection.subtitle_default')
                            }
                        </p>
                    </div>
                    {/* Calendar */}
                    <div className="flex flex-col items-center justify-center gap-2 p-4">
                        <div className="w-full flex flex-col gap-0.5 border border-gray-100 dark:border-zinc-800 rounded-2xl p-2 bg-gray-50/50 dark:bg-zinc-800/50">
                            {/* Month Navigation */}
                            <div className="flex items-center p-1 justify-between">
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                    className="hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full p-2 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[#0e1a18] dark:text-white">chevron_left</span>
                                </button>
                                <p className="text-[#0e1a18] dark:text-white text-base font-bold leading-tight flex-1 text-center">
                                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                                </p>
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                    className="hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full p-2 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[#0e1a18] dark:text-white">chevron_right</span>
                                </button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 text-center">
                                {/* Day Headers */}
                                <p className="text-red-500 text-[13px] font-bold h-10 flex items-center justify-center">S</p>
                                <p className="text-gray-500 text-[13px] font-bold h-10 flex items-center justify-center">M</p>
                                <p className="text-gray-500 text-[13px] font-bold h-10 flex items-center justify-center">T</p>
                                <p className="text-gray-500 text-[13px] font-bold h-10 flex items-center justify-center">W</p>
                                <p className="text-gray-500 text-[13px] font-bold h-10 flex items-center justify-center">T</p>
                                <p className="text-gray-500 text-[13px] font-bold h-10 flex items-center justify-center">F</p>
                                <p className="text-blue-500 text-[13px] font-bold h-10 flex items-center justify-center">S</p>

                                {/* Calendar Days */}
                                {(() => {
                                    const year = currentMonth.getFullYear();
                                    const month = currentMonth.getMonth();
                                    const firstDay = new Date(year, month, 1).getDay();
                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);

                                    const days: React.ReactNode[] = [];

                                    // Empty cells before first day
                                    for (let i = 0; i < firstDay; i++) {
                                        days.push(<div key={`empty-${i}`} className="h-10" />);
                                    }

                                    // Actual days
                                    for (let day = 1; day <= daysInMonth; day++) {
                                        const date = new Date(year, month, day);
                                        const isPast = date < today;
                                        const isSelected = selectedStartDate &&
                                            date.getTime() === selectedStartDate.getTime();
                                        const isInRange = selectedStartDate && parsedDuration.nights > 0 &&
                                            date >= selectedStartDate &&
                                            date < new Date(selectedStartDate.getTime() + parsedDuration.nights * 24 * 60 * 60 * 1000);

                                        days.push(
                                            <button
                                                key={day}
                                                disabled={isPast}
                                                onClick={() => setSelectedStartDate(date)}
                                                className={`h-10 w-full text-sm font-medium transition-all ${isPast
                                                    ? 'text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'text-white'
                                                        : isInRange
                                                            ? 'bg-primary/20 text-primary font-bold'
                                                            : 'text-[#0e1a18] dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg'
                                                    }`}
                                            >
                                                {isSelected ? (
                                                    <div className="flex size-9 mx-auto items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                                                        {day}
                                                    </div>
                                                ) : (
                                                    day
                                                )}
                                            </button>
                                        );
                                    }

                                    return days;
                                })()}
                            </div>

                            {/* Selected Date Range Display */}
                            {selectedStartDate && parsedDuration.nights > 0 && (
                                <div className="mt-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('reservation.date_selection.selected_range')}</p>
                                    <p className="text-sm font-bold text-primary">
                                        {t('reservation.date_selection.selected_range_format', {
                                            startDate: selectedStartDate.toLocaleDateString(t('reservation.date_selection.locale_date', { defaultValue: 'ko-KR' }), { month: 'long', day: 'numeric' }),
                                            endDate: new Date(selectedStartDate.getTime() + parsedDuration.nights * 24 * 60 * 60 * 1000).toLocaleDateString(t('reservation.date_selection.locale_date', { defaultValue: 'ko-KR' }), { month: 'long', day: 'numeric' })
                                        })}
                                        <span className="ml-2 text-xs">{t('reservation.date_selection.duration_format', { nights: parsedDuration.nights, days: parsedDuration.days })}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-2 bg-gray-50 dark:bg-zinc-800/30"></div>

                    {/* Guest Selection */}
                    <div className="px-4 pt-6 pb-2">
                        <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight">{t('reservation.guest_selection.title')}</h3>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-4 min-h-16 justify-between">
                            <div>
                                <p className="text-[#0e1a18] dark:text-white text-base font-semibold leading-normal">{t('reservation.guest_selection.total_guests')}</p>
                                <p className="text-gray-400 text-xs">
                                    {product.pricingOptions && product.pricingOptions.length > 0
                                        ? `${Math.min(...product.pricingOptions.map(p => p.people))}${t('reservation.guest_selection.unit')} ~ ${Math.max(...product.pricingOptions.map(p => p.people))}${t('reservation.guest_selection.unit')}`
                                        : t('reservation.guest_selection.select_guests')
                                    }
                                </p>
                            </div>
                            <div className="shrink-0 border border-gray-100 dark:border-zinc-800 rounded-full px-2 py-1 flex items-center gap-4 bg-gray-50/50 dark:bg-zinc-800/50">
                                <button
                                    onClick={() => {
                                        if (!product.pricingOptions || product.pricingOptions.length === 0) return;
                                        const sorted = [...product.pricingOptions].sort((a, b) => a.people - b.people);
                                        const currentIndex = sorted.findIndex(p => p.people === totalPeople);
                                        if (currentIndex > 0) {
                                            setTotalPeople(sorted[currentIndex - 1].people);
                                        }
                                    }}
                                    disabled={!product.pricingOptions || product.pricingOptions.length === 0 || totalPeople <= Math.min(...(product.pricingOptions?.map(p => p.people) || [2]))}
                                    className="text-primary text-xl font-bold flex h-8 w-8 items-center justify-center rounded-full hover:bg-white dark:hover:bg-zinc-700 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                                >-</button>
                                <span className="text-[#0e1a18] dark:text-white font-bold text-base min-w-[24px] text-center">{totalPeople}{t('reservation.guest_selection.unit')}</span>
                                <button
                                    onClick={() => {
                                        if (!product.pricingOptions || product.pricingOptions.length === 0) return;
                                        const sorted = [...product.pricingOptions].sort((a, b) => a.people - b.people);
                                        const currentIndex = sorted.findIndex(p => p.people === totalPeople);
                                        if (currentIndex < sorted.length - 1) {
                                            setTotalPeople(sorted[currentIndex + 1].people);
                                        }
                                    }}
                                    disabled={!product.pricingOptions || product.pricingOptions.length === 0 || totalPeople >= Math.max(...(product.pricingOptions?.map(p => p.people) || [2]))}
                                    className="text-primary text-xl font-bold flex h-8 w-8 items-center justify-center rounded-full hover:bg-white dark:hover:bg-zinc-700 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                                >+</button>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-primary">info</span>
                            <p className="text-[#0e1a18] dark:text-white text-[13px] font-medium">
                                {t('reservation.price_info.per_person_current')} <span className="text-primary font-bold">{formatPrice(baseOption?.pricePerPerson || 0)}</span>{t('reservation.price_info.currency')}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsPriceModalOpen(true)}
                            className="flex items-center gap-0.5 text-gray-400 dark:text-gray-500 text-[12px] font-medium border-b border-gray-300 dark:border-gray-600 pb-0.5 hover:text-primary transition-colors"
                        >
                            {t('reservation.price_info.view_price_by_guests')}
                            <span className="material-symbols-outlined text-[14px]">expand_more</span>
                        </button>
                    </div>

                    <div className="h-2 bg-gray-50 dark:bg-zinc-800/30 mt-6"></div>

                    {/* Accommodation Options */}
                    <div className="px-4 pt-6 pb-2">
                        <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight">{t('reservation.options.accommodation_title')}</h3>
                    </div>
                    <div className="px-4 space-y-3">
                        {(!product.accommodationOptions || product.accommodationOptions.length === 0) ? (
                            <p className="text-gray-500 text-sm">{t('reservation.options.no_accommodation')}</p>
                        ) : (
                            product.accommodationOptions.map(option => (
                                <div
                                    key={option.id}
                                    onClick={() => setSelectedAccomId(option.id)}
                                    className={`flex items-center p-4 border rounded-2xl gap-4 cursor-pointer relative transition-all ${selectedAccomId === option.id
                                        ? 'border-2 border-primary bg-primary/5'
                                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-primary/50'
                                        }`}
                                >
                                    {option.imageUrl && (
                                        <div className="size-12 rounded-lg bg-primary/20 flex items-center justify-center overflow-hidden">
                                            <img className="w-full h-full object-cover" src={option.imageUrl} alt={option.name} />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[#0e1a18] dark:text-white text-sm">{option.name}</h4>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{option.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-primary font-bold text-sm">
                                            {option.priceModifier === 0 ? t('reservation.options.included_default') : `${option.priceModifier > 0 ? '+' : ''}${formatPrice(option.priceModifier)}`}
                                        </p>
                                    </div>
                                    {selectedAccomId === option.id && option.priceModifier === 0 && (
                                        <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{t('reservation.options.selected')}</div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="h-2 bg-gray-50 dark:bg-zinc-800/30 mt-6"></div>

                    {/* Vehicle Options */}
                    <div className="px-4 pt-6 pb-2">
                        <h3 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight">{t('reservation.options.vehicle_title')}</h3>
                    </div>
                    <div className="px-4 space-y-3">
                        {(!product.vehicleOptions || product.vehicleOptions.length === 0) ? (
                            <p className="text-gray-500 text-sm">{t('reservation.options.no_vehicle')}</p>
                        ) : (
                            product.vehicleOptions.map(option => (
                                <div
                                    key={option.id}
                                    onClick={() => setSelectedVehicleId(option.id)}
                                    className={`flex items-center p-4 border rounded-2xl gap-4 cursor-pointer transition-all ${selectedVehicleId === option.id
                                        ? 'border-2 border-primary bg-primary/5'
                                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-primary'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-3xl text-primary">airport_shuttle</span>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[#0e1a18] dark:text-white text-sm">{option.name}</h4>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{option.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[#0e1a18] dark:text-white font-bold text-sm">
                                            {option.priceModifier === 0 ? t('reservation.options.free') : `${option.priceModifier > 0 ? '+' : ''}${formatPrice(option.priceModifier)}`}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 p-4 pb-10 z-[60] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{t('reservation.price_info.live_estimate')}</p>
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1 animate-price-change">
                                    <span className="text-[26px] font-bold text-[#0e1a18] dark:text-white tracking-tight">{formatPrice(priceBreakdown.total)}</span>
                                    <span className="text-base font-bold text-[#0e1a18] dark:text-white">{t('reservation.price_info.currency')}</span>
                                </div>
                                {(priceBreakdown.deposit > 0 || priceBreakdown.local > 0) && (
                                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                        {priceBreakdown.deposit > 0 && <p>{t('reservation.price_info.deposit')}: {formatPrice(priceBreakdown.deposit)}{t('reservation.price_info.currency')}</p>}
                                        {priceBreakdown.local > 0 && <p>{t('reservation.price_info.local_payment')}: {formatPrice(priceBreakdown.local)}{t('reservation.price_info.currency')}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex -space-x-2">
                            {/* Avatars placeholder */}
                            <div className="w-9 h-9 rounded-full border-2 border-white dark:border-zinc-900 bg-gray-100 overflow-hidden shadow-sm">
                                <span className="material-symbols-outlined text-gray-400 w-full h-full flex items-center justify-center">person</span>
                            </div>
                            <div className="w-9 h-9 rounded-full border-2 border-white dark:border-zinc-900 bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shadow-sm">
                                +{totalPeople}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (!selectedStartDate) {
                                alert(t('reservation.messages.please_select_date'));
                                return;
                            }
                            navigate('/payment', {
                                state: {
                                    product,
                                    selectedStartDate,
                                    totalPeople,
                                    parsedDuration,
                                    priceBreakdown,
                                    selectedAccomId,
                                    selectedVehicleId
                                }
                            });
                        }}
                        className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                    >
                        {t('reservation.buttons.next_step')}
                        <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </button>
                </div>

                {/* Price Detail Modal */}
                {isPriceModalOpen && (
                    <>
                        <div
                            onClick={() => setIsPriceModalOpen(false)}
                            className="fixed inset-0 bg-black/40 z-[100] transition-opacity duration-300"
                        ></div>
                        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white dark:bg-zinc-900 rounded-t-[32px] z-[101] shadow-2xl transition-transform duration-300 flex flex-col max-h-[90vh]">
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
                            </div>
                            <div className="flex items-center justify-between px-6 py-4">
                                <h3 className="text-lg font-bold text-[#0e1a18] dark:text-white">{t('reservation.price_info.modal_title')}</h3>
                                <button
                                    onClick={() => setIsPriceModalOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded-full cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px] text-gray-500">close</span>
                                </button>
                            </div>
                            <div className="px-6 pb-6 overflow-y-auto">
                                <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 mb-6">
                                    <div className="grid grid-cols-2 border-b border-gray-200 dark:border-zinc-800">
                                        <div className="px-4 py-3 text-xs font-bold text-gray-400 bg-gray-50/80 dark:bg-zinc-800/50">{t('reservation.price_info.modal_guests')}</div>
                                        <div className="px-4 py-3 text-xs font-bold text-gray-400 bg-gray-50/80 dark:bg-zinc-800/50">{t('reservation.price_info.modal_price')}</div>
                                    </div>

                                    {/* Dynamic Price List */}
                                    {product.pricingOptions?.sort((a, b) => a.people - b.people).map((opt, idx) => (
                                        <div key={idx} className={`grid grid-cols-2 ${totalPeople === opt.people ? 'bg-primary text-white font-bold' : 'border-b border-gray-100 dark:border-zinc-800'}`}>
                                            <div className={`px-4 py-4 text-[15px] ${totalPeople === opt.people ? '' : 'text-[#0e1a18] dark:text-white'}`}>{opt.people}{t('reservation.guest_selection.unit')}</div>
                                            <div className={`px-4 py-4 text-right ${totalPeople === opt.people ? '' : 'text-[#0e1a18] dark:text-white'}`}>
                                                <div className="text-[15px] font-medium">{formatPrice(opt.pricePerPerson)}{t('reservation.price_info.currency')}</div>
                                                {(opt.depositPerPerson > 0 || opt.localPaymentPerPerson > 0) && (
                                                    <div className={`text-[10px] mt-0.5 ${totalPeople === opt.people ? 'text-white/80' : 'text-gray-400'}`}>
                                                        {t('reservation.price_info.modal_deposit_local', {
                                                            deposit: formatPrice(opt.depositPerPerson || 0) + t('reservation.price_info.currency'),
                                                            local: formatPrice(opt.localPaymentPerPerson || 0) + t('reservation.price_info.currency')
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {(!product.pricingOptions || product.pricingOptions.length === 0) && (
                                        <div className="p-4 text-center text-gray-500">{t('reservation.price_info.no_price_info')}</div>
                                    )}
                                </div>

                                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800/30 rounded-xl mb-8">
                                    <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
                                    <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                                        {t('reservation.price_info.description')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsPriceModalOpen(false)}
                                    className="w-full bg-[#1e2a27] dark:bg-primary text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
                                >
                                    {t('reservation.buttons.confirm')}
                                </button>
                            </div>
                            <div className="h-8"></div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
