import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { useTranslation } from 'react-i18next';

export const MyReviews: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const { t, i18n } = useTranslation();

    const [myReviews, setMyReviews] = useState<any[]>([]);

    useEffect(() => {
        const fetchMyReviews = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('author_id', user.id)
                .order('created_at', { ascending: false });

            if (data) {
                // Map DB keys to frontend if needed (or just use snake_case if we update UI)
                // Current UI uses: id, author, date, rating, productName, content, images, userImage, helpfulCount
                const mapped = data.map(r => ({
                    id: r.id,
                    author: r.author_name,
                    date: r.created_at,
                    rating: r.rating,
                    productName: r.product_name,
                    content: r.content,
                    images: r.images,
                    userImage: r.user_image,
                    helpfulCount: r.helpful_count,
                    comments: [] // comments not yet in DB schema linked/fetched here
                }));
                setMyReviews(mapped);
            }
        };
        fetchMyReviews();
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekday = date.toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : 'ko-KR', { weekday: 'short' });

        if (i18n.language === 'ja') {
            return `${year}/${month}/${day} (${weekday})`;
        }
        return `${year}. ${month}. ${day}. (${weekday})`;
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
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">{t('my_reviews.title')}</h2>
                </div>
            </nav>

            <main className="max-w-md mx-auto">
                {!user ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">login</span>
                        <p className="text-gray-500 text-center mb-6">{t('my_reviews.login_required')}</p>
                        <button
                            onClick={() => navigate('/mypage')}
                            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                            {t('my_reviews.go_login')}
                        </button>
                    </div>
                ) : myReviews && myReviews.length > 0 ? (
                    <div className="p-4 space-y-4">
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">{t('my_reviews.total_count', { count: myReviews.length })}</p>
                        </div>
                        {myReviews.map((review) => (
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
                                            <p className="text-[11px] text-gray-400">{formatDate(review.date)}</p>
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
                                        <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2 transition-all duration-200 border border-primary/20">
                                            {review.productName}
                                            <span className="material-symbols-outlined text-[12px] font-bold">chevron_right</span>
                                        </button>
                                    )}
                                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                        {review.content}
                                    </p>

                                </div>
                                {review.images && review.images.length > 0 && (
                                    <div className={`grid gap-2 mt-4 ${review.images.length === 1 ? 'grid-cols-1' : review.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                        {review.images.slice(0, 3).map((img: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className="aspect-square rounded-lg bg-cover bg-center"
                                                style={{ backgroundImage: `url('${img}')` }}
                                            ></div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                                        {review.helpfulCount || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">comment</span>
                                        {review.comments?.length || 0}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">rate_review</span>
                        <p className="text-gray-500 text-center mb-2">{t('my_reviews.empty_title')}</p>
                        <p className="text-sm text-gray-400 text-center mb-6">{t('my_reviews.empty_sub')}</p>
                        <button
                            onClick={() => navigate('/reviews/write')}
                            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                            {t('my_reviews.write_review')}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};
