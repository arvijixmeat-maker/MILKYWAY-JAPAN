import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { optimizeImage } from '../utils/imageOptimizer';
import { BottomNav } from '../components/layout/BottomNav';

export const ReviewDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [review, setReview] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');

    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUser({
                    id: user.id,
                    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '여행자',
                    image: user.user_metadata?.avatar_url
                });
            }
        };
        checkUser();

        const fetchReview = async () => {
            if (!id) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setReview({
                    id: data.id,
                    author: data.author_name,
                    date: data.created_at ? data.created_at.substring(0, 10) : '',
                    rating: data.rating,
                    title: data.title,
                    productName: data.product_name,
                    productId: data.product_id,
                    content: data.content,
                    images: data.images || [],
                    userImage: data.user_image,
                    comments: data.comments || [],
                    helpfulCount: data.helpful_count || 0,
                    helpfulUsers: data.helpful_users || []
                });
            } else {
                console.error("Error fetching review:", error);
            }
            setLoading(false);
        };
        fetchReview();
    }, [id]);

    const handleAddComment = async () => {
        if (!currentUser) {
            alert('로그인이 필요한 서비스입니다.');
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

            const { error } = await supabase
                .from('reviews')
                .update({ comments: updatedComments })
                .eq('id', id);

            if (error) throw error;

            setReview({ ...review, comments: updatedComments });
            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('댓글 등록 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddReply = async (commentId: string) => {
        if (!currentUser) {
            alert('로그인이 필요한 서비스입니다.');
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

            const { error } = await supabase
                .from('reviews')
                .update({ comments: updatedComments })
                .eq('id', id);

            if (error) throw error;

            setReview({ ...review, comments: updatedComments });
            setReplyContent('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Failed to add reply:', error);
            alert('답글 등록 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleHelpful = async () => {
        if (!currentUser) {
            alert('로그인이 필요한 서비스입니다.');
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

            const { error } = await supabase
                .from('reviews')
                .update({
                    helpful_count: updatedCount,
                    helpful_users: updatedUsers
                })
                .eq('id', id);

            if (error) throw error;

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
                <p className="text-gray-400">로딩 중...</p>
            </div>
        );
    }

    if (!review) {
        return (
            <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white min-h-screen flex items-center justify-center">
                <p className="text-gray-400">리뷰를 찾을 수 없습니다.</p>
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
                    <h2 className="text-[17px] font-bold leading-tight tracking-tight flex-1 text-center pr-10 text-[#0e1a18] dark:text-white">리뷰 상세보기</h2>
                </div>
            </nav>

            <main className="max-w-md mx-auto pb-32">
                <section className="p-5">
                    {/* Header: User & Rating */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-full bg-gray-100 border border-gray-50 bg-cover bg-center"
                                style={{ backgroundImage: review.userImage ? `url('${optimizeImage(review.userImage, { width: 48, height: 48 })}')` : undefined }}
                            >
                                {!review.userImage && <span className="material-symbols-outlined text-gray-400 w-full h-full flex items-center justify-center">person</span>}
                            </div>
                            <div>
                                <p className="text-[16px] font-bold text-[#0e1a18] dark:text-white">{review.author}</p>
                                <p className="text-[13px] text-gray-400">{review.date}</p>
                            </div>
                        </div>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <span
                                    key={i}
                                    className={`material-symbols-outlined ${i < review.rating ? 'text-primary fill-current' : 'text-gray-200'}`}
                                    style={{ fontVariationSettings: i < review.rating ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    star
                                </span>
                            ))}
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

                    {/* Content */}
                    <div className="mb-8">
                        {review.title && (
                            <h3 className="text-lg font-bold text-[#0e1a18] dark:text-white mb-2">{review.title}</h3>
                        )}
                        <p className="text-[16px] leading-relaxed text-[#333d4b] dark:text-gray-200">
                            {review.content}
                        </p>
                    </div>

                    {/* Image Grid */}
                    {review.images && review.images.length > 0 && (
                        <div className={`grid gap-2 mb-8 ${review.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {review.images.slice(0, 3).map((img: string, idx: number) => (
                                <div
                                    key={idx}
                                    className="aspect-square rounded-2xl bg-cover bg-center"
                                    style={{ backgroundImage: `url('${optimizeImage(img, { width: 300, height: 300 })}')` }}
                                ></div>
                            ))}
                            {review.images.length > 3 && (
                                <div className="relative aspect-square rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url('${optimizeImage(review.images[2], { width: 300, height: 300 })}')` }}>
                                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">+{review.images.length - 2}장 더보기</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Helpful Button */}
                    <div className="py-6 border-y border-gray-100 dark:border-zinc-800 flex flex-col items-center gap-4">
                        <p className="text-[15px] font-semibold text-[#4e5968] dark:text-gray-400">이 리뷰가 도움이 되었나요?</p>
                        <button
                            onClick={handleToggleHelpful}
                            className={`flex items-center gap-2 px-8 py-3 rounded-full border font-bold text-[15px] active:scale-95 transition-transform ${review.helpfulUsers?.includes(currentUser?.id)
                                ? 'bg-primary text-white border-primary'
                                : 'border-primary text-primary hover:bg-primary/5'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                            도움돼요 {review.helpfulCount > 0 && review.helpfulCount}
                        </button>
                    </div>
                </section>

                {/* Comments Section */}
                <section className="bg-gray-50 dark:bg-zinc-900/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[16px] font-bold text-[#0e1a18] dark:text-white">댓글 {review.comments?.length || 0}</h3>
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
                                        <span className="text-[11px] text-gray-400">{new Date(comment.date).toLocaleDateString()}</span>
                                        <button
                                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                            className="text-[11px] font-bold text-gray-500 hover:text-primary transition-colors"
                                        >
                                            {replyingTo === comment.id ? '취소' : '답글 달기'}
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
                                                    placeholder="답글을 입력하세요"
                                                    disabled={submitting}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleAddReply(comment.id)}
                                                disabled={!replyContent.trim() || submitting}
                                                className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                                            >
                                                등록
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(!review.comments || review.comments.length === 0) && (
                            <p className="text-center text-gray-400 py-4 text-sm">첫 번째 댓글을 남겨보세요!</p>
                        )}
                    </div>
                </section>
            </main>

            {/* Comment Input */}
            <div className="fixed bottom-16 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 p-3">
                <div className="max-w-md mx-auto flex gap-3 items-center">
                    <div className="flex-1 relative">
                        <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                    handleAddComment();
                                }
                            }}
                            className="w-full bg-gray-100 dark:bg-zinc-800 border-none rounded-full px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary text-[#0e1a18] dark:text-white placeholder:text-gray-400"
                            placeholder="댓글을 입력해주세요"
                            type="text"
                            disabled={submitting}
                        />
                    </div>
                    <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || submitting}
                        className="text-primary font-bold px-2 whitespace-nowrap disabled:opacity-50"
                    >
                        등록
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};
