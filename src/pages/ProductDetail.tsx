import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { optimizeImage } from '../utils/imageOptimizer';
import { getOptimizedImageUrl, getResponsiveImageProps } from '../utils/cloudflareImage';
import { ProductDetailSkeleton } from '../components/skeletons/ProductDetailSkeleton';
import { ProductCard } from '../components/product/ProductCard';
import { useToast } from '../components/ui/Toast';
import { useTranslation } from 'react-i18next';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { ProductDetailDesktop } from '../components/product-desktop/ProductDetailDesktop';

import type { TourProduct, DetailSlide, DividerContent } from '../types/product';

// Hide broken product images gracefully instead of showing the browser's default error icon.
const hideBrokenImage = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
};

// Normalize a raw product row from the API into the minimal shape ProductCard needs.
const mapProductSummary = (p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.originalPrice ?? p.original_price,
    category: p.category,
    duration: p.duration,
    mainImages: p.mainImages ?? p.main_images ?? [],
    isPopular: p.isPopular ?? p.is_popular === 1,
    isFeatured: p.isFeatured ?? p.is_featured === 1,
    bookingCount: p.bookingCount ?? p.booking_count ?? 0,
});

export const ProductDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const isDesktop = useIsDesktop();
    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState<TourProduct | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [productReviews, setProductReviews] = useState<any[]>([]);
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

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

        const fetchReviews = async () => {
            if (!id) return;
            try {
                const list = await api.reviews.listForProduct(id, true);
                if (Array.isArray(list)) setProductReviews(list);
            } catch {
                // Reviews are optional for rendering — silently ignore.
            }
        };

        const fetchRelatedAndRecentlyViewed = async () => {
            if (!id) return;
            try {
                // Related: fetch all products once, filter same-category and active, exclude current
                const all = await api.products.list();
                if (Array.isArray(all)) {
                    const current = all.find((p: any) => p.id === id);
                    const sameCategory = all.filter((p: any) =>
                        p.id !== id &&
                        p.status === 'active' &&
                        current && p.category === current.category
                    );
                    // Sort by booking_count desc, then by is_popular
                    sameCategory.sort((a: any, b: any) => {
                        const popA = a.is_popular === 1 ? 1 : 0;
                        const popB = b.is_popular === 1 ? 1 : 0;
                        if (popA !== popB) return popB - popA;
                        return (b.booking_count || 0) - (a.booking_count || 0);
                    });
                    setRelatedProducts(sameCategory.slice(0, 6).map(mapProductSummary));
                }
            } catch {
                // Related is optional
            }

            try {
                const viewed = await api.recentlyViewed.list();
                if (Array.isArray(viewed)) {
                    // Exclude current product, keep most recent 8
                    setRecentlyViewed(
                        viewed
                            .filter((v: any) => v.product_id !== id && v.type !== 'magazine')
                            .slice(0, 8)
                    );
                }
            } catch {
                // Silently fail for non-logged-in users
            }
        };

        fetchProduct();
        checkWishlistStatus();
        fetchReviews();
        fetchRelatedAndRecentlyViewed();
    }, [id]);

    // ... (handlers) ...

    const handleToggleWishlist = async () => {
        if (!product || wishlistLoading) return;
        setWishlistLoading(true);

        try {
            const me = await api.auth.me();
            if (!me) {
                showToast('warning', t('product_detail.wishlist_login_required'));
                navigate('/login');
                return;
            }

            if (isInWishlist) {
                await api.wishlist.remove(product.id);
                setIsInWishlist(false);
                showToast('info', t('product_detail.wishlist_remove'));
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
                showToast('success', t('product_detail.wishlist_add'));
            }
        } catch (error) {
            console.error('Wishlist toggle error:', error);
            showToast(
                'error',
                isInWishlist
                    ? t('product_detail.wishlist_remove_failed')
                    : t('product_detail.wishlist_add_failed'),
            );
        } finally {
            setWishlistLoading(false);
        }
    };

    const handleShare = async () => {
        const shareUrl = window.location.href;
        const shareTitle = product?.name ? `${product.name} | Milkyway Japan` : 'Milkyway Japan';
        const shareText = product?.description || product?.name || '';

        // Prefer native share sheet on mobile; silently ignore AbortError when user cancels.
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
                return;
            } catch (err: any) {
                if (err?.name === 'AbortError') return; // user dismissed — nothing to do
                // Fall through to clipboard fallback on other errors.
            }
        }

        // Clipboard fallback
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast('success', t('product_detail.share_copied'));
        } catch {
            // Last-resort manual prompt
            window.prompt(t('product_detail.share_prompt'), shareUrl);
        }
    };

    const [activeTab, setActiveTab] = useState<'intro' | 'itinerary' | 'guide'>('intro');
    // `true` while a click-triggered scroll is running — we pause the IntersectionObserver
    // during that time so the observer doesn't overwrite the user's explicit tab choice
    // with whichever section the viewport passes over on the way.
    const isProgrammaticScrollRef = React.useRef(false);

    const scrollToSection = (id: 'intro' | 'itinerary' | 'guide') => {
        setActiveTab(id);
        const element = document.getElementById(id);
        if (element) {
            isProgrammaticScrollRef.current = true;
            const yOffset = -130; // Adjust for sticky header + tab bar
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
            // Smooth scroll typically completes within ~600ms; add a safety margin.
            window.setTimeout(() => {
                isProgrammaticScrollRef.current = false;
            }, 800);
        }
    };

    // Sync active tab to the section currently in view.
    useEffect(() => {
        if (isLoading || !product) return;
        const ids = ['intro', 'itinerary', 'guide'] as const;
        const sections = ids
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null);
        if (sections.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            if (isProgrammaticScrollRef.current) return;
            // Pick the entry closest to the top that is currently intersecting.
            const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (visible && ids.includes(visible.target.id as any)) {
                setActiveTab(visible.target.id as 'intro' | 'itinerary' | 'guide');
            }
        }, {
            // The top of the "active" zone sits just below the sticky header+tab bar (~128px),
            // and we consider a section "current" until it has scrolled 60% out of the viewport.
            rootMargin: '-130px 0px -50% 0px',
            threshold: 0,
        });

        sections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    }, [isLoading, product]);

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

    // Enhanced Product description for meta
    const productMetaDescription = [
        product.name,
        product.duration ? `（${product.duration}）` : '',
        product.category ? `【${product.category}】` : '',
        product.description || product.highlights?.[0]?.description || '',
        product.price ? `¥${product.price.toLocaleString()}〜` : ''
    ].filter(Boolean).join(' ').substring(0, 160);

    // ── Aggregate rating + sample reviews from approved user reviews ──
    const approvedReviews = productReviews.filter((r: any) => r.is_approved === 1 || r.is_approved === true);
    const ratingSum = approvedReviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0);
    const avgRating = approvedReviews.length > 0 ? Number((ratingSum / approvedReviews.length).toFixed(1)) : 0;
    // Google requires a minimum to show rich rating snippets; be conservative.
    const aggregateRating = approvedReviews.length >= 1 ? {
        "@type": "AggregateRating",
        "ratingValue": avgRating,
        "reviewCount": approvedReviews.length,
        "bestRating": 5,
        "worstRating": 1,
    } : undefined;

    // Up to 5 most recent reviews embedded as Review nodes
    const reviewLd = approvedReviews.slice(0, 5).map((r: any) => ({
        "@type": "Review",
        "author": { "@type": "Person", "name": r.user_name || r.author_name || '匿名' },
        "datePublished": r.created_at ? String(r.created_at).split(' ')[0] : undefined,
        "reviewRating": { "@type": "Rating", "ratingValue": Number(r.rating) || 5, "bestRating": 5, "worstRating": 1 },
        "reviewBody": r.content || r.title || '',
        "name": r.title || undefined,
    }));

    // ── Section content flags (used to hide empty tabs and sections) ──
    const hasIntroContent =
        (product.highlights?.length ?? 0) > 0 ||
        (product.detailBlocks?.length ?? 0) > 0 ||
        (product.detailImages?.length ?? 0) > 0 ||
        (product.detailSlides?.length ?? 0) > 0;

    const hasItineraryContent =
        (product.itineraryBlocks?.length ?? 0) > 0 ||
        (product.itineraryImages?.length ?? 0) > 0;

    const hasGuideContent =
        (product.included?.length ?? 0) > 0 ||
        (product.excluded?.length ?? 0) > 0;

    // ── Offer: AggregateOffer when multiple pricing options exist ──
    const pricingOptionPrices = Array.isArray(product.pricingOptions)
        ? product.pricingOptions.map((p: any) => Number(p.price)).filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
    const availability = product.status === 'active' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
    const priceValidUntil = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    // Tour bookings are digital: no shipping, so declare free/instant. Satisfies Google's
    // Merchant Listing "shippingDetails missing" warning.
    const shippingDetails = {
        "@type": "OfferShippingDetails",
        "shippingRate": { "@type": "MonetaryAmount", "value": 0, "currency": "JPY" },
        "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "JP" },
        "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 0, "unitCode": "DAY" },
            "transitTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 0, "unitCode": "DAY" },
        },
    };
    // 14-day cancellation window — baseline tour policy. Satisfies "hasMerchantReturnPolicy missing".
    const merchantReturnPolicy = {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "JP",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 14,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn",
    };

    const offersLd = pricingOptionPrices.length > 1 ? {
        "@type": "AggregateOffer",
        "priceCurrency": "JPY",
        "lowPrice": Math.min(...pricingOptionPrices),
        "highPrice": Math.max(...pricingOptionPrices),
        "offerCount": pricingOptionPrices.length,
        "availability": availability,
        "url": window.location.href,
        "seller": { "@type": "Organization", "name": "Milkyway Japan" },
        "shippingDetails": shippingDetails,
        "hasMerchantReturnPolicy": merchantReturnPolicy,
    } : {
        "@type": "Offer",
        "url": window.location.href,
        "priceCurrency": "JPY",
        "price": product.price,
        "priceValidUntil": priceValidUntil,
        "itemCondition": "https://schema.org/NewCondition",
        "availability": availability,
        "seller": { "@type": "Organization", "name": "Milkyway Japan" },
        "shippingDetails": shippingDetails,
        "hasMerchantReturnPolicy": merchantReturnPolicy,
    };

    // Create JSON-LD Product Schema (enhanced) — dual-typed for travel rich results.
    const productStructuredData: any = {
        "@context": "https://schema.org/",
        "@type": ["Product", "TouristTrip"],
        "name": product.name,
        "image": validImages.length > 0 ? validImages : undefined,
        "description": (product.included && product.included.length > 0)
            ? `${product.description || ''}。ツアーに含まれるもの: ${product.included.join('、')}`
            : (product.description || product.highlights?.[0]?.description || t('product_detail.header_title')),
        "brand": { "@type": "Brand", "name": "Milkyway Japan" },
        "category": product.category || "モンゴルツアー",
        "touristType": product.category || "モンゴルツアー",
        ...(product.duration ? { "additionalProperty": [
            { "@type": "PropertyValue", "name": "所要時間", "value": product.duration }
        ]} : {}),
        "offers": offersLd,
        ...(aggregateRating ? { "aggregateRating": aggregateRating } : {}),
        ...(reviewLd.length > 0 ? { "review": reviewLd } : {}),
    };

    // BreadcrumbList for navigation context
    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "ホーム", "item": "https://mongolryokou.com/" },
            { "@type": "ListItem", "position": 2, "name": "モンゴルツアー商品", "item": "https://mongolryokou.com/products" },
            { "@type": "ListItem", "position": 3, "name": product.name, "item": `https://mongolryokou.com/products/${id}` }
        ]
    };

    // ====== DESKTOP RENDER ======
    if (isDesktop) {
        return (
            <>
                <SEO
                    title={product.name}
                    description={productMetaDescription}
                    image={product.mainImages?.find(img => !img.startsWith('data:'))}
                    keywords={`${product.category}, ${product.tags.join(', ')}, モンゴルツアー, モンゴル旅行`}
                    canonical={`/products/${id}`}
                    structuredData={[productStructuredData, breadcrumbData]}
                />
                <DesktopLayout>
                    <ProductDetailDesktop
                        product={product}
                        reviews={productReviews}
                        onBook={() => navigate(`/reservation/${product.id}`)}
                    />
                </DesktopLayout>
            </>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#0e1a18] dark:text-white min-h-screen pb-24 font-display">
            <SEO
                title={product.name}
                description={productMetaDescription}
                image={product.mainImages?.find(img => !img.startsWith('data:'))}
                keywords={`${product.category}, ${product.tags.join(', ')}, モンゴルツアー, モンゴル旅行`}
                canonical={`/products/${id}`}
                structuredData={[productStructuredData, breadcrumbData]}
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
                            disabled={wishlistLoading}
                            aria-label={isInWishlist ? t('product_detail.wishlist_remove') : t('product_detail.wishlist_add')}
                            aria-pressed={isInWishlist}
                            className={`text-[#0e1a18] dark:text-white flex size-10 items-center justify-center transition-opacity ${wishlistLoading ? 'opacity-50 cursor-wait' : 'active:scale-95'}`}
                        >
                            <span
                                className={`material-symbols-outlined ${isInWishlist ? 'fill-current text-red-500' : ''}`}
                                style={isInWishlist ? { fontVariationSettings: "'FILL' 1" } : undefined}
                            >
                                favorite
                            </span>
                        </button>
                        <button
                            onClick={handleShare}
                            aria-label={t('product_detail.share_label')}
                            className="text-[#0e1a18] dark:text-white flex size-10 items-center justify-center active:scale-95"
                        >
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
                                    loading={index === 0 ? 'eager' : 'lazy'}
                                    fetchPriority={index === 0 ? 'high' : 'auto'}
                                    decoding="async"
                                    onError={hideBrokenImage}
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

                {/* Urgency Badges — top-left corner of hero */}
                <div className="absolute top-4 left-4 flex gap-1.5 z-10">
                    {product.isPopular && (
                        <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                            {t('product_detail.badge_popular')}
                        </span>
                    )}
                    {!product.isPopular && product.isFeatured && (
                        <span className="bg-primary text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            {t('product_detail.badge_new')}
                        </span>
                    )}
                    {(product.bookingCount ?? 0) >= 5 && (
                        <span className="bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            {t('product_detail.badge_booked', { count: product.bookingCount })}
                        </span>
                    )}
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
                <div className="flex items-baseline gap-2 pt-2">
                    <p className="text-2xl font-bold text-primary">¥{product.price.toLocaleString()}</p>
                    {product.originalPrice && (
                        <p className="text-sm text-gray-500 line-through">¥{product.originalPrice.toLocaleString()}</p>
                    )}
                </div>
            </div>

            {/* Tab Navigation — only show tabs whose target section has content */}
            {(hasIntroContent || hasItineraryContent || hasGuideContent) && (
                <div className="flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-background-dark sticky top-[72px] z-40">
                    {hasIntroContent && (
                        <button
                            onClick={() => scrollToSection('intro')}
                            className={`flex-1 py-4 text-center border-b-2 font-medium transition-colors ${activeTab === 'intro'
                                ? 'border-primary text-primary font-bold'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {t('product_detail.tab_intro')}
                        </button>
                    )}
                    {hasItineraryContent && (
                        <button
                            onClick={() => scrollToSection('itinerary')}
                            className={`flex-1 py-4 text-center border-b-2 font-medium transition-colors ${activeTab === 'itinerary'
                                ? 'border-primary text-primary font-bold'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {t('product_detail.tab_itinerary')}
                        </button>
                    )}
                    {hasGuideContent && (
                        <button
                            onClick={() => scrollToSection('guide')}
                            className={`flex-1 py-4 text-center border-b-2 font-medium transition-colors ${activeTab === 'guide'
                                ? 'border-primary text-primary font-bold'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {t('product_detail.tab_guide')}
                        </button>
                    )}
                </div>
            )}

            {/* Travel Highlights & Details */}
            {hasIntroContent && (
            <div className="bg-white dark:bg-background-dark mt-2" id="intro">
                {product.highlights && product.highlights.length > 0 && (
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
                )}

                {/* Unified Detail Content (Blocks) */}
                {product.detailBlocks && product.detailBlocks.length > 0 ? (
                    <div className="space-y-8 mb-8">
                        {product.detailBlocks.map(block => {
                            if (block.type === 'image') {
                                return (
                                    <img
                                        key={block.id}
                                        src={getOptimizedImageUrl(block.content as string, 'productDetail')}
                                        alt="Detailed info"
                                        className="w-full h-auto"
                                        loading="lazy"
                                        decoding="async"
                                        onError={hideBrokenImage}
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
                                                        decoding="async"
                                                        onError={hideBrokenImage}
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
                            }
                            // Unknown block type — log and skip so the page doesn't render blank.
                            if (import.meta.env.DEV) {
                                console.warn('[ProductDetail] Unknown detail block type:', block.type, block);
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
                                        decoding="async"
                                        onError={hideBrokenImage}
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
                                                        decoding="async"
                                                        onError={hideBrokenImage}
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
            )}

            {/* Itinerary Section */}
            {hasItineraryContent && (
            <div className="bg-white dark:bg-background-dark mt-2" id="itinerary">
                <h3 className="text-lg font-bold mb-6 px-6 pt-6">{t('product_detail.itinerary_title')}</h3>

                {product.itineraryBlocks && product.itineraryBlocks.length > 0 ? (
                    <div className="space-y-8 pb-8">
                        {product.itineraryBlocks.map(block => {
                            if (block.type === 'image') {
                                return (
                                    <img
                                        key={block.id}
                                        src={getOptimizedImageUrl(block.content as string, 'productItinerary')}
                                        alt="Itinerary info"
                                        className="w-full h-auto"
                                        loading="lazy"
                                        decoding="async"
                                        onError={hideBrokenImage}
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
                                                        decoding="async"
                                                        onError={hideBrokenImage}
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
                            }
                            // Unknown block type — log and skip so the page doesn't render blank.
                            if (import.meta.env.DEV) {
                                console.warn('[ProductDetail] Unknown itinerary block type:', block.type, block);
                            }
                            return null;
                        })}
                    </div>
                ) : (
                    <div className="space-y-0">
                        {product.itineraryImages!.map((img, index) => (
                            <img
                                key={index}
                                src={getOptimizedImageUrl(img, 'productItinerary')}
                                alt={`Itinerary ${index + 1}`}
                                className="w-full h-auto"
                                loading="lazy"
                                decoding="async"
                                onError={hideBrokenImage}
                            />
                        ))}
                    </div>
                )}
            </div>
            )}

            {/* Customer Reviews Section */}
            {approvedReviews.length > 0 && (
                <div className="p-6 bg-white dark:bg-background-dark mt-2" id="reviews">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            {t('product_detail.reviews_title')}
                            <span className="text-sm font-normal text-gray-400">({approvedReviews.length})</span>
                        </h3>
                        {avgRating > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-yellow-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <span className="text-lg font-bold">{avgRating}</span>
                                <span className="text-xs text-gray-400">/ 5</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        {approvedReviews.slice(0, 3).map((review: any) => {
                            const reviewImages = (() => {
                                const imgs = review.images;
                                if (!imgs) return [];
                                if (Array.isArray(imgs)) return imgs;
                                if (typeof imgs === 'string') {
                                    try { const parsed = JSON.parse(imgs); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
                                }
                                return [];
                            })();
                            const displayName = review.user_name || review.author_name || '匿名';
                            const initial = displayName.charAt(0);
                            return (
                                <div key={review.id} className="pb-5 border-b border-gray-100 dark:border-gray-800 last:border-b-0 last:pb-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                            {initial}
                                        </div>
                                        <span className="text-sm font-semibold truncate min-w-0">{displayName} 様</span>
                                        <span className="text-yellow-500 text-xs shrink-0" aria-label={t('product_detail.rating_aria', { rating: review.rating || 5 })}>
                                            {'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 5)))}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                        {review.content}
                                    </p>
                                    {reviewImages.length > 0 && (
                                        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                                            {reviewImages.slice(0, 4).map((img: string, i: number) => (
                                                <img
                                                    key={i}
                                                    src={getOptimizedImageUrl(img, 'thumbnailSmall')}
                                                    alt={`${displayName}様のレビュー写真 ${i + 1}`}
                                                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                                    loading="lazy"
                                                    decoding="async"
                                                    onError={hideBrokenImage}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => navigate('/reviews')}
                        className="w-full mt-5 py-3 text-center text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                    >
                        {t('product_detail.reviews_view_all')}
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                </div>
            )}

            {/* Inclusions / Exclusions */}
            {hasGuideContent && (
                <div className="p-6 bg-white dark:bg-background-dark mt-2" id="guide">
                    {product.included && product.included.length > 0 && (
                        <>
                            <h3 className="text-lg font-bold mb-4">{t('product_detail.inclusions_title')}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {product.included.map((item, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-[2px]">check_circle</span>
                                        <span className="text-sm">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {product.excluded && product.excluded.length > 0 && (
                        <>
                            <h3 className={`text-lg font-bold mb-4 ${product.included && product.included.length > 0 ? 'mt-8' : ''}`}>{t('product_detail.exclusions_title')}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {product.excluded.map((item, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-gray-400 text-lg shrink-0 mt-[2px]">remove_circle_outline</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <section className="bg-white dark:bg-background-dark mt-2 pt-6 pb-6">
                    <h3 className="text-lg font-bold mb-4 px-6">{t('product_detail.related_title')}</h3>
                    <div className="flex overflow-x-auto gap-3 px-6 pb-2 scrollbar-hide snap-x snap-mandatory">
                        {relatedProducts.map((rel) => (
                            <div key={rel.id} className="flex-shrink-0 w-[180px] snap-start relative">
                                {(rel.isPopular || rel.bookingCount >= 5) && (
                                    <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                        {rel.isPopular
                                            ? t('product_detail.badge_popular')
                                            : t('product_detail.badge_booked', { count: rel.bookingCount })}
                                    </span>
                                )}
                                <ProductCard product={rel} imageHeight="aspect-[4/3]" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
                <section className="bg-white dark:bg-background-dark mt-2 pt-6 pb-6">
                    <h3 className="text-lg font-bold mb-4 px-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">history</span>
                        {t('product_detail.recently_viewed_title')}
                    </h3>
                    <div className="flex overflow-x-auto gap-3 px-6 pb-2 scrollbar-hide snap-x snap-mandatory">
                        {recentlyViewed.map((item: any) => (
                            <div
                                key={item.product_id}
                                onClick={() => navigate(`/products/${item.product_id}`)}
                                className="flex-shrink-0 w-[140px] snap-start cursor-pointer active:scale-95 transition-transform"
                            >
                                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
                                    {item.image ? (
                                        <img
                                            src={getOptimizedImageUrl(item.image, 'thumbnailSmall')}
                                            alt={item.title}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                            onError={hideBrokenImage}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <span className="material-symbols-outlined text-3xl">image</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs font-bold line-clamp-2 text-[#0e1a18] dark:text-white">
                                    {item.title}
                                </p>
                                {item.price && (
                                    <p className="text-xs font-bold text-primary mt-1">
                                        ¥{typeof item.price === 'number' ? item.price.toLocaleString() : item.price}〜
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Floating Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-background-dark border-t border-gray-100 dark:border-gray-800 p-4 flex gap-3 z-50">
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
