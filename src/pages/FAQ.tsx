import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { MW, MW_FONT_EN } from '../components/desktop-primitives/mwTokens';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { FaqMobile, FaqPanel, type FaqCategory, type FaqItem } from '../components/support-mobile/FaqMobile';

interface RawFaqCategory { id: string; name: string; is_active?: number | boolean }
interface RawFaq { id: string; question: string; answer: string; category?: string; is_active?: number | boolean; view_count?: number }

export const FAQPage: React.FC = () => {
    const isDesktop = useIsDesktop();
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<FaqCategory[]>([]);
    const [faqs, setFaqs] = useState<FaqItem[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            // Loaded independently: the questions must still show when the category list is unavailable.
            const [catRes, faqRes] = await Promise.allSettled([api.faqCategories.list(), api.faqs.list()]);
            const items: FaqItem[] = faqRes.status === 'fulfilled' && Array.isArray(faqRes.value)
                ? (faqRes.value as RawFaq[]).filter((f) => f.is_active).map((f) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category || '', viewCount: f.view_count || 0 }))
                : [];
            if (faqRes.status === 'rejected') console.error('Error fetching FAQ data:', faqRes.reason);
            const used = new Set(items.map((f) => f.category).filter(Boolean));
            const fromApi: FaqCategory[] = catRes.status === 'fulfilled' && Array.isArray(catRes.value)
                ? (catRes.value as RawFaqCategory[]).filter((c) => c.is_active).map((c) => ({ id: c.id, name: c.name }))
                : [];
            // Without a category list, group by the categories the questions themselves carry.
            const cats = fromApi.length > 0 ? fromApi : [...used].map((name) => ({ id: name, name }));
            setFaqs(items);
            setCategories(cats.length > 1 ? cats : []);
            setLoading(false);
        };
        fetchData();
    }, []);

    // Build FAQPage structured data from loaded FAQs (only when data exists)
    const faqStructuredData = faqs.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.slice(0, 20).map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    } : undefined;

    const seo = (
        <SEO
            title="よくある質問（FAQ）"
            description="モンゴル旅行に関するよくある質問と回答。予約方法、ツアー内容、持ち物、ビザ、決済・キャンセルなど、モンゴルツアーの疑問を解決します。"
            keywords="モンゴル旅行FAQ, モンゴルツアー質問, モンゴル旅行準備, モンゴルビザ, 旅行社よくある質問"
            canonical="/faq"
            structuredData={faqStructuredData}
        />
    );

    if (!isDesktop) {
        return (
            <>
                {seo}
                <FaqMobile faqs={faqs} categories={categories} loading={loading} />
            </>
        );
    }

    // PC: the same panel in a centred column inside the PC shell.
    return (
        <DesktopLayout>
            {seo}
            <section style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 72px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep }}>SUPPORT</span>
                    <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, lineHeight: 1.3 }}>モンゴル旅行のよくある質問</h1>
                </div>
                <div style={{ borderRadius: 24, overflow: 'hidden', border: `1px solid ${MW.line}` }}>
                    <FaqPanel faqs={faqs} categories={categories} loading={loading} />
                </div>
            </section>
        </DesktopLayout>
    );
};
