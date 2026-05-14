import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProductCard } from '../product/ProductCard';
import { ProductSkeleton } from '../skeletons/ProductSkeleton';
import { getOptimizedImageUrl } from '../../utils/cloudflareImage';

// ─── Types ────────────────────────────────────────────────
export interface HighlightCard {
    image: string;
    tags?: string[];
    title: string;
    description?: string;
    link?: string;
}

export interface HighlightSection {
    label: string;       // e.g. "하이라이트1" / "POINT 1"
    title: string;       // big headline
    subtitle?: string;   // small helper text under title
    cards: HighlightCard[];
}

export interface CategoryLandingContent {
    heroImage: string;                  // first/primary image (kept for backward compat)
    heroImages?: string[];              // slide images; falls back to [heroImage] when empty
    heroTagline?: string;   // small overline, e.g. "今がチャンス！"
    heroTitle: string;      // big title
    heroSubtitle?: string;
    accentColor?: string;   // hex — used on section badges. default teal.
    highlights: HighlightSection[];
    productGridTitle?: string;
}

interface Props {
    content: CategoryLandingContent;
    products: any[];
    isLoadingProducts?: boolean;
    onBack?: () => void;
    headerTitle?: string;
}

// ─── Hero ─────────────────────────────────────────────────
const Hero: React.FC<{ content: CategoryLandingContent }> = ({ content }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const slides = (content.heroImages && content.heroImages.length > 0)
        ? content.heroImages
        : [content.heroImage];
    const [activeIdx, setActiveIdx] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchDeltaX = useRef(0);

    // Auto-advance when there is more than one slide
    useEffect(() => {
        if (slides.length <= 1) return;
        const id = window.setInterval(() => {
            setActiveIdx((i) => (i + 1) % slides.length);
        }, 5000);
        return () => window.clearInterval(id);
    }, [slides.length]);

    const goTo = (idx: number) => {
        if (slides.length === 0) return;
        setActiveIdx(((idx % slides.length) + slides.length) % slides.length);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchDeltaX.current = 0;
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    };
    const onTouchEnd = () => {
        const threshold = 40;
        if (touchDeltaX.current > threshold) goTo(activeIdx - 1);
        else if (touchDeltaX.current < -threshold) goTo(activeIdx + 1);
        touchStartX.current = null;
        touchDeltaX.current = 0;
    };

    const scrollToProducts = () => {
        const el = document.getElementById('category-products');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <section
            className="relative w-full aspect-[4/3] overflow-hidden bg-slate-900 select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Slides */}
            <div
                className="absolute inset-0 flex h-full transition-transform duration-500 ease-out"
                style={{ width: `${slides.length * 100}%`, transform: `translateX(-${activeIdx * (100 / slides.length)}%)` }}
            >
                {slides.map((src, i) => (
                    <div key={i} className="relative h-full" style={{ width: `${100 / slides.length}%` }}>
                        <img
                            src={getOptimizedImageUrl(src, 'heroBanner')}
                            alt={`${content.heroTitle}｜モンゴルツアー写真 ${i + 1}`}
                            fetchPriority={i === 0 ? 'high' : 'low'}
                            loading={i === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                ))}
            </div>

            {/* Gradient overlays — stronger to ensure text legibility on bright photos */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

            {/* Text + CTA block — vertically centered, left-aligned.
                The whole site sits inside a 480px mobile wrapper on PC, so we use a
                single set of sizes (no breakpoint scaling) — that way the hero
                renders identically regardless of viewport. */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 max-w-[88%] break-keep">
                {content.heroTagline && (
                    <p className="text-white/85 text-[11px] font-semibold tracking-[0.18em] uppercase mb-2.5 drop-shadow break-keep">
                        {content.heroTagline}
                    </p>
                )}
                <h1 className="text-white text-[26px] font-extrabold tracking-tight leading-[1.15] drop-shadow-xl break-keep">
                    {content.heroTitle}
                </h1>
                {content.heroSubtitle && (
                    <p className="text-white/90 text-[12.5px] mt-2.5 leading-relaxed max-w-[260px] drop-shadow whitespace-pre-line break-keep">
                        {content.heroSubtitle}
                    </p>
                )}

                {/* CTA buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={scrollToProducts}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-[12.5px] font-bold shadow-lg shadow-primary/40 hover:bg-primary-dark active:scale-[0.97] transition-all"
                    >
                        {t('category_landing.view_products', { defaultValue: 'ツアー商品を見る' })}
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/custom-estimate')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/40 text-white text-[12.5px] font-bold hover:bg-white/20 active:scale-[0.97] transition-all"
                    >
                        {t('category_landing.inquiry', { defaultValue: 'お問い合わせ' })}
                    </button>
                </div>
            </div>

            {/* Pagination dots */}
            {slides.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-label={`slide ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

// ─── Highlight Card ───────────────────────────────────────
const HighlightCardView: React.FC<{ card: HighlightCard; onClick?: () => void }> = ({ card, onClick }) => (
    <button
        onClick={onClick}
        className="relative flex-shrink-0 w-[68vw] max-w-[260px] sm:max-w-[240px] md:max-w-[260px] lg:max-w-[280px] aspect-[3/4] rounded-2xl overflow-hidden shadow-md snap-center text-left active:scale-[0.98] transition-transform"
    >
        <img
            src={getOptimizedImageUrl(card.image, 'productDetail')}
            alt={`${card.title}｜モンゴル旅行ハイライト`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />

        {/* Tags (top) */}
        {card.tags && card.tags.length > 0 && (
            <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1">
                {card.tags.map((tag, i) => (
                    <span
                        key={i}
                        className="px-2 py-0.5 bg-white/25 backdrop-blur-md text-white text-[10px] font-semibold rounded-full ring-1 ring-white/30"
                    >
                        {tag}
                    </span>
                ))}
            </div>
        )}

        {/* Text (bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="text-[15px] font-bold leading-tight drop-shadow mb-1 line-clamp-2">{card.title}</h3>
            {card.description && (
                <p className="text-[12px] leading-relaxed text-white/90 whitespace-pre-line drop-shadow line-clamp-3">
                    {card.description}
                </p>
            )}
        </div>
    </button>
);

// ─── Highlight Section ────────────────────────────────────
const HighlightSectionView: React.FC<{ section: HighlightSection; accent?: string }> = ({ section, accent = '#0f766e' }) => {
    const navigate = useNavigate();
    return (
        <section className="py-6 sm:py-8">
            <div className="text-center mb-5 px-5">
                <span
                    className="inline-block px-3 py-1 rounded-full text-white text-[10.5px] font-bold tracking-wider mb-3"
                    style={{ background: accent }}
                >
                    {section.label}
                </span>
                <h2 className="text-[18px] sm:text-[20px] md:text-[22px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                    {section.title}
                </h2>
                {section.subtitle && (
                    <p className="text-[12.5px] sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {section.subtitle}
                    </p>
                )}
            </div>

            {/* Horizontal scroll cards */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-5 pb-2 scrollbar-hide">
                {section.cards.map((card, i) => (
                    <HighlightCardView
                        key={i}
                        card={card}
                        onClick={() => card.link && navigate(card.link)}
                    />
                ))}
            </div>
        </section>
    );
};

// ─── Main Template ────────────────────────────────────────
export const CategoryLanding: React.FC<Props> = ({
    content,
    products,
    isLoadingProducts,
    onBack,
    headerTitle,
}) => {
    const navigate = useNavigate();
    const accent = content.accentColor || '#0f766e';

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white min-h-screen pb-24">
            {/* Sticky header (transparent over hero, solid on scroll) */}
            <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center p-4 justify-between">
                    <button
                        onClick={onBack || (() => navigate(-1))}
                        className="text-[#0e1a18] dark:text-white flex size-10 shrink-0 items-center justify-center -ml-2"
                        aria-label="back"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <span className="text-base font-bold leading-tight tracking-tight flex-1 text-center pr-8">
                        {headerTitle || content.heroTitle}
                    </span>
                </div>
            </header>

            <main>
                <Hero content={content} />

                {/* Highlight sections */}
                {content.highlights.map((section, i) => (
                    <HighlightSectionView key={i} section={section} accent={accent} />
                ))}

                {/* Products grid */}
                <section id="category-products" className="px-5 pt-2 pb-8 scroll-mt-20">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                        <span className="material-symbols-outlined text-base" style={{ color: accent }}>explore</span>
                        {content.productGridTitle || 'ツアー商品'}
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {isLoadingProducts ? (
                            Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
                        ) : products.length > 0 ? (
                            products.map((product) => <ProductCard key={product.id} product={product} />)
                        ) : (
                            <div className="col-span-2 py-8 text-center text-gray-500 text-sm">
                                現在、関連するツアー商品がありません。
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};