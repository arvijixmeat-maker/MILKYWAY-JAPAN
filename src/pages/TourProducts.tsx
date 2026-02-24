import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// @ts-ignore
import { FixedSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { optimizeImage } from '../utils/imageOptimizer';
import { ProductSkeleton } from '../components/skeletons/ProductSkeleton';
import { ProductCard } from '../components/product/ProductCard';

import { BottomNav } from '../components/layout/BottomNav';
import type { TourProduct } from '../types/product';
import { DEFAULT_CATEGORIES, type Category } from '../types/category';
import { useTranslation } from 'react-i18next';

interface EventBanner {
    id: string;
    image?: string;
    backgroundColor: string;
    tag: string;
    title: string;
    icon: string;
    link: string;
    location?: 'home' | 'products' | 'all';
}

export const TourProducts: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation();

    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'price_high'>('recommended');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // 1. Fetch Categories
    const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            try {
                const data = await api.categories.list('product');
                if (!Array.isArray(data) || data.length === 0) return [];
                return data.filter((c: any) => c.type === 'product' || !c.type).map((c: any) => ({
                    id: c.id,
                    icon: c.icon,
                    name: c.name,
                    description: c.description,
                    isActive: c.is_active,
                    order: c.order,
                    type: c.type || 'product'
                }));
            } catch (error) {
                console.error('Error fetching categories:', error);
                return [];
            }
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    // 2. Fetch Event Banners
    const { data: eventBanners = [], isLoading: isEventBannersLoading } = useQuery({
        queryKey: ['eventBanners'],
        queryFn: async () => {
            try {
                const data = await api.eventBanners.list();
                if (!Array.isArray(data) || data.length === 0) return [];
                return data.map((e: any) => ({
                    id: e.id,
                    image: e.image,
                    backgroundColor: e.background_color || '#0F766E',
                    tag: e.tag,
                    title: e.title,
                    icon: e.icon,
                    link: e.link,
                    location: e.location
                }));
            } catch (error) {
                console.error('Error fetching event banners:', error);
                return [];
            }
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // 3. Fetch Products
    const { data: products = [], isLoading: isProductsLoading } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            try {
                const data = await api.products.list();
                if (!Array.isArray(data)) return [];
                return data.filter((item: any) => item.status === 'active').map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    originalPrice: item.original_price,
                    duration: item.duration,
                    category: item.category,
                    mainImages: item.mainImages || item.main_images || [],
                    isPopular: item.is_popular,
                    tags: item.tags || [],
                    description: item.description,
                    galleryImages: item.galleryImages || item.gallery_images || [],
                    detailImages: item.detailImages || item.detail_images || [],
                    itineraryImages: item.itineraryImages || item.itinerary_images || [],
                    status: item.status,
                    isFeatured: item.is_featured,
                    highlights: item.highlights || [],
                    included: item.included || [],
                    excluded: item.excluded || [],
                    viewCount: item.view_count,
                    bookingCount: item.booking_count,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at
                }));
            } catch (error) {
                console.error('Error fetching products:', error);
                return [];
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Filter and Sort products
    const filteredProducts = useMemo(() => {
        let result = products;

        // 1. Category Filter
        if (selectedCategory !== 'all') {
            const category = categories.find(c => c.id === selectedCategory);
            if (category) {
                result = result.filter(p => p.category === category.name);
            }
        }

        // 2. Search Filter (Name or Tags)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // 3. Sorting
        switch (sortBy) {
            case 'price_low':
                return [...result].sort((a, b) => a.price - b.price);
            case 'price_high':
                return [...result].sort((a, b) => b.price - a.price);
            case 'recommended':
            default:
                // Sort by popular first, then by view count (mock) or ID
                return [...result].sort((a, b) => (Number(b.isPopular || 0) - Number(a.isPopular || 0)));
        }
    }, [products, selectedCategory, categories, searchQuery, sortBy]);

    // Handle category change
    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        if (categoryId === 'all') {
            setSearchParams({});
        } else {
            setSearchParams({ category: categoryId });
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white transition-colors duration-300 min-h-screen pb-24">
            <SEO
                title={t('products.seo_title')}
                description={t('products.seo_description')}
                keywords={t('products.seo_keywords')}
            />
            {/* Top App Bar & Search */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
                <div className="flex items-center p-4 pb-2 justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="text-[#0e1a18] dark:text-white flex size-12 shrink-0 items-center justify-center -ml-2"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">{t('products.header_title')}</h2>
                    <div className="flex w-12 items-center justify-end absolute right-4">
                    </div>
                </div>
                {/* Search Bar */}
                <div className="px-4 pb-3">
                    <div className="flex gap-2">
                        <div className="relative flex flex-1 items-center rounded-xl bg-[#f2f4f6] dark:bg-gray-800 h-12 transition-all focus-within:ring-2 focus-within:ring-primary/50">
                            <div className="flex items-center justify-center pl-4 text-text-sub-light dark:text-text-sub-dark pointer-events-none">
                                <span className="material-symbols-outlined text-[22px]">search</span>
                            </div>
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-base font-medium placeholder:text-text-sub-light/70 dark:placeholder:text-text-sub-dark/70 px-3 text-text-main-light dark:text-text-main-dark"
                                placeholder={t('products.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f2f4f6] dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[22px]">tune</span>
                        </button>
                    </div>
                </div>
                {/* Horizontal Tabs */}
                <div className="pb-2 mt-2">
                    <div className="flex overflow-x-auto hide-scrollbar px-4 gap-4 border-b border-[#d1e6e2] dark:border-white/10 no-scrollbar py-3">
                        {categories.filter(c => c.isActive).map((category) => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryChange(category.id)}
                                className="flex flex-col items-center gap-2 shrink-0"
                            >
                                <div className={`relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center transition-all ${selectedCategory === category.id
                                    ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background-dark'
                                    : 'opacity-80 hover:opacity-100'
                                    }`}>
                                    {category.icon.startsWith('data:') ? (
                                        <img
                                            src={category.icon}
                                            alt={category.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${selectedCategory === category.id ? 'bg-primary/10' : 'bg-gray-100 dark:bg-white/10'
                                            }`}>
                                            <span
                                                className={`material-symbols-outlined text-2xl ${selectedCategory === category.id ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                                                    }`}
                                            >
                                                {category.icon}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-xs font-medium ${selectedCategory === category.id ? 'text-primary font-bold' : 'text-[#0e1a18] dark:text-white'
                                    }`}>
                                    {category.name}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main>
                {/* Section: Popular Products Horizontal Scroll */}
                {/* Section: Popular Products Horizontal Scroll - Only show when 'all' is selected */}
                {selectedCategory === 'all' && (
                    <section className="p-4 overflow-hidden">
                        <h3 className="text-lg font-bold leading-tight mb-4 text-[#0e1a18] dark:text-white">{t('products.popular_products')}</h3>
                        {/* Horizontal Scroll Container */}
                        <div className="flex overflow-x-auto gap-4 scroll-smooth no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-4">
                            {products.filter(p => p.isPopular).map((product) => (
                                <div
                                    key={product.id}
                                    onClick={() => navigate(`/products/${product.id}`)}
                                    className="flex-shrink-0 w-[280px] snap-center flex flex-col bg-white dark:bg-white/5 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className="relative w-full h-[160px] bg-gray-100 dark:bg-gray-800">
                                        <img
                                            src={optimizeImage(product.mainImages[0], { width: 600, height: 340 })}
                                            alt={product.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                            width="280"
                                            height="160"
                                        />
                                        <div className="absolute top-3 left-3 bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                            <span className="material-symbols-outlined text-xs">favorite</span>
                                            {t('products.popular_badge')}
                                        </div>
                                        {product.tags && product.tags.length > 0 && (
                                            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-lg">
                                                #{product.tags[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-primary text-xs font-semibold">{product.category}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.duration}</p>
                                        </div>
                                        <p className="text-[#0e1a18] dark:text-white text-base font-bold leading-tight mb-3 line-clamp-2 min-h-[40px]">
                                            {product.name}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-lg font-bold text-primary">¥{typeof product.price === 'number' ? product.price.toLocaleString() : (product.price || 0)}</p>
                                                {product.originalPrice && (
                                                    <p className="text-xs text-gray-400 line-through">¥{typeof product.originalPrice === 'number' ? product.originalPrice.toLocaleString() : (product.originalPrice || 0)}</p>
                                                )}
                                            </div>
                                            <button className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                {t('products.details_button')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Section: Grid Grid Layout */}
                <section className="flex-1 h-full px-4 pb-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-[#0e1a18] dark:text-white">
                            {selectedCategory === 'all' ? t('products.explore_all') : categories.find(c => c.id === selectedCategory)?.name || t('products.explore_category')}
                        </h3>
                        <span className="text-xs text-gray-400">{t('products.total_count', { count: filteredProducts.length })}</span>
                    </div>

                    {/* Virtualized Grid */}
                    <div className="h-[600px] w-full">
                        {/* @ts-ignore */}
                        <AutoSizer>
                            {({ height, width }: { height: number, width: number }) => {
                                const COLUMN_COUNT = 2; // 2 items per row
                                const GAP = 16;
                                const itemWidth = (width - GAP) / COLUMN_COUNT;
                                const rowHeight = itemWidth + 110; // Image aspect-square + content height estimate

                                const rowCount = Math.ceil((isProductsLoading ? 6 : filteredProducts.length) / COLUMN_COUNT);

                                const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
                                    const startIndex = index * COLUMN_COUNT;

                                    // Render Skeletons if loading
                                    if (isProductsLoading) {
                                        return (
                                            <div style={style} className="flex gap-4">
                                                <div style={{ width: itemWidth, height: '100%' }}>
                                                    <ProductSkeleton />
                                                </div>
                                                <div style={{ width: itemWidth, height: '100%' }}>
                                                    <ProductSkeleton />
                                                </div>
                                            </div>
                                        );
                                    }

                                    const product1 = filteredProducts[startIndex];
                                    const product2 = filteredProducts[startIndex + 1];

                                    return (
                                        <div style={{ ...style, marginBottom: GAP }} className="flex gap-4">
                                            {product1 && (
                                                <div style={{ width: itemWidth, height: '100%' }}>
                                                    <ProductCard product={product1} />
                                                </div>
                                            )}
                                            {product2 && (
                                                <div style={{ width: itemWidth, height: '100%' }}>
                                                    <ProductCard product={product2} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                };

                                return (
                                    <List
                                        height={height}
                                        itemCount={rowCount}
                                        itemSize={rowHeight + GAP}
                                        width={width}
                                        className="no-scrollbar"
                                    >
                                        {Row}
                                    </List>
                                );
                            }}
                        </AutoSizer>
                    </div>
                </section>

                {/* Section: Event Banners (Horizontal Scroll) */}
                <section className="mb-8 mt-2">
                    <div className="flex overflow-x-auto snap-x snap-mandatory px-4 gap-4 no-scrollbar pb-2">
                        {eventBanners.filter(b => !b.location || b.location === 'products' || b.location === 'all').length > 0 ? (
                            eventBanners
                                .filter(b => !b.location || b.location === 'products' || b.location === 'all')
                                .map((banner) => (
                                    <div
                                        key={banner.id}
                                        onClick={() => banner.link && navigate(banner.link)}
                                        className="relative w-[85%] shrink-0 snap-center p-6 rounded-2xl overflow-hidden shadow-lg cursor-pointer active:scale-95 transition-transform"
                                        style={{
                                            background: banner.image ? `url('${banner.image}') center/cover` : banner.backgroundColor
                                        }}
                                    >
                                        {/* Overlay for readability if image exists */}
                                        {banner.image && <div className="absolute inset-0 bg-black/40"></div>}

                                        <div className="relative z-10 flex justify-between items-center h-full text-white">
                                            <div className="flex-1 pr-4">
                                                <p className="text-xs font-bold opacity-90 mb-1 uppercase tracking-wider">{banner.tag}</p>
                                                <h4 className="text-xl font-bold leading-tight mb-4 whitespace-pre-wrap">{banner.title}</h4>
                                                <button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-white hover:text-primary transition-all">
                                                    {t('products.details_button')}
                                                </button>
                                            </div>
                                            <div className="flex flex-col justify-end">
                                                <span className="material-symbols-outlined text-6xl opacity-80">{banner.icon}</span>
                                            </div>
                                        </div>

                                        {/* Decorative elements */}
                                        <div className="absolute -right-10 -bottom-10 size-40 bg-white/10 rounded-full blur-2xl"></div>
                                    </div>
                                ))
                        ) : (
                            // Fallback if no banners
                            <div className="w-full p-6 rounded-2xl bg-teal-700 text-white flex items-center justify-between relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-sm font-medium opacity-90 mb-1">{t('products.custom_banner.text')}</p>
                                    <h4 className="text-xl font-bold leading-tight mb-4">{t('products.custom_banner.title')}</h4>
                                    <button className="bg-white text-teal-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm">{t('products.custom_banner.button')}</button>
                                </div>
                                <div className="relative z-10">
                                    <span className="material-symbols-outlined text-6xl opacity-30">description</span>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Bottom Navigation Bar */}
            <BottomNav />

            {/* Filter Bottom Sheet Modal */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsFilterOpen(false)}
                    />

                    {/* Sheet Content */}
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 fade-in duration-300">
                        <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6 sm:hidden" />

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('products.sort_filter_title')}</h3>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 block">{t('products.sort_label')}</label>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => setSortBy('recommended')}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${sortBy === 'recommended'
                                            ? 'border-primary bg-primary/5 text-primary font-bold'
                                            : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined">thumb_up</span>
                                            <span>{t('products.sort_recommended')}</span>
                                        </div>
                                        {sortBy === 'recommended' && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                    </button>

                                    <button
                                        onClick={() => setSortBy('price_low')}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${sortBy === 'price_low'
                                            ? 'border-primary bg-primary/5 text-primary font-bold'
                                            : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined">arrow_downward</span>
                                            <span>{t('products.sort_price_low')}</span>
                                        </div>
                                        {sortBy === 'price_low' && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                    </button>

                                    <button
                                        onClick={() => setSortBy('price_high')}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${sortBy === 'price_high'
                                            ? 'border-primary bg-primary/5 text-primary font-bold'
                                            : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined">arrow_upward</span>
                                            <span>{t('products.sort_price_high')}</span>
                                        </div>
                                        {sortBy === 'price_high' && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                            >
                                {t('products.apply_button')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
