import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TourProduct, DayInfoContent, TimelineContent, DetailSlide, DividerContent, ProductFAQ, TourPricingOption } from '../../types/product';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { TagChip, type TagTone } from '../desktop-primitives/TagChip';
import { PCard, type PCardData } from '../desktop-primitives/PCard';
import { DestinationsMap } from '../desktop-primitives/DestinationsMap';
import { extractPlacesFromItinerary } from '../../constants/mongoliaPlaces';
import { useGuideIntro } from '../../hooks/useGuideIntro';

interface ReviewLike {
    id?: string | number;
    user_name?: string;
    author?: string;
    visit_date?: string;
    visitDate?: string;
    rating?: number;
    content?: string;
    tag?: string;
}

interface ProductDetailDesktopProps {
    product: TourProduct;
    reviews?: ReviewLike[];
    onBook?: () => void;
    onConsult?: () => void;
    contentWidth?: number;
}

type SectionId = 'overview' | 'highlights' | 'details' | 'itinerary' | 'options' | 'guide' | 'location' | 'included' | 'reviews' | 'faq';

const ALL_SECTIONS: { id: SectionId; label: string }[] = [
    { id: 'overview', label: '概要' },
    { id: 'highlights', label: 'ハイライト' },
    { id: 'details', label: '詳細情報' },
    { id: 'itinerary', label: '詳細日程' },
    { id: 'options', label: 'プラン・オプション' },
    { id: 'guide', label: 'ガイド紹介' },
    { id: 'location', label: '目的地' },
    { id: 'included', label: '含まれるもの' },
    { id: 'reviews', label: 'レビュー' },
    { id: 'faq', label: 'ご注意・FAQ' },
];

function tagTone(tag?: string): TagTone {
    if (!tag) return 'premium';
    const lower = tag.toLowerCase();
    if (lower.includes('hot') || lower.includes('人気')) return 'hot';
    if (lower.includes('new') || lower.includes('新')) return 'new';
    return 'premium';
}

// A day card (dayInfo / timeline) is "meaningful" only if the admin actually
// typed something into it. Cards left at their default empty template are
// treated as stale data and skipped, both for section-visibility checks and
// when rendering Timeline. image / slide / divider blocks always count.
function isMeaningfulItineraryBlock(b: { type: string; content: unknown }): boolean {
    if (b.type === 'image' || b.type === 'slide' || b.type === 'divider') return true;
    if (b.type === 'dayInfo') {
        const c = (b.content ?? {}) as Partial<DayInfoContent>;
        return Boolean(
            (c.title && c.title.trim()) ||
            (c.description && c.description.trim()) ||
            (c.accommodation && c.accommodation.trim()) ||
            c.meals?.breakfast || c.meals?.lunch || c.meals?.dinner
        );
    }
    if (b.type === 'timeline') {
        const c = (b.content ?? {}) as Partial<TimelineContent>;
        return Boolean((c.title && c.title.trim()) || (c.description && c.description.trim()));
    }
    return false;
}

export function ProductDetailDesktop({
    product,
    reviews = [],
    onBook,
    onConsult,
    contentWidth = 1280,
}: ProductDetailDesktopProps) {
    const navigate = useNavigate();
    const sortedPricingOptions = useMemo<TourPricingOption[]>(
        () => (product.pricingOptions ?? []).slice().sort((a, b) => a.people - b.people),
        [product.pricingOptions]
    );
    const initialPeople = sortedPricingOptions[0]?.people ?? 2;
    const [people, setPeople] = useState(initialPeople);
    // Re-sync when switching to a different product (e.g. on related-tour click).
    useEffect(() => {
        setPeople(sortedPricingOptions[0]?.people ?? 2);
    }, [product.id, sortedPricingOptions]);
    const [fav, setFav] = useState(false);
    const [activeSec, setActiveSec] = useState<SectionId>('overview');
    const [showStickyBar, setShowStickyBar] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const bookingRef = useRef<HTMLElement | null>(null);

    // Reset scroll on product change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, [product?.id]);

    // Only show tabs/sections that have meaningful content for THIS product.
    // Sections without admin data are silently hidden so we never leak "lorem-ipsum".
    const hasDetailContent =
        (product.detailBlocks && product.detailBlocks.length > 0) ||
        (product.detailSlides && product.detailSlides.length > 0) ||
        (product.detailImages && product.detailImages.length > 0);
    const hasItineraryContent =
        (product.itineraryBlocks && product.itineraryBlocks.some(isMeaningfulItineraryBlock)) ||
        (product.itineraryImages && product.itineraryImages.length > 0);
    const hasOptionsContent =
        (product.pricingOptions && product.pricingOptions.length > 0) ||
        (product.accommodationOptions && product.accommodationOptions.length > 0) ||
        (product.vehicleOptions && product.vehicleOptions.length > 0);

    const visibleSections = useMemo(
        () => ALL_SECTIONS.filter((s) => {
            if (s.id === 'details') return hasDetailContent;
            if (s.id === 'itinerary') return hasItineraryContent;
            if (s.id === 'options') return hasOptionsContent;
            return true;
        }),
        [hasDetailContent, hasItineraryContent, hasOptionsContent]
    );

    // Scroll observers (sticky bar + active section)
    useEffect(() => {
        const onScroll = () => {
            const rect = bookingRef.current?.getBoundingClientRect();
            if (rect) setShowStickyBar(rect.bottom < 0);
            let cur: SectionId = 'overview';
            for (const s of visibleSections) {
                const el = document.getElementById('sec-' + s.id);
                if (!el) continue;
                if (el.getBoundingClientRect().top - 220 < 0) cur = s.id;
            }
            setActiveSec(cur);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, [visibleSections]);

    // Gallery — combine mainImages + galleryImages (unique, no duplicates).
    // When admin uploaded < 5 photos, we render only what they actually have so
    // we don't repeat the same image 5 times in the Airbnb-style grid.
    const gallery: string[] = useMemo(() => {
        const all = [...(product.mainImages ?? []), ...(product.galleryImages ?? [])]
            .filter((x): x is string => typeof x === 'string' && x.length > 0);
        return Array.from(new Set(all)).slice(0, 5);
    }, [product.mainImages, product.galleryImages]);

    // Match the people count to the closest pricing tier (mirrors mobile
    // Reservation page logic). Falls back to flat product.price when admin
    // hasn't configured any pricing tiers.
    const baseOption = useMemo<TourPricingOption | null>(() => {
        if (sortedPricingOptions.length === 0) return null;
        const exact = sortedPricingOptions.find((p) => p.people === people);
        if (exact) return exact;
        if (people < sortedPricingOptions[0].people) return sortedPricingOptions[0];
        if (people > sortedPricingOptions[sortedPricingOptions.length - 1].people) {
            return sortedPricingOptions[sortedPricingOptions.length - 1];
        }
        return sortedPricingOptions.filter((p) => p.people <= people).pop() ?? sortedPricingOptions[0];
    }, [sortedPricingOptions, people]);
    const pricePerPerson = baseOption?.pricePerPerson ?? product.price ?? 0;
    const total = pricePerPerson * people;
    const firstTag = product.tags?.[0];
    const hasOriginal = !!product.originalPrice && product.originalPrice > product.price;
    // Average rating, derived from the actual reviews array. Mobile + this
    // page now agree: no reviews = "—" instead of a hardcoded 4.9.
    const ratingValue = reviews.length > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length) * 10
        ) / 10
        : 0;
    const reviewCount = reviews.length;

    const scrollToSection = (id: SectionId) => {
        const el = document.getElementById('sec-' + id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 200;
        window.scrollTo({ top, behavior: 'smooth' });
    };

    const defaultConsult = () => {
        if (typeof window.openChannelTalk === 'function') window.openChannelTalk();
        else navigate('/custom-estimate');
    };
    const defaultBook = () => navigate(`/reservation/${product.id}`);
    const handleConsult = onConsult ?? defaultConsult;
    const handleBook = onBook ?? defaultBook;

    return (
        <div style={{ background: '#fff' }}>
            {/* Breadcrumb */}
            <div style={{ background: 'var(--bg-muted)', padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div
                    style={{
                        maxWidth: contentWidth,
                        margin: '0 auto',
                        padding: '0 32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--fg-5)',
                    }}
                >
                    <button type="button" onClick={() => navigate('/')} style={crumbBtn}>
                        ホーム
                    </button>
                    <MatIcon name="chevron_right" size={14} color="var(--fg-6)" />
                    <button type="button" onClick={() => navigate('/products')} style={crumbBtn}>
                        ツアー商品
                    </button>
                    <MatIcon name="chevron_right" size={14} color="var(--fg-6)" />
                    <span
                        style={{
                            color: 'var(--fg-2)',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 480,
                        }}
                    >
                        {product.name}
                    </span>
                </div>
            </div>

            <div style={{ maxWidth: contentWidth, margin: '0 auto', padding: '32px 32px 0' }}>
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 18 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                            {firstTag && <TagChip tone={tagTone(firstTag)}>{firstTag}</TagChip>}
                            <span style={{ fontSize: 12, color: 'var(--fg-5)' }}>{product.category}</span>
                            {product.duration && (
                                <>
                                    <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
                                    <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{product.duration}</span>
                                </>
                            )}
                            {reviewCount > 0 && (
                                <>
                                    <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-3)' }}>
                                        <MatIcon name="star" size={14} filled color="#facc15" />
                                        <span style={{ fontWeight: 700 }}>{ratingValue.toFixed(1)}</span>
                                        <span style={{ color: 'var(--fg-5)' }}>({reviewCount} 件のレビュー)</span>
                                    </span>
                                </>
                            )}
                            {(product.bookingCount ?? 0) > 0 && (
                                <>
                                    <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
                                    <span style={{ fontSize: 12, color: 'var(--fg-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <MatIcon name="local_fire_department" size={14} filled color="#f97316" />
                                        <span style={{ fontWeight: 700 }}>累計 {product.bookingCount} 名</span>
                                        <span style={{ color: 'var(--fg-5)' }}>が予約</span>
                                    </span>
                                </>
                            )}
                        </div>
                        <h1
                            style={{
                                fontSize: 34,
                                fontWeight: 700,
                                margin: 0,
                                color: 'var(--fg-1)',
                                lineHeight: 1.3,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {product.name}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={() => setFav(!fav)} style={iconActionBtn}>
                            <MatIcon name="favorite" size={20} filled={fav} color={fav ? '#ef4444' : 'var(--fg-3)'} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>保存</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof navigator !== 'undefined' && 'share' in navigator) {
                                    void (navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> })
                                        .share?.({ title: product.name, url: window.location.href })
                                        .catch(() => {});
                                } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                    void navigator.clipboard.writeText(window.location.href);
                                }
                            }}
                            style={iconActionBtn}
                        >
                            <MatIcon name="share" size={20} color="var(--fg-3)" />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>共有</span>
                        </button>
                    </div>
                </div>

                {/* Gallery — adaptive layout based on how many photos admin uploaded */}
                <GallerySection gallery={gallery} onOpen={() => setGalleryOpen(true)} />

                {/* Highlights strip */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 12,
                        marginBottom: 36,
                        padding: '20px 24px',
                        background: 'var(--bg-muted)',
                        borderRadius: 20,
                        border: '1px solid var(--border-subtle)',
                    }}
                >
                    {[
                        { i: 'calendar_month', k: '期間', v: product.duration || '日程相談' },
                        { i: 'translate', k: '言語', v: '日本語専属' },
                        { i: 'group', k: '最少催行', v: '2 名様〜' },
                        { i: 'verified', k: '含むもの', v: '食事 + 宿泊' },
                    ].map((s) => (
                        <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <MatIcon name={s.i} size={20} color="#0f766e" />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--fg-5)' }}>{s.k}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', marginTop: 2 }}>{s.v}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* In-page sticky tab nav */}
                <div
                    style={{
                        position: 'sticky',
                        top: 158,
                        zIndex: 30,
                        background: '#fff',
                        margin: '0 -32px 0',
                        padding: '0 32px',
                        borderTop: '1px solid var(--border-subtle)',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <div className="scrollbar-hide" style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
                        {visibleSections.map((s) => {
                            const on = activeSec === s.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => scrollToSection(s.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '16px 18px',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: on ? 700 : 500,
                                        color: on ? 'var(--fg-1)' : 'var(--fg-4)',
                                        borderBottom: on ? '2px solid #0f766e' : '2px solid transparent',
                                        marginBottom: -1,
                                        fontFamily: 'inherit',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Two-column body */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 56, alignItems: 'flex-start', paddingTop: 40 }}>
                    <div>
                        <Section id="overview" title="概要" eyebrow="About this tour">
                            {product.description ? (
                                <div
                                    style={{ fontSize: 16, lineHeight: 1.9, color: 'var(--fg-2)', fontWeight: 400 }}
                                    dangerouslySetInnerHTML={{ __html: product.description }}
                                />
                            ) : (
                                <p style={{ fontSize: 16, lineHeight: 1.9, color: 'var(--fg-2)', marginTop: 0 }}>
                                    モンゴルの大自然を堪能する{product.duration ? product.duration + 'の' : ''}ツアー。
                                    日本人スタッフ・日本語ガイドが同行し、現地旅行社ならではの細やかなご案内で安心してお楽しみいただけます。
                                </p>
                            )}
                            {product.tags && product.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                                    {product.tags.slice(0, 8).map((c) => (
                                        <span
                                            key={c}
                                            style={{
                                                padding: '8px 14px',
                                                background: '#fff',
                                                border: '1px solid var(--border)',
                                                borderRadius: 999,
                                                fontSize: 13,
                                                color: 'var(--fg-2)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Section>

                        <Section id="highlights" title="ハイライト" eyebrow="Highlights">
                            <HighlightsBlock product={product} />
                        </Section>

                        {hasDetailContent && (
                            <Section id="details" title="詳細情報" eyebrow="Tour Details">
                                <DetailBlocksRenderer product={product} />
                            </Section>
                        )}

                        {hasItineraryContent && (
                            <Section id="itinerary" title="詳細日程" eyebrow="Day-by-Day Itinerary">
                                <Timeline product={product} />
                            </Section>
                        )}

                        {hasOptionsContent && (
                            <Section id="options" title="プラン・オプション" eyebrow="Pricing & Options">
                                <OptionsBlock product={product} />
                            </Section>
                        )}

                        <Section id="guide" title="ガイド紹介" eyebrow="Meet Your Guide">
                            <GuideCard />
                        </Section>

                        <Section id="location" title="目的地" eyebrow="Destinations on This Tour">
                            <LocationBlock product={product} />
                        </Section>

                        <Section id="included" title="含まれるもの・含まれないもの" eyebrow="What's Included">
                            <IncludedBlock product={product} />
                        </Section>

                        <Section id="reviews" title="レビュー" eyebrow="Real Reviews">
                            <ReviewsBlockV2 reviews={reviews} rating={ratingValue} count={reviewCount} />
                        </Section>

                        <Section id="faq" title="ご注意・よくある質問" eyebrow="FAQ & Notice">
                            <FAQBlock product={product} />
                        </Section>
                    </div>

                    {/* Sticky booking card */}
                    <aside ref={bookingRef} style={{ position: 'sticky', top: 220 }}>
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: 20,
                                padding: 24,
                                boxShadow: '0 12px 32px -8px rgba(0,0,0,0.1)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: 'var(--fg-5)' }}>お一人様</span>
                                {hasOriginal && (
                                    <span style={{ fontSize: 12, color: 'var(--fg-5)', textDecoration: 'line-through' }}>
                                        ¥{product.originalPrice!.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 18 }}>
                                <span style={{ fontSize: 32, fontWeight: 700, color: '#0f766e', letterSpacing: '-0.02em' }}>
                                    ¥{pricePerPerson.toLocaleString()}
                                </span>
                                <span style={{ fontSize: 16, color: '#0f766e', fontWeight: 700 }}>〜</span>
                            </div>

                            {sortedPricingOptions.length > 0 ? (
                                <PricingTierSelector
                                    options={sortedPricingOptions}
                                    selectedPeople={people}
                                    onSelect={setPeople}
                                />
                            ) : null}

                            <div style={{ marginTop: 14 }}>
                                <label style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 8, display: 'block', fontWeight: 600 }}>
                                    人数
                                </label>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 8px 8px 16px',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10,
                                    }}
                                >
                                    <span style={{ fontSize: 14, color: 'var(--fg-1)' }}>大人 {people} 名</span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button
                                            type="button"
                                            onClick={() => setPeople(Math.max(sortedPricingOptions[0]?.people ?? 1, people - 1))}
                                            disabled={people <= (sortedPricingOptions[0]?.people ?? 1)}
                                            style={stepBtn}
                                            aria-label="decrease"
                                        >
                                            <MatIcon name="remove" size={16} color="var(--fg-2)" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const max = sortedPricingOptions[sortedPricingOptions.length - 1]?.people;
                                                setPeople(max ? Math.min(max, people + 1) : people + 1);
                                            }}
                                            disabled={
                                                sortedPricingOptions.length > 0 &&
                                                people >= sortedPricingOptions[sortedPricingOptions.length - 1].people
                                            }
                                            style={stepBtn}
                                            aria-label="increase"
                                        >
                                            <MatIcon name="add" size={16} color="var(--fg-2)" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 18, padding: '14px 0', borderTop: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--fg-4)' }}>
                                    <span>¥{pricePerPerson.toLocaleString()} × {people}名</span>
                                    <span>¥{total.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--fg-4)' }}>
                                    <span>サービス料</span>
                                    <span style={{ color: '#16a34a' }}>無料</span>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                        paddingTop: 12,
                                        borderTop: '1px solid var(--border-subtle)',
                                    }}
                                >
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>合計</span>
                                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>
                                        ¥{total.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleBook}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    marginTop: 14,
                                    background: '#0f766e',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    boxShadow: '0 8px 20px -6px rgba(15,118,110,0.5)',
                                }}
                            >
                                予約に進む
                            </button>
                            <button
                                type="button"
                                onClick={handleConsult}
                                style={{
                                    width: '100%',
                                    padding: '13px',
                                    marginTop: 10,
                                    background: '#fff',
                                    color: 'var(--fg-1)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 12,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
                                <MatIcon name="chat_bubble" size={16} color="var(--fg-2)" />
                                まずは無料相談
                            </button>

                            <div
                                style={{
                                    marginTop: 16,
                                    padding: '12px 14px',
                                    background: 'var(--primary-tint)',
                                    borderRadius: 12,
                                    fontSize: 12,
                                    color: 'var(--primary-dark)',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    lineHeight: 1.55,
                                }}
                            >
                                <MatIcon name="verified" size={16} filled color="var(--primary-dark)" />
                                <span>
                                    <strong>無料キャンセル</strong> — 出発30日前まで全額返金。日本語スタッフが24時間サポート。
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: 14, padding: 20, background: 'var(--bg-muted)', borderRadius: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 12 }}>お問い合わせ</div>
                            <div style={{ display: 'grid', gap: 10 }}>
                                {[
                                    { i: 'phone', t: '+976 9594 5838', sub: '平日 9:00-18:00 (JST)', href: 'tel:+97695945838' },
                                    { i: 'mail', t: 'info@mongolryokou.com', href: 'mailto:info@mongolryokou.com' },
                                    { i: 'chat', t: 'LINEで相談', sub: '24時間対応', onClick: handleConsult },
                                ].map((c) => {
                                    const inner = (
                                        <>
                                            <div
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 8,
                                                    background: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <MatIcon name={c.i} size={16} color="#0f766e" />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: 'var(--fg-1)' }}>{c.t}</div>
                                                {c.sub && <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 1 }}>{c.sub}</div>}
                                            </div>
                                        </>
                                    );
                                    return c.href ? (
                                        <a key={c.t} href={c.href} style={contactRow}>
                                            {inner}
                                        </a>
                                    ) : (
                                        <button key={c.t} type="button" onClick={c.onClick} style={{ ...contactRow, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                                            {inner}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>
                </div>

                <section style={{ marginTop: 72 }}>
                    <RelatedTours productId={product.id} category={product.category} />
                </section>
            </div>

            {/* Bottom sticky bar */}
            {showStickyBar && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: 'rgba(255,255,255,0.98)',
                        backdropFilter: 'blur(12px)',
                        borderTop: '1px solid var(--border-subtle)',
                        boxShadow: '0 -10px 30px rgba(0,0,0,0.06)',
                    }}
                >
                    <div
                        style={{
                            maxWidth: contentWidth,
                            margin: '0 auto',
                            padding: '14px 32px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 24,
                        }}
                    >
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 12,
                                backgroundImage: `url(${gallery[0]})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {product.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 2 }}>
                                大人 {people} 名 ・ お一人様 ¥{pricePerPerson.toLocaleString()}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--fg-5)' }}>合計</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f766e', letterSpacing: '-0.01em' }}>
                                ¥{total.toLocaleString()}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleConsult}
                            style={{
                                padding: '12px 24px',
                                background: '#fff',
                                color: 'var(--fg-1)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <MatIcon name="chat_bubble" size={16} color="var(--fg-2)" />
                            相談
                        </button>
                        <button
                            type="button"
                            onClick={handleBook}
                            style={{
                                padding: '14px 32px',
                                background: '#0f766e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                boxShadow: '0 8px 20px -6px rgba(15,118,110,0.5)',
                            }}
                        >
                            予約に進む
                        </button>
                    </div>
                </div>
            )}

            {galleryOpen && <GalleryLightbox images={gallery} onClose={() => setGalleryOpen(false)} />}
        </div>
    );
}

// ============ Sub-components ============

function Section({ id, title, eyebrow, children }: { id: string; title: string; eyebrow?: string; children: ReactNode }) {
    return (
        <section
            id={'sec-' + id}
            style={{
                padding: '16px 0 48px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: 12,
                scrollMarginTop: 220,
            }}
        >
            {eyebrow && (
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: '#0f766e',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                    }}
                >
                    {eyebrow}
                </div>
            )}
            <h2
                style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--fg-1)',
                    margin: '0 0 22px',
                    letterSpacing: '-0.01em',
                }}
            >
                {title}
            </h2>
            {children}
        </section>
    );
}

function GallerySection({ gallery, onOpen }: { gallery: string[]; onOpen: () => void }) {
    // Soft brand-color gradient — used when admin hasn't uploaded any photos yet so
    // we never render a broken-image black box.
    const fallbackGradient = 'linear-gradient(135deg, #134e4a 0%, #115e59 50%, #0f766e 100%)';
    const tile = (img: string | undefined, extra: CSSProperties = {}): CSSProperties => ({
        backgroundImage: img ? `url(${img})` : fallbackGradient,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        transition: 'filter 200ms',
        ...extra,
    });

    const n = gallery.length;

    // 0 photos — gradient placeholder banner (rare; only when product has no images at all).
    if (n === 0) {
        return (
            <div
                style={{
                    aspectRatio: '16/7',
                    borderRadius: 24,
                    background: fallbackGradient,
                    marginBottom: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: 0.85,
                }}
            >
                写真は準備中です
            </div>
        );
    }

    // 1 photo — single full-width hero.
    if (n === 1) {
        return (
            <button
                type="button"
                aria-label="open gallery"
                onClick={onOpen}
                style={tile(gallery[0], { width: '100%', aspectRatio: '16/7', borderRadius: 24, marginBottom: 28 })}
            />
        );
    }

    // 2 photos — equal split.
    if (n === 2) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderRadius: 24, overflow: 'hidden', marginBottom: 28 }}>
                <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[0], { aspectRatio: '4/3' })} />
                <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[1], { aspectRatio: '4/3' })} />
            </div>
        );
    }

    // 3 photos — big + 2 stacked.
    if (n === 3) {
        return (
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr',
                    gridTemplateRows: '200px 200px',
                    gap: 8,
                    borderRadius: 24,
                    overflow: 'hidden',
                    marginBottom: 28,
                }}
            >
                <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[0], { gridRow: 'span 2' })} />
                <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[1])} />
                <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[2])} />
            </div>
        );
    }

    // 4-5 photos — Airbnb-style big + 4 tiles. Last tile gets "全ての写真" overlay
    // only when there are MORE photos than visible (5+ means there might be more
    // hidden in the lightbox; here we just label the count we have).
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1fr 1fr',
                gridTemplateRows: '200px 200px',
                gap: 8,
                borderRadius: 24,
                overflow: 'hidden',
                marginBottom: 28,
            }}
        >
            <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[0], { gridRow: 'span 2' })} />
            <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[1])} />
            <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[2])} />
            <button type="button" aria-label="open gallery" onClick={onOpen} style={tile(gallery[3])} />
            {n >= 5 ? (
                <button type="button" aria-label="open gallery" onClick={onOpen} style={{ ...tile(gallery[4]), position: 'relative' }}>
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 700,
                            gap: 6,
                        }}
                    >
                        <MatIcon name="photo_library" size={20} color="#fff" />
                        全ての写真 ({n})
                    </div>
                </button>
            ) : (
                <div style={{ background: 'var(--bg-muted)' }} />
            )}
        </div>
    );
}

function DetailBlocksRenderer({ product }: { product: TourProduct }) {
    const blocks = product.detailBlocks ?? [];
    const slides = product.detailSlides ?? [];
    const detailImages = product.detailImages ?? [];

    // Mobile prefers `detailBlocks` when present; otherwise it falls back to
    // detailImages + detailSlides. Mirror that priority on desktop.
    if (blocks.length > 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {blocks.map((b, i) => {
                    if (b.type === 'image') {
                        const url = typeof b.content === 'string' ? b.content : '';
                        if (!url) return null;
                        return (
                            <img
                                key={b.id || i}
                                src={url}
                                alt={`${product.name} - ${i + 1}`}
                                loading="lazy"
                                decoding="async"
                                style={{ width: '100%', height: 'auto', borderRadius: 16 }}
                            />
                        );
                    }
                    if (b.type === 'slide') {
                        const slide = b.content as DetailSlide;
                        return <SlideBlock key={b.id || i} slide={slide} productName={product.name} />;
                    }
                    if (b.type === 'divider') {
                        const div = b.content as DividerContent;
                        return (
                            <div
                                key={b.id || i}
                                style={{
                                    height: div.height,
                                    borderBottom: div.style === 'line' ? '1px solid var(--border-subtle)' : 'none',
                                }}
                            />
                        );
                    }
                    return null;
                })}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {detailImages.map((img, i) => (
                <img
                    key={i}
                    src={img}
                    alt={`${product.name} - ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: 'auto', borderRadius: 16 }}
                />
            ))}
            {slides.map((s) => (
                <SlideBlock key={s.id} slide={s} productName={product.name} />
            ))}
        </div>
    );
}

function SlideBlock({ slide, productName }: { slide: DetailSlide; productName: string }) {
    if (!slide.images || slide.images.length === 0) return null;
    const n = slide.images.length;

    // Adaptive layout based on image count so images never get squashed into
    // tiny grid cells on a wide PC viewport.
    // - 1 image  → full-width 16:9 hero
    // - 2 images → 2 columns
    // - 3 images → 3 columns
    // - 4+ images → horizontal-scroll gallery (matches mobile carousel feel)
    let body: React.ReactNode;
    if (n === 1) {
        body = (
            <img
                src={slide.images[0]}
                alt={`${slide.title || productName} - 1`}
                loading="lazy"
                decoding="async"
                style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    objectFit: 'cover',
                    borderRadius: 14,
                    display: 'block',
                }}
            />
        );
    } else if (n === 2) {
        body = (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {slide.images.map((img, i) => (
                    <img
                        key={i}
                        src={img}
                        alt={`${slide.title || productName} - ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 14, display: 'block' }}
                    />
                ))}
            </div>
        );
    } else {
        // 3+ images — 2-column responsive grid. Big, readable cards on PC.
        body = (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {slide.images.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                        <img
                            src={img}
                            alt={`${slide.title || productName} - ${i + 1}`}
                            loading="lazy"
                            decoding="async"
                            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 14, display: 'block' }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 10,
                                right: 10,
                                padding: '3px 10px',
                                background: 'rgba(0,0,0,0.55)',
                                color: '#fff',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 999,
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            {i + 1} / {n}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            {slide.title && (
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                    {slide.title}
                </h3>
            )}
            {body}
            {slide.description && (
                <p style={{ fontSize: 14, color: 'var(--fg-4)', lineHeight: 1.75, marginTop: 14 }}>
                    {slide.description}
                </p>
            )}
        </div>
    );
}

function OptionsBlock({ product }: { product: TourProduct }) {
    const pricing = product.pricingOptions ?? [];
    const accommodations = product.accommodationOptions ?? [];
    const vehicles = product.vehicleOptions ?? [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {pricing.length > 0 && (
                <div>
                    <h3 style={subSectionHeading}>
                        <MatIcon name="payments" size={20} color="#0f766e" /> 人数別料金
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(pricing.length, 4)}, 1fr)`, gap: 12 }}>
                        {pricing.map((p, i) => (
                            <div key={i} style={pricingCardStyle}>
                                <div style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 4 }}>{p.people} 名様</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f766e', letterSpacing: '-0.01em' }}>
                                    ¥{p.pricePerPerson.toLocaleString()}
                                    <span style={{ fontSize: 12, color: 'var(--fg-5)', fontWeight: 500, marginLeft: 4 }}>/ 名</span>
                                </div>
                                {p.depositPerPerson > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)' }}>
                                        予約金 ¥{p.depositPerPerson.toLocaleString()}
                                    </div>
                                )}
                                {p.localPaymentPerPerson > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 2 }}>
                                        現地払 ¥{p.localPaymentPerPerson.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {accommodations.length > 0 && (
                <div>
                    <h3 style={subSectionHeading}>
                        <MatIcon name="hotel" size={20} color="#0f766e" /> 宿泊オプション
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        {accommodations.map((a) => (
                            <div key={a.id} style={optionCardStyle}>
                                {a.imageUrl && (
                                    <div
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 12,
                                            backgroundImage: `url(${a.imageUrl})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            flexShrink: 0,
                                        }}
                                    />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>{a.name}</span>
                                        {a.isDefault && <span style={defaultBadgeStyle}>標準</span>}
                                    </div>
                                    {a.description && (
                                        <div style={{ fontSize: 13, color: 'var(--fg-4)', lineHeight: 1.6 }}>{a.description}</div>
                                    )}
                                    {a.priceModifier !== 0 && (
                                        <div style={priceModifierStyle(a.priceModifier)}>
                                            {a.priceModifier > 0 ? '+' : ''}¥{a.priceModifier.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {vehicles.length > 0 && (
                <div>
                    <h3 style={subSectionHeading}>
                        <MatIcon name="directions_car" size={20} color="#0f766e" /> 車両オプション
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        {vehicles.map((v) => (
                            <div key={v.id} style={optionCardStyle}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>{v.name}</span>
                                        {v.isDefault && <span style={defaultBadgeStyle}>標準</span>}
                                    </div>
                                    {v.description && (
                                        <div style={{ fontSize: 13, color: 'var(--fg-4)', lineHeight: 1.6 }}>{v.description}</div>
                                    )}
                                    {v.priceModifier !== 0 && (
                                        <div style={priceModifierStyle(v.priceModifier)}>
                                            {v.priceModifier > 0 ? '+' : ''}¥{v.priceModifier.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const subSectionHeading: CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: 'var(--fg-1)',
    margin: '0 0 14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    letterSpacing: '-0.01em',
};

const pricingCardStyle: CSSProperties = {
    padding: '20px 22px',
    background: 'var(--bg-muted)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 16,
    textAlign: 'left',
};

const optionCardStyle: CSSProperties = {
    display: 'flex',
    gap: 14,
    padding: '16px 18px',
    background: '#fff',
    border: '1px solid var(--border-subtle)',
    borderRadius: 14,
    boxShadow: 'var(--shadow-toss)',
};

const defaultBadgeStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    background: 'var(--primary-tint)',
    color: 'var(--primary-dark)',
    borderRadius: 4,
    letterSpacing: '0.04em',
};

function priceModifierStyle(modifier: number): CSSProperties {
    return {
        marginTop: 8,
        fontSize: 13,
        fontWeight: 700,
        color: modifier > 0 ? '#0f766e' : '#16a34a',
    };
}

function HighlightsBlock({ product }: { product: TourProduct }) {
    const items = (product.highlights && product.highlights.length > 0)
        ? product.highlights.slice(0, 4)
        : [
            { icon: 'auto_awesome', title: '世界屈指のダークスカイ', description: '光害ゼロのモンゴルの大草原・砂漠で、肉眼で天の川がはっきり見えます。' },
            { icon: 'landscape', title: '壮大な自然景観', description: '草原・砂漠・山岳など、地球規模の絶景を体感できます。' },
            { icon: 'cottage', title: '本物のゲル宿泊', description: '遊牧民の伝統住居で過ごす夜。ベッドと寝具完備。' },
            { icon: 'translate', title: '日本語ガイド同行', description: '日本語堪能なガイドが同行、言葉の壁なく安心の旅。' },
        ];
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {items.map((h, i) => (
                <div key={i} style={{ padding: 22, background: 'var(--bg-muted)', borderRadius: 16, display: 'flex', gap: 14 }}>
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: 'var(--shadow-toss)',
                        }}
                    >
                        <MatIcon name={h.icon || 'star'} size={22} filled color="#0f766e" />
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                            {h.title}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--fg-4)', lineHeight: 1.65 }}>{h.description}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Shape of one logical day after grouping.
interface DayGroup {
    dayInfo: { id?: string; type: string; content: unknown };
    events: Array<{ id?: string; type: string; content: unknown }>;
}

/**
 * Walk the flat list of itinerary blocks and group anything between two
 * dayInfo blocks into the "events" of the first one. Blocks that appear
 * BEFORE the first dayInfo (intro images etc.) go into preBlocks.
 *
 * Pure function — easier to test and reason about than mutating state.
 */
function groupBlocksByDay(blocks: Array<{ id?: string; type: string; content: unknown }>): {
    preBlocks: Array<{ id?: string; type: string; content: unknown }>;
    days: DayGroup[];
} {
    const days: DayGroup[] = [];
    const preBlocks: typeof blocks = [];
    let current: DayGroup | null = null;
    for (const b of blocks) {
        if (b.type === 'dayInfo') {
            if (current) days.push(current);
            current = { dayInfo: b, events: [] };
        } else if (current) {
            current.events.push(b);
        } else {
            preBlocks.push(b);
        }
    }
    if (current) days.push(current);
    return { preBlocks, days };
}

function Timeline({ product }: { product: TourProduct }) {
    const blocks = (product.itineraryBlocks ?? []).filter(isMeaningfulItineraryBlock);
    const legacyImages = product.itineraryImages ?? [];

    // 1) No data at all → placeholder
    if (blocks.length === 0 && legacyImages.length === 0) {
        return (
            <div
                style={{
                    padding: '40px 24px',
                    background: 'var(--bg-muted)',
                    borderRadius: 16,
                    color: 'var(--fg-5)',
                    textAlign: 'center',
                }}
            >
                行程詳細は近日公開予定です。お見積もり時にスタッフが詳細をご案内します。
            </div>
        );
    }

    // 2) Legacy only → simple image stack
    if (blocks.length === 0 && legacyImages.length > 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {legacyImages.map((src, i) => (
                    <img
                        key={i}
                        src={src}
                        alt={`${product.name} - itinerary ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: 'auto', borderRadius: 16 }}
                    />
                ))}
            </div>
        );
    }

    const grouped = groupBlocksByDay(blocks);

    // Defensive: if admin created timeline blocks *before* adding a dayInfo
    // (very common — they generate "N日 골격" last), those blocks would
    // technically sit before any day. Treat them as events of day 1 instead
    // of orphans rendered above the day header — that's almost always the
    // admin's intent and matches what they see in the admin block order.
    const preBlocks: typeof grouped.preBlocks = [];
    const days: typeof grouped.days = grouped.days;
    if (grouped.preBlocks.length > 0 && days.length > 0) {
        days[0] = {
            dayInfo: days[0].dayInfo,
            events: [...grouped.preBlocks, ...days[0].events],
        };
    } else {
        preBlocks.push(...grouped.preBlocks);
    }

    // 3) No dayInfo blocks → flat layout (image-only / slide products)
    if (days.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {preBlocks.map((b, i) => (
                    <FlatBlockRenderer
                        key={b.id || i}
                        block={b}
                        index={i}
                        productName={product.name}
                    />
                ))}
            </div>
        );
    }

    // 4) Has dayInfo blocks → day-tab + vertical-spine layout
    return (
        <div>
            <DayTabs days={days} />
            {preBlocks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 36 }}>
                    {preBlocks.map((b, i) => (
                        <FlatBlockRenderer
                            key={b.id || i}
                            block={b}
                            index={i}
                            productName={product.name}
                        />
                    ))}
                </div>
            )}
            {days.map((day, i) => (
                <DaySection
                    key={day.dayInfo.id || i}
                    day={day}
                    dayIndex={i}
                    productName={product.name}
                />
            ))}
        </div>
    );
}

/**
 * Top tab bar — one tab per dayInfo. Click scrolls smoothly to the matching
 * section. Sticks under the in-page nav so it stays reachable while reading
 * a long itinerary.
 */
function DayTabs({ days }: { days: DayGroup[] }) {
    const jump = (idx: number) => {
        const el = document.getElementById(`itin-day-${idx + 1}`);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 220;
        window.scrollTo({ top, behavior: 'smooth' });
    };
    return (
        <div
            className="scrollbar-hide"
            style={{
                display: 'flex',
                gap: 4,
                marginBottom: 32,
                borderBottom: '1px solid var(--border-subtle)',
                overflowX: 'auto',
                position: 'sticky',
                top: 200,
                background: '#fff',
                zIndex: 20,
            }}
        >
            {days.map((d, i) => {
                const c = d.dayInfo.content as DayInfoContent;
                const label = (c?.dayLabel || `${i + 1}日目`).replace(/（.*?）/, '');
                return (
                    <button
                        key={d.dayInfo.id || i}
                        type="button"
                        onClick={() => jump(i)}
                        style={{
                            padding: '14px 22px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--fg-3)',
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: 'pointer',
                            borderBottom: '2px solid transparent',
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                            transition: 'color 150ms',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#0f766e';
                            e.currentTarget.style.borderBottomColor = '#0f766e';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--fg-3)';
                            e.currentTarget.style.borderBottomColor = 'transparent';
                        }}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * One full day section. New layout matches the reference design:
 *   - Slim header bar at top (day number + date, optionally collapsible)
 *   - Vertical spine on left with two kinds of markers:
 *       📍 large pin = location header (timeline block with no images)
 *       ● small red dot = spot card (timeline block with images)
 *   - Hotel + meals rows at the end
 */
function DaySection({
    day,
    dayIndex,
    productName,
}: {
    day: DayGroup;
    dayIndex: number;
    productName: string;
}) {
    const c = day.dayInfo.content as DayInfoContent;
    const dayDate = c?.dayDate?.trim();
    // Header right side text. If admin set a date, show it bold; otherwise fall
    // back to the dayInfo title (e.g., "고르히-테렐지") so the bar never sits empty.
    const headerRight = dayDate || c?.title?.trim() || c?.dayLabel || '';

    const meals: Array<{ k: string; v: string }> = [];
    if (c?.meals?.breakfast) meals.push({ k: '朝食', v: c.meals.breakfast });
    if (c?.meals?.lunch) meals.push({ k: '昼食', v: c.meals.lunch });
    if (c?.meals?.dinner) meals.push({ k: '夕食', v: c.meals.dinner });

    // If admin filled in dayInfo.title/description (e.g., region name +
    // overview), surface that as a synthetic first "location header" so the
    // big pin doesn't disappear when there are no other location-style
    // timeline blocks.
    const hasDayHeaderContent = !!(c?.title || c?.description);

    return (
        <section
            id={`itin-day-${dayIndex + 1}`}
            style={{ marginBottom: 56, scrollMarginTop: 260 }}
        >
            {/* ─── Slim day header bar ───────────────────────────────── */}
            <div
                style={{
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: '14px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    marginBottom: 28,
                }}
            >
                <span
                    style={{
                        flexShrink: 0,
                        padding: '5px 12px',
                        background: '#fff',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--fg-2)',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {(c?.dayLabel || `${dayIndex + 1}日目`).replace(/（.*?）/, '')}
                </span>
                <span
                    style={{
                        flex: 1,
                        fontSize: 17,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {headerRight}
                </span>
            </div>

            {/* ─── Spine area ─────────────────────────────────────────
                NOTE on alignment: every spine row inside uses a CSS grid of
                `40px 1fr` for [icon | content]. The icon column starts at the
                parent's content edge — i.e. x=0 inside this container. The
                vertical line at left:19 therefore sits exactly at the center
                of the 40px icon column, which is where every icon centers
                itself. If you ever add paddingLeft back here, the line will
                drift to the side and stop threading through the icons. */}
            <div style={{ position: 'relative' }}>
                <div
                    style={{
                        position: 'absolute',
                        left: 19,
                        top: 8,
                        bottom: 8,
                        width: 2,
                        background: 'var(--border, #e2e8f0)',
                        pointerEvents: 'none',
                    }}
                />

                {/* Synthetic dayInfo header row (only when admin filled it in) */}
                {hasDayHeaderContent && (
                    <LocationHeaderRow
                        title={c?.title || ''}
                        description={c?.description || ''}
                    />
                )}

                {/* Real timeline blocks */}
                {day.events.map((b, i) => (
                    <SpineEventRow
                        key={b.id || i}
                        block={b}
                        index={i}
                        productName={productName}
                    />
                ))}

                {/* Hotel row */}
                {c?.accommodation && (
                    <SpineRow icon="bed" small>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                paddingTop: 16,
                                borderTop: '1px solid var(--border-subtle)',
                            }}
                        >
                            <span
                                style={{
                                    padding: '4px 10px',
                                    background: 'var(--bg-muted)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    color: 'var(--fg-2)',
                                    fontWeight: 700,
                                }}
                            >
                                予定
                            </span>
                            <span
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                }}
                            >
                                {c.accommodation}
                            </span>
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: 'var(--fg-5)',
                                marginTop: 6,
                            }}
                        >
                            * 宿泊先は出発1日前までにご案内します。
                        </div>
                    </SpineRow>
                )}

                {/* Meals row */}
                {meals.length > 0 && (
                    <SpineRow icon="restaurant_menu" small>
                        <div
                            style={{
                                display: 'flex',
                                gap: 40,
                                flexWrap: 'wrap',
                                paddingTop: 16,
                                borderTop: '1px solid var(--border-subtle)',
                            }}
                        >
                            {meals.map((m, i) => (
                                <span
                                    key={i}
                                    style={{ fontSize: 14, color: 'var(--fg-2)' }}
                                >
                                    <span style={{ color: '#0f766e', fontWeight: 700 }}>
                                        [{m.k}]
                                    </span>{' '}
                                    <span style={{ fontWeight: 600 }}>{m.v}</span>
                                </span>
                            ))}
                        </div>
                    </SpineRow>
                )}
            </div>
        </section>
    );
}

/**
 * "Region / city" header inline with the spine — bigger pin, no card chrome.
 * Renders dayInfo.title + dayInfo.description when admin filled them.
 */
function LocationHeaderRow({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                gap: 16,
                marginBottom: 28,
                alignItems: 'flex-start',
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        background: '#fff',
                        border: '2px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <MatIcon
                        name="location_on"
                        size={20}
                        filled
                        color="var(--fg-3)"
                    />
                </div>
            </div>
            <div style={{ paddingTop: 4 }}>
                {title && (
                    <div
                        style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: 'var(--fg-1)',
                            marginBottom: description ? 6 : 0,
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {title}
                    </div>
                )}
                {description && (
                    <div
                        style={{
                            fontSize: 14,
                            color: 'var(--fg-3)',
                            lineHeight: 1.75,
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {description}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Generic row aligned to the vertical spine. Icons can be:
 *   - small=true and no icon → small red dot (default for spot cards)
 *   - small=true and icon → outlined circle with material icon (hotel/meals)
 *   - icon === 'location_on' → larger map pin (for region headers)
 */
function SpineRow({
    icon,
    small,
    children,
}: {
    icon?: string;
    /** When true, render a 24px outlined circle with the icon (for hotel/meals). */
    small?: boolean;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr',
                gap: 16,
                alignItems: 'flex-start',
                marginBottom: 28,
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: 12,
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {icon && small ? (
                    <div
                        style={{
                            width: 26,
                            height: 26,
                            borderRadius: 999,
                            background: '#fff',
                            border: '1.5px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <MatIcon name={icon} size={14} color="var(--fg-3)" />
                    </div>
                ) : (
                    <span
                        style={{
                            width: 9,
                            height: 9,
                            borderRadius: 999,
                            background: '#dc2626',
                            // Smaller white halo (2px) so the spine line stays
                            // visible right up to the dot edges.
                            boxShadow: '0 0 0 2px #fff',
                        }}
                    />
                )}
            </div>
            <div>{children}</div>
        </div>
    );
}

/**
 * One event row inside a day. Handles all non-dayInfo block types:
 * timeline (title + description + images), image, slide, divider.
 */
function SpineEventRow({
    block,
    index,
    productName,
}: {
    block: { id?: string; type: string; content: unknown };
    index: number;
    productName: string;
}) {
    // Divider → just render a thin gap inside the spine
    if (block.type === 'divider') {
        const div = block.content as DividerContent;
        return (
            <div
                style={{
                    marginLeft: 56,
                    height: typeof div.height === 'number' ? div.height : 24,
                    borderBottom: div.style === 'line' ? '1px solid var(--border-subtle)' : 'none',
                    marginBottom: 12,
                }}
            />
        );
    }

    // Image → full-width image inside the day, still aligned with content column
    if (block.type === 'image') {
        const url = typeof block.content === 'string' ? block.content : '';
        if (!url) return null;
        return (
            <SpineRow icon="image">
                <img
                    src={url}
                    alt={`${productName} - ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: 'auto', borderRadius: 14, display: 'block' }}
                />
            </SpineRow>
        );
    }

    // Slide → re-use the existing SlideBlock component
    if (block.type === 'slide') {
        const slide = block.content as DetailSlide;
        return (
            <SpineRow icon="view_carousel">
                <SlideBlock slide={slide} productName={productName} />
            </SpineRow>
        );
    }

    // Timeline → auto-detect: with images = spot card, without images = location header
    if (block.type === 'timeline') {
        const c = block.content as TimelineContent & { images?: unknown };
        const imgs = Array.isArray(c.images)
            ? c.images.filter((x): x is string => typeof x === 'string')
            : [];

        // ── No images = location header (region/city/notes only) ──
        if (imgs.length === 0) {
            return (
                <LocationHeaderRow
                    title={c.title || ''}
                    description={c.description || ''}
                />
            );
        }

        // ── Has images = spot card (the reference design's "place card") ──
        return (
            <SpineRow>
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: '22px 24px',
                    }}
                >
                    {/* Title row + 자세히보기 link */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 16,
                            marginBottom: c.time || c.description ? 6 : 14,
                        }}
                    >
                        {c.title && (
                            <h4
                                style={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                    margin: 0,
                                    letterSpacing: '-0.01em',
                                    lineHeight: 1.35,
                                }}
                            >
                                {c.title}
                            </h4>
                        )}
                        <span
                            style={{
                                flexShrink: 0,
                                fontSize: 12,
                                color: 'var(--fg-4)',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            詳細を見る
                            <MatIcon
                                name="arrow_forward"
                                size={14}
                                color="var(--fg-4)"
                            />
                        </span>
                    </div>

                    {/* Optional subtitle (we reuse the `time` field for this). */}
                    {c.time && (
                        <div
                            style={{
                                fontSize: 13,
                                color: 'var(--fg-4)',
                                marginBottom: 14,
                                lineHeight: 1.6,
                            }}
                        >
                            {c.time}
                        </div>
                    )}

                    {/* Image grid — 3-col when many, 2-col for 2, full for 1 */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                imgs.length === 1
                                    ? '1fr'
                                    : imgs.length === 2
                                        ? 'repeat(2, 1fr)'
                                        : 'repeat(3, 1fr)',
                            gap: 8,
                            marginBottom: c.description ? 16 : 0,
                        }}
                    >
                        {imgs.map((src, i) => (
                            <img
                                key={i}
                                src={src}
                                alt={c.title ? `${c.title} - ${i + 1}` : `event - ${i + 1}`}
                                loading="lazy"
                                decoding="async"
                                style={{
                                    width: '100%',
                                    aspectRatio: imgs.length === 1 ? '16/9' : '4/3',
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    display: 'block',
                                }}
                            />
                        ))}
                    </div>

                    {/* Description below images, matching the reference layout. */}
                    {c.description && (
                        <p
                            style={{
                                fontSize: 14,
                                color: 'var(--fg-2)',
                                lineHeight: 1.85,
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {c.description}
                        </p>
                    )}
                </div>
            </SpineRow>
        );
    }

    return null;
}

/**
 * Renders a block without the spine column — used when the product has no
 * dayInfo blocks (image-only / slide-only products).
 */
function FlatBlockRenderer({
    block,
    index,
    productName,
}: {
    block: { id?: string; type: string; content: unknown };
    index: number;
    productName: string;
}) {
    if (block.type === 'image') {
        const url = typeof block.content === 'string' ? block.content : '';
        if (!url) return null;
        return (
            <img
                src={url}
                alt={`${productName} - ${index + 1}`}
                loading="lazy"
                decoding="async"
                style={{ width: '100%', height: 'auto', borderRadius: 16 }}
            />
        );
    }
    if (block.type === 'slide') {
        const slide = block.content as DetailSlide;
        return <SlideBlock slide={slide} productName={productName} />;
    }
    if (block.type === 'divider') {
        const div = block.content as DividerContent;
        return (
            <div
                style={{
                    height: typeof div.height === 'number' ? div.height : 24,
                    borderBottom: div.style === 'line' ? '1px solid var(--border-subtle)' : 'none',
                }}
            />
        );
    }
    // timeline blocks rendered flat = just images (rare path)
    if (block.type === 'timeline') {
        const c = block.content as TimelineContent & { images?: unknown };
        const imgs = Array.isArray(c.images)
            ? c.images.filter((x): x is string => typeof x === 'string')
            : [];
        if (imgs.length === 0) return null;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {imgs.map((src, i) => (
                    <img
                        key={i}
                        src={src}
                        alt={`${productName} - ${index + 1}-${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: 'auto', borderRadius: 16 }}
                    />
                ))}
            </div>
        );
    }
    return null;
}

// DayCard removed — replaced by SpineRow + DaySection in the new
// tab-based timeline layout above.

function GuideCard() {
    // Site-wide generic guide intro from /api/settings (key: guide_intro).
    // Falls back to a default N1-certified message if not configured.
    const intro = useGuideIntro();
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 24,
                alignItems: 'center',
                padding: 26,
                background: 'linear-gradient(135deg, var(--primary-tint) 0%, transparent 100%)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 20,
            }}
        >
            <div
                style={{
                    width: 120,
                    height: 120,
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px -10px rgba(15,118,110,0.4)',
                }}
            >
                <MatIcon name="translate" size={56} color="#fff" />
            </div>
            <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', letterSpacing: '0.08em', marginBottom: 6 }}>YOUR GUIDE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em', marginBottom: 10 }}>
                    {intro.title}
                </div>
                <div style={{ fontSize: 14, color: 'var(--fg-3)', lineHeight: 1.75, maxWidth: 640 }}>
                    {intro.body}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    {intro.chips.map((s) => (
                        <span
                            key={s}
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--fg-3)',
                                padding: '4px 10px',
                                background: '#fff',
                                borderRadius: 999,
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            {s}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function LocationBlock({ product }: { product: TourProduct }) {
    // Auto-extract destinations from the itinerary blocks admin filled in.
    // Falls back to (UB + a couple of well-known spots) when itinerary is empty
    // so the section never looks broken.
    const places = useMemo(
        () => extractPlacesFromItinerary(product.itineraryBlocks as { type: string; content: unknown }[] | undefined),
        [product.itineraryBlocks]
    );

    if (places.length === 0) {
        return (
            <div
                style={{
                    padding: '40px 24px',
                    background: 'var(--bg-muted)',
                    borderRadius: 16,
                    color: 'var(--fg-5)',
                    textAlign: 'center',
                    fontSize: 14,
                }}
            >
                目的地情報は近日公開予定です。
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
            <DestinationsMap places={places} height={340} borderRadius={20} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {places.map((p, i) => (
                    <div
                        key={p.name}
                        style={{
                            display: 'flex',
                            gap: 14,
                            padding: '14px 18px',
                            background: 'var(--bg-muted)',
                            borderRadius: 12,
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 999,
                                background: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#0f766e',
                                border: '1.5px solid #0f766e',
                                flexShrink: 0,
                            }}
                        >
                            {i + 1}
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{p.name}</div>
                            {p.short && p.short !== p.name && (
                                <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>{p.short}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function IncludedBlock({ product }: { product: TourProduct }) {
    const inc = (product.included && product.included.length > 0)
        ? product.included
        : ['全日程宿泊', '全日程食事付き', '専用車両 (送迎・移動)', '日本語ガイド同行', '観光地入場料', '燃料費'];
    const exc = (product.excluded && product.excluded.length > 0)
        ? product.excluded
        : ['海外旅行保険', '国際線航空券', '個人的費用'];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
            <div style={{ padding: 26, background: 'var(--bg-muted)', borderRadius: 20 }}>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        marginBottom: 18,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <MatIcon name="check_circle" size={20} filled color="#0f766e" /> 含まれるもの
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                    {inc.map((x, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                gap: 10,
                                alignItems: 'flex-start',
                                fontSize: 13,
                                color: 'var(--fg-2)',
                                lineHeight: 1.5,
                            }}
                        >
                            <MatIcon name="check_circle" size={18} filled color="#0f766e" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{x}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ padding: 26, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 20 }}>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        marginBottom: 18,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <MatIcon name="do_not_disturb_on" size={20} filled color="var(--fg-5)" /> 含まれないもの
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {exc.map((x, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--fg-4)' }}>
                            <MatIcon name="do_not_disturb_on" size={18} color="var(--fg-5)" />
                            <span>{x}</span>
                        </div>
                    ))}
                </div>
                <div
                    style={{
                        marginTop: 24,
                        padding: 14,
                        background: 'var(--bg-muted)',
                        borderRadius: 12,
                        fontSize: 12,
                        color: 'var(--fg-4)',
                        lineHeight: 1.6,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'flex-start',
                    }}
                >
                    <MatIcon name="lightbulb" size={16} filled color="#f59e0b" style={{ flexShrink: 0 }} />
                    <span>国際線航空券・ビザのお手配もサポート可能です。お気軽にご相談ください。</span>
                </div>
            </div>
        </div>
    );
}

function ReviewsBlockV2({ reviews, rating, count }: { reviews: ReviewLike[]; rating: number; count: number }) {
    const [filter, setFilter] = useState<'all' | '5' | 'photo'>('all');

    // Distribution = histogram of real ratings, so 0 reviews stays at 0% across
    // the board (no more fake 82/14/3/1/0 fixture).
    const dist = useMemo(() => {
        const buckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        for (const r of reviews) {
            const rounded = Math.round(Number(r.rating) || 0);
            if (rounded >= 1 && rounded <= 5) buckets[rounded] += 1;
        }
        return ([5, 4, 3, 2, 1] as const).map((s) => ({
            s,
            pct: count > 0 ? Math.round((buckets[s] / count) * 100) : 0,
        }));
    }, [reviews, count]);

    // Stars to render in the summary (0 when no reviews so we don't fake-glow).
    const fullStars = Math.round(rating);

    const displayed = useMemo(() => {
        if (filter === '5') return reviews.filter((r) => (r.rating || 0) >= 5);
        return reviews;
    }, [reviews, filter]);

    return (
        <div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '260px 1fr',
                    gap: 36,
                    padding: '26px 28px',
                    background: 'var(--bg-muted)',
                    borderRadius: 20,
                    marginBottom: 26,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: 56, fontWeight: 700, color: count > 0 ? 'var(--fg-1)' : 'var(--fg-5)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {count > 0 ? rating.toFixed(1) : '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <MatIcon
                                key={i}
                                name="star"
                                size={20}
                                filled={i < fullStars}
                                color={i < fullStars ? '#facc15' : 'var(--border)'}
                            />
                        ))}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--fg-4)', marginTop: 10 }}>{count > 0 ? `${count} 件のレビュー` : 'レビュー募集中'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                    {dist.map((d) => (
                        <div key={d.s} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--fg-5)', width: 22, fontWeight: 600 }}>★ {d.s}</span>
                            <div style={{ flex: 1, height: 8, background: '#fff', borderRadius: 999, overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${d.pct}%`,
                                        height: '100%',
                                        background: 'linear-gradient(to right, #0f766e, #115e59)',
                                        borderRadius: 999,
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: 12,
                                    color: 'var(--fg-4)',
                                    width: 36,
                                    textAlign: 'right',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {d.pct}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {(
                    [
                        { v: 'all' as const, l: 'すべて' },
                        { v: '5' as const, l: '★ 5 のみ' },
                        { v: 'photo' as const, l: '写真付き' },
                    ]
                ).map((f) => {
                    const on = filter === f.v;
                    return (
                        <button
                            key={f.v}
                            type="button"
                            onClick={() => setFilter(f.v)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                background: on ? 'var(--fg-1)' : '#fff',
                                color: on ? '#fff' : 'var(--fg-3)',
                                border: on ? '1px solid var(--fg-1)' : '1px solid var(--border)',
                            }}
                        >
                            {f.l}
                        </button>
                    );
                })}
            </div>

            {displayed.length === 0 ? (
                <div
                    style={{
                        padding: '40px 24px',
                        background: 'var(--bg-muted)',
                        borderRadius: 16,
                        color: 'var(--fg-5)',
                        textAlign: 'center',
                    }}
                >
                    まだレビューがありません。最初のレビュアーになりましょう！
                </div>
            ) : (
                // Horizontal scroll carousel — matches mobile + home design and
                // lets the section accommodate many reviews without dominating
                // the page vertically. Card click navigates to the review detail.
                <div
                    className="scrollbar-hide"
                    style={{
                        display: 'flex',
                        gap: 16,
                        overflowX: 'auto',
                        scrollSnapType: 'x mandatory',
                        paddingBottom: 6,
                        marginLeft: -4,
                        marginRight: -4,
                        paddingLeft: 4,
                        paddingRight: 4,
                    }}
                >
                    {displayed.map((r, i) => (
                        <ReviewCardLink key={r.id ?? i} review={r} />
                    ))}
                </div>
            )}

            {count > displayed.length && (
                <button
                    type="button"
                    style={{
                        marginTop: 22,
                        padding: '14px 24px',
                        background: '#fff',
                        color: 'var(--fg-1)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    全 {count} 件のレビューを見る <MatIcon name="arrow_forward" size={16} color="var(--fg-1)" />
                </button>
            )}
        </div>
    );
}

/**
 * Clickable review card used in the product detail page's horizontal carousel.
 * Click → /reviews/<id> so a long review can be read in full without bloating
 * the product page. Mobile + home use the same navigation target.
 */
function ReviewCardLink({ review: r }: { review: ReviewLike }) {
    const navigate = useNavigate();
    const stars = Math.max(0, Math.min(5, Number(r.rating) || 0));
    const author = r.user_name || r.author || '匿名';
    const visitDate = r.visit_date || r.visitDate;
    const handleClick = () => {
        if (!r.id) return;
        navigate(`/reviews/${r.id}`);
    };
    return (
        <article
            onClick={handleClick}
            role={r.id ? 'button' : undefined}
            tabIndex={r.id ? 0 : undefined}
            onKeyDown={(e) => {
                if (!r.id) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            style={{
                flex: '0 0 340px',
                scrollSnapAlign: 'start',
                padding: 22,
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 16,
                boxShadow: 'var(--shadow-toss)',
                cursor: r.id ? 'pointer' : 'default',
                transition: 'all 200ms',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
                if (!r.id) return;
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 14px 30px -6px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = 'var(--shadow-toss)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        background: 'var(--primary-tint, rgba(15,118,110,0.08))',
                        color: '#0f766e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                    }}
                >
                    {author.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--fg-1)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {author} 様
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <div style={{ display: 'flex', gap: 1 }}>
                            {Array.from({ length: 5 }).map((_, j) => (
                                <MatIcon
                                    key={j}
                                    name="star"
                                    size={13}
                                    filled
                                    color={j < stars ? '#facc15' : '#e2e8f0'}
                                />
                            ))}
                        </div>
                        {visitDate && (
                            <span style={{ fontSize: 11, color: 'var(--fg-5)' }}>{visitDate}</span>
                        )}
                    </div>
                </div>
            </div>
            <div
                style={{
                    fontSize: 14,
                    color: 'var(--fg-3)',
                    lineHeight: 1.7,
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}
            >
                {r.content}
            </div>
            {r.id && (
                <div
                    style={{
                        marginTop: 14,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#0f766e',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    全文を読む <MatIcon name="arrow_forward" size={14} color="#0f766e" />
                </div>
            )}
        </article>
    );
}

const DEFAULT_PRODUCT_FAQS: ProductFAQ[] = [
    { q: '出発前に何を準備したらいいですか？', a: '国際線航空券・パスポート (有効期限6ヶ月以上)・モンゴルビザが必要です。ビザ申請は弊社でもサポートいたします。気温差が大きいため、季節を問わず羽織りものは必須です。' },
    { q: 'キャンセル規定を教えてください。', a: '出発日の31日前まで: 全額返金。30〜15日前: ツアー代金の30%。14〜8日前: 50%。7日前以降: 100%。詳しくは利用規約をご確認ください。' },
    { q: 'ゲル宿泊は寝具がありますか？', a: '全てのゲルキャンプにベッド・マットレス・毛布・タオルを完備しています。冬季には電気毛布もご用意します。' },
    { q: '1人旅でも参加できますか？', a: 'もちろん可能です。一人参加追加料金 ¥18,000 を頂戴しております (個室追加料金分)。同行者募集の掲示板もご利用ください。' },
    { q: '食事のアレルギー対応はありますか？', a: '事前にお知らせいただければ、食物アレルギーや宗教上の食事制限に個別対応いたします。ベジタリアン・ヴィーガン対応も可能です。' },
    { q: '現地での通信手段は？', a: 'ウランバートル市内は4G完備。ゴビ・テレルジでは電波が弱い場所もあります。ガイドが衛星電話を所持しているため緊急連絡は可能です。' },
];

function FAQBlock({ product }: { product: TourProduct }) {
    // Use product-specific FAQs when admin set them; otherwise fall back to the
    // site-wide common Q&A so the section is never empty.
    const items: ProductFAQ[] = (product.faqs && product.faqs.length > 0)
        ? product.faqs
        : DEFAULT_PRODUCT_FAQS;
    const [open, setOpen] = useState<number>(0);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((it, i) => {
                const on = open === i;
                return (
                    <div
                        key={i}
                        style={{ border: '1px solid var(--border-subtle)', borderRadius: 14, background: '#fff', overflow: 'hidden' }}
                    >
                        <button
                            type="button"
                            onClick={() => setOpen(on ? -1 : i)}
                            style={{
                                width: '100%',
                                padding: '20px 24px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                fontFamily: 'inherit',
                                textAlign: 'left',
                            }}
                        >
                            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>
                                <span
                                    style={{
                                        color: '#0f766e',
                                        marginRight: 10,
                                        fontWeight: 700,
                                        fontFamily: 'ui-monospace, Menlo, monospace',
                                    }}
                                >
                                    Q{i + 1}.
                                </span>
                                {it.q}
                            </span>
                            <MatIcon name={on ? 'remove' : 'add'} size={20} color="var(--fg-3)" />
                        </button>
                        {on && (
                            <div style={{ padding: '0 24px 22px', fontSize: 14, color: 'var(--fg-4)', lineHeight: 1.8 }}>{it.a}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function PricingTierSelector({
    options,
    selectedPeople,
    onSelect,
}: {
    options: TourPricingOption[];
    selectedPeople: number;
    onSelect: (people: number) => void;
}) {
    // The cheapest per-person tier is usually the "most popular" choice (larger
    // group = bigger discount). Flag it so users see the best value at a glance.
    const cheapest = options.reduce<TourPricingOption | null>(
        (best, cur) => (!best || cur.pricePerPerson < best.pricePerPerson ? cur : best),
        null
    );

    return (
        <div>
            <label style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 10, display: 'block', fontWeight: 600 }}>
                人数別プラン
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {options.map((opt) => {
                    const on = selectedPeople === opt.people;
                    const isPopular = cheapest && cheapest.people === opt.people && options.length > 1;
                    return (
                        <button
                            key={opt.people}
                            type="button"
                            onClick={() => onSelect(opt.people)}
                            style={{
                                padding: '10px 12px',
                                border: on ? '2px solid #0f766e' : '1px solid var(--border)',
                                background: on ? 'var(--primary-tint)' : '#fff',
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                position: 'relative',
                            }}
                        >
                            {isPopular && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: -7,
                                        right: 6,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        background: '#dc2626',
                                        color: '#fff',
                                        borderRadius: 4,
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    お得
                                </span>
                            )}
                            <div style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 600 }}>{opt.people}名</div>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: on ? 'var(--primary-dark)' : 'var(--fg-1)',
                                    marginTop: 3,
                                }}
                            >
                                ¥{opt.pricePerPerson.toLocaleString()}〜/人
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function RelatedTours({ productId, category }: { productId: string; category: string }) {
    const navigate = useNavigate();
    const [items, setItems] = useState<PCardData[]>([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await fetch('/api/products').then((r) => r.json()).catch(() => null);
                if (!cancelled && Array.isArray(data)) {
                    // /api/products responds with mixed camelCase + snake_case. Normalize
                    // both forms so mainImages always lands in mainImages (PCard expects it).
                    const toArr = (v: unknown): string[] => {
                        if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
                        if (typeof v === 'string') {
                            try {
                                const parsed = JSON.parse(v);
                                return Array.isArray(parsed) ? parsed.filter((x: unknown): x is string => typeof x === 'string') : [];
                            } catch {
                                return [];
                            }
                        }
                        return [];
                    };
                    const same = (data as Array<Record<string, unknown>>)
                        .filter((p) => p.id !== productId && p.status !== 'inactive' && p.category === category)
                        .map<PCardData & { _popular: number; _booked: number }>((p) => ({
                            id: String(p.id),
                            name: String(p.name ?? ''),
                            category: typeof p.category === 'string' ? p.category : undefined,
                            duration: typeof p.duration === 'string' ? p.duration : undefined,
                            price: Number(p.price ?? 0),
                            originalPrice: typeof p.originalPrice === 'number'
                                ? p.originalPrice
                                : typeof p.original_price === 'number' ? p.original_price : undefined,
                            mainImages: toArr(p.mainImages ?? p.main_images),
                            tags: Array.isArray(p.tags) ? p.tags.filter((t: unknown): t is string => typeof t === 'string') : [],
                            isPopular: p.is_popular === 1 || p.is_popular === true || p.isPopular === true,
                            _popular: (p.is_popular === 1 || p.is_popular === true || p.isPopular === true) ? 1 : 0,
                            _booked: Number(p.booking_count ?? p.bookingCount ?? 0),
                        }));
                    same.sort((a, b) => (b._popular - a._popular) || (b._booked - a._booked));
                    setItems(same.slice(0, 4));
                }
            } catch {
                // ignore
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [productId, category]);

    if (items.length === 0) return null;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
                <div>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#0f766e',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            marginBottom: 8,
                        }}
                    >
                        You May Also Like
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>
                        似たツアーを探す
                    </h2>
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
                    全てのツアーを見る <MatIcon name="arrow_forward" size={16} />
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
                {items.map((p) => (
                    <PCard key={p.id} p={p} layout="block" onClick={() => navigate(`/products/${p.id}`)} />
                ))}
            </div>
        </div>
    );
}

function GalleryLightbox({ images, onClose }: { images: string[]; onClose: () => void }) {
    const [i, setI] = useState(0);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setI((x) => (x + 1) % images.length);
            if (e.key === 'ArrowLeft') setI((x) => (x - 1 + images.length) % images.length);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [images.length, onClose]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.92)',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                padding: 32,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', marginBottom: 24 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {i + 1} / {images.length}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="close"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <MatIcon name="close" size={22} color="#fff" />
                </button>
            </div>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button type="button" onClick={() => setI((i - 1 + images.length) % images.length)} aria-label="prev" style={lbNav('left')}>
                    <MatIcon name="chevron_left" size={28} color="#fff" />
                </button>
                <img src={images[i]} alt="" style={{ maxWidth: '92%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }} />
                <button type="button" onClick={() => setI((i + 1) % images.length)} aria-label="next" style={lbNav('right')}>
                    <MatIcon name="chevron_right" size={28} color="#fff" />
                </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                {images.map((g, j) => (
                    <button
                        key={j}
                        type="button"
                        onClick={() => setI(j)}
                        aria-label={`thumbnail ${j + 1}`}
                        style={{
                            padding: 0,
                            border: j === i ? '2px solid #fff' : '2px solid transparent',
                            borderRadius: 8,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            width: 80,
                            height: 56,
                            backgroundImage: `url(${g})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: j === i ? 1 : 0.55,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function lbNav(side: 'left' | 'right'): CSSProperties {
    return {
        position: 'absolute',
        top: '50%',
        [side]: 24,
        transform: 'translateY(-50%)',
        width: 56,
        height: 56,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        cursor: 'pointer',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
}

const crumbBtn: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'var(--fg-5)',
    fontSize: 12,
    fontFamily: 'inherit',
};

const stepBtn: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const iconActionBtn: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    border: '1px solid var(--border)',
    background: '#fff',
    borderRadius: 999,
    cursor: 'pointer',
    fontFamily: 'inherit',
};

const contactRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 13,
    color: 'var(--fg-2)',
    textDecoration: 'none',
};
