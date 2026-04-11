import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { BottomNav } from '../components/layout/BottomNav';

export const MongolTour: React.FC = () => {
    const navigate = useNavigate();

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "モンゴルツアー 種類別比較ガイド",
        "description": "様々なモンゴルツアーの特徴を比較し、あなたにぴったりの旅行プランをご提案します。",
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
            { "@type": "ListItem", "position": 2, "name": "モンゴルツアー", "item": "https://mongolryokou.com/mongol-tour" }
        ]
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white transition-colors duration-300 min-h-screen pb-24">
            <SEO
                title="モンゴルツアー比較 – 乗馬・ゴビ砂漠・テレルジ 現地ツアー一覧"
                description="モンゴル乗馬旅行、ゴビ砂漠星空ツアー、テレルジ国立公園の大自然体験など、様々なモンゴルツアーの特徴を比較。Milkyway Japanなら日本語ガイド付きで安心です。"
                keywords="モンゴルツアー, モンゴル旅行比較, 乗馬旅行, ゴビ砂漠ツアー, テレルジツアー, ゲル宿泊"
                canonical="/mongol-tour"
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
                    <span className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">モンゴルツアー比較</span>
                </div>
            </header>

            <main>
                {/* Hero / Intro */}
                <section className="px-4 pt-2 pb-6">
                    <h1 className="text-2xl font-bold mb-3 text-primary">モンゴルツアー 種類別比較ガイド</h1>
                    <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                        モンゴルへの旅行といっても、目的に応じて選べるツアープランは多岐にわたります。初心者でも安心な大草原での乗馬体験、満天の星空を眺めるゴビ砂漠への大冒険、美しい湖畔でリラックスするフブスグルツアーなど、Milkyway Japanが自信を持っておすすめする各ツアーの特徴をまとめました。あなたにぴったりのモンゴルツアーを見つけましょう！
                    </p>
                </section>

                <hr className="border-gray-100 dark:border-gray-800 my-2" />

                {/* Tour Comparison Section */}
                <section className="px-4 py-6 space-y-6">
                    {/* 乗馬旅行 */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="h-40 bg-teal-800 flex items-center justify-center relative">
                            {/* Option: if you have banner images, place them here */}
                            <div className="absolute inset-0 bg-black/30"></div>
                            <h2 className="relative z-10 text-white text-2xl font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-3xl">sports_score</span>
                                モンゴル乗馬旅行
                            </h2>
                        </div>
                        <div className="p-5">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2">おすすめの対象：アクティブに楽しみたい方</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                大草原を馬に乗って駆け抜ける爽快感はモンゴルならでは。経験豊富な現地ガイドがサポートするため、初心者から上級者まで安心して体験できます。テレルジなどの美しい渓谷を巡るコースが人気です。
                            </p>
                            <button
                                onClick={() => navigate('/horse-riding-tour')}
                                className="w-full py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm"
                            >
                                乗馬ツアー特集を見る
                            </button>
                        </div>
                    </div>

                    {/* ゴビ砂漠ツアー */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="h-40 bg-orange-700 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-black/30"></div>
                            <h2 className="relative z-10 text-white text-2xl font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-3xl">landscape</span>
                                ゴビ砂漠ツアー
                            </h2>
                        </div>
                        <div className="p-5">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2">おすすめの対象：絶景・冒険を求める方</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                モンゴル南部、果てしなく続く砂漠と荒野を四輪駆動車で巡る大パノラマの旅。恐竜の化石発掘スポットや、夜になると広がる満天の星空・天の川は圧巻です。
                            </p>
                            <button
                                onClick={() => navigate('/gobi-desert')}
                                className="w-full py-2.5 bg-orange-500/10 text-orange-600 font-bold rounded-xl text-sm"
                            >
                                ゴビ砂漠ツアー特集を見る
                            </button>
                        </div>
                    </div>

                    {/* テレルジ・ウランバートル */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="h-40 bg-blue-800 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-black/30"></div>
                            <h2 className="relative z-10 text-white text-2xl font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-3xl">nature</span>
                                大自然＆市内観光
                            </h2>
                        </div>
                        <div className="p-5">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2">おすすめの対象：短い日程でモンゴルを満喫したい方</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                首都ウランバートルから車で気軽に行けるテレルジ国立公園。遊牧民のゲルに宿泊し、草原の風を感じながらリラックスできます。週末を利用した弾丸ツアーにも最適です。
                            </p>
                            <button
                                onClick={() => navigate('/products')}
                                className="w-full py-2.5 bg-blue-500/10 text-blue-600 font-bold rounded-xl text-sm"
                            >
                                テレルジツアーを探す
                            </button>
                        </div>
                    </div>
                </section>

                {/* Additional Actions */}
                <section className="px-4 py-6 mb-8 flex flex-col gap-3 bg-gray-50 dark:bg-gray-800/30">
                    <h3 className="font-bold mb-2">もっと自分に合ったツアーを探す</h3>
                    <button
                        onClick={() => navigate('/products')}
                        className="w-full flex items-center justify-between p-4 bg-teal-500 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-md shadow-teal-500/30"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined">search</span>
                            <span>すべてのモンゴルツアー商品一覧</span>
                        </div>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                    <button
                        onClick={() => navigate('/custom-estimate')}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-bold transition-transform active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined">draw</span>
                            <span>オーダーメイドで見積もりを依頼する</span>
                        </div>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </section>
            </main>

            <BottomNav />
        </div>
    );
};
