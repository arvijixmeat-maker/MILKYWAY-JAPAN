import React, { useState, useMemo } from 'react';
import { getOptimizedImageUrl } from '../../utils/supabaseImage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CategoryTab {
    id: string;
    name: string;
    title: string;
    subtitle: string;
    bannerImage: string;
}

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    mainImages: string[];
    duration: string;
    tags: string[];
}

interface TravelThemeSectionProps {
    products: Product[];
    tabs: CategoryTab[];
}

export const TravelThemeSection: React.FC<TravelThemeSectionProps> = ({ products, tabs }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '');

    const currentTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];

    const categoryProducts = useMemo(() => {
        if (!currentTabInfo) return [];
        return products.filter(p => p.category === currentTabInfo?.name);
    }, [products, currentTabInfo?.name]);

    // If no tabs exist, don't render anything
    if (!currentTabInfo || tabs.length === 0) {
        return null;
    }

    return (
        <section className="pt-2 pb-8 bg-white dark:bg-background-dark">
            {/* Tabs (Chips) */}
            <div className="flex overflow-x-auto px-5 mb-6 no-scrollbar gap-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            whitespace-nowrap px-4 py-2.5 rounded-full text-[15px] font-bold transition-all active:scale-95
                            ${activeTab === tab.id
                                ? 'bg-primary-dark text-white shadow-md shadow-primary/20'
                                : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-transparent hover:bg-gray-50 dark:hover:bg-white/10'}
                            ${activeTab === tab.id ? '' : ''}
                        `}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="px-5 min-h-[400px]">

                {/* 1. Category Banner (Generic, not a product) */}
                <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden mb-6 shadow-sm bg-slate-900 group">
                    {/* 2. Main Image Layer (Fit Contain) -> Cover */}
                    <img
                        src={getOptimizedImageUrl(currentTabInfo.bannerImage, 'heroBanner')}
                        alt={currentTabInfo.title}
                        width={800}
                        height={340}
                        fetchPriority="high"
                        className="relative z-10 w-full h-full object-cover transition-opacity duration-300 opacity-0"
                        onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-20"></div>
                    <div className="absolute bottom-0 left-0 p-6 w-full pointer-events-none z-20">
                        <div className="inline-flex items-center px-2 py-0.5 mb-3 text-[10px] font-bold text-white bg-primary rounded uppercase tracking-wider">{currentTabInfo.name}</div>
                        <h3 className="text-2xl font-bold text-white leading-tight mb-2 whitespace-pre-line text-left">
                            {currentTabInfo.title}
                        </h3>
                        <p className="text-white/80 text-sm font-medium mb-1 text-left whitespace-pre-line">
                            {currentTabInfo.subtitle}
                        </p>
                    </div>
                </div>

                {/* 2. Product List */}
                {categoryProducts.length > 0 ? (
                    <div className="space-y-5">
                        {categoryProducts.map((product) => (
                            <div
                                key={product.id}
                                onClick={() => navigate(`/products/${product.id}`)}
                                className="flex gap-4 cursor-pointer group"
                            >
                                <div className="w-[84px] h-[84px] rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 relative">
                                    {product.mainImages?.[0] ? (
                                        <img
                                            src={getOptimizedImageUrl(product.mainImages[0], 'productThumbnail')}
                                            alt={product.name}
                                            loading="lazy"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                target.style.display = 'none';
                                                target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                const icon = document.createElement('span');
                                                icon.className = 'material-symbols-outlined text-2xl text-slate-300';
                                                icon.textContent = 'landscape';
                                                target.parentElement?.appendChild(icon);
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-2xl text-slate-300">landscape</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col justify-center py-0.5 flex-1">
                                    <span className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 mb-1.5 block">
                                        [{product.duration}] {product.name}
                                    </span>

                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                        <span>{product.category}</span>
                                        <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                                        <span>{product.tags?.[0] || t('home.theme.recommendation')}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="text-[15px] font-bold text-slate-900 dark:text-white">
                                            {product.price ? product.price.toLocaleString() : t('home.theme.price_inquiry')}{product.price ? t('home.theme.won_from') : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <p className="text-sm">{t('home.theme.no_items')}</p>
                    </div>
                )}

                {/* 'More' Button */}
                <div className="mt-8">
                    <button
                        onClick={() => navigate(`/products?category=${activeTab}`)}
                        className="w-full py-3.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                    >
                        {t('home.theme.more_items_prefix')} {currentTabInfo.name} {t('home.theme.more_items_suffix')}
                    </button>
                </div>
            </div>
        </section>
    );
};
