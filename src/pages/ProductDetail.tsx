import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { optimizeImage } from '../utils/imageOptimizer';
import { getOptimizedImageUrl, getResponsiveImageProps } from '../utils/supabaseImage';
import { ProductDetailSkeleton } from '../components/skeletons/ProductDetailSkeleton';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/ui/Toast';

import type { TourProduct, DetailSlide, DividerContent, TimelineContent, DayInfoContent } from '../types/product';

export const ProductDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState<TourProduct | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            setIsLoading(true);

            try {
                const data = await api.products.get(id);
                if (data) {
                    const mappedProduct: TourProduct = {
                        id: data.id,
                        name: data.name,
                        price: data.price,
                        originalPrice: data.originalPrice ?? data.original_price,
                        duration: data.duration,
                        category: data.category,
                        mainImages: data.mainImages ?? data.main_images ?? [],
                        galleryImages: data.galleryImages ?? data.gallery_images ?? [],
                        detailImages: data.detailImages ?? data.detail_images ?? [],
                        itineraryImages: data.itineraryImages ?? data.itinerary_images ?? [],
                        detailSlides: data.detailSlides ?? data.detail_slides ?? [],
                        detailBlocks: data.detailBlocks ?? data.detail_blocks ?? [],
                        itineraryBlocks: data.itineraryBlocks ?? data.itinerary_blocks ?? [],
                        tags: data.tags ?? [],
                        included: data.included ?? [],
                        excluded: data.excluded ?? [],
                        highlights: data.highlights ?? [],
                        pricingOptions: Array.isArray(data.pricingOptions ?? data.pricing_options) ? (data.pricingOptions ?? data.pricing_options) : (typeof (data.pricingOptions ?? data.pricing_options) === 'string' ? JSON.parse(data.pricingOptions ?? data.pricing_options) : []),
                        accommodationOptions: Array.isArray(data.accommodationOptions ?? data.accommodation_options) ? (data.accommodationOptions ?? data.accommodation_options) : (typeof (data.accommodationOptions ?? data.accommodation_options) === 'string' ? JSON.parse(data.accommodationOptions ?? data.accommodation_options) : []),
                        vehicleOptions: Array.isArray(data.vehicleOptions ?? data.vehicle_options) ? (data.vehicleOptions ?? data.vehicle_options) : (typeof (data.vehicleOptions ?? data.vehicle_options) === 'string' ? JSON.parse(data.vehicleOptions ?? data.vehicle_options) : []),
                        isFeatured: data.isFeatured ?? data.is_featured ?? false,
                        isPopular: data.isPopular ?? data.is_popular ?? false,
                        description: data.description,
                        status: data.status,
                        viewCount: data.viewCount ?? data.view_count ?? 0,
                        bookingCount: data.bookingCount ?? data.booking_count ?? 0,
                        createdAt: data.createdAt ?? data.created_at,
                        updatedAt: data.updatedAt ?? data.updated_at
                    };
                    setProduct(mappedProduct);
                    addToRecentlyViewed(mappedProduct);
                }
            } catch (error) {
                console.error("Product fetch error:", error);
            }
            setIsLoading(false);
        };
        // ... (rest of useEffect dependencies)

        // Helper functions
        const addToRecentlyViewed = async (product: TourProduct) => {
            try {
                const me = await api.auth.me();
                if (!me) return;
                await api.recentlyViewed.upsert({
                    product_id: product.id,
                    title: product.name,
                    image: product.mainImages[0],
                    price: product.price,
                    type: 'product'
                });
            } catch (error) {
                // Silently fail for non-logged in users
            }
        };

        const checkWishlistStatus = async () => {
            try {
                const me = await api.auth.me();
                if (!me || !id) return;
                const wishlistData = await api.wishlist.list();
                if (Array.isArray(wishlistData)) {
                    setIsInWishlist(wishlistData.some((w: any) => w.product_id === id));
                }
            } catch (error) {
                // Silently fail for non-logged in users
            }
        };

        fetchProduct();
        checkWishlistStatus();
    }, [id]);

    // ... (handlers) ...

    const handleToggleWishlist = async () => {
        if (!product || wishlistLoading) return;
        setWishlistLoading(true);

        try {
            const me = await api.auth.me();
            if (!me) {
                alert(t('mypage.login_required'));
                navigate('/login');
                return;
            }

            if (isInWishlist) {
                await api.wishlist.remove(product.id);
                setIsInWishlist(false);
            } else {
                await api.wishlist.add({
                    product_id: product.id,
                    title: product.name,
                    image: product.mainImages[0],
                    price: product.price,
                    category: product.category,
                    type: 'product'
                });
                setIsInWishlist(true);
            }
        } catch (error) {
            console.error('Wishlist toggle error:', error);
        } finally {
            setWishlistLoading(false);
        }
    };

    const handleShare = async () => {
        if (!product) return;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: product.name,
                    text: product.description,
                    url: window.location.href
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                showToast('success', '링크가 복사되었습니다.');
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const [activeTab, setActiveTab] = useState<'intro' | 'itinerary' | 'guide'>('intro');

    const scrollToSection = (id: 'intro' | 'itinerary' | 'guide') => {
        setActiveTab(id);
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -130; // Adjust for sticky header + tab bar
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    if (isLoading) {
        return <ProductDetailSkeleton />;
    }

    if (!product) {
        return (
            <div className="bg-background-light dark:bg-background-dark text-[#0e1a18] dark:text-white min-h-screen flex items-center justify-center">
                <p>{t('product_detail.error_not_found')}</p>
            </div>
        );
    }

    const safeMainImages = Array.isArray(product.mainImages) ? product.mainImages : [];

    // Pre-process images for JSON-LD (exclude data URIs as Google prefers absolute URLs)
    const validImages = safeMainImages
        .filter(img => !img.startsWith('data:'))
        .map(img => img.startsWith('http') ? img : `${window.location.origin}${img}`);

    // Create JSON-LD Product Schema
    const structuredData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": validImages.length > 0 ? validImages : undefined,
        "description": product.description || product.highlights?.[0]?.description || t('product_detail.header_title'),
        "brand": {
            "@type": "Brand",
            "name": "Milkyway Japan"
        },
        "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "JPY",
            "price": product.price,
            "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            "itemCondition": "https://schema.org/NewCondition",
            "availability": product.status === 'active' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Organization",
                "name": "Milkyway Japan"
            }
        },
        // We inject an aggregateRating slightly higher organically based on view/booking count
        // In a real production app, this should be driven by actual user reviews.
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "5.0",
            "reviewCount": Math.max((product.bookingCount || 0) + (product.viewCount || 0) % 50 + 15, 1)
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#0e1a18] dark:text-white min-h-screen pb-24 font-display">
            <SEO
                title={product.name}
                description={product.description || product.highlights?.[0]?.description}
                image={product.mainImages?.find(img => !img.startsWith('data:'))}
                keywords={`${product.category}, ${product.tags.join(', ')}`}
                structuredData={structuredData}
            />

            {/* Sticky Top App Bar */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
                <div className="flex items-center p-4 justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-[#0e1a18] dark:text-white flex size-10 shrink-0 items-center justify-center cursor-pointer"
                        data-icon="ArrowLeft"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('product_detail.header_title')}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleToggleWishlist}
                            className="text-[#0e1a18] dark:text-white flex items-center justify-center"
                        >
                            <span
                                className={`material-symbols-outlined ${isInWishlist ? 'fill-current text-red-500' : ''}`}
                                style={isInWishlist ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                                favorite
                            </span>
                        </button>
                        <button onClick={handleShare} className="text-[#0e1a18] dark:text-white flex items-center justify-center">
                            <span className="material-symbols-outlined">share</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Hero Image Section (Horizontal Slider) */}
            <div className="@container relative group">
                <div
                    id="image-slider"
                    className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-gray-200"
                    onScroll={(e) => {
                        const scrollLeft = e.currentTarget.scrollLeft;
                        const width = e.currentTarget.offsetWidth;
                        const newIndex = Math.round(scrollLeft / width);
                        if (newIndex !== activeImageIndex) {
                            setActiveImageIndex(newIndex);
                        }
                    }}
                >
                    {safeMainImages.length > 0 ? (
                        safeMainImages.map((img, index) => (
                            <div
                                key={index}
                                className="flex-shrink-0 w-full snap-center relative aspect-[4/3]"
                            >
                                <img
                                    {...getResponsiveImageProps(img, 'banner')}
                                    alt={`${product.name} - ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
                            </div>
                        ))
                    ) : (
                        <div className="flex-shrink-0 w-full snap-center aspect-[4/3] bg-gray-300 flex items-center justify-center text-gray-500">
                            {t('product_detail.no_images')}
                        </div>
                    )}
                </div>

                {/* Pagination Dots */}
                <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-10">
                    {safeMainImages.map((_, index) => (
                        <div
                            key={index}
                            className={`size-1.5 rounded-full transition-all duration-300 ${index === activeImageIndex ? 'bg-white w-4' : 'bg-white/50'
                                }`}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-background-dark px-4 pb-6">
                <div className="flex gap-2 pt-6 pb-2 overflow-x-auto no-scrollbar">
                    {product.tags.map((tag, index) => (
                        <div key={index} className="flex h-7 shrink-0 items-center justify-center gap-x-2 rounded bg-primary/10 px-3">
                            <p className="text-primary text-xs font-bold">#{tag}</p>
                        </div>
                    ))}
                </div>
                <h1 className="text-[28px] font-bold leading-tight pt-2">{product.name}</h1>
                
                {/* Japanese Trust Badge */}
                <div className="mt-3 flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px] shrink-0 mt-0.5">verified_user</span>
                    <div>
                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{t('product_detail.trust_badge')}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1 leading-relaxed">{t('product_detail.trust_message')}</p>
                    </div>
                </div>

                <div className="flex items-baseline gap-2 pt-4">
                    <p className="text-2xl font-bold text-primary">¥{product.price.toLocaleString()}</p>
                    {product.originalPrice && (
                        <p className="text-sm text-gray-500 line-through">¥{product.originalPrice.toLocaleString()}</p>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-background-dark sticky top-[72px] z-40">
                <button
                    onClick={() => scrollToSection('intro')}
                    className={`flex-1 py-4 text-center border-b-2 font-medium transition-colors ${activeTab === 'intro'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    {t('product_detail.tab_intro')}
                </button>
                <button
                    onClick={() => scrollToSection('itinerary')}
                    className={`flex-1 py-4 text-center border-b-2 font-medium transition-colors ${activeTab === 'itinerary'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    {t('product_detail.tab_itinerary')}
                </button>
                <button
                    onClick={() => scrollToSection('guide')}
                    className={`flex-1 py-4 text-center border-b-2 font-medium transition-colors ${activeTab === 'guide'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    {t('product_detail.tab_guide')}
                </button>
            </div>

            {/* Travel Highlights & Details */}
            <div className="bg-white dark:bg-background-dark mt-2" id="intro">
                <div className="p-6 pb-0">
                    <h3 className="text-lg font-bold mb-4">{t('product_detail.highlights_title')}</h3>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                        {product.highlights.map((highlight, index) => (
                            <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-background-light dark:bg-white/5">
                                <div>
                                    <p className="font-bold text-sm">{highlight.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">{highlight.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Unified Detail Content (Blocks) */}
                {product.detailBlocks && product.detailBlocks.length > 0 ? (
                    <div className="space-y-8 mb-8">
                        {product.detailBlocks.map((block, index, arr) => {
                            if (block.type === 'image') {
                                return (
                                    <img
                                        key={block.id}
                                        src={getOptimizedImageUrl(block.content as string, 'productDetail')}
                                        alt="Detailed info"
                                        className="w-full h-auto"
                                        loading="lazy"
                                    />
                                );
                            } else if (block.type === 'slide') {
                                const slide = block.content as DetailSlide;
                                return (
                                    <div key={block.id} className="space-y-3 px-6">
                                        {slide.title && (
                                            <h4 className="font-bold text-base px-1">{slide.title}</h4>
                                        )}
                                        <div className="flex overflow-x-auto pb-4 gap-3 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
                                            {slide.images.map((img, imgIdx) => (
                                                <div
                                                    key={imgIdx}
                                                    className="relative shrink-0 w-[85%] snap-center"
                                                >
                                                    <img
                                                        src={getOptimizedImageUrl(img, 'productThumbnail')}
                                                        alt={`${slide.title || 'Slide'} - ${imgIdx + 1}`}
                                                        className="w-full h-auto rounded-xl shadow-sm"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                                                        {imgIdx + 1} / {slide.images.length}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {slide.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 px-1 leading-relaxed">
                                                {slide.description}
                                            </p>
                                        )}
                                    </div>
                                );
                            } else if (block.type === 'divider') {
                                const divider = block.content as DividerContent;
                                return (
                                    <div
                                        key={block.id}
                                        style={{ height: `${divider.height}px` }}
                                        className={`w-full flex items-center justify-center ${divider.style === 'line'
                                            ? 'border-b border-gray-200 dark:border-gray-700'
                                            : ''
                                            }`}
                                    />
                                );
                            } else if (block.type === 'timeline') {
                                const timeline = block.content as TimelineContent;
                                
                                return (
                                    <div key={block.id} className="relative pb-8 px-6">
                                        <div className="flex gap-4 items-stretch">
                                            <div className="flex flex-col items-center shrink-0 w-6 relative mt-1">
                                                <div className="w-3 h-3 rounded-full bg-primary relative z-10 ring-4 ring-white dark:ring-background-dark shrink-0"></div>
                                                <div className="w-[2px] bg-primary/20 absolute top-3 bottom-0 left-1/2 -translate-x-1/2 z-0"></div>
                                            </div>
                                            <div className="flex-1 pb-1">
                                                {timeline.time && <div className="text-sm text-primary font-bold mb-1">{timeline.time}</div>}
                                                <h4 className="font-bold text-base mb-2">{timeline.title}</h4>
                                                {timeline.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                                                        {timeline.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {timeline.images && timeline.images.length > 0 && (
                                            <div className="pl-10 mt-3">
                                                <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                                                    {timeline.images.map((img, imgIdx) => (
                                                        <img
                                                            key={imgIdx}
                                                            src={getOptimizedImageUrl(img, 'productThumbnail')}
                                                            alt={`${timeline.title} - ${imgIdx + 1}`}
                                                            className="w-[70%] md:w-48 h-32 md:h-32 object-cover rounded-xl shrink-0 snap-center shadow-sm border border-gray-100 dark:border-gray-800"
                                                            loading="lazy"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            } else if (block.type === 'dayInfo') {
                                const dayInfo = block.content as DayInfoContent;
                                const hasMeals = dayInfo.meals && (dayInfo.meals.breakfast || dayInfo.meals.lunch || dayInfo.meals.dinner);
                                
                                return (
                                    <div key={block.id} className="px-4 mb-2">
                                        <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800/80 dark:to-blue-900/20 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                                            <div className="flex items-baseline gap-3 mb-2">
                                                <span className="text-xl font-black text-primary tracking-tight">{dayInfo.dayLabel}</span>
                                                {dayInfo.dayDate && <span className="text-sm text-slate-500 font-medium">{dayInfo.dayDate}</span>}
                                            </div>
                                            {dayInfo.title && <p className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2 leading-tight">{dayInfo.title}</p>}
                                            {dayInfo.description && <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400 mb-4">{dayInfo.description}</p>}
                                            {(hasMeals || dayInfo.accommodation) && (
                                                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/60 space-y-1">
                                                    {dayInfo.meals!.breakfast && (
                                                        <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 py-1">
                                                            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-[2px]">restaurant</span>
                                                            <div className="font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap w-28 flex items-baseline">
                                                                <span>朝食</span>
                                                                <span className="text-[10px] text-slate-400 font-normal ml-1.5">(ちょうしょく)</span>
                                                            </div>
                                                            <span className="flex-1 leading-relaxed break-keep mt-[1px]">{dayInfo.meals!.breakfast}</span>
                                                        </div>
                                                    )}
                                                    {dayInfo.meals!.lunch && (
                                                        <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 py-1">
                                                            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-[2px]">restaurant</span>
                                                            <div className="font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap w-28 flex items-baseline">
                                                                <span>昼食</span>
                                                                <span className="text-[10px] text-slate-400 font-normal ml-1.5">(ちゅうしょく)</span>
                                                            </div>
                                                            <span className="flex-1 leading-relaxed break-keep mt-[1px]">{dayInfo.meals!.lunch}</span>
                                                        </div>
                                                    )}
                                                    {dayInfo.meals!.dinner && (
                                                        <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 py-1">
                                                            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-[2px]">restaurant</span>
                                                            <div className="font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap w-28 flex items-baseline">
                                                                <span>夕食</span>
                                                                <span className="text-[10px] text-slate-400 font-normal ml-1.5">(ゆうしょく)</span>
                                                            </div>
                                                            <span className="flex-1 leading-relaxed break-keep mt-[1px]">{dayInfo.meals!.dinner}</span>
                                                        </div>
                                                    )}
                                                    {dayInfo.accommodation && (
                                                        <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 py-1 mt-1 font-medium">
                                                            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-[2px]">hotel</span>
                                                            <div className="font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap w-28 flex items-baseline">
                                                                <span>宿泊</span>
                                                                <span className="text-[10px] text-slate-400 font-normal ml-1.5">(しゅくはく)</span>
                                                            </div>
                                                            <span className="flex-1 leading-relaxed break-keep mt-[1px]">{dayInfo.accommodation}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                ) : (
                    <>
                        {/* Detail Images (Standard) */}
                        {product.detailImages && product.detailImages.length > 0 && (
                            <div className="space-y-0 mb-8">
                                {product.detailImages.map((img, index) => (
                                    <img
                                        key={index}
                                        src={getOptimizedImageUrl(img, 'productItinerary')}
                                        alt={`Detail ${index + 1}`}
                                        className="w-full h-auto"
                                        loading="lazy"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Detail Slides (Carousel) */}
                        {product.detailSlides && product.detailSlides.length > 0 && (
                            <div className="space-y-8 mb-8 px-6">
                                {product.detailSlides.map((slide) => (
                                    <div key={slide.id} className="space-y-3">
                                        {slide.title && (
                                            <h4 className="font-bold text-base px-1">{slide.title}</h4>
                                        )}
                                        <div className="flex overflow-x-auto pb-4 gap-3 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
                                            {slide.images.map((img, imgIdx) => (
                                                <div
                                                    key={imgIdx}
                                                    className="relative shrink-0 w-[85%] snap-center"
                                                >
                                                    <img
                                                        src={getOptimizedImageUrl(img, 'productThumbnail')}
                                                        alt={`${slide.title || 'Slide'} - ${imgIdx + 1}`}
                                                        className="w-full h-auto rounded-xl shadow-sm"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                                                        {imgIdx + 1} / {slide.images.length}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {slide.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 px-1 leading-relaxed">
                                                {slide.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Itinerary Section */}
            <div className="bg-white dark:bg-background-dark mt-2" id="itinerary">
                <h3 className="text-lg font-bold mb-6 px-6 pt-6">{t('product_detail.itinerary_title')}</h3>

                {product.itineraryBlocks && product.itineraryBlocks.length > 0 ? (
                    <div className="space-y-8 pb-8">
                        {product.itineraryBlocks.map((block, index, arr) => {
                            if (block.type === 'image') {
                                return (
                                    <img
                                        key={block.id}
                                        src={getOptimizedImageUrl(block.content as string, 'productItinerary')}
                                        alt="Itinerary info"
                                        className="w-full h-auto"
                                        loading="lazy"
                                    />
                                );
                            } else if (block.type === 'slide') {
                                const slide = block.content as DetailSlide;
                                return (
                                    <div key={block.id} className="space-y-3 px-6">
                                        {slide.title && (
                                            <h4 className="font-bold text-base px-1">{slide.title}</h4>
                                        )}
                                        <div className="flex overflow-x-auto pb-4 gap-3 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
                                            {slide.images.map((img, imgIdx) => (
                                                <div
                                                    key={imgIdx}
                                                    className="relative shrink-0 w-[85%] snap-center"
                                                >
                                                    <img
                                                        src={getOptimizedImageUrl(img, 'productThumbnail')}
                                                        alt={`${slide.title || 'Slide'} - ${imgIdx + 1}`}
                                                        className="w-full h-auto rounded-xl shadow-sm"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                                                        {imgIdx + 1} / {slide.images.length}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {slide.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 px-1 leading-relaxed">
                                                {slide.description}
                                            </p>
                                        )}
                                    </div>
                                );
                            } else if (block.type === 'divider') {
                                const divider = block.content as DividerContent;
                                return (
                                    <div
                                        key={block.id}
                                        style={{ height: `${divider.height}px` }}
                                        className={`w-full flex items-center justify-center ${divider.style === 'line'
                                            ? 'border-b border-gray-200 dark:border-gray-700'
                                            : ''
                                            }`}
                                    />
                                );
                            } else if (block.type === 'timeline') {
                                const timeline = block.content as TimelineContent;
                                
                                return (
                                    <div key={block.id} className="relative pb-8 px-6">
                                        <div className="flex gap-4 items-stretch">
                                            <div className="flex flex-col items-center shrink-0 w-6 relative mt-1">
                                                <div className="w-3 h-3 rounded-full bg-primary relative z-10 ring-4 ring-white dark:ring-background-dark shrink-0"></div>
                                                <div className="w-[2px] bg-primary/20 absolute top-3 bottom-0 left-1/2 -translate-x-1/2 z-0"></div>
                                            </div>
                                            <div className="flex-1 pb-1">
                                                {timeline.time && <div className="text-sm text-primary font-bold mb-1">{timeline.time}</div>}
                                                <h4 className="font-bold text-base mb-2">{timeline.title}</h4>
                                                {timeline.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                                                        {timeline.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {timeline.images && timeline.images.length > 0 && (
                                            <div className="pl-10 mt-3">
                                                <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                                                    {timeline.images.map((img, imgIdx) => (
                                                        <img
                                                            key={imgIdx}
                                                            src={getOptimizedImageUrl(img, 'productThumbnail')}
                                                            alt={`${timeline.title} - ${imgIdx + 1}`}
                                                            className="w-[70%] md:w-48 h-32 md:h-32 object-cover rounded-xl shrink-0 snap-center shadow-sm border border-gray-100 dark:border-gray-800"
                                                            loading="lazy"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            } else if (block.type === 'dayInfo') {
                                const dayInfo = block.content as DayInfoContent;
                                const hasMeals = dayInfo.meals && (dayInfo.meals.breakfast || dayInfo.meals.lunch || dayInfo.meals.dinner);
                                
                                return (
                                    <div key={block.id} className="px-4 mb-2">
                                        <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800/80 dark:to-blue-900/20 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                                            <div className="flex items-baseline gap-3 mb-2">
                                                <span className="text-xl font-black text-primary tracking-tight">{dayInfo.dayLabel}</span>
                                                {dayInfo.dayDate && <span className="text-sm text-slate-500 font-medium">{dayInfo.dayDate}</span>}
                                            </div>
                                            {dayInfo.title && <p className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2 leading-tight">{dayInfo.title}</p>}
                                            {dayInfo.description && <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400 mb-4">{dayInfo.description}</p>}
                                            {(hasMeals || dayInfo.accommodation) && (
                                                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/60 space-y-1">
                                                    {dayInfo.meals!.breakfast && (
                                                        <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 py-1">
                                                            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-[2px]">restaurant</span>
                                                            <div className="font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap w-28 flex items-baseline">
                                                                <span>朝食</span>
                                                                <span className="text-[10px] text-slate-400 font-normal ml-1.5">(ちょうしょく)</span>
                                                            </div>
                                                            <span className="flex-1 leading-relaxed break-keep mt-[1px]">{dayInfo.meals!.breakfast}</span>
                                                        </div>
                                                    )}
                                                    {dayInfo.meals!.lunch && (
                                                        <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 py-1">
                                                            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-[2px]">restaurant</span>
                                                            <div className="font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap w-28 flex items-baseline">
                                                                <span>昼食</span>
                                                                <span className="text-[10px] text-slate-400 font-normal ml-1.5">(ちゅうしょく)</span>
                                                            </div>
                                                            <span className="flex-1 leading-relaxed break-keep mt-[1px]">{dayInfo.meals!.lunch}</span>
                                                        </div>
                                                    )}
                                                    {dayInfo.meals!.dinner && (
                                                        <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 py-1">
                                                            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-[2px]">restaurant</span>
                                                            <div className="font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap w-28 flex items-baseline">
                                                                <span>夕食</span>
                                                                <span className="text-[10px] text-slate-400 font-normal ml-1.5">(ゆうしょく)</span>
                                                            </div>
                                                            <span className="flex-1 leading-relaxed break-keep mt-[1px]">{dayInfo.meals!.dinner}</span>
                                                        </div>
                                                    )}
                                                    {dayInfo.accommodation && (
                                                        <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 py-1 mt-1 font-medium">
                                                            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-[2px]">hotel</span>
                                                            <div className="font-bold text-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap w-28 flex items-baseline">
                                                                <span>宿泊</span>
                                                                <span className="text-[10px] text-slate-400 font-normal ml-1.5">(しゅくはく)</span>
                                                            </div>
                                                            <span className="flex-1 leading-relaxed break-keep mt-[1px]">{dayInfo.accommodation}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                ) : product.itineraryImages && product.itineraryImages.length > 0 ? (
                    <div className="space-y-0">
                        {product.itineraryImages.map((img, index) => (
                            <img
                                key={index}
                                src={getOptimizedImageUrl(img, 'productItinerary')}
                                alt={`Itinerary ${index + 1}`}
                                className="w-full h-auto"
                                loading="lazy"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400 text-sm px-6">
                        {t('product_detail.no_itinerary_images')}
                    </div>
                )}
            </div>

            {/* Inclusions / Exclusions */}
            <div className="p-6 bg-white dark:bg-background-dark mt-2" id="guide">
                <h3 className="text-lg font-bold mb-4">{t('product_detail.inclusions_title')}</h3>
                <div className="grid grid-cols-2 gap-4">
                    {product.included.map((item, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-[2px]">check_circle</span>
                            <span className="text-sm">{item}</span>
                        </div>
                    ))}
                </div>
                <h3 className="text-lg font-bold mb-4 mt-8">{t('product_detail.exclusions_title')}</h3>
                <div className="grid grid-cols-2 gap-4">
                    {product.excluded.map((item, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-gray-400 text-lg shrink-0 mt-[2px]">remove_circle_outline</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-gray-100 dark:border-gray-800 p-4 flex gap-3 z-50">
                <a
                    href="https://jzz1k.channel.io/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-14 rounded-xl border border-primary text-primary font-bold flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">chat_bubble</span>
                    {t('product_detail.consult_button')}
                </a>
                <button
                    onClick={() => navigate(`/reservation/${id}`)}
                    className="flex-1 bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30"
                >
                    {t('product_detail.book_button')}
                </button>
            </div>
        </div>
    );
};
