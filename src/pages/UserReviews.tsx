import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // Changed from db
import { BottomNav } from '../components/layout/BottomNav';

// Define Review type locally or import if available, matching Supabase + Frontend needs
interface Review {
    id: string;
    author: string;
    date: string;
    rating: number;
    title?: string;
    productName?: string;
    productId?: string;
    content: string;
    images: string[];
    userImage?: string;
}

export const UserReviews: React.FC = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = React.useState<'latest' | 'rating' | 'photo'>('latest');
    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all reviews from Supabase
    useEffect(() => {
        const fetchReviews = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) {
                // Map Supabase rows to component state
                const mapped: Review[] = data.map((r: any) => ({
                    id: r.id,
                    author: r.author_name,
                    date: r.created_at ? r.created_at.substring(0, 10) : '',
                    rating: r.rating,
                    title: r.title,
                    productName: r.product_name,
                    productId: r.product_id,
                    content: r.content,
                    images: r.images || [],
                    userImage: r.user_image
                }));
                setAllReviews(mapped);
            }
            setIsLoading(false);
        };
        fetchReviews();
    }, []);

    // Apply filters
    const reviews = React.useMemo(() => {
        if (!allReviews) return [];

        let filtered = [...allReviews];

        // Apply filter
        switch (filter) {
            case 'latest':
                // Already sorted by date descending from fetch, but ensuring
                filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                break;
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'photo':
                filtered = filtered.filter(r => r.images && r.images.length > 0);
                break;
        }

        return filtered;
    }, [allReviews, filter]);

    // Calculate stats
    const totalReviews = allReviews?.length || 0;
    const averageRating = totalReviews > 0
        ? (allReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
        : '0.0';

    const scoreCounts = {
        5: allReviews.filter(r => r.rating === 5).length || 0,
        4: allReviews.filter(r => r.rating === 4).length || 0,
        3: allReviews.filter(r => r.rating === 3).length || 0,
        2: allReviews.filter(r => r.rating === 2).length || 0,
        1: allReviews.filter(r => r.rating === 1).length || 0,
    };

    const getPercentage = (count: number) => {
        return totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white min-h-screen pb-20">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex size-10 items-center justify-center cursor-pointer text-[#0e1a18] dark:text-white"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">사용자 리뷰</h2>
                </div>
            </nav>

            <main className="max-w-md mx-auto pb-24 relative">
                {/* Score Section */}
                <section className="bg-white dark:bg-zinc-900 p-6 mb-2 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex flex-col gap-1 items-center md:items-start">
                            <p className="text-5xl font-extrabold tracking-tighter text-[#0e1a18] dark:text-white">{averageRating}</p>
                            <div className="flex gap-0.5 my-1">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`material-symbols-outlined text-primary text-xl ${i < Math.round(Number(averageRating)) ? 'fill-current' : 'text-gray-200'}`} style={{ fontVariationSettings: i < Math.round(Number(averageRating)) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                                ))}
                            </div>
                            <p className="text-gray-500 text-sm font-medium">{totalReviews.toLocaleString()}개의 생생한 후기</p>
                        </div>
                        <div className="flex-1 space-y-2 mt-2">
                            {[5, 4, 3, 2, 1].map((score) => (
                                <div key={score} className="grid grid-cols-[12px_1fr_35px] items-center gap-3">
                                    <span className="text-xs font-bold text-gray-400">{score}</span>
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${getPercentage(scoreCounts[score as keyof typeof scoreCounts])}%` }}></div>
                                    </div>
                                    <span className="text-[11px] font-semibold text-gray-400 text-right">{getPercentage(scoreCounts[score as keyof typeof scoreCounts])}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Filter Section */}
                <section className="bg-white dark:bg-zinc-900 sticky top-[73px] z-40 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex px-4 gap-6 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setFilter('latest')}
                            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-4 shrink-0 transition-colors ${filter === 'latest'
                                ? 'border-primary text-[#0e1a18] dark:text-white'
                                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <span className="text-sm font-bold">최신순</span>
                        </button>
                        <button
                            onClick={() => setFilter('rating')}
                            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-4 shrink-0 transition-colors ${filter === 'rating'
                                ? 'border-primary text-[#0e1a18] dark:text-white'
                                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <span className="text-sm font-bold">별점 높은순</span>
                        </button>
                        <button
                            onClick={() => setFilter('photo')}
                            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-4 shrink-0 transition-colors ${filter === 'photo'
                                ? 'border-primary text-[#0e1a18] dark:text-white'
                                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <span className="text-sm font-bold">사진 리뷰만 보기</span>
                        </button>
                    </div>
                </section>

                <div className="px-4 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight text-[#0e1a18] dark:text-white">전체 리뷰</h3>
                    <span className="text-xs text-gray-400 font-medium">총 {reviews?.length.toLocaleString() || 0}개</span>
                </div>

                <div className="space-y-4 px-4">
                    {reviews.length === 0 && !isLoading ? (
                        <div className="text-center py-20 text-gray-400">
                            리뷰가 없습니다. 첫 리뷰를 작성해보세요!
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <article
                                key={review.id}
                                onClick={() => navigate(`/reviews/${review.id}`)}
                                className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm border border-gray-50 dark:border-zinc-800 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-full bg-gray-200 bg-cover bg-center"
                                            style={{ backgroundImage: review.userImage ? `url('${review.userImage}')` : undefined }}
                                        >
                                            {!review.userImage && <span className="material-symbols-outlined text-gray-400 w-full h-full flex items-center justify-center">person</span>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#0e1a18] dark:text-white">{review.author}</p>
                                            <p className="text-[11px] text-gray-400">{review.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={`material-symbols-outlined text-[16px] ${i < review.rating ? 'text-primary fill-current' : 'text-gray-200'}`} style={{ fontVariationSettings: i < review.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    {review.productName && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (review.productId) {
                                                    navigate(`/products/${review.productId}`);
                                                }
                                            }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2 transition-all duration-200 border border-primary/20 hover:bg-primary/20 active:scale-95"
                                        >
                                            {review.productName}
                                            <span className="material-symbols-outlined text-[12px] font-bold">chevron_right</span>
                                        </button>
                                    )}
                                    {review.title && (
                                        <h4 className="text-base font-bold text-[#0e1a18] dark:text-white mb-1">{review.title}</h4>
                                    )}
                                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                        {review.content}
                                    </p>
                                </div>
                                {review.images && review.images.length > 0 && (
                                    <div className={`grid gap-2 mt-4 ${review.images.length === 1 ? 'grid-cols-1' : review.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                        {review.images.slice(0, 3).map((img, idx) => (
                                            <div
                                                key={idx}
                                                className="aspect-square rounded-lg bg-cover bg-center"
                                                style={{ backgroundImage: `url('${img}')` }}
                                            ></div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        )))}
                </div>

                {/* FAB */}
                <div className="fixed bottom-[100px] right-4 z-[60] max-w-md w-full pointer-events-none">
                    <div className="flex justify-end pr-4">
                        <button
                            onClick={() => navigate('/reviews/write')}
                            className="pointer-events-auto flex items-center gap-2 bg-primary text-white px-5 py-3.5 rounded-full shadow-[0_4px_12px_rgba(30,180,150,0.3)] active:scale-95 transition-transform duration-100"
                        >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                            <span className="text-sm font-bold">후기 쓰기</span>
                        </button>
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    );
};
