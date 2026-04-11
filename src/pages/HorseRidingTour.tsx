import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { ProductCard } from '../components/product/ProductCard';
import { ProductSkeleton } from '../components/skeletons/ProductSkeleton';
import { BottomNav } from '../components/layout/BottomNav';

export const HorseRidingTour: React.FC = () => {
    const navigate = useNavigate();

    // Fetch and filter Products for Horse Riding
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products-horse-riding'],
        queryFn: async () => {
            try {
                const data = await api.products.list();
                if (!Array.isArray(data)) return [];
                
                const normalize = (text: string) => {
                    if (!text) return '';
                    return text.toLowerCase().replace(/\s+/g, '');
                };

                return data
                    .filter((item: any) => {
                        if (item.status !== 'active') return false;
                        const cat = normalize(item.category || '');
                        const name = normalize(item.name || '');
                        const tags = (item.tags || []).map((t: string) => normalize(t)).join(',');
                        
                        return cat.includes('乗馬') || cat.includes('승마') || cat.includes('riding') ||
                               name.includes('乗馬') || name.includes('승마') || 
                               tags.includes('乗馬') || tags.includes('승마') || tags.includes('riding') || 
                               cat.includes('말');
                    })
                    .map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        originalPrice: item.original_price,
                        duration: item.duration,
                        category: item.category,
                        mainImages: item.mainImages || item.main_images || [],
                        status: item.status,
                    }));
            } catch (error) {
                console.error('Error fetching riding products:', error);
                return [];
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "モンゴル乗馬旅行",
        "description": "初心者でも安心なモンゴル乗馬旅行。大草原を馬で駆け抜ける特別な体験をご紹介します。",
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
            { "@type": "ListItem", "position": 2, "name": "モンゴルツアー比較", "item": "https://mongolryokou.com/mongol-tour" },
            { "@type": "ListItem", "position": 3, "name": "モンゴル乗馬旅行", "item": "https://mongolryokou.com/horse-riding-tour" }
        ]
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white transition-colors duration-300 min-h-screen pb-24">
            <SEO
                title="モンゴル乗馬旅行 – 初心者OK！大草原で楽しむ乗馬ツアー"
                description="モンゴルの大草原を馬で駆ける乗馬旅行。経験豊富な現地ガイドがサポートするため、初心者から上級者まで安心。おすすめのモンゴル乗馬ツアーをご案内します。"
                keywords="モンゴル乗馬旅行, モンゴル乗馬ツアー, 乗馬体験, 初心者乗馬, テレルジ乗馬"
                canonical="/horse-riding-tour"
                structuredData={[structuredData, breadcrumbData]}
            />
            
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center p-4 justify-between">
                    <button
                        onClick={() => navigate('/mongol-tour')}
                        className="text-[#0e1a18] dark:text-white flex size-12 shrink-0 items-center justify-center -ml-2"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <span className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">モンゴル乗馬旅行</span>
                </div>
            </header>

            <main>
                <div className="h-48 bg-teal-800 relative w-full overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 z-10"></div>
                    {/* Optional: Add a real riding image here */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-4 text-center">
                        <span className="inline-block px-2 py-1 bg-teal-500 text-white text-xs font-bold rounded mb-2">おすすめ</span>
                        <h1 className="text-2xl font-bold text-white mb-2 leading-tight">モンゴル乗馬旅行<br/>初心者も安心！大草原を走る旅</h1>
                    </div>
                </div>

                <section className="px-4 py-8">
                    <h2 className="text-xl font-bold mb-4 text-[#0e1a18] dark:text-white border-l-4 border-teal-500 pl-3">モンゴルでの乗馬旅行の魅力</h2>
                    <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300 mb-6">
                        どこまでも続く果てしない大草原を馬に乗って駆け抜ける爽快感。モンゴル乗馬旅行は、他の国では決して味わうことのできない特別な時間です。都会の喧騒から離れ、自然の風を感じながら馬と一体になる体験は、一生の思い出になるでしょう。
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50">
                            <span className="material-symbols-outlined text-teal-600 shrink-0 text-3xl">sentiment_satisfied</span>
                            <div>
                                <h3 className="font-bold text-teal-800 dark:text-teal-400 mb-1">未経験・初心者でも安心！</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Milkyway Japanの乗馬ツアーは、経験豊富な現地の遊牧民ガイドが同行します。馬の乗り方から手綱の引き方まで、優しく丁寧にレクチャーするため、初めての方でも安心してご参加いただけます。
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50">
                            <span className="material-symbols-outlined text-teal-600 shrink-0 text-3xl">landscape</span>
                            <div>
                                <h3 className="font-bold text-teal-800 dark:text-teal-400 mb-1">絶景の中でのトレッキング</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    テレルジ国立公園の美しい渓谷、森、川を巡るコースや、見渡す限りの平原を何日もかけて旅する本格的なロングトレッキングコースなど、目的や技術に合わせて選べます。
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Popular Riding Tours */}
                <section className="px-4 py-8 bg-gray-50 dark:bg-gray-800/30 border-y border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-[#0e1a18] dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-600">tour</span>
                        おすすめの乗馬ツアー
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
                        ) : products.length > 0 ? (
                            products.map((product) => <ProductCard key={product.id} product={product} />)
                        ) : (
                            <div className="col-span-2 py-8 text-center text-gray-500">
                                現在、関連するツアー商品がありません。
                            </div>
                        )}
                    </div>
                </section>

                {/* FAQ Snippet related to Riding */}
                <section className="px-4 py-8">
                    <h2 className="text-xl font-bold mb-4 text-[#0e1a18] dark:text-white">乗馬旅行 よくあるご質問</h2>
                    <div className="space-y-4">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2 flex gap-2">
                                <span className="text-primary font-bold">Q.</span> 乗馬の服装はどうすればいいですか？
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-5 whitespace-pre-wrap">
                                長ズボン（伸縮性のあるジーンズやトレッキングパンツ）、動きやすい服装、足首まであるスニーカーやトレッキングシューズがおすすめです。また、日差しから守るための帽子やサングラス、手袋（軍手など）もご用意ください。
                            </p>
                        </div>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2 flex gap-2">
                                <span className="text-primary font-bold">Q.</span> まったくの初心者ですが大丈夫ですか？
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-5 whitespace-pre-wrap">
                                はい、大丈夫です。初日は馬の乗り降りや歩かせ方など基本から練習します。最初はガイドが馬のロープを持って先導することも可能ですので、安心してご相談ください。
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => navigate('/faq')}
                        className="mt-6 w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
                    >
                        その他のよくある質問を見る
                    </button>
                    <button
                        onClick={() => navigate('/custom-estimate')}
                        className="mt-3 w-full py-3 bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                    >
                        乗馬ツアーのオーダーメイドを見積もる
                    </button>
                </section>
            </main>

            <BottomNav />
        </div>
    );
};
