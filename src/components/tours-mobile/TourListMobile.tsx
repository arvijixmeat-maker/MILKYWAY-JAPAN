import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHomeData } from '../../hooks/useHomeData';
import { useModalLayer } from '../../hooks/useModalLayer';
import { MW, MW_FONT, MW_FONT_EN, MW_GRADIENT, yen } from '../desktop-primitives/mwTokens';
import { categoryImage, discountPct, inCategory, isPublished, useHomeReviews, type HomeProduct } from '../home-desktop/homeDesktopData';
import { img } from '../home-mobile/mobileImage';
import { Heart, Photo, TypeBadge } from '../home-mobile/mobileParts';
import { TOUR_SORTS, TRIP_TYPES, matchesQuery, quotePathFor, sortTours, tripType, type TourSort } from '../../utils/tourList';

interface Filters {
    days: string[];
    prices: string[];
    perks: string[];
}
type FilterKey = keyof Filters;

const NO_FILTERS: Filters = { days: [], prices: [], perks: [] };

const PRICE_BANDS = [
    { key: 'p1', label: '〜¥100,000', hint: 'お手頃な3〜4泊プラン', test: (p: HomeProduct) => p.price < 100000 },
    { key: 'p2', label: '¥100,000〜¥150,000', hint: '温泉・砂漠を満喫する定番', test: (p: HomeProduct) => p.price >= 100000 && p.price < 150000 },
    { key: 'p3', label: '¥150,000〜', hint: 'ゴビ砂漠・長期周遊', test: (p: HomeProduct) => p.price >= 150000 },
];

// Perks map to the admin's 인기 / 추천 flags; a perk no tour carries is not offered.
const PERKS = [
    { key: 'best', tag: 'BEST', label: '人気No.1クラス', chip: 'BEST', hint: '予約数・満足度が特に高いツアー', has: (p: HomeProduct) => !!p.isPopular, tagBg: MW.red, tagBd: MW.red, tagFg: '#FFFFFF' },
    { key: 'pick', tag: 'おすすめ', label: 'スタッフおすすめ', chip: 'スタッフおすすめ', hint: '現地スタッフが自信を持って推薦', has: (p: HomeProduct) => !!p.isFeatured, tagBg: '#FFFFFF', tagBd: '#F3C7C2', tagFg: MW.redDeep },
];

const matchesFilters = (p: HomeProduct, f: Filters) =>
    (!f.days.length || f.days.includes(p.duration)) &&
    (!f.prices.length || PRICE_BANDS.some((b) => f.prices.includes(b.key) && b.test(p))) &&
    f.perks.every((k) => PERKS.find((x) => x.key === k)?.has(p));

/** "4泊5日" → ["4泊", "5日"], ordered by nights. */
const splitDays = (d: string) => {
    const m = d.match(/^(\d+泊)(\d+日)$/);
    return m ? [m[1], m[2]] : [d, ''];
};
const nights = (d: string) => parseInt(d, 10) || 99;

/** Mobile tour list (Claude Design "Milkyway Japan Mobile" · M Tours + M Filter Sheet). */
export function TourListMobile() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { data, isLoading } = useHomeData();
    const { stats } = useHomeReviews();
    const { categories } = data;
    const products = useMemo(() => data.products.filter(isPublished), [data.products]);

    const query = (params.get('q') || '').trim();
    const cat = params.get('category') || 'all';
    const currentCat = categories.find((c) => c.id === cat);
    const [type, setType] = useState('');
    const [sort, setSort] = useState<TourSort>('rec');
    const [filters, setFilters] = useState<Filters>(NO_FILTERS);
    const [sheetOpen, setSheetOpen] = useState(false);

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        setParams(next, { replace: true });
    };

    // Destination, trip type and search narrow the list; the sheet filters apply on top.
    const base = useMemo(
        () => products.filter((p) => (!currentCat || inCategory(p, currentCat)) && (!type || p.packageType === type) && matchesQuery(p, query)),
        [products, currentCat, type, query],
    );
    const items = useMemo(() => sortTours(base.filter((p) => matchesFilters(p, filters)), sort, stats), [base, filters, sort, stats]);

    /** How many tours the list would show if option `v` of group `k` were picked. */
    const countWith = (k: FilterKey, v: string) => {
        const f = { ...filters, [k]: k === 'perks' ? [...new Set([...filters.perks, v])] : [v] };
        return base.filter((p) => matchesFilters(p, f)).length;
    };
    const toggle = (k: FilterKey, v: string) =>
        setFilters((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

    const dayOpts = useMemo(() => [...new Set(products.map((p) => p.duration).filter(Boolean))].sort((a, b) => nights(a) - nights(b)), [products]);
    const perkOpts = PERKS.filter((k) => products.some(k.has));
    const active = filters.days.length + filters.prices.length + filters.perks.length;
    const chips = [
        ...filters.days.map((d) => ({ key: `d-${d}`, label: d, onClick: () => toggle('days', d) })),
        ...filters.prices.map((k) => ({ key: `p-${k}`, label: PRICE_BANDS.find((b) => b.key === k)?.label || k, onClick: () => toggle('prices', k) })),
        ...filters.perks.map((k) => ({ key: `k-${k}`, label: PERKS.find((x) => x.key === k)?.chip || k, onClick: () => toggle('perks', k) })),
    ];

    const dests = [
        { id: 'all', label: 'すべて', image: products.find((p) => p.mainImages[0])?.mainImages[0] },
        ...categories.map((c) => ({ id: c.id, label: c.name, image: categoryImage(c) || products.find((p) => inCategory(p, c) && p.mainImages[0])?.mainImages[0] })),
    ];

    const selectedType = tripType(type);
    const quotePath = quotePathFor(type);
    const resetAll = () => {
        setType('');
        setFilters(NO_FILTERS);
        setParams({}, { replace: true });
    };

    return (
        <section style={{ padding: '16px 0 0', fontFamily: MW_FONT, color: MW.navy }}>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ ...eyebrow, marginTop: 10 }}>TOURS</span>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, lineHeight: 1.3 }}>モンゴルツアー商品一覧</h1>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: MW.mute }}>
                    モンゴル乗馬旅行、ゴビ砂漠ツアー、テレルジ国立公園など、地域・テーマ別にモンゴルツアーをお探しいただけます。
                </p>
                {query && (
                    <button type="button" onClick={() => setParam('q', '')} aria-label={`検索「${query}」を解除`} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, height: 34, marginTop: 6, padding: '0 12px', border: 0, borderRadius: 999, background: MW.navy, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
                        検索：{query}
                        <span aria-hidden="true" style={{ color: MW.mintLight }}>×</span>
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, padding: '20px 16px 0' }}>
                {TRIP_TYPES.map((t) => {
                    const on = type === t.key;
                    const full = t.dark;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setType(on ? '' : t.key)}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: 8,
                                padding: '16px 10px',
                                minWidth: 0,
                                overflow: 'hidden',
                                borderRadius: 18,
                                border: `1.5px solid ${on ? MW.navy : full ? MW.mintDeep : MW.mintTint}`,
                                background: full ? 'linear-gradient(160deg,#1C8571 0%,#27AB8F 50%,#3FC2A4 100%)' : 'linear-gradient(160deg,#F1FCF8 0%,#FFFFFF 100%)',
                                boxShadow: on ? '0 8px 20px rgba(10,31,46,0.14)' : 'none',
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: full ? '#FFFFFF' : MW.navy,
                            }}
                        >
                            <span style={{ fontFamily: MW_FONT_EN, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
                                Milkyway<span style={{ color: full ? '#FFFFFF' : MW.mint }}>.</span>
                            </span>
                            <span style={{ fontFamily: MW_FONT_EN, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 999, background: full ? 'rgba(255,255,255,0.22)' : MW.mintTint, color: full ? '#FFFFFF' : MW.mintDeep }}>
                                {t.tier}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 900, marginTop: 4 }}>{t.label}</span>
                            <span style={{ fontSize: 'clamp(8px,2.4vw,9.5px)', lineHeight: 1.5, fontWeight: 700, letterSpacing: '-0.04em', whiteSpace: 'nowrap', color: full ? MW.mintTint : MW.ink3 }}>{t.sub}</span>
                            {on && (
                                <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: 10, width: 20, height: 20, borderRadius: '50%', background: MW.navy, color: '#FFFFFF', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div role="tablist" aria-label="行き先" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '16px 16px 2px' }}>
                {dests.map((d) => {
                    const on = d.id === (currentCat ? cat : 'all');
                    const src = img(d.image, 'thumbnailSmall');
                    return (
                        <button
                            key={d.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => setParam('category', d.id === 'all' ? '' : d.id)}
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 14px 0 4px', borderRadius: 999, border: `1px solid ${on ? MW.navy : MW.line}`, background: on ? MW.navy : '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: on ? '#FFFFFF' : MW.navy, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            <span style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: MW.mintTint }}>
                                {src && <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                                {on && (
                                    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(10,31,46,0.45)', color: '#FFFFFF', fontSize: 14, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                                )}
                            </span>
                            {d.label}
                        </button>
                    );
                })}
            </div>

            <div style={{ position: 'sticky', top: 'var(--mw-mheader-h, 0px)', zIndex: 10, background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 16px', borderTop: `1px solid ${MW.line3}`, borderBottom: `1px solid ${MW.line3}` }}>
                <span style={{ fontSize: 13, color: MW.mute, whiteSpace: 'nowrap' }}>
                    <strong style={{ fontFamily: MW_FONT_EN, fontSize: 15, fontWeight: 600, color: MW.navy }}>{items.length}</strong> 件のツアー
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        aria-haspopup="dialog"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${active ? MW.mint : MW.line}`, background: active ? MW.mintBg : '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: MW.navy, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MW.navy} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M4 6h16M7 12h10M10 18h4" />
                        </svg>
                        絞り込み
                        {active > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', borderRadius: 999, background: MW.mint, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{active}</span>}
                    </button>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as TourSort)}
                        aria-label="並び替え"
                        style={{ height: 38, padding: '0 10px', border: `1px solid ${MW.line}`, borderRadius: 999, background: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: MW.navy }}
                    >
                        {TOUR_SORTS.map((o) => (
                            <option key={o.id} value={o.id}>{o.short}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading && !products.length ? (
                <div aria-hidden="true" style={grid}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ aspectRatio: '1/1', borderRadius: 18, background: MW.chip }} />
                            <div style={{ height: 12, width: '60%', borderRadius: 6, background: MW.chip }} />
                            <div style={{ height: 14, borderRadius: 6, background: MW.chip }} />
                        </div>
                    ))}
                </div>
            ) : items.length > 0 ? (
                <div style={grid}>
                    {items.map((p) => (
                        <TourCard key={p.id} p={p} />
                    ))}
                </div>
            ) : (
                <div style={{ margin: '18px 16px 0', padding: '44px 20px', border: `1px dashed ${MW.line2}`, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                        {selectedType && products.every((p) => p.packageType !== type) ? `「${selectedType.label}」のツアーは準備中です` : '条件に合うツアーが見つかりませんでした'}
                    </span>
                    <span style={{ fontSize: 12, color: MW.mute }}>ご希望に合わせたプランは、お見積もりでご相談ください。</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                        <button type="button" onClick={resetAll} style={{ height: 44, padding: '0 20px', border: `1px solid ${MW.line}`, borderRadius: 999, background: '#FFFFFF', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: MW.navy, cursor: 'pointer' }}>
                            条件をリセット
                        </button>
                        <a href={quotePath} onClick={(e) => { e.preventDefault(); navigate(quotePath); }} style={{ display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 20px', borderRadius: 999, background: MW_GRADIENT, fontSize: 14, fontWeight: 700, color: MW.navy, textDecoration: 'none' }}>
                            お見積もり
                        </a>
                    </div>
                </div>
            )}

            {sheetOpen && (
                <FilterSheet
                    count={items.length}
                    active={active}
                    chips={chips}
                    onClose={() => setSheetOpen(false)}
                    onReset={() => setFilters(NO_FILTERS)}
                >
                    <Group title="日程" note="複数選択可">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6 }}>
                            {dayOpts.map((d) => {
                                const on = filters.days.includes(d);
                                const n = countWith('days', d);
                                const [big, small] = splitDays(d);
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        aria-pressed={on}
                                        aria-label={`${d}（${n}件）`}
                                        disabled={!n && !on}
                                        onClick={() => toggle('days', d)}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, height: 68, padding: 0, borderRadius: 14, border: `1.5px solid ${on ? MW.mint : MW.line}`, background: on ? MW.mintTint : '#FFFFFF', fontFamily: 'inherit', color: on ? MW.mintDeep : MW.navy, cursor: 'pointer', opacity: !n && !on ? 0.4 : 1 }}
                                    >
                                        <span style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1 }}>{big}</span>
                                        {small && <span style={{ fontSize: 11, fontWeight: 700 }}>{small}</span>}
                                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 9, fontWeight: 600, color: on ? MW.mintDeep : MW.mute2, marginTop: 2 }}>{n}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Group>
                    <Group title="料金" note="お一人様">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {PRICE_BANDS.map((b) => {
                                const on = filters.prices.includes(b.key);
                                const n = countWith('prices', b.key);
                                return (
                                    <button
                                        key={b.key}
                                        type="button"
                                        aria-pressed={on}
                                        disabled={!n && !on}
                                        onClick={() => toggle('prices', b.key)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 16px', borderRadius: 14, border: `1.5px solid ${on ? MW.mint : MW.line}`, background: on ? MW.mintBg : '#FFFFFF', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', opacity: !n && !on ? 0.4 : 1 }}
                                    >
                                        <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${on ? MW.mint : '#C9D0CD'}`, background: on ? MW.mint : '#FFFFFF', boxSizing: 'border-box', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: MW.navy }}>
                                            {on ? '✓' : ''}
                                        </span>
                                        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: MW.navy }}>{b.label}</span>
                                            <span style={{ fontSize: 11, color: MW.mute }}>{b.hint}</span>
                                        </span>
                                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, color: on ? MW.mintDeep : MW.mute2 }}>{n}件</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Group>
                    {perkOpts.length > 0 && (
                        <Group title="特典">
                            {perkOpts.map((k) => {
                                const on = filters.perks.includes(k.key);
                                return (
                                    <button
                                        key={k.key}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => toggle('perks', k.key)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '8px 0', border: 0, background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                                    >
                                        <span style={{ flexShrink: 0, minWidth: 64, height: 24, padding: '0 8px', boxSizing: 'border-box', borderRadius: 6, background: k.tagBg, border: `1px solid ${k.tagBd}`, color: k.tagFg, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k.tag}</span>
                                        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: MW.navy }}>{k.label}</span>
                                            <span style={{ fontSize: 11, color: MW.mute }}>{k.hint}</span>
                                        </span>
                                        <span aria-hidden="true" style={{ flexShrink: 0, width: 46, height: 28, borderRadius: 999, background: on ? MW.mint : MW.line2, position: 'relative', transition: 'background .2s' }}>
                                            <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(10,31,46,0.25)', transition: 'left .2s' }} />
                                        </span>
                                    </button>
                                );
                            })}
                        </Group>
                    )}
                </FilterSheet>
            )}
        </section>
    );
}

function TourCard({ p }: { p: HomeProduct }) {
    const navigate = useNavigate();
    const off = discountPct(p);
    return (
        <a href={`/products/${p.id}`} onClick={(e) => { e.preventDefault(); navigate(`/products/${p.id}`); }} style={{ display: 'flex', flexDirection: 'column', gap: 5, color: MW.navy, minWidth: 0, textDecoration: 'none' }}>
            <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 18, overflow: 'hidden', background: MW.chip, marginBottom: 6 }}>
                <Photo src={img(p.mainImages[0], 'productThumbnail')} alt={`${p.name}｜${p.category}`} />
                <Heart p={p} size={36} />
                <TypeBadge p={p} />
            </div>
            <span style={{ fontSize: 11, color: MW.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.category}
                {p.category && p.duration && <span style={{ color: '#C9D0CD' }}> ｜ </span>}
                {p.duration}
            </span>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</h2>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                {off > 0 && <span style={{ fontSize: 13, fontWeight: 900, color: MW.red }}>{off}%OFF</span>}
                <span style={{ fontSize: 15, fontWeight: 900 }}>{yen(p.price)}〜</span>
            </span>
        </a>
    );
}

interface SheetProps {
    count: number;
    active: number;
    chips: { key: string; label: string; onClick: () => void }[];
    onClose: () => void;
    onReset: () => void;
    children: ReactNode;
}

function FilterSheet({ count, active, chips, onClose, onReset, children }: SheetProps) {
    useModalLayer(onClose);

    return (
        <div role="dialog" aria-modal="true" aria-label="絞り込み" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', fontFamily: MW_FONT, color: MW.navy }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,31,46,0.45)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '82vh', background: '#FFFFFF', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
                    <span style={{ width: 40, height: 4, borderRadius: 999, background: MW.line2 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 12px' }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 900 }}>絞り込み</span>
                        {active > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: MW.mintDeep }}>{active}件の条件</span>}
                    </span>
                    <button type="button" onClick={onClose} aria-label="閉じる" autoFocus style={{ width: 44, height: 44, marginRight: -10, border: 0, background: 'transparent', fontSize: 22, color: MW.navy, cursor: 'pointer' }}>×</button>
                </div>
                {chips.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 16px 12px' }}>
                        {chips.map((c) => (
                            <button key={c.key} type="button" onClick={c.onClick} aria-label={`${c.label}を解除`} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px 0 12px', border: 0, borderRadius: 999, background: MW.navy, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {c.label}
                                <span aria-hidden="true" style={{ fontSize: 13, color: MW.mintLight }}>×</span>
                            </button>
                        ))}
                    </div>
                )}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, padding: '12px 16px calc(14px + env(safe-area-inset-bottom))', borderTop: `1px solid ${MW.line3}` }}>
                    <button type="button" onClick={onReset} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, border: `1px solid ${MW.line}`, borderRadius: 999, background: '#FFFFFF', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: active ? MW.navy : MW.mute2, cursor: 'pointer' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 12a8 8 0 102.3-5.7M4 4v4h4" />
                        </svg>
                        リセット
                    </button>
                    <button type="button" onClick={onClose} disabled={!count} style={{ height: 52, border: 0, borderRadius: 999, background: count ? MW_GRADIENT : MW.chip, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: count ? MW.navy : MW.mute2, cursor: count ? 'pointer' : 'default' }}>
                        {count ? `${count}件のツアーを表示` : '該当するツアーがありません'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0 20px', borderTop: `1px solid ${MW.line3}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 15, fontWeight: 900 }}>{title}</span>
                {note && <span style={{ fontSize: 12, color: MW.mute2 }}>{note}</span>}
            </div>
            {children}
        </div>
    );
}

const eyebrow: CSSProperties = { fontFamily: MW_FONT_EN, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '24px 12px', padding: '18px 16px 0' };
