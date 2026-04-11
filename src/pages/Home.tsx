import React from 'react';
import { useTranslation } from 'react-i18next';
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
                canonical="/"
                structuredData={{
                    "@context": "https://schema.org",
                    "@type": "TravelAgency",
                    "name": "Milkyway Japan",
                    "image": "https://mongolryokou.com/og-image.jpg",
                    "@id": "https://mongolryokou.com",
                    "url": "https://mongolryokou.com",
                    "address": {
                        "@type": "PostalAddress",
                        "addressCountry": "MN",
                        "addressLocality": "Ulaanbaatar"
                    },
                    "description": t('home.seo_description'),
                    "priceRange": "$$"
                }}
            />
            <div style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' }}>
                <HeroSection />
            </div>

            {/* SEO: Visible H1 + Intro — crawlable and user-visible */}
            <section className="px-5 pt-4 pb-2">
                <h1 className="text-xl font-bold text-[#0e1a18] dark:text-white leading-tight mb-2">
                    モンゴルツアー・モンゴル旅行専門の現地旅行社
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    Milkyway Japanは日本語ガイド同行で安心のモンゴルツアーをご案内。乗馬旅行、ゴビ砂漠、テレルジ国立公園など多彩なプランをご用意しています。
                </p>
            </section>

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
        </>
    );
};
