import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProductCard } from '../product/ProductCard';
import { useRelatedTourMatches, type RelatedTourQuery } from './relatedTourMatches';

export const RelatedTours: React.FC<RelatedTourQuery> = (query) => {
    const { t } = useTranslation();
    const matches = useRelatedTourMatches(query);

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
                {matches.map((p) => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </div>
        </section>
    );
};
