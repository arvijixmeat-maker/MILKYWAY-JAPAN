import React from 'react';
import { SEO } from '../components/seo/SEO';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { AboutDesktop } from '../components/about-desktop/AboutDesktop';
import { AboutMobile } from '../components/about-mobile/AboutMobile';

// Social share (og:image) picture: the former full-length company introduction image.
// The page itself is now built from src/assets/about/* (see components/about-desktop).
const DETAIL_IMAGE = '/assets/about/detail.jpg';

export const About: React.FC = () => {
    // <Layout> in App.tsx already supplies the PC / mobile shell; only the content differs here.
    const isDesktop = useIsDesktop();
    const structuredData = [
        {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: '会社案内 | Milkyway Japan',
            url: 'https://mongolryokou.com/about',
            inLanguage: 'ja',
            mainEntity: {
                '@type': 'TravelAgency',
                name: 'モンゴリア銀河系',
                alternateName: ['Milkyway Japan', 'モンゴリア天の川'],
                url: 'https://mongolryokou.com',
                logo: 'https://mongolryokou.com/favicon.png',
                founder: [
                    { '@type': 'Person', name: 'Bilguun', jobTitle: '代表' },
                    { '@type': 'Person', name: 'Gantuu', jobTitle: '副代表' },
                ],
                employee: [
                    { '@type': 'Person', name: 'Bolor', jobTitle: '旅行デザイナー' },
                ],
                areaServed: { '@type': 'Country', name: 'モンゴル' },
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'バヤンズル区 13棟 DACOセンター 3階 306号',
                    addressLocality: 'ウランバートル',
                    addressCountry: 'MN',
                },
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://mongolryokou.com/' },
                { '@type': 'ListItem', position: 2, name: '会社案内', item: 'https://mongolryokou.com/about' },
            ],
        },
    ];

    return (
        <>
            <SEO
                title="会社案内"
                description="モンゴル現地の旅行会社「モンゴリア銀河系（天の川）」。韓国でホテル経営学科を卒業し、モンゴルで暮らす代表と副代表が設立した家族経営のモンゴル旅行会社です。現地人ならではの視点と日本人旅行客の情緒に合わせた日程で、リーズナブルな価格でどこにもない旅をお届けします。"
                canonical="/about"
                image={DETAIL_IMAGE}
                structuredData={structuredData}
            />

            {isDesktop ? <AboutDesktop /> : <AboutMobile />}
        </>
    );
};
