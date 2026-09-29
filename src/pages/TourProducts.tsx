import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { Layout } from '../components/layout/Layout';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { TourListDesktop } from '../components/tours-desktop/TourListDesktop';
import { TourListMobile } from '../components/tours-mobile/TourListMobile';
import { isPublished } from '../components/home-desktop/homeDesktopData';
import { useHomeData } from '../hooks/useHomeData';
import { useIsDesktop } from '../hooks/useIsDesktop';

export const TourProducts: React.FC = () => {
    const isDesktop = useIsDesktop();

    return (
        <>
            <TourProductsSeo />
            {isDesktop ? (
                <DesktopLayout>
                    <TourListDesktop />
                </DesktopLayout>
            ) : (
                <Layout>
                    <TourListMobile />
                </Layout>
            )}
        </>
    );
};

/** Page meta plus the CollectionPage / BreadcrumbList / ItemList schemas for /products. */
function TourProductsSeo() {
    const { t } = useTranslation();
    const { data } = useHomeData();
    const products = data.products.filter(isPublished);

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

    return (
        <SEO
            title={t('products.seo_title')}
            description={t('products.seo_description')}
            keywords={t('products.seo_keywords')}
            canonical="/products"
            structuredData={[collectionLd, breadcrumbLd, itemListLd]}
        />
    );
}
