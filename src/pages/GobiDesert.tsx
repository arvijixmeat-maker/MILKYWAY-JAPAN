import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { ProductCard } from '../components/product/ProductCard';
import { ProductSkeleton } from '../components/skeletons/ProductSkeleton';
import { BottomNav } from '../components/layout/BottomNav';

export const GobiDesert: React.FC = () => {
    const navigate = useNavigate();

    // Fetch and filter Products for Gobi
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products-gobi'],
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
                        
                        return cat.includes('ゴビ') || cat.includes('고비') || cat.includes('gobi') ||
                               name.includes('ゴビ') || name.includes('고비') || 
                               tags.includes('ゴビ') || tags.includes('고비') || tags.includes('gobi');
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
                console.error('Error fetching gobi products:', error);
                return [];
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "ゴビ砂漠ツアー",
        "description": "モンゴル南部・ゴビ砂漠の壮大な景色と満天の星空を体験する特別なツアー。",
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
            { "@type": "ListItem", "position": 3, "name": "ゴビ砂漠ツアー", "item": "https://mongolryokou.com/gobi-desert" }
        ]
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white transition-colors duration-300 min-h-screen pb-24">
            <SEO
                title="ゴビ砂漠ツアー – 満天の星空と壮大な砂丘を体験 | Milkyway Japan"
                description="モンゴル南部に広がるゴビ砂漠。ホンゴル砂丘で夕陽を眺め、夜は満天の星空（天の川）に包まれる感動のツアー。恐竜の化石発掘スポットなど、ゴビ砂漠の見どころを日本語ガイド付きでご案内します。"
                keywords="ゴビ砂漠ツアー, ゴビ砂漠旅行, ホンゴル砂丘, モンゴル星空, 炎の崖"
                canonical="/gobi-desert"
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
                    <span className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">ゴビ砂漠ツアー</span>
                </div>
            </header>

            <main>
                {/* Hero */}
                <div className="h-56 bg-orange-800 relative w-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 z-10"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-4 text-center mt-6">
                        <span className="inline-block px-3 py-1 bg-amber-500 text-slate-900 text-xs font-bold rounded-full mb-3 uppercase tracking-widest">絶景とロマン</span>
                        <h1 className="text-3xl font-bold text-white mb-2 leading-tight">ゴビ砂漠ツアー</h1>
                        <p className="text-white/80 text-sm">満天の星空と広大な砂丘が織りなす圧倒的な自然美</p>
                    </div>
                </div>

                <section className="px-4 py-8">
                    <h2 className="text-xl font-bold mb-4 text-[#0e1a18] dark:text-white border-l-4 border-orange-500 pl-3">ゴビ砂漠の見どころ</h2>
                    <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300 mb-6">
                        モンゴルの南部に位置するゴビ砂漠。何もない荒野のように思われがちですが、実はそこには信じられないほど神秘的でロマンチックな絶景が広がっています。
                    </p>

                    <div className="grid gap-4">
                        <div className="border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-orange-500 text-xl flex-shrink-0">nights_stay</span>
                                    <h3 className="font-bold text-lg">満天の星空（天の川）</h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    空気の澄んだゴビ砂漠の夜は、視界を遮る光が一切なく、まるで宇宙空間にいるかのような星空が広がります。はっきりと見える天の川と無数の流れ星は、一生忘れることのできない絶景です。
                                </p>
                            </div>
                        </div>

                        <div className="border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-orange-500 text-xl flex-shrink-0">terrain</span>
                                    <h3 className="font-bold text-lg">ホンゴル砂丘</h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    「歌う砂丘」とも呼ばれる巨大な砂丘群。夕陽に染まる砂丘の美しさは息をのむほど。ラクダに乗って砂丘を散歩する貴重な体験もゴビツアーの醍醐味です。
                                </p>
                            </div>
                        </div>

                        <div className="border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-orange-500 text-xl flex-shrink-0">cruelty_free</span>
                                    <h3 className="font-bold text-lg">バヤンザク（恐竜の化石発掘跡）</h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    通称「炎の崖」と呼ばれる赤土の絶壁。20世紀初頭に多数の恐竜の卵の化石が発見された世界的にも有名な場所で、夕暮れ時には燃えるように赤く染まります。
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Popular Gobi Tours */}
                <section className="px-4 py-8 bg-orange-50 dark:bg-orange-950/20 border-y border-orange-100 dark:border-orange-900/40">
                    <h2 className="text-xl font-bold text-orange-950 dark:text-orange-500 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined">explore</span>
                        関連のゴビ砂漠ツアー
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

                <section className="px-4 py-8">
                    <h2 className="text-lg font-bold mb-4 text-[#0e1a18] dark:text-white">ゴビ砂漠 よくあるご質問</h2>
                    <div className="space-y-4">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2 flex gap-2">
                                <span className="text-orange-500 font-bold">Q.</span> ゴビ砂漠ツアーのベストシーズンは？
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-5 whitespace-pre-wrap">
                                暑すぎず寒すぎない6月〜8月が最もおすすめです。ただ、砂漠地帯のため真夏でも日較差が大きく、朝晩は冷え込むことがありますので防寒着の準備が必要です。
                            </p>
                        </div>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2 flex gap-2">
                                <span className="text-orange-500 font-bold">Q.</span> トイレやシャワーなどの設備はありますか？
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-5 whitespace-pre-wrap">
                                宿泊するツーリストキャンプ（ゲル）には水洗トイレや温水シャワーが完備されている施設もありますが、大自然の真ん中を通る道中では青空トイレとなることや、水が十分に使えないこともあります。ウェットティッシュ等を多めに持参することをおすすめします。
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <BottomNav />
        </div>
    );
};
