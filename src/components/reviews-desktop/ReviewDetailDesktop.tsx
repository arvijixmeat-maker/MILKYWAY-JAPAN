import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatIcon } from '../desktop-primitives/MatIcon';

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
    comments?: string | CommentItem[];
    helpful_count?: number;
    helpfulCount?: number;
    helpful_users?: string | string[];
}

interface CommentItem {
    id?: string | number;
    user_name?: string;
    userName?: string;
    content?: string;
    created_at?: string;
    createdAt?: string;
}

interface ReviewDetailDesktopProps {
    review: ApiReview;
    helpful?: boolean;
    onHelpful?: () => void;
    onAddComment?: (content: string) => void;
    contentWidth?: number;
}

function parseJsonArray<T = string>(val: unknown): T[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as T[];
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
    return `${d} 日前`;
}

export function ReviewDetailDesktop({ review, helpful = false, onHelpful, onAddComment, contentWidth = 1280 }: ReviewDetailDesktopProps) {
    const navigate = useNavigate();
    const [comment, setComment] = useState('');
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, [review?.id]);

    if (!review) return null;

    const author = review.user_name || review.userName || '匿名';
    const avatar = review.user_image || review.userImage;
    const rating = review.rating || 5;
    const date = formatDate(review.created_at || review.createdAt);
    const productName = review.product_name || review.productName || 'モンゴルツアー';
    const productId = review.product_id || review.productId;
    const images = parseJsonArray<string>(review.images);
    const comments = parseJsonArray<CommentItem>(review.comments);
    const helpfulCount = review.helpful_count ?? review.helpfulCount ?? 0;

    const submitComment = () => {
        if (!comment.trim() || !onAddComment) return;
        onAddComment(comment.trim());
        setComment('');
    };

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
                    <button type="button" onClick={() => navigate('/')} style={crumbBtn}>ホーム</button>
                    <MatIcon name="chevron_right" size={14} color="var(--fg-6)" />
                    <button type="button" onClick={() => navigate('/reviews')} style={crumbBtn}>レビュー</button>
                    <MatIcon name="chevron_right" size={14} color="var(--fg-6)" />
                    <span style={{ color: 'var(--fg-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 480 }}>
                        {review.title || `${author} 様のレビュー`}
                    </span>
                </div>
            </div>

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 0' }}>
                {/* Author section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 999,
                            background: avatar ? `url(${avatar}) center/cover` : 'var(--primary-tint)',
                            color: '#0f766e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    >
                        {!avatar && author.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4, letterSpacing: '-0.01em' }}>{author} 様</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 1 }}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <MatIcon key={i} name="star" size={16} filled color={i < rating ? '#facc15' : '#e2e8f0'} />
                                ))}
                            </div>
                            {date && <span style={{ fontSize: 12, color: 'var(--fg-5)' }}>{date}</span>}
                        </div>
                    </div>
                    {productId && (
                        <button
                            type="button"
                            onClick={() => navigate(`/products/${productId}`)}
                            style={{
                                background: 'var(--primary-tint)',
                                color: 'var(--primary-dark)',
                                border: 'none',
                                borderRadius: 999,
                                padding: '8px 16px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <MatIcon name="local_offer" size={14} color="var(--primary-dark)" />
                            {productName}
                        </button>
                    )}
                </div>

                {/* Title + content */}
                {review.title && (
                    <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 18px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                        {review.title}
                    </h1>
                )}
                {review.content && (
                    <div style={{ fontSize: 16, color: 'var(--fg-2)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{review.content}</div>
                )}

                {/* Image gallery */}
                {images.length > 0 && (
                    <div
                        style={{
                            marginTop: 28,
                            display: 'grid',
                            gridTemplateColumns: images.length === 1 ? '1fr' : images.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
                            gap: 8,
                            borderRadius: 18,
                            overflow: 'hidden',
                        }}
                    >
                        {images.slice(0, 3).map((img, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setLightboxIdx(i)}
                                aria-label={`image ${i + 1}`}
                                style={{
                                    aspectRatio: images.length === 1 ? '16/9' : '1/1',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    backgroundImage: `url(${img})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    borderRadius: 12,
                                    position: 'relative',
                                }}
                            >
                                {i === 2 && images.length > 3 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(0,0,0,0.5)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 18,
                                            fontWeight: 700,
                                            borderRadius: 12,
                                        }}
                                    >
                                        +{images.length - 3}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Helpful */}
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
                    <button
                        type="button"
                        onClick={onHelpful}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '12px 24px',
                            background: helpful ? 'var(--primary-tint)' : '#fff',
                            color: helpful ? 'var(--primary-dark)' : 'var(--fg-2)',
                            border: helpful ? '1px solid #0f766e' : '1px solid var(--border)',
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        <MatIcon name="thumb_up" size={16} filled={helpful} color={helpful ? '#0f766e' : 'var(--fg-3)'} />
                        参考になった ({helpfulCount + (helpful ? 1 : 0)})
                    </button>
                </div>

                {/* Comments */}
                <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border-subtle)' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 18px', letterSpacing: '-0.01em' }}>
                        コメント <span style={{ color: 'var(--fg-5)', fontWeight: 500, fontSize: 16 }}>({comments.length})</span>
                    </h2>

                    <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
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
                                fontSize: 14,
                                fontWeight: 700,
                                flexShrink: 0,
                            }}
                        >
                            あ
                        </div>
                        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: '#fff' }}>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="コメントを入力してください..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'vertical',
                                    background: 'transparent',
                                    fontSize: 14,
                                    color: 'var(--fg-1)',
                                    fontFamily: 'inherit',
                                    lineHeight: 1.65,
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                                <button
                                    type="button"
                                    onClick={submitComment}
                                    disabled={!comment.trim()}
                                    style={{
                                        padding: '10px 22px',
                                        background: comment.trim() ? '#0f766e' : 'var(--bg-muted)',
                                        color: comment.trim() ? '#fff' : 'var(--fg-5)',
                                        border: 'none',
                                        borderRadius: 10,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: comment.trim() ? 'pointer' : 'default',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    投稿
                                </button>
                            </div>
                        </div>
                    </div>

                    {comments.length === 0 ? (
                        <div
                            style={{
                                padding: '40px 24px',
                                textAlign: 'center',
                                background: 'var(--bg-muted)',
                                borderRadius: 16,
                                color: 'var(--fg-5)',
                                fontSize: 13,
                            }}
                        >
                            最初のコメントを残してみましょう
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {comments.map((c, i) => (
                                <div key={c.id ?? i} style={{ display: 'flex', gap: 14 }}>
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
                                            fontSize: 14,
                                            fontWeight: 700,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {(c.user_name || c.userName || '?').charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>
                                                {c.user_name || c.userName || '匿名'}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--fg-5)' }}>{timeAgo(c.created_at || c.createdAt)}</span>
                                        </div>
                                        <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.7 }}>{c.content}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ height: 96 }} />
            </div>

            {/* Lightbox */}
            {lightboxIdx !== null && images.length > 0 && (
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
                    onClick={() => setLightboxIdx(null)}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', marginBottom: 24 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{lightboxIdx + 1} / {images.length}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIdx(null);
                            }}
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
                    <div
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={images[lightboxIdx]}
                            alt=""
                            style={{ maxWidth: '92%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
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
