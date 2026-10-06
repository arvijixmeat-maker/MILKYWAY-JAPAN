import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { useHomeData } from '../hooks/useHomeData';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { TourListDesktop } from '../components/tours-desktop/TourListDesktop';
import { MobileShell } from '../components/mobile/MobileShell';
import { TourListMobile } from '../components/tours-mobile/TourListMobile';

export const TourProducts: React.FC = () => {
    const { t } = useTranslation();
    const isDesktop = useIsDesktop();
    // Same query the list components read, so the structured data costs no extra request.
    const { data } = useHomeData();

    // ====== DESKTOP RENDER ======
    if (isDesktop) {
        return (
            <>
                <SEO
                    title={t('products.seo_title')}
                    description={t('products.seo_description')}
                    keywords={t('products.seo_keywords')}
                    canonical="/products"
                />
                <DesktopLayout>
                    <TourListDesktop />
                </DesktopLayout>
            </>
        );
    }

    const products = data.products.filter((p) => p.status === 'active');

    // ─── Structured Data (JSON-LD) — list page collection schema ───
    const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://mongolryokou.com/' },
            { '@type': 'ListItem', position: 2, name: 'モンゴルツアー商品', item: 'https://mongolryokou.com/products' },
        ],
    };

    const itemListLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'モンゴルツアー商品一覧',
        itemListElement: products.slice(0, 30).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://mongolryokou.com/products/${p.id}`,
            name: p.name,
        })),
    };

    const collectionLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'モンゴルツアー商品一覧 | Milkyway Japan',
        description: t('products.seo_description'),
        url: 'https://mongolryokou.com/products',
        inLanguage: 'ja',
        isPartOf: { '@type': 'WebSite', name: 'Milkyway Japan', url: 'https://mongolryokou.com' },
    };

    // ====== MOBILE RENDER ======
    return (
        <>
            <SEO
                title={t('products.seo_title')}
                description={t('products.seo_description')}
                keywords={t('products.seo_keywords')}
                canonical="/products"
                structuredData={[collectionLd, breadcrumbLd, itemListLd]}
            />
            <MobileShell title="ツアー商品">
                <TourListMobile />
            </MobileShell>
        </>
    );
};
