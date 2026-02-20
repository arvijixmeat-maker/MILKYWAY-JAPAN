import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

export const ReviewSection: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { data: reviews = [] } = useQuery({
        queryKey: ['homeReviews'],
        queryFn: async () => {
            const { data } = await supabase
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                return data.map((r: any) => ({
                    id: r.id,
                    author: r.author_name,
                    visitDate: r.visit_date,
                    rating: r.rating,
                    content: r.content,
                    images: r.images,
                    productName: r.product_name || t('home.reviews.default_product')
                }));
            }
            return [];
        },
        staleTime: 1000 * 60 * 10, // 10 minutes cache
    });

    return (
        <section className="py-12 bg-white dark:bg-background-dark">
            <div className="max-w-[1280px] mx-auto">
                <div className="flex items-end justify-between mb-6 px-5">
                    <div>
                        <h3 className="text-xl font-bold text-[#0e1a18] dark:text-white mb-2">{t('home.reviews.title')}</h3>
                    </div>
                    <button
                        onClick={() => navigate('/reviews')}
                        className="flex items-center gap-1 text-primary text-sm font-bold whitespace-nowrap shrink-0 mb-0.5 hover:text-primary/80 transition-colors"
                    >
                        {t('home.reviews.view_all')}
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                </div>

                <div className="flex overflow-x-auto gap-5 px-5 pb-8 scrollbar-hide snap-x snap-mandatory">
                    {reviews?.map((review) => (
                        <div
                            key={review.id}
                            onClick={() => navigate(`/reviews/${review.id}`)}
                            className="min-w-[300px] w-[300px] h-[220px] snap-center bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm shrink-0">
                                        {review.author?.charAt(0) || t('home.reviews.anonymous')}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">{review.author} {t('home.reviews.user_suffix')}</div>
                                        <div className="flex text-yellow-400 text-[12px]">
                                            {[...Array(5)].map((_, i) => (
                                                <span
                                                    key={i}
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '14px', fontVariationSettings: i < review.rating ? "'FILL' 1" : "'FILL' 0" }}
                                                >
                                                    star
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                                    {review.content}
                                </p>
                            </div>

                            <div className="pt-4 mt-2 border-t border-slate-50 dark:border-slate-700">
                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 line-clamp-1">
                                    {review.productName}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Skeleton/Placeholder if empty */}
                    {reviews.length === 0 && (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="min-w-[300px] w-[300px] h-[220px] bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex flex-col gap-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-20 bg-slate-100 dark:bg-slate-700 rounded"></div>
                                        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded"></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded"></div>
                                    <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-700 rounded"></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};
