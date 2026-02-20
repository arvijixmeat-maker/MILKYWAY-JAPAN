import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { HeroSection } from '../components/home/HeroSection';
import { QuickLinks } from '../components/home/QuickLinks';
import { TravelThemeSection } from '../components/home/TravelThemeSection';
import { PromoBanner } from '../components/home/PromoBanner';
import { ReviewSection } from '../components/home/ReviewSection';
import { AdventureSection } from '../components/home/AdventureSection';
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
                structuredData={{
                    "@context": "https://schema.org",
                    "@type": "TravelAgency",
                    "name": "mongolia-milkyway",
                    "image": "https://www.mongolia-milkyway.com/og-image.jpg",
                    "@id": "https://www.mongolia-milkyway.com",
                    "url": "https://www.mongolia-milkyway.com",
                    "telephone": "+82-10-0000-0000",
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
            <QuickLinks />

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
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '800px' }}>
                        <AdventureSection products={data.products} />
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
