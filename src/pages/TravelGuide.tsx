
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api'; 
import { SEO } from '../components/seo/SEO';
import { useTranslation } from 'react-i18next';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { MagazineListDesktop } from '../components/magazine-desktop/MagazineListDesktop';
import { MobileShell } from '../components/mobile/MobileShell';
import { MagazineListMobile } from '../components/magazine-mobile/MagazineListMobile';

interface Magazine {
    id: string;
    title: string;
    description: string;
    content: string;
    category: string;
    image: string;
    tag?: string;
    isFeatured: boolean;
    isActive: boolean;
    order: number;
}

/** Rows as returned by /api/categories and /api/magazines (snake_case). */
interface RawCategory {
    name: string;
    type?: string;
    is_active?: boolean | number | null;
    order?: number;
}

interface RawMagazine {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    content: string;
    category: string;
    thumbnail?: string;
    image?: string;
    tag?: string;
    is_featured: boolean;
    is_active: boolean;
    order: number;
}

export const TravelGuide: React.FC = () => {
    const { t } = useTranslation();
    const isDesktop = useIsDesktop();
    const [magazineCategories, setMagazineCategories] = useState<string[]>([]);
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch magazine categories
            try {
                const catData = await api.categories.list('magazine');
                if (Array.isArray(catData)) {
                    const magazineCats = catData
                        .filter((c: RawCategory) => c.type === 'magazine' && (c.is_active ?? true))
                        .sort((a: RawCategory, b: RawCategory) => (a.order || 0) - (b.order || 0))
                        .map((c: RawCategory) => c.name);
                    setMagazineCategories(magazineCats);
                }

                // Fetch magazines
                const magData = await api.magazines.list();
                if (Array.isArray(magData)) {
                    setMagazines(magData
                        .filter((m: RawMagazine) => m.is_active ?? true)
                        .sort((a: RawMagazine, b: RawMagazine) => (a.order || 0) - (b.order || 0))
                        .map((m: RawMagazine) => ({
                            id: m.id,
                            title: m.title,
                            description: m.subtitle || m.description || '',
                            content: m.content,
                            category: m.category,
                            image: m.thumbnail || m.image || '',
                            tag: m.tag,
                            isFeatured: m.is_featured,
                            isActive: m.is_active,
                            order: m.order
                        }))
                    );
                }
            } catch (error) {
                console.error('Error fetching travel guide data:', error);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // ─── Structured Data (JSON-LD) — guide list collection schema ───
    const guideDescription = "モンゴル旅行の必須情報！モンゴルの基本情報、旅行のヒント、地域別ガイド、文化やグルメ情報をチェックしましょう。";

    const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://mongolryokou.com/' },
            { '@type': 'ListItem', position: 2, name: '旅行ガイド', item: 'https://mongolryokou.com/travel-guide' },
        ],
    };

    const itemListLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'モンゴル旅行ガイド記事一覧',
        itemListElement: magazines.slice(0, 30).map((m, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://mongolryokou.com/travel-guide/${m.id}`,
            name: m.title,
        })),
    };

    const collectionLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'モンゴル旅行ガイド | Milkyway Japan',
        description: guideDescription,
        url: 'https://mongolryokou.com/travel-guide',
        inLanguage: 'ja',
        isPartOf: { '@type': 'WebSite', name: 'Milkyway Japan', url: 'https://mongolryokou.com' },
    };

    const seo = (
        <SEO
            title={`${t('travel_guide.title')} | Milkyway Japan`}
            description={guideDescription}
            keywords="モンゴル旅行ガイド, モンゴル情報, モンゴル文化, モンゴル料理, モンゴル旅行準備"
            canonical="/travel-guide"
            structuredData={[collectionLd, breadcrumbLd, itemListLd]}
        />
    );

    if (isDesktop) {
        return (
            <>
                {seo}
                <DesktopLayout>
                    <MagazineListDesktop magazines={magazines} categories={magazineCategories} />
                </DesktopLayout>
            </>
        );
    }

    return (
        <>
            {seo}
            <MobileShell title="旅マガジン">
                <MagazineListMobile magazines={magazines} categories={magazineCategories} loading={loading} />
            </MobileShell>
        </>
    );
};
