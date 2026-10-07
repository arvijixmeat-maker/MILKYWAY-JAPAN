import React from 'react';
import { SEO } from '../components/seo/SEO';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { InfoLayoutDesktop } from '../components/info/InfoLayoutDesktop';
import { InfoLayoutMobile } from '../components/info/InfoLayoutMobile';
import { GuideApplyForm } from '../components/info/GuideApplyForm';

export const GuideApply: React.FC = () => {
    const isDesktop = useIsDesktop();
    const seo = (
        <SEO
            title="ガイド募集"
            description="Milkyway Japan（モンゴル旅行・モンゴルツアー専門の現地旅行社）のガイド登録申請ページです。モンゴル旅行の公認ガイドとして登録申請ができます。"
            canonical="/guide-apply"
        />
    );

    if (isDesktop) {
        return (
            <>
                {seo}
                <InfoLayoutDesktop page="guideRecruit">
                    <GuideApplyForm />
                </InfoLayoutDesktop>
            </>
        );
    }

    return (
        <>
            {seo}
            <InfoLayoutMobile page="guideRecruit">
                <GuideApplyForm compact />
            </InfoLayoutMobile>
        </>
    );
};
