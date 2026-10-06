import React from 'react';
import { SEO } from '../components/seo/SEO';
import { SEO_CONSTANTS } from '../constants/seo';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { MobileShell } from '../components/mobile/MobileShell';
import { PromotionsDesktop } from '../components/promotions/PromotionsDesktop';
import { PromotionsMobile } from '../components/promotions/PromotionsMobile';

const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${SEO_CONSTANTS.SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: '旅行企画展', item: `${SEO_CONSTANTS.SITE_URL}/promotions` },
    ],
};

export const Promotions: React.FC = () => {
    const isDesktop = useIsDesktop();

    const seo = (
        <SEO
            title="旅行企画展｜モンゴル旅行の特集・キャンペーン"
            description="モンゴル旅行の特集やキャンペーンをまとめてご紹介。ゴビ砂漠・乗馬・中央モンゴルなど、テーマ別のモンゴルツアー特集からお選びいただけます。"
            canonical="/promotions"
            structuredData={breadcrumbLd}
        />
    );

    if (isDesktop) {
        return (
            <>
                {seo}
                <DesktopLayout>
                    <PromotionsDesktop />
                </DesktopLayout>
            </>
        );
    }

    return (
        <>
            {seo}
            <MobileShell title="旅行企画展">
                <PromotionsMobile />
            </MobileShell>
        </>
    );
};
