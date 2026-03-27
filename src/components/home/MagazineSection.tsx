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
        <section className="py-12 bg-white dark:bg-background-dark">
            <div className="px-5 mb-5 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="text-[17px] sm:text-[19px] font-black text-[#0e1a18] dark:text-white leading-snug break-keep flex-1">
                        {t('home.magazine.title', { defaultValue: '今出発する良い旅行コースおすすめ！' })}
                    </h3>
                    <button
                        onClick={() => navigate('/travel-guide')}
                        className="text-[13px] sm:text-[15px] font-bold text-[#0D7A66] dark:text-[#18c9a6] flex items-center shrink-0 mt-0.5 active:scale-95 transition-transform"
                    >
                        {t('home.magazine.view_all', { defaultValue: '全て見る' })} <span className="material-symbols-outlined text-base sm:text-lg ml-0.5">chevron_right</span>
                    </button>
                </div>
                <p className="text-[12px] sm:text-[13px] text-gray-500">
                    {t('home.magazine.subtitle', { defaultValue: 'モンゴリアの天の川が厳選した最高の目的地' })}
                </p>
            </div>

            {/* Standard Horizontal Snap Scroll */}
            <div className="flex overflow-x-auto gap-4 px-5 pb-8 snap-x snap-mandatory scrollbar-hide">
                {magazines.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => navigate(`/travel-guide/${item.id}`)}
                        className="relative min-w-[280px] w-[280px] h-[400px] snap-center rounded-[20px] overflow-hidden shadow-lg cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 bg-gray-100 dark:bg-zinc-800"
                    >
                        {/* Image Layer */}
                        <div className="absolute inset-0">
                            {item.image ? (
                                <img
                                    src={getOptimizedImageUrl(item.image, 'productThumbnail')}
                                    alt={item.title}
                                    width={280}
                                    height={400}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-zinc-700">
                                    <span className="material-symbols-outlined text-4xl text-gray-400">image</span>
                                </div>
                            )}
                            {/* Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-90" />
                        </div>

                        {/* Top Right Blue Airplane Icon */}
                        <div className="absolute top-5 right-5 z-10">
                            <div className="w-9 h-9 rounded-full bg-[#0ea5e9]/90 backdrop-blur-md flex items-center justify-center text-white shadow-md">
                                <span className="material-symbols-outlined text-[18px]">flight_takeoff</span>
                            </div>
                        </div>

                        {/* Bottom Text Content */}
                        <div className="absolute bottom-0 left-0 w-full p-6 text-left z-10">
                            {/* Category Tag */}
                            <span className="inline-block px-2.5 py-1 bg-white/30 backdrop-blur-sm rounded-md text-[11px] font-bold text-white mb-3">
                                {item.category || t('home.magazine.default_category', { defaultValue: '準備' })}
                            </span>
                            
                            {/* Title with Flag Emoji */}
                            <h4 className="text-[19px] font-extrabold text-white leading-snug mb-2.5 line-clamp-2 drop-shadow-md">
                                🚩 {item.title}
                            </h4>
                            
                            {/* Description */}
                            <p className="text-white/80 text-[13px] leading-relaxed line-clamp-2 font-medium">
                                {item.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
