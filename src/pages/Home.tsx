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
