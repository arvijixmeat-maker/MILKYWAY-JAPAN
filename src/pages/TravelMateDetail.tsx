import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BottomNav } from '../components/layout/BottomNav';

export const TravelMateDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [viewIncremented, setViewIncremented] = useState(false);
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data } = await supabase.auth.getUser();
            setCurrentUser(data.user);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('travel_mates')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching post:', error);
            } else if (data) {
                setPost({
                    ...data,
                    startDate: data.start_date,
                    endDate: data.end_date,
                    recruitCount: data.recruit_count,
                    ageGroups: data.age_groups,
                    authorImage: data.author_image,
                    authorName: data.author_name,
                    authorInfo: data.author_info,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                    views: data.view_count,
                    comments: data.comment_count
                });
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
                await supabase
                    .from('travel_mates')
                    .update({ view_count: post.views + 1 })
                    .eq('id', id);
                setViewIncremented(true);
            }
        };
        incrementView();
    }, [post?.id, viewIncremented, id]);

    const handleStartChat = async () => {
        if (!currentUser) {
            alert('로그인이 필요한 서비스입니다.');
            navigate('/login');
            return;
        }

        if (currentUser.id === post.user_id) {
            alert('자신의 게시물입니다.');
            return;
        }

        try {
            setLoading(true);

            // 1. Check if chat room already exists
            // Since Supabase doesn't support complex joins easily for "room with exactly these 2 users",
            // we'll fetch my rooms and check if author is in them.
            // Optimized: Fetch my rooms -> Fetch participants for those rooms -> Filter

            const { data: myRooms } = await supabase
                .from('chat_participants')
                .select('room_id')
                .eq('user_id', currentUser.id);

            const myRoomIds = myRooms?.map(r => r.room_id) || [];

            if (myRoomIds.length > 0) {
                const { data: existingChat } = await supabase
                    .from('chat_participants')
                    .select('room_id')
                    .in('room_id', myRoomIds)
                    .eq('user_id', post.user_id)
                    .limit(1)
                    .single();

                if (existingChat) {
                    navigate(`/chats/${existingChat.room_id}`);
                    setLoading(false);
                    return;
                }
            }

            // 2. Create new room if not exists
            const { data: newRoom, error: roomError } = await supabase
                .from('chat_rooms')
                .insert({})
                .select()
                .single();

            if (roomError) throw roomError;

            // 3. Add participants
            const { error: participantError } = await supabase
                .from('chat_participants')
                .insert([
                    { room_id: newRoom.id, user_id: currentUser.id },
                    { room_id: newRoom.id, user_id: post.user_id }
                ]);

            if (participantError) throw participantError;

            navigate(`/chats/${newRoom.id}`);

        } catch (error) {
            console.error('Error starting chat:', error);
            alert('채팅방 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!post) return;
        const newStatus = post.status === 'recruiting' ? 'closed' : 'recruiting';

        const { error } = await supabase
            .from('travel_mates')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', post.id);

        if (!error) {
            setPost({ ...post, status: newStatus });
        }
    };

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-gray-300 animate-pulse">hourglass_empty</span>
                    <p className="mt-4 text-gray-500">불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-text-main-light dark:text-text-main-dark antialiased transition-colors duration-200 min-h-screen pb-32">
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto shadow-none bg-white dark:bg-[#12201d]">
                {/* Header */}

                <header className="sticky top-0 z-50 flex items-center justify-between bg-white/90 dark:bg-[#12201d]/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-text-main-light dark:text-text-main-dark">arrow_back</span>
                    </button>
                    <h2 className="text-base font-bold">게시물 상세</h2>
                    <button
                        onClick={async () => {
                            const shareData = {
                                title: post?.title || '동행 찾기',
                                text: post?.description || '몽골 여행 동행을 찾고 있어요!',
                                url: window.location.href
                            };

                            if (navigator.share) {
                                try {
                                    await navigator.share(shareData);
                                } catch (err) {
                                    console.log('Share cancelled or failed');
                                }
                            } else {
                                // Fallback: copy link to clipboard
                                try {
                                    await navigator.clipboard.writeText(window.location.href);
                                    alert('링크가 클립보드에 복사되었습니다!');
                                } catch (err) {
                                    alert('공유할 수 없습니다.');
                                }
                            }
                        }}
                        className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-text-main-light dark:text-text-main-dark">share</span>
                    </button>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto no-scrollbar pb-40">
                    {/* Post Image */}
                    {post.image && (
                        <div className="w-full h-56 bg-gray-200">
                            <img
                                src={post.image}
                                alt={post.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Post Title Section */}
                    <div className="px-5 pt-6 pb-4">
                        <div className="flex gap-2 mb-3 flex-wrap">
                            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${post.status === 'closed' ? 'bg-gray-200 text-gray-600' : 'bg-primary/10 text-primary'}`}>
                                {post.status === 'closed' ? '모집완료' : '모집중'}
                            </span>
                            {post.ageGroups.map(age => (
                                <span key={age} className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                                    {age}
                                </span>
                            ))}
                            <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                                {post.gender === '무관' ? '성별무관' : post.gender}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold leading-tight tracking-tight mb-2">
                            {post.title}
                        </h1>
                    </div>

                    {/* Author Profile */}
                    <div className="px-5 pb-6">
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-surface-dark/50">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div
                                        className="size-12 rounded-full bg-cover bg-center border-2 border-white dark:border-gray-700 shadow-sm"
                                        style={{ backgroundImage: `url('${post.authorImage || 'https://via.placeholder.com/100'}')` }}
                                    ></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{post.authorName}</span>
                                    <span className="text-xs text-text-sub-light dark:text-text-sub-dark">{formatTimeAgo(post.createdAt)} 작성</span>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <span className="material-symbols-outlined">more_vert</span>
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-b border-gray-100 dark:border-gray-800"></div>

                    {/* Trip Details Grid */}
                    <div className="px-5 py-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">info</span>
                            여행 정보
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Date */}
                            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">
                                <span className="text-xs text-text-sub-light dark:text-text-sub-dark font-medium mb-1">여행 기간</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">calendar_month</span>
                                    <span className="font-bold text-sm">{post.startDate} - {post.endDate}</span>
                                </div>
                            </div>
                            {/* Location */}
                            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">
                                <span className="text-xs text-text-sub-light dark:text-text-sub-dark font-medium mb-1">여행지</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                                    <span className="font-bold text-sm">{post.region}</span>
                                </div>
                            </div>
                            {/* People */}
                            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">
                                <span className="text-xs text-text-sub-light dark:text-text-sub-dark font-medium mb-1">모집 인원</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">group</span>
                                    <span className="font-bold text-sm">{post.recruitCount}명</span>
                                </div>
                            </div>
                            {/* Style */}
                            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">
                                <span className="text-xs text-text-sub-light dark:text-text-sub-dark font-medium mb-1">여행 스타일</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">photo_camera</span>
                                    <span className="font-bold text-sm">{post.styles[0]?.replace(/^[^\w가-힣]+/, '') || '기타'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="px-5 pb-4">
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag, idx) => (
                                <span key={idx} className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Description Text */}
                    {/* Description Text */}
                    <div className="px-5 pb-6">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl">
                            <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                                상세 내용
                            </h3>
                            <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                {post.description}
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-b border-gray-100 dark:border-gray-800"></div>

                    {/* Stats */}
                    <div className="px-5 py-4 flex items-center gap-4">
                        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                            <span className="text-[13px] font-medium pt-[1px]">조회 {post.views}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                            <span className="material-symbols-outlined text-[17px]">chat_bubble</span>
                            <span className="text-[13px] font-medium pt-[1px]">댓글 {post.comments}</span>
                        </div>
                    </div>

                    {/* Toggle Status Button (Only for Owner) */}
                    {isOwner && (
                        <div className="px-5 pb-6">
                            <button
                                onClick={handleToggleStatus}
                                className={`w-full py-3 rounded-xl font-bold text-sm shadow-none ${post.status === 'recruiting'
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                    : 'bg-primary/10 text-primary'
                                    }`}
                            >
                                {post.status === 'recruiting' ? '모집 마감하기' : '다시 모집하기'}
                            </button>
                        </div>
                    )}
                </main>

                {/* Floating Sticky Action Bar (Only for Non-Owner) */}
                {!isOwner && (
                    <div className="absolute bottom-[84px] left-0 right-0 z-20 px-5 pb-5 pointer-events-none" style={{ background: 'none !important', boxShadow: 'none !important', backdropFilter: 'none !important' }}>
                        <div className="flex gap-3 max-w-md mx-auto pointer-events-auto">
                            <button
                                onClick={handleStartChat}
                                disabled={loading}
                                className="flex-1 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-lg h-14 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-none drop-shadow-none disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="material-symbols-outlined animate-spin">refresh</span>
                                ) : (
                                    <span className="material-symbols-outlined">chat_bubble</span>
                                )}
                                1:1 채팅하기
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation - Same as main page */}
                <BottomNav />
            </div>
        </div>
    );
};
