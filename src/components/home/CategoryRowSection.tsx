import React, { useMemo } from 'react';
import { getOptimizedImageUrl } from '../../utils/supabaseImage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Category } from '../../types/category';

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    mainImages: string[];
    duration: string;
}

interface CategoryRowSectionProps {
    category: Category;
    products: Product[];
}

export const CategoryRowSection: React.FC<CategoryRowSectionProps> = ({ category, products }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const displayProducts = useMemo(() => {
        return products.filter(p => p.category === category.name).slice(0, 5);
    }, [products, category.name]);

    if (displayProducts.length === 0) {
        return null;
    }

    return (
        <section className="pt-4 pb-4 px-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {category.icon && (
                        <span className="material-symbols-outlined text-primary text-[22px]">{category.icon}</span>
                    )}
                    <h3 className="text-[19px] font-bold text-slate-900 dark:text-white">{category.name}</h3>
                </div>
                <button 
                    onClick={() => navigate(`/products?category=${category.name}`)}
                    className="text-sm text-primary font-bold flex items-center hover:opacity-80 transition-opacity"
                >
                    {t('home.theme.more_items_prefix', '')} {t('home.view_details', '자세히 보기')}
                    <span className="material-symbols-outlined text-[16px] ml-0.5">chevron_right</span>
                </button>
            </div>

            {/* Horizontal Scroll List */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-5 px-5 pb-4">
                {displayProducts.map((product) => (
                    <div
                        key={product.id}
                        onClick={() => navigate(`/products/${product.id}`)}
                        className="min-w-[220px] w-[220px] cursor-pointer group snap-center shrink-0"
                    >
                        {/* Image */}
                        <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:bg-slate-800">
                            {product.mainImages?.[0] ? (
                                <img
                                    src={getOptimizedImageUrl(product.mainImages[0], 'productThumbnail')}
                                    alt={product.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        target.style.display = 'none';
                                        target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                        const icon = document.createElement('span');
                                        icon.className = 'material-symbols-outlined text-3xl text-slate-300';
                                        icon.textContent = 'landscape';
                                        target.parentElement?.appendChild(icon);
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl text-slate-300">landscape</span>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                            {/* Title */}
                            <h4 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                                {product.name}
                            </h4>

                            {/* Duration */}
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 pb-1">
                                <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                                <span>{product.duration}</span>
                            </div>

                            {/* Price */}
                            <div className="pt-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[15px] font-bold text-primary">
                                        {product.price ? product.price.toLocaleString() : t('home.theme.price_inquiry', '문의')}{product.price ? t('home.theme.won', '원') : ''}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-400 line-through">
                                    {product.price ? (product.price * 1.05).toLocaleString() : ''}{product.price ? t('home.theme.won', '원') : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
