import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getOptimizedImageUrl } from '../../utils/supabaseImage';

interface EventBanner {
    id: string;
    image?: string;
    backgroundColor: string;
    tag: string;
    title: string;
    icon: string;
    link: string;
    location?: 'home' | 'products' | 'all';
}

export const PromoBanner: React.FC = () => {
    const [banners, setBanners] = useState<EventBanner[]>([]);

    useEffect(() => {
        const fetchBanners = async () => {
            const { data } = await supabase.from('event_banners').select('*').order('order');
            if (data && data.length > 0) {
                setBanners(data.map((e: any) => ({
                    id: e.id,
                    image: e.image,
                    backgroundColor: e.background_color || '#0F766E',
                    tag: e.tag,
                    title: e.title,
                    icon: e.icon,
                    link: e.link,
                    location: e.location
                })));
            }
        };
        fetchBanners();
    }, []);

    const filteredBanners = banners.filter(b => !b.location || b.location === 'home' || b.location === 'all');

    if (filteredBanners.length === 0) return null;

    return (
        <div className="px-5 py-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
                {filteredBanners.map((banner) => (
                    <div
                        key={banner.id}
                        onClick={() => window.location.href = banner.link}
                        className="relative rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-primary/20 shrink-0 cursor-pointer overflow-hidden group"
                        style={{
                            width: '320px', // Fixed width for consistent cards
                            background: banner.image ? `url('${getOptimizedImageUrl(banner.image, 'productThumbnail')}') center/cover` : banner.backgroundColor
                        }}
                    >
                        {/* Overlay for readability if image is present */}
                        {banner.image && <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>}

                        <div className="relative z-10">
                            <p className="text-white/80 text-[11px] font-bold mb-1 uppercase tracking-wider">{banner.tag}</p>
                            <h4 className="text-white font-bold text-[16px] whitespace-pre-wrap leading-tight">{banner.title}</h4>
                        </div>
                        <span className="material-symbols-outlined text-white/50 text-4xl relative z-10 group-hover:scale-110 transition-transform">{banner.icon}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
