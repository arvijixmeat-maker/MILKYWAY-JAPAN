import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatIcon } from '../desktop-primitives/MatIcon';

interface ApiPost {
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
    authorInfo?: string;
    author_info?: string;
    authorImage?: string;
    author_image?: string;
    viewCount?: number;
    view_count?: number;
    userId?: string;
    user_id?: string;
}

interface CommentItem {
    id?: string | number;
    user_name?: string;
    userName?: string;
    content?: string;
    created_at?: string;
    createdAt?: string;
    user_image?: string;
    isAuthor?: boolean;
}

interface ProductDetailDesktopProps {
    post: ApiPost;
    comments?: CommentItem[];
    isOwner?: boolean;
    onPostComment?: (content: string) => void;
    onEdit?: () => void;
    onDelete?: () => void;
    contentWidth?: number;
}

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

export function TravelMateDetailDesktop({
    post,
    comments = [],
    isOwner = false,
    onPostComment,
    onEdit,
    onDelete,
    contentWidth = 1280,
}: ProductDetailDesktopProps) {
    const navigate = useNavigate();
    const [comment, setComment] = useState('');
    const [requested, setRequested] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, [post?.id]);

    const styles = useMemo(() => parseJsonArray(post?.styles), [post?.styles]);
    const ageGroups = useMemo(
        () => parseJsonArray(post?.ageGroups || post?.age_groups),
        [post?.ageGroups, post?.age_groups]
    );
    const capacity = post?.recruitCount ?? post?.recruit_count ?? post?.maxMembers ?? post?.max_members ?? 0;
    const joined = post?.currentMembers ?? post?.current_members ?? 0;
    const status: 'open' | 'almost' | 'full' = useMemo(() => {
        if (post?.status === 'closed' || post?.status === 'matched' || post?.status === 'full') return 'full';
        if (capacity > 0 && joined >= capacity) return 'full';
        if (capacity > 0 && joined / capacity >= 0.75) return 'almost';
        return 'open';
    }, [post?.status, capacity, joined]);

    if (!post) return null;

    const startDate = post.startDate || post.start_date || '';
    const endDate = post.endDate || post.end_date || '';
    const dateRange = startDate
        ? endDate
            ? `${startDate.replace(/-/g, '.')} 〜 ${endDate.replace(/-/g, '.')}`
            : startDate.replace(/-/g, '.')
        : '';
    const authorName = post.authorName || post.author_name || '匿名';
    const authorInitial = authorName.charAt(0);
    const views = post.viewCount ?? post.view_count ?? 0;
    const statusInfo = {
        open: { label: '募集中', bg: '#0f766e' },
        almost: { label: '残り席わずか', bg: '#dc2626' },
        full: { label: 'マッチ済み', bg: 'var(--fg-4)' },
    }[status];
    const pct = capacity > 0 ? (joined / capacity) * 100 : 0;

    const submitComment = () => {
        if (!comment.trim() || !onPostComment) return;
        onPostComment(comment.trim());
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
                    <button type="button" onClick={() => navigate('/travel-mates')} style={crumbBtn}>同行者募集</button>
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
                        {post.title}
                    </span>
                </div>
            </div>

            <div style={{ maxWidth: contentWidth, margin: '0 auto', padding: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48, alignItems: 'flex-start' }}>
                    {/* Main column */}
                    <div>
                        {/* Status row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    padding: '5px 12px',
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
                            {post.region && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-3)' }}>
                                    <MatIcon name="location_on" size={14} filled color="#0f766e" /> {post.region}
                                </span>
                            )}
                            <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--border-strong)' }} />
                            <span style={{ fontSize: 12, color: 'var(--fg-5)' }}>{timeAgo(post.createdAt || post.created_at)}</span>
                            <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--border-strong)' }} />
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-5)' }}>
                                <MatIcon name="visibility" size={14} color="var(--fg-5)" /> {views} 閲覧
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-5)' }}>
                                <MatIcon name="forum" size={14} color="var(--fg-5)" /> {comments.length} コメント
                            </span>

                            {isOwner && (
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                    {onEdit && (
                                        <button type="button" onClick={onEdit} style={ownerBtn}>
                                            <MatIcon name="edit" size={14} color="var(--fg-2)" /> 編集
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button type="button" onClick={onDelete} style={{ ...ownerBtn, color: '#dc2626', borderColor: '#fecaca' }}>
                                            <MatIcon name="delete" size={14} color="#dc2626" /> 削除
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <h1 style={{ fontSize: 34, fontWeight: 700, color: 'var(--fg-1)', margin: 0, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                            {post.title}
                        </h1>

                        {/* Cover image */}
                        {post.image && (
                            <div
                                style={{
                                    marginTop: 22,
                                    aspectRatio: '16/9',
                                    borderRadius: 24,
                                    backgroundImage: `url(${post.image})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
                                }}
                            />
                        )}

                        {/* Stat grid */}
                        <div
                            style={{
                                marginTop: 28,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 14,
                                padding: '22px 24px',
                                background: 'var(--bg-muted)',
                                borderRadius: 20,
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            {[
                                { i: 'calendar_month', k: '旅行期間', v: dateRange || '相談', sub: post.duration },
                                { i: 'group', k: '募集人数', v: capacity > 0 ? `${capacity} 名` : '相談', sub: capacity > 0 ? `現在 ${joined} 名参加中` : undefined },
                                { i: 'wc', k: '性別', v: post.gender || '問わず' },
                                { i: 'cake', k: '希望年齢', v: ageGroups.length > 0 ? ageGroups.join('・') : '指定なし' },
                            ].map((s) => (
                                <div key={s.k} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                    <div
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 12,
                                            background: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: 'var(--shadow-toss)',
                                        }}
                                    >
                                        <MatIcon name={s.i} size={22} color="#0f766e" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--fg-5)' }}>{s.k}</div>
                                        <div
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: 'var(--fg-1)',
                                                marginTop: 2,
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {s.v}
                                        </div>
                                        {s.sub && <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 1 }}>{s.sub}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Style chips */}
                        {styles.length > 0 && (
                            <div style={{ marginTop: 28 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 10 }}>旅行スタイル</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {styles.map((s) => (
                                        <span
                                            key={s}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'var(--primary-tint)',
                                                color: 'var(--primary-dark)',
                                                borderRadius: 999,
                                                fontSize: 13,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Body content */}
                        <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
                                詳細内容
                            </h2>
                            {post.description ? (
                                <div
                                    style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.85 }}
                                    dangerouslySetInnerHTML={{ __html: post.description }}
                                />
                            ) : (
                                <p style={{ fontSize: 15, color: 'var(--fg-4)', lineHeight: 1.85 }}>説明はまだ追加されていません。</p>
                            )}

                            <div
                                style={{
                                    marginTop: 24,
                                    padding: '16px 20px',
                                    background: 'var(--primary-tint)',
                                    borderRadius: 12,
                                    fontSize: 13,
                                    color: 'var(--primary-dark)',
                                    display: 'flex',
                                    gap: 12,
                                    alignItems: 'flex-start',
                                    lineHeight: 1.65,
                                }}
                            >
                                <MatIcon name="info" size={20} filled color="var(--primary-dark)" style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>
                                    <strong>本サービスは個人同士のマッチング</strong>です。実際にお会いする前にメッセージで十分にお話しいただき、ご自身で安全をご確認ください。
                                </span>
                            </div>
                        </div>

                        {/* Comments */}
                        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border-subtle)' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 18px', letterSpacing: '-0.01em' }}>
                                コメント <span style={{ color: 'var(--fg-5)', fontWeight: 500, fontSize: 16 }}>({comments.length})</span>
                            </h2>

                            {/* Comment input */}
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
                                        <div key={c.id ?? i} style={{ display: 'flex', gap: 14, marginLeft: c.isAuthor ? 32 : 0 }}>
                                            <div
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 999,
                                                    background: c.isAuthor ? '#0f766e' : 'var(--primary-tint)',
                                                    color: c.isAuthor ? '#fff' : '#0f766e',
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
                                                    {c.isAuthor && (
                                                        <span
                                                            style={{
                                                                fontSize: 10,
                                                                fontWeight: 700,
                                                                padding: '2px 7px',
                                                                background: '#0f766e',
                                                                color: '#fff',
                                                                borderRadius: 4,
                                                                letterSpacing: '0.04em',
                                                            }}
                                                        >
                                                            HOST
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: 11, color: 'var(--fg-5)' }}>
                                                        {timeAgo(c.created_at || c.createdAt)}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.7 }}>{c.content}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sticky right panel */}
                    <aside style={{ position: 'sticky', top: 156, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Apply card */}
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: 20,
                                padding: 24,
                                boxShadow: '0 12px 32px -8px rgba(0,0,0,0.1)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    color: '#0f766e',
                                    textTransform: 'uppercase',
                                    marginBottom: 10,
                                }}
                            >
                                This Trip
                            </div>

                            {capacity > 0 && (
                                <div style={{ marginBottom: 18 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                                        <div>
                                            <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
                                                {joined}
                                            </span>
                                            <span style={{ fontSize: 16, color: 'var(--fg-5)', marginLeft: 6 }}>/ {capacity} 名 参加中</span>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: status === 'full' ? 'var(--fg-5)' : '#0f766e',
                                            }}
                                        >
                                            {status === 'full' ? '募集終了' : `残り ${capacity - joined} 席`}
                                        </span>
                                    </div>
                                    <div style={{ height: 10, background: 'var(--bg-muted)', borderRadius: 999, overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                width: `${pct}%`,
                                                height: '100%',
                                                background:
                                                    status === 'full' ? 'var(--fg-5)' : 'linear-gradient(to right, #0f766e, #115e59)',
                                                borderRadius: 999,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setRequested(!requested)}
                                disabled={status === 'full'}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: status === 'full' ? 'var(--bg-muted)' : requested ? '#16a34a' : '#0f766e',
                                    color: status === 'full' ? 'var(--fg-5)' : '#fff',
                                    border: 'none',
                                    borderRadius: 12,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: status === 'full' ? 'default' : 'pointer',
                                    fontFamily: 'inherit',
                                    boxShadow: status !== 'full' && !requested ? '0 8px 20px -6px rgba(15,118,110,0.5)' : 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                }}
                            >
                                {status === 'full' ? (
                                    '募集終了しました'
                                ) : requested ? (
                                    <>
                                        <MatIcon name="check_circle" size={18} filled color="#fff" />
                                        参加リクエスト送信済み
                                    </>
                                ) : (
                                    '参加リクエストを送る'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof window.openChannelTalk === 'function') window.openChannelTalk();
                                }}
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
                                ホストにメッセージ
                            </button>

                            <div
                                style={{
                                    marginTop: 14,
                                    padding: '12px 14px',
                                    background: 'var(--primary-tint)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    color: 'var(--primary-dark)',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'flex-start',
                                    lineHeight: 1.55,
                                }}
                            >
                                <MatIcon name="shield_person" size={16} filled color="var(--primary-dark)" />
                                <span>本人確認済みのメンバーのみ参加リクエスト可能。匿名でメッセージ可。</span>
                            </div>
                        </div>

                        {/* Host profile */}
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 20,
                                padding: 22,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    color: 'var(--fg-5)',
                                    textTransform: 'uppercase',
                                    marginBottom: 14,
                                }}
                            >
                                Host
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 999,
                                        background: 'linear-gradient(135deg, #0f766e, #115e59)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 20,
                                        fontWeight: 700,
                                    }}
                                >
                                    {authorInitial}
                                </div>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>
                                        {authorName}
                                    </div>
                                    {(post.authorInfo || post.author_info) && (
                                        <div style={{ fontSize: 12, color: 'var(--fg-5)', marginTop: 3 }}>
                                            {post.authorInfo || post.author_info}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/travel-mates')}
                                style={{
                                    marginTop: 14,
                                    width: '100%',
                                    padding: '10px',
                                    background: '#fff',
                                    color: 'var(--fg-2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                同行者の一覧を見る
                            </button>
                        </div>

                        {/* Share */}
                        <div style={{ background: 'var(--bg-muted)', borderRadius: 16, padding: 18 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 10 }}>シェア</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { i: 'chat', l: 'LINE' },
                                    { i: 'link', l: 'URL' },
                                    { i: 'share', l: 'その他' },
                                ].map((s) => (
                                    <button
                                        key={s.l}
                                        type="button"
                                        onClick={() => {
                                            if (s.i === 'link' && navigator.clipboard) {
                                                void navigator.clipboard.writeText(window.location.href);
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: '#fff',
                                            border: '1px solid var(--border)',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: 'var(--fg-3)',
                                        }}
                                    >
                                        <MatIcon name={s.i} size={18} color="var(--fg-3)" />
                                        {s.l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
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

const ownerBtn: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--fg-2)',
    cursor: 'pointer',
    fontFamily: 'inherit',
};
