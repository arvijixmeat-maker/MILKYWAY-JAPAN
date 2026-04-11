import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { ProductCard } from '../components/product/ProductCard';
import { ProductSkeleton } from '../components/skeletons/ProductSkeleton';
import { BottomNav } from '../components/layout/BottomNav';

export const MongolTravel: React.FC = () => {
    const navigate = useNavigate();

    // Fetch Products
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products-all-popular'],
        queryFn: async () => {
            try {
                const data = await api.products.list();
                if (!Array.isArray(data)) return [];
                return data
                    .filter((item: any) => item.status === 'active' && item.is_popular)
                    .map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        originalPrice: item.original_price,
                        duration: item.duration,
                        category: item.category,
                        mainImages: item.mainImages || item.main_images || [],
                        status: item.status,
                    }))
                    .slice(0, 6); // Take top 6 popular products
            } catch (error) {
                console.error('Error fetching products:', error);
                return [];
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "モンゴル旅行 完全ガイド",
        "description": "大自然が広がるモンゴル旅行。おすすめの時期、費用、人気のツアー情報などをご紹介します。",
        "publisher": {
            "@type": "Organization",
            "name": "Milkyway Japan"
        }
    };

    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "ホーム", "item": "https://mongolryokou.com/" },
            { "@type": "ListItem", "position": 2, "name": "モンゴル旅行", "item": "https://mongolryokou.com/mongol-travel" }
        ]
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white transition-colors duration-300 min-h-screen pb-24">
            <SEO
                title="モンゴル旅行ガイド2026 – 費用・ベストシーズン・おすすめツアー"
                description="大自然が広がるモンゴル旅行。おすすめの時期、費用相場、治安、人気のモンゴルツアー情報まで、モンゴル旅行前に知っておきたい完全ガイドです。"
                keywords="モンゴル旅行, モンゴル旅行ガイド, モンゴルツアー, モンゴル旅行費用, モンゴルベストシーズン, Milkyway Japan"
                canonical="/mongol-travel"
                structuredData={[structuredData, breadcrumbData]}
            />
            {/* Top App Bar */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
                <div className="flex items-center p-4 justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="text-[#0e1a18] dark:text-white flex size-12 shrink-0 items-center justify-center -ml-2"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <span className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">モンゴル旅行ガイド</span>
                </div>
            </header>

            <main>
                {/* Hero / Intro */}
                <section className="px-4 pt-2 pb-6">
                    <h1 className="text-2xl font-bold mb-3 text-primary">モンゴル旅行 完全ガイド</h1>
                    <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                        見渡す限りの大草原、どこまでも続く青空、そして遊牧民の暮らしに触れる特別な体験。モンゴルは日常から離れ、大自然のパワーを全身で感じることができる魅力的な国です。短い夏には美しい緑の草原が広がり、秋には黄金色の絶景が楽しめます。初めてのモンゴル旅行におすすめのプランや、ベストシーズンについて詳しくご案内します。
                    </p>
                </section>

                {/* Season & Info Section */}
                <section className="px-4 py-8 bg-white dark:bg-white/5 mt-2 rounded-t-3xl border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-teal-600">calendar_month</span>
                        <h2 className="text-lg font-bold">ベストシーズン・地域別ガイド</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-teal-700 dark:text-teal-400 mb-2">夏のモンゴル（6月〜8月）</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                最も過ごしやすく、草原が一番美しい季節です。テレルジ国立公園やウランバートル近郊での乗馬、ゲル宿泊体験に最適です。日中は暖かく、朝晩は涼しい気候が特徴です。
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-teal-700 dark:text-teal-400 mb-2">ゴビ砂漠の冒険</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                モンゴル南部に位置するゴビ砂漠では、見渡す限りの砂丘や恐竜の化石発掘地などを探索できます。乾燥した空気が澄んでいるため、夜には信じられないほどの満天の星空が広がります。
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-teal-700 dark:text-teal-400 mb-2">フブスグル湖畔での癒し</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                「モンゴルの青い真珠」と称されるフブスグル湖。透き通った湖水と周囲の針葉樹林が織りなす景色は、心が洗われるような美しさです。
                            </p>
                        </div>
                    </div>
                </section>

                {/* Popular Tours Section */}
                <section className="px-4 py-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-[#0e1a18] dark:text-white">人気のモンゴルツアー</h2>
                        <button onClick={() => navigate('/products')} className="text-sm text-teal-600 font-bold hover:underline">
                            すべて見る
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
                        ) : (
                            products.map((product) => <ProductCard key={product.id} product={product} />)
                        )}
                    </div>
                </section>

                {/* Internal Links & CTA */}
                <section className="px-4 py-6 mb-8 flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/travel-guide')}
                        className="w-full flex items-center justify-between p-4 bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200 rounded-xl font-bold transition-transform active:scale-95 border border-teal-100 dark:border-teal-900/50"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined">auto_stories</span>
                            <span>もっと詳しいモンゴル旅行ガイドを見る</span>
                        </div>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                    <button
                        onClick={() => navigate('/faq')}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-transform active:scale-95 border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined">help_outline</span>
                            <span>よくある質問（FAQ）を確認する</span>
                        </div>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </section>
            </main>

            <BottomNav />
        </div>
    );
};
