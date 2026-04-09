import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { HeroSection } from '../components/home/HeroSection';
import { QuickLinks } from '../components/home/QuickLinks';
import { TravelThemeSection } from '../components/home/TravelThemeSection';
import { PromoBanner } from '../components/home/PromoBanner';
import { ReviewSection } from '../components/home/ReviewSection';
import { CategoryRowSection } from '../components/home/CategoryRowSection';
import { MagazineSection } from '../components/home/MagazineSection';
import { useHomeData } from '../hooks/useHomeData';
import { TravelThemeSkeleton } from '../components/skeletons/TravelThemeSkeleton';
import { AdventureSkeleton } from '../components/skeletons/AdventureSkeleton';

export const Home: React.FC = () => {
    const { data, isLoading } = useHomeData();
    const { t } = useTranslation();

    return (
        <>
            <SEO
                title={t('home.seo_title')}
                description={t('home.seo_description')}
                keywords={t('home.seo_keywords')}
                url="/"
                structuredData={{
                    "@context": "https://schema.org",
                    "@type": "TravelAgency",
                    "name": "Milkyway Japan（モンゴリア銀河系）",
                    "alternateName": ["Mongolia Milky Way", "モンゴリア銀河系"],
                    "image": "https://mongolryokou.com/og-image.jpg",
                    "@id": "https://mongolryokou.com",
                    "url": "https://mongolryokou.com",
                    "telephone": "+976-9594-5838",
                    "email": "bolor1@hanmail.net",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "バヤンズル区 13棟 DACOセンター 3階 306号",
                        "addressLocality": "ウランバートル",
                        "addressCountry": "MN"
                    },
                    "geo": {
                        "@type": "GeoCoordinates",
                        "latitude": 47.9184676,
                        "longitude": 106.9177016
                    },
                    "areaServed": {
                        "@type": "Country",
                        "name": "モンゴル"
                    },
                    "description": t('home.seo_description'),
                    "priceRange": "¥78,000〜¥250,000",
                    "currenciesAccepted": "JPY",
                    "hasOfferCatalog": {
                        "@type": "OfferCatalog",
                        "name": "モンゴルツアー商品",
                        "itemListElement": [
                            { "@type": "OfferCatalog", "name": "モンゴル乗馬旅行" },
                            { "@type": "OfferCatalog", "name": "ゴビ砂漠ツアー" },
                            { "@type": "OfferCatalog", "name": "テレルジ大自然ツアー" },
                            { "@type": "OfferCatalog", "name": "フブスグル湖ツアー" }
                        ]
                    },
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": "4.9",
                        "reviewCount": "87",
                        "bestRating": "5"
                    }
                }}
            />
            <div style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' }}>
                <HeroSection />
            </div>

            {isLoading ? (
                <>
                    <TravelThemeSkeleton />
                    <AdventureSkeleton />
                </>
            ) : (
                <>
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '600px' }}>
                        <TravelThemeSection products={data.products} tabs={data.tabs} />
                    </div>
                    <PromoBanner />
                    <div className="flex flex-col gap-2" style={{ contentVisibility: 'auto', containIntrinsicSize: '800px' }}>
                        {data.categories?.map(category => (
                            <CategoryRowSection
                                key={category.id}
                                category={category}
                                products={data.products}
                            />
                        ))}
                    </div>
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '600px' }}>
                        <MagazineSection magazines={data.magazines} />
                    </div>
                </>
            )}

            <ReviewSection />

            {/* SEO Content Section — keyword-rich text for crawlers */}
            <section className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 mt-8">
                <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
                        モンゴルツアー・モンゴル旅行をお探しなら Milkyway Japan
                    </h2>
                    <p className="mb-4">
                        <strong>モンゴルツアー</strong>・<strong>モンゴル旅行</strong>の専門現地旅行社「Milkyway Japan（モンゴリア銀河系）」では、
                        日本語ガイド同行で安心のモンゴルツアーをご提供しています。
                        <Link to="/products" className="text-primary hover:underline font-medium">モンゴルツアー商品一覧</Link>から
                        お好みのプランをお選びいただけます。
                    </p>
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-2 mt-6">
                        人気のモンゴルツアー
                    </h3>
                    <p className="mb-4">
                        当社で特に人気のモンゴルツアーは、テレルジ国立公園での大自然満喫ツアー、壮大な景色が広がるゴビ砂漠ツアー、
                        そして大草原を駆け抜ける<strong>モンゴル乗馬旅行</strong>です。
                        満天の星空の下でゲルに宿泊する体験は、モンゴル旅行ならではの醍醐味です。
                    </p>
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-2 mt-6">
                        モンゴル乗馬旅行の魅力
                    </h3>
                    <p className="mb-4">
                        <strong>モンゴル乗馬旅行</strong>は、モンゴルツアーの中でも最も人気のアクティビティです。
                        見渡す限りの大草原で馬に乗り、遊牧民の暮らしを体験できます。
                        初心者の方もプロのガイドが丁寧にサポートしますので、安心してお楽しみいただけます。
                        <Link to="/custom-estimate" className="text-primary hover:underline font-medium">オーダーメイド見積もり</Link>で
                        あなただけの乗馬旅行プランもお作りできます。
                    </p>
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-2 mt-6">
                        安心のモンゴル旅行サポート
                    </h3>
                    <p className="mb-4">
                        モンゴル旅行が初めての方もご安心ください。
                        <Link to="/travel-guide" className="text-primary hover:underline font-medium">モンゴル旅行ガイド</Link>で
                        現地の基本情報や準備のポイントをご確認いただけます。
                        また、<Link to="/faq" className="text-primary hover:underline font-medium">よくある質問</Link>では
                        モンゴルツアーに関するお客様の疑問にお答えしています。
                        <Link to="/reviews" className="text-primary hover:underline font-medium">旅行レビュー</Link>では
                        実際にモンゴルツアーに参加されたお客様の声をご覧いただけます。
                    </p>
                </div>
            </section>
        </>
    );
};
