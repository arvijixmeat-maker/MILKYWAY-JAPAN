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

                    setPost({
                        ...data,
                        startDate: data.start_date,
                        endDate: data.end_date,
                        recruitCount: data.recruit_count,
                        ageGroups: parsedAgeGroups,
                        styles: parsedStyles,
                        authorImage: data.author_image,
                        authorName: data.author_name,
                        authorInfo: data.author_info,
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

    const handleStartChat = async () => {
        if (!currentUser) {
            alert(t('travel_mates.detail.login_required'));
            navigate('/login');
            return;
        }

        if (currentUser.id === post.user_id) {
            alert(t('travel_mates.detail.own_post'));
            return;
        }

        try {
            setLoading(true);
            const room = await api.chats.create({ user_id: currentUser.id, partner_id: post.user_id });
            if (room && room.id) {
                navigate(`/chats/${room.id}`);
            } else {
                throw new Error("Failed to create chat room");
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            alert('Failed to start chat');
        } finally {
            setLoading(false);
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

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
    if (!post) return <div className="min-h-screen flex items-center justify-center">Post not found</div>;

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen pb-24">
            <div className="relative min-h-screen max-w-md mx-auto bg-white dark:bg-[#12201d] shadow-xl overflow-hidden flex flex-col">
                {/* Header Image Area */}
                <div className="relative h-72 w-full">
                    <img
                        src={optimizeImage(post.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', { width: 600 })}
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
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Description</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                            {post.description}
                        </p>
                    </div>

                </div>

                {/* Footer Action */}
                <div className="sticky bottom-0 p-5 bg-white dark:bg-[#12201d] border-t border-gray-100 dark:border-gray-800 pb-8">
                    {post.status === 'closed' ? (
                        <button disabled className="w-full bg-gray-300 dark:bg-gray-700 text-white font-bold text-lg py-4 rounded-2xl cursor-not-allowed">
                            {t('travel_mates.detail.closed_status')}
                        </button>
                    ) : (
                        <button
                            onClick={handleStartChat}
                            className="w-full bg-primary text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">chat_bubble</span>
                            <span>{t('travel_mates.detail.chat_btn')}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
