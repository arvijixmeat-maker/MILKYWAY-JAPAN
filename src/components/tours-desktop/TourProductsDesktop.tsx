import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Category } from '../../types/category';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { SectionHeader } from '../desktop-primitives/SectionHeader';
import { PCard, type PCardData } from '../desktop-primitives/PCard';

interface ApiProduct {
    id: string;
    name: string;
    category?: string;
    price: number;
    original_price?: number;
    originalPrice?: number;
    duration?: string;
    main_images?: string | string[];
    mainImages?: string | string[];
    tags?: string | string[];
    is_popular?: 0 | 1 | boolean;
    isPopular?: boolean;
    booking_count?: number;
    bookingCount?: number;
    status?: string;
}

/**
 * The products API may return arrays as parsed JS arrays (the API handler does
 * safeParse) OR — depending on which endpoint is hit — as a raw JSON string.
 * Coerce defensively so the UI never sees a non-array.
 */
function toStringArray(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return [];
        // Looks like JSON
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
            } catch {
                return [];
            }
        }
        // Treat as single URL
        return trimmed.startsWith('/') || trimmed.startsWith('http') ? [trimmed] : [];
    }
    return [];
}

interface ProductRow extends PCardData {
    isPopular: boolean;
    bookingCount: number;
    categoryId?: string;
}

interface ToursFilters {
    duration: string[]; // ['short','mid','long']
    price: [number, number];
    themes: string[]; // tag keywords
    includes: string[]; // ['ja_guide','meals',...]
    dep: string[];
}

const PRICE_MAX = 250000;

const THEME_OPTIONS = [
    { v: 'stars', l: '🌌 星空・天体', match: ['星空', '天体', 'star', 'astronomy', '銀河'] },
    { v: 'horse', l: '🐎 乗馬', match: ['乗馬', 'horse', 'riding'] },
    { v: 'culture', l: '🏛️ 文化・遺跡', match: ['文化', '伝統', 'culture', '遺跡', '遊牧'] },
    { v: 'gourmet', l: '🍽️ グルメ', match: ['グルメ', 'gourmet', '料理', 'food'] },
    { v: 'photo', l: '📸 撮影スポット', match: ['撮影', 'photo', 'フォト'] },
    { v: 'heal', l: '🧘 ヒーリング', match: ['ヒーリング', 'heal', '癒し'] },
] as const;

const DEFAULT_FILTERS: ToursFilters = {
    duration: [],
    price: [0, PRICE_MAX],
    themes: [],
    includes: [],
    dep: [],
};

interface Props {
    contentWidth?: number;
}

export function TourProductsDesktop({ contentWidth = 1280 }: Props) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [cat, setCat] = useState<string>(searchParams.get('category') || 'all');
    const [sort, setSort] = useState<'popular' | 'reviews' | 'rating' | 'price_asc' | 'price_desc'>('popular');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [filters, setFilters] = useState<ToursFilters>(DEFAULT_FILTERS);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 9;

    // Categories
    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories', 'product'],
        queryFn: async () => {
            try {
                const data = await api.categories.list('product');
                if (!Array.isArray(data)) return [];
                return (data as unknown as { id: string; name: string; description?: string; icon?: string; is_active?: boolean; order?: number; type?: string }[])
                    .filter((c) => c.is_active !== false && c.id !== 'all' && (!c.type || c.type === 'product'))
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((c) => ({
                        id: c.id,
                        name: c.name,
                        icon: c.icon || '',
                        description: c.description || '',
                        order: c.order || 0,
                        isActive: c.is_active !== false,
                        type: 'product' as const,
                    }));
            } catch {
                return [];
            }
        },
        staleTime: 1000 * 60 * 60,
    });

    // Products
    const { data: products = [], isLoading } = useQuery<ProductRow[]>({
        queryKey: ['products', 'desktop'],
        queryFn: async () => {
            try {
                const data = await api.products.list();
                if (!Array.isArray(data)) return [];
                return (data as ApiProduct[])
                    .filter((p) => p.status === 'active' || !p.status)
                    .map((p): ProductRow => ({
                        id: p.id,
                        name: p.name,
                        category: p.category,
                        price: p.price,
                        originalPrice: p.original_price ?? p.originalPrice,
                        duration: p.duration,
                        // API handler returns parsed `mainImages` (array), but legacy or
                        // alternate endpoints may return `main_images` as a JSON string.
                        // Try parsed array first, then fall back to raw JSON string.
                        mainImages: toStringArray(p.mainImages ?? p.main_images),
                        tags: toStringArray(p.tags),
                        isPopular: !!(p.is_popular === 1 || p.is_popular === true || p.isPopular),
                        bookingCount: p.booking_count ?? p.bookingCount ?? 0,
                    }));
            } catch {
                return [];
            }
        },
        staleTime: 1000 * 30,
        refetchOnWindowFocus: true,
    });

    // Derived list
    const filtered = useMemo(() => {
        let list = products.slice();

        if (cat !== 'all') {
            const c = categories.find((x) => x.id === cat);
            list = list.filter((p) => {
                if (!c) return false;
                if (p.category === c.id || p.category === c.name) return true;
                return false;
            });
        }

        list = list.filter((p) => p.price >= filters.price[0] && p.price <= filters.price[1]);

        if (filters.duration.length > 0) {
            list = list.filter((p) => {
                const n = parseInt(p.duration || '0', 10);
                if (filters.duration.includes('short') && n <= 2) return true;
                if (filters.duration.includes('mid') && n >= 3 && n <= 4) return true;
                if (filters.duration.includes('long') && n >= 5) return true;
                return false;
            });
        }

        if (filters.themes.length > 0) {
            list = list.filter((p) => {
                const haystack = `${p.name} ${(p.tags || []).join(' ')} ${p.category || ''}`.toLowerCase();
                return filters.themes.some((tv) => {
                    const opt = THEME_OPTIONS.find((o) => o.v === tv);
                    if (!opt) return false;
                    return opt.match.some((kw) => haystack.includes(kw.toLowerCase()));
                });
            });
        }

        list.sort((a, b) => {
            if (sort === 'price_asc') return a.price - b.price;
            if (sort === 'price_desc') return b.price - a.price;
            if (sort === 'reviews') return b.bookingCount - a.bookingCount;
            if (sort === 'rating') return (b.bookingCount || 0) - (a.bookingCount || 0);
            // popular
            return (Number(b.isPopular) - Number(a.isPopular)) || (b.bookingCount - a.bookingCount);
        });
        return list;
    }, [products, categories, cat, sort, filters]);

    const popular = useMemo(() => {
        const sorted = products.slice().sort((a, b) => (Number(b.isPopular) - Number(a.isPopular)) || (b.bookingCount - a.bookingCount));
        return sorted.slice(0, 4);
    }, [products]);

    // Paginate
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleCat = (id: string) => {
        setCat(id);
        setPage(1);
        if (id === 'all') setSearchParams({});
        else setSearchParams({ category: id });
    };

    const resetAll = () => {
        setCat('all');
        setFilters(DEFAULT_FILTERS);
        setPage(1);
        setSearchParams({});
    };

    // Category banners (up to 3 + "all")
    const tourCats = useMemo(() => {
        const items: { id: string; label: string; img?: string; sub: string; count: number; bg?: string }[] = [
            { id: 'all', label: '全体', sub: 'すべてのモンゴル旅行', count: products.length },
            ...categories.slice(0, 3).map((c) => {
                const count = products.filter((p) => p.category === c.id || p.category === c.name).length;
                // pick a banner from one of the products in this category
                const sample = products.find((p) => (p.category === c.id || p.category === c.name) && (p.mainImages?.[0]));
                return {
                    id: c.id,
                    label: c.name,
                    img: sample?.mainImages?.[0] || undefined,
                    sub: c.description || '',
                    count,
                };
            }),
        ];
        return items;
    }, [categories, products]);

    return (
        <div style={{ background: '#fff' }}>
            {/* ===== Page hero ===== */}
            <section
                style={{
                    background: 'linear-gradient(180deg, var(--bg-muted) 0%, #fff 100%)',
                    borderBottom: '1px solid var(--border-subtle)',
                }}
            >
                <div style={{ maxWidth: contentWidth, margin: '0 auto', padding: '32px 32px 40px' }}>
                    <div style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button type="button" onClick={() => navigate('/')} style={crumbBtn}>ホーム</button>
                        <MatIcon name="chevron_right" size={14} color="var(--fg-6)" />
                        <span style={{ color: 'var(--fg-2)', fontWeight: 600 }}>ツアー商品</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, alignItems: 'end' }}>
                        <div>
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    color: '#0f766e',
                                    textTransform: 'uppercase',
                                    marginBottom: 10,
                                }}
                            >
                                Tour Catalog
                            </div>
                            <h1
                                style={{
                                    fontSize: 42,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                    margin: 0,
                                    lineHeight: 1.2,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                モンゴルツアー商品一覧
                            </h1>
                            <p style={{ fontSize: 15, color: 'var(--fg-3)', marginTop: 14, lineHeight: 1.75, maxWidth: 640 }}>
                                モンゴル乗馬旅行、ゴビ砂漠ツアー、テレルジ国立公園、フブスグル湖など、地域・テーマ別にモンゴルツアーをお探しいただけます。
                                日本語ガイドが同行し、現地旅行社ならではの最適なプランをご提案します。
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {[
                                { n: String(products.length), t: '厳選ツアー', sub: '全プラン' },
                                { n: '★4.9', t: '平均評価', sub: '累計1,240件' },
                                { n: '150+', t: 'オリジナル実績', sub: 'カスタム旅' },
                            ].map((s) => (
                                <div
                                    key={s.t}
                                    style={{
                                        background: '#fff',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 16,
                                        padding: '18px 18px',
                                        boxShadow: 'var(--shadow-toss)',
                                    }}
                                >
                                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>{s.n}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-2)', marginTop: 6 }}>{s.t}</div>
                                    <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 2 }}>{s.sub}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== Category banner row ===== */}
            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '40px 32px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tourCats.length}, 1fr)`, gap: 14 }}>
                    {tourCats.map((c) => {
                        const on = cat === c.id;
                        const allCat = c.id === 'all';
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => handleCat(c.id)}
                                style={{
                                    position: 'relative',
                                    height: 168,
                                    borderRadius: 20,
                                    overflow: 'hidden',
                                    padding: 0,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    border: on ? '2px solid #0f766e' : '1px solid var(--border)',
                                    background: allCat
                                        ? (on ? 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' : '#fff')
                                        : '#000',
                                    boxShadow: on ? '0 8px 20px -8px rgba(15,118,110,0.4)' : '0 2px 8px rgba(0,0,0,0.04)',
                                    transition: 'all 200ms var(--ease-out)',
                                    fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => {
                                    if (!on) e.currentTarget.style.transform = 'translateY(-3px)';
                                }}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                            >
                                {c.img && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundImage: `url(${c.img})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                opacity: on ? 1 : 0.85,
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background:
                                                    'linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)',
                                            }}
                                        />
                                    </>
                                )}
                                {allCat && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0.5,
                                        }}
                                    >
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                            {[0, 1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        width: 26,
                                                        height: 26,
                                                        borderRadius: 6,
                                                        background: on ? 'rgba(255,255,255,0.3)' : 'var(--primary-tint)',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 18,
                                        right: 18,
                                        bottom: 16,
                                        color: allCat && !on ? 'var(--fg-1)' : '#fff',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            opacity: allCat && !on ? 0.7 : 0.85,
                                            marginBottom: 4,
                                            fontWeight: 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {c.sub || ' '}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-end',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                                            {c.label}
                                        </div>
                                        <div
                                            style={{
                                                flexShrink: 0,
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '4px 10px',
                                                borderRadius: 999,
                                                background: on
                                                    ? (allCat ? 'rgba(255,255,255,0.25)' : '#0f766e')
                                                    : (allCat ? 'var(--bg-muted)' : 'rgba(255,255,255,0.22)'),
                                                color: on || !allCat ? '#fff' : 'var(--fg-3)',
                                                backdropFilter: !allCat ? 'blur(8px)' : 'none',
                                            }}
                                        >
                                            {c.count} プラン
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ===== Popular row ===== */}
            {popular.length > 0 && (
                <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '56px 32px 0' }}>
                    <SectionHeader eyebrow="Most Booked" title="人気ツアー商品" subtitle="今月最も予約されているプラン Top 4" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
                        {popular.map((p) => (
                            <PCard key={p.id} p={p} layout="block" onClick={() => navigate(`/products/${p.id}`)} />
                        ))}
                    </div>
                </section>
            )}

            {/* ===== Sidebar + grid ===== */}
            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '72px 32px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 36, alignItems: 'start' }}>
                    <aside style={{ position: 'sticky', top: 168 }}>
                        <FilterSidebar filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
                    </aside>

                    <div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 24,
                                paddingBottom: 18,
                                borderBottom: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>
                                    全商品を見る
                                </h2>
                                <div style={{ fontSize: 13, color: 'var(--fg-5)', marginTop: 6 }}>
                                    <span style={{ color: 'var(--fg-2)', fontWeight: 700 }}>{filtered.length} 件</span> のツアーが見つかりました
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value as typeof sort)}
                                    style={{
                                        appearance: 'none',
                                        padding: '10px 36px 10px 16px',
                                        border: '1px solid var(--border)',
                                        borderRadius: 12,
                                        background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 14px center`,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: 'var(--fg-2)',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <option value="popular">人気順</option>
                                    <option value="reviews">予約数順</option>
                                    <option value="rating">評価順</option>
                                    <option value="price_asc">価格安い順</option>
                                    <option value="price_desc">価格高い順</option>
                                </select>
                                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', padding: 3, gap: 2 }}>
                                    <button
                                        type="button"
                                        onClick={() => setView('grid')}
                                        aria-label="grid view"
                                        style={{
                                            padding: '7px 10px',
                                            borderRadius: 9,
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: view === 'grid' ? 'var(--fg-1)' : 'transparent',
                                            color: view === 'grid' ? '#fff' : 'var(--fg-4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <MatIcon name="grid_view" size={18} color={view === 'grid' ? '#fff' : 'var(--fg-4)'} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('list')}
                                        aria-label="list view"
                                        style={{
                                            padding: '7px 10px',
                                            borderRadius: 9,
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: view === 'list' ? 'var(--fg-1)' : 'transparent',
                                            color: view === 'list' ? '#fff' : 'var(--fg-4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <MatIcon name="view_list" size={18} color={view === 'list' ? '#fff' : 'var(--fg-4)'} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <ActiveFilterChips
                            cat={cat}
                            catLabel={categories.find((c) => c.id === cat)?.name}
                            filters={filters}
                            onClearCat={() => handleCat('all')}
                            onClearAll={resetAll}
                            onRemove={(group, val) => setFilters((f) => ({ ...f, [group]: (f[group as keyof ToursFilters] as string[]).filter((v) => v !== val) }))}
                        />

                        {isLoading ? (
                            <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-5)' }}>読み込み中...</div>
                        ) : filtered.length === 0 ? (
                            <EmptyState onReset={resetAll} />
                        ) : view === 'grid' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
                                {pageItems.map((p) => (
                                    <PCard key={p.id} p={p} layout="block" onClick={() => navigate(`/products/${p.id}`)} />
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {pageItems.map((p) => (
                                    <ListCard key={p.id} p={p} onClick={() => navigate(`/products/${p.id}`)} />
                                ))}
                            </div>
                        )}

                        {filtered.length > PAGE_SIZE && (
                            <Pagination page={safePage} total={totalPages} onChange={setPage} />
                        )}
                    </div>
                </div>
            </section>

            {/* ===== Custom tour CTA ===== */}
            <section style={{ maxWidth: contentWidth, margin: '72px auto 0', padding: '0 32px' }}>
                <div
                    style={{
                        background: 'linear-gradient(120deg, #0f766e 0%, #115e59 60%, #134e4a 100%)',
                        borderRadius: 28,
                        padding: '44px 56px',
                        color: '#fff',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 32,
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 20px 48px -16px rgba(15,118,110,0.4)',
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
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 8 }}>
                            あなただけの特別なプランをご提案します
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' }}>オーダーメイド見積もり</div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 12, lineHeight: 1.6 }}>
                            人数・期間・予算・行きたい場所をお伝えください。日本語スタッフが24時間以内にお見積もりします。
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
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
                                justifyContent: 'center',
                            }}
                        >
                            1分でリクエスト <MatIcon name="arrow_forward" size={18} color="var(--primary-dark)" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window.openChannelTalk === 'function') window.openChannelTalk();
                                else navigate('/custom-estimate');
                            }}
                            style={{
                                padding: '14px 28px',
                                background: 'rgba(255,255,255,0.12)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.25)',
                                borderRadius: 999,
                                backdropFilter: 'blur(8px)',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                justifyContent: 'center',
                            }}
                        >
                            <MatIcon name="chat" size={16} color="#fff" />
                            LINE で相談
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ============ Filter Sidebar ============
function FilterSidebar({ filters, onChange }: { filters: ToursFilters; onChange: (f: ToursFilters) => void }) {
    const toggle = (group: 'duration' | 'themes' | 'includes' | 'dep', val: string) =>
        onChange({
            ...filters,
            [group]: filters[group].includes(val) ? filters[group].filter((v) => v !== val) : [...filters[group], val],
        });

    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 20,
                boxShadow: 'var(--shadow-toss)',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '18px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MatIcon name="tune" size={18} color="var(--fg-2)" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>絞り込み</span>
                </div>
                <button
                    type="button"
                    onClick={() => onChange(DEFAULT_FILTERS)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--fg-5)',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    リセット
                </button>
            </div>

            <FilterGroup label="期間">
                {[
                    { v: 'short', l: '1〜2 泊' },
                    { v: 'mid', l: '3〜4 泊' },
                    { v: 'long', l: '5 泊以上' },
                ].map((o) => (
                    <Checkbox
                        key={o.v}
                        label={o.l}
                        checked={filters.duration.includes(o.v)}
                        onChange={() => toggle('duration', o.v)}
                    />
                ))}
            </FilterGroup>

            <FilterGroup label="価格帯">
                <PriceSlider value={filters.price} onChange={(p) => onChange({ ...filters, price: p })} />
            </FilterGroup>

            <FilterGroup label="テーマ">
                {THEME_OPTIONS.map((o) => (
                    <Checkbox key={o.v} label={o.l} checked={filters.themes.includes(o.v)} onChange={() => toggle('themes', o.v)} />
                ))}
            </FilterGroup>

            <FilterGroup label="出発時期">
                {[
                    { v: 'this_month', l: '今月中' },
                    { v: 'next_month', l: '来月' },
                    { v: 'summer', l: '夏 (6〜8月)' },
                    { v: 'autumn', l: '秋 (9〜10月)' },
                ].map((o) => (
                    <Checkbox key={o.v} label={o.l} checked={filters.dep.includes(o.v)} onChange={() => toggle('dep', o.v)} />
                ))}
            </FilterGroup>

            <FilterGroup label="含まれるもの" last>
                {[
                    { v: 'ja_guide', l: '日本語ガイド' },
                    { v: 'meals', l: '全食事' },
                    { v: 'airport', l: '空港送迎' },
                    { v: 'hotel', l: '宿泊費' },
                    { v: 'intl_flight', l: '国際線航空券' },
                ].map((o) => (
                    <Checkbox
                        key={o.v}
                        label={o.l}
                        checked={filters.includes.includes(o.v)}
                        onChange={() => toggle('includes', o.v)}
                    />
                ))}
            </FilterGroup>
        </div>
    );
}

function FilterGroup({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                style={{
                    width: '100%',
                    padding: '18px 20px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'inherit',
                }}
            >
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '0.01em' }}>{label}</span>
                <MatIcon name={open ? 'expand_less' : 'expand_more'} size={18} color="var(--fg-4)" />
            </button>
            {open && <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>}
        </div>
    );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 13, color: 'var(--fg-2)' }}>
            <span
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: '1.5px solid ' + (checked ? '#0f766e' : 'var(--border-strong)'),
                    background: checked ? '#0f766e' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {checked && <MatIcon name="check" size={14} color="#fff" />}
            </span>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
            <span>{label}</span>
        </label>
    );
}

function PriceSlider({ value, onChange }: { value: [number, number]; onChange: (v: [number, number]) => void }) {
    return (
        <div style={{ padding: '4px 2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--fg-1)' }}>¥{value[0].toLocaleString()}</span>
                <span style={{ color: 'var(--fg-5)' }}>〜</span>
                <span style={{ fontWeight: 700, color: 'var(--fg-1)' }}>¥{value[1].toLocaleString()}</span>
            </div>
            <input
                type="range"
                min={0}
                max={PRICE_MAX}
                step={10000}
                value={value[1]}
                onChange={(e) => onChange([value[0], parseInt(e.target.value, 10)])}
                style={{ width: '100%', accentColor: '#0f766e' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-5)', marginTop: 6 }}>
                <span>¥0</span>
                <span>¥{PRICE_MAX.toLocaleString()}+</span>
            </div>
        </div>
    );
}

// ============ Active filter chips ============
function ActiveFilterChips({
    cat,
    catLabel,
    filters,
    onClearCat,
    onClearAll,
    onRemove,
}: {
    cat: string;
    catLabel?: string;
    filters: ToursFilters;
    onClearCat: () => void;
    onClearAll: () => void;
    onRemove: (group: string, val: string) => void;
}) {
    const chips: { k: string; label: string; onX: () => void }[] = [];
    if (cat !== 'all' && catLabel) {
        chips.push({ k: 'cat', label: catLabel, onX: onClearCat });
    }
    const durMap: Record<string, string> = { short: '1〜2泊', mid: '3〜4泊', long: '5泊以上' };
    filters.duration.forEach((v) => chips.push({ k: 'duration:' + v, label: durMap[v], onX: () => onRemove('duration', v) }));
    filters.themes.forEach((v) => {
        const opt = THEME_OPTIONS.find((o) => o.v === v);
        if (opt) chips.push({ k: 'themes:' + v, label: opt.l, onX: () => onRemove('themes', v) });
    });

    if (chips.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            {chips.map((c) => (
                <span
                    key={c.k}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 8px 7px 14px',
                        background: 'var(--primary-tint)',
                        color: 'var(--primary-dark)',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                    }}
                >
                    {c.label}
                    <button
                        type="button"
                        onClick={c.onX}
                        aria-label={`Remove ${c.label}`}
                        style={{
                            background: '#0f766e',
                            color: '#fff',
                            border: 'none',
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <MatIcon name="close" size={12} color="#fff" />
                    </button>
                </span>
            ))}
            <button
                type="button"
                onClick={onClearAll}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--fg-5)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textDecoration: 'underline',
                    marginLeft: 4,
                }}
            >
                すべて解除
            </button>
        </div>
    );
}

function EmptyState({ onReset }: { onReset: () => void }) {
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
                <MatIcon name="search_off" size={32} color="var(--fg-5)" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)' }}>条件に合うツアーが見つかりません</div>
            <div style={{ fontSize: 13, color: 'var(--fg-4)' }}>絞り込み条件を少し変えてみてください。</div>
            <button
                type="button"
                onClick={onReset}
                style={{
                    marginTop: 8,
                    padding: '10px 20px',
                    background: '#0f766e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                }}
            >
                条件をリセット
            </button>
        </div>
    );
}

function ListCard({ p, onClick }: { p: ProductRow; onClick: () => void }) {
    const img = p.mainImages?.[0] || '/og-image.jpg';
    const firstTag = p.tags?.[0];
    const hasOriginal = !!p.originalPrice && p.originalPrice > p.price;
    return (
        <div
            onClick={onClick}
            role="button"
            style={{
                display: 'grid',
                gridTemplateColumns: '320px 1fr auto',
                gap: 28,
                alignItems: 'stretch',
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-toss)',
                cursor: 'pointer',
                transition: 'all 200ms',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 14px 30px -6px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-toss)';
                e.currentTarget.style.transform = '';
            }}
        >
            <div
                style={{
                    aspectRatio: '4/3',
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                }}
            >
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 50%)' }} />
                {p.duration && (
                    <div style={{ position: 'absolute', bottom: 12, left: 14, color: '#fff', fontSize: 13, fontWeight: 700 }}>{p.duration}</div>
                )}
            </div>
            <div style={{ padding: '22px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: 12, color: 'var(--fg-5)', marginBottom: 6 }}>{p.category}</div>
                    <div
                        style={{
                            fontSize: 19,
                            fontWeight: 700,
                            color: 'var(--fg-1)',
                            lineHeight: 1.35,
                            marginBottom: 10,
                            letterSpacing: '-0.01em',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {p.name}
                    </div>
                    {p.tags && p.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {p.tags.slice(0, 4).map((t) => (
                                <span
                                    key={t}
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--fg-3)',
                                        padding: '4px 10px',
                                        background: 'var(--bg-muted)',
                                        borderRadius: 999,
                                        fontWeight: 500,
                                    }}
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-5)' }}>
                        <MatIcon name="verified" size={14} filled color="#0f766e" /> 日本語ガイド同行
                    </span>
                    {firstTag && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-5)' }}>
                            <MatIcon name="local_offer" size={14} color="var(--fg-5)" /> {firstTag}
                        </span>
                    )}
                </div>
            </div>
            <div style={{ padding: '22px 28px 22px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                    {hasOriginal && (
                        <div style={{ fontSize: 12, color: 'var(--fg-5)', textDecoration: 'line-through' }}>
                            ¥{p.originalPrice!.toLocaleString()}
                        </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--fg-5)' }}>お一人様</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#0f766e', letterSpacing: '-0.01em' }}>
                        ¥{p.price.toLocaleString()}<span style={{ fontSize: 14 }}>〜</span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    style={{
                        padding: '11px 22px',
                        background: 'var(--fg-1)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    詳細を見る <MatIcon name="arrow_forward" size={16} color="#fff" />
                </button>
            </div>
        </div>
    );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
    // Generate compact list: 1 ... (page-1) page (page+1) ... total
    const pages: (number | string)[] = [];
    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push('…');
        for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i);
        if (page < total - 2) pages.push('…');
        pages.push(total);
    }

    return (
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <button
                type="button"
                aria-label="prev"
                onClick={() => onChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                style={{
                    minWidth: 40,
                    height: 40,
                    border: '1px solid var(--border)',
                    background: '#fff',
                    color: page <= 1 ? 'var(--fg-6)' : 'var(--fg-2)',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                }}
            >
                ←
            </button>
            {pages.map((p, i) =>
                typeof p === 'string' ? (
                    <span key={'dot-' + i} style={{ fontSize: 14, color: 'var(--fg-5)', padding: '0 4px' }}>{p}</span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onChange(p)}
                        style={{
                            minWidth: 40,
                            height: 40,
                            border: '1px solid ' + (p === page ? '#0f766e' : 'var(--border)'),
                            background: p === page ? '#0f766e' : '#fff',
                            color: p === page ? '#fff' : 'var(--fg-2)',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                type="button"
                aria-label="next"
                onClick={() => onChange(Math.min(total, page + 1))}
                disabled={page >= total}
                style={{
                    minWidth: 40,
                    height: 40,
                    border: '1px solid var(--border)',
                    background: '#fff',
                    color: page >= total ? 'var(--fg-6)' : 'var(--fg-2)',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: page >= total ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                }}
            >
                →
            </button>
        </div>
    );
}

const crumbBtn = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'var(--fg-5)',
    fontSize: 12,
    fontFamily: 'inherit',
} as const;
