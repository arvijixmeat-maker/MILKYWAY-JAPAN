import React from 'react';
import { SEO } from '../components/seo/SEO';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { InfoLayoutDesktop } from '../components/info/InfoLayoutDesktop';
import { ContactInfoBody } from '../components/info/ContactInfoBody';
import { ContactMobile } from '../components/support-mobile/ContactMobile';

export const Contact: React.FC = () => {
    const isDesktop = useIsDesktop();
    const seo = (
        <SEO
            title="お問い合わせ"
            description="Milkyway Japan（モンゴル旅行・モンゴルツアー専門の現地旅行社）へのお問い合わせ。ご予約・お支払い・ツアー内容のご質問に、日本語スタッフがLINE・チャット・メールでお答えします。"
            canonical="/contact"
        />
    );

    // PC: the live contact panel as the body of the Info layout.
    if (isDesktop) {
        return (
            <InfoLayoutDesktop page="contactUs">
                {seo}
                <ContactInfoBody />
            </InfoLayoutDesktop>
        );
    }

    return (
        <>
            {seo}
            <ContactMobile />
        </>
    );
};
