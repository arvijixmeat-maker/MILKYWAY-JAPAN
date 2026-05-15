import React, { useState, useMemo, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';
import { optimizeImage } from '../utils/imageOptimizer';
import { getOptimizedImageUrl } from '../utils/cloudflareImage';
import type { TourProduct, TourPricingOption, AccommodationOption, VehicleOption, DetailSlide, DetailContentBlock, DividerContent, TimelineContent, DayInfoContent } from '../types/product';
import type { Category } from '../types/category';
import type { Hotel } from '../types/hotel';
import type { TouristSpot } from '../types/touristSpot';
import { HotelPickerModal } from '../components/admin/HotelPickerModal';
import { TouristSpotPickerModal } from '../components/admin/TouristSpotPickerModal';



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
                    faqs: parse(item.faqs),
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
                faqs: productToSave.faqs,
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

    const duplicateProduct = async (product: TourProduct) => {
        if (confirm(`'${product.name}' 상품을 복제하시겠습니까?`)) {
            const duplicatedProduct: TourProduct = {
                ...product,
                id: `prod-${Date.now()}`,
                name: `${product.name} (복제본)`,
                status: 'inactive',
                isFeatured: false,
                isPopular: false,
                viewCount: 0,
                bookingCount: 0
            };
            
            await saveProducts([], duplicatedProduct);
        }
    };

    // Drag and Drop for Products List
    const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);

    const handleProductDragStart = (e: React.DragEvent, index: number) => {
        setDraggedProductIndex(index);
        // Required for Firefox
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleProductDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (draggedProductIndex === null || draggedProductIndex === index) return;
        
        // When filtering or pagination is active, reordering might be tricky.
        // For simplicity, we'll only allow reordering if we are showing all items or searching.
        // And we'll apply it to the main `products` array.
        const draggedProduct = paginatedProducts[draggedProductIndex];
        const targetProduct = paginatedProducts[index];

        // Find their actual indices in the main `products` array
        const actualDragIndex = products.findIndex(p => p.id === draggedProduct.id);
        const actualTargetIndex = products.findIndex(p => p.id === targetProduct.id);

        if (actualDragIndex === -1 || actualTargetIndex === -1) return;

        const newProducts = [...products];
        // Remove from old position
        newProducts.splice(actualDragIndex, 1);
        // Insert at new position
        newProducts.splice(actualTargetIndex, 0, draggedProduct);
        
        setProducts(newProducts);
        setDraggedProductIndex(index);
    };

    const handleProductDragEnd = async () => {
        setDraggedProductIndex(null);
        
        try {
            // Update the sort_order in the backend based on the current products array order
            const orderData = products.map((p, index) => ({
                id: p.id,
                sortOrder: index
            }));
            
            await api.products.reorder(orderData);
            // Optionally show a toast for successful save
        } catch (error) {
            console.error('Failed to save product order:', error);
            alert('순서 저장에 실패했습니다.');
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
                                    {paginatedProducts.map((product, index) => (
                                        <tr 
                                            key={product.id} 
                                            draggable
                                            onDragStart={(e) => handleProductDragStart(e, index)}
                                            onDragOver={(e) => handleProductDragOver(e, index)}
                                            onDrop={handleProductDragEnd}
                                            onDragEnd={handleProductDragEnd}
                                            className={`transition-colors cursor-move 
                                                ${draggedProductIndex === index ? 'opacity-50 bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                                            `}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing mr-2">drag_indicator</span>
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
                                                    <p className="font-bold text-slate-900 dark:text-white">₩{typeof product.price === 'number' ? product.price.toLocaleString() : (product.price || 0)}</p>
                                                    {product.originalPrice && (
                                                        <p className="text-xs text-slate-400 line-through">₩{typeof product.originalPrice === 'number' ? product.originalPrice.toLocaleString() : (product.originalPrice || 0)}</p>
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
                                                    <span>{typeof product.viewCount === 'number' ? product.viewCount.toLocaleString() : (product.viewCount || 0)}</span>
                                                    <span className="text-teal-600 dark:text-teal-400 font-bold">{product.bookingCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => duplicateProduct(product)}
                                                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                        title="복제"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">content_copy</span>
                                                    </button>
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
            faqs: [],
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

    // FAQ Handlers — per-product Q&A list. When empty the frontend falls
    // back to the site-wide common FAQs.
    const addFAQ = () => {
        setFormData({
            ...formData,
            faqs: [...(formData.faqs || []), { q: '', a: '' }],
        });
    };
    const updateFAQ = (index: number, field: 'q' | 'a', value: string) => {
        const updated = [...(formData.faqs || [])];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, faqs: updated });
    };
    const removeFAQ = (index: number) => {
        setFormData({
            ...formData,
            faqs: formData.faqs?.filter((_, i) => i !== index),
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
    const addDetailBlock = (type: 'image' | 'slide' | 'divider' | 'timeline' | 'dayInfo', dayLabel?: string) => {
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
        } else if (type === 'timeline') {
            content = {
                id: `timeline-${Date.now()}`,
                time: '',
                title: '',
                description: '',
                images: []
            };
        } else if (type === 'dayInfo') {
            content = {
                id: `dayinfo-${Date.now()}`,
                dayLabel: dayLabel || '',
                dayDate: '',
                title: '',
                description: '',
                meals: { breakfast: '', lunch: '', dinner: '' },
                accommodation: ''
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


    // ─── Hotel picker — works for both dayInfo (숙소) and timeline (일정 항목) ─
    // Target type lets the picker know which block to update on selection.
    const [hotelPickerTarget, setHotelPickerTarget] = useState<
        { kind: 'dayInfoAccommodation' | 'timeline'; index: number } | null
    >(null);
    const handleHotelPick = (hotel: Hotel) => {
        if (!hotelPickerTarget) return;
        const { kind, index } = hotelPickerTarget;
        const block = formData.itineraryBlocks?.[index];
        if (!block) {
            setHotelPickerTarget(null);
            return;
        }

        if (kind === 'dayInfoAccommodation' && block.type === 'dayInfo') {
            updateItineraryBlockContent(index, {
                ...(block.content as DayInfoContent),
                accommodation: hotel.name_kr,
                accommodationHotelId: hotel.id,
            });
        } else if (kind === 'timeline' && block.type === 'timeline') {
            // For a TIMELINE block: push hotel data into title + description + images.
            // This is the "hotel as a timeline event" flow (e.g., 호텔 체크인).
            const current = block.content as TimelineContent;
            const hotelDesc = [hotel.description, hotel.address].filter(Boolean).join('\n\n');
            updateItineraryBlockContent(index, {
                ...current,
                title: hotel.name_kr,
                description: hotelDesc || current.description,
                images: hotel.images && hotel.images.length > 0 ? [...hotel.images] : current.images,
            });
        }
        setHotelPickerTarget(null);
    };

    // ─── Tourist spot picker — only opens from TIMELINE blocks ─────────
    const [spotPickerForIndex, setSpotPickerForIndex] = useState<number | null>(null);
    const handleSpotPick = (spot: TouristSpot) => {
        if (spotPickerForIndex == null) return;
        const block = formData.itineraryBlocks?.[spotPickerForIndex];
        if (block && block.type === 'timeline') {
            const current = block.content as TimelineContent;
            const desc = [spot.description, spot.address].filter(Boolean).join('\n\n');
            updateItineraryBlockContent(spotPickerForIndex, {
                ...current,
                title: spot.name_kr,
                description: desc || current.description,
                images: spot.images && spot.images.length > 0 ? [...spot.images] : current.images,
            });
        }
        setSpotPickerForIndex(null);
    };

    // Backwards-compat helper for the existing dayInfo button.
    const setHotelPickerForIndex = (index: number | null) => {
        if (index == null) setHotelPickerTarget(null);
        else setHotelPickerTarget({ kind: 'dayInfoAccommodation', index });
    };

    // ─── Bulk image upload (drag&drop multi-file) ─────────────────────
    // Uploads all files in parallel and appends one image block per file.
    // Lets the admin drop 20 photos at once instead of clicking "이미지 추가"
    // → empty box → file picker for each one.
    const [itineraryBulkUploading, setItineraryBulkUploading] = useState(false);
    const [itineraryBulkProgress, setItineraryBulkProgress] = useState<{ done: number; total: number } | null>(null);
    const bulkAddItineraryImages = async (files: File[]) => {
        if (files.length === 0) return;
        setItineraryBulkUploading(true);
        setItineraryBulkProgress({ done: 0, total: files.length });
        try {
            // Upload all files. Track progress as each resolves so admin sees
            // "5/20 업로드 중..." instead of just spinning indefinitely.
            let done = 0;
            const urls = await Promise.all(
                files.map((f) =>
                    uploadImage(f, 'product-details').then((url) => {
                        done += 1;
                        setItineraryBulkProgress({ done, total: files.length });
                        return url;
                    })
                )
            );
            const stamp = Date.now();
            const newBlocks: DetailContentBlock[] = urls.map((url, i) => ({
                id: `block-${stamp}-${i}-${Math.random().toString(36).slice(2, 8)}`,
                type: 'image',
                content: url,
            }));
            setFormData((prev) => ({
                ...prev,
                itineraryBlocks: [...(prev.itineraryBlocks || []), ...newBlocks],
            }));
        } catch (e) {
            console.error('Bulk itinerary image upload failed:', e);
            alert('이미지 업로드 중 일부가 실패했습니다.');
        } finally {
            setItineraryBulkUploading(false);
            setItineraryBulkProgress(null);
        }
    };

    // ─── N-day skeleton generator ────────────────────────────────────
    // One click → creates N dayInfo blocks (1日目 … N日目) with dividers
    // between them. Admin then just fills in titles / descriptions per day.
    const DAY_LABELS_JP = [
        '1日目（いちにちめ）', '2日目（ふつかめ）', '3日目（みっかめ）',
        '4日目（よっかめ）', '5日目（いつかめ）', '6日目（むいかめ）',
        '7日目（なのかめ）', '8日目（ようかめ）', '9日目（ここのかめ）',
        '10日目（とおかめ）',
    ];
    const addDaysSkeleton = (days: number) => {
        if (!Number.isFinite(days) || days < 1) return;
        const capped = Math.min(14, Math.max(1, Math.floor(days)));
        const stamp = Date.now();
        const newBlocks: DetailContentBlock[] = [];
        for (let i = 0; i < capped; i++) {
            newBlocks.push({
                id: `block-${stamp}-d${i}-info`,
                type: 'dayInfo',
                content: {
                    id: `dayinfo-${stamp}-${i}`,
                    dayLabel: DAY_LABELS_JP[i] || `${i + 1}日目`,
                    dayDate: '',
                    title: '',
                    description: '',
                    meals: { breakfast: '', lunch: '', dinner: '' },
                    accommodation: '',
                },
            });
            if (i < capped - 1) {
                newBlocks.push({
                    id: `block-${stamp}-d${i}-divider`,
                    type: 'divider',
                    content: { style: 'space', height: 40 },
                });
            }
        }
        // Prepend day-skeleton blocks before any existing content. This way if
        // the admin already added timeline events without dayInfo, those events
        // fall under the new day 1 (the frontend groups by dayInfo order).
        setFormData((prev) => {
            const existing = prev.itineraryBlocks || [];
            const hasAnyDayInfo = existing.some((b) => b.type === 'dayInfo');
            if (!hasAnyDayInfo) {
                return { ...prev, itineraryBlocks: [...newBlocks, ...existing] };
            }
            return { ...prev, itineraryBlocks: [...existing, ...newBlocks] };
        });
    };

    // Itinerary Block Handlers (same as Detail Block but for itinerary)
    const addItineraryBlock = (type: 'image' | 'slide' | 'divider' | 'timeline' | 'dayInfo', dayLabel?: string) => {
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
        } else if (type === 'timeline') {
            content = {
                id: `timeline-${Date.now()}`,
                time: '',
                title: '',
                description: '',
                images: []
            };
        } else if (type === 'dayInfo') {
            content = {
                id: `dayinfo-${Date.now()}`,
                dayLabel: dayLabel || '',
                dayDate: '',
                title: '',
                description: '',
                meals: { breakfast: '', lunch: '', dinner: '' },
                accommodation: ''
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

    /**
     * Adds a TIMELINE block right after the dayInfo at `afterDayIndex`,
     * i.e. at the *end* of that day's events but *before* the next dayInfo.
     * This lets admin add 5~10 events per day without using ↑/↓ arrows.
     */
    const addTimelineAfterDay = (afterDayIndex: number) => {
        const blocks = formData.itineraryBlocks ?? [];
        if (afterDayIndex < 0 || afterDayIndex >= blocks.length) return;
        if (blocks[afterDayIndex].type !== 'dayInfo') return;

        // Find the index of the next dayInfo block (or end of array).
        let insertAt = blocks.length;
        for (let i = afterDayIndex + 1; i < blocks.length; i++) {
            if (blocks[i].type === 'dayInfo') {
                insertAt = i;
                break;
            }
        }

        const newBlock: DetailContentBlock = {
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'timeline',
            content: {
                id: `timeline-${Date.now()}`,
                time: '',
                title: '',
                description: '',
                images: [],
            },
        };

        const next = [...blocks];
        next.splice(insertAt, 0, newBlock);
        setFormData({ ...formData, itineraryBlocks: next });

        // Scroll to the newly inserted block after the next paint so the admin
        // sees where it went.
        setTimeout(() => {
            const el = document.querySelector(`[data-itinerary-block="${newBlock.id}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
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
            const url = await uploadImage(file, 'product-details');
            updateItineraryBlockContent(index, url);
        } catch (error) {
            console.error('Itinerary block image upload failed:', error);
            alert('이미지 업로드 실패');
        }
    };

    const handleItinerarySlideBlockImages = async (blockIndex: number, files: FileList | null) => {
        if (!files) return;

        try {
            const uploadPromises = Array.from(files).map(file => uploadImage(file, 'product-details'));
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

    // Generic Timeline Block Handlers
    const updateTimelineInBlock = (blocksArray: 'detail' | 'itinerary', blockIndex: number, field: string, value: any) => {
        const blocks = [...(blocksArray === 'detail' ? (formData.detailBlocks || []) : (formData.itineraryBlocks || []))];
        const block = blocks[blockIndex];
        if (block.type !== 'timeline') return;
        const timeline = block.content as TimelineContent;
        const updatedTimeline = { ...timeline, [field]: value };
        blocks[blockIndex] = { ...block, content: updatedTimeline };
        
        if (blocksArray === 'detail') setFormData({ ...formData, detailBlocks: blocks });
        else setFormData({ ...formData, itineraryBlocks: blocks });
    };
    
    const handleTimelineBlockImages = async (blocksArray: 'detail' | 'itinerary', blockIndex: number, files: FileList | null) => {
        if (!files) return;
        try {
            const uploadPromises = Array.from(files).map(file => uploadImage(file, 'product-details'));
            const urls = await Promise.all(uploadPromises);
            
            const blocks = [...(blocksArray === 'detail' ? (formData.detailBlocks || []) : (formData.itineraryBlocks || []))];
            const block = blocks[blockIndex];
            if (block.type === 'timeline') {
                const currentTimeline = block.content as TimelineContent;
                const updatedTimeline = {
                    ...currentTimeline,
                    images: [...currentTimeline.images, ...urls]
                };
                blocks[blockIndex] = { ...block, content: updatedTimeline };
                if (blocksArray === 'detail') setFormData({ ...formData, detailBlocks: blocks });
                else setFormData({ ...formData, itineraryBlocks: blocks });
            }
        } catch (error) {
            console.error('Timeline images upload failed:', error);
            alert('이미지 업로드 실패');
        }
    };
    
    const removeTimelineBlockImage = (blocksArray: 'detail' | 'itinerary', blockIndex: number, imgIndex: number) => {
        const blocks = [...(blocksArray === 'detail' ? (formData.detailBlocks || []) : (formData.itineraryBlocks || []))];
        const block = blocks[blockIndex];
        if (block.type !== 'timeline') return;
        const timeline = block.content as TimelineContent;
        const newTimeline = { ...timeline, images: timeline.images.filter((_, i) => i !== imgIndex) };
        blocks[blockIndex] = { ...block, content: newTimeline };
        
        if (blocksArray === 'detail') setFormData({ ...formData, detailBlocks: blocks });
        else setFormData({ ...formData, itineraryBlocks: blocks });
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

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            상품 설명 / 概要 <span className="text-xs font-normal text-slate-500">(PC 상세페이지 「概要」 + 검색 결과·공유 미리보기)</span>
                                        </label>
                                        <span className={`text-xs ${(formData.description?.length || 0) > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {formData.description?.length || 0} / 160
                                        </span>
                                    </div>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        placeholder="例: 満天の星空と夕陽に染まる大草原、遊牧民文化を体験する中央モンゴル3泊4日ツアー。日本語ガイド同行、全日程食事・宿泊込み。"
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Google検索・LINE/カカオ共有時に表示される短い紹介文です。100〜160字が最適です。
                                    </p>
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
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                하이라이트 / ハイライト
                                            </label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                PC 상세페이지 「ハイライト」 4개 카드. 비워두면 기본값(다크스카이·자연경관·ゲル宿泊·日本語ガイド)이 표시됩니다.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addHighlight}
                                            className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline shrink-0 ml-3"
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

                                {/* FAQ — per-product Q&A. Empty list = use site-wide common FAQs. */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                                FAQ (자주 묻는 질문)
                                            </label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                비워두면 사이트 공통 FAQ가 자동 표시됩니다.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addFAQ}
                                            className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline"
                                        >
                                            + Q&A 추가
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.faqs?.map((faq, index) => (
                                            <div
                                                key={index}
                                                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 pt-2.5 font-mono">
                                                        Q{index + 1}.
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={faq.q}
                                                        onChange={(e) => updateFAQ(index, 'q', e.target.value)}
                                                        placeholder="질문"
                                                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFAQ(index)}
                                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={faq.a}
                                                    onChange={(e) => updateFAQ(index, 'a', e.target.value)}
                                                    placeholder="답변"
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                />
                                            </div>
                                        ))}
                                        {(!formData.faqs || formData.faqs.length === 0) && (
                                            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                                Q&A를 추가하지 않으면 사이트 공통 FAQ가 사용됩니다.
                                            </div>
                                        )}
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
                                                    onClick={() => addDetailBlock('timeline')}
                                                    className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">timeline</span>
                                                    타임라인 추가
                                                </button>
                                                <select
                                                    onChange={(e) => { if (e.target.value) { addDetailBlock('dayInfo', e.target.value); e.target.value = ''; } }}
                                                    defaultValue=""
                                                    className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors cursor-pointer appearance-none"
                                                    style={{ backgroundImage: 'none' }}
                                                >
                                                    <option value="" disabled>📅 일차 추가</option>
                                                    <option value="1日目（いちにちめ）">1日目（いちにちめ）</option>
                                                    <option value="2日目（ふつかめ）">2日目（ふつかめ）</option>
                                                    <option value="3日目（みっかめ）">3日目（みっかめ）</option>
                                                    <option value="4日目（よっかめ）">4日目（よっかめ）</option>
                                                    <option value="5日目（いつかめ）">5日目（いつかめ）</option>
                                                    <option value="6日目（むいかめ）">6日目（むいかめ）</option>
                                                    <option value="7日目（なのかめ）">7日目（なのかめ）</option>
                                                    <option value="8日目（ようかめ）">8日目（ようかめ）</option>
                                                    <option value="9日目（ここのかめ）">9日目（ここのかめ）</option>
                                                    <option value="10日目（とおかめ）">10日目（とおかめ）</option>
                                                </select>
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
                                                                {block.type === 'image' ? 'SINGLE' : (block.type === 'slide' ? 'SLIDE' : (block.type === 'timeline' ? 'TIMELINE' : (block.type === 'dayInfo' ? 'DAY INFO' : 'DIVIDER')))}
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
                                                    ) : block.type === 'timeline' ? (
                                                        // TIMELINE BLOCK
                                                        <div>
                                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                                <div>
                                                                    <input type="text" value={(block.content as TimelineContent).time || ''} onChange={(e) => updateTimelineInBlock('detail', index, 'time', e.target.value)} placeholder="시간 (예: 10:00) - 선택" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                </div>
                                                                <div>
                                                                    <input type="text" value={(block.content as TimelineContent).title || ''} onChange={(e) => updateTimelineInBlock('detail', index, 'title', e.target.value)} placeholder="제목 (예: 자이승 전망대)" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold" />
                                                                </div>
                                                            </div>
                                                            <div className="mb-3">
                                                                <textarea value={(block.content as TimelineContent).description || ''} onChange={(e) => updateTimelineInBlock('detail', index, 'description', e.target.value)} placeholder="설명" rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                            </div>
                                                            <div className="mb-2">
                                                                <label className="block text-xs text-slate-500 mb-1">이미지 목록 (다중 업로드 기능)</label>
                                                                <input type="file" accept="image/*" multiple onChange={(e) => handleTimelineBlockImages('detail', index, e.target.files)} className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700" />
                                                            </div>
                                                            {(block.content as TimelineContent).images?.length > 0 && (
                                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                                    {(block.content as TimelineContent).images.map((img, imgIdx) => (
                                                                        <div key={imgIdx} className="relative flex-shrink-0">
                                                                            <img src={getOptimizedImageUrl(img, 'productThumbnail')} alt={`TL Img ${imgIdx}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                                                                            <button type="button" onClick={() => removeTimelineBlockImage('detail', index, imgIdx)} className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white"><span className="material-symbols-outlined text-xs">close</span></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : block.type === 'dayInfo' ? (
                                                        // DAY INFO BLOCK
                                                        <div>
                                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                                <div>
                                                                    <label className="block text-xs text-slate-500 mb-1">일차</label>
                                                                    <div className="w-full px-3 py-2 border rounded-lg text-sm bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold">{(block.content as DayInfoContent).dayLabel || '미지정'}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-slate-500 mb-1">날짜 (예: 05/26(화))</label>
                                                                    <input type="text" value={(block.content as DayInfoContent).dayDate || ''} onChange={(e) => updateBlockContent(index, { ...(block.content as DayInfoContent), dayDate: e.target.value })} placeholder="05/26(화)" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-3 mb-3">
                                                                <div>
                                                                    <label className="block text-xs text-slate-500 mb-1">일정 제목</label>
                                                                    <input type="text" value={(block.content as DayInfoContent).title || ''} onChange={(e) => updateBlockContent(index, { ...(block.content as DayInfoContent), title: e.target.value })} placeholder="인천, 울란바토르, 고르히-테렐지" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-slate-500 mb-1">주요 일정 요약</label>
                                                                    <input type="text" value={(block.content as DayInfoContent).description || ''} onChange={(e) => updateBlockContent(index, { ...(block.content as DayInfoContent), description: e.target.value })} placeholder="대형마트, 테렐지 국립공원, 거북 바위..." className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                </div>
                                                            </div>
                                                            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                                <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">🍽 식사 정보</label>
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 mb-0.5">조식</label>
                                                                        <input type="text" value={(block.content as DayInfoContent).meals?.breakfast || ''} onChange={(e) => updateBlockContent(index, { ...(block.content as DayInfoContent), meals: { ...(block.content as DayInfoContent).meals, breakfast: e.target.value } })} placeholder="캠프식" className="w-full px-2 py-1.5 border rounded text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 mb-0.5">중식</label>
                                                                        <input type="text" value={(block.content as DayInfoContent).meals?.lunch || ''} onChange={(e) => updateBlockContent(index, { ...(block.content as DayInfoContent), meals: { ...(block.content as DayInfoContent).meals, lunch: e.target.value } })} placeholder="현지식" className="w-full px-2 py-1.5 border rounded text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 mb-0.5">석식</label>
                                                                        <input type="text" value={(block.content as DayInfoContent).meals?.dinner || ''} onChange={(e) => updateBlockContent(index, { ...(block.content as DayInfoContent), meals: { ...(block.content as DayInfoContent).meals, dinner: e.target.value } })} placeholder="캠프식" className="w-full px-2 py-1.5 border rounded text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                                <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">🏠 숙소 정보</label>
                                                                <input type="text" value={(block.content as DayInfoContent).accommodation || ''} onChange={(e) => updateBlockContent(index, { ...(block.content as DayInfoContent), accommodation: e.target.value })} placeholder="개별화장실과 샤워실이 구비된 디럭스게르" className="w-full px-2 py-1.5 border rounded text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                            </div>
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
                                {/* ─── Quick actions: bulk image upload + N-day skeleton ─── */}
                                <ItineraryQuickActions
                                    onBulkImages={bulkAddItineraryImages}
                                    onSkeleton={addDaysSkeleton}
                                    uploading={itineraryBulkUploading}
                                    progress={itineraryBulkProgress}
                                />

                                {/* Itinerary Block Content Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            일정 블록 (위에서 아래로 표시되는 순서)
                                        </label>
                                        <div className="flex gap-2 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => addItineraryBlock('timeline')}
                                                className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                                                title="시간·제목·설명·이미지가 들어가는 일정 항목 (예: '10:00 자이승 전망대 + 사진 3장')"
                                            >
                                                <span className="material-symbols-outlined text-sm">add_location</span>
                                                일정 항목 추가
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addItineraryBlock('image')}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                                title="단일 이미지 하나만 (긴 한 장 이미지에 적합)"
                                            >
                                                <span className="material-symbols-outlined text-sm">image</span>
                                                사진 1장
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addItineraryBlock('slide')}
                                                className="px-3 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-1"
                                                title="사진 여러 장을 가로 갤러리로 묶음 (제목 부여 가능)"
                                            >
                                                <span className="material-symbols-outlined text-sm">view_carousel</span>
                                                갤러리
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addItineraryBlock('divider')}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                                title="블록 사이 간격 또는 가로선"
                                            >
                                                <span className="material-symbols-outlined text-sm">remove</span>
                                                구분선
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        💡 <strong>사용 방법:</strong>
                                        <ul className="mt-1.5 ml-4 list-disc space-y-0.5">
                                            <li><strong>1日目, 2日目 헤더</strong>는 위쪽 <span className="text-amber-700 dark:text-amber-400 font-semibold">「N일 일정 골격 만들기」</span> 버튼으로 한 번에 생성하세요. 헤더 안에 도시명·식사·숙소를 입력하시면 됩니다.</li>
                                            <li><strong>각 일자 안의 이벤트</strong>(예: 자이승 전망대 방문 + 사진 5장)는 <span className="text-blue-600 dark:text-blue-400 font-semibold">「일정 항목 추가」</span> 버튼으로 추가. 시간·제목·설명·사진 여러 장 입력 가능.</li>
                                            <li>해당 일자의 식사·숙소는 그 일자의 <strong>DAY INFO</strong> 블록 안에 입력 — PC 화면에서 자동으로 그 일자 맨 아래에 표시됩니다.</li>
                                            <li>이미지만 길게 한 장씩 올리는 상품은 위쪽 <span className="text-teal-600 dark:text-teal-400 font-semibold">드래그&드롭 박스</span>로 한꺼번에.</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-4">
                                        {(formData.itineraryBlocks || []).map((block, index) => (
                                            <div key={block.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 relative">
                                                {/* Block Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                            {block.type === 'image' ? 'SINGLE' : (block.type === 'slide' ? 'SLIDE' : (block.type === 'timeline' ? 'TIMELINE' : (block.type === 'dayInfo' ? 'DAY INFO' : 'DIVIDER')))}
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
                                                ) : block.type === 'timeline' ? (
                                                    // TIMELINE BLOCK
                                                    <div>
                                                        {/* Master picker buttons — pull in spot or hotel data with one click. */}
                                                        <div className="mb-3">
                                                            <div className="flex gap-2 mb-2 flex-wrap">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSpotPickerForIndex(index)}
                                                                    className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                                                                    title="관광지 마스터에서 정보를 가져와 제목/설명/사진을 자동으로 채웁니다"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                                                    관광지에서 선택
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setHotelPickerTarget({ kind: 'timeline', index })}
                                                                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                                                                    title="호텔 마스터에서 정보를 가져와 제목/설명/사진을 자동으로 채웁니다"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">hotel</span>
                                                                    호텔에서 선택
                                                                </button>
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                                                💡 <strong>3가지 방법 중 선택:</strong>
                                                                <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                                                                    <li><span className="text-teal-700 dark:text-teal-400 font-semibold">관광지/호텔에서 선택</span> — 마스터 데이터 자동 채움</li>
                                                                    <li>아래에 <strong>제목·설명을 직접 입력</strong> + 이미지 업로드 → 흰 카드로 표시</li>
                                                                    <li>아래에 <strong>제목·설명만 입력</strong> (이미지 없음) → 큰 핀+텍스트로 표시 (지역 안내·이동 정보용)</li>
                                                                </ol>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                                            <div>
                                                                <input type="text" value={(block.content as TimelineContent).time || ''} onChange={(e) => updateTimelineInBlock('itinerary', index, 'time', e.target.value)} placeholder="시간 (예: 10:00) - 선택" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                            </div>
                                                            <div>
                                                                <input type="text" value={(block.content as TimelineContent).title || ''} onChange={(e) => updateTimelineInBlock('itinerary', index, 'title', e.target.value)} placeholder="제목 (예: 자이승 전망대)" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold" />
                                                            </div>
                                                        </div>
                                                        <div className="mb-3">
                                                            <textarea value={(block.content as TimelineContent).description || ''} onChange={(e) => updateTimelineInBlock('itinerary', index, 'description', e.target.value)} placeholder="설명" rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                        </div>
                                                        <div className="mb-2">
                                                            <label className="block text-xs text-slate-500 mb-1">이미지 목록 (다중 업로드 기능)</label>
                                                            <input type="file" accept="image/*" multiple onChange={(e) => handleTimelineBlockImages('itinerary', index, e.target.files)} className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700" />
                                                        </div>
                                                        {(block.content as TimelineContent).images?.length > 0 && (
                                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                                {(block.content as TimelineContent).images.map((img, imgIdx) => (
                                                                    <div key={imgIdx} className="relative flex-shrink-0">
                                                                        <img src={getOptimizedImageUrl(img, 'productThumbnail')} alt={`TL Img ${imgIdx}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                                                                        <button type="button" onClick={() => removeTimelineBlockImage('itinerary', index, imgIdx)} className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white"><span className="material-symbols-outlined text-xs">close</span></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : block.type === 'dayInfo' ? (
                                                    // DAY INFO BLOCK
                                                    <div>
                                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                                            <div>
                                                                <label className="block text-xs text-slate-500 mb-1">일차</label>
                                                                <div className="w-full px-3 py-2 border rounded-lg text-sm bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold">{(block.content as DayInfoContent).dayLabel || '미지정'}</div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-slate-500 mb-1">날짜 (예: 05/26(화))</label>
                                                                <input type="text" value={(block.content as DayInfoContent).dayDate || ''} onChange={(e) => updateItineraryBlockContent(index, { ...(block.content as DayInfoContent), dayDate: e.target.value })} placeholder="05/26(화)" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3 mb-3">
                                                            <div>
                                                                <label className="block text-xs text-slate-500 mb-1">일정 제목</label>
                                                                <input type="text" value={(block.content as DayInfoContent).title || ''} onChange={(e) => updateItineraryBlockContent(index, { ...(block.content as DayInfoContent), title: e.target.value })} placeholder="인천, 울란바토르, 고르히-테렐지" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-slate-500 mb-1">주요 일정 요약</label>
                                                                <input type="text" value={(block.content as DayInfoContent).description || ''} onChange={(e) => updateItineraryBlockContent(index, { ...(block.content as DayInfoContent), description: e.target.value })} placeholder="대형마트, 테렐지 국립공원, 거북 바위..." className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                            </div>
                                                        </div>
                                                        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                            <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">🍽 식사 정보</label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div>
                                                                    <label className="block text-[10px] text-slate-500 mb-0.5">조식</label>
                                                                    <input type="text" value={(block.content as DayInfoContent).meals?.breakfast || ''} onChange={(e) => updateItineraryBlockContent(index, { ...(block.content as DayInfoContent), meals: { ...(block.content as DayInfoContent).meals, breakfast: e.target.value } })} placeholder="캠프식" className="w-full px-2 py-1.5 border rounded text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-slate-500 mb-0.5">중식</label>
                                                                    <input type="text" value={(block.content as DayInfoContent).meals?.lunch || ''} onChange={(e) => updateItineraryBlockContent(index, { ...(block.content as DayInfoContent), meals: { ...(block.content as DayInfoContent).meals, lunch: e.target.value } })} placeholder="현지식" className="w-full px-2 py-1.5 border rounded text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-slate-500 mb-0.5">석식</label>
                                                                    <input type="text" value={(block.content as DayInfoContent).meals?.dinner || ''} onChange={(e) => updateItineraryBlockContent(index, { ...(block.content as DayInfoContent), meals: { ...(block.content as DayInfoContent).meals, dinner: e.target.value } })} placeholder="캠프식" className="w-full px-2 py-1.5 border rounded text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <label className="block text-xs font-bold text-blue-700 dark:text-blue-400">🏠 숙소 정보</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setHotelPickerForIndex(index)}
                                                                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold rounded transition-colors flex items-center gap-1"
                                                                >
                                                                    <span className="material-symbols-outlined text-xs">hotel</span>
                                                                    호텔 마스터에서 선택
                                                                </button>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={(block.content as DayInfoContent).accommodation || ''}
                                                                onChange={(e) => updateItineraryBlockContent(index, { ...(block.content as DayInfoContent), accommodation: e.target.value, accommodationHotelId: undefined })}
                                                                placeholder="개별화장실과 샤워실이 구비된 디럭스게르 (또는 위 버튼으로 마스터 선택)"
                                                                className="w-full px-2 py-1.5 border rounded text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                                            />
                                                            {(block.content as DayInfoContent).accommodationHotelId && (
                                                                <div className="mt-1.5 text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-xs">link</span>
                                                                    호텔 마스터에서 선택됨. 직접 입력하면 연결이 해제됩니다.
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* ★ Add an event to this specific day — inserts a timeline block
                                                            right after this dayInfo so admin can pile on events without
                                                            using ↑/↓ arrows. */}
                                                        <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-300 dark:border-slate-600">
                                                            <button
                                                                type="button"
                                                                onClick={() => addTimelineAfterDay(index)}
                                                                className="w-full py-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg text-sm font-bold text-blue-700 dark:text-blue-300 transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                                                이 일자에 일정 항목 추가
                                                            </button>
                                                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                                                                이 버튼을 누르면 <strong className="text-blue-600 dark:text-blue-400">{(block.content as DayInfoContent).dayLabel || '이 일자'}</strong>의 마지막 일정으로 새 항목이 추가됩니다.
                                                                관광지 마스터에서 한 번에 채울 수 있어요.
                                                            </p>
                                                        </div>
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

                {/* Master pickers — open from either dayInfo or timeline buttons. */}
                <HotelPickerModal
                    open={hotelPickerTarget != null}
                    onPick={handleHotelPick}
                    onClose={() => setHotelPickerTarget(null)}
                />
                <TouristSpotPickerModal
                    open={spotPickerForIndex != null}
                    onPick={handleSpotPick}
                    onClose={() => setSpotPickerForIndex(null)}
                />
            </div >
        </div >
    );
};

// ============================================================================
// Itinerary Quick Actions — bulk image upload zone + N-day skeleton macro.
// Lives at the top of the "일정" tab so adding many photos or stamping out a
// multi-day skeleton is one click away instead of a clicking marathon.
// ============================================================================
interface ItineraryQuickActionsProps {
    onBulkImages: (files: File[]) => void | Promise<void>;
    onSkeleton: (days: number) => void;
    uploading: boolean;
    progress: { done: number; total: number } | null;
}

const ItineraryQuickActions: React.FC<ItineraryQuickActionsProps> = ({
    onBulkImages,
    onSkeleton,
    uploading,
    progress,
}) => {
    const [drag, setDrag] = useState(false);
    const [skeletonDays, setSkeletonDays] = useState<number>(3);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return;
        onBulkImages(files);
    };

    return (
        <div className="space-y-4">
            {/* ─── Bulk image drop zone ─── */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!uploading) setDrag(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDrag(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDrag(false);
                    if (uploading) return;
                    handleFiles(e.dataTransfer.files);
                }}
                onClick={() => {
                    if (uploading) return;
                    fileInputRef.current?.click();
                }}
                className={`relative w-full rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                    drag
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : uploading
                            ? 'border-slate-300 bg-slate-50 dark:bg-slate-800 cursor-wait'
                            : 'border-slate-300 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-slate-800/50'
                }`}
                style={{ padding: '28px 24px' }}
                role="button"
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        // reset so picking the same files again still fires
                        e.target.value = '';
                    }}
                />
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">
                            {uploading ? 'hourglass_top' : 'cloud_upload'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                            {uploading
                                ? `업로드 중... ${progress ? `${progress.done} / ${progress.total}` : ''}`
                                : '이미지 한 번에 업로드'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            여러 장의 사진을 이 박스에 드래그하거나 클릭해서 선택하세요. 각 사진이 자동으로 일정 끝에 추가됩니다.
                        </div>
                    </div>
                    {!uploading && (
                        <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-xl">
                            add_photo_alternate
                        </span>
                    )}
                </div>
            </div>

            {/* ─── N-day skeleton macro ─── */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-amber-700 dark:text-amber-400">
                        calendar_view_day
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-amber-900 dark:text-amber-300">
                        N일 일정 골격 만들기
                    </div>
                    <div className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                        1日目 ~ N日目 헤더와 구분선을 한 번에 생성합니다. 각 날짜는 펼쳐서 내용 채우세요.
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="text-xs font-medium text-amber-900 dark:text-amber-300">일수</label>
                    <select
                        value={skeletonDays}
                        onChange={(e) => setSkeletonDays(Number(e.target.value))}
                        className="px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-sm font-semibold text-amber-900 dark:text-amber-300"
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                                {n}일
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => onSkeleton(skeletonDays)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        생성
                    </button>
                </div>
            </div>
        </div>
    );
};
