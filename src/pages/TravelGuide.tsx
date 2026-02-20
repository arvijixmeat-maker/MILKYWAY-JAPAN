
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { SEO } from '../components/seo/SEO';
import { BottomNav } from '../components/layout/BottomNav';

interface Magazine {
    id: string;
    title: string;
    description: string;
    content: string;
    category: string;
    image: string;
    tag?: string;
    isFeatured: boolean;
    isActive: boolean;
    order: number;
}

export const TravelGuide: React.FC = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [searchQuery, setSearchQuery] = useState('');
    const [magazineCategories, setMagazineCategories] = useState<string[]>([]);
    const [magazines, setMagazines] = useState<Magazine[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch magazine categories
            const { data: catData } = await supabase
                .from('categories')
                .select('*')
                .eq('type', 'magazine')
                .eq('is_active', true)
                .order('order');
            if (catData) {
                setMagazineCategories(catData.map((c: any) => c.name));
            }

            // Fetch magazines
            const { data: magData } = await supabase
                .from('magazines')
                .select('*')
                .eq('is_active', true)
                .order('order');
            if (magData) {
                setMagazines(magData.map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    content: m.content,
                    category: m.category,
                    image: m.image,
                    tag: m.tag,
                    isFeatured: m.is_featured,
                    isActive: m.is_active,
                    order: m.order
                })));
            }
        };
        fetchData();
    }, []);

    // Construct category list with 'All' at the start
    const categories = ['전체', ...magazineCategories];

    // Filter magazines based on category and search query
    const filteredMagazines = magazines.filter(magazine => {
        const matchesCategory = selectedCategory === '전체' || magazine.category === selectedCategory;
        const matchesSearch = searchQuery === '' ||
            magazine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            magazine.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const featuredMagazines = magazines.filter(m => m.isFeatured).slice(0, 5);

    return (
        <div className="bg-[#f8f7f8] dark:bg-background-dark text-text-primary dark:text-white pb-24 min-h-screen font-display">
            <SEO
                title="여행 가이드 | 몽골리아 은하수"
                description="몽골 여행 필수 정보! 몽골 기본 정보, 여행 팁, 지역별 가이드, 문화와 음식 정보를 확인하세요."
                keywords="몽골 여행 가이드, 몽골 정보, 몽골 문화, 몽골 음식"
            />
            {/* Sticky Header Container */}
            <div className="sticky top-0 z-50 bg-[#f8f7f8]/95 dark:bg-background-dark/95 backdrop-blur-sm transition-colors duration-200">
                <header className="px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-text-primary dark:text-white text-[28px]">arrow_back</span>
                        </button>
                        <div className="flex gap-4">
                            <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                <span className="material-symbols-outlined text-text-primary dark:text-white text-[24px]">notifications</span>
                            </button>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary dark:text-white tracking-tight mb-6">
                        몽골 여행 가이드
                    </h1>
                    {/* Search Bar */}
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-primary text-[22px]">search</span>
                        </div>
                        <input
                            className="block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-white/5 border-none rounded-2xl text-text-primary dark:text-white placeholder-text-secondary focus:ring-2 focus:ring-primary/50 shadow-sm text-base transition-shadow"
                            placeholder="궁금한 여행 정보를 검색해보세요"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </header>

                {/* Categories (Chips) */}
                <section className="px-4 pb-4 overflow-x-auto no-scrollbar">
                    <div className="flex gap-3">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`flex shrink-0 items-center justify-center px-4 py-2.5 rounded-full transition-all active:scale-95 ${selectedCategory === category
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'bg-white dark:bg-white/5 text-text-secondary dark:text-gray-300 border border-transparent hover:bg-gray-50 dark:hover:bg-white/10'
                                    }`}
                            >
                                <span className={`text-[15px] ${selectedCategory === category ? 'font-bold' : 'font-medium'}`}>
                                    {category}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* Featured Section - Only show when showing 'All' and no search */}
            {selectedCategory === '전체' && !searchQuery && featuredMagazines && featuredMagazines.length > 0 && (
                <section className="mt-4 px-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-text-primary dark:text-white">지금 가장 핫한 가이드 🔥</h2>
                    </div>
                    {/* Horizontal Scroll Cards */}
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 snap-x snap-mandatory">
                        {featuredMagazines.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/travel-guide/${item.id}`)}
                                className="relative shrink-0 w-[280px] snap-center group cursor-pointer"
                            >
                                <div className="relative h-[180px] w-full rounded-2xl overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-800">
                                    {item.image ? (
                                        <img
                                            alt={item.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            src={item.image}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400">
                                            <span className="material-symbols-outlined text-4xl">image</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                    <div className="absolute top-3 left-3 bg-primary/90 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-md">
                                        인기
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <h3 className="text-lg font-bold text-text-primary dark:text-white leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-text-secondary line-clamp-1">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Content List */}
            <section className="mt-6 px-4">
                <h2 className="text-xl font-bold text-text-primary dark:text-white mb-4">
                    {searchQuery ? '검색 결과' : '여행 정보 모아보기 📚'}
                </h2>
                <div className="flex flex-col gap-4">
                    {filteredMagazines && filteredMagazines.length > 0 ? (
                        filteredMagazines.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/travel-guide/${item.id}`)}
                                className="group flex bg-white dark:bg-white/5 p-4 rounded-2xl shadow-sm border border-transparent hover:border-primary/20 transition-all cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-gray-100 dark:bg-white/10 text-text-secondary text-[11px] font-bold px-2 py-0.5 rounded-md">
                                            {item.category}
                                        </span>
                                    </div>
                                    <h3 className="text-[17px] font-bold text-text-primary dark:text-white leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                                <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800">
                                    {item.image && (
                                        <img
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            src={item.image}
                                        />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-500">
                            {searchQuery ? '검색 결과가 없습니다.' : '등록된 가이드가 없습니다.'}
                        </div>
                    )}
                </div>
            </section>

            <BottomNav />
            <style>{`
                .font-variation-settings-fill {
                    font-variation-settings: 'FILL' 1;
                }
            `}</style>
        </div>
    );
};
