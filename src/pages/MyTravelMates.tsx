import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BottomNav } from '../components/layout/BottomNav';

export const MyTravelMates: React.FC = () => {
    const navigate = useNavigate();
    const [myPosts, setMyPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyPosts = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // If not logged in, maybe show empty or redirect
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('travel_mates')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) {
                const mappedPosts = data.map(post => ({
                    ...post,
                    startDate: post.start_date,
                    endDate: post.end_date,
                    recruitCount: post.recruit_count,
                    ageGroups: post.age_groups,
                    authorImage: post.author_image,
                    authorName: post.author_name,
                    authorInfo: post.author_info,
                    createdAt: post.created_at,
                    updatedAt: post.updated_at,
                    views: post.view_count,
                    comments: post.comment_count
                }));
                setMyPosts(mappedPosts);
            }
            setLoading(false);
        };
        fetchMyPosts();
    }, []);

    const formatTimeAgo = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 30) return `${diffDays}일 전`;
        return `${Math.floor(diffDays / 30)}개월 전`;
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'recruiting' ? 'closed' : 'recruiting';

        const { error } = await supabase
            .from('travel_mates')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (!error) {
            setMyPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('이 게시물을 삭제하시겠습니까?')) {
            const { error } = await supabase
                .from('travel_mates')
                .delete()
                .eq('id', id);

            if (!error) {
                setMyPosts(prev => prev.filter(p => p.id !== id));
            }
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
            <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-background-light dark:bg-background-dark shadow-xl overflow-x-hidden pb-[100px]">
                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 py-4 transition-colors border-b border-gray-200/50 dark:border-gray-800/50">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-text-main dark:text-white hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-text-main dark:text-white flex-1 text-center pr-8">내가 올린 동행 게시물</h1>
                </div>

                {/* Content */}
                <div className="px-5 pt-4 flex flex-col gap-4">
                    {myPosts.length === 0 ? (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">edit_note</span>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">작성한 게시물이 없습니다.</p>
                            <button
                                onClick={() => navigate('/travel-mates/write')}
                                className="mt-4 bg-primary text-white px-6 py-2 rounded-full font-bold text-sm"
                            >
                                첫 번째 게시물 작성하기
                            </button>
                        </div>
                    ) : (
                        myPosts.map((post) => (
                            <div
                                key={post.id}
                                className={`bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-transparent dark:border-gray-800 ${post.status === 'closed' ? 'opacity-80' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${post.status === 'closed' ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300' : 'bg-primary/10 text-primary'}`}>
                                        {post.status === 'closed' ? '모집 완료' : '모집 중'}
                                    </span>
                                    <div className="relative">
                                        <button
                                            className="text-gray-300 hover:text-text-main dark:hover:text-white p-1 -mr-2 -mt-2 group"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const menu = e.currentTarget.nextElementSibling;
                                                menu?.classList.toggle('hidden');
                                            }}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                        </button>
                                        <div className="hidden absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-10">
                                            <button
                                                onClick={() => handleToggleStatus(post.id, post.status)}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
                                            >
                                                {post.status === 'recruiting' ? '모집 마감' : '다시 모집'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="cursor-pointer"
                                    onClick={() => navigate(`/travel-mates/${post.id}`)}
                                >
                                    <h3 className={`text-[17px] font-bold mb-2 leading-snug line-clamp-2 ${post.status === 'closed' ? 'text-gray-500 dark:text-gray-400' : 'text-text-main dark:text-white'}`}>
                                        {post.title}
                                    </h3>
                                    <div className="flex flex-col gap-1 mb-4">
                                        <div className="flex items-center gap-1.5 text-text-sub text-sm">
                                            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                            <span>{post.startDate} - {post.endDate} ({post.duration})</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-text-sub text-sm">
                                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                                            <span>{post.region}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-xs text-text-sub">
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                <span>{post.views}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-text-sub">
                                                <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
                                                <span>{post.comments}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    <div className="py-6 text-center">
                        <p className="text-xs text-gray-400">최근 1년 간 작성한 게시물이 표시됩니다.</p>
                    </div>
                </div>

                <BottomNav />
            </div>
        </div>
    );
};
