import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getOptimizedImageUrl } from '../../utils/supabaseImage';
import type { TourProduct } from '../../types/product';

export const CentralMongoliaSection: React.FC = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<TourProduct[]>([]);

    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('category', '중앙몽골')
                .eq('status', 'active')
                .limit(4);

            if (data) {
                const formattedProducts = data.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    originalPrice: item.original_price,
                    duration: item.duration,
                    category: item.category,
                    mainImages: item.main_images || [],
                    isPopular: item.is_popular,
                    tags: item.tags || [],
                    description: item.description,
                    galleryImages: item.gallery_images || [],
                    detailImages: item.detail_images || [],
                    itineraryImages: item.itinerary_images || [],
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
                setProducts(formattedProducts);
            }
        };

        fetchProducts();
    }, []);

    if (products.length === 0) return null;

    return (
        <section className="py-8 px-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-end justify-between mb-5">
                <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">중앙몽골 클래식</h3>
                    <p className="text-[13px] text-slate-500 mt-1">푸른 초원과 역사가 공존하는 곳</p>
                </div>
                <button
                    onClick={() => navigate('/products?category=central')}
                    className="text-primary text-sm font-bold flex items-center"
                >
                    더보기 <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
            </div>

            {/* Horizontal Scroll Layout */}
            <div className="flex overflow-x-auto gap-4 scroll-smooth no-scrollbar snap-x snap-mandatory -mx-5 px-5 pb-2">
                {products.map((product) => (
                    <div
                        key={product.id}
                        onClick={() => navigate(`/products/${product.id}`)}
                        className="flex-shrink-0 w-[240px] snap-center flex flex-col group cursor-pointer"
                    >
                        <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                            <img
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                src={getOptimizedImageUrl(product.mainImages[0], 'productThumbnail')}
                                loading="lazy"
                                width={240}
                                height={240}
                            />
                            {/* Best Badge if applicable - checking tags for 'BEST' or isPopular */}
                            {(product.isPopular || product.tags?.includes('BEST')) && (
                                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary rounded text-[9px] font-bold text-white shadow-sm">
                                    BEST
                                </div>
                            )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                            {product.name}
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <span className="text-primary font-bold text-[14px]">
                                {product.price.toLocaleString()}~
                            </span>
                            {product.originalPrice && (
                                <span className="text-xs text-slate-400 line-through">
                                    {product.originalPrice.toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
