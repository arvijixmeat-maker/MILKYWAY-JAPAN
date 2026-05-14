import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { PageHero } from '../desktop-primitives/PageHero';

interface ApiReview {
    id: string | number;
    user_name?: string;
    userName?: string;
    user_image?: string;
    userImage?: string;
    created_at?: string;
    createdAt?: string;
    rating?: number;
    title?: string;
    product_name?: string;
    productName?: string;
    product_id?: string;
    productId?: string;
    content?: string;
    images?: string | string[];
}

interface Review {
    id: string | number;
    author: string;
    avatar?: string;
    date: string;
    rating: number;
    title: string;
    productName: string;
    productId?: string;
    content: string;
    images: string[];
}

function parseImages(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as string[];
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function UserReviewsDesktop({ contentWidth = 1280 }: { contentWidth?: number }) {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'latest' | 'rating' | 'photo'>('latest');

    const { data: reviews = [], isLoading } = useQuery<Review[]>({
        queryKey: ['userReviews', 'desktop'],
        queryFn: async () => {
            try {
                const data = await api.reviews.list();
                if (!Array.isArray(data)) return [];
                return (data as ApiReview[]).map((r): Review => ({
                    id: r.id,
                    author: r.user_name || r.userName || '匿名',
                    avatar: r.user_image || r.userImage,
                    date: formatDate(r.created_at || r.createdAt),
                    rating: r.rating || 5,
                    title: r.title || '',
                    productName: r.product_name || r.productName || 'モンゴルツアー',
                    productId: r.product_id || r.productId,
                    content: r.content || '',
                    images: parseImages(r.images),
                }));
            } catch (e) {
                console.error('Reviews fetch error:', e);
                return [];
            }
        },
        staleTime: 1000 * 60 * 5,
    });

    const stats = useMemo(() => {
        if (reviews.length === 0) return { avg: 0, dist: [0, 0, 0, 0, 0] };
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const dist = [5, 4, 3, 2, 1].map((s) => {
            const count = reviews.filter((r) => Math.round(r.rating) === s).length;
            return Math.round((count / reviews.length) * 100);
        });
        return { avg: +(sum / reviews.length).toFixed(1), dist };
    }, [reviews]);

    const sorted = useMemo(() => {
        const list = reviews.slice();
        if (filter === 'rating') list.sort((a, b) => b.rating - a.rating);
        else if (filter === 'photo') return list.filter((r) => r.images.length > 0);
        else list.sort((a, b) => b.date.localeCompare(a.date));
        return list;
    }, [reviews, filter]);

    return (
        <div style={{ background: '#fff' }}>
            <PageHero
                eyebrow="Real Reviews"
                title="実際の旅行者のレビュー"
                subtitle="日本語ガイド同行で安心のモンゴルツアー、お客様の声を集めました。"
                breadcrumbs={[
                    { label: 'ホーム', path: '/' },
                    { label: 'レビュー' },
                ]}
                contentWidth={contentWidth}
                aside={
                    <button
                        type="button"
                        onClick={() => navigate('/reviews/write')}
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
                        <MatIcon name="edit" size={18} color="#fff" />
                        レビューを書く
                    </button>
                }
            />

            {/* Stats block */}
            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '40px 32px 0' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '320px 1fr',
                        gap: 48,
                        padding: '32px 36px',
                        background: 'var(--bg-muted)',
                        borderRadius: 24,
                        border: '1px solid var(--border-subtle)',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                        <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {stats.avg || '—'}
                        </div>
                        <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <MatIcon
                                    key={i}
                                    name="star"
                                    size={24}
                                    filled
                                    color={i < Math.round(stats.avg) ? '#facc15' : '#e2e8f0'}
                                />
                            ))}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--fg-4)', marginTop: 12 }}>累計 {reviews.length} 件のレビュー</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                        {[5, 4, 3, 2, 1].map((s, i) => (
                            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <span style={{ fontSize: 13, color: 'var(--fg-5)', width: 26, fontWeight: 600 }}>★ {s}</span>
                                <div style={{ flex: 1, height: 10, background: '#fff', borderRadius: 999, overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            width: `${stats.dist[i]}%`,
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
                                        width: 40,
                                        textAlign: 'right',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {stats.dist[i]}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Filter tabs */}
            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '32px 32px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>
                        全てのレビュー <span style={{ color: 'var(--fg-5)', fontWeight: 500, fontSize: 16, marginLeft: 8 }}>({sorted.length})</span>
                    </h2>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {(
                            [
                                { v: 'latest' as const, l: '最新順' },
                                { v: 'rating' as const, l: '評価高い順' },
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
                                        padding: '10px 20px',
                                        borderRadius: 999,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        background: on ? 'var(--primary-dark)' : '#fff',
                                        color: on ? '#fff' : 'var(--fg-3)',
                                        border: on ? '1px solid var(--primary-dark)' : '1px solid var(--border)',
                                    }}
                                >
                                    {f.l}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-5)' }}>読み込み中...</div>
                ) : sorted.length === 0 ? (
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
                            <MatIcon name="reviews" size={28} color="var(--fg-5)" />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>レビューがまだありません</div>
                        <div style={{ fontSize: 13, color: 'var(--fg-4)' }}>あなたが最初のレビュアーになりませんか？</div>
                        <button
                            type="button"
                            onClick={() => navigate('/reviews/write')}
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
                            レビューを書く
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
                        {sorted.map((r) => (
                            <ReviewCard key={r.id} r={r} onClick={() => navigate(`/reviews/${r.id}`)} />
                        ))}
                    </div>
                )}
            </section>

            <div style={{ height: 96 }} />
        </div>
    );
}

function ReviewCard({ r, onClick }: { r: Review; onClick: () => void }) {
    const navigate = useNavigate();
    return (
        <div
            onClick={onClick}
            role="button"
            style={{
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 18,
                padding: 22,
                boxShadow: 'var(--shadow-toss)',
                cursor: 'pointer',
                transition: 'all 200ms',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                minHeight: 280,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        background: r.avatar ? `url(${r.avatar}) center/cover` : 'var(--primary-tint)',
                        color: '#0f766e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 15,
                        flexShrink: 0,
                    }}
                >
                    {!r.avatar && r.author.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 3 }}>{r.author} 様</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 1 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <MatIcon
                                    key={i}
                                    name="star"
                                    size={13}
                                    filled
                                    color={i < r.rating ? '#facc15' : '#e2e8f0'}
                                />
                            ))}
                        </div>
                        {r.date && <span style={{ fontSize: 11, color: 'var(--fg-5)' }}>{r.date}</span>}
                    </div>
                </div>
            </div>

            {r.productName && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (r.productId) navigate(`/products/${r.productId}`);
                    }}
                    style={{
                        alignSelf: 'flex-start',
                        background: 'var(--bg-muted)',
                        border: 'none',
                        borderRadius: 999,
                        padding: '5px 12px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--fg-3)',
                        cursor: r.productId ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                    }}
                >
                    <MatIcon name="local_offer" size={12} color="var(--fg-4)" /> {r.productName}
                </button>
            )}

            {r.title && (
                <div
                    style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        lineHeight: 1.4,
                        letterSpacing: '-0.01em',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {r.title}
                </div>
            )}

            <div
                style={{
                    fontSize: 13,
                    color: 'var(--fg-3)',
                    lineHeight: 1.7,
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}
            >
                {r.content}
            </div>

            {r.images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {r.images.slice(0, 3).map((img, i) => (
                        <div
                            key={i}
                            style={{
                                aspectRatio: '1/1',
                                backgroundImage: `url(${img})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: 8,
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {i === 2 && r.images.length > 3 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.5)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    +{r.images.length - 3}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
