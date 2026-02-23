import React, { useState, useMemo, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import { uploadImage, uploadFile } from '../utils/upload';
import { optimizeImage } from '../utils/imageOptimizer';
import { getOptimizedImageUrl } from '../utils/supabaseImage';
import type { TourProduct, TourPricingOption, AccommodationOption, VehicleOption, DetailSlide, DetailContentBlock, DividerContent } from '../types/product';
import type { Category } from '../types/category';



export const AdminProductManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [products, setProducts] = useState<TourProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);


    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [featuredFilter, setFeaturedFilter] = useState<string>('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    // Load from API
    const fetchProducts = async () => {
        try {
            const data = await api.products.list();
            if (Array.isArray(data)) {
                const parse = (v: any, fallback: any = []) => {
                    if (typeof v === 'string') try { return JSON.parse(v); } catch { return fallback; }
                    return v || fallback;
                };
                const mappedProducts: TourProduct[] = data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    originalPrice: item.original_price || item.originalPrice,
                    duration: item.duration,
                    category: item.category,
                    mainImages: parse(item.main_images || item.mainImages),
                    isPopular: item.is_popular || item.isPopular,
                    tags: parse(item.tags),
                    description: item.description,
                    galleryImages: parse(item.gallery_images || item.galleryImages),
                    detailImages: parse(item.detail_images || item.detailImages),
                    itineraryImages: parse(item.itinerary_images || item.itineraryImages),
                    detailSlides: parse(item.detail_slides || item.detailSlides),
                    detailBlocks: parse(item.detail_blocks || item.detailBlocks),
                    itineraryBlocks: parse(item.itinerary_blocks || item.itineraryBlocks),
                    status: item.status,
                    isFeatured: item.is_featured || item.isFeatured,
                    highlights: parse(item.highlights),
                    included: parse(item.included),
                    excluded: parse(item.excluded),
                    viewCount: item.view_count || item.viewCount,
                    bookingCount: item.booking_count || item.bookingCount,
                    pricingOptions: parse(item.pricing_options || item.pricingOptions),
                    accommodationOptions: parse(item.accommodation_options || item.accommodationOptions),
                    vehicleOptions: parse(item.vehicle_options || item.vehicleOptions),
                    createdAt: item.created_at || item.createdAt,
                    updatedAt: item.updated_at || item.updatedAt
                }));
                setProducts(mappedProducts);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await api.categories.list('product');
            if (Array.isArray(data)) {
                setCategories(data.map((c: any) => ({
                    id: c.id,
                    icon: c.icon,
                    name: c.name,
                    description: c.description,
                    isActive: c.is_active ?? true,
                    order: c.sort_order ?? 0,
                    type: c.type || 'product'
                })));
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    // Save via API (Upsert)
    const saveProducts = async (updatedProducts: TourProduct[], productToSave?: TourProduct): Promise<boolean> => {
        if (!productToSave) return false;
        try {
            console.log('Sending payload to API:', productToSave);
            const dbPayload = {
                id: productToSave.id,
                name: productToSave.name,
                price: productToSave.price,
                original_price: productToSave.originalPrice,
                duration: productToSave.duration,
                category: productToSave.category,
                main_images: productToSave.mainImages,
                is_popular: productToSave.isPopular,
                tags: productToSave.tags,
                description: productToSave.description,
                gallery_images: productToSave.galleryImages,
                detail_images: productToSave.detailImages,
                itinerary_images: productToSave.itineraryImages,
                detail_slides: productToSave.detailSlides,
                detail_blocks: productToSave.detailBlocks,
                itinerary_blocks: productToSave.itineraryBlocks,
                status: productToSave.status,
                is_featured: productToSave.isFeatured,
                highlights: productToSave.highlights,
                included: productToSave.included,
                excluded: productToSave.excluded,
                pricing_options: productToSave.pricingOptions,
                accommodation_options: productToSave.accommodationOptions,
                vehicle_options: productToSave.vehicleOptions,
            };

            // If ID matches an existing one in our list, it's an update. Otherwise, it's a create.
            const isEditing = products.some(p => p.id === productToSave.id);
            console.log('Is editing?', isEditing);

            try {
                if (isEditing) {
                    await api.products.update(productToSave.id, dbPayload);
                } else {
                    await api.products.create(dbPayload);
                }
            } catch (apiError: any) {
                console.error('API call failed:', apiError);
                throw apiError; // Throw up so the outer catch can alert it
            }

            console.log('Save successful, fetching latest products...');
            await fetchProducts();
            return true;
        } catch (error: any) {
            console.error('Failed to save product:', error);
            alert('상품 저장 중 오류가 발생했습니다: ' + (error.message || JSON.stringify(error)));
            return false;
        }
    };

    // Filtered and sorted products
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
            const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
            const matchesFeatured = featuredFilter === 'all' ||
                (featuredFilter === 'featured' && product.isFeatured) ||
                (featuredFilter === 'normal' && !product.isFeatured);

            return matchesSearch && matchesCategory && matchesStatus && matchesFeatured;
        });
    }, [products, searchQuery, categoryFilter, statusFilter, featuredFilter]);

    // Pagination logic... (same)
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats
    const stats = useMemo(() => ({
        total: products.length,
        active: products.filter(p => p.status === 'active').length,
        inactive: products.filter(p => p.status === 'inactive').length,
        soldout: products.filter(p => p.status === 'soldout').length,
        featured: products.filter(p => p.isFeatured).length
    }), [products]);

    // Toggle status
    const toggleStatus = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const newStatus = product.status === 'active' ? 'inactive' : 'active';
        try {
            await api.products.update(id, { status: newStatus });
            setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        } catch (e) { console.error(e); }
    };

    // Toggle featured
    const toggleFeatured = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const newVal = !product.isFeatured;
        try {
            await api.products.update(id, { is_featured: newVal });
            setProducts(prev => prev.map(p => p.id === id ? { ...p, isFeatured: newVal } : p));
        } catch (e) { console.error(e); }
    };

    // Toggle popular
    const togglePopular = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const newVal = !product.isPopular;
        try {
            await api.products.update(id, { is_popular: newVal });
            setProducts(prev => prev.map(p => p.id === id ? { ...p, isPopular: newVal } : p));
        } catch (e) { console.error(e); }
    };

    // Delete product
    const deleteProduct = async (id: string) => {
        if (confirm('정말 이 상품을 삭제하시겠습니까?')) {
            try {
                await api.products.delete(id);
                setProducts(prev => prev.filter(p => p.id !== id));
            } catch (error: any) {
                alert('삭제 실패: ' + error.message);
            }
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
            soldout: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };
        const labels = {
            active: '판매중',
            inactive: '비활성',
            soldout: '품절'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status as keyof typeof styles]}`}>
                {labels[status as keyof typeof labels]}
            </span>
        );
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            <AdminSidebar
                activePage="products"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">상품 관리</h1>
                    <button
                        onClick={() => {
                            setSelectedProduct(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined">add</span>
                        상품 추가
                    </button>
                </header>

                <div className="p-8 space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">전체 상품</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.total}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">inventory_2</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">판매중</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.active}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">비활성</p>
                                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">{stats.inactive}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">cancel</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">품절</p>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.soldout}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">remove_shopping_cart</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">추천 상품</p>
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.featured}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">star</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">검색</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input
                                        type="text"
                                        placeholder="상품명 검색..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">카테고리</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="all">전체</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">상태</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="all">전체</option>
                                    <option value="active">판매중</option>
                                    <option value="inactive">비활성</option>
                                    <option value="soldout">품절</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">추천 여부</label>
                                <select
                                    value={featuredFilter}
                                    onChange={(e) => setFeaturedFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="all">전체</option>
                                    <option value="featured">추천 상품</option>
                                    <option value="normal">일반 상품</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Products Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">상품</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">카테고리</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">기간</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">가격</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">상태</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">추천</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">인기</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">조회/예약</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">액션</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {paginatedProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={getOptimizedImageUrl(product.mainImages[0], 'productThumbnail')}
                                                        alt={product.name}
                                                        className="w-16 h-16 rounded-lg object-cover"
                                                    />
                                                    <div className="max-w-xs">
                                                        <p className="font-medium text-slate-900 dark:text-white line-clamp-2">{product.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{product.category}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{product.duration}</td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">₩{product.price.toLocaleString()}</p>
                                                    {product.originalPrice && (
                                                        <p className="text-xs text-slate-400 line-through">₩{product.originalPrice.toLocaleString()}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleStatus(product.id)}
                                                    className="transition-transform hover:scale-105"
                                                >
                                                    {getStatusBadge(product.status)}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => toggleFeatured(product.id)}
                                                    className="transition-transform hover:scale-110"
                                                >
                                                    <span className={`material-symbols-outlined ${product.isFeatured ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                        {product.isFeatured ? 'star' : 'star_border'}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => togglePopular(product.id)}
                                                    className="transition-transform hover:scale-110"
                                                >
                                                    <span className={`material-symbols-outlined ${product.isPopular ? 'text-pink-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                        {product.isPopular ? 'favorite' : 'favorite_border'}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">
                                                <div className="flex flex-col gap-1">
                                                    <span>{product.viewCount.toLocaleString()}</span>
                                                    <span className="text-teal-600 dark:text-teal-400 font-bold">{product.bookingCount}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        title="수정"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProduct(product.id)}
                                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="삭제"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    총 {filteredProducts.length}개 상품 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)}개 표시
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        이전
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-1 rounded border transition-colors ${page === currentPage
                                                ? 'bg-teal-500 text-white border-teal-500'
                                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        다음
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <ProductModal
                    product={selectedProduct}
                    categories={categories}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedProduct(null);
                    }}
                    onSave={async (product) => {
                        let success = false;
                        if (selectedProduct) {
                            // Edit existing
                            // We don't need full list update here, just pass the product to save
                            success = await saveProducts([], product);
                        } else {
                            // Add new
                            const newProduct = {
                                ...product,
                                id: `prod-${Date.now()}`, // Or let DB generate UUID if preferred, but existing logic uses text ID
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                viewCount: 0,
                                bookingCount: 0
                            };
                            success = await saveProducts([], newProduct);
                        }

                        if (success) {
                            setIsModalOpen(false);
                            setSelectedProduct(null);
                        }
                    }}
                />
            )}
        </div>
    );
};

// Product Modal Component
interface ProductModalProps {
    product: TourProduct | null;
    categories: Category[];
    onClose: () => void;
    onSave: (product: TourProduct) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, categories, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<TourProduct>>(
        product || {
            name: '',
            category: categories.length > 0 ? categories[0].name : '',
            duration: '',
            price: 0,
            originalPrice: 0,
            mainImages: [],
            galleryImages: [],
            detailImages: [],
            detailSlides: [],
            detailBlocks: [],
            itineraryBlocks: [],
            status: 'active',
            isFeatured: false,
            isPopular: false,
            tags: [],
            highlights: [],
            included: [],
            excluded: [],
            pricingOptions: [],
            accommodationOptions: [],
            vehicleOptions: []
        }
    );

    const [currentTab, setCurrentTab] = useState<'basic' | 'details' | 'itinerary' | 'options' | 'includes'>('basic');

    // Drag and Drop state
    const [draggedDetailIndex, setDraggedDetailIndex] = useState<number | null>(null);

    // Handlers
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted', formData);

        // Validate required fields
        if (!formData.name || !formData.name.trim()) {
            alert('상품명을 입력해주세요.');
            return;
        }
        if (!formData.duration || !formData.duration.trim()) {
            alert('기간을 입력해주세요.');
            return;
        }
        if (!formData.price || formData.price <= 0) {
            alert('판매가를 입력해주세요.');
            return;
        }

        console.log('Calling onSave');
        onSave(formData as TourProduct);
        console.log('onSave called');
    };

    const addHighlight = () => {
        setFormData({
            ...formData,
            highlights: [...(formData.highlights || []), { icon: 'star', title: '', description: '' }]
        });
    };

    const updateHighlight = (index: number, field: string, value: string) => {
        const updated = [...(formData.highlights || [])];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, highlights: updated });
    };

    const removeHighlight = (index: number) => {
        setFormData({
            ...formData,
            highlights: formData.highlights?.filter((_, i) => i !== index)
        });
    };

    // Pricing Option Handlers
    const addPricingOption = () => {
        setFormData({
            ...formData,
            pricingOptions: [...(formData.pricingOptions || []), { people: 2, pricePerPerson: 0, depositPerPerson: 0, localPaymentPerPerson: 0 }]
        });
    };
    const updatePricingOption = (index: number, field: keyof TourPricingOption, value: number) => {
        const updated = [...(formData.pricingOptions || [])];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, pricingOptions: updated });
    };
    const removePricingOption = (index: number) => {
        setFormData({
            ...formData,
            pricingOptions: formData.pricingOptions?.filter((_, i) => i !== index)
        });
    };

    // Accommodation Option Handlers
    const addAccommodationOption = () => {
        setFormData({
            ...formData,
            accommodationOptions: [...(formData.accommodationOptions || []), {
                id: `acc-${Date.now()}`,
                name: '',
                description: '',
                priceModifier: 0,
                isDefault: (formData.accommodationOptions?.length || 0) === 0
            }]
        });
    };
    const updateAccommodationOption = (index: number, field: keyof AccommodationOption, value: any) => {
        const updated = [...(formData.accommodationOptions || [])];
        updated[index] = { ...updated[index], [field]: value };

        // Handle default selection logic (radio behavior)
        if (field === 'isDefault' && value === true) {
            updated.forEach((opt, i) => {
                if (i !== index) opt.isDefault = false;
            });
        }

        setFormData({ ...formData, accommodationOptions: updated });
    };
    const removeAccommodationOption = (index: number) => {
        setFormData({
            ...formData,
            accommodationOptions: formData.accommodationOptions?.filter((_, i) => i !== index)
        });
    };

    // Vehicle Option Handlers
    const addVehicleOption = () => {
        setFormData({
            ...formData,
            vehicleOptions: [...(formData.vehicleOptions || []), {
                id: `veh-${Date.now()}`,
                name: '',
                description: '',
                priceModifier: 0,
                isDefault: (formData.vehicleOptions?.length || 0) === 0
            }]
        });
    };
    const updateVehicleOption = (index: number, field: keyof VehicleOption, value: any) => {
        const updated = [...(formData.vehicleOptions || [])];
        updated[index] = { ...updated[index], [field]: value };

        // Handle default selection logic
        if (field === 'isDefault' && value === true) {
            updated.forEach((opt, i) => {
                if (i !== index) opt.isDefault = false;
            });
        }

        setFormData({ ...formData, vehicleOptions: updated });
    };
    const removeVehicleOption = (index: number) => {
        setFormData({
            ...formData,
            vehicleOptions: formData.vehicleOptions?.filter((_, i) => i !== index)
        });
    };

    // Detail Block Handlers
    const addDetailBlock = (type: 'image' | 'slide' | 'divider') => {
        let content: any = '';

        if (type === 'slide') {
            content = {
                id: `slide-${Date.now()}`,
                type: 'day',
                dayLabel: '',
                title: '',
                description: '',
                images: []
            };
        } else if (type === 'divider') {
            content = {
                style: 'space',
                height: 40
            };
        }

        const newBlock: DetailContentBlock = {
            id: `block-${Date.now()}-${Math.random()}`,
            type,
            content
        };
        setFormData({
            ...formData,
            detailBlocks: [...(formData.detailBlocks || []), newBlock]
        });
    };

    const removeDetailBlock = (index: number) => {
        setFormData({
            ...formData,
            detailBlocks: formData.detailBlocks?.filter((_, i) => i !== index)
        });
    };

    const moveDetailBlock = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= (formData.detailBlocks?.length || 0)) return;
        const blocks = [...(formData.detailBlocks || [])];
        const [moved] = blocks.splice(fromIndex, 1);
        blocks.splice(toIndex, 0, moved);
        setFormData({ ...formData, detailBlocks: blocks });
    };

    const updateBlockContent = (index: number, content: any) => {
        const blocks = [...(formData.detailBlocks || [])];
        blocks[index] = { ...blocks[index], content };
        setFormData({ ...formData, detailBlocks: blocks });
    };

    const updateSlideInBlock = (blockIndex: number, field: string, value: any) => {
        const blocks = [...(formData.detailBlocks || [])];
        const block = blocks[blockIndex];
        if (block.type !== 'slide') return;
        const slide = block.content as DetailSlide;
        const updatedSlide = { ...slide, [field]: value };
        blocks[blockIndex] = { ...block, content: updatedSlide };
        setFormData({ ...formData, detailBlocks: blocks });
    };

    const handleBlockImageUpload = async (index: number, file: File) => {
        try {
            const url = await uploadImage(file, 'product-details'); // Upload to Storage
            updateBlockContent(index, url);
        } catch (error) {
            console.error('Block image upload failed:', error);
            alert('이미지 업로드 실패');
        }
    };

    const handleSlideBlockImages = async (blockIndex: number, files: FileList | null) => {
        if (!files) return;

        try {
            const uploadPromises = Array.from(files).map(file => uploadImage(file, 'product-slides'));
            const urls = await Promise.all(uploadPromises);

            const block = formData.detailBlocks?.[blockIndex];
            if (block && block.type === 'slide') {
                const currentSlide = block.content as DetailSlide;
                const updatedSlide = {
                    ...currentSlide,
                    images: [...currentSlide.images, ...urls]
                };
                /* Actually let's just manually update here for clarity */
                const blocks = [...(formData.detailBlocks || [])];
                blocks[blockIndex] = { ...block, content: updatedSlide };
                setFormData({ ...formData, detailBlocks: blocks });
            }
        } catch (error) {
            console.error('Slide images upload failed:', error);
            alert('이미지 업로드 실패');
        }
    };

    const removeSlideBlockImage = (blockIndex: number, imgIndex: number) => {
        const blocks = [...(formData.detailBlocks || [])];
        const block = blocks[blockIndex];
        if (block.type !== 'slide') return;
        const slide = block.content as DetailSlide;
        const newSlide = { ...slide, images: slide.images.filter((_, i) => i !== imgIndex) };
        blocks[blockIndex] = { ...block, content: newSlide };
        setFormData({ ...formData, detailBlocks: blocks });
    };


    // Itinerary Block Handlers (same as Detail Block but for itinerary)
    const addItineraryBlock = (type: 'image' | 'slide' | 'divider') => {
        let content: any = '';

        if (type === 'slide') {
            content = {
                id: `slide-${Date.now()}`,
                type: 'day',
                dayLabel: '',
                title: '',
                description: '',
                images: []
            };
        } else if (type === 'divider') {
            content = {
                style: 'space',
                height: 40
            };
        }

        const newBlock: DetailContentBlock = {
            id: `block-${Date.now()}-${Math.random()}`,
            type,
            content
        };
        setFormData({
            ...formData,
            itineraryBlocks: [...(formData.itineraryBlocks || []), newBlock]
        });
    };

    const removeItineraryBlock = (index: number) => {
        setFormData({
            ...formData,
            itineraryBlocks: formData.itineraryBlocks?.filter((_, i) => i !== index)
        });
    };

    const moveItineraryBlock = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= (formData.itineraryBlocks?.length || 0)) return;
        const blocks = [...(formData.itineraryBlocks || [])];
        const [moved] = blocks.splice(fromIndex, 1);
        blocks.splice(toIndex, 0, moved);
        setFormData({ ...formData, itineraryBlocks: blocks });
    };

    const updateItineraryBlockContent = (index: number, content: any) => {
        const blocks = [...(formData.itineraryBlocks || [])];
        blocks[index] = { ...blocks[index], content };
        setFormData({ ...formData, itineraryBlocks: blocks });
    };

    const updateItinerarySlideInBlock = (blockIndex: number, field: string, value: any) => {
        const blocks = [...(formData.itineraryBlocks || [])];
        const block = blocks[blockIndex];
        if (block.type !== 'slide') return;
        const slide = block.content as DetailSlide;
        const updatedSlide = { ...slide, [field]: value };
        blocks[blockIndex] = { ...block, content: updatedSlide };
        setFormData({ ...formData, itineraryBlocks: blocks });
    };

    const handleItineraryBlockImageUpload = async (index: number, file: File) => {
        try {
            const url = await uploadFile(file, 'images', 'product-details');
            updateItineraryBlockContent(index, url);
        } catch (error) {
            console.error('Itinerary block image upload failed:', error);
            alert('이미지 업로드 실패');
        }
    };

    const handleItinerarySlideBlockImages = async (blockIndex: number, files: FileList | null) => {
        if (!files) return;

        try {
            const uploadPromises = Array.from(files).map(file => uploadFile(file, 'images', 'product-details'));
            const urls = await Promise.all(uploadPromises);

            const block = formData.itineraryBlocks?.[blockIndex];
            if (block && block.type === 'slide') {
                const currentSlide = block.content as DetailSlide;
                const updatedSlide = {
                    ...currentSlide,
                    images: [...currentSlide.images, ...urls]
                };
                const blocks = [...(formData.itineraryBlocks || [])];
                blocks[blockIndex] = { ...block, content: updatedSlide };
                setFormData({ ...formData, itineraryBlocks: blocks });
            }
        } catch (error) {
            console.error('Itinerary slide images upload failed:', error);
            alert('이미지 업로드 실패');
        }
    };

    const removeItinerarySlideBlockImage = (blockIndex: number, imageIndex: number) => {
        const block = formData.itineraryBlocks?.[blockIndex];
        if (block && block.type === 'slide') {
            const currentSlide = block.content as DetailSlide;
            const updatedSlide = {
                ...currentSlide,
                images: currentSlide.images.filter((_, i) => i !== imageIndex)
            };
            const blocks = [...(formData.itineraryBlocks || [])];
            blocks[blockIndex] = { ...block, content: updatedSlide };
            setFormData({ ...formData, itineraryBlocks: blocks });
        }
    };

    // Detail Image handlers
    const handleDetailImageUpload = async (files: FileList | null) => {
        if (!files) return;

        try {
            const uploadPromises = Array.from(files).map(file => uploadImage(file, 'product-details'));
            const urls = await Promise.all(uploadPromises);

            setFormData(prev => ({
                ...prev,
                detailImages: [...(prev.detailImages || []), ...urls]
            }));
        } catch (error) {
            console.error('Detail image upload failed:', error);
            alert('이미지 업로드 실패');
        }
    };

    const removeDetailImage = (imageIndex: number) => {
        setFormData({
            ...formData,
            detailImages: formData.detailImages?.filter((_, i) => i !== imageIndex)
        });
    };

    // Drag and Drop handlers for Detail Images
    const handleDetailDragStart = (index: number) => {
        setDraggedDetailIndex(index);
    };

    const handleDetailDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedDetailIndex === null || draggedDetailIndex === index) return;

        const images = [...(formData.detailImages || [])];
        const draggedImage = images[draggedDetailIndex];

        // Remove from old position
        images.splice(draggedDetailIndex, 1);
        // Insert at new position
        images.splice(index, 0, draggedImage);

        setFormData({ ...formData, detailImages: images });
        setDraggedDetailIndex(index);
    };

    const handleDetailDragEnd = () => {
        setDraggedDetailIndex(null);
    };

    // Main Image handlers
    const handleMainImageUpload = async (files: FileList | null) => {
        if (!files) return;

        try {
            const uploadPromises = Array.from(files).map(file => uploadImage(file, 'products'));
            const urls = await Promise.all(uploadPromises);

            setFormData(prev => ({
                ...prev,
                mainImages: [...(prev.mainImages || []), ...urls]
            }));
        } catch (error) {
            console.error('Main image upload failed:', error);
            alert('이미지 업로드 실패');
        }
    };

    const removeMainImage = (imageIndex: number) => {
        setFormData({
            ...formData,
            mainImages: formData.mainImages?.filter((_, i) => i !== imageIndex)
        });
    };

    const moveMainImage = (imageIndex: number, direction: 'up' | 'down') => {
        const images = [...(formData.mainImages || [])];
        const newIndex = direction === 'up' ? imageIndex - 1 : imageIndex + 1;

        if (newIndex < 0 || newIndex >= images.length) return;

        [images[imageIndex], images[newIndex]] = [images[newIndex], images[imageIndex]];
        setFormData({ ...formData, mainImages: images });
    };

    const addTag = (tag: string) => {
        if (tag && !formData.tags?.includes(tag)) {
            setFormData({ ...formData, tags: [...(formData.tags || []), tag] });
        }
    };

    const removeTag = (tag: string) => {
        setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) });
    };

    const addIncluded = (item: string) => {
        if (item) {
            setFormData({ ...formData, included: [...(formData.included || []), item] });
        }
    };

    const removeIncluded = (index: number) => {
        setFormData({ ...formData, included: formData.included?.filter((_, i) => i !== index) });
    };

    const addExcluded = (item: string) => {
        if (item) {
            setFormData({ ...formData, excluded: [...(formData.excluded || []), item] });
        }
    };

    const removeExcluded = (index: number) => {
        setFormData({ ...formData, excluded: formData.excluded?.filter((_, i) => i !== index) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {product ? '상품 수정' : '상품 추가'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
                    {[
                        { id: 'basic', label: '기본 정보', icon: 'info' },
                        { id: 'details', label: '상세 정보', icon: 'description' },
                        { id: 'itinerary', label: '일정', icon: 'calendar_month' },
                        { id: 'options', label: '가격/옵션', icon: 'attach_money' },
                        { id: 'includes', label: '포함/불포함', icon: 'checklist' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setCurrentTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${currentTab === tab.id
                                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                            <span className="font-medium text-sm">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {/* Basic Info Tab */}
                        {currentTab === 'basic' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        상품명 *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            카테고리 *
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                            required
                                        >
                                            <option value="" disabled>카테고리 선택</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            기간 *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                            placeholder="예: 4박 5일"
                                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            판매가 *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            정가 (선택)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.originalPrice || ''}
                                            onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) || undefined })}
                                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Main Images Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        메인 이미지 업로드 *
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleMainImageUpload(e.target.files)}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">여러 메인 이미지를 업로드하세요 (슬라이드로 표시됩니다)</p>

                                    {/* Main Images Grid */}
                                    {formData.mainImages && formData.mainImages.length > 0 && (
                                        <div className="grid grid-cols-3 gap-3 mt-4">
                                            {formData.mainImages.map((img, imgIndex) => (
                                                <div key={imgIndex} className="relative group border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                    <img
                                                        src={getOptimizedImageUrl(img, 'productThumbnail')}
                                                        alt={`Main ${imgIndex + 1}`}
                                                        className="w-full h-32 object-cover pointer-events-none"
                                                    />

                                                    {/* Image Controls */}
                                                    <div className="absolute top-2 right-2 flex gap-1">
                                                        {imgIndex > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => moveMainImage(imgIndex, 'up')}
                                                                className="p-1 bg-white/90 dark:bg-slate-900/90 rounded hover:bg-white dark:hover:bg-slate-900 transition-colors"
                                                                title="위로 이동"
                                                            >
                                                                <span className="material-symbols-outlined text-sm text-slate-700 dark:text-slate-300">arrow_upward</span>
                                                            </button>
                                                        )}
                                                        {imgIndex < (formData.mainImages?.length || 0) - 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => moveMainImage(imgIndex, 'down')}
                                                                className="p-1 bg-white/90 dark:bg-slate-900/90 rounded hover:bg-white dark:hover:bg-slate-900 transition-colors"
                                                                title="아래로 이동"
                                                            >
                                                                <span className="material-symbols-outlined text-sm text-slate-700 dark:text-slate-300">arrow_downward</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMainImage(imgIndex)}
                                                            className="p-1 bg-red-500/90 rounded hover:bg-red-500 transition-colors"
                                                            title="삭제"
                                                        >
                                                            <span className="material-symbols-outlined text-sm text-white">delete</span>
                                                        </button>
                                                    </div>

                                                    {/* Image Number Badge */}
                                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                                        {imgIndex + 1} / {formData.mainImages?.length || 0}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            상태
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                        >
                                            <option value="active">판매중</option>
                                            <option value="inactive">비활성</option>
                                            <option value="soldout">품절</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center pt-8 gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isFeatured}
                                                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                                className="w-5 h-5 text-teal-500 rounded focus:ring-2 focus:ring-teal-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">추천 상품으로 설정</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isPopular || false}
                                                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                                                className="w-5 h-5 text-pink-500 rounded focus:ring-2 focus:ring-pink-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">인기 상품으로 설정</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Details Tab */}
                        {currentTab === 'details' && (
                            <div className="space-y-6">
                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        태그
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.tags?.map(tag => (
                                            <span key={tag} className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                                {tag}
                                                <button type="button" onClick={() => removeTag(tag)} className="hover:text-teal-900 dark:hover:text-teal-200">
                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="태그 입력 후 Enter"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addTag((e.target as HTMLInputElement).value);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }}
                                            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Highlights */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            하이라이트
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addHighlight}
                                            className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline"
                                        >
                                            + 추가
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.highlights?.map((highlight, index) => (
                                            <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                                                <div className="flex gap-2 items-start">
                                                    {/* Icon Image Upload */}
                                                    <div className="flex-shrink-0">
                                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">아이콘</label>
                                                        {highlight.icon ? (
                                                            <div className="relative w-16 h-16 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                                <img src={getOptimizedImageUrl(highlight.icon, 'productThumbnail')} alt="Icon" className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateHighlight(index, 'icon', '')}
                                                                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl"
                                                                >
                                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <label className="w-16 h-16 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-teal-500">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            try {
                                                                                const url = await uploadImage(file, 'highlight-icons');
                                                                                updateHighlight(index, 'icon', url);
                                                                            } catch (error) {
                                                                                console.error('Highlight icon upload failed:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="material-symbols-outlined text-slate-400">add_photo_alternate</span>
                                                            </label>
                                                        )}
                                                    </div>

                                                    {/* Title and Delete */}
                                                    <div className="flex-1">
                                                        <input
                                                            type="text"
                                                            value={highlight.title}
                                                            onChange={(e) => updateHighlight(index, 'title', e.target.value)}
                                                            placeholder="제목"
                                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeHighlight(index)}
                                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={highlight.description}
                                                    onChange={(e) => updateHighlight(index, 'description', e.target.value)}
                                                    placeholder="설명"
                                                    rows={2}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Detail Images Section */}
                                <div>
                                    {/* Detail Block Content Section */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                상세 컨텐츠 (이미지 & 슬라이드 순서 편집)
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => addDetailBlock('image')}
                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">image</span>
                                                    이미지 추가
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => addDetailBlock('slide')}
                                                    className="px-3 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">view_carousel</span>
                                                    슬라이드 추가
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => addDetailBlock('divider')}
                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">remove</span>
                                                    구분선/여백
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                            이미지와 슬라이드를 자유롭게 배치하여 상세 페이지를 구성하세요. 순서를 변경하거나 삭제할 수 있습니다.
                                        </p>

                                        <div className="space-y-4">
                                            {(formData.detailBlocks || []).map((block, index) => (
                                                <div key={block.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 relative">
                                                    {/* Block Header */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                                {block.type === 'image' ? 'SINGLE' : (block.type === 'slide' ? 'SLIDE' : 'DIVIDER')}
                                                            </span>
                                                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                                {index + 1}번째 블록
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => moveDetailBlock(index, index - 1)}
                                                                disabled={index === 0}
                                                                className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">arrow_upward</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => moveDetailBlock(index, index + 1)}
                                                                disabled={index === (formData.detailBlocks?.length || 0) - 1}
                                                                className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">arrow_downward</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeDetailBlock(index)}
                                                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded ml-2"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Block Content */}
                                                    {block.type === 'image' ? (
                                                        // IMAGE BLOCK
                                                        <div>
                                                            {block.content ? (
                                                                <div className="relative">
                                                                    <img
                                                                        src={getOptimizedImageUrl(block.content as string, 'productThumbnail')}
                                                                        alt={`Block ${index + 1}`}
                                                                        className="w-full h-auto max-h-60 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateBlockContent(index, '')}
                                                                        className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded hover:bg-black/90"
                                                                    >
                                                                        변경
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <label className="block w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors">
                                                                    <span className="material-symbols-outlined text-slate-400 mb-1">add_photo_alternate</span>
                                                                    <span className="text-xs text-slate-500">이미지 업로드</span>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => {
                                                                            if (e.target.files?.[0]) handleBlockImageUpload(index, e.target.files[0]);
                                                                        }}
                                                                        className="hidden"
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                    ) : block.type === 'slide' ? (
                                                        // SLIDE BLOCK
                                                        <div>
                                                            <div className="mb-3">
                                                                <input
                                                                    type="text"
                                                                    value={(block.content as DetailSlide).title || ''}
                                                                    onChange={(e) => updateSlideInBlock(index, 'title', e.target.value)}
                                                                    placeholder="슬라이드 제목 (예: 1일차 숙소)"
                                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                                                />
                                                            </div>
                                                            <div className="mb-2">
                                                                <label className="block text-xs text-slate-500 mb-1">이미지 목록 (다중 업로드 가능)</label>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    multiple
                                                                    onChange={(e) => handleSlideBlockImages(index, e.target.files)}
                                                                    className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700"
                                                                />
                                                            </div>
                                                            {(block.content as DetailSlide).images?.length > 0 && (
                                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                                    {(block.content as DetailSlide).images.map((img, imgIdx) => (
                                                                        <div key={imgIdx} className="relative flex-shrink-0">
                                                                            <img src={getOptimizedImageUrl(img, 'productThumbnail')} alt={`Slide Img ${imgIdx}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeSlideBlockImage(index, imgIdx)}
                                                                                className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white"
                                                                            >
                                                                                <span className="material-symbols-outlined text-xs">close</span>
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        // DIVIDER BLOCK
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-medium text-slate-500 mb-1">스타일</label>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateBlockContent(index, { ...(block.content as DividerContent), style: 'line' })}
                                                                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border ${(block.content as DividerContent).style === 'line'
                                                                            ? 'bg-teal-50 border-teal-500 text-teal-700'
                                                                            : 'border-slate-200 dark:border-slate-700 text-slate-600'
                                                                            }`}
                                                                    >
                                                                        가로선
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateBlockContent(index, { ...(block.content as DividerContent), style: 'space' })}
                                                                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border ${(block.content as DividerContent).style === 'space'
                                                                            ? 'bg-teal-50 border-teal-500 text-teal-700'
                                                                            : 'border-slate-200 dark:border-slate-700 text-slate-600'
                                                                            }`}
                                                                    >
                                                                        여백
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="w-32">
                                                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                                                    높이 ({(block.content as DividerContent).height}px)
                                                                </label>
                                                                <input
                                                                    type="range"
                                                                    min="10"
                                                                    max="120"
                                                                    step="10"
                                                                    value={(block.content as DividerContent).height}
                                                                    onChange={(e) => updateBlockContent(index, { ...(block.content as DividerContent), height: parseInt(e.target.value) })}
                                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Itinerary Tab */}
                        {currentTab === 'itinerary' && (
                            <div className="space-y-6">
                                {/* Itinerary Block Content Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            일정 컨텐츠 (이미지 & 슬라이드 순서 편집)
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => addItineraryBlock('image')}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">image</span>
                                                이미지 추가
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addItineraryBlock('slide')}
                                                className="px-3 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">view_carousel</span>
                                                슬라이드 추가
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addItineraryBlock('divider')}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">remove</span>
                                                구분선/여백
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                        일정 이미지와 슬라이드를 자유롭게 배치하여 상세 일정을 구성하세요. 순서를 변경하거나 삭제할 수 있습니다.
                                    </p>

                                    <div className="space-y-4">
                                        {(formData.itineraryBlocks || []).map((block, index) => (
                                            <div key={block.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 relative">
                                                {/* Block Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                            {block.type === 'image' ? 'SINGLE' : (block.type === 'slide' ? 'SLIDE' : 'DIVIDER')}
                                                        </span>
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                            {index + 1}번째 블록
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveItineraryBlock(index, index - 1)}
                                                            disabled={index === 0}
                                                            className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">arrow_upward</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveItineraryBlock(index, index + 1)}
                                                            disabled={index === (formData.itineraryBlocks?.length || 0) - 1}
                                                            className="p-1 text-slate-500 hover:text-slate-700 disabled:opacity-30"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">arrow_downward</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItineraryBlock(index)}
                                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded ml-2"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Block Content */}
                                                {block.type === 'image' ? (
                                                    // IMAGE BLOCK
                                                    <div>
                                                        {block.content ? (
                                                            <div className="relative">
                                                                <img
                                                                    src={getOptimizedImageUrl(block.content as string, 'productThumbnail')}
                                                                    alt={`Block ${index + 1}`}
                                                                    className="w-full h-auto max-h-60 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateItineraryBlockContent(index, '')}
                                                                    className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded hover:bg-black/90"
                                                                >
                                                                    변경
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <label className="block w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors">
                                                                <span className="material-symbols-outlined text-slate-400 mb-1">add_photo_alternate</span>
                                                                <span className="text-xs text-slate-500">이미지 업로드</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) handleItineraryBlockImageUpload(index, e.target.files[0]);
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                ) : block.type === 'slide' ? (
                                                    // SLIDE BLOCK
                                                    <div>
                                                        <div className="mb-3">
                                                            <input
                                                                type="text"
                                                                value={(block.content as DetailSlide).title || ''}
                                                                onChange={(e) => updateItinerarySlideInBlock(index, 'title', e.target.value)}
                                                                placeholder="슬라이드 제목 (예: 1일차 숙소)"
                                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                                            />
                                                        </div>
                                                        <div className="mb-2">
                                                            <label className="block text-xs text-slate-500 mb-1">이미지 목록 (다중 업로드 가능)</label>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                onChange={(e) => handleItinerarySlideBlockImages(index, e.target.files)}
                                                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700"
                                                            />
                                                        </div>
                                                        {(block.content as DetailSlide).images?.length > 0 && (
                                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                                {(block.content as DetailSlide).images.map((img, imgIdx) => (
                                                                    <div key={imgIdx} className="relative flex-shrink-0">
                                                                        <img src={getOptimizedImageUrl(img, 'productThumbnail')} alt={`Slide Img ${imgIdx}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeItinerarySlideBlockImage(index, imgIdx)}
                                                                            className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white"
                                                                        >
                                                                            <span className="material-symbols-outlined text-xs">close</span>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    // DIVIDER BLOCK
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">스타일</label>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateItineraryBlockContent(index, { ...(block.content as DividerContent), style: 'line' })}
                                                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border ${(block.content as DividerContent).style === 'line'
                                                                        ? 'bg-teal-50 border-teal-500 text-teal-700'
                                                                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                                                                        }`}
                                                                >
                                                                    가로선
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateItineraryBlockContent(index, { ...(block.content as DividerContent), style: 'space' })}
                                                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border ${(block.content as DividerContent).style === 'space'
                                                                        ? 'bg-teal-50 border-teal-500 text-teal-700'
                                                                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                                                                        }`}
                                                                >
                                                                    여백
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="w-32">
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                                                높이 ({(block.content as DividerContent).height}px)
                                                            </label>
                                                            <input
                                                                type="range"
                                                                min="10"
                                                                max="120"
                                                                step="10"
                                                                value={(block.content as DividerContent).height}
                                                                onChange={(e) => updateItineraryBlockContent(index, { ...(block.content as DividerContent), height: parseInt(e.target.value) })}
                                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Options Tab */}
                        {currentTab === 'options' && (
                            <div className="space-y-8">
                                {/* Pricing Options */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg dark:text-white">인원별 가격 옵션</h3>
                                        <button
                                            type="button"
                                            onClick={addPricingOption}
                                            className="px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 text-sm"
                                        >
                                            + 가격 옵션 추가
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.pricingOptions?.map((option, index) => (
                                            <div key={index} className="flex gap-4 items-end bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">인원 수</label>
                                                    <input
                                                        type="number"
                                                        value={option.people}
                                                        onChange={(e) => updatePricingOption(index, 'people', Number(e.target.value))}
                                                        className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                    />
                                                </div>
                                                <div className="flex-[2]">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">1인당 총 가격</label>
                                                    <input
                                                        type="number"
                                                        value={option.pricePerPerson}
                                                        onChange={(e) => updatePricingOption(index, 'pricePerPerson', Number(e.target.value))}
                                                        className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                    />
                                                </div>
                                                <div className="flex-[2]">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">1인당 예약금</label>
                                                    <input
                                                        type="number"
                                                        value={option.depositPerPerson || 0}
                                                        onChange={(e) => updatePricingOption(index, 'depositPerPerson', Number(e.target.value))}
                                                        className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                    />
                                                </div>
                                                <div className="flex-[2]">
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">1인당 현지 지불</label>
                                                    <input
                                                        type="number"
                                                        value={option.localPaymentPerPerson || 0}
                                                        onChange={(e) => updatePricingOption(index, 'localPaymentPerPerson', Number(e.target.value))}
                                                        className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removePricingOption(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                        {(!formData.pricingOptions || formData.pricingOptions.length === 0) && (
                                            <p className="text-sm text-slate-500 text-center py-4">등록된 가격 옵션이 없습니다.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t dark:border-slate-700 my-6"></div>

                                {/* Accommodation Options */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg dark:text-white">숙소 옵션</h3>
                                        <button
                                            type="button"
                                            onClick={addAccommodationOption}
                                            className="px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 text-sm"
                                        >
                                            + 숙소 옵션 추가
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.accommodationOptions?.map((option, index) => (
                                            <div key={index} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg relative">
                                                <div className="absolute top-2 right-2 flex gap-2">
                                                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            checked={option.isDefault || false}
                                                            onChange={() => updateAccommodationOption(index, 'isDefault', true)}
                                                            className="text-teal-500 focus:ring-teal-500"
                                                        />
                                                        기본값
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAccommodationOption(index)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">이름</label>
                                                        <input
                                                            type="text"
                                                            value={option.name}
                                                            onChange={(e) => updateAccommodationOption(index, 'name', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                            placeholder="예: 게르"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">가격 조정 (+/-)</label>
                                                        <input
                                                            type="number"
                                                            value={option.priceModifier}
                                                            onChange={(e) => updateAccommodationOption(index, 'priceModifier', Number(e.target.value))}
                                                            className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">설명</label>
                                                        <input
                                                            type="text"
                                                            value={option.description}
                                                            onChange={(e) => updateAccommodationOption(index, 'description', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                            placeholder="옵션 설명"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t dark:border-slate-700 my-6"></div>

                                {/* Vehicle Options */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg dark:text-white">차량 옵션</h3>
                                        <button
                                            type="button"
                                            onClick={addVehicleOption}
                                            className="px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 text-sm"
                                        >
                                            + 차량 옵션 추가
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.vehicleOptions?.map((option, index) => (
                                            <div key={index} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg relative">
                                                <div className="absolute top-2 right-2 flex gap-2">
                                                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            checked={option.isDefault || false}
                                                            onChange={() => updateVehicleOption(index, 'isDefault', true)}
                                                            className="text-teal-500 focus:ring-teal-500"
                                                        />
                                                        기본값
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVehicleOption(index)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">이름</label>
                                                        <input
                                                            type="text"
                                                            value={option.name}
                                                            onChange={(e) => updateVehicleOption(index, 'name', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                            placeholder="예: 스타렉스"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">가격 조정 (+/-)</label>
                                                        <input
                                                            type="number"
                                                            value={option.priceModifier}
                                                            onChange={(e) => updateVehicleOption(index, 'priceModifier', Number(e.target.value))}
                                                            className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">설명</label>
                                                        <input
                                                            type="text"
                                                            value={option.description}
                                                            onChange={(e) => updateVehicleOption(index, 'description', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded dark:bg-slate-900 dark:border-slate-700"
                                                            placeholder="옵션 설명"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Includes Tab */}
                        {currentTab === 'includes' && (
                            <div className="space-y-6">
                                {/* Included */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        포함 사항
                                    </label>
                                    <div className="space-y-2 mb-3">
                                        {formData.included?.map((item, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">check_circle</span>
                                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeIncluded(index)}
                                                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="포함 항목 입력 후 Enter"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addIncluded((e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>

                                {/* Excluded */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        불포함 사항
                                    </label>
                                    <div className="space-y-2 mb-3">
                                        {formData.excluded?.map((item, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">cancel</span>
                                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeExcluded(index)}
                                                    className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="불포함 항목 입력 후 Enter"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addExcluded((e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-bold"
                        >
                            {product ? '수정 완료' : '추가 완료'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};
