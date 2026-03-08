import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { BottomNav } from '../components/layout/BottomNav';
import { useTranslation } from 'react-i18next';
import { optimizeImage } from '../utils/imageOptimizer';

export const TravelMateDetail: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const [viewIncremented, setViewIncremented] = useState(false);
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [currentUser, setCurrentUser] = useState<any>(null);

    // Comments state
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const me = await api.auth.me();
                if (me) {
                    setCurrentUser(me);
                }
            } catch (e) {
                console.error("Error fetching user:", e);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const data = await api.travelMates.get(id);

                if (data) {
                    let parsedAgeGroups = [];
                    let parsedStyles = [];
                    // SQLite stored JSON handling
                    try {
                        parsedAgeGroups = typeof data.age_groups === 'string' ? JSON.parse(data.age_groups) : data.age_groups || [];
                    } catch (e) { console.error('Error parsing age groups JSON:', e); }

                    try {
                        parsedStyles = typeof data.styles === 'string' ? JSON.parse(data.styles) : data.styles || [];
                    } catch (e) { console.error('Error parsing styles JSON:', e); }

                    // Localize stored English duration like "3N 4D" → "3박 4일"
                    let localizedDuration = data.duration || '';
                    const durationMatch = localizedDuration.match(/^(\d+)N\s+(\d+)D$/);
                    if (durationMatch) {
                        localizedDuration = `${durationMatch[1]}${t('travel_mates.detail.nights', { defaultValue: '박' })} ${durationMatch[2]}${t('travel_mates.detail.days', { defaultValue: '일' })}`;
                    } else if (localizedDuration === '1 Day') {
                        localizedDuration = t('travel_mates.detail.one_day', { defaultValue: '당일치기' });
                    }

                    setPost({
                        ...data,
                        startDate: data.start_date,
                        endDate: data.end_date,
                        recruitCount: data.recruit_count,
                        ageGroups: parsedAgeGroups,
                        styles: parsedStyles,
                        authorImage: data.author_image,
                        authorName: data.author_name === 'Anonymous' ? '' : data.author_name,
                        authorInfo: data.author_info === 'Traveler' ? '' : data.author_info,
                        duration: localizedDuration,
                        createdAt: data.created_at,
                        updatedAt: data.updated_at,
                        views: data.view_count,
                        comments: data.comment_count
                    });
                }
            } catch (error) {
                console.error('Error fetching post:', error);
            }
            setLoading(false);
        };
        fetchPost();
    }, [id]);

    // Fetch comments
    useEffect(() => {
        const fetchComments = async () => {
            if (!id) return;
            try {
                const res = await fetch(`/api/travel-mates/${id}/comments`);
                if (res.ok) {
                    const data = await res.json();
                    setComments(data || []);
                }
            } catch (e) {
                console.error('Error fetching comments:', e);
            }
        };
        fetchComments();
    }, [id]);

    const isOwner = currentUser && post && currentUser.id === post.user_id;

    // Increment view count once
    useEffect(() => {
        const incrementView = async () => {
            if (post && !viewIncremented && id) {
                try {
                    await api.travelMates.update(id, { view_count: post.views + 1 });
                    setViewIncremented(true);
                } catch (e) {
                    console.error("Error updating view count:", e);
                }
            }
        };
        incrementView();
    }, [post?.id, viewIncremented, id]);

    const handleSubmitComment = async () => {
        if (!currentUser) {
            alert(t('travel_mates.detail.login_required'));
            navigate('/login');
            return;
        }
        if (!commentText.trim()) return;

        setCommentLoading(true);
        try {
            const res = await fetch(`/api/travel-mates/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    user_name: currentUser.name || currentUser.email?.split('@')[0] || t('travel_mates.detail.anonymous', { defaultValue: 'Anonymous' }),
                    user_image: currentUser.avatarUrl || '',
                    content: commentText.trim()
                })
            });
            if (res.ok) {
                const newComment = await res.json();
                setComments(prev => [...prev, newComment]);
                setCommentText('');
                // Update comment count on post
                setPost((prev: any) => ({ ...prev, comments: (prev.comments || 0) + 1 }));
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        }
        setCommentLoading(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            const res = await fetch(`/api/travel-mates/${id}/comments/${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                setPost((prev: any) => ({ ...prev, comments: Math.max(0, (prev.comments || 0) - 1) }));
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('travel_mates.detail.delete_confirm'))) return;
        try {
            await api.travelMates.delete(id!);
            navigate('/travel-mates');
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete');
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const now = new Date();
        // SQLite datetime('now') sets UTC without timezone offset strings. Append 'Z' manually to parse correctly.
        const safeDateStr = !dateStr.endsWith('Z') && !dateStr.includes('+') ? `${dateStr}Z` : dateStr;
        const date = new Date(safeDateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('travel_mates.detail.just_now', { defaultValue: 'Just now' });
        if (diffMins < 60) return t('travel_mates.detail.mins_ago', { defaultValue: '{{count}} min ago', count: diffMins });
        if (diffHours < 24) return t('travel_mates.detail.hours_ago', { defaultValue: '{{count}} hours ago', count: diffHours });
        return t('travel_mates.detail.days_ago', { defaultValue: '{{count}} days ago', count: diffDays });
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
    if (!post) return <div className="min-h-screen flex items-center justify-center">Post not found</div>;

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen pb-24">
            <div className="relative min-h-screen max-w-md mx-auto bg-white dark:bg-[#12201d] shadow-xl overflow-hidden flex flex-col">
                {/* Header Image Area */}
                <div className="relative h-72 w-full">
                    <img
                        src={post.image ? optimizeImage(post.image, { width: 600 }) : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'}
                        alt={post.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>

                    {/* Top Nav */}
                    <div className="absolute top-0 left-0 right-0 p-5 pt-4 flex items-center justify-between">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/90 hover:text-white bg-black/20 backdrop-blur-sm rounded-full">
                            <span className="material-symbols-outlined">arrow_back_ios_new</span>
                        </button>
                        <div className="flex gap-2">
                            {isOwner && (
                                <>
                                    <button onClick={() => navigate(`/travel-mates/edit/${id}`)} className="p-2 text-white/90 hover:text-white bg-black/20 backdrop-blur-sm rounded-full">
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                    <button onClick={handleDelete} className="p-2 text-white/90 hover:text-white bg-black/20 backdrop-blur-sm rounded-full">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Title & Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-1 rounded-lg bg-primary/90 text-white text-xs font-bold backdrop-blur-md shadow-sm">
                                {post.status === 'closed' ? t('travel_mates.detail.closed_status') : t('travel_mates.detail.recruiting', { defaultValue: 'Recruiting' })}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-black/40 text-white/90 text-xs font-medium backdrop-blur-md">
                                {t('travel_mates.detail.views', { count: post.views })}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold leading-tight mb-3 drop-shadow-sm">{post.title}</h1>
                        <div className="flex items-center gap-3">
                            <img src={post.authorImage || `https://ui-avatars.com/api/?name=${post.authorName || 'Traveler'}&background=159e82&color=fff`} alt={post.authorName} className="w-10 h-10 rounded-full border-2 border-white/20" />
                            <div>
                                <p className="font-bold text-sm">{post.authorName || t('travel_mates.detail.anonymous', { defaultValue: 'Anonymous' })}</p>
                                <p className="text-xs text-white/70">{post.authorInfo || t('travel_mates.detail.traveler', { defaultValue: 'Traveler' })}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 px-6 py-8 space-y-8 bg-white dark:bg-[#12201d] rounded-t-3xl -mt-6 relative z-10">

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-background-light dark:bg-gray-800/50 space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                <span className="text-xs font-bold">{t('travel_mates.detail.period')}</span>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{post.startDate} ~ {post.endDate}</p>
                            <p className="text-xs text-primary font-medium">{post.duration}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-background-light dark:bg-gray-800/50 space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                                <span className="material-symbols-outlined text-[18px]">group</span>
                                <span className="text-xs font-bold">{t('travel_mates.detail.people')}</span>
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{t('travel_mates.detail.recruit_count', { count: post.recruitCount })}</p>
                            <p className="text-xs text-gray-500">{t(`travel_mates.filters.gender_${post.gender}`)}</p>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800"></div>

                    {/* Detailed info options */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 ml-1">{t('travel_mates.detail.age')}</h3>
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(post.ageGroups) ? post.ageGroups.map((age: string) => (
                                    <span key={age} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
                                        {t(`travel_mates.filters.age_${age}`)}
                                    </span>
                                )) : null}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 ml-1">{t('travel_mates.detail.style')}</h3>
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(post.styles) ? post.styles.map((style: string) => (
                                    <span key={style} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-bold">
                                        {style}
                                    </span>
                                )) : null}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 ml-1">{t('travel_mates.detail.region')}</h3>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
                                    {post.region}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800"></div>

                    {/* Description Text */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('travel_mates.detail.description_title', { defaultValue: 'Description' })}</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                            {post.description}
                        </p>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800"></div>

                    {/* Comments Section */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('travel_mates.detail.comments_title', { defaultValue: 'Comments' })}</h2>
                            <span className="text-sm text-gray-400 font-medium">{comments.length}</span>
                        </div>

                        {/* Comment Input */}
                        {currentUser ? (
                            <div className="flex gap-3 items-start">
                                <img
                                    src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name || currentUser.email?.split('@')[0] || 'U'}&background=159e82&color=fff`}
                                    alt="me"
                                    className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5"
                                />
                                <div className="flex-1">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder={t('travel_mates.detail.comment_placeholder', { defaultValue: 'Write a comment...' })}
                                        className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                        rows={2}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={handleSubmitComment}
                                            disabled={commentLoading || !commentText.trim()}
                                            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-95 transition-all"
                                        >
                                            {commentLoading ? t('travel_mates.detail.submitting', { defaultValue: 'Posting...' }) : t('travel_mates.detail.submit_comment', { defaultValue: 'Post' })}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('travel_mates.detail.login_to_comment', { defaultValue: 'Login to leave a comment' })}</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-95 transition-all"
                                >
                                    {t('travel_mates.detail.login_btn', { defaultValue: 'Login' })}
                                </button>
                            </div>
                        )}

                        {/* Comments List */}
                        <div className="space-y-5">
                            {comments.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">forum</span>
                                    <p className="mt-2 text-sm text-gray-400">{t('travel_mates.detail.no_comments', { defaultValue: 'No comments yet. Be the first!' })}</p>
                                </div>
                            ) : (
                                comments.map((comment: any) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <img
                                            src={comment.user_image || `https://ui-avatars.com/api/?name=${comment.user_name || 'U'}&background=e0e0e0&color=666`}
                                            alt={comment.user_name}
                                            className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{comment.user_name}</span>
                                                    <span className="text-xs text-gray-400">{formatTimeAgo(comment.created_at)}</span>
                                                </div>
                                                {currentUser && currentUser.id === comment.user_id && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        {t('travel_mates.detail.delete_btn')}
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
