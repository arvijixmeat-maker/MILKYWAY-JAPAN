import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { ProductCard } from '../product/ProductCard';
import type { TourProduct } from '../../types/product';

interface RelatedToursProps {
    category?: string;
    tag?: string;
    title?: string;
    description?: string;
    limit?: number;
}

interface RawProduct {
    id: string;
    name?: string;
    description?: string;
    category?: string;
    duration?: string;
    price?: number;
    originalPrice?: number;
    original_price?: number;
    status?: string;
    tags?: unknown;
    pricingOptions?: unknown;
    pricing_options?: unknown;
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

const toArray = (v: unknown): unknown[] => {
    if (Array.isArray(v)) return v;
    if (typeof v !== 'string') return [];
    try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return v.split(',');
    }
};

const toStringArray = (v: unknown): string[] =>
    toArray(v).map(norm).filter(Boolean);

const toImageArray = (v: unknown): string[] =>
    toArray(v).filter((x): x is string => typeof x === 'string' && x.length > 0);

const keywordAliases: Record<string, string[]> = {
    ゴビ: ['ゴビ', '砂漠', '南部'],
    乗馬: ['乗馬', '馬', '草原'],
    ゲル: ['ゲル', 'キャンプ', '遊牧民'],
    星空: ['星空', '天の川', '夜空'],
    ナーダム: ['ナーダム', '祭り', '競馬'],
    テレルジ: ['テレルジ', '国立公園', '亀石'],
    ウランバートル: ['ウランバートル', '市内', '首都'],
    フブスグル: ['フブスグル', '湖', '北部'],
};

const buildKeywords = (...values: Array<string | undefined>): string[] => {
    const source = values.map(norm).filter(Boolean).join(' ');
    const tokens = source
        .split(/[\s、。・｜|/【】()[\]（）「」『』,:：!?！？]+/)
        .filter((token) => token.length >= 2);

    Object.entries(keywordAliases).forEach(([key, aliases]) => {
        if (aliases.some((alias) => source.includes(norm(alias)))) {
            tokens.push(key, ...aliases);
        }
    });

    return [...new Set(tokens.map(norm).filter(Boolean))];
};

const scoreProduct = (p: RawProduct, keywords: string[], magCategory: string): number => {
    const pCategory = norm(p.category);
    const pName = norm(p.name);
    const pDescription = norm(p.description);
    const pTags = toStringArray(p.tags);
    const searchable = [pCategory, pName, pDescription, ...pTags].join(' ');

    let score = 0;

    if (magCategory && pCategory && magCategory === pCategory) score += 100;

    for (const kw of keywords) {
        if (!searchable.includes(kw)) continue;
        if (pName.includes(kw)) score += 35;
        if (pCategory.includes(kw)) score += 25;
        if (pDescription.includes(kw)) score += 12;
        if (pTags.some((tagValue) => tagValue.includes(kw))) score += 20;
    }

    return score;
};

const getStartingPrice = (product: RawProduct): number => {
    const directPrice = Number(product.price);
    const tierPrices = toArray(product.pricingOptions ?? product.pricing_options)
        .map((option) => {
            if (!option || typeof option !== 'object') return 0;
            const row = option as Record<string, unknown>;
            return Number(row.pricePerPerson ?? row.price_per_person ?? row.price ?? 0);
        })
        .filter((price) => Number.isFinite(price) && price > 0);

    if (tierPrices.length > 0) return Math.min(...tierPrices);
    return Number.isFinite(directPrice) ? directPrice : 0;
};

export const RelatedTours: React.FC<RelatedToursProps> = ({
    category,
    tag,
    title,
    description,
    limit = 3,
}) => {
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
        const keywords = buildKeywords(title, category, tag, description);

        const eligible = products.filter((p) => {
            const imgs = toImageArray(p.mainImages ?? p.main_images);
            return p.status === 'active' && imgs.length > 0;
        });

        const scored = eligible
            .map((p) => ({ product: p, score: scoreProduct(p, keywords, magCategory) }))
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
    }, [products, category, tag, title, description, limit]);

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
                        price: getStartingPrice(p),
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
