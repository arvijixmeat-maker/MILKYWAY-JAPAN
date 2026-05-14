import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { PageHero } from '../desktop-primitives/PageHero';

interface ApiMatePost {
    id: string;
    title: string;
    description?: string;
    image?: string;
    region?: string;
    startDate?: string;
    endDate?: string;
    start_date?: string;
    end_date?: string;
    duration?: string;
    gender?: string;
    ageGroups?: string | string[];
    age_groups?: string | string[];
    styles?: string | string[];
    recruitCount?: number;
    recruit_count?: number;
    maxMembers?: number;
    max_members?: number;
    currentMembers?: number;
    current_members?: number;
    status?: string;
    createdAt?: string;
    created_at?: string;
    authorName?: string;
    author_name?: string;
    viewCount?: number;
    view_count?: number;
}

interface MatePost {
    id: string;
    title: string;
    excerpt: string;
    image: string;
    region: string;
    dateRange: string;
    duration: string;
    styles: string[];
    ageGroups: string[];
    gender: string;
    status: 'open' | 'almost' | 'full';
    capacity: number;
    joined: number;
    views: number;
    authorName: string;
    authorInitial: string;
    postedAgo: string;
}

const REGION_PILLS = [
    { id: 'all', label: '全体', icon: '🌐' },
    { id: 'central-mongolia', label: '中央モンゴル', icon: '🏞️' },
    { id: 'gobi-desert', label: 'ゴビ砂漠', icon: '🏜️' },
    { id: 'khuvsgul', label: 'フブスグル', icon: '🏔️' },
    { id: 'terelj', label: 'テレルジ', icon: '🐎' },
    { id: 'trekking', label: 'トレッキング', icon: '🥾' },
    { id: 'golf', label: 'ゴルフ', icon: '⛳' },
];

const STYLE_OPTIONS = ['🌌 星空', '🐎 乗馬', '📸 撮影', '⛺ キャンプ', '🍽️ グルメ', '🧘 ヒーリング', '🥾 トレッキング', '🏛️ 文化'];
const STATUS_OPTIONS = [
    { v: 'open' as const, l: '募集中' },
    { v: 'almost' as const, l: '残り席わずか' },
    { v: 'full' as const, l: 'マッチ済み' },
];

interface Filters {
    gender: string[];
    age: string[];
    styles: string[];
    status: string[];
    people: string[];
}

const DEFAULT_FILTERS: Filters = {
    gender: [],
    age: [],
    styles: [],
    status: [],
    people: [],
};

function parseJsonArray(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as string[];
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return val.split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
}

function formatRange(start?: string, end?: string): string {
    if (!start) return '';
    const s = start.replace(/-/g, '.');
    if (!end) return s;
    const e = end.replace(/-/g, '.');
    // If same year, abbreviate end
    if (s.slice(0, 4) === e.slice(0, 4)) return `${s} 〜 ${e.slice(5)}`;
    return `${s} 〜 ${e}`;
}

function timeAgo(iso?: string): string {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const diff = Date.now() - t;
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m} 分前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} 時間前`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} 日前`;
    const w = Math.floor(d / 7);
    return `${w} 週間前`;
}

function statusFrom(p: ApiMatePost, capacity: number, joined: number): 'open' | 'almost' | 'full' {
    if (p.status === 'closed' || p.status === 'full' || p.status === 'matched') return 'full';
    if (capacity > 0 && joined >= capacity) return 'full';
    if (capacity > 0 && joined / capacity >= 0.75) return 'almost';
    return 'open';
}

export function TravelMatesDesktop({ contentWidth = 1280 }: { contentWidth?: number }) {
    const navigate = useNavigate();
    const [region, setRegion] = useState('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<'recent' | 'popular' | 'almost'>('recent');
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

    const { data: posts = [], isLoading } = useQuery<MatePost[]>({
        queryKey: ['travelMates', 'desktop'],
        queryFn: async () => {
            try {
                const data = await api.travelMates.list();
                if (!Array.isArray(data)) return [];
                return (data as ApiMatePost[]).map((p): MatePost => {
                    const capacity = p.recruitCount ?? p.recruit_count ?? p.maxMembers ?? p.max_members ?? 0;
                    const joined = p.currentMembers ?? p.current_members ?? 0;
                    const start = p.startDate || p.start_date;
                    const end = p.endDate || p.end_date;
                    const authorName = p.authorName || p.author_name || '匿名';
                    return {
                        id: p.id,
                        title: p.title || '',
                        excerpt: p.description || '',
                        image: p.image || '/og-image.jpg',
                        region: p.region || '',
                        dateRange: formatRange(start, end),
                        duration: p.duration || '',
                        styles: parseJsonArray(p.styles).slice(0, 4),
                        ageGroups: parseJsonArray(p.ageGroups || p.age_groups),
                        gender: p.gender || '問わず',
                        status: statusFrom(p, capacity, joined),
                        capacity,
                        joined,
                        views: p.viewCount ?? p.view_count ?? 0,
                        authorName,
                        authorInitial: authorName.charAt(0),
                        postedAgo: timeAgo(p.createdAt || p.created_at),
                    };
                });
            } catch (e) {
                console.error('TravelMates fetch error:', e);
                return [];
            }
        },
        staleTime: 1000 * 30,
        refetchOnWindowFocus: true,
    });

    const filtered = useMemo(() => {
        let list = posts.slice();
        if (region !== 'all') list = list.filter((p) => p.region === region || regionMatch(p.region, region));
        if (search) {
            const q = search.toLowerCase();
            list = list.filter((p) => p.title.toLowerCase().includes(q) || (p.region || '').toLowerCase().includes(q));
        }
        if (filters.status.length > 0) list = list.filter((p) => filters.status.includes(p.status));
        if (filters.styles.length > 0) {
            list = list.filter((p) => filters.styles.some((s) => p.styles.some((ps) => ps.includes(s.replace(/^[^ ]+ /, '')))));
        }

        list.sort((a, b) => {
            if (sort === 'popular') return b.views - a.views;
            if (sort === 'almost') {
                const ar = a.capacity > 0 ? a.joined / a.capacity : 0;
                const br = b.capacity > 0 ? b.joined / b.capacity : 0;
                return br - ar;
            }
            return Number(b.id) - Number(a.id);
        });
        return list;
    }, [posts, region, search, filters, sort]);

    const resetFilters = () => setFilters(DEFAULT_FILTERS);

    return (
        <div style={{ background: '#fff' }}>
            <PageHero
                eyebrow="Travel Mates"
                title="同行者を見つけよう"
                subtitle="モンゴルを一緒に旅する仲間を募集・参加できます。同じ趣味・予算・日程で旅費を分担し、より深く現地を楽しめます。"
                breadcrumbs={[
                    { label: 'ホーム', path: '/' },
                    { label: '同行者募集' },
                ]}
                contentWidth={contentWidth}
                aside={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/travel-mates/write')}
                            style={{
                                padding: '14px 24px',
                                background: '#0f766e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 8px 20px -6px rgba(15,118,110,0.45)',
                            }}
                        >
                            <MatIcon name="add" size={18} color="#fff" />
                            同行者を募集する
                        </button>
                        <span style={{ fontSize: 11, color: 'var(--fg-5)' }}>無料 ・ 1分で投稿</span>
                    </div>
                }
            >
                <div style={{ display: 'flex', gap: 24, marginTop: 22 }}>
                    {[
                        { n: String(posts.length), l: '募集中の旅' },
                        { n: '1.2k', l: '登録メンバー' },
                        { n: '~2日', l: '平均マッチ時間' },
                    ].map((s) => (
                        <div key={s.l}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>{s.n}</div>
                            <div style={{ fontSize: 12, color: 'var(--fg-5)', marginTop: 2 }}>{s.l}</div>
                        </div>
                    ))}
                </div>
                {/* Search bar */}
                <div
                    style={{
                        marginTop: 28,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#fff',
                        borderRadius: 14,
                        padding: '8px 8px 8px 18px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-toss)',
                    }}
                >
                    <MatIcon name="search" size={20} color="var(--fg-5)" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="行き先 (例: ゴビ砂漠、テレルジ)・キーワードで検索"
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: 14,
                            color: 'var(--fg-1)',
                            padding: '10px 0',
                            fontFamily: 'inherit',
                        }}
                    />
                </div>
            </PageHero>

            {/* Region pills */}
            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '28px 32px 0' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {REGION_PILLS.map((r) => {
                        const on = region === r.id;
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setRegion(r.id)}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: 999,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    background: on ? 'var(--primary-dark)' : '#fff',
                                    color: on ? '#fff' : 'var(--fg-2)',
                                    border: on ? '1px solid var(--primary-dark)' : '1px solid var(--border)',
                                    fontSize: 13,
                                    fontWeight: on ? 700 : 500,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    boxShadow: on ? '0 4px 14px -4px rgba(15,118,110,0.4)' : 'none',
                                }}
                            >
                                <span>{r.icon}</span>
                                <span>{r.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Body — sidebar + grid */}
            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '32px 32px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, alignItems: 'start' }}>
                    <aside style={{ position: 'sticky', top: 168 }}>
                        <FilterSidebar filters={filters} onChange={setFilters} onReset={resetFilters} />
                    </aside>

                    <div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingBottom: 18,
                                marginBottom: 24,
                                borderBottom: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>
                                    募集中のメンバー
                                </h2>
                                <div style={{ fontSize: 13, color: 'var(--fg-5)', marginTop: 4 }}>
                                    <span style={{ color: 'var(--fg-1)', fontWeight: 700 }}>{filtered.length} 件</span> の募集が見つかりました
                                </div>
                            </div>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as typeof sort)}
                                style={selectStyle}
                            >
                                <option value="recent">新着順</option>
                                <option value="popular">人気順</option>
                                <option value="almost">残り席わずか順</option>
                            </select>
                        </div>

                        {isLoading ? (
                            <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-5)' }}>読み込み中...</div>
                        ) : filtered.length === 0 ? (
                            <EmptyState onCta={() => navigate('/travel-mates/write')} />
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                                {filtered.map((p) => (
                                    <MateCard key={p.id} p={p} onClick={() => navigate(`/travel-mates/${p.id}`)} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Promo at bottom */}
            <section style={{ maxWidth: contentWidth, margin: '64px auto 0', padding: '0 32px' }}>
                <div
                    style={{
                        padding: '36px 48px',
                        background: 'linear-gradient(120deg, #0f766e 0%, #115e59 100%)',
                        borderRadius: 24,
                        color: '#fff',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 24,
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            right: -40,
                            top: -50,
                            width: 220,
                            height: 220,
                            borderRadius: 999,
                            background: 'radial-gradient(circle, rgba(94,234,212,0.18) 0%, transparent 70%)',
                        }}
                    />
                    <div style={{ position: 'relative' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#5eead4', textTransform: 'uppercase', marginBottom: 8 }}>
                            Be the host
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                            あなたが旅のホストになりませんか？
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 8, lineHeight: 1.6 }}>
                            募集を作成すると、平均2日で参加者が集まります。日程・費用を共有して、お得に深く旅を楽しめます。
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/travel-mates/write')}
                        style={{
                            padding: '14px 28px',
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
                            gap: 8,
                            position: 'relative',
                        }}
                    >
                        同行者を募集する <MatIcon name="arrow_forward" size={18} color="var(--primary-dark)" />
                    </button>
                </div>
            </section>
        </div>
    );
}

function regionMatch(postRegion: string | undefined, pillId: string): boolean {
    if (!postRegion) return false;
    const lower = postRegion.toLowerCase();
    return (pillId === 'gobi-desert' && (lower.includes('gobi') || postRegion.includes('ゴビ'))) ||
        (pillId === 'central-mongolia' && (lower.includes('central') || postRegion.includes('中央'))) ||
        (pillId === 'khuvsgul' && (lower.includes('khuvsgul') || postRegion.includes('フブスグル'))) ||
        (pillId === 'terelj' && (lower.includes('terelj') || postRegion.includes('テレルジ'))) ||
        (pillId === 'trekking' && (lower.includes('trekking') || postRegion.includes('トレッキング'))) ||
        (pillId === 'golf' && (lower.includes('golf') || postRegion.includes('ゴルフ')));
}

function MateCard({ p, onClick }: { p: MatePost; onClick: () => void }) {
    const pct = p.capacity > 0 ? (p.joined / p.capacity) * 100 : 0;
    const statusInfo = {
        open: { label: '募集中', bg: '#0f766e' },
        almost: { label: '残り席わずか', bg: '#dc2626' },
        full: { label: 'マッチ済み', bg: 'var(--fg-4)' },
    }[p.status];

    return (
        <div
            onClick={onClick}
            role="button"
            style={{
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-toss)',
                cursor: 'pointer',
                transition: 'all 200ms var(--ease-out)',
                display: 'flex',
                flexDirection: 'column',
                opacity: p.status === 'full' ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 14px 30px -6px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-toss)';
                e.currentTarget.style.transform = '';
            }}
        >
            <div
                style={{
                    position: 'relative',
                    aspectRatio: '16/10',
                    backgroundImage: `url(${p.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 30%, transparent 60%, rgba(0,0,0,0.45) 100%)',
                    }}
                />
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                    <span
                        style={{
                            padding: '5px 10px',
                            background: statusInfo.bg,
                            color: '#fff',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                        }}
                    >
                        {statusInfo.label}
                    </span>
                </div>
                {p.views > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            padding: '4px 10px',
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(6px)',
                            borderRadius: 999,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <MatIcon name="visibility" size={13} color="#fff" /> {p.views}
                    </div>
                )}
                {p.region && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 12,
                            left: 14,
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            fontWeight: 700,
                        }}
                    >
                        <MatIcon name="location_on" size={16} filled color="#fff" /> {p.region}
                    </div>
                )}
            </div>

            <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div
                    style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        lineHeight: 1.4,
                        marginBottom: 8,
                        letterSpacing: '-0.01em',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 44,
                    }}
                >
                    {p.title}
                </div>
                {p.excerpt && (
                    <div
                        style={{
                            fontSize: 12,
                            color: 'var(--fg-4)',
                            marginBottom: 12,
                            lineHeight: 1.55,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {p.excerpt}
                    </div>
                )}

                {p.dateRange && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 0',
                            borderTop: '1px solid var(--border-subtle)',
                            marginBottom: 10,
                        }}
                    >
                        <MatIcon name="calendar_month" size={15} color="var(--fg-5)" />
                        <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 600 }}>{p.dateRange}</span>
                        {p.duration && (
                            <>
                                <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--border-strong)' }} />
                                <span style={{ fontSize: 12, color: 'var(--fg-5)' }}>{p.duration}</span>
                            </>
                        )}
                    </div>
                )}

                {p.styles.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                        {p.styles.map((s) => (
                            <span
                                key={s}
                                style={{
                                    fontSize: 11,
                                    color: 'var(--fg-3)',
                                    padding: '3px 9px',
                                    background: 'var(--bg-muted)',
                                    borderRadius: 999,
                                    fontWeight: 600,
                                }}
                            >
                                {s}
                            </span>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: 'auto' }}>
                    {p.capacity > 0 && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-3)' }}>
                                    <MatIcon name="group" size={15} color="var(--fg-3)" />
                                    <span style={{ fontWeight: 700, color: 'var(--fg-1)' }}>{p.joined}</span>
                                    <span>/ {p.capacity} 名</span>
                                </div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: p.status === 'full' ? 'var(--fg-5)' : '#0f766e',
                                    }}
                                >
                                    {p.status === 'full' ? '募集終了' : `残り ${p.capacity - p.joined} 席`}
                                </span>
                            </div>
                            <div style={{ height: 6, background: 'var(--bg-muted)', borderRadius: 999, overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${pct}%`,
                                        height: '100%',
                                        background:
                                            p.status === 'full'
                                                ? 'var(--fg-5)'
                                                : p.status === 'almost'
                                                    ? 'linear-gradient(to right, #dc2626, #ef4444)'
                                                    : 'linear-gradient(to right, #0f766e, #115e59)',
                                        borderRadius: 999,
                                    }}
                                />
                            </div>
                        </>
                    )}

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 14,
                            paddingTop: 12,
                            borderTop: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 999,
                                    background: 'var(--primary-tint)',
                                    color: '#0f766e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 11,
                                    fontWeight: 700,
                                }}
                            >
                                {p.authorInitial}
                            </div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-1)' }}>{p.authorName}</div>
                                {p.postedAgo && <div style={{ fontSize: 10, color: 'var(--fg-5)' }}>{p.postedAgo}</div>}
                            </div>
                        </div>
                        <MatIcon name="arrow_forward" size={18} color="var(--fg-3)" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function FilterSidebar({ filters, onChange, onReset }: { filters: Filters; onChange: (f: Filters) => void; onReset: () => void }) {
    const toggle = (group: keyof Filters, val: string) =>
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
                    onClick={onReset}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-5)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                    リセット
                </button>
            </div>

            <FilterGroup label="募集状況">
                {STATUS_OPTIONS.map((o) => (
                    <FilterCheckbox key={o.v} label={o.l} checked={filters.status.includes(o.v)} onChange={() => toggle('status', o.v)} />
                ))}
            </FilterGroup>

            <FilterGroup label="性別">
                {[
                    { v: 'any', l: '問わず' },
                    { v: 'female', l: '女性のみ' },
                    { v: 'male', l: '男性のみ' },
                    { v: 'couple', l: '夫婦・カップル' },
                ].map((o) => (
                    <FilterCheckbox key={o.v} label={o.l} checked={filters.gender.includes(o.v)} onChange={() => toggle('gender', o.v)} />
                ))}
            </FilterGroup>

            <FilterGroup label="年齢層">
                {['20代', '30代', '40代', '50代以上'].map((o) => (
                    <FilterCheckbox key={o} label={o} checked={filters.age.includes(o)} onChange={() => toggle('age', o)} />
                ))}
            </FilterGroup>

            <FilterGroup label="旅行スタイル">
                {STYLE_OPTIONS.map((o) => (
                    <FilterCheckbox key={o} label={o} checked={filters.styles.includes(o)} onChange={() => toggle('styles', o)} />
                ))}
            </FilterGroup>

            <FilterGroup label="参加人数" last>
                {['1〜2 名', '3〜4 名', '5 名以上'].map((o) => (
                    <FilterCheckbox key={o} label={o} checked={filters.people.includes(o)} onChange={() => toggle('people', o)} />
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
                    padding: '16px 20px 10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'inherit',
                }}
            >
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>{label}</span>
                <MatIcon name={open ? 'expand_less' : 'expand_more'} size={18} color="var(--fg-4)" />
            </button>
            {open && <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>}
        </div>
    );
}

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
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
            <input type="checkbox" checked={checked} onChange={onChange} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
            <span>{label}</span>
        </label>
    );
}

function EmptyState({ onCta }: { onCta: () => void }) {
    return (
        <div
            style={{
                padding: '60px 40px',
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
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <MatIcon name="travel_explore" size={28} color="var(--fg-5)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>条件に合う募集がありません</div>
            <div style={{ fontSize: 13, color: 'var(--fg-4)' }}>あなたが最初の募集者になりませんか？</div>
            <button
                type="button"
                onClick={onCta}
                style={{
                    padding: '10px 18px',
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
                同行者を募集する
            </button>
        </div>
    );
}

const selectStyle: CSSProperties = {
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
};
