import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getOptimizedImageUrl } from '../../utils/cloudflareImage';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { PageHero } from '../desktop-primitives/PageHero';
import { PCard } from '../desktop-primitives/PCard';
import type { CategoryLandingContent, HighlightCard, HighlightSection } from '../category/CategoryLanding';

interface ApiProduct {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    category?: string;
    mainImages?: string[];
    tags?: string[];
    status?: string;
}

interface Props {
    content: CategoryLandingContent;
    products: ApiProduct[];
    isLoadingProducts?: boolean;
    contentWidth?: number;
}

/**
 * Desktop (≥1024px) category landing page.
 *
 * Mirrors the mobile CategoryLanding content model (hero slider + highlight
 * sections + product grid) but uses the desktop design language: wide hero
 * with 16:7 aspect, multi-column highlight cards (no horizontal scroll), and
 * the shared PCard for products.
 */
export function CategoryLandingDesktop({
    content,
    products,
    isLoadingProducts,
    contentWidth = 1280,
}: Props) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const accent = content.accentColor || '#0f766e';

    return (
        <div style={{ background: '#fff' }}>
            <PageHero
                eyebrow={content.heroTagline}
                title={content.heroTitle}
                subtitle={content.heroSubtitle}
                breadcrumbs={[
                    { label: 'ホーム', path: '/' },
                    { label: 'ツアー商品', path: '/products' },
                    { label: content.heroTitle },
                ]}
                contentWidth={contentWidth}
            />

            {/* Wide hero slider */}
            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '32px 32px 0' }}>
                <HeroSlider content={content} />
                {/* Quick CTAs */}
                <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-start' }}>
                    <button
                        type="button"
                        onClick={() => {
                            const el = document.getElementById('category-products');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        style={{
                            padding: '14px 26px',
                            background: accent,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 999,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: `0 8px 20px -6px ${accent}66`,
                        }}
                    >
                        {t('category_landing.view_products', { defaultValue: 'ツアー商品を見る' })}
                        <MatIcon name="arrow_forward" size={18} color="#fff" />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/custom-estimate')}
                        style={{
                            padding: '14px 26px',
                            background: '#fff',
                            color: 'var(--fg-1)',
                            border: '1px solid var(--border)',
                            borderRadius: 999,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {t('category_landing.inquiry', { defaultValue: 'お問い合わせ' })}
                    </button>
                </div>
            </section>

            {/* Highlight sections */}
            {content.highlights && content.highlights.length > 0 && (
                <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '64px 32px 0' }}>
                    {content.highlights.map((section, i) => (
                        <HighlightSectionDesktop key={i} section={section} accent={accent} contentWidth={contentWidth} />
                    ))}
                </section>
            )}

            {/* Products grid */}
            <section
                id="category-products"
                style={{ maxWidth: contentWidth, margin: '0 auto', padding: '72px 32px 0', scrollMarginTop: 200 }}
            >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                color: accent,
                                textTransform: 'uppercase',
                                marginBottom: 8,
                            }}
                        >
                            Tour Lineup
                        </div>
                        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>
                            {content.productGridTitle || `${content.heroTitle}のツアー`}
                        </h2>
                        <div style={{ fontSize: 13, color: 'var(--fg-5)', marginTop: 6 }}>
                            <span style={{ color: 'var(--fg-2)', fontWeight: 700 }}>{products.length} 件</span> のツアー
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/products')}
                        style={{
                            padding: '10px 18px',
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--fg-2)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        全てのツアー <MatIcon name="arrow_forward" size={16} />
                    </button>
                </div>

                {isLoadingProducts ? (
                    <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-5)' }}>読み込み中...</div>
                ) : products.length === 0 ? (
                    <EmptyProductsState />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
                        {products.map((p) => (
                            <PCard
                                key={p.id}
                                p={{
                                    id: p.id,
                                    name: p.name,
                                    category: p.category,
                                    duration: p.duration,
                                    price: p.price,
                                    originalPrice: p.originalPrice,
                                    mainImages: p.mainImages,
                                    tags: p.tags,
                                }}
                                layout="block"
                                onClick={() => navigate(`/products/${p.id}`)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Custom tour CTA */}
            <section style={{ maxWidth: contentWidth, margin: '72px auto 0', padding: '0 32px' }}>
                <div
                    style={{
                        padding: '44px 56px',
                        background: `linear-gradient(120deg, ${accent} 0%, #115e59 60%, #134e4a 100%)`,
                        borderRadius: 28,
                        color: '#fff',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 32,
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: `0 20px 48px -16px ${accent}66`,
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            right: -40,
                            top: -60,
                            width: 240,
                            height: 240,
                            borderRadius: 999,
                            background: 'radial-gradient(circle, rgba(94,234,212,0.18) 0%, transparent 70%)',
                        }}
                    />
                    <div style={{ position: 'relative' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#5eead4', textTransform: 'uppercase', marginBottom: 10 }}>
                            Custom Tour
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
                            {content.heroTitle}を、あなただけのプランで
                        </div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 10, lineHeight: 1.6 }}>
                            人数・期間・予算をお伝えください。日本語スタッフが24時間以内にお見積もりします。
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/custom-estimate')}
                        style={{
                            padding: '16px 28px',
                            background: '#fff',
                            color: 'var(--primary-dark)',
                            border: 'none',
                            borderRadius: 999,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            position: 'relative',
                        }}
                    >
                        1分でリクエスト <MatIcon name="arrow_forward" size={18} color="var(--primary-dark)" />
                    </button>
                </div>
            </section>

            <div style={{ height: 96 }} />
        </div>
    );
}

// ─── Hero Slider (wide 16:7) ────────────────────────────────
function HeroSlider({ content }: { content: CategoryLandingContent }) {
    const slides = (content.heroImages && content.heroImages.length > 0)
        ? content.heroImages
        : [content.heroImage];
    const [activeIdx, setActiveIdx] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (slides.length <= 1) return;
        intervalRef.current = setInterval(() => setActiveIdx((i) => (i + 1) % slides.length), 5500);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [slides.length]);

    const goTo = (idx: number) => setActiveIdx(((idx % slides.length) + slides.length) % slides.length);

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/7',
                borderRadius: 28,
                overflow: 'hidden',
                background: '#0b0b0b',
                boxShadow: '0 30px 60px -20px rgba(0,0,0,0.2)',
            }}
        >
            {slides.map((src, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${getOptimizedImageUrl(src, 'heroBanner')})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: i === activeIdx ? 1 : 0,
                        transition: 'opacity 1200ms var(--ease-out)',
                    }}
                />
            ))}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 50%, transparent 80%)',
                }}
            />

            {/* Pagination dots */}
            {slides.length > 1 && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 24,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-label={`slide ${i + 1}`}
                            style={{
                                width: i === activeIdx ? 32 : 8,
                                height: 4,
                                borderRadius: 99,
                                background: i === activeIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                transition: 'all 300ms',
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Side nav */}
            {slides.length > 1 && (
                <>
                    <button type="button" aria-label="prev" onClick={() => goTo(activeIdx - 1)} style={heroNavBtn('left')}>
                        <MatIcon name="chevron_left" size={26} color="#fff" />
                    </button>
                    <button type="button" aria-label="next" onClick={() => goTo(activeIdx + 1)} style={heroNavBtn('right')}>
                        <MatIcon name="chevron_right" size={26} color="#fff" />
                    </button>
                </>
            )}
        </div>
    );
}

function heroNavBtn(side: 'left' | 'right'): CSSProperties {
    return {
        position: 'absolute',
        top: '50%',
        [side]: 24,
        transform: 'translateY(-50%)',
        width: 48,
        height: 48,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.3)',
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    };
}

// ─── Highlight Section ──────────────────────────────────────
function HighlightSectionDesktop({
    section,
    accent,
}: {
    section: HighlightSection;
    accent: string;
    contentWidth: number;
}) {
    const navigate = useNavigate();
    // 3 or 4 column grid depending on card count
    const cols = section.cards.length >= 4 ? 4 : Math.max(section.cards.length, 2);
    return (
        <div style={{ marginBottom: 56 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <span
                    style={{
                        display: 'inline-block',
                        padding: '5px 14px',
                        borderRadius: 999,
                        background: accent,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        marginBottom: 14,
                    }}
                >
                    {section.label}
                </span>
                <h2
                    style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        margin: 0,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                    }}
                >
                    {section.title}
                </h2>
                {section.subtitle && (
                    <p style={{ fontSize: 14, color: 'var(--fg-4)', marginTop: 10, lineHeight: 1.7 }}>
                        {section.subtitle}
                    </p>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 18 }}>
                {section.cards.map((card, i) => (
                    <HighlightCardDesktop key={i} card={card} onClick={() => card.link && navigate(card.link)} />
                ))}
            </div>
        </div>
    );
}

function HighlightCardDesktop({ card, onClick }: { card: HighlightCard; onClick?: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                position: 'relative',
                aspectRatio: '3/4',
                borderRadius: 24,
                overflow: 'hidden',
                background: '#000',
                border: 'none',
                padding: 0,
                cursor: card.link ? 'pointer' : 'default',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
                boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={(e) => {
                if (card.link) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 18px 38px -8px rgba(0,0,0,0.22)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(0,0,0,0.15)';
            }}
        >
            <img
                src={getOptimizedImageUrl(card.image, 'productDetail')}
                alt={`${card.title}｜モンゴル旅行ハイライト`}
                loading="lazy"
                decoding="async"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                }}
            />
            {card.tags && card.tags.length > 0 && (
                <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {card.tags.map((tag, i) => (
                        <span
                            key={i}
                            style={{
                                padding: '3px 10px',
                                background: 'rgba(255,255,255,0.22)',
                                backdropFilter: 'blur(8px)',
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 600,
                                borderRadius: 999,
                                border: '1px solid rgba(255,255,255,0.3)',
                            }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
            <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, color: '#fff' }}>
                <h3
                    style={{
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: 1.3,
                        margin: 0,
                        letterSpacing: '-0.01em',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {card.title}
                </h3>
                {card.description && (
                    <p
                        style={{
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.85)',
                            lineHeight: 1.6,
                            marginTop: 8,
                            whiteSpace: 'pre-line',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {card.description}
                    </p>
                )}
            </div>
        </button>
    );
}

function EmptyProductsState() {
    return (
        <div
            style={{
                padding: '80px 40px',
                textAlign: 'center',
                background: 'var(--bg-muted)',
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
            }}
        >
            <div
                style={{
                    width: 64,
                    height: 64,
                    borderRadius: 999,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-toss)',
                }}
            >
                <MatIcon name="explore_off" size={32} color="var(--fg-5)" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)' }}>関連するツアーがまだありません</div>
            <div style={{ fontSize: 13, color: 'var(--fg-4)' }}>
                オーダーメイドプランをご相談ください。
            </div>
        </div>
    );
}
