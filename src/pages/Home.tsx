import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { useHomeData } from '../hooks/useHomeData';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { HomeDesktop } from '../components/home-desktop/HomeDesktop';
import { HomeMobile } from '../components/home-mobile/HomeMobile';

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
                <HomeDesktop data={data} isLoading={isLoading} />
            </>
        );
    }

    // ====== MOBILE RENDER ======
    return (
        <>
            {seo}
            <HomeMobile data={data} isLoading={isLoading} />
        </>
    );
};
