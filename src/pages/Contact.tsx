import React from 'react';
import { SEO } from '../components/seo/SEO';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { MW, MW_FONT_EN } from '../components/desktop-primitives/mwTokens';
import { M_PAPER } from '../components/mobile/mobileTheme';
import { ContactMobile, ContactPanel } from '../components/support-mobile/ContactMobile';

const LEAD = '日本語スタッフが24時間以内にご返信します。';

export const Contact: React.FC = () => {
    const isDesktop = useIsDesktop();
    const seo = (
        <SEO
            title="お問い合わせ"
            description="Milkyway Japan（モンゴル旅行・モンゴルツアー専門の現地旅行社）へのお問い合わせ。ご予約・お支払い・ツアー内容のご質問に、日本語スタッフがLINE・チャット・メールでお答えします。"
            canonical="/contact"
        />
    );

    // No PC design for this page: the same channels and form in a centred column.
    if (isDesktop) {
        return (
            <DesktopLayout>
                {seo}
                <section style={{ background: M_PAPER, borderBottom: `1px solid ${MW.line}` }}>
                    <div style={{ maxWidth: 560, margin: '0 auto', padding: '56px 24px 96px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep }}>CONTACT</span>
                            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, lineHeight: 1.3 }}>お問い合わせ</h1>
                            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: MW.mute }}>{LEAD}</p>
                        </div>
                        <ContactPanel />
                    </div>
                </section>
            </DesktopLayout>
        );
    }

    return (
        <>
            {seo}
            <ContactMobile />
        </>
    );
};
