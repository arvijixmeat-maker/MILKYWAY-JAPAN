import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { ProductCard } from '../product/ProductCard';
import type { TourProduct } from '../../types/product';

interface RelatedToursProps {
    category?: string;
    tag?: string;
    limit?: number;
}

interface RawProduct {
    id: string;
    name?: string;
    category?: string;
    duration?: string;
    price?: number;
    originalPrice?: number;
    original_price?: number;
    status?: string;
    tags?: unknown;
    mainImages?: unknown;
    main_images?: unknown;
    is_popular?: number | boolean;
    is_featured?: number | boolean;
    isPopular?: number | boolean;
    isFeatured?: number | boolean;
    sort_order?: number;
    sortOrder?: number;
    created_at?: string;
    createdAt?: string;
}

const truthy = (v: unknown) => v === 1 || v === true;

const fallbackRank = (p: RawProduct): number => {
    const popular = truthy(p.is_popular) || truthy(p.isPopular) ? 1000 : 0;
    const featured = truthy(p.is_featured) || truthy(p.isFeatured) ? 500 : 0;
    const sort = -1 * (p.sort_order ?? p.sortOrder ?? 0);
    return popular + featured + sort;
};

const norm = (v: unknown) => String(v ?? '').toLowerCase().trim();

const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(norm).filter(Boolean) : [];

const toImageArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const scoreProduct = (p: RawProduct, magCategory: string, magTag: string): number => {
    const pCategory = norm(p.category);
    const pName = norm(p.name);
    const pTags = toStringArray(p.tags);

    let score = 0;

    if (magCategory && pCategory && magCategory === pCategory) score += 100;

    const keywords = [magCategory, magTag].filter(k => k && k.length >= 2);
    for (const kw of keywords) {
        if (pCategory.includes(kw)) score += 25;
        if (pName.includes(kw)) score += 30;
        for (const t of pTags) {
            if (t.includes(kw)) score += 25;
        }
    }

    return score;
};

export const RelatedTours: React.FC<RelatedToursProps> = ({ category, tag, limit = 3 }) => {
    const { t } = useTranslation();

    const { data: products = [] } = useQuery<RawProduct[]>({
        queryKey: ['products', 'related-tours'],
        queryFn: async () => {
            const data = await api.products.list();
            return Array.isArray(data) ? (data as RawProduct[]) : [];
        },
        staleTime: 1000 * 60 * 30,
    });

    const matches = useMemo(() => {
        const magCategory = norm(category);
        const magTag = norm(tag);

        const eligible = products.filter((p) => {
            const imgs = toImageArray(p.mainImages ?? p.main_images);
            return p.status === 'active' && imgs.length > 0;
        });

        const scored = eligible
            .map((p) => ({ product: p, score: scoreProduct(p, magCategory, magTag) }))
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score);

        const picked = scored.slice(0, limit).map((r) => r.product);

        if (picked.length >= limit) return picked;

        const pickedIds = new Set(picked.map((p) => p.id));
        const fallback = eligible
            .filter((p) => !pickedIds.has(p.id))
            .sort((a, b) => fallbackRank(b) - fallbackRank(a))
            .slice(0, limit - picked.length);

        return [...picked, ...fallback];
    }, [products, category, tag, limit]);

    if (matches.length === 0) return null;

    return (
        <section
            className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800"
            aria-labelledby="related-tours-heading"
        >
            <h3
                id="related-tours-heading"
                className="text-xl font-bold text-text-primary dark:text-white mb-6"
            >
                {t('travel_guide.detail.related_tours')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {matches.map((p) => {
                    const cardProduct: Pick<
                        TourProduct,
                        'id' | 'name' | 'price' | 'originalPrice' | 'category' | 'duration' | 'mainImages'
                    > = {
                        id: p.id,
                        name: p.name ?? '',
                        price: p.price ?? 0,
                        originalPrice: p.originalPrice ?? p.original_price,
                        category: p.category ?? '',
                        duration: p.duration ?? '',
                        mainImages: toImageArray(p.mainImages ?? p.main_images),
                    };
                    return <ProductCard key={p.id} product={cardProduct} />;
                })}
            </div>
        </section>
    );
};
