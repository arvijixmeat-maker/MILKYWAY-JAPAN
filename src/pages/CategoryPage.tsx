import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { BottomNav } from '../components/layout/BottomNav';
import { CategoryLanding, type CategoryLandingContent } from '../components/category/CategoryLanding';
import { CategoryLandingDesktop } from '../components/category-desktop/CategoryLandingDesktop';
import { useIsDesktop } from '../hooks/useIsDesktop';

// Fallback hero when admin hasn't configured the landing page yet.
const FALLBACK_HERO = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200';

export const CategoryPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const isDesktop = useIsDesktop();

    const { data: category, isLoading: isLoadingCategory } = useQuery({
        queryKey: ['category', slug],
        queryFn: async () => {
            if (!slug) return null;
            try {
                return await api.categories.get(slug);
            } catch (e) {
                return null;
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const categoryName: string | undefined = category?.name;

    const { data: products = [], isLoading: isLoadingProducts } = useQuery({
        queryKey: ['products-by-category', slug, categoryName],
        enabled: !!slug,
        queryFn: async () => {
            if (!slug) return [];
            const data = await api.products.list();
            if (!Array.isArray(data)) return [];
            const normalize = (t: string) => t ? t.toLowerCase().replace(/\s+/g, '') : '';
            const targets = [normalize(slug), categoryName ? normalize(categoryName) : ''].filter(Boolean);
            return data
                .filter((item: any) => {
                    if (item.status !== 'active') return false;
                    const cat = normalize(item.category || '');
                    const tags: string[] = (item.tags || []).map((t: string) => normalize(t));
                    // Match if the product's stored category OR any of its tags matches the slug or the category display name.
                    return targets.some((t) => cat === t || cat.includes(t) || tags.some((tag) => tag === t || tag.includes(t)));
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
        },
        staleTime: 1000 * 60 * 5,
    });

    if (isLoadingCategory) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500" />
            </div>
        );
    }

    if (!category) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 gap-3">
                <p className="text-lg font-bold text-slate-800">カテゴリが見つかりません</p>
                <p className="text-sm text-slate-500">URLをご確認ください。</p>
            </div>
        );
    }

    const heroImages: string[] = (() => {
        const arr = Array.isArray(category.landing_hero_images) ? category.landing_hero_images.filter(Boolean) : [];
        if (arr.length > 0) return arr;
        const single = category.landing_hero_image || category.image;
        if (single) return [single];
        return [FALLBACK_HERO];
    })();

    const content: CategoryLandingContent = {
        heroImage: heroImages[0],
        heroImages,
        heroTagline: category.landing_hero_tagline || undefined,
        heroTitle: category.landing_hero_title || category.name,
        heroSubtitle: category.landing_hero_subtitle || category.description || undefined,
        accentColor: category.landing_accent_color || '#0f766e',
        highlights: Array.isArray(category.landing_highlights) ? category.landing_highlights : [],
        productGridTitle: category.landing_product_grid_title || `${category.name}のツアー`,
    };

    // ─── Structured Data (JSON-LD) for SEO ──────────────────────────
    const seoDescription = category.landing_hero_subtitle || category.description || `${category.name}のモンゴルツアーをご案内します。`;
    const seoUrl = `https://mongolryokou.com/category/${slug}`;
    const heroOgImage = heroImages[0]?.startsWith('http') ? heroImages[0] : undefined;

    const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://mongolryokou.com/' },
            { '@type': 'ListItem', position: 2, name: 'ツアー商品', item: 'https://mongolryokou.com/products' },
            { '@type': 'ListItem', position: 3, name: category.name, item: seoUrl },
        ],
    };

    const itemListLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${category.name}のツアー商品`,
        itemListElement: products.slice(0, 20).map((p: any, i: number) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://mongolryokou.com/products/${p.id}`,
            name: p.name,
        })),
    };

    const collectionLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${category.name} | Milkyway Japan`,
        description: seoDescription,
        url: seoUrl,
        inLanguage: 'ja',
        isPartOf: { '@type': 'WebSite', name: 'Milkyway Japan', url: 'https://mongolryokou.com' },
    };

    return (
        <>
            <SEO
                title={category.name}
                description={seoDescription}
                canonical={`/category/${slug}`}
                image={heroOgImage}
                structuredData={[collectionLd, breadcrumbLd, itemListLd]}
            />
            {isDesktop ? (
                <CategoryLandingDesktop
                    content={content}
                    products={products}
                    isLoadingProducts={isLoadingProducts}
                />
            ) : (
                <>
                    <CategoryLanding
                        content={content}
                        products={products}
                        isLoadingProducts={isLoadingProducts}
                        headerTitle={category.name}
                    />
                    <BottomNav />
                </>
            )}
        </>
    );
};