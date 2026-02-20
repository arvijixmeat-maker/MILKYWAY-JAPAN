import React from 'react';
import { getOptimizedImageUrl } from '../../utils/supabaseImage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Magazine {
    id: string;
    title: string;
    description: string;
    category: string;
    image: string;
    isActive: boolean;
}

interface MagazineSectionProps {
    magazines: Magazine[];
}

export const MagazineSection: React.FC<MagazineSectionProps> = ({ magazines }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    // If no magazines, show nothing
    if (magazines.length === 0) return null;

    return (
        <section className="py-10 bg-white dark:bg-surface-dark/30">
            <div className="px-6 mb-6 flex items-end justify-between">
                <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{t('home.magazine.title')}</h3>
                    <p className="text-[13px] text-slate-500 mt-1">{t('home.magazine.subtitle')}</p>
                </div>
                <button
                    onClick={() => navigate('/travel-guide')}
                    className="text-sm font-bold text-primary flex items-center shrink-0 mb-1 active:scale-95 transition-transform"
                >
                    {t('home.magazine.view_all')} <span className="material-symbols-outlined text-sm ml-0.5">chevron_right</span>
                </button>
            </div>

            {/* Standard Horizontal Snap Scroll (Stable & High Quality) */}
            <div className="flex overflow-x-auto gap-4 px-6 pb-8 snap-x snap-mandatory scrollbar-hide">
                {magazines.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => navigate(`/travel-guide/${item.id}`)}
                        className="relative min-w-[260px] w-[260px] h-[360px] snap-center rounded-2xl overflow-hidden shadow-lg cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
                    >
                        {/* Image Layer */}
                        <div className="absolute inset-0 bg-slate-200">
                            {item.image ? (
                                <img
                                    src={getOptimizedImageUrl(item.image, 'productThumbnail')}
                                    alt={item.title}
                                    width={260}
                                    height={360}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                                </div>
                            )}
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                        </div>

                        {/* Top Icon */}
                        <div className="absolute top-4 right-4 z-10">
                            <div className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-sm">favorite</span>
                            </div>
                        </div>

                        {/* Bottom Text Content */}
                        <div className="absolute bottom-0 left-0 w-full p-5 text-left z-10">
                            <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-[10px] font-bold text-white mb-2">
                                {item.category || t('home.magazine.default_category')}
                            </span>
                            <h4 className="text-lg font-bold text-white leading-snug mb-2 line-clamp-2 drop-shadow-md">
                                {item.title}
                            </h4>
                            <p className="text-white/70 text-xs line-clamp-2">
                                {item.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
