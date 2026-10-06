import React from 'react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { TravelMatesDesktop } from '../components/mates-desktop/TravelMatesDesktop';
import { TravelMatesMobile } from '../components/mates-mobile/TravelMatesMobile';
import { SEO } from '../components/seo/SEO';

export const TravelMates: React.FC = () => {
    const isDesktop = useIsDesktop();
    const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://mongolryokou.com/' },
            { '@type': 'ListItem', position: 2, name: '同行者募集', item: 'https://mongolryokou.com/travel-mates' },
        ],
    };

    return (
        <>
            <SEO
                title="モンゴル旅行の同行者募集"
                description="モンゴル旅行を一緒に楽しむ同行者を募集・検索できます。旅行日程や地域、旅行スタイルから仲間を見つけましょう。"
                canonical="/travel-mates"
                structuredData={breadcrumbLd}
            />
            {isDesktop ? (
            <DesktopLayout>
                <TravelMatesDesktop />
            </DesktopLayout>
            ) : <TravelMatesMobile />}
        </>
    );
};
