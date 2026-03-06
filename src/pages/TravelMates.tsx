import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useUser } from '../contexts/UserContext';
import { BottomNav } from '../components/layout/BottomNav';
import { optimizeImage } from '../utils/imageOptimizer';
import notificationBell from '../assets/notification_bell.png';
import { useTranslation } from 'react-i18next';

export const TravelMates: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('all');
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

    // Fetch travel mates from API
    React.useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            try {
                const data = await api.travelMates.list();

                if (data) {
                    // Map snake_case to camelCase
                    const mappedPosts = data.map((post: any) => ({
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
            } catch (error) {
                console.error('Error fetching travel mates:', error);
            }
            setLoading(false);
        };
        fetchPosts();
    }, []);

    // Filter posts based on active tab and search query
    const filteredPosts = posts.filter(post => {
        // 1. Tab & Search Filter
        // Note: post.region might be in Korean or need mapping. Ideally backend returns code or we map.
        // For now, let's assume 'all' matches everything, and specific tabs match region string including translated ones.
        // Current tabs: 'all', 'central_mongolia', 'gobi_desert', 'khuvsgul', 'trekking', 'golf'
        let regionMatch = true;

        if (activeTab !== 'all') {
            // Map activeTab key to potential region strings found in DB 
            // (This is a bit tricky if DB has mixed lang, but let's try to match by key concept or translated string)
            // Simple approach: Check if post.region includes the translated string of the active key
            const tabLabel = t(`travel_mates.tabs.${activeTab}`);
            regionMatch = post.region && post.region.includes(tabLabel) || post.region.includes(activeTab);

            // Fallback for kr/ja database
            if (activeTab === 'central_mongolia' && (post.region.includes('中央モンゴル') || post.region.includes('중앙몽골'))) regionMatch = true;
            if (activeTab === 'gobi_desert' && (post.region.includes('ゴビ砂漠') || post.region.includes('고비사막'))) regionMatch = true;
            if (activeTab === 'khuvsgul' && (post.region.includes('フブスグル') || post.region.includes('홉스괨'))) regionMatch = true;
            if (activeTab === 'trekking' && (post.region.includes('トレッキング') || post.region.includes('트레킹'))) regionMatch = true;
            if (activeTab === 'golf' && (post.region.includes('ゴルフ') || post.region.includes('골프'))) regionMatch = true;
        }

        const matchesTab = regionMatch;

        const matchesSearch = searchQuery === '' ||
            post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.region?.toLowerCase().includes(searchQuery.toLowerCase());

        // 2. Advanced Filters
        let matchesFilters = true;

        // Date Filter
        if (filters.date) {
            const selected = new Date(filters.date);
            const currentYear = new Date().getFullYear();
            const [startM, startD] = post.startDate.split('.').map(Number);
            const postStart = new Date(currentYear, startM - 1, startD);

            let postEnd = postStart;
            if (post.endDate) {
                const [endM, endD] = post.endDate.split('.').map(Number);
                postEnd = new Date(currentYear, endM - 1, endD);
            }

            selected.setHours(0, 0, 0, 0);
            postStart.setHours(0, 0, 0, 0);
            postEnd.setHours(0, 0, 0, 0);

            if (selected < postStart || selected > postEnd) {
                matchesFilters = false;
            }
        }

        // Gender Filter
        if (matchesFilters && filters.gender) {
            // gender filter logic: 
            // DB has '男性'/'남성', '女性'/'여성', '不問'/'무관'. 
            // We need to map filter selection to these.
            // filter.gender values: 'male', 'female', ''

            if (filters.gender === 'male') {
                if (post.gender !== '男性' && post.gender !== '不問' && post.gender !== '남성' && post.gender !== '무관' && post.gender !== 'male' && post.gender !== 'any') matchesFilters = false;
            } else if (filters.gender === 'female') {
                if (post.gender !== '女性' && post.gender !== '不問' && post.gender !== '여성' && post.gender !== '무관' && post.gender !== 'female' && post.gender !== 'any') matchesFilters = false;
            }
        }

        // Age Filter
        if (matchesFilters && filters.age) {
            // filters.age is like '20s', '30s'. 
            // DB ageGroups is likely ['20대', '30대'] or ['20s', '30s'].
            // Need mapping if DB is Korean.
            const ageMap: Record<string, string[]> = { '20s': ['20代', '20대'], '30s': ['30代', '30대'], '40s': ['40代', '40대'], '50s_plus': ['50代+', '50대+'] };
            const targetAges = ageMap[filters.age] || [filters.age];

            if (!post.ageGroups.some((g: string) => targetAges.includes(g) || g === filters.age)) matchesFilters = false;
        }

        // Style Filter
        if (matchesFilters && filters.style) {
            // filters.style is 'healing', 'photo', etc.
            // DB styles is ['🏞️ ヒーリング', ...] or ['🏞️ 힐링', ...]
            const styleMap: Record<string, string[]> = {
                'healing': ['🏞️ ヒーリング', '🏞️ 힐링'],
                'photo': ['📸 ベストショット', '📸 인생샷'],
                'activity': ['💪 アクティビティ', '💪 액티비티'],
                'food': ['🍽️ グルメ巡り', '🍽️ 맛집 탐방'],
                'camping': ['⛺ キャンプ/車中泊', '⛺ 캠핑/차박']
            };
            const targetStyles = styleMap[filters.style] || [filters.style];

            if (!post.styles.some((s: string) => targetStyles.includes(s) || s === filters.style)) matchesFilters = false;
        }

        return matchesTab && matchesSearch && matchesFilters;
    });

    const handleFilterReset = () => {
        setFilters({ date: '', gender: '', age: '', style: '' });
        setActiveFilter(null);
    };

    const tabs = ['all', 'central_mongolia', 'gobi_desert', 'khuvsgul', 'trekking', 'golf'];

    return (
        <div className="bg-[#f9fafc] dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-display antialiased overflow-x-hidden min-h-screen">
            <div className={`relative flex h-full min-h-screen w-full flex-col pb-24 ${activeFilter ? 'overflow-hidden h-screen' : ''}`}>
                {/* Header */}
                <div className="sticky top-0 z-40 bg-card-light dark:bg-card-dark shadow-sm">
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                        <button onClick={() => navigate('/')} className="text-2xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark">
                            {t('travel_mates.title')}
                        </button>
                        <button className="relative p-2 -mr-2 rounded-full hover:scale-105 transition-transform">
                            <img src={notificationBell} alt={t('header.notification')} className="w-7 h-7 object-contain" />
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
                                placeholder={t('travel_mates.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="border-b border-gray-100 dark:border-gray-800">
                        <div className="flex overflow-x-auto no-scrollbar px-5 gap-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`shrink-0 pb-3 border-b-[3px] font-medium text-[15px] transition-colors ${activeTab === tab
                                        ? 'border-primary text-text-main-light dark:text-white font-bold'
                                        : 'border-transparent text-text-sub-light dark:text-text-sub-dark hover:text-text-main-light dark:hover:text-text-main-dark'
                                        } `}
                                >
                                    {t(`travel_mates.tabs.${tab}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex overflow-x-auto no-scrollbar px-5 py-3 gap-2 bg-card-light dark:bg-card-dark">
                        {[
                            { key: 'date', label: filters.date ? filters.date.slice(5) : t('travel_mates.filters.date') },
                            { key: 'gender', label: filters.gender ? t(`travel_mates.filters.gender_${filters.gender}`) : t('travel_mates.filters.gender') },
                            { key: 'age', label: filters.age ? t(`travel_mates.filters.age_${filters.age}`) : t('travel_mates.filters.age') },
                            { key: 'style', label: filters.style ? t(`travel_mates.filters.style_${filters.style}`) : t('travel_mates.filters.style') }
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
                                {t('travel_mates.reset')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Posts Feed */}
                <div className="flex flex-col bg-white dark:bg-card-dark min-h-[50vh]">
                    {filteredPosts.length === 0 ? (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">group_off</span>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">{t('travel_mates.empty.title')}</p>
                            {(searchQuery || filters.date || filters.gender || filters.age || filters.style) ? (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        handleFilterReset();
                                    }}
                                    className="mt-4 text-primary font-bold text-sm"
                                >
                                    {t('travel_mates.search_reset')}
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/travel-mates/write')}
                                    className="mt-4 bg-primary text-white px-6 py-2 rounded-full font-bold text-sm"
                                >
                                    {t('travel_mates.post.first_post_button')}
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
                                                <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">{t('travel_mates.post.recruit_completed')}</span>
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
                                                {t('travel_mates.post.person_count', { count: post.recruitCount })}
                                            </div>
                                        </div>
                                    </div>
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
                    <span className="font-bold text-[15px] pr-1">{t('travel_mates.post.write_button')}</span>
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
                                    {activeFilter === 'date' && t('travel_mates.modal.select_date')}
                                    {activeFilter === 'gender' && t('travel_mates.modal.select_gender')}
                                    {activeFilter === 'age' && t('travel_mates.modal.select_age')}
                                    {activeFilter === 'style' && t('travel_mates.modal.select_style')}
                                </h3>
                                <button onClick={() => setActiveFilter(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Date Content */}
                                {activeFilter === 'date' && (
                                    <div className="flex flex-col gap-4">
                                        <p className="text-sm text-gray-500">{t('travel_mates.filters.date_placeholder')}</p>
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
                                        {['male', 'female'].map(g => (
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
                                                {g === 'male' ? t('travel_mates.filters.gender_male_only') : t('travel_mates.filters.gender_female_only')}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setFilters({ ...filters, gender: '' });
                                                setActiveFilter(null);
                                            }}
                                            className="p-4 rounded-xl text-left font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            {t('travel_mates.filters.gender_any')}
                                        </button>
                                    </div>
                                )}

                                {/* Age Content */}
                                {activeFilter === 'age' && (
                                    <div className="flex flex-wrap gap-2">
                                        {['20s', '30s', '40s', '50s_plus'].map(age => (
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
                                                {t(`travel_mates.filters.age_${age}`)}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Style Content */}
                                {activeFilter === 'style' && (
                                    <div className="flex flex-wrap gap-2">
                                        {['healing', 'photo', 'activity', 'food', 'camping'].map((style) => (
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
                                                {t(`travel_mates.filters.style_${style}`)}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => setActiveFilter(null)}
                                    className="w-full mt-4 bg-primary text-white font-bold py-4 rounded-xl"
                                >
                                    {t('travel_mates.modal.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
