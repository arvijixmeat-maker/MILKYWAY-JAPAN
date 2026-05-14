import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TourProduct, DayInfoContent, TimelineContent, DetailSlide, DividerContent } from '../../types/product';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { TagChip, type TagTone } from '../desktop-primitives/TagChip';

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

export function ProductDetailDesktop({
    product,
    reviews = [],
    onBook,
    onConsult,
    contentWidth = 1280,
}: ProductDetailDesktopProps) {
    const navigate = useNavigate();
    const [people, setPeople] = useState(2);
    const today = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 21);
        return d.toISOString().slice(0, 10);
    }, []);
    const [date, setDate] = useState(today);
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
        (product.itineraryBlocks && product.itineraryBlocks.length > 0) ||
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

    const total = (product.price || 0) * people;
    const firstTag = product.tags?.[0];
    const hasOriginal = !!product.originalPrice && product.originalPrice > product.price;
    const ratingValue = 4.9; // default if no aggregate available
    const reviewCount = reviews.length || product.bookingCount || 0;

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
                            <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-3)' }}>
                                <MatIcon name="star" size={14} filled color="#facc15" />
                                <span style={{ fontWeight: 700 }}>{ratingValue}</span>
                                {reviewCount > 0 && <span style={{ color: 'var(--fg-5)' }}>({reviewCount} 件のレビュー)</span>}
                            </span>
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
                        gridTemplateColumns: 'repeat(5, 1fr)',
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
                        { i: 'event_available', k: '出発', v: '毎週 水・金' },
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
                            <LocationBlock />
                        </Section>

                        <Section id="included" title="含まれるもの・含まれないもの" eyebrow="What's Included">
                            <IncludedBlock product={product} />
                        </Section>

                        <Section id="reviews" title="レビュー" eyebrow="Real Reviews">
                            <ReviewsBlockV2 reviews={reviews} rating={ratingValue} count={reviewCount} />
                        </Section>

                        <Section id="faq" title="ご注意・よくある質問" eyebrow="FAQ & Notice">
                            <FAQBlock />
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
                                    ¥{product.price.toLocaleString()}
                                </span>
                                <span style={{ fontSize: 16, color: '#0f766e', fontWeight: 700 }}>〜</span>
                            </div>

                            <DepartureCalendar value={date} onChange={setDate} basePrice={product.price} />

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
                                        <button type="button" onClick={() => setPeople(Math.max(1, people - 1))} style={stepBtn} aria-label="decrease">
                                            <MatIcon name="remove" size={16} color="var(--fg-2)" />
                                        </button>
                                        <button type="button" onClick={() => setPeople(people + 1)} style={stepBtn} aria-label="increase">
                                            <MatIcon name="add" size={16} color="var(--fg-2)" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 18, padding: '14px 0', borderTop: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--fg-4)' }}>
                                    <span>¥{product.price.toLocaleString()} × {people}名</span>
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
                                {date} ・ 大人 {people} 名
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
    return (
        <div>
            {slide.title && (
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                    {slide.title}
                </h3>
            )}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(slide.images.length, 3)}, 1fr)`,
                    gap: 12,
                }}
            >
                {slide.images.map((img, i) => (
                    <img
                        key={i}
                        src={img}
                        alt={`${slide.title || productName} - ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12 }}
                    />
                ))}
            </div>
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

function Timeline({ product }: { product: TourProduct }) {
    interface Row {
        key: string;
        day: string;
        title?: string;
        description?: string;
        meals?: string;
        accommodation?: string;
        image?: string;
    }

    const rows: Row[] = useMemo(() => {
        const blocks = product.itineraryBlocks ?? [];
        const out: Row[] = [];
        blocks.forEach((b, i) => {
            if (b.type === 'dayInfo') {
                const c = b.content as DayInfoContent;
                const mealsArr: string[] = [];
                if (c.meals?.breakfast) mealsArr.push('朝');
                if (c.meals?.lunch) mealsArr.push('昼');
                if (c.meals?.dinner) mealsArr.push('夕');
                out.push({
                    key: b.id || String(i),
                    day: c.dayLabel || `DAY ${i + 1}`,
                    title: c.title,
                    description: c.description,
                    meals: mealsArr.length > 0 ? mealsArr.join('・') : undefined,
                    accommodation: c.accommodation,
                });
            } else if (b.type === 'timeline') {
                const c = b.content as TimelineContent;
                out.push({
                    key: b.id || String(i),
                    day: c.time || `#${i + 1}`,
                    title: c.title,
                    description: c.description,
                });
            }
        });
        // Fill images by alternating product.mainImages
        const imgs = product.mainImages ?? [];
        if (imgs.length > 0) {
            out.forEach((r, i) => {
                r.image = imgs[i % imgs.length];
            });
        }
        return out;
    }, [product.itineraryBlocks, product.mainImages]);

    if (rows.length === 0) {
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

    return (
        <div style={{ position: 'relative' }}>
            <div
                style={{
                    position: 'absolute',
                    left: 19,
                    top: 12,
                    bottom: 24,
                    width: 2,
                    background: 'linear-gradient(to bottom, #0f766e 0%, var(--primary-tint) 100%)',
                }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {rows.map((it, i) => (
                    <div key={it.key} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 24, alignItems: 'flex-start' }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 999,
                                background: '#0f766e',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                fontFamily: 'ui-monospace, Menlo, monospace',
                                boxShadow: '0 0 0 4px #fff, 0 0 0 5px var(--primary-tint)',
                                zIndex: 1,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            D{i + 1}
                        </div>
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 16,
                                padding: 0,
                                display: 'grid',
                                gridTemplateColumns: it.image ? '180px 1fr' : '1fr',
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-toss)',
                            }}
                        >
                            {it.image && (
                                <div
                                    style={{
                                        backgroundImage: `url(${it.image})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        minHeight: 140,
                                    }}
                                />
                            )}
                            <div style={{ padding: '18px 22px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', letterSpacing: '0.08em', marginBottom: 4 }}>
                                    {it.day}
                                </div>
                                {it.title && (
                                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                                        {it.title}
                                    </div>
                                )}
                                {it.description && (
                                    <div style={{ fontSize: 13, color: 'var(--fg-4)', lineHeight: 1.7, marginBottom: 12 }}>{it.description}</div>
                                )}
                                {(it.meals || it.accommodation) && (
                                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--fg-5)', flexWrap: 'wrap' }}>
                                        {it.meals && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <MatIcon name="restaurant" size={14} color="var(--fg-5)" /> 食事: {it.meals}
                                            </span>
                                        )}
                                        {it.accommodation && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <MatIcon name="hotel" size={14} color="var(--fg-5)" /> 宿泊: {it.accommodation}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GuideCard() {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr auto',
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
                    width: 140,
                    height: 140,
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 48,
                    fontWeight: 700,
                    letterSpacing: '-0.04em',
                    boxShadow: '0 10px 30px -10px rgba(15,118,110,0.4)',
                }}
            >
                B
            </div>
            <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e', letterSpacing: '0.08em', marginBottom: 6 }}>YOUR GUIDE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em', marginBottom: 4 }}>
                    Bilguun (ビルグーン)
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-5)', marginBottom: 12 }}>日本語ガイド ・ 経験12年 ・ 案内ツアー数 400+</div>
                <div style={{ fontSize: 14, color: 'var(--fg-3)', lineHeight: 1.7, maxWidth: 480 }}>
                    東京の大学で日本語を学び、卒業後ガイドへ。モンゴルの自然と文化を、日本のお客様の目線で丁寧にご案内します。
                    「ガイドのおかげで全てがスムーズに進みました」と高い評価をいただいています。
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                    {['日本語 (N1)', '英語', 'モンゴル語'].map((s) => (
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
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '20px 22px',
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: 'var(--shadow-toss)',
                    minWidth: 100,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MatIcon name="star" size={18} filled color="#facc15" />
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>5.0</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-5)' }}>328 件の評価</div>
            </div>
        </div>
    );
}

function LocationBlock() {
    const stops = [
        { n: '1', t: 'ウランバートル', d: '首都・出発地' },
        { n: '2', t: 'ヨル渓谷', d: '氷河の絶景' },
        { n: '3', t: 'ホンゴル砂丘', d: '180kmの大砂丘' },
        { n: '4', t: 'バヤンザグ', d: '恐竜化石の聖地' },
    ];
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
            <div
                style={{
                    position: 'relative',
                    borderRadius: 20,
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 50%, #80cbc4 100%)',
                    border: '1px solid var(--border-subtle)',
                    minHeight: 340,
                }}
            >
                <svg viewBox="0 0 400 320" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
                    <defs>
                        <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1" fill="rgba(15,118,110,0.08)" />
                        </pattern>
                    </defs>
                    <rect width="400" height="320" fill="url(#dots)" />
                    <path d="M0,180 Q80,140 140,160 T280,150 T400,140 L400,320 L0,320 Z" fill="rgba(15,118,110,0.07)" />
                    <path d="M0,220 Q60,200 130,210 T260,200 T400,205 L400,320 L0,320 Z" fill="rgba(15,118,110,0.1)" />
                    <path d="M70,80 Q140,180 230,140 Q310,100 340,240" stroke="#115e59" strokeWidth="2.5" strokeDasharray="6,4" fill="none" />
                    {[
                        { x: 70, y: 80, l: '1', name: 'UB' },
                        { x: 175, y: 180, l: '2', name: 'Yol' },
                        { x: 260, y: 130, l: '3', name: 'Khongor' },
                        { x: 340, y: 240, l: '4', name: 'Bayanzag' },
                    ].map((p) => (
                        <g key={p.l}>
                            <circle cx={p.x} cy={p.y} r="14" fill="white" stroke="#0f766e" strokeWidth="2" />
                            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f766e">
                                {p.l}
                            </text>
                            <text x={p.x} y={p.y - 22} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0e1a18">
                                {p.name}
                            </text>
                        </g>
                    ))}
                </svg>
                <div
                    style={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        padding: '6px 12px',
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(6px)',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--fg-2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <MatIcon name="map" size={14} color="#0f766e" />
                    モンゴル
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stops.map((s) => (
                    <div
                        key={s.n}
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
                            {s.n}
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{s.t}</div>
                            <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 2 }}>{s.d}</div>
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
    const dist = [
        { s: 5, pct: 82 },
        { s: 4, pct: 14 },
        { s: 3, pct: 3 },
        { s: 2, pct: 1 },
        { s: 1, pct: 0 },
    ];

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
                    <div style={{ fontSize: 56, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {rating}
                    </div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <MatIcon key={i} name="star" size={20} filled color="#facc15" />
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {displayed.slice(0, 6).map((r, i) => (
                        <div
                            key={r.id ?? i}
                            style={{
                                padding: 22,
                                background: '#fff',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 16,
                                boxShadow: 'var(--shadow-toss)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 999,
                                        background: 'var(--primary-tint)',
                                        color: '#0f766e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 14,
                                    }}
                                >
                                    {(r.user_name || r.author || '匿')?.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>
                                        {r.user_name || r.author || '匿名'} 様
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                        <div style={{ display: 'flex', gap: 1 }}>
                                            {Array.from({ length: 5 }).map((_, j) => (
                                                <MatIcon
                                                    key={j}
                                                    name="star"
                                                    size={13}
                                                    filled
                                                    color={j < (r.rating || 5) ? '#facc15' : '#e2e8f0'}
                                                />
                                            ))}
                                        </div>
                                        {(r.visit_date || r.visitDate) && (
                                            <span style={{ fontSize: 11, color: 'var(--fg-5)' }}>{r.visit_date || r.visitDate}</span>
                                        )}
                                    </div>
                                </div>
                                {r.tag && (
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: 'var(--fg-3)',
                                            padding: '4px 10px',
                                            background: 'var(--bg-muted)',
                                            borderRadius: 999,
                                        }}
                                    >
                                        {r.tag}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--fg-3)', lineHeight: 1.7 }}>{r.content}</div>
                        </div>
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

function FAQBlock() {
    const items = [
        { q: '出発前に何を準備したらいいですか？', a: '国際線航空券・パスポート (有効期限6ヶ月以上)・モンゴルビザが必要です。ビザ申請は弊社でもサポートいたします。気温差が大きいため、季節を問わず羽織りものは必須です。' },
        { q: 'キャンセル規定を教えてください。', a: '出発日の31日前まで: 全額返金。30〜15日前: ツアー代金の30%。14〜8日前: 50%。7日前以降: 100%。詳しくは利用規約をご確認ください。' },
        { q: 'ゲル宿泊は寝具がありますか？', a: '全てのゲルキャンプにベッド・マットレス・毛布・タオルを完備しています。冬季には電気毛布もご用意します。' },
        { q: '1人旅でも参加できますか？', a: 'もちろん可能です。一人参加追加料金 ¥18,000 を頂戴しております (個室追加料金分)。同行者募集の掲示板もご利用ください。' },
        { q: '食事のアレルギー対応はありますか？', a: '事前にお知らせいただければ、食物アレルギーや宗教上の食事制限に個別対応いたします。ベジタリアン・ヴィーガン対応も可能です。' },
        { q: '現地での通信手段は？', a: 'ウランバートル市内は4G完備。ゴビ・テレルジでは電波が弱い場所もあります。ガイドが衛星電話を所持しているため緊急連絡は可能です。' },
    ];
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

function DepartureCalendar({ value, onChange, basePrice }: { value: string; onChange: (v: string) => void; basePrice: number }) {
    // Generate 4 upcoming Wednesdays starting ~3 weeks out
    const departures = useMemo(() => {
        const out: { d: string; label: string; price: number; tag?: '残り3席' | '人気' | null }[] = [];
        const start = new Date();
        start.setDate(start.getDate() + 21);
        // Move to next Wednesday
        while (start.getDay() !== 3) start.setDate(start.getDate() + 1);
        for (let i = 0; i < 4; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i * 7);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const day = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
            out.push({
                d: `${yyyy}-${mm}-${dd}`,
                label: `${d.getMonth() + 1}/${d.getDate()} (${day})`,
                price: basePrice + (i >= 2 ? 8000 : 0),
                tag: i === 0 ? '残り3席' : i === 2 ? '人気' : null,
            });
        }
        return out;
    }, [basePrice]);

    return (
        <div>
            <label style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 10, display: 'block', fontWeight: 600 }}>
                出発日を選ぶ
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {departures.map((d) => {
                    const on = value === d.d;
                    return (
                        <button
                            key={d.d}
                            type="button"
                            onClick={() => onChange(d.d)}
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
                            {d.tag && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: -7,
                                        right: 6,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        background: d.tag === '人気' ? '#dc2626' : 'var(--fg-1)',
                                        color: '#fff',
                                        borderRadius: 4,
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    {d.tag}
                                </span>
                            )}
                            <div style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 600 }}>{d.label}</div>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: on ? 'var(--primary-dark)' : 'var(--fg-1)',
                                    marginTop: 3,
                                }}
                            >
                                ¥{(d.price / 1000).toFixed(0)}k〜
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function RelatedTours({ productId, category }: { productId: string; category: string }) {
    interface ApiP {
        id: string;
        name: string;
        category?: string;
        price: number;
        original_price?: number;
        duration?: string;
        main_images?: string[];
        tags?: string[];
        status?: string;
        booking_count?: number;
        is_popular?: 0 | 1 | boolean;
    }
    const navigate = useNavigate();
    const [items, setItems] = useState<ApiP[]>([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await (window as Window & typeof globalThis).fetch('/api/products').then((r) => r.json()).catch(() => null);
                if (!cancelled && Array.isArray(data)) {
                    const same = (data as ApiP[]).filter((p) => p.id !== productId && p.status !== 'inactive' && p.category === category);
                    same.sort((a, b) => (Number(b.is_popular === 1 || b.is_popular === true) - Number(a.is_popular === 1 || a.is_popular === true)) || ((b.booking_count || 0) - (a.booking_count || 0)));
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
                    <RelatedCard key={p.id} p={p} onClick={() => navigate(`/products/${p.id}`)} />
                ))}
            </div>
        </div>
    );
}

function RelatedCard({ p, onClick }: { p: { id: string; name: string; category?: string; price: number; duration?: string; main_images?: string[]; tags?: string[]; original_price?: number }; onClick: () => void }) {
    const img = p.main_images?.[0] || '/og-image.jpg';
    const firstTag = p.tags?.[0];
    const hasOriginal = !!p.original_price && p.original_price > p.price;
    return (
        <div
            onClick={onClick}
            role="button"
            style={{
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-toss)',
                cursor: 'pointer',
                transition: 'all 200ms',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 14px 30px -6px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-toss)';
                e.currentTarget.style.transform = '';
            }}
        >
            <div style={{ aspectRatio: '4/3', backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 50%)' }} />
                {firstTag && <div style={{ position: 'absolute', top: 12, left: 12 }}><TagChip tone={tagTone(firstTag)}>{firstTag}</TagChip></div>}
                {p.duration && (
                    <div style={{ position: 'absolute', bottom: 12, left: 12, color: '#fff', fontSize: 12, fontWeight: 700 }}>{p.duration}</div>
                )}
            </div>
            <div style={{ padding: '16px 18px 18px' }}>
                <div style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 6 }}>{p.category}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', lineHeight: 1.4, marginBottom: 12, minHeight: 42, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.name}
                </div>
                <div>
                    {hasOriginal && (
                        <div style={{ fontSize: 11, color: 'var(--fg-5)', textDecoration: 'line-through' }}>
                            ¥{p.original_price!.toLocaleString()}
                        </div>
                    )}
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f766e' }}>
                        ¥{p.price.toLocaleString()}<span style={{ fontSize: 13 }}>〜</span>
                    </div>
                </div>
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
