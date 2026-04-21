import React from 'react';
import { useNavigate } from 'react-router-dom';
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
    heroImage: string;
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
const Hero: React.FC<{ content: CategoryLandingContent }> = ({ content }) => (
    <section className="relative w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-slate-900">
        <img
            src={getOptimizedImageUrl(content.heroImage, 'heroBanner')}
            alt={content.heroTitle}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            {content.heroTagline && (
                <p className="text-white/90 text-sm font-semibold mb-3 drop-shadow-lg">
                    {content.heroTagline}
                </p>
            )}
            <h1 className="text-white text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight drop-shadow-xl">
                {content.heroTitle}
            </h1>
            {content.heroSubtitle && (
                <p className="text-white/90 text-sm mt-3 leading-relaxed max-w-sm drop-shadow-lg">
                    {content.heroSubtitle}
                </p>
            )}
        </div>
    </section>
);

// ─── Highlight Card ───────────────────────────────────────
const HighlightCardView: React.FC<{ card: HighlightCard; onClick?: () => void }> = ({ card, onClick }) => (
    <button
        onClick={onClick}
        className="relative flex-shrink-0 w-[78vw] max-w-[360px] aspect-[4/5] rounded-3xl overflow-hidden shadow-lg snap-center text-left active:scale-[0.98] transition-transform"
    >
        <img
            src={getOptimizedImageUrl(card.image, 'productDetail')}
            alt={card.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />

        {/* Tags (top) */}
        {card.tags && card.tags.length > 0 && (
            <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-1.5">
                {card.tags.map((tag, i) => (
                    <span
                        key={i}
                        className="px-2.5 py-1 bg-white/25 backdrop-blur-md text-white text-[11px] font-semibold rounded-full ring-1 ring-white/30"
                    >
                        {tag}
                    </span>
                ))}
            </div>
        )}

        {/* Text (bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <h3 className="text-lg font-bold leading-tight drop-shadow mb-1.5">{card.title}</h3>
            {card.description && (
                <p className="text-[13px] leading-relaxed text-white/90 whitespace-pre-line drop-shadow">
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
        <section className="py-8">
            <div className="text-center mb-6 px-5">
                <span
                    className="inline-block px-3.5 py-1.5 rounded-full text-white text-[11px] font-bold tracking-wider mb-4"
                    style={{ background: accent }}
                >
                    {section.label}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                    {section.title}
                </h2>
                {section.subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
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
                <section className="px-5 pt-2 pb-8">
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