import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { SEO } from '../components/seo/SEO';
import { BottomNav } from '../components/layout/BottomNav';

export const FAQPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [faqs, setFaqs] = useState<any[]>([]);

    // Fetch data from Supabase
    useEffect(() => {
        const fetchData = async () => {
            const { data: catData } = await supabase.from('faq_categories').select('*').eq('is_active', true).order('order');
            const { data: faqData } = await supabase.from('faqs').select('*').eq('is_active', true).order('order');
            if (catData) setCategories(catData.map((c: any) => ({ id: c.id, name: c.name })));
            if (faqData) setFaqs(faqData.map((f: any) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category, viewCount: f.view_count || 0 })));
        };
        fetchData();
    }, []);

    // All categories including "전체"
    const allCategories = ['전체', ...categories.map(c => c.name)];

    // Filter FAQs
    const filteredFaqs = faqs.filter(faq => {
        const matchesCategory = selectedCategory === '전체' || faq.category === selectedCategory;
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Toggle accordion
    const toggleAccordion = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            // Increment view count in Supabase
            await supabase.from('faqs').update({ view_count: faqs.find(f => f.id === id)?.viewCount + 1 }).eq('id', id);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            <SEO
                title="자주 묻는 질문 | 몽골리아 은하수"
                description="몽골 여행 관련 자주 묻는 질문과 답변을 확인하세요. 예약, 결제, 취소, 환불 등 궁금한 점을 해결해 드립니다."
                keywords="몽골 여행 FAQ, 몽골 투어 질문, 여행사 자주 묻는 질문"
            />
            <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 min-h-screen overflow-y-auto">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between px-4 h-14">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
                        </button>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">자주 묻는 질문</h1>
                        <div className="w-10"></div>
                    </div>
                </header>

                {/* Search */}
                <div className="p-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="궁금한 내용을 검색해 보세요"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="px-4 overflow-x-auto">
                    <div className="flex gap-2 pb-3">
                        {allCategories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FAQ List */}
                <div className="px-4 pb-56">
                    {filteredFaqs.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">help_outline</span>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">등록된 FAQ가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredFaqs.map((faq) => (
                                <div key={faq.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <button
                                        onClick={() => toggleAccordion(faq.id)}
                                        className="w-full flex items-center justify-between p-4 text-left"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-teal-500 font-bold">Q</span>
                                            <span className="text-gray-900 dark:text-white font-medium">{faq.question}</span>
                                        </div>
                                        <span className={`material-symbols-outlined text-gray-400 transition-transform ${expandedId === faq.id ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>
                                    {expandedId === faq.id && (
                                        <div className="px-4 pb-4 pt-0">
                                            <div className="pl-6 pt-3 border-t border-gray-100 dark:border-gray-700">
                                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                <BottomNav />
            </div>
        </div>
    );
};
