import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { optimizeImage } from '../utils/imageOptimizer';
import { BottomNav } from '../components/layout/BottomNav';
import { formatShortDate, formatRelativeTime } from '../utils/formatDate';
import { ReviewStars, shouldShowTitle } from '../components/review/ReviewStars';
import { ReviewAvatar } from '../components/review/ReviewAvatar';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { DesktopLayout } from '../components/layout-desktop/DesktopLayout';
import { ReviewDetailDesktop } from '../components/reviews-desktop/ReviewDetailDesktop';

export const ReviewDetail: React.FC = () => {
    const isDesktop = useIsDesktop();
    if (isDesktop) return <ReviewDetailDesktopContainer />;
    return <ReviewDetailMobile />;
};

const ReviewDetailDesktopContainer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [review, setReview] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [helpful, setHelpful] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        if (!id) return;
        (async () => {
            try {
                const [r, me] = await Promise.all([
                    api.reviews.get(id),
                    api.auth.me().catch(() => null),
                ]);
                if (cancelled) return;
                setReview(r);
                setCurrentUser(me);
                if (me && r) {
                    let helpfulUsers: string[] = [];
                    try {
                        helpfulUsers = typeof r.helpful_users === 'string' ? JSON.parse(r.helpful_users) : r.helpful_users || [];
                    } catch { helpfulUsers = []; }
                    if (helpfulUsers.includes(me.id)) setHelpful(true);
                }
            } catch (e) {
                console.error('Review detail fetch error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    if (loading) {
        return (
            <DesktopLayout>
                <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-5)' }}>読み込み中...</div>
            </DesktopLayout>
        );
    }
    if (!review) {
        return (
            <DesktopLayout>
                <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-5)' }}>レビューが見つかりません</div>
            </DesktopLayout>
        );
    }

    const toggleHelpful = async () => {
        if (!id || !currentUser) return;
        let users: string[] = [];
        try { users = typeof review.helpful_users === 'string' ? JSON.parse(review.helpful_users) : review.helpful_users || []; }
        catch { users = []; }
        const next = users.includes(currentUser.id) ? users.filter((u) => u !== currentUser.id) : [...users, currentUser.id];
        try {
            await api.reviews.update(id, { helpful_users: JSON.stringify(next), helpful_count: next.length });
            setHelpful(next.includes(currentUser.id));
        } catch (e) { console.error(e); }
    };

    const addComment = async (content: string) => {
        if (!id || !currentUser) return;
        let comments: any[] = [];
        try { comments = typeof review.comments === 'string' ? JSON.parse(review.comments) : review.comments || []; }
        catch { comments = []; }
        const newComment = {
            id: Date.now().toString(),
            user_id: currentUser.id,
            user_name: currentUser.name || currentUser.email || '匿名',
            content,
            created_at: new Date().toISOString(),
        };
        const next = [...comments, newComment];
        try {
            await api.reviews.update(id, { comments: JSON.stringify(next) });
            setReview({ ...review, comments: JSON.stringify(next) });
        } catch (e) { console.error(e); }
    };

    return (
        <DesktopLayout>
            <ReviewDetailDesktop review={review} helpful={helpful} onHelpful={toggleHelpful} onAddComment={addComment} />
        </DesktopLayout>
    );
};

const ReviewDetailMobile: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { t, i18n } = useTranslation();

    const [review, setReview] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');

    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const me = await api.auth.me();
                if (me) {
                    setCurrentUser({
                        id: me.id,
                        name: me.user_metadata?.full_name || me.name || me.email?.split('@')[0] || '旅行者',
                        image: me.user_metadata?.avatar_url || me.avatar_url,
                        role: me.role,
                    });
                }
            } catch (e) { /* ignore */ }
        };
        checkUser();

        const fetchReview = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const data = await api.reviews.get(id);

                if (data) {
                    let parsedImages = [];
                    try { parsedImages = typeof data.images === 'string' ? JSON.parse(data.images) : (data.images || []); } catch (e) { parsedImages = []; }
                    
                    let parsedComments = [];
                    try { parsedComments = typeof data.comments === 'string' ? JSON.parse(data.comments) : (data.comments || []); } catch (e) { parsedComments = []; }
                    
                    let parsedHelpfulUsers = [];
                    try { parsedHelpfulUsers = typeof data.helpful_users === 'string' ? JSON.parse(data.helpful_users) : (data.helpful_users || []); } catch (e) { parsedHelpfulUsers = []; }

                    setReview({
                        id: data.id,
                        author: data.user_name,
                        userId: data.user_id,
                        date: formatShortDate(data.created_at, i18n.language),
                        rating: data.rating,
                        title: data.title,
                        productName: data.product_name,
                        productId: data.product_id,
                        content: data.content,
                        images: parsedImages,
                        userImage: data.user_image,
                        comments: parsedComments,
                        helpfulCount: data.helpful_count || 0,
                        helpfulUsers: parsedHelpfulUsers
                    });
                }
            } catch (error) {
                console.error("Error fetching review:", error);
            }
            setLoading(false);
        };
        fetchReview();
    }, [id]);

    const handleAddComment = async () => {
        if (!currentUser) {
            alert(t('review_detail.login_required'));
            // navigate('/login'); // Optional functionality
            return;
        }
        if (!newComment.trim() || !review || !id) return;
        setSubmitting(true);
        try {
            const comment = {
                id: Date.now().toString(),
                author: currentUser.name,
                content: newComment,
                date: new Date().toISOString(),
                userImage: currentUser.image,
                userId: currentUser.id // Store userId for potential future delete/edit features
            };

            const updatedComments = [...(review.comments || []), comment];

            await api.reviews.update(id, { comments: updatedComments });

            setReview({ ...review, comments: updatedComments });
            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert(t('review_detail.add_comment_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddReply = async (commentId: string) => {
        if (!currentUser) {
            alert(t('review_detail.login_required'));
            return;
        }
        if (!replyContent.trim() || !review || !id) return;
        setSubmitting(true);
        try {
            const reply = {
                id: Date.now().toString(),
                author: currentUser.name,
                content: replyContent,
                date: new Date().toISOString(),
                userImage: currentUser.image,
                userId: currentUser.id
            };

            const updatedComments = [...(review.comments || []), reply];

            await api.reviews.update(id, { comments: updatedComments });

            setReview({ ...review, comments: updatedComments });
            setReplyContent('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Failed to add reply:', error);
            alert(t('review_detail.add_reply_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !review) return;
        const ok = window.confirm('このレビューを削除しますか？\nこの操作は取り消せません。');
        if (!ok) return;
        try {
            await api.reviews.delete(id);
            navigate('/reviews');
        } catch (error: any) {
            console.error('Failed to delete review:', error);
            alert('削除に失敗しました: ' + (error?.message || ''));
        }
    };

    // Delete is allowed for the review's own author or for admins.
    const canDelete = !!(currentUser && review && (
        review.userId === currentUser.id || currentUser.role === 'admin'
    ));

    const handleToggleHelpful = async () => {
        if (!currentUser) {
            alert(t('review_detail.login_required'));
            return;
        }
        if (!review || !id) return;
        try {
            const isHelpful = review.helpfulUsers?.includes(currentUser.id);
            let updatedUsers = review.helpfulUsers || [];
            let updatedCount = review.helpfulCount || 0;

            if (isHelpful) {
                updatedUsers = updatedUsers.filter((uid: string) => uid !== currentUser.id);
                updatedCount = Math.max(0, updatedCount - 1);
            } else {
                updatedUsers = [...updatedUsers, currentUser.id];
                updatedCount += 1;
            }

            await api.reviews.update(id, {
                helpful_count: updatedCount,
                helpful_users: updatedUsers
            });

            setReview({
                ...review,
                helpfulCount: updatedCount,
                helpfulUsers: updatedUsers
            });
        } catch (error) {
            console.error('Failed to toggle helpful:', error);
        }
    };

    if (loading) {
        return (
            <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white min-h-screen flex items-center justify-center">
                <p className="text-gray-400">{t('review_detail.loading')}</p>
            </div>
        );
    }

    if (!review) {
        return (
            <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white min-h-screen flex items-center justify-center">
                <p className="text-gray-400">{t('review_detail.not_found')}</p>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white min-h-screen pb-safe">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex size-10 items-center justify-start cursor-pointer text-[#0e1a18] dark:text-white"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h2 className={`text-[17px] font-bold leading-tight tracking-tight flex-1 text-center text-[#0e1a18] dark:text-white ${canDelete ? '' : 'pr-10'}`}>
                        {t('review_detail.title')}
                    </h2>
                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            aria-label="削除"
                            className="flex size-10 items-center justify-end cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    )}
                </div>
            </nav>

            <main className="max-w-md mx-auto pb-44">
                <section className="p-5">
                    <div className="flex items-start justify-between mb-6 gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                            <ReviewAvatar
                                src={review.userImage ? optimizeImage(review.userImage, { width: 48, height: 48 }) : undefined}
                                name={review.author}
                                size={48}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <p className="text-[16px] font-bold text-[#0e1a18] dark:text-white truncate">{review.author}</p>
                                    <span className="text-[14px] font-medium text-[#0e1a18] dark:text-white">様</span>
                                </div>
                                <ReviewStars rating={review.rating} size={20} className="mt-0.5" />
                            </div>
                        </div>
                        <div className="shrink-0 text-right mt-1">
                            <p className="text-[13px] text-gray-400">{review.date}</p>
                        </div>
                    </div>

                    {/* Tag */}
                    {review.productName && (
                        <button
                            onClick={() => {
                                if (review.productId) {
                                    navigate(`/products/${review.productId}`);
                                }
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 text-primary text-[14px] font-semibold rounded-xl mb-6 border border-gray-100 dark:border-zinc-700 w-full justify-between active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">explore</span>
                                {review.productName}
                            </div>
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    )}

                    {/* Content — title hidden when it's a redundant prefix of content (common admin-paste pattern) */}
                    {(shouldShowTitle(review.title, review.content) || (review.content ?? '').trim().length > 0) && (
                        <div className="mb-8">
                            {shouldShowTitle(review.title, review.content) && (
                                <h3 className="text-lg font-bold text-[#0e1a18] dark:text-white mb-2">{review.title}</h3>
                            )}
                            {(review.content ?? '').trim().length > 0 && (
                                <p className="text-[16px] leading-relaxed text-[#333d4b] dark:text-gray-200">
                                    {review.content}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Image Grid */}
                    {review.images && review.images.length > 0 && (
                        <div className={`grid gap-2 mb-8 ${review.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {review.images.slice(0, 3).map((img: string, idx: number) => (
                                <img
                                    key={idx}
                                    src={optimizeImage(img, { width: 600, height: 600 })}
                                    alt={`レビュー写真 ${idx + 1}`}
                                    className="aspect-square rounded-2xl object-cover w-full bg-gray-100 dark:bg-zinc-800"
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                            ))}
                            {review.images.length > 3 && (
                                <div className="relative aspect-square rounded-2xl overflow-hidden">
                                    <img
                                        src={optimizeImage(review.images[2], { width: 600, height: 600 })}
                                        alt={`レビュー写真 3`}
                                        className="absolute inset-0 w-full h-full object-cover bg-gray-100 dark:bg-zinc-800"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">+{review.images.length - 2}枚を見る</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Helpful Button */}
                    <div className="py-6 border-y border-gray-100 dark:border-zinc-800 flex flex-col items-center gap-4">
                        <p className="text-[15px] font-semibold text-[#4e5968] dark:text-gray-400">{t('review_detail.helpful_question')}</p>
                        <button
                            onClick={handleToggleHelpful}
                            className={`flex items-center gap-2 px-8 py-3 rounded-full border font-bold text-[15px] active:scale-95 transition-transform ${review.helpfulUsers?.includes(currentUser?.id)
                                ? 'bg-primary text-white border-primary'
                                : 'border-primary text-primary hover:bg-primary/5'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                            {t('review_detail.helpful_button')} {review.helpfulCount > 0 && review.helpfulCount}
                        </button>
                    </div>
                </section>

                {/* Comments Section */}
                <section className="bg-gray-50 dark:bg-zinc-900/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[16px] font-bold text-[#0e1a18] dark:text-white">{t('review_detail.comments')} {review.comments?.length || 0}</h3>
                    </div>
                    <div className="space-y-6">
                        {review.comments?.map((comment: any) => (
                            <div key={comment.id} className="flex gap-3">
                                <div
                                    className="w-8 h-8 rounded-full bg-gray-200 shrink-0 bg-cover bg-center"
                                    style={{ backgroundImage: comment.userImage ? `url('${optimizeImage(comment.userImage, { width: 32, height: 32 })}')` : undefined }}
                                >
                                    {!comment.userImage && <span className="material-symbols-outlined text-gray-400 w-full h-full flex items-center justify-center text-[18px]">person</span>}
                                </div>
                                <div className="flex-1">
                                    <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-zinc-700 shadow-sm">
                                        <p className="text-[13px] font-bold mb-1 text-[#0e1a18] dark:text-white">{comment.author}</p>
                                        <p className="text-[14px] text-[#333d4b] dark:text-gray-300">{comment.content}</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 px-1">
                                        <span className="text-[11px] text-gray-400">{formatRelativeTime(comment.date, i18n.language)}</span>
                                        <button
                                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                            className="text-[11px] font-bold text-gray-500 hover:text-primary transition-colors"
                                        >
                                            {replyingTo === comment.id ? t('review_detail.cancel') : t('review_detail.reply')}
                                        </button>
                                    </div>
                                    {/* Reply Input */}
                                    {replyingTo === comment.id && (
                                        <div className="mt-3 flex gap-2 items-center">
                                            <div className="flex-1">
                                                <input
                                                    value={replyContent}
                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                            handleAddReply(comment.id);
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-[#0e1a18] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    placeholder={t('review_detail.reply_placeholder')}
                                                    disabled={submitting}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleAddReply(comment.id)}
                                                disabled={!replyContent.trim() || submitting}
                                                className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                                            >
                                                {t('review_detail.submit')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(!review.comments || review.comments.length === 0) && (
                            <p className="text-center text-gray-400 py-4 text-sm">{t('review_detail.no_comments')}</p>
                        )}
                    </div>
                </section>
            </main>

            {/* Comment Input — docked directly above BottomNav (h-[84px]) with safe-area support */}
            <div
                className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800"
                style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="flex gap-2 items-center px-4 py-2.5">
                    <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                handleAddComment();
                            }
                        }}
                        className="flex-1 min-w-0 bg-gray-100 dark:bg-zinc-800 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-zinc-800 rounded-full px-4 py-2.5 text-sm text-[#0e1a18] dark:text-white placeholder:text-gray-400 outline-none transition-colors"
                        placeholder={t('review_detail.comment_placeholder')}
                        type="text"
                        disabled={submitting}
                    />
                    <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || submitting}
                        aria-label={t('review_detail.submit')}
                        className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white disabled:bg-gray-200 dark:disabled:bg-zinc-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};
