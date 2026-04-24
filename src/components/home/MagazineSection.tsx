import React from 'react';
import { getOptimizedImageUrl } from '../../utils/cloudflareImage';
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
            <div className="flex overflow-x-auto gap-3 sm:gap-4 px-5 pb-8 snap-x snap-mandatory scrollbar-hide">
                {magazines.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => navigate(`/travel-guide/${item.id}`)}
                        className="relative min-w-[220px] w-[220px] h-[320px] sm:min-w-[280px] sm:w-[280px] sm:h-[400px] snap-center rounded-[20px] overflow-hidden shadow-lg cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 bg-gray-100 dark:bg-zinc-800"
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
                            {/* Mint Brand Gradient at Bottom */}
                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0f766e]/95 via-[#0f766e]/45 to-transparent" />
                            {/* Subtle dark base for text contrast */}
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>

                        {/* Top Right Brand Icon */}
                        <div className="absolute top-4 right-4 z-10">
                            <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-primary shadow-md">
                                <span className="material-symbols-outlined text-[16px]">flight_takeoff</span>
                            </div>
                        </div>

                        {/* Bottom Text Content */}
                        <div className="absolute bottom-0 left-0 w-full p-4 sm:p-5 text-left z-10 flex flex-col gap-2">
                            {/* Category Tag */}
                            <span className="inline-block self-start px-2 py-0.5 bg-white text-primary rounded-md text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm">
                                {item.category || t('home.magazine.default_category', { defaultValue: '準備' })}
                            </span>

                            {/* Title */}
                            <h4 className="text-[16px] sm:text-[18px] font-extrabold text-white leading-snug line-clamp-2 drop-shadow-md">
                                {item.title}
                            </h4>

                            {/* Description */}
                            <p className="text-white/85 text-[12px] sm:text-[13px] leading-relaxed line-clamp-2 font-medium">
                                {item.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
