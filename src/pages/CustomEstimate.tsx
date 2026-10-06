import React from 'react';

import { SEO } from '../components/seo/SEO';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { CustomEstimateDesktop } from '../components/estimate-desktop/CustomEstimateDesktop';
import { CustomEstimateMobile } from '../components/estimate-mobile/CustomEstimateMobile';

export const CustomEstimate: React.FC = () => {
    const isDesktop = useIsDesktop();
    if (isDesktop) {
        return (
            <>
                <SEO
                    title="モンゴルオーダーメイド見積もり｜モンゴル銀河旅行社"
                    description="ご希望に合わせたモンゴル旅行のお見積もりを無料で承ります。"
                />
                <DesktopLayout>
                    <CustomEstimateDesktop />
                </DesktopLayout>
            </>
        );
    }
    return (
        <>
            <SEO
                title="モンゴルオーダーメイド見積もり｜モンゴル銀河旅行社"
                description="ご希望に合わせたモンゴル旅行のお見積もりを無料で承ります。"
            />
            <CustomEstimateMobile />
        </>
    );
};
