import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { BottomNav } from '../components/layout/BottomNav';
import { optimizeImage } from '../utils/imageOptimizer';
import notificationBell from '../assets/notification_bell.png';

export const TravelMates: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('전체');
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [activeFilter, setActiveFilter] = useState<string | null>(null); // 'date', 'gender', 'age', 'style' or null
    const [filters, setFilters] = useState({
        date: '' as string,
        gender: '' as string,
        age: '' as string,
        style: '' as string
    });

    // Fetch travel mates from Supabase
    React.useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('travel_mates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching travel mates:', error);
            } else if (data) {
                // Map snake_case to camelCase
                const mappedPosts = data.map(post => ({
                    ...post,
                    startDate: post.start_date,
                    endDate: post.end_date,
                    recruitCount: post.recruit_count,
                    ageGroups: post.age_groups || [],
                    styles: post.styles || [],
                    gender: post.gender,
                    authorImage: post.author_image,
                    authorName: post.author_name,
                    authorInfo: post.author_info,
                    createdAt: post.created_at,
                    updatedAt: post.updated_at
                }));
                setPosts(mappedPosts);
            }
            setLoading(false);
        };
        fetchPosts();
    }, []);

    // Filter posts based on active tab and search query
    const filteredPosts = posts.filter(post => {
        // 1. Tab & Search Filter
        const matchesTab = activeTab === '전체' || (post.region && post.region.includes(activeTab));
        const matchesSearch = searchQuery === '' ||
            post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.region?.toLowerCase().includes(searchQuery.toLowerCase());

        // 2. Advanced Filters
        let matchesFilters = true;

        // Date Filter (Logic: Check if selected date is within start/end range)
        // Note: Dates are stored as 'M.D' strings. We assume current year for comparison.
        if (filters.date) {
            const selected = new Date(filters.date);
            // Parse post dates (Assume current year)
            const currentYear = new Date().getFullYear();
            const [startM, startD] = post.startDate.split('.').map(Number);
            const postStart = new Date(currentYear, startM - 1, startD);

            let postEnd = postStart;
            if (post.endDate) {
                const [endM, endD] = post.endDate.split('.').map(Number);
                postEnd = new Date(currentYear, endM - 1, endD);
            }

            // Check if selected date is roughly within range (or same month)
            // For strict range: selected >= postStart && selected <= postEnd
            // For basic "trip in this month" logic, we can just check overlap or simplified logic.
            // Let's go with exact range inclusive.
            // Reset hours for comparison
            selected.setHours(0, 0, 0, 0);
            postStart.setHours(0, 0, 0, 0);
            postEnd.setHours(0, 0, 0, 0);

            if (selected < postStart || selected > postEnd) {
                matchesFilters = false;
            }
        }

        // Gender Filter (If user picks 'Male', show 'Male' or 'Any')
        if (matchesFilters && filters.gender) {
            if (filters.gender === '남성') {
                if (post.gender !== '남성' && post.gender !== '무관') matchesFilters = false;
            } else if (filters.gender === '여성') {
                if (post.gender !== '여성' && post.gender !== '무관') matchesFilters = false;
            }
        }

        // Age Filter (If selected '20s', show posts allowing '20s')
        if (matchesFilters && filters.age) {
            if (!post.ageGroups.includes(filters.age)) matchesFilters = false;
        }

        // Style Filter (If selected 'Healing', show posts having 'Healing')
        if (matchesFilters && filters.style) {
            if (!post.styles.includes(filters.style)) matchesFilters = false;
        }

        return matchesTab && matchesSearch && matchesFilters;
    });

    const handleFilterReset = () => {
        setFilters({ date: '', gender: '', age: '', style: '' });
        setActiveFilter(null);
    };

    return (
        <div className="bg-[#f9fafc] dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-display antialiased overflow-x-hidden min-h-screen">
            <div className={`relative flex h-full min-h-screen w-full flex-col pb-24 ${activeFilter ? 'overflow-hidden h-screen' : ''}`}>
                {/* Header */}
                <div className="sticky top-0 z-40 bg-card-light dark:bg-card-dark shadow-sm">
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                        <button onClick={() => navigate('/')} className="text-2xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark">
                            동행 찾기
                        </button>
                        <button className="relative p-2 -mr-2 rounded-full hover:scale-105 transition-transform">
                            <img src={notificationBell} alt="알림" className="w-7 h-7 object-contain" />
                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-card-dark"></span>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="px-5 pb-3">
                        <div className="relative flex w-full items-center rounded-xl bg-[#f2f4f6] dark:bg-gray-800 h-12 transition-all focus-within:ring-2 focus-within:ring-primary/50">
                            <div className="flex items-center justify-center pl-4 text-text-sub-light dark:text-text-sub-dark pointer-events-none">
                                <span className="material-symbols-outlined text-[22px]">search</span>
                            </div>
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-base font-medium placeholder:text-text-sub-light/70 dark:placeholder:text-text-sub-dark/70 px-3 text-text-main-light dark:text-text-main-dark"
                                placeholder="도시나 국가를 검색해보세요"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="border-b border-gray-100 dark:border-gray-800">
                        <div className="flex overflow-x-auto no-scrollbar px-5 gap-6">
                            {['전체', '중앙몽골', '고비사막', '홉스골', '트레킹', '골프'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`shrink-0 pb-3 border-b-[3px] font-medium text-[15px] transition-colors ${activeTab === tab
                                        ? 'border-primary text-text-main-light dark:text-white font-bold'
                                        : 'border-transparent text-text-sub-light dark:text-text-sub-dark hover:text-text-main-light dark:hover:text-text-main-dark'
                                        } `}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex overflow-x-auto no-scrollbar px-5 py-3 gap-2 bg-card-light dark:bg-card-dark">
                        {[
                            { key: 'date', label: filters.date ? filters.date.slice(5) : '날짜' },
                            { key: 'gender', label: filters.gender || '성별' },
                            { key: 'age', label: filters.age || '연령대' },
                            { key: 'style', label: filters.style?.split(' ')[1] || '여행 스타일' }
                        ].map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={`flex shrink-0 items-center justify-center gap-1 rounded-full border px-3 py-1.5 active:scale-95 transition-all ${filters[filter.key as keyof typeof filters]
                                    ? 'bg-primary/10 border-primary text-primary font-bold'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-sub-light dark:text-text-sub-dark'
                                    }`}
                            >
                                <span className="text-xs font-medium">{filter.label}</span>
                                <span className="material-symbols-outlined text-[16px]">expand_more</span>
                            </button>
                        ))}
                        {(filters.date || filters.gender || filters.age || filters.style) && (
                            <button
                                onClick={handleFilterReset}
                                className="flex shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-500"
                            >
                                초기화
                            </button>
                        )}
                    </div>
                </div>

                {/* Posts Feed */}
                <div className="flex flex-col bg-white dark:bg-card-dark min-h-[50vh]">
                    {filteredPosts.length === 0 ? (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">group_off</span>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">조건에 맞는 동행 게시물이 없습니다.</p>
                            {(searchQuery || filters.date || filters.gender || filters.age || filters.style) ? (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        handleFilterReset();
                                    }}
                                    className="mt-4 text-primary font-bold text-sm"
                                >
                                    검색/필터 초기화
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/travel-mates/write')}
                                    className="mt-4 bg-primary text-white px-6 py-2 rounded-full font-bold text-sm"
                                >
                                    첫 번째 게시물 작성하기
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredPosts.map((post, index) => (
                            <div
                                key={post.id}
                                onClick={() => navigate(`/travel-mates/${post.id}`)}
                                className={`bg-white dark:bg-card-dark p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-4 ${post.status === 'closed' ? 'opacity-70' : ''}`}
                            >
                                {/* Left Content */}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {post.status === 'closed' && (
                                                <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">모집완료</span>
                                            )}
                                        </div>
                                        <h3 className={`text-[16px] font-bold leading-snug mb-2 line-clamp-2 ${post.status === 'closed' ? 'text-gray-500 line-through decoration-gray-400' : 'text-text-main-light dark:text-text-main-dark'}`}>
                                            {post.title}
                                        </h3>
                                        <div className="space-y-1">
                                            <div className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                                                {post.region}
                                            </div>
                                            <div className="text-[13px] text-gray-500 dark:text-gray-400">
                                                {post.startDate} ~ {post.endDate}
                                                {post.duration && <span className="text-gray-400 ml-1">({post.duration})</span>}
                                            </div>
                                            <div className="text-[13px] text-primary font-bold">
                                                1명 / {post.recruitCount}명
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tags (Optional - maybe hidden for compactness or minimal) */}
                                    {/* <div className="flex gap-1 mt-2">
                                        {post.styles.slice(0, 2).map((style: string, idx: number) => (
                                            <span key={idx} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded text-xs">{style}</span>
                                        ))}
                                    </div> */}
                                </div>

                                {/* Right Image */}
                                <div className="relative w-[100px] h-[100px] flex-shrink-0">
                                    <img
                                        src={optimizeImage(post.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', { width: 200, height: 200 })}
                                        alt={post.title}
                                        className={`w-full h-full rounded-xl object-cover border border-gray-100 dark:border-gray-700 bg-gray-100 ${post.status === 'closed' ? 'grayscale opacity-80' : ''}`}
                                        loading={index === 0 ? "eager" : "lazy"}
                                        {...(index === 0 ? { fetchpriority: "high" } : {})}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* FAB */}
                <button
                    onClick={() => navigate('/travel-mates/write')}
                    className="fixed bottom-24 right-5 z-40 bg-primary hover:bg-[#159e82] text-white rounded-full p-4 shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[24px]">edit_square</span>
                    <span className="font-bold text-[15px] pr-1">글쓰기</span>
                </button>

                <BottomNav />

                {/* Filter Bottom Sheet Modal */}
                {activeFilter && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveFilter(null)}>
                        <div
                            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold dark:text-white">
                                    {activeFilter === 'date' && '날짜 선택'}
                                    {activeFilter === 'gender' && '성별 선택'}
                                    {activeFilter === 'age' && '연령대 선택'}
                                    {activeFilter === 'style' && '여행 스타일 선택'}
                                </h3>
                                <button onClick={() => setActiveFilter(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Date Content */}
                                {activeFilter === 'date' && (
                                    <div className="flex flex-col gap-4">
                                        <p className="text-sm text-gray-500">여행 시작일이 포함된 날짜를 선택해주세요</p>
                                        <input
                                            type="date"
                                            value={filters.date}
                                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-lg"
                                        />
                                    </div>
                                )}

                                {/* Gender Content */}
                                {activeFilter === 'gender' && (
                                    <div className="flex flex-col gap-2">
                                        {['남성', '여성'].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => {
                                                    setFilters({ ...filters, gender: filters.gender === g ? '' : g });
                                                    setActiveFilter(null);
                                                }}
                                                className={`p-4 rounded-xl text-left font-medium transition-colors ${filters.gender === g
                                                    ? 'bg-primary/10 text-primary border border-primary'
                                                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white'
                                                    }`}
                                            >
                                                {g} Only
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setFilters({ ...filters, gender: '' });
                                                setActiveFilter(null);
                                            }}
                                            className="p-4 rounded-xl text-left font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            성별 무관/전체
                                        </button>
                                    </div>
                                )}

                                {/* Age Content */}
                                {activeFilter === 'age' && (
                                    <div className="flex flex-wrap gap-2">
                                        {['20대', '30대', '40대', '50대+'].map(age => (
                                            <button
                                                key={age}
                                                onClick={() => {
                                                    setFilters({ ...filters, age: filters.age === age ? '' : age });
                                                    setActiveFilter(null);
                                                }}
                                                className={`px-6 py-3 rounded-xl font-medium transition-colors border ${filters.age === age
                                                    ? 'bg-primary/10 border-primary text-primary'
                                                    : 'bg-gray-50 dark:bg-gray-800 border-transparent dark:text-white'
                                                    }`}
                                            >
                                                {age}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Style Content */}
                                {activeFilter === 'style' && (
                                    <div className="flex flex-wrap gap-2">
                                        {['🏞️ 힐링', '📸 인생샷', '💪 액티비티', '🍽️ 맛집 탐방', '⛺ 캠핑/차박'].map((style) => (
                                            <button
                                                key={style}
                                                onClick={() => {
                                                    setFilters({ ...filters, style: filters.style === style ? '' : style });
                                                    setActiveFilter(null);
                                                }}
                                                className={`px-4 py-2.5 rounded-full font-medium text-sm border transition-all ${filters.style === style
                                                    ? 'bg-primary/10 text-primary border-primary/20 font-semibold'
                                                    : 'bg-background-light dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => setActiveFilter(null)}
                                    className="w-full mt-4 bg-primary text-white font-bold py-4 rounded-xl"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
