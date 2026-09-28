import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHomeData } from '../../hooks/useHomeData';
import { useWishlist } from '../../hooks/useWishlist';
import { MW, MW_FONT_EN, MW_GRADIENT, isUsableImage, yen } from '../desktop-primitives/mwTokens';
import { FavButton } from '../home-desktop/TourTabsSection.desktop';
import { categoryImage, discountPct, inCategory, isPublished, useHomeReviews, type HomeProduct } from '../home-desktop/homeDesktopData';

type Sort = 'rec' | 'low' | 'high' | 'rating' | 'reviews';

/**
 * Trip-type cards, driven by each tour's 여행 타입 set in the admin (packageType).
 * A type with no tours yet opens the quote form with those stays preselected instead.
 */
const TRIP_TYPES = [
    { key: 'full', label: 'フルパッケージ旅行', sub: '4つ星ホテル＋デラックスゲル宿泊', tier: 'PREMIUM', stays: ['4つ星ホテル', 'デラックスゲル'], dark: true },
    { key: 'value', label: 'コスパ重視の旅行', sub: '3つ星ホテル＋スタンダードゲル宿泊', tier: 'STANDARD', stays: ['3つ星ホテル', 'スタンダードゲル'], dark: false },
];

export function TourListDesktop() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { data, isLoading } = useHomeData();
    const { stats } = useHomeReviews();
    const { categories } = data;
    const products = useMemo(() => data.products.filter(isPublished), [data.products]);

    const query = (params.get('q') || '').trim();
    const cat = params.get('category') || 'all';
    const [sort, setSort] = useState<Sort>('rec');
    const [type, setType] = useState('');

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        setParams(next, { replace: true });
    };

    const typeCount = (key: string) => products.filter((p) => p.packageType === key).length;
    const currentCat = categories.find((c) => c.id === cat);

    const items = useMemo(() => {
        const words = query.toLowerCase().split(/[\s\u3000]+/).filter(Boolean);
        const tripType = TRIP_TYPES.find((t) => t.key === type);
        const list = products.filter((p) => {
            if (currentCat && !inCategory(p, currentCat)) return false;
            if (tripType && p.packageType !== tripType.key) return false;
            if (words.length) {
                const hay = `${p.name} ${p.tags.join(' ')} ${p.category} ${p.duration}`.toLowerCase();
                if (!words.every((w) => hay.includes(w))) return false;
            }
            return true;
        });
        const rank = (p: HomeProduct) => Number(p.isPopular) * 2 + Number(p.isFeatured);
        const sorters: Record<Sort, (a: HomeProduct, b: HomeProduct) => number> = {
            rec: (a, b) => rank(b) - rank(a),
            low: (a, b) => a.price - b.price,
            high: (a, b) => b.price - a.price,
            rating: (a, b) => (stats[b.id]?.avg ?? 0) - (stats[a.id]?.avg ?? 0) || (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0),
            reviews: (a, b) => (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0),
        };
        return [...list].sort(sorters[sort]);
    }, [products, currentCat, type, query, sort, stats]);

    const dests = [
        { id: 'all', label: 'すべて', img: products.find((p) => p.mainImages[0])?.mainImages[0] || '' },
        ...categories.map((c) => ({
            id: c.id,
            label: c.name,
            img: categoryImage(c) || products.find((p) => inCategory(p, c) && p.mainImages[0])?.mainImages[0] || '',
        })),
    ];

    const onType = (t: (typeof TRIP_TYPES)[number]) => {
        if (typeCount(t.key) > 0) setType(type === t.key ? '' : t.key);
        else navigate(`/custom-estimate?stay=${encodeURIComponent(t.stays.join(','))}`);
    };

    const reset = () => {
        setType('');
        setParams({}, { replace: true });
    };

    return (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 104px', display: 'flex', flexDirection: 'column', gap: 40 }}>
            <nav aria-label="パンくずリスト" style={{ display: 'flex', gap: 8, fontSize: 13, color: MW.mute }}>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{ color: MW.mute, textDecoration: 'none' }}>ホーム</a>
                <span>›</span>
                <span style={{ color: MW.navy, fontWeight: 700 }}>ツアー商品</span>
            </nav>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: -8 }}>
                <span style={{ fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep }}>TOURS</span>
                <h1 style={{ margin: 0, fontSize: 'clamp(32px,4.2vw,48px)', fontWeight: 900, lineHeight: 1.2 }}>モンゴルツアー商品一覧</h1>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: MW.mute, maxWidth: 640 }}>
                    日本語ガイド同行、ゲル宿泊・遊牧民文化体験込みのモンゴルツアー。テーマと日程からお選びいただけます。
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 16 }}>
                {TRIP_TYPES.map((t) => {
                    const on = type === t.key;
                    const filterable = typeCount(t.key) > 0;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => onType(t)}
                            aria-pressed={filterable ? on : undefined}
                            aria-label={filterable ? undefined : `${t.label}（${t.sub}）でお見積もり`}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 16,
                                height: 96,
                                padding: '0 28px',
                                borderRadius: 18,
                                border: `2px solid ${on ? (t.dark ? MW.navy : MW.mint) : t.dark ? 'transparent' : MW.mintTint}`,
                                background: t.dark ? 'linear-gradient(180deg,#1C8571 0%,#27AB8F 45%,#3FC2A4 100%)' : 'linear-gradient(180deg,#F1FCF8 0%,#FFFFFF 100%)',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                boxShadow: on ? '0 10px 24px rgba(39,171,143,0.28)' : '0 2px 10px rgba(10,31,46,0.06)',
                                transition: 'border-color .15s,box-shadow .15s',
                            }}
                        >
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontFamily: MW_FONT_EN, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: t.dark ? '#FFFFFF' : MW.navy }}>
                                    Milkyway<span style={{ color: t.dark ? '#A3ECD6' : MW.mintDeep }}>.</span>
                                </span>
                                <span style={{ alignSelf: 'flex-start', fontFamily: MW_FONT_EN, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: t.dark ? '#FFFFFF' : MW.mintDeep, background: t.dark ? 'rgba(255,255,255,0.18)' : MW.mintTint, padding: '3px 8px', borderRadius: 999 }}>
                                    {t.tier}
                                </span>
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 900, color: t.dark ? '#FFFFFF' : MW.navy }}>
                                    {t.label}
                                    <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: '50%', background: on ? (t.dark ? '#FFFFFF' : MW.mintDeep) : 'transparent', color: t.dark ? MW.mintDeep : '#FFFFFF', fontSize: 11, fontWeight: 900, lineHeight: '20px', textAlign: 'center' }}>
                                        {filterable ? (on ? '✓' : '') : '→'}
                                    </span>
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: t.dark ? MW.mintTint : MW.ink3 }}>{t.sub}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div role="tablist" aria-label="行き先" style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 2px', margin: '-8px -2px 0' }}>
                {dests.map((d) => {
                    const on = d.id === (currentCat ? cat : 'all');
                    return (
                        <button
                            key={d.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => setParam('category', d.id === 'all' ? '' : d.id)}
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 20px 0 6px', borderRadius: 999, border: `1.5px solid ${on ? MW.navy : MW.line}`, background: on ? MW.navy : '#FFFFFF', color: on ? '#FFFFFF' : MW.navy, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}
                        >
                            <span style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: MW.mintTint }}>
                                {isUsableImage(d.img) && <img src={d.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                                {on && (
                                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(10,31,46,0.45)', color: '#fff', fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                                )}
                            </span>
                            {d.label}
                        </button>
                    );
                })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingBottom: 16, borderBottom: `1px solid ${MW.line}` }}>
                    <span style={{ fontSize: 15, color: MW.mute }}>
                        <strong style={{ fontSize: 20, fontWeight: 900, color: MW.navy }}>{items.length}</strong> 件のツアー
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: MW.mute }}>
                        並び替え
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as Sort)}
                            style={{ height: 44, padding: '0 36px 0 16px', border: `1.5px solid ${MW.line2}`, borderRadius: 999, background: '#fff', fontSize: 14, fontWeight: 700, color: MW.navy, cursor: 'pointer', appearance: 'none', fontFamily: 'inherit', backgroundImage: `linear-gradient(45deg,transparent 50%,${MW.navy} 50%),linear-gradient(135deg,${MW.navy} 50%,transparent 50%)`, backgroundPosition: 'calc(100% - 20px) 19px,calc(100% - 15px) 19px', backgroundSize: '5px 5px', backgroundRepeat: 'no-repeat' }}
                        >
                            <option value="rec">おすすめ順</option>
                            <option value="low">料金が安い順</option>
                            <option value="high">料金が高い順</option>
                            <option value="rating">評価が高い順</option>
                            <option value="reviews">レビュー数順</option>
                        </select>
                    </label>
                </div>

                {query && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -8, fontSize: 14, color: MW.mute }}>
                        <span>「<strong style={{ color: MW.navy }}>{query}</strong>」の検索結果</span>
                        <button type="button" onClick={() => setParam('q', '')} style={chipBtn}>クリア ×</button>
                    </div>
                )}
                {type && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -8 }}>
                        <button type="button" onClick={() => setType('')} style={chipBtn}>
                            {TRIP_TYPES.find((t) => t.key === type)?.label} ×
                        </button>
                    </div>
                )}

                {!isLoading && items.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,250px),1fr))', gap: '40px 20px' }}>
                        {items.map((p) => (
                            <TourCard key={p.id} p={p} />
                        ))}
                    </div>
                )}

                {!isLoading && items.length === 0 && (
                    <div style={{ borderRadius: 28, background: `linear-gradient(135deg,${MW.mintBg},#FFFFFF)`, border: `1px solid ${MW.mintTint}`, padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: MW.navy }}>条件に合うツアーが見つかりませんでした。</p>
                        <p style={{ margin: 0, fontSize: 14, color: MW.mute }}>ご希望に合わせたプランは、お見積もりでご相談ください。</p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
                            <button type="button" onClick={reset} style={{ height: 44, padding: '0 22px', border: `1.5px solid ${MW.mint}`, borderRadius: 999, background: '#fff', fontSize: 14, fontWeight: 700, color: MW.mintDeep, cursor: 'pointer', fontFamily: 'inherit' }}>
                                条件をリセット
                            </button>
                            <a
                                href="/custom-estimate"
                                onClick={(e) => { e.preventDefault(); navigate('/custom-estimate'); }}
                                style={{ display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 22px', borderRadius: 999, background: MW_GRADIENT, fontSize: 14, fontWeight: 700, color: MW.navy, textDecoration: 'none' }}
                            >
                                お見積もり
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function TourCard({ p }: { p: HomeProduct }) {
    const navigate = useNavigate();
    const wishlist = useWishlist();
    const off = discountPct(p);
    const img = p.mainImages[0];

    return (
        <a
            href={`/products/${p.id}`}
            onClick={(e) => { e.preventDefault(); navigate(`/products/${p.id}`); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, color: MW.navy, transition: 'transform .2s', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
        >
            <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 22, overflow: 'hidden', background: MW.mintTint }}>
                {isUsableImage(img) && (
                    <img src={img} alt={`${p.name}｜${p.category}`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
                <FavButton on={wishlist.has(p.id)} onToggle={() => wishlist.toggle(p)} />
                {(p.isPopular || p.isFeatured) && (
                    <div style={{ position: 'absolute', left: 10, top: 10, right: 56, display: 'flex', gap: 4, flexWrap: 'wrap', pointerEvents: 'none' }}>
                        {p.isPopular && <span style={{ ...badge, color: '#fff', background: MW.navy }}>BEST</span>}
                        {p.isFeatured && <span style={{ ...badge, color: MW.mintDeep, background: '#FFFFFF' }}>おすすめ</span>}
                    </div>
                )}
            </div>
            <span style={{ fontSize: 12, color: MW.mute, marginTop: 4 }}>{[p.category, p.duration].filter(Boolean).join(' ｜ ')}</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                {off > 0 && <span style={{ fontSize: 15, fontWeight: 700, color: MW.red }}>{off}%OFF</span>}
                <span style={{ fontSize: 20, fontWeight: 900 }}>
                    {yen(p.price)}<span style={{ fontSize: 13, fontWeight: 700 }}>〜</span>
                </span>
            </div>
        </a>
    );
}

const chipBtn = { border: 0, background: MW.mintTint, color: MW.mintDeep, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' } as const;
const badge = { display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 } as const;
