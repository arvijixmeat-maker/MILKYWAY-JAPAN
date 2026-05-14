import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { HeroSection } from '../components/home/HeroSection';
import { TravelThemeSection } from '../components/home/TravelThemeSection';
import { PromoBanner } from '../components/home/PromoBanner';
import { ReviewSection } from '../components/home/ReviewSection';
import { CategoryRowSection } from '../components/home/CategoryRowSection';
import { MagazineSection } from '../components/home/MagazineSection';
import { useHomeData } from '../hooks/useHomeData';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { TravelThemeSkeleton } from '../components/skeletons/TravelThemeSkeleton';
import { AdventureSkeleton } from '../components/skeletons/AdventureSkeleton';
import { HeroSectionDesktop } from '../components/home-desktop/HeroSection.desktop';
import { QuickLinksRowDesktop } from '../components/home-desktop/QuickLinksRow.desktop';
import { ThemeTabsBarDesktop } from '../components/home-desktop/ThemeTabsBar.desktop';
import { CategorySectionDesktop } from '../components/home-desktop/CategorySection.desktop';
import { PromoStripDesktop } from '../components/home-desktop/PromoStrip.desktop';
import { MagazineSectionDesktop } from '../components/home-desktop/MagazineSection.desktop';
import { TrustSectionDesktop } from '../components/home-desktop/TrustSection.desktop';
import { ReviewSectionDesktop } from '../components/home-desktop/ReviewSection.desktop';

export const Home: React.FC = () => {
    const { data, isLoading } = useHomeData();
    const { t } = useTranslation();
    const isDesktop = useIsDesktop();

    const seo = (
        <SEO
            title={t('home.seo_title')}
            description={t('home.seo_description')}
            keywords={t('home.seo_keywords')}
            canonical="/"
            structuredData={[
                {
                    "@context": "https://schema.org",
                    "@type": "TravelAgency",
                    "@id": "https://mongolryokou.com/#organization",
                    "name": "Milkyway Japan",
                    "alternateName": "ミルキーウェイジャパン",
                    "image": "https://mongolryokou.com/og-image.jpg",
                    "url": "https://mongolryokou.com",
                    "email": "info@mongolryokou.com",
                    "address": {
                        "@type": "PostalAddress",
                        "addressCountry": "MN",
                        "addressLocality": "Ulaanbaatar"
                    },
                    "description": t('home.seo_description'),
                    "priceRange": "$$",
                    "areaServed": "JP",
                    "knowsLanguage": ["ja", "mn"],
                    "sameAs": []
                },
                {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "@id": "https://mongolryokou.com/#website",
                    "url": "https://mongolryokou.com",
                    "name": "Milkyway Japan | モンゴル旅行専門",
                    "publisher": { "@id": "https://mongolryokou.com/#organization" },
                    "inLanguage": "ja",
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": {
                            "@type": "EntryPoint",
                            "urlTemplate": "https://mongolryokou.com/products?q={search_term_string}"
                        },
                        "query-input": "required name=search_term_string"
                    }
                }
            ]}
        />
    );

    // ====== DESKTOP RENDER ======
    if (isDesktop) {
        return (
            <>
                {seo}
                <HeroSectionDesktop />
                <QuickLinksRowDesktop />
                {data.categories.length > 0 && <ThemeTabsBarDesktop categories={data.categories} />}

                {/* SEO H1 — visible to crawlers, visually offscreen */}
                <section className="sr-only">
                    <h1>モンゴルツアー・モンゴル旅行専門の現地旅行社</h1>
                    <p>
                        Milkyway Japanは日本語ガイド同行で安心のモンゴルツアーをご案内。乗馬旅行、ゴビ砂漠、テレルジ国立公園など多彩なプランをご用意しています。
                    </p>
                </section>

                {!isLoading && data.categories.slice(0, 2).map((category) => (
                    <CategorySectionDesktop
                        key={category.id}
                        category={category}
                        products={data.products}
                    />
                ))}

                <PromoStripDesktop />

                {!isLoading && data.categories.slice(2).map((category) => (
                    <CategorySectionDesktop
                        key={category.id}
                        category={category}
                        products={data.products}
                    />
                ))}

                <MagazineSectionDesktop magazines={data.magazines} />
                <TrustSectionDesktop />
                <ReviewSectionDesktop />
                <div style={{ height: 96 }} />
            </>
        );
    }

    // ====== MOBILE RENDER (unchanged) ======
    return (
        <>
            {seo}
            <div style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' }}>
                <HeroSection />
            </div>

            {/* SEO: H1 + Intro (Visually hidden but available for crawlers and screen readers) */}
            <section className="sr-only">
                <h1>モンゴルツアー・モンゴル旅行専門の現地旅行社</h1>
                <p>
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
