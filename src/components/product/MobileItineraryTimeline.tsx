import React, { useEffect, useMemo, useState } from 'react';
import { getOptimizedImageUrl } from '../../utils/cloudflareImage';
import type { TourProduct, DetailSlide, DividerContent, DayInfoContent, TimelineContent } from '../../types/product';

interface ItineraryBlock {
    id?: string;
    type: string;
    content: unknown;
}

interface DayGroup {
    dayInfo: ItineraryBlock;
    events: ItineraryBlock[];
}

/**
 * True when a dayInfo/timeline block has any user-entered content.
 * Mirrors the same helper in ProductDetailDesktop so PC + mobile agree on
 * which blocks count as "meaningful" and which are stale leftovers.
 */
function isMeaningful(b: ItineraryBlock): boolean {
    if (b.type === 'image' || b.type === 'slide' || b.type === 'divider') return true;
    if (b.type === 'dayInfo') {
        const c = b.content as DayInfoContent | undefined;
        if (!c) return false;
        const hasMeals = !!(c.meals?.breakfast || c.meals?.lunch || c.meals?.dinner);
        return !!(c.title || c.description || c.accommodation || hasMeals);
    }
    if (b.type === 'timeline') {
        const c = b.content as TimelineContent | undefined;
        if (!c) return false;
        const hasImages = Array.isArray((c as { images?: unknown }).images)
            && ((c as { images: unknown[] }).images.length > 0);
        return !!(c.title || c.description || c.time || hasImages);
    }
    return false;
}

function groupBlocksByDay(blocks: ItineraryBlock[]): { preBlocks: ItineraryBlock[]; days: DayGroup[] } {
    const days: DayGroup[] = [];
    const preBlocks: ItineraryBlock[] = [];
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

const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
};

/**
 * Mobile-friendly timeline view of a product's itinerary. Matches the visual
 * design the admin showed in their reference: left vertical line with dots,
 * right column with title/description/image grid. Adapts to narrow screens
 * with smaller spine column (24px) and stacked image grids.
 *
 * Falls back to the legacy flat rendering when the product has no dayInfo
 * blocks (image-only products).
 */
export const MobileItineraryTimeline: React.FC<{ product: TourProduct }> = ({ product }) => {
    const rawBlocks = (product.itineraryBlocks ?? []).filter(isMeaningful) as ItineraryBlock[];
    const legacyImages = product.itineraryImages ?? [];

    // Tap-to-zoom lightbox state. Each timeline spot card now shows max 2
    // images; tapping any opens this fullscreen viewer at the chosen index.
    const [lightbox, setLightbox] = useState<{ images: string[]; startIndex: number } | null>(null);
    const openImages = (images: string[], startIndex: number) => setLightbox({ images, startIndex });

    const { preBlocks, days } = useMemo(() => {
        const grouped = groupBlocksByDay(rawBlocks);
        // Same defensive merge as PC: admin who creates timeline blocks
        // *before* adding a dayInfo would otherwise see orphan images at the
        // top with the day header below. Almost never the intent.
        if (grouped.preBlocks.length > 0 && grouped.days.length > 0) {
            const adjustedDays = [...grouped.days];
            adjustedDays[0] = {
                dayInfo: adjustedDays[0].dayInfo,
                events: [...grouped.preBlocks, ...adjustedDays[0].events],
            };
            return { preBlocks: [] as ItineraryBlock[], days: adjustedDays };
        }
        return grouped;
    }, [rawBlocks]);

    // 1) Empty → placeholder
    if (rawBlocks.length === 0 && legacyImages.length === 0) {
        return (
            <div className="px-6 py-10 mx-6 my-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-center text-sm text-gray-500">
                行程詳細は近日公開予定です。
            </div>
        );
    }

    // 2) Legacy itineraryImages only
    if (rawBlocks.length === 0 && legacyImages.length > 0) {
        return (
            <div className="space-y-0">
                {legacyImages.map((img, i) => (
                    <img
                        key={i}
                        src={getOptimizedImageUrl(img, 'productItinerary')}
                        alt={`${product.name} 行程${i + 1}｜モンゴル旅行・モンゴルツアー`}
                        className="w-full h-auto"
                        loading="lazy"
                        decoding="async"
                        onError={hideBroken}
                    />
                ))}
            </div>
        );
    }

    // 3) No dayInfo grouping — render flat (image-only / slide-only products)
    if (days.length === 0) {
        return (
            <div className="space-y-8 pb-8">
                {preBlocks.map((b, i) => (
                    <FlatBlock
                        key={b.id || i}
                        block={b}
                        productName={product.name}
                    />
                ))}
            </div>
        );
    }

    // 4) Has dayInfo blocks → tabbed timeline
    return (
        <div>
            <DayTabs days={days} />
            {preBlocks.length > 0 && (
                <div className="space-y-8 mb-6">
                    {preBlocks.map((b, i) => (
                        <FlatBlock key={b.id || i} block={b} productName={product.name} />
                    ))}
                </div>
            )}
            {days.map((day, i) => (
                <DaySection
                    key={day.dayInfo.id || i}
                    day={day}
                    dayIndex={i}
                    productName={product.name}
                    onOpenImages={openImages}
                />
            ))}
            {lightbox && (
                <MobileLightbox
                    images={lightbox.images}
                    startIndex={lightbox.startIndex}
                    onClose={() => setLightbox(null)}
                />
            )}
        </div>
    );
};

// ─── Day tabs (sticky horizontal nav) ─────────────────────────────────
function DayTabs({ days }: { days: DayGroup[] }) {
    if (days.length === 0) return null;
    const jump = (idx: number) => {
        const el = document.getElementById(`mob-day-${idx + 1}`);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
    };
    return (
        <div className="sticky top-16 z-30 -mx-6 mb-6 px-6 py-2 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                {days.map((d, i) => {
                    const c = d.dayInfo.content as DayInfoContent | undefined;
                    const label = (c?.dayLabel || `${i + 1}日目`).replace(/（.*?）/, '');
                    return (
                        <button
                            key={d.dayInfo.id || i}
                            type="button"
                            onClick={() => jump(i)}
                            className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all"
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── One day section (header bar + events + hotel + meals) ────────────
function DaySection({
    day,
    dayIndex,
    productName,
    onOpenImages,
}: {
    day: DayGroup;
    dayIndex: number;
    productName: string;
    onOpenImages?: (images: string[], startIndex: number) => void;
}) {
    const c = day.dayInfo.content as DayInfoContent | undefined;
    const dayLabel = (c?.dayLabel || `${dayIndex + 1}日目`).replace(/（.*?）/, '');
    const dayDate = c?.dayDate?.trim();
    const headerRight = dayDate || c?.title?.trim() || c?.dayLabel || '';

    const meals: { k: string; v: string }[] = [];
    if (c?.meals?.breakfast) meals.push({ k: '朝食', v: c.meals.breakfast });
    if (c?.meals?.lunch) meals.push({ k: '昼食', v: c.meals.lunch });
    if (c?.meals?.dinner) meals.push({ k: '夕食', v: c.meals.dinner });
    const accommodation = c?.accommodation;

    const hasDayHeader = !!(c?.title || c?.description);

    return (
        <section
            id={`mob-day-${dayIndex + 1}`}
            className="mb-8"
            style={{ scrollMarginTop: 100 }}
        >
            {/* Day header — mirrors PC: teal left accent + DAY NN eyebrow
                + bold title underneath. Cleaner than the previous gray bar
                + white chip. */}
            <div className="mb-5 pl-3 border-l-[3px] border-primary">
                <div className="text-[11px] font-bold tracking-widest text-primary uppercase mb-1">
                    DAY {String(dayIndex + 1).padStart(2, '0')}
                    {dayLabel && (
                        <span className="ml-2 text-gray-400 dark:text-gray-500 normal-case font-semibold tracking-normal">
                            {dayLabel}
                        </span>
                    )}
                </div>
                <div className="text-[18px] font-bold text-gray-900 dark:text-white leading-snug">
                    {headerRight || `${dayIndex + 1}日目の行程`}
                </div>
                {dayDate && c?.title && dayDate !== c.title && (
                    <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        {c.title}
                    </div>
                )}
            </div>

            {/* Spine area — same alignment trick as PC: line at the *center*
                of the 32px icon column inside each row's `grid-cols-[32px_1fr]`
                layout. NO padding-left on this container, otherwise the line
                drifts and stops threading through the icons. */}
            <div className="relative">
                <div
                    className="absolute left-[15px] top-1 bottom-1 w-0.5 bg-gray-300 dark:bg-gray-600"
                    aria-hidden
                />

                {/* Synthetic dayInfo header (when admin filled title/description) */}
                {hasDayHeader && (
                    <LocationHeaderRow
                        title={c?.title || ''}
                        description={c?.description || ''}
                    />
                )}

                {/* Events */}
                {day.events.map((b, i) => (
                    <EventRow key={b.id || i} block={b} index={i} productName={productName} onOpenImages={onOpenImages} />
                ))}

                {/* Accommodation */}
                {accommodation && (
                    <SpineRow icon="bed">
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-bold text-gray-700 dark:text-gray-200">
                                    予定
                                </span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {accommodation}
                                </span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">
                                * 宿泊先は出発1日前までにご案内します。
                            </div>
                        </div>
                    </SpineRow>
                )}

                {/* Meals */}
                {meals.length > 0 && (
                    <SpineRow icon="restaurant_menu">
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-4 flex-wrap text-[12px]">
                            {meals.map((m, i) => (
                                <span key={i}>
                                    <span className="font-bold text-primary">[{m.k}]</span>{' '}
                                    <span className="text-gray-700 dark:text-gray-200 font-semibold">{m.v}</span>
                                </span>
                            ))}
                        </div>
                    </SpineRow>
                )}
            </div>
        </section>
    );
}

// Region/city header row inline with spine — same small teal dot as the
// regular SpineRow events so the timeline reads as a unified series. Centered
// in the 32px icon column to match the spine line at x=16.
function LocationHeaderRow({ title, description }: { title: string; description: string }) {
    return (
        <div className="grid grid-cols-[32px_1fr] gap-3 mb-5 last:mb-0">
            <div className="flex items-start justify-center pt-2 relative z-10">
                <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-background-dark" />
            </div>
            <div className="pt-1">
                {title && (
                    <div className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug">
                        {title}
                    </div>
                )}
                {description && (
                    <div className="text-[13px] text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed whitespace-pre-wrap">
                        {description}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Generic spine row (icon column + content) ────────────────────────
// Layout matches LocationHeaderRow: grid-cols-[32px_1fr]. The 32px column
// centers its icon at x=16, which is exactly where the spine line sits.
function SpineRow({
    icon,
    children,
}: {
    /** When set, render an outlined circle with this material icon (hotel/meals). Otherwise a small red dot. */
    icon?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-[32px_1fr] gap-3 mb-5 last:mb-0">
            <div
                className="flex justify-center relative z-10"
                style={{ paddingTop: icon ? 12 : 8 }}
            >
                {icon ? (
                    <span
                        className="w-6 h-6 rounded-full bg-white dark:bg-background-dark border border-gray-300 dark:border-gray-600 flex items-center justify-center"
                    >
                        <span
                            className="material-symbols-outlined text-gray-500 dark:text-gray-400"
                            style={{ fontSize: 13 }}
                        >
                            {icon}
                        </span>
                    </span>
                ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-background-dark" />
                )}
            </div>
            <div>{children}</div>
        </div>
    );
}

// ─── One event under a day ────────────────────────────────────────────
function EventRow({
    block,
    index,
    productName,
    onOpenImages,
}: {
    block: ItineraryBlock;
    index: number;
    productName: string;
    onOpenImages?: (images: string[], startIndex: number) => void;
}) {
    if (block.type === 'divider') {
        const div = block.content as DividerContent;
        return (
            <div
                className="ml-0 my-3"
                style={{ height: typeof div.height === 'number' ? div.height / 2 : 12 }}
                aria-hidden
            />
        );
    }

    if (block.type === 'image') {
        const url = typeof block.content === 'string' ? block.content : '';
        if (!url) return null;
        return (
            <SpineRow>
                <img
                    src={getOptimizedImageUrl(url, 'productItinerary')}
                    alt={`${productName} 行程${index + 1}｜モンゴル旅行`}
                    loading="lazy"
                    decoding="async"
                    onError={hideBroken}
                    className="w-full h-auto rounded-xl"
                />
            </SpineRow>
        );
    }

    if (block.type === 'slide') {
        const slide = block.content as DetailSlide;
        return (
            <SpineRow>
                {slide.title && (
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{slide.title}</h4>
                )}
                <div className="flex overflow-x-auto gap-2 pb-2 snap-x snap-mandatory scrollbar-hide -mx-2 px-2">
                    {(slide.images || []).map((img, i) => (
                        <div key={i} className="relative shrink-0 w-[85%] snap-center">
                            <img
                                src={getOptimizedImageUrl(img, 'productThumbnail')}
                                alt={`${slide.title || productName} ${i + 1}｜モンゴル旅行・モンゴルツアー`}
                                loading="lazy"
                                decoding="async"
                                onError={hideBroken}
                                className="w-full h-auto rounded-xl shadow-sm"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                                {i + 1} / {(slide.images || []).length}
                            </div>
                        </div>
                    ))}
                </div>
                {slide.description && (
                    <p className="text-[13px] text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                        {slide.description}
                    </p>
                )}
            </SpineRow>
        );
    }

    if (block.type === 'timeline') {
        const c = block.content as TimelineContent & { images?: unknown };
        const imgs = Array.isArray(c.images)
            ? (c.images as unknown[]).filter((x): x is string => typeof x === 'string')
            : [];

        // No images = location header (region/city + notes, no card chrome).
        if (imgs.length === 0) {
            return (
                <LocationHeaderRow
                    title={c.title || ''}
                    description={c.description || ''}
                />
            );
        }

        // Has images = spot card (bordered white card with photos).
        return (
            <SpineRow>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        {c.title && (
                            <h4 className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug">
                                {c.title}
                            </h4>
                        )}
                        <span className="shrink-0 text-[11px] text-gray-400 font-semibold inline-flex items-center gap-0.5 whitespace-nowrap">
                            詳細
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>arrow_forward</span>
                        </span>
                    </div>
                    {c.time && (
                        <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-3 leading-snug">
                            {c.time}
                        </div>
                    )}
                    {(() => {
                        const visible = imgs.slice(0, 2);
                        const remaining = imgs.length - visible.length;
                        return (
                            <div className={`grid gap-1.5 ${visible.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {visible.map((src, i) => {
                                    const isLastVisible = i === visible.length - 1;
                                    const showMoreBadge = isLastVisible && remaining > 0;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (onOpenImages) onOpenImages(imgs, i);
                                            }}
                                            className="relative p-0 border-0 bg-transparent block w-full cursor-pointer"
                                            aria-label={`${c.title || '画像'} ${i + 1}枚目を拡大`}
                                        >
                                            <img
                                                src={getOptimizedImageUrl(src, visible.length === 1 ? 'productItinerary' : 'productThumbnail')}
                                                alt={`${c.title || productName} ${i + 1}｜モンゴル旅行・モンゴルツアー`}
                                                loading="lazy"
                                                decoding="async"
                                                onError={hideBroken}
                                                className={`w-full ${visible.length === 1 ? 'aspect-[16/9]' : 'aspect-[4/3]'} object-cover rounded-lg pointer-events-none`}
                                            />
                                            {showMoreBadge && (
                                                <>
                                                    <div className="absolute left-0 right-0 bottom-0 h-1/2 rounded-lg pointer-events-none"
                                                         style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />
                                                    <div className="absolute right-2 bottom-2 bg-black/65 text-white px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm border border-white/20 inline-flex items-center gap-1 pointer-events-none">
                                                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add_photo_alternate</span>
                                                        +{remaining}
                                                    </div>
                                                </>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}
                    {c.description && (
                        <p className="text-[13px] text-gray-700 dark:text-gray-200 mt-3 leading-relaxed whitespace-pre-wrap">
                            {c.description}
                        </p>
                    )}
                </div>
            </SpineRow>
        );
    }

    return null;
}

// ─── Standalone block renderer (when there are no dayInfo blocks) ─────
function FlatBlock({ block, productName }: { block: ItineraryBlock; productName: string }) {
    if (block.type === 'image') {
        const url = typeof block.content === 'string' ? block.content : '';
        if (!url) return null;
        return (
            <img
                src={getOptimizedImageUrl(url, 'productItinerary')}
                alt={`${productName}｜モンゴル旅行・モンゴルツアー`}
                loading="lazy"
                decoding="async"
                onError={hideBroken}
                className="w-full h-auto"
            />
        );
    }
    if (block.type === 'slide') {
        const slide = block.content as DetailSlide;
        return (
            <div className="space-y-3 px-6">
                {slide.title && <h4 className="font-bold text-base">{slide.title}</h4>}
                <div className="flex overflow-x-auto pb-4 gap-3 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
                    {(slide.images || []).map((img, i) => (
                        <div key={i} className="relative shrink-0 w-[85%] snap-center">
                            <img
                                src={getOptimizedImageUrl(img, 'productThumbnail')}
                                alt={`${slide.title || productName} ${i + 1}｜モンゴル旅行・モンゴルツアー`}
                                loading="lazy"
                                decoding="async"
                                onError={hideBroken}
                                className="w-full h-auto rounded-xl shadow-sm"
                            />
                            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                                {i + 1} / {(slide.images || []).length}
                            </div>
                        </div>
                    ))}
                </div>
                {slide.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{slide.description}</p>
                )}
            </div>
        );
    }
    if (block.type === 'divider') {
        const div = block.content as DividerContent;
        return (
            <div
                className={`w-full ${div.style === 'line' ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                style={{ height: typeof div.height === 'number' ? div.height : 24 }}
            />
        );
    }
    return null;
}

// ─── Mobile fullscreen lightbox ───────────────────────────────────────
// Tap any timeline image → opens here. Supports prev/next, Escape, body
// scroll lock, thumbnail strip. Mobile-only; PC uses GalleryLightbox.
function MobileLightbox({
    images,
    startIndex,
    onClose,
}: {
    images: string[];
    startIndex: number;
    onClose: () => void;
}) {
    const [i, setI] = useState(startIndex);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setI((x) => (x + 1) % images.length);
            if (e.key === 'ArrowLeft') setI((x) => (x - 1 + images.length) % images.length);
        };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [images.length, onClose]);

    return (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={onClose}>
            <div
                className="flex items-center justify-between p-4 text-white text-sm font-semibold"
                onClick={(e) => e.stopPropagation()}
            >
                <span>{i + 1} / {images.length}</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="閉じる"
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>close</span>
                </button>
            </div>

            <div className="flex-1 flex items-center justify-center relative px-4" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    aria-label="前へ"
                    onClick={() => setI((i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center z-10"
                >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 26 }}>chevron_left</span>
                </button>
                <img
                    src={images[i]}
                    alt={`画像 ${i + 1} / ${images.length}`}
                    className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
                <button
                    type="button"
                    aria-label="次へ"
                    onClick={() => setI((i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center z-10"
                >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 26 }}>chevron_right</span>
                </button>
            </div>

            <div
                className="flex justify-center gap-2 p-4 overflow-x-auto scrollbar-hide"
                onClick={(e) => e.stopPropagation()}
            >
                {images.map((src, j) => (
                    <button
                        key={j}
                        type="button"
                        onClick={() => setI(j)}
                        aria-label={`サムネイル ${j + 1}`}
                        className={`shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-opacity ${
                            j === i ? 'border-white opacity-100' : 'border-transparent opacity-55'
                        }`}
                        style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    />
                ))}
            </div>
        </div>
    );
}
