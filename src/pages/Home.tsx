import React from 'react';
import { Link } from 'react-router-dom';
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
import { MagazineSectionDesktop } from '../components/home-desktop/MagazineSection.desktop';
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

                {!isLoading && data.categories.slice(2).map((category) => (
                    <CategorySectionDesktop
                        key={category.id}
                        category={category}
                        products={data.products}
                    />
                ))}

                <MagazineSectionDesktop magazines={data.magazines} />
                <SearchTopicLinks />
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

            <SearchTopicLinks />
            <ReviewSection />
        </>
    );
};

const SearchTopicLinks = () => (
    <section className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-14" aria-labelledby="search-topic-heading">
        <div className="rounded-3xl bg-slate-900 p-6 text-white md:p-10">
            <p className="text-xs font-bold tracking-[0.18em] text-teal-300">MONGOLIA TRAVEL PLANNING</p>
            <h2 id="search-topic-heading" className="mt-3 text-2xl font-bold md:text-3xl">目的からモンゴル旅行を計画する</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link className="rounded-2xl bg-white/10 p-5 font-bold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-teal-300" to="/mongolia-tour">モンゴルツアーを比較する <span aria-hidden="true">→</span></Link>
                <Link className="rounded-2xl bg-white/10 p-5 font-bold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-teal-300" to="/mongolia-horse-riding-tour">初心者向け乗馬旅行 <span aria-hidden="true">→</span></Link>
                <Link className="rounded-2xl bg-white/10 p-5 font-bold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-teal-300" to="/gobi-desert-tour">ゴビ砂漠の旅を知る <span aria-hidden="true">→</span></Link>
                <Link className="rounded-2xl bg-white/10 p-5 font-bold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-teal-300" to="/mongolia-travel-cost">費用とベストシーズン <span aria-hidden="true">→</span></Link>
            </div>
        </div>
    </section>
);
