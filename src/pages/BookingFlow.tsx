import React from 'react';
import { SEO } from '../components/seo/SEO';
import { SEO_CONSTANTS } from '../constants/seo';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { InfoLayoutDesktop } from '../components/info/InfoLayoutDesktop';
import { InfoLayoutMobile } from '../components/info/InfoLayoutMobile';
import { BookingFlowBody } from '../components/info/BookingFlowBody';
import { BOOKING_FLOW_STEPS } from '../components/info/bookingFlow';

const PAGE_URL = `${SEO_CONSTANTS.SITE_URL}/booking-flow`;

const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${SEO_CONSTANTS.SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'ご予約の流れ', item: PAGE_URL },
        ],
    },
    {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'モンゴル旅行・モンゴルツアーのご予約の流れ',
        description: 'ツアー選び・お見積もりから、予約金のお支払い、出発前のご案内、ご出発までの流れです。',
        inLanguage: 'ja',
        url: PAGE_URL,
        step: BOOKING_FLOW_STEPS.map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: s.title,
            text: s.text,
        })),
    },
];

export const BookingFlow: React.FC = () => {
    const isDesktop = useIsDesktop();
    const seo = (
        <SEO
            title="ご予約の流れ"
            description="モンゴル旅行・モンゴルツアーのご予約の流れをご案内します。ツアー選び・無料のお見積もりから、PayPal請求書での予約金のお支払い、出発前のご案内、ご出発まで、5つのステップでご説明します。"
            canonical="/booking-flow"
            structuredData={structuredData}
        />
    );

    if (isDesktop) {
        return (
            <>
                {seo}
                <InfoLayoutDesktop page="bookingFlow">
                    <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <BookingFlowBody />
                    </div>
                </InfoLayoutDesktop>
            </>
        );
    }

    return (
        <>
            {seo}
            <InfoLayoutMobile page="bookingFlow">
                <BookingFlowBody compact />
            </InfoLayoutMobile>
        </>
    );
};
