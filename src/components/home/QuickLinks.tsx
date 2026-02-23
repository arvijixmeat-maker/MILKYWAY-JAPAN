import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { getOptimizedImageUrl } from '../../utils/supabaseImage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import productsIcon from '../../assets/products_icon_v2.png';
import estimateIcon from '../../assets/custom_estimate_icon_v2.png';
import companionIcon from '../../assets/companion_search_icon_v2.png';

import reviewsIcon from '../../assets/my_reviews.png';

interface QuickLink {
    id: string;
    icon: string;
    image?: string;
    label: string;
    path: string;
}

export const QuickLinks: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const DEFAULT_LINKS: QuickLink[] = useMemo(() => [
        { id: 'link-1', icon: 'grid_view', image: productsIcon, label: t('home.quick_links.products'), path: '/products' },
        { id: 'link-2', icon: 'receipt_long', image: estimateIcon, label: t('home.quick_links.custom_estimate'), path: '/custom-estimate' },
        { id: 'link-3', icon: 'groups', image: companionIcon, label: t('home.quick_links.travel_mates'), path: '/travel-mates' },

        { id: 'link-5', icon: 'auto_stories', image: '/assets/icons/travel guide.png', label: t('home.quick_links.guide'), path: '/travel-guide' },
        { id: 'link-6', icon: 'star', image: reviewsIcon, label: t('home.quick_links.reviews'), path: '/reviews' },
    ], [t]);

    const { data: links = DEFAULT_LINKS } = useQuery({
        queryKey: ['quickLinks', t('home.quick_links.products')],
        queryFn: async () => {
            try {
                const data = await api.quickLinks.list();
                if (data && data.length > 0) {
                    return data.map((l: any) => ({
                        id: l.id,
                        icon: l.icon,
                        image: l.image,
                        label: l.label,
                        path: l.path
                    }));
                }
            } catch (error) {
                console.error('Error fetching quick links:', error);
            }
            return DEFAULT_LINKS;
        },
        staleTime: 1000 * 60 * 60,
        gcTime: 1000 * 60 * 60 * 24,
    });

    return (
        <section className="px-5 py-2 mb-6 relative group">
            <div className="grid grid-cols-3 gap-4">
                {links.map((link) => (
                    <button
                        key={link.id}
                        onClick={() => link.path !== '#' && navigate(link.path)}
                        className={`flex flex-col items-center gap-2 group relative`}
                    >
                        <div className="w-16 h-16 flex items-center justify-center group-active:scale-95 transition-all overflow-hidden p-2">
                            {link.image ? (
                                <img
                                    src={getOptimizedImageUrl(link.image, 'iconSmall')}
                                    alt={link.label}
                                    width={64}
                                    height={64}
                                    loading="lazy"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <span className="material-symbols-outlined text-primary text-2xl font-light">{link.icon}</span>
                            )}
                        </div>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{link.label}</span>
                    </button>
                ))}
            </div>
        </section>
    );
};
