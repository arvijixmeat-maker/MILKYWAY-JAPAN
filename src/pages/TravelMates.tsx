import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { keysToCamel } from '../utils/mapKeys';
import { BottomNav } from '../components/layout/BottomNav';
import { optimizeImage } from '../utils/imageOptimizer';
import notificationBell from '../assets/notification_bell.png';
import { useTranslation } from 'react-i18next';

const TAB_EMOJI: Record<string, string> = {
    all: '🌏',
    central_mongolia: '🏞️',
    gobi_desert: '🏜️',
    khuvsgul: '🏔️',
    trekking: '🥾',
    golf: '⛳',
};

// Parse "MM.DD" string to Date in given year. Returns null if invalid.
const parseMMDD = (s: string | undefined, year: number): Date | null => {
    if (!s || typeof s !== 'string') return null;
    const m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (!m) return null;
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    if (!Number.isFinite(mm) || !Number.isFinite(dd)) return null;
    return new Date(year, mm - 1, dd);
};

// Compute days from today to the start date (MM.DD format).
// If start date is in the past (e.g., December and now is March),
// treat it as next year. Returns null if can't parse.
const daysUntilStart = (startDate: string | undefined): number | null => {
    if (!startDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const year = now.getFullYear();
    let d = parseMMDD(startDate, year);
    if (!d) return null;
    if (d.getTime() < now.getTime() - 14 * 86400000) {
        // Likely next year's date if it's more than 2 weeks in the past.
        d = parseMMDD(startDate, year + 1);
        if (!d) return null;
    }
    return Math.round((d.getTime() - now.getTime()) / 86400000);
};

const isNewPost = (createdAt: string | undefined): boolean => {
    if (!createdAt) return false;
    try {
        const t = new Date(createdAt).getTime();
        return Number.isFinite(t) && Date.now() - t < 3 * 86400000; // within 3 days
    } catch { return false; }
};

export const TravelMates: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
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
                    const mappedPosts = data.map((post: any) => {
                        const base = keysToCamel<Record<string, any>>(post);

                        let ageGroups = [];
                        let styles = [];
                        try { ageGroups = typeof post.age_groups === 'string' ? JSON.parse(post.age_groups) : post.age_groups || []; } catch { /* ignore */ }
                        try { styles = typeof post.styles === 'string' ? JSON.parse(post.styles) : post.styles || []; } catch { /* ignore */ }

                        let duration = post.duration || '';
                        const durationMatch = duration.match(/^(\d+)N\s+(\d+)D$/);
                        if (durationMatch) {
                            duration = `${durationMatch[1]}${t('travel_mates.detail.nights', { defaultValue: '박' })} ${durationMatch[2]}${t('travel_mates.detail.days', { defaultValue: '일' })}`;
                        } else if (duration === '1 Day') {
                            duration = t('travel_mates.detail.one_day', { defaultValue: '当日' });
                        }

                        return {
                            ...base,
                            ageGroups,
                            styles,
                            duration,
                            authorName: post.author_name === 'Anonymous' ? '' : post.author_name,
                            authorInfo: post.author_info === 'Traveler' ? '' : post.author_info,
                        };
                    });
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
        const region: string = post.region || '';

        // 1. Tab match
        let regionMatch = true;
        if (activeTab !== 'all') {
            const tabLabel = t(`travel_mates.tabs.${activeTab}`) || '';
            const keywordMap: Record<string, string[]> = {
                central_mongolia: ['中央モンゴル', '중앙몽골'],
                gobi_desert: ['ゴビ砂漠', '고비사막'],
                khuvsgul: ['フブスグル', '홉스골'],
                trekking: ['トレッキング', '트레킹'],
                golf: ['ゴルフ', '골프'],
            };
            const keywords = [tabLabel, activeTab, ...(keywordMap[activeTab] || [])].filter(Boolean);
            regionMatch = keywords.some((kw) => region.includes(kw));
        }

        // 2. Search match (null-safe)
        const q = searchQuery.toLowerCase();
        const matchesSearch = q === '' ||
            (post.title || '').toLowerCase().includes(q) ||
            (post.description || '').toLowerCase().includes(q) ||
            region.toLowerCase().includes(q);

        // 3. Advanced filters
        let matchesFilters = true;

        // Date Filter — compare against post's start/end (MM.DD format)
        if (filters.date) {
            const selected = new Date(filters.date);
            if (Number.isFinite(selected.getTime())) {
                const year = selected.getFullYear();
                const postStart = parseMMDD(post.startDate, year);
                const postEnd = post.endDate ? parseMMDD(post.endDate, year) : postStart;
                if (postStart && postEnd) {
                    selected.setHours(0, 0, 0, 0);
                    postStart.setHours(0, 0, 0, 0);
                    postEnd.setHours(0, 0, 0, 0);
                    if (selected < postStart || selected > postEnd) matchesFilters = false;
                } else {
                    matchesFilters = false;
                }
            }
        }

        // Gender Filter
        if (matchesFilters && filters.gender) {
            const maleSet = new Set(['男性', '남성', 'male']);
            const femaleSet = new Set(['女性', '여성', 'female']);
            const anySet = new Set(['不問', '무관', 'any']);
            const g = post.gender || '';
            if (filters.gender === 'male') {
                if (!maleSet.has(g) && !anySet.has(g)) matchesFilters = false;
            } else if (filters.gender === 'female') {
                if (!femaleSet.has(g) && !anySet.has(g)) matchesFilters = false;
            }
        }

        // Age Filter
        if (matchesFilters && filters.age) {
            const ageMap: Record<string, string[]> = {
                '20s': ['20代', '20대', '20s'],
                '30s': ['30代', '30대', '30s'],
                '40s': ['40代', '40대', '40s'],
                '50s_plus': ['50代+', '50대+', '50s+', '50s_plus'],
            };
            const targets = ageMap[filters.age] || [filters.age];
            const ags: string[] = Array.isArray(post.ageGroups) ? post.ageGroups : [];
            if (!ags.some((g) => targets.includes(g))) matchesFilters = false;
        }

        // Style Filter
        if (matchesFilters && filters.style) {
            const styleMap: Record<string, string[]> = {
                'healing': ['🏞️ ヒーリング', '🏞️ 힐링'],
                'photo': ['📸 ベストショット', '📸 인생샷', '📸 人生ショット'],
                'activity': ['💪 アクティビティ', '💪 액티비티'],
                'food': ['🍽️ グルメ巡り', '🍽️ 맛집 탐방', '🍽️ グルメ'],
                'camping': ['⛺ キャンプ/車中泊', '⛺ 캠핑/차박', '⛺ キャンプ'],
            };
            const targets = styleMap[filters.style] || [filters.style];
            const sts: string[] = Array.isArray(post.styles) ? post.styles : [];
            if (!sts.some((s) => targets.includes(s))) matchesFilters = false;
        }

        return regionMatch && matchesSearch && matchesFilters;
    });

    const handleFilterReset = () => {
        setFilters({ date: '', gender: '', age: '', style: '' });
        setActiveFilter(null);
    };

    const tabs = ['all', 'central_mongolia', 'gobi_desert', 'khuvsgul', 'trekking', 'golf'];

    const hasActiveFilter = Boolean(filters.date || filters.gender || filters.age || filters.style);

    return (
        <div className="bg-[#f9fafc] dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-display antialiased overflow-x-hidden min-h-screen">
            <div className={`relative flex h-full min-h-screen w-full flex-col pb-24 ${activeFilter ? 'overflow-hidden h-screen' : ''}`}>
                {/* Header */}
                <div className="sticky top-0 z-40 bg-card-light dark:bg-card-dark shadow-sm">
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                        <button onClick={() => navigate('/')} className="text-2xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark">
                            {t('travel_mates.title')}
                        </button>
                        <button
                            onClick={() => navigate('/mypage')}
                            aria-label={t('header.notification')}
                            className="relative p-2 -mr-2 rounded-full hover:scale-105 transition-transform"
                        >
                            <img src={notificationBell} alt={t('header.notification')} className="w-7 h-7 object-contain" loading="lazy" decoding="async" />
                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-card-dark"></span>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="px-5 pb-3">
                        <div className="relative flex w-full items-center rounded-xl bg-[#f2f4f6] dark:bg-gray-800 h-12 transition-all focus-within:ring-2 focus-within:ring-primary/50">
                            <div className="flex items-center justify-center pl-4 text-primary pointer-events-none">
                                <span className="material-symbols-outlined text-[22px]">search</span>
                            </div>
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 outline-none text-base font-medium placeholder:text-text-sub-light/70 dark:placeholder:text-text-sub-dark/70 px-3 text-text-main-light dark:text-text-main-dark"
                                placeholder={t('travel_mates.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="pr-3 text-text-sub-light hover:text-text-main-light"
                                    aria-label="clear search"
                                >
                                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="border-b border-gray-100 dark:border-gray-800">
                        <div className="flex overflow-x-auto no-scrollbar px-5 gap-5">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`shrink-0 pb-3 border-b-[3px] font-medium text-[15px] transition-colors inline-flex items-center gap-1.5 ${activeTab === tab
                                        ? 'border-primary text-text-main-light dark:text-white font-bold'
                                        : 'border-transparent text-text-sub-light dark:text-text-sub-dark hover:text-text-main-light dark:hover:text-text-main-dark'
                                        } `}
                                >
                                    <span className="text-base leading-none" aria-hidden>{TAB_EMOJI[tab] || ''}</span>
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
                        {hasActiveFilter && (
                            <button
                                onClick={handleFilterReset}
                                className="flex shrink-0 items-center justify-center gap-0.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-500"
                            >
                                <span className="material-symbols-outlined text-[14px]">refresh</span>
                                {t('travel_mates.reset')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Posts Feed */}
                <div className="flex flex-col bg-white dark:bg-card-dark min-h-[50vh]">
                    {loading ? (
                        <div className="flex flex-col">
                            {[0, 1, 2].map((i) => (
                                <PostSkeleton key={i} />
                            ))}
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <EmptyState
                            hasQuery={Boolean(searchQuery || hasActiveFilter)}
                            onReset={() => {
                                setSearchQuery('');
                                handleFilterReset();
                            }}
                            onWrite={() => navigate('/travel-mates/write')}
                            t={t}
                        />
                    ) : (
                        filteredPosts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onClick={() => navigate(`/travel-mates/${post.id}`)}
                                t={t}
                            />
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

// ─── Inner components ──────────────────────────────────────────

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';

const PostCard: React.FC<{ post: any; onClick: () => void; t: any }> = ({ post, onClick, t }) => {
    const isClosed = post.status === 'closed';
    const daysLeft = daysUntilStart(post.startDate);
    const isSoon = !isClosed && daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
    const isNew = !isClosed && isNewPost(post.createdAt);

    const styles: string[] = Array.isArray(post.styles) ? post.styles.slice(0, 3) : [];
    const recruitCount = Number(post.recruitCount) || 0;

    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-card-dark px-4 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3.5 ${isClosed ? 'opacity-70' : ''}`}
        >
            {/* Left: Image */}
            <div className="relative w-[118px] h-[118px] flex-shrink-0">
                <img
                    src={post.image ? optimizeImage(post.image, { width: 240, height: 240 }) : FALLBACK_IMAGE}
                    alt={post.title || ''}
                    className={`w-full h-full rounded-xl object-cover bg-gray-100 dark:bg-gray-700 ${isClosed ? 'grayscale opacity-80' : ''}`}
                    loading="lazy"
                    decoding="async"
                />
                {isClosed && (
                    <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-white bg-gray-800/80 px-2.5 py-1 rounded-full">
                            {t('travel_mates.post.recruit_completed')}
                        </span>
                    </div>
                )}
                {!isClosed && isSoon && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                        🔥 {daysLeft === 0
                            ? t('travel_mates.post.starting_soon')
                            : t('travel_mates.post.days_until_start', { days: daysLeft })}
                    </div>
                )}
                {!isClosed && !isSoon && isNew && (
                    <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                        ✨ {t('travel_mates.post.new_badge')}
                    </div>
                )}
            </div>

            {/* Right: Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Region row */}
                {post.region && (
                    <div className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary mb-1">
                        <span className="material-symbols-outlined text-[13px] leading-none">location_on</span>
                        <span className="truncate">{post.region}</span>
                    </div>
                )}

                {/* Title */}
                <h3 className={`text-[15.5px] font-bold leading-snug mb-1.5 line-clamp-2 ${isClosed ? 'text-gray-500 line-through decoration-gray-400' : 'text-text-main-light dark:text-text-main-dark'}`}>
                    {post.title}
                </h3>

                {/* Date + duration */}
                <div className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums mb-1.5">
                    {post.startDate}{post.endDate ? ` ~ ${post.endDate}` : ''}
                    {post.duration && <span className="text-gray-400 ml-1">· {post.duration}</span>}
                </div>

                {/* Style chips */}
                {styles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {styles.map((s, i) => (
                            <span
                                key={i}
                                className="inline-block text-[10.5px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            >
                                {s}
                            </span>
                        ))}
                    </div>
                )}

                {/* Recruit progress (bottom) */}
                {!isClosed && recruitCount > 0 && (
                    <div className="mt-auto flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-primary">group</span>
                        <span className="text-[12px] font-bold text-primary tabular-nums">
                            {t('travel_mates.post.person_count', { count: recruitCount })}
                        </span>
                        {recruitCount > 1 && (
                            <span className="text-[11px] text-gray-400">
                                · {t('travel_mates.post.spots_left', { n: recruitCount - 1 })}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const PostSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-card-dark px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex gap-3.5 animate-pulse">
        <div className="w-[118px] h-[118px] flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 flex flex-col gap-2 py-1">
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex gap-1 mt-1">
                <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 mt-auto" />
        </div>
    </div>
);

const EmptyState: React.FC<{
    hasQuery: boolean;
    onReset: () => void;
    onWrite: () => void;
    t: any;
}> = ({ hasQuery, onReset, onWrite, t }) => (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-primary">
                {hasQuery ? 'filter_list_off' : 'travel_explore'}
            </span>
        </div>
        <p className="text-[15px] font-bold text-text-main-light dark:text-white">
            {t('travel_mates.empty.title')}
        </p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">
            {t('travel_mates.empty.sub', { defaultValue: '新しい同行者を募集してみてください' })}
        </p>
        {hasQuery ? (
            <button
                onClick={onReset}
                className="mt-5 inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-text-main-light dark:text-white font-bold text-sm px-5 py-2.5 rounded-full"
            >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                {t('travel_mates.search_reset')}
            </button>
        ) : (
            <button
                onClick={onWrite}
                className="mt-5 inline-flex items-center gap-1 bg-primary text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md shadow-primary/30"
            >
                <span className="material-symbols-outlined text-[18px]">edit_square</span>
                {t('travel_mates.post.first_post_button')}
            </button>
        )}
    </div>
);
