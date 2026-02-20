import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getResponsiveImageProps } from '../../utils/supabaseImage';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { HeroSkeleton } from '../skeletons/HeroSkeleton';
import { useTranslation } from 'react-i18next';

interface Banner {
    id: string;
    image: string;
    tag: string;
    title: string;
    subtitle: string;
    link?: string;
}

export const HeroSection: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const DEFAULT_BANNERS: Banner[] = useMemo(() => [
        {
            id: 'banner-1',
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCa-lOI8hWg7jkEPE6aLpgULy46wN1zu_SdVj-gwGCoVza2ioMGm0cfT7njLma7CYQJ7YOCcomwafa5fKhJc9eO0hKtIafFHLoS9Vw_f3fyxGnxJkpkfUIBcpBSK8kb0onNzfKU-ImdlsG7T9ipvcqEVeiv0IkkaRjkNX43p7iWB42lYEVlHp-virwWcrmYH0R2SNXPmyNr-nNF55R-vs8rATJH09lIQgi22C3kyFBnx7gHhz_pjfvaFOI5i-SonHUBrrbuY_hnNQ",
            tag: t('home.hero.banner1_tag'),
            title: t('home.hero.banner1_title'),
            subtitle: t('home.hero.banner1_subtitle'),
            link: "/products/1"
        },
        {
            id: 'banner-2',
            image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4K20GMVq8yGSfTci46S9biO_u2LDuxENlWBxUuJ0nn-vXp0HxEwZMChpGwntz2L5VISAaVTO0C3Jwe-ONgJLNcItHgdmG8Zb9pp-1uACHde5HETQBqmxnKmhs57ApVVkSCA6Kd-ta5q_h0ExQ84FYSY6vbGnDKD5yCJn-muLZnWDQCVEXnPd4YHvkNxzeRZmK1PN9XDNxQ1qdNDHGzJNqUkknzlI6FflIQG7Tnf1tHDg5TqEB8Gp1IlcZiBunTStiUDAFZDa0zQ",
            tag: t('home.hero.banner2_tag'),
            title: t('home.hero.banner2_title'),
            subtitle: t('home.hero.banner2_subtitle'),
            link: "/products/2"
        }
    ], [t]);

    const { data: banners = [], isLoading } = useQuery({
        queryKey: ['heroBanners', t('home.hero.banner1_title')], // Add dependency to translation
        queryFn: async () => {
            const { data } = await supabase.from('banners').select('id, image_url, tag, title, subtitle, link').eq('type', 'hero').order('order');
            if (data && data.length > 0) {
                return data.map((b: any) => ({
                    id: b.id,
                    image: b.image_url,
                    tag: b.tag || 'Premium Trip',
                    title: b.title,
                    subtitle: b.subtitle,
                    link: b.link
                }));
            }
            return DEFAULT_BANNERS;
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        placeholderData: DEFAULT_BANNERS,
    });

    if (isLoading) {
        return <HeroSkeleton />;
    }

    if (banners.length === 0) {
        return null;
    }

    const handleBannerClick = (link?: string) => {
        if (link) {
            navigate(link);
        }
    };

    return (
        <section className="mt-4 mb-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-3 px-5 relative group">
            {banners.map((banner, index) => (
                <div
                    key={banner.id}
                    onClick={() => handleBannerClick(banner.link)}
                    className={`relative min-w-[90%] aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 dark:shadow-none snap-center group/banner bg-slate-900 ${banner.link ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
                >
                    <img
                        {...getResponsiveImageProps(banner.image, 'banner')}
                        alt={banner.title}
                        fetchPriority={index === 0 ? "high" : "low"}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0"
                        onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

                    <div className="absolute bottom-0 left-0 p-6 w-full pointer-events-none">
                        <div className="inline-flex items-center px-2 py-0.5 mb-3 text-[10px] font-bold text-white bg-primary-dark rounded uppercase tracking-wider">{banner.tag}</div>
                        <h2 className="text-2xl font-bold text-white leading-tight mb-2 whitespace-pre-line">{banner.title}</h2>
                        <p className="text-white/80 text-sm font-medium mb-1">{banner.subtitle}</p>
                    </div>
                </div>
            ))}
        </section>
    );
};
