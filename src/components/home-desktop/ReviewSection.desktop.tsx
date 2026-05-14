import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { SectionHeader } from '../desktop-primitives/SectionHeader';

interface ReviewSectionProps {
    contentWidth?: number;
}

interface ReviewItem {
    id: string | number;
    author: string;
    rating: number;
    content: string;
    productName: string;
    visitDate?: string;
}

export function ReviewSectionDesktop({ contentWidth = 1280 }: ReviewSectionProps) {
    const navigate = useNavigate();

    interface RawReview {
        id?: string | number;
        user_name?: string;
        rating?: number;
        content?: string;
        product_name?: string;
        visit_date?: string;
    }

    const { data: reviews = [] } = useQuery<ReviewItem[]>({
        queryKey: ['homeReviewsDesktop'],
        queryFn: async () => {
            try {
                const data = await api.reviews.list();
                if (Array.isArray(data)) {
                    return (data as RawReview[]).slice(0, 4).map((r) => ({
                        id: r.id ?? '',
                        author: r.user_name || '',
                        rating: r.rating || 5,
                        content: r.content || '',
                        productName: r.product_name || 'モンゴルツアー',
                        visitDate: r.visit_date,
                    }));
                }
            } catch (e) {
                console.error('Error fetching reviews:', e);
            }
            return [];
        },
        staleTime: 1000 * 60 * 10,
    });

    const displayReviews: ReviewItem[] = reviews.length > 0 ? reviews : [];

    return (
        <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '72px 32px 0' }}>
            <SectionHeader
                eyebrow="Real Reviews"
                title="実際の旅行者のレビュー"
                subtitle="日本語ガイド同行で安心のモンゴルツアー、お客様の声"
                onAll={() => navigate('/reviews')}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
                {displayReviews.length > 0
                    ? displayReviews.map((r) => (
                        <div
                            key={r.id}
                            role="button"
                            onClick={() => navigate(`/reviews/${r.id}`)}
                            style={{
                                background: '#fff',
                                borderRadius: 20,
                                padding: 26,
                                border: '1px solid var(--border-subtle)',
                                boxShadow: 'var(--shadow-review)',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 280,
                                transition: 'all 200ms',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 999,
                                        background: 'var(--primary-tint)',
                                        color: '#0f766e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 15,
                                    }}
                                >
                                    {r.author?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 3 }}>
                                        {r.author} 様
                                    </div>
                                    <div style={{ display: 'flex', gap: 1 }}>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <MatIcon
                                                key={i}
                                                name="star"
                                                size={14}
                                                filled
                                                color={i < r.rating ? '#facc15' : '#e2e8f0'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div
                                style={{
                                    fontSize: 14,
                                    color: 'var(--fg-3)',
                                    lineHeight: 1.65,
                                    flex: 1,
                                    marginBottom: 16,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 5,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }}
                            >
                                {r.content}
                            </div>
                            <div
                                style={{
                                    paddingTop: 14,
                                    borderTop: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 11,
                                    color: 'var(--fg-5)',
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 700,
                                        color: 'var(--fg-3)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 180,
                                    }}
                                >
                                    {r.productName}
                                </span>
                                {r.visitDate && <span>{r.visitDate}</span>}
                            </div>
                        </div>
                    ))
                    : Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                background: 'var(--bg-muted)',
                                borderRadius: 20,
                                padding: 26,
                                minHeight: 280,
                                opacity: 0.6,
                            }}
                        />
                    ))}
            </div>
        </section>
    );
}
