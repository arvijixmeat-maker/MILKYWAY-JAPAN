import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api'; // Changed from supabase
import { optimizeImage } from '../utils/imageOptimizer';

interface RecentlyViewedItem {
    id: string; // Record ID
    productId: string; // Product ID for nav
    productName: string;
    productImage: string;
    category: string;
    price: number;
    viewedAt: string;
}

export const RecentlyViewed: React.FC = () => {
    const navigate = useNavigate();
    const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecentlyViewed = async () => {
        try {
            const me = await api.auth.me();
            if (!me) {
                setLoading(false);
                return;
            }

            const data = await api.recentlyViewed.list();

            if (data) {
                const mapped: RecentlyViewedItem[] = data.map((item: any) => ({
                    id: item.id,
                    productId: item.product_id,
                    productName: item.title,
                    productImage: item.image,
                    category: '상품', // Schema doesn't have category for recently_viewed? Check sql. 
                    // SQL says: id, user_id, product_id, type, title, image, price, created_at. No category.
                    // We can default or maybe it is part of type? type default 'product'.
                    price: item.price,
                    viewedAt: item.created_at
                }));
                // Client-side sort if API doesn't support it yet
                mapped.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
                setRecentlyViewed(mapped);
            }
        } catch (error) {
            console.error('Failed to fetch recently viewed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecentlyViewed();
    }, []);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white min-h-screen pb-20">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button
                        onClick={() => navigate('/mypage')}
                        className="flex size-10 items-center justify-center cursor-pointer text-[#0e1a18] dark:text-white"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">최근 본 상품</h2>
                </div>
            </nav>

            <main className="max-w-md mx-auto">
                {recentlyViewed && recentlyViewed.length > 0 ? (
                    <div className="p-4 space-y-3">
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">총 {recentlyViewed.length}개</p>
                        </div>
                        {recentlyViewed.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/products/${item.productId}`)}
                                className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-gray-50 dark:border-zinc-800 cursor-pointer hover:shadow-md transition-shadow flex gap-4"
                            >
                                <div
                                    className="w-20 h-20 rounded-lg bg-gray-200 bg-cover bg-center shrink-0"
                                    style={{ backgroundImage: item.productImage ? `url('${optimizeImage(item.productImage, { width: 80, height: 80 })}')` : undefined }}
                                >
                                    {!item.productImage && (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-400">image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-[#0e1a18] dark:text-white mb-1 line-clamp-2">
                                        {item.productName}
                                    </h3>
                                    {item.category && (
                                        <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        {item.price && (
                                            <p className="text-sm font-bold text-primary">
                                                {typeof item.price === 'number' ? item.price.toLocaleString() : (item.price || 0)}원~
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400">
                                            {new Date(item.viewedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">visibility</span>
                        <p className="text-gray-500 text-center mb-2">최근 본 상품이 없습니다</p>
                        <p className="text-sm text-gray-400 text-center mb-6">상품을 둘러보고 마음에 드는 여행을 찾아보세요</p>
                        <button
                            onClick={() => navigate('/products')}
                            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                            상품 둘러보기
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};
