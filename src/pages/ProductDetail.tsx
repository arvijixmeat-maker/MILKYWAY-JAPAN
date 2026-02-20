import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { SEO } from '../components/seo/SEO';
import { optimizeImage } from '../utils/imageOptimizer';
import { getOptimizedImageUrl, getResponsiveImageProps } from '../utils/supabaseImage';
import { ProductDetailSkeleton } from '../components/skeletons/ProductDetailSkeleton';
import { useTranslation } from 'react-i18next';

import type { TourProduct, DetailSlide, DividerContent } from '../types/product';

export const ProductDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState<TourProduct | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            setIsLoading(true);

            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                // Map fields
                const mappedProduct: TourProduct = {
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
                    detailBlocks: data.detail_blocks || [], // New Unified Blocks
                    itineraryBlocks: data.itinerary_blocks || [],
                    itineraryImages: data.itinerary_images || [],
                    status: data.status,
                    isFeatured: data.is_featured,
                    highlights: data.highlights || [],
                    included: data.included || [],
                    excluded: data.excluded || [],
                    viewCount: data.view_count,
                    bookingCount: data.booking_count,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };

                setProduct(mappedProduct);
                addToRecentlyViewed(mappedProduct);
            } else {
                console.error("Product fetch error:", error);
            }
            setIsLoading(false);
        };
        // ... (rest of useEffect dependencies)

        // Helper functions
        const addToRecentlyViewed = async (product: TourProduct) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from('recently_viewed').upsert({
                user_id: user.id,
                product_id: product.id,
                title: product.name,
                image: product.mainImages[0],
                price: product.price,
                type: 'product',
                created_at: new Date().toISOString()
            }, { onConflict: 'user_id, product_id' });
        };

        const checkWishlistStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !id) return;

            const { data } = await supabase
                .from('wishlist')
                .select('id')
                .eq('user_id', user.id)
                .eq('product_id', id)
                .maybeSingle();

            setIsInWishlist(!!data);
        };

        fetchProduct();
        checkWishlistStatus();
    }, [id]);

    // ... (handlers) ...

    const handleToggleWishlist = async () => {
        if (!product || wishlistLoading) return;
        setWishlistLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('로그인이 필요한 서비스입니다.');
                navigate('/login');
                return;
            }

            if (isInWishlist) {
                // Remove
                const { error } = await supabase
                    .from('wishlist')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', product.id);

                if (!error) setIsInWishlist(false);
            } else {
                // Add
                const { error } = await supabase
                    .from('wishlist')
                    .insert({
                        user_id: user.id,
                        product_id: product.id,
                        title: product.name,
                        image: product.mainImages[0],
                        price: product.price,
                        category: product.category,
                        type: 'product'
                    });

                if (!error) setIsInWishlist(true);
            }
        } catch (error) {
            console.error('Wishlist toggle error:', error);
        } finally {
            setWishlistLoading(false);
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

    const structuredData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": (product.mainImages || []).filter(img => !img.startsWith('data:')),
        "description": product.description || product.highlights?.[0]?.description,
        "offers": {
            "@type": "Offer",
            "priceCurrency": "KRW",
            "price": product.price,
            "availability": "https://schema.org/InStock",
            "url": window.location.href
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8", // Mock rating, replace with actual if available
            "reviewCount": product.viewCount || "10"
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
                        <button className="text-[#0e1a18] dark:text-white flex items-center justify-center">
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
                    {product.mainImages && product.mainImages.length > 0 ? (
                        product.mainImages.map((img, index) => (
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
                    {product.mainImages.map((_, index) => (
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
                <div className="flex items-baseline gap-2 pt-2">
                    <p className="text-2xl font-bold text-primary">₩{product.price.toLocaleString()}</p>
                    {product.originalPrice && (
                        <p className="text-sm text-gray-500 line-through">₩{product.originalPrice.toLocaleString()}</p>
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
                        {product.detailBlocks.map(block => {
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
                        {product.itineraryBlocks.map(block => {
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
                    href="https://pf.kakao.com/_BSLaxl"
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
