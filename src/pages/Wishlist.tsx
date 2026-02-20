import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { optimizeImage } from '../utils/imageOptimizer';
import { useTranslation } from 'react-i18next';

interface WishlistItem {
    id: string;
    productId: string;
    productName: string;
    productImage: string;
    category: string;
    price: number;
    addedAt: string;
}

export const Wishlist: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWishlist = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('wishlist')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mapped: WishlistItem[] = data.map(item => ({
                    id: item.id,
                    productId: item.product_id,
                    productName: item.title,
                    productImage: item.image,
                    category: item.category,
                    price: item.price,
                    addedAt: item.created_at
                }));
                setWishlist(mapped);
            }
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, []);

    const handleRemoveFromWishlist = async (wishlistId: string) => {
        try {
            const { error } = await supabase
                .from('wishlist')
                .delete()
                .eq('id', wishlistId);

            if (error) throw error;

            // UI optimistic update or refetch
            setWishlist(prev => prev.filter(item => item.id !== wishlistId));
        } catch (error) {
            console.error('Failed to remove from wishlist:', error);
            alert(t('wishlist.delete_failed'));
        }
    };

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
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">{t('wishlist.title')}</h2>
                </div>
            </nav>

            <main className="max-w-md mx-auto">
                {wishlist && wishlist.length > 0 ? (
                    <div className="p-4 space-y-3">
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">{t('wishlist.total_count', { count: wishlist.length })}</p>
                        </div>
                        {wishlist.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-gray-50 dark:border-zinc-800 flex gap-4"
                            >
                                <div
                                    onClick={() => navigate(`/products/${item.productId}`)}
                                    className="w-20 h-20 rounded-lg bg-gray-200 bg-cover bg-center shrink-0 cursor-pointer"
                                    style={{ backgroundImage: item.productImage ? `url('${optimizeImage(item.productImage, { width: 80, height: 80 })}')` : undefined }}
                                >
                                    {!item.productImage && (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-400">image</span>
                                        </div>
                                    )}
                                </div>
                                <div
                                    onClick={() => navigate(`/products/${item.productId}`)}
                                    className="flex-1 min-w-0 cursor-pointer"
                                >
                                    <h3 className="text-base font-bold text-[#0e1a18] dark:text-white mb-1 line-clamp-2">
                                        {item.productName}
                                    </h3>
                                    {item.category && (
                                        <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        {item.price && (
                                            <p className="text-sm font-bold text-primary">
                                                {item.price.toLocaleString()}{t('wishlist.won_suffix')}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400">
                                            {new Date(item.addedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveFromWishlist(item.id)}
                                    className="shrink-0 self-start p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <span className="material-symbols-outlined text-red-500 fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        favorite
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">favorite_border</span>
                        <p className="text-gray-500 text-center mb-2">{t('wishlist.empty_title')}</p>
                        <p className="text-sm text-gray-400 text-center mb-6">{t('wishlist.empty_subtitle')}</p>
                        <button
                            onClick={() => navigate('/products')}
                            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                            {t('wishlist.browse_products')}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};
