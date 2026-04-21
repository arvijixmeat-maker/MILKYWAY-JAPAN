import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { BottomNav } from '../components/layout/BottomNav';
import { CategoryLanding, type CategoryLandingContent } from '../components/category/CategoryLanding';

// Default content for the Gobi desert landing page. Will be replaced by admin-
// editable content in Phase 2; kept here so the page renders immediately.
const DEFAULT_CONTENT: CategoryLandingContent = {
    heroImage: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200',
    heroTagline: '満天の星空と砂丘が待っている',
    heroTitle: 'ゴビ砂漠ツアー',
    heroSubtitle: '天の川がはっきり見える空、夕陽に染まる砂丘、恐竜化石の発掘跡。\nモンゴル南部だけの特別な体験。',
    accentColor: '#d97706',
    productGridTitle: 'ゴビ砂漠の人気ツアー',
    highlights: [
        {
            label: 'ハイライト 1',
            title: 'ゴビ砂漠でしか味わえない絶景',
            subtitle: '昼と夜、それぞれに違う感動があります。',
            cards: [
                {
                    image: 'https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?w=900',
                    tags: ['星空', '天の川', '夜'],
                    title: '満天の星空と天の川',
                    description: '視界を遮る光が一切ない夜空。\n流れ星と天の川に包まれる一生モノの瞬間。',
                },
                {
                    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=900',
                    tags: ['ホンゴル砂丘', 'ラクダ'],
                    title: '歌う砂丘「ホンゴル」',
                    description: '夕陽に染まる巨大な砂丘。\nラクダで散歩する貴重な体験。',
                },
                {
                    image: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=900',
                    tags: ['バヤンザク', '恐竜化石'],
                    title: '炎の崖・バヤンザク',
                    description: '20世紀初頭に恐竜卵の化石が発見された世界的スポット。\n夕暮れの赤い絶壁。',
                },
            ],
        },
        {
            label: 'ハイライト 2',
            title: '快適な滞在環境',
            subtitle: '砂漠の中でも安心してお過ごしいただけます。',
            cards: [
                {
                    image: 'https://images.unsplash.com/photo-1571900301616-e65fc7a8e3b3?w=900',
                    tags: ['ゲル宿泊', '4つ星'],
                    title: 'ツーリストキャンプ',
                    description: '水洗トイレ・温水シャワー完備の施設を優先的に手配。\n伝統的なゲルでの宿泊体験。',
                },
                {
                    image: 'https://images.unsplash.com/photo-1535535362390-9cfa4bb4d2fa?w=900',
                    tags: ['日本語ガイド', '安心'],
                    title: '日本語ガイド同行',
                    description: '現地に精通した日本語ガイドが旅の最後までご案内。\n初めてでも安心。',
                },
                {
                    image: 'https://images.unsplash.com/photo-1534996858221-380b92700493?w=900',
                    tags: ['専用車両', '快適'],
                    title: '快適な専用車両',
                    description: 'オフロードにも強い4WD専用車で砂漠の道も快適に。\nWi-Fi完備の車両もご用意。',
                },
            ],
        },
    ],
};

export const GobiDesert: React.FC = () => {
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products-gobi'],
        queryFn: async () => {
            try {
                const data = await api.products.list();
                if (!Array.isArray(data)) return [];

                const normalize = (text: string) => text ? text.toLowerCase().replace(/\s+/g, '') : '';

                return data
                    .filter((item: any) => {
                        if (item.status !== 'active') return false;
                        const cat = normalize(item.category || '');
                        const name = normalize(item.name || '');
                        const tags = (item.tags || []).map((t: string) => normalize(t)).join(',');
                        return cat.includes('ゴビ') || cat.includes('고비') || cat.includes('gobi') ||
                            name.includes('ゴビ') || name.includes('고비') ||
                            tags.includes('ゴビ') || tags.includes('고비') || tags.includes('gobi');
                    })
                    .map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        originalPrice: item.original_price,
                        duration: item.duration,
                        category: item.category,
                        mainImages: item.mainImages || item.main_images || [],
                        status: item.status,
                    }));
            } catch (error) {
                console.error('Error fetching gobi products:', error);
                return [];
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "ゴビ砂漠ツアー",
        "description": "モンゴル南部・ゴビ砂漠の壮大な景色と満天の星空を体験する特別なツアー。",
        "publisher": { "@type": "Organization", "name": "Milkyway Japan" },
    };

    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "ホーム", "item": "https://mongolryokou.com/" },
            { "@type": "ListItem", "position": 2, "name": "モンゴルツアー比較", "item": "https://mongolryokou.com/mongol-tour" },
            { "@type": "ListItem", "position": 3, "name": "ゴビ砂漠ツアー", "item": "https://mongolryokou.com/gobi-desert" },
        ],
    };

    return (
        <>
            <SEO
                title="ゴビ砂漠ツアー – 満天の星空と壮大な砂丘を体験 | Milkyway Japan"
                description="モンゴル南部に広がるゴビ砂漠。ホンゴル砂丘で夕陽を眺め、夜は満天の星空（天の川）に包まれる感動のツアー。恐竜の化石発掘スポットなど、ゴビ砂漠の見どころを日本語ガイド付きでご案内します。"
                keywords="ゴビ砂漠ツアー, ゴビ砂漠旅行, ホンゴル砂丘, モンゴル星空, 炎の崖"
                canonical="/gobi-desert"
                structuredData={[structuredData, breadcrumbData]}
            />
            <CategoryLanding
                content={DEFAULT_CONTENT}
                products={products}
                isLoadingProducts={isLoading}
                headerTitle="ゴビ砂漠ツアー"
            />
            <BottomNav />
        </>
    );
};