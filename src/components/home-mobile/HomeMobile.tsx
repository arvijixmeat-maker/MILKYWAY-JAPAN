import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HomeData } from '../../hooks/useHomeData';
import { useHeroSlides } from '../../hooks/useHeroSlides';
import { useWishlist } from '../../hooks/useWishlist';
import { getOptimizedImageUrl, type ImagePreset } from '../../utils/cloudflareImage';
import { MW, MW_FONT, MW_FONT_EN, MW_GRADIENT, cleanTitle, isUsableImage, yen } from '../desktop-primitives/mwTokens';
import { categoryImage, discountPct, inCategory, isPublished, useHomeReviews, type HomeProduct } from '../home-desktop/homeDesktopData';
import { ANIMALS, AnimalAvatar } from '../reviews-desktop/AnimalAvatar';

interface Props {
    data: HomeData;
    isLoading: boolean;
}

/** Smooth-scroll a snap carousel so slide `i` sits at the left padding. */
const scrollToSlide = (track: HTMLElement | null, i: number) => {
    const el = track?.children[i] as HTMLElement | undefined;
    if (track && el) track.scrollTo({ left: el.offsetLeft - 16, behavior: 'smooth' });
};

const img = (url: string | undefined, preset: ImagePreset) => (isUsableImage(url) ? getOptimizedImageUrl(url, preset) : '');

/** Mobile home page (Claude Design "Milkyway Japan Mobile"). */
export function HomeMobile({ data, isLoading }: Props) {
    const products = data.products.filter(isPublished);
    const { categories, magazines } = data;
    const gobi = categories.find((c) => c.id === 'gobi-desert');
    const horse = categories.find((c) => c.id === 'horse-riding-tour');
    const gobiRow = products.filter((p) => (gobi && inCategory(p, gobi)) || (horse && inCategory(p, horse)));

    return (
        <div style={{ fontFamily: MW_FONT, color: MW.navy, background: '#FFFFFF' }}>
            <MobileHero products={products} />

            {/* SEO: H1 + intro for crawlers and screen readers */}
            <section className="sr-only">
                <h1>モンゴルツアー・モンゴル旅行専門の現地旅行社</h1>
                <p>Milkyway Japanは日本語ガイド同行で安心のモンゴルツアーをご案内。乗馬旅行、ゴビ砂漠、テレルジ国立公園など多彩なプランをご用意しています。</p>
            </section>

            {!isLoading && (
                <>
                    <MobileTours products={products} categories={categories} />
                    {gobiRow.length > 0 && <MobileGobi products={gobiRow} image={categoryImage(gobi) || gobiRow[0].mainImages[0]} />}
                </>
            )}
            <MobileMagazine magazines={magazines} />
            <MobileReviews />
            <MobileCta />
        </div>
    );
}

function MobileHero({ products }: { products: HomeProduct[] }) {
    const navigate = useNavigate();
    const slides = useHeroSlides(products);
    const trackRef = useRef<HTMLDivElement>(null);
    const [idx, setIdx] = useState(0);
    const pausedUntil = useRef(0);

    // Auto-advance every 5s; a touch pauses it for 6s.
    useEffect(() => {
        if (slides.length <= 1) return;
        const t = window.setInterval(() => {
            if (Date.now() < pausedUntil.current || document.visibilityState !== 'visible') return;
            const track = trackRef.current;
            if (!track) return;
            const next = (Math.round(track.scrollLeft / Math.max(1, track.clientWidth - 10)) + 1) % slides.length;
            scrollToSlide(track, next);
        }, 5000);
        return () => window.clearInterval(t);
    }, [slides.length]);

    const onScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        setIdx(Math.min(slides.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth - 10))));
    };

    return (
        <section aria-roledescription="carousel" aria-label="おすすめ特集" style={{ padding: '16px 0 0' }}>
            <div
                ref={trackRef}
                onScroll={onScroll}
                onTouchStart={() => { pausedUntil.current = Date.now() + 6000; }}
                style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', padding: '0 16px', scrollPadding: '0 16px' }}
            >
                {slides.map((s, i) => (
                    <div
                        key={s.key}
                        role="group"
                        aria-roledescription="slide"
                        onClick={() => navigate(s.path)}
                        style={{ position: 'relative', flex: '0 0 calc(100% - 20px)', aspectRatio: '4/5', maxHeight: 440, borderRadius: 24, overflow: 'hidden', scrollSnapAlign: 'center', color: '#fff', background: `linear-gradient(160deg, ${MW.navySoft} 0%, ${MW.mintDeep} 100%)`, cursor: 'pointer' }}
                    >
                        {img(s.img, 'heroBanner') && (
                            <img
                                src={img(s.img, 'heroBanner')}
                                alt={`${s.title.replace(/\n/g, ' ')}｜モンゴル旅行・モンゴルツアー専門 Milkyway Japan`}
                                loading={i === 0 ? 'eager' : 'lazy'}
                                fetchPriority={i === 0 ? 'high' : 'auto'}
                                decoding="async"
                                // Mobile-only banners have their copy baked in: show them whole instead of cropping.
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: s.textFree ? 'cover' : 'contain' }}
                            />
                        )}
                        {s.textFree && (
                            <>
                                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(10,31,46,0.55) 0%,rgba(10,31,46,0) 40%,rgba(10,31,46,0) 55%,rgba(10,31,46,0.7) 100%)' }} />
                                <div style={{ position: 'absolute', inset: 0, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                                        {s.eyebrow && <span style={{ maxWidth: '100%', boxSizing: 'border-box', fontSize: 11, fontWeight: 700, color: MW.navy, background: '#3FC2A4', padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.eyebrow}</span>}
                                        {i === 0 ? (
                                            <h2 style={heroTitle}>{s.title}</h2>
                                        ) : (
                                            <div style={heroTitle}>{s.title}</div>
                                        )}
                                        {s.sub && <span style={{ maxWidth: '100%', fontSize: 13, color: '#EAF7F3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</span>}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                        <span style={{ minWidth: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                                        <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.6)', padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>詳細を見る →</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            {slides.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '14px 0 0' }}>
                    {slides.map((s, i) => (
                        <button
                            key={s.key}
                            type="button"
                            aria-label={`スライド ${i + 1}`}
                            aria-current={i === idx || undefined}
                            onClick={() => { pausedUntil.current = Date.now() + 6000; scrollToSlide(trackRef.current, i); }}
                            style={{ width: i === idx ? 22 : 6, height: 6, padding: 0, border: 0, borderRadius: 999, background: i === idx ? MW.mint : MW.dot, cursor: 'pointer', transition: 'width .3s' }}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function MobileTours({ products, categories }: { products: HomeProduct[]; categories: HomeData['categories'] }) {
    const navigate = useNavigate();
    const [tab, setTab] = useState('pick');
    const tabs = [
        { id: 'pick', label: 'おすすめ', list: [...products].sort((a, b) => Number(b.isFeatured || b.isPopular) - Number(a.isFeatured || a.isPopular)) },
        ...categories.map((c) => ({ id: c.id, label: c.name, list: products.filter((p) => inCategory(p, c)) })),
    ];
    const current = tabs.find((t) => t.id === tab) || tabs[0];

    return (
        <section style={{ padding: '44px 0 0' }}>
            <SectionHead en="TOURS" title="モンゴルツアー商品" more="すべて見る →" onMore={() => navigate(current.id === 'pick' ? '/products' : `/category/${current.id}`)} />
            <div role="tablist" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '16px 16px 4px' }}>
                {tabs.map((t) => {
                    const on = t.id === current.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => setTab(t.id)}
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${on ? MW.navy : MW.line}`, background: on ? MW.navy : '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: on ? '#FFFFFF' : MW.ink3, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            {t.label}
                            <span style={{ fontFamily: MW_FONT_EN, fontSize: 10, color: on ? MW.mintLight : MW.mute2 }}>{t.list.length}</span>
                        </button>
                    );
                })}
            </div>
            {current.list.length === 0 ? (
                <p style={{ margin: '16px 16px 0', padding: '32px 16px', border: `1px dashed ${MW.line2}`, borderRadius: 16, textAlign: 'center', fontSize: 13, color: MW.mute }}>現在、掲載中のツアーはありません。</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '22px 12px', padding: '16px 16px 0' }}>
                    {current.list.slice(0, 6).map((p) => (
                        <TourCard key={p.id} p={p} />
                    ))}
                </div>
            )}
        </section>
    );
}

function TourCard({ p }: { p: HomeProduct }) {
    const navigate = useNavigate();
    const off = discountPct(p);
    return (
        <a href={`/products/${p.id}`} onClick={(e) => { e.preventDefault(); navigate(`/products/${p.id}`); }} style={{ display: 'flex', flexDirection: 'column', gap: 6, color: MW.navy, minWidth: 0, textDecoration: 'none' }}>
            <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 18, overflow: 'hidden', background: MW.chip }}>
                <Photo src={img(p.mainImages[0], 'productThumbnail')} alt={`${p.name}｜${p.category}`} />
                <TypeBadge p={p} />
                <Heart p={p} size={36} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>
                {p.duration ? `[${p.duration}] ` : ''}{p.name}
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                {off > 0 && <span style={{ fontSize: 14, fontWeight: 900, color: MW.red }}>{off}%OFF</span>}
                <span style={{ fontSize: 15, fontWeight: 900 }}>{yen(p.price)}〜</span>
            </span>
        </a>
    );
}

function MobileGobi({ products, image }: { products: HomeProduct[]; image: string }) {
    const navigate = useNavigate();
    return (
        <section style={{ padding: '48px 0 0' }}>
            <a
                href="/category/gobi-desert"
                onClick={(e) => { e.preventDefault(); navigate('/category/gobi-desert'); }}
                style={{ display: 'block', margin: '0 16px', position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '16/9', background: MW.navySoft, textDecoration: 'none' }}
            >
                <Photo src={img(image, 'heroBanner')} alt="ゴビ砂漠ツアー｜モンゴル旅行" />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg,rgba(10,31,46,0.7) 0%,rgba(10,31,46,0) 70%)' }} />
                <div style={{ position: 'absolute', left: 20, bottom: 18, right: 20, display: 'flex', flexDirection: 'column', gap: 4, color: '#fff', pointerEvents: 'none' }}>
                    <h2 style={{ margin: 0, fontFamily: MW_FONT_EN, fontSize: 20, fontWeight: 700 }}>MILKYWAY × GOBI</h2>
                    <span style={{ fontSize: 12, color: '#EAF7F3' }}>砂丘・奇岩・恐竜化石の地を巡るゴビ砂漠ツアー</span>
                </div>
            </a>
            <Row>
                {products.map((p) => {
                    const off = discountPct(p);
                    return (
                        <a key={p.id} href={`/products/${p.id}`} onClick={(e) => { e.preventDefault(); navigate(`/products/${p.id}`); }} style={{ flex: '0 0 62%', minWidth: 0, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 6, color: MW.navy, textDecoration: 'none' }}>
                            <div style={{ position: 'relative', aspectRatio: '16/11', borderRadius: 16, overflow: 'hidden', background: MW.chip }}>
                                <Photo src={img(p.mainImages[0], 'contentImage')} alt={`${p.name}｜${p.category}`} />
                                <TypeBadge p={p} />
                                <Heart p={p} size={34} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>
                                {p.duration ? `[${p.duration}] ` : ''}{p.name}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                {off > 0 && <span style={{ fontSize: 11, color: MW.mute2, textDecoration: 'line-through' }}>{yen(p.originalPrice!)}</span>}
                                <span style={{ fontSize: 15, fontWeight: 900 }}>{yen(p.price)}</span>
                            </span>
                        </a>
                    );
                })}
            </Row>
        </section>
    );
}

function MobileMagazine({ magazines }: { magazines: HomeData['magazines'] }) {
    const navigate = useNavigate();
    const items = magazines.slice(0, 6);
    if (items.length === 0) return null;
    return (
        <section style={{ padding: '48px 0 0' }}>
            <SectionHead en="TRAVEL MAGAZINE" title="今すぐ出発したい旅行コース" more="すべて →" onMore={() => navigate('/travel-guide')} />
            <Row>
                {items.map((m) => {
                    const title = cleanTitle(m.title);
                    return (
                        <a key={m.id} href={`/travel-guide/${m.id}`} onClick={(e) => { e.preventDefault(); navigate(`/travel-guide/${m.id}`); }} style={{ position: 'relative', flex: '0 0 76%', aspectRatio: '3/4', borderRadius: 22, overflow: 'hidden', scrollSnapAlign: 'start', color: '#fff', background: MW.navySoft, textDecoration: 'none' }}>
                            <Photo src={img(m.image, 'contentImage')} alt={title} />
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(10,31,46,0.3) 0%,rgba(10,31,46,0) 30%,rgba(10,31,46,0) 45%,rgba(10,31,46,0.9) 100%)' }} />
                            <div style={{ position: 'absolute', left: 16, right: 16, top: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                                <span style={{ fontFamily: MW_FONT_EN, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', background: 'rgba(255,255,255,0.2)', padding: '5px 8px', borderRadius: 6 }}>MAGAZINE</span>
                                <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', background: MW.mint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={MW.navy}><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
                                </span>
                            </div>
                            <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
                                {m.category && <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, color: MW.navy, background: '#fff', padding: '3px 9px', borderRadius: 999 }}>{m.category}</span>}
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</h3>
                                {m.description && <span style={{ fontSize: 12, lineHeight: 1.6, color: '#D6DEE3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.description}</span>}
                            </div>
                        </a>
                    );
                })}
            </Row>
        </section>
    );
}

function MobileReviews() {
    const navigate = useNavigate();
    const { reviews } = useHomeReviews();
    const items = reviews.slice(0, 6);
    if (items.length === 0) return null;
    return (
        <section style={{ padding: '48px 0 0' }}>
            <SectionHead en="REAL REVIEWS" title="実際の旅行者のレビュー" more="すべて →" onMore={() => navigate('/reviews')} />
            <Row pad="18px 16px 2px">
                {items.map((r, i) => (
                    <a key={r.id || i} href={`/reviews/${r.id}`} onClick={(e) => { e.preventDefault(); navigate(`/reviews/${r.id}`); }} style={{ flex: '0 0 80%', minWidth: 0, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 12, padding: 20, border: `1px solid ${MW.line}`, borderRadius: 22, background: '#fff', color: MW.navy, boxSizing: 'border-box', textDecoration: 'none' }}>
                        <span style={{ color: MW.star, fontSize: 14, letterSpacing: 2 }} aria-label={`評価 ${r.rating} / 5`}>
                            {'★'.repeat(r.rating)}
                            <span style={{ color: MW.line2 }}>{'★'.repeat(5 - r.rating)}</span>
                        </span>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.85, color: MW.ink2, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.content}</p>
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: `1px solid ${MW.line3}` }}>
                            <span style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex' }}>
                                <AnimalAvatar kind={ANIMALS[i % ANIMALS.length]} size={40} />
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{r.author ? `${r.author} 様` : 'お客様'}</span>
                                <span style={{ fontSize: 11, color: MW.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.productName}</span>
                            </span>
                        </div>
                    </a>
                ))}
            </Row>
        </section>
    );
}

function MobileCta() {
    const navigate = useNavigate();
    const consult = () => {
        if (typeof window.openChannelTalk === 'function') window.openChannelTalk();
        else navigate('/custom-estimate');
    };
    return (
        <section style={{ margin: '48px 16px 0', borderRadius: 24, padding: '26px 22px', background: `radial-gradient(260px 180px at 100% 0%,rgba(39,171,143,0.2),rgba(39,171,143,0) 70%),${MW.mintBg}`, border: `1px solid ${MW.mintTint}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={eyebrow}>CUSTOM TOUR</span>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, lineHeight: 1.45 }}>あなただけの特別なプランを、1分でリクエスト</h2>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: MW.mute }}>日本語スタッフが24時間以内にご返信。お見積もりは無料です。</p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => navigate('/custom-estimate')} style={{ height: 50, border: 0, borderRadius: 999, background: MW_GRADIENT, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: MW.navy, cursor: 'pointer' }}>お見積もり</button>
                <button type="button" onClick={consult} style={{ height: 50, borderRadius: 999, border: `1.5px solid ${MW.navy}`, background: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: MW.navy, cursor: 'pointer' }}>相談</button>
            </div>
        </section>
    );
}

function SectionHead({ en, title, more, onMore }: { en: string; title: string; more: string; onMore: () => void }) {
    return (
        <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={eyebrow}>{en}</span>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, lineHeight: 1.35 }}>{title}</h2>
            </div>
            <button type="button" onClick={onMore} style={{ border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: MW.navy, padding: '8px 0', whiteSpace: 'nowrap', cursor: 'pointer' }}>{more}</button>
        </div>
    );
}

function Row({ children, pad = '18px 16px 0' }: { children: ReactNode; pad?: string }) {
    return <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', padding: pad, scrollPadding: '0 16px' }}>{children}</div>;
}

function Photo({ src, alt }: { src: string; alt: string }) {
    if (!src) return null;
    return <img src={src} alt={alt} loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
}

/** PREMIUM / STANDARD from the admin's 여행 타입; hidden when unset. */
function TypeBadge({ p }: { p: HomeProduct }) {
    if (!p.packageType) return null;
    const full = p.packageType === 'full';
    return (
        <span style={{ position: 'absolute', left: 8, bottom: 8, fontFamily: MW_FONT_EN, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 7px', borderRadius: 999, background: full ? MW.mintDeep : 'rgba(255,255,255,0.92)', color: full ? '#FFFFFF' : MW.mintDeep, pointerEvents: 'none' }}>
            {full ? 'PREMIUM' : 'STANDARD'}
        </span>
    );
}

function Heart({ p, size }: { p: HomeProduct; size: number }) {
    const wishlist = useWishlist();
    const on = wishlist.has(p.id);
    return (
        <button
            type="button"
            aria-label={on ? 'お気に入りから削除' : 'お気に入りに追加'}
            aria-pressed={on}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); wishlist.toggle(p); }}
            style={{ position: 'absolute', right: 6, top: 6, width: size, height: size, border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
            <svg width="17" height="17" viewBox="0 0 24 24" fill={on ? MW.red : 'none'} stroke={on ? MW.red : MW.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
            </svg>
        </button>
    );
}

const eyebrow: CSSProperties = { fontFamily: MW_FONT_EN, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep };
const heroTitle: CSSProperties = { margin: 0, maxWidth: '100%', fontSize: 'clamp(17px,5.2vw,23px)', fontWeight: 900, lineHeight: 1.4, letterSpacing: '-0.01em', whiteSpace: 'pre-line', wordBreak: 'keep-all', overflowWrap: 'anywhere', textShadow: '0 2px 12px rgba(10,31,46,0.35)' };
