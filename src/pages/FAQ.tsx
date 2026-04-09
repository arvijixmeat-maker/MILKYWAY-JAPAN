import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { BottomNav } from '../components/layout/BottomNav';

export const FAQPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('?ô„Åπ??);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [faqs, setFaqs] = useState<any[]>([]);

    // Fetch data from Cloudflare
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catData, faqData] = await Promise.all([
                    api.faqCategories.list(),
                    api.faqs.list()
                ]);
                if (Array.isArray(catData)) setCategories(catData.filter((c: any) => c.is_active).map((c: any) => ({ id: c.id, name: c.name })));
                if (Array.isArray(faqData)) setFaqs(faqData.filter((f: any) => f.is_active).map((f: any) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category, viewCount: f.view_count || 0 })));
            } catch (error) {
                console.error('Error fetching FAQ data:', error);
            }
        };
        fetchData();
    }, []);

    // All categories including "?ô„Åπ??
    const allCategories = ['?ô„Åπ??, ...categories.map(c => c.name)];

    // Filter FAQs
    const filteredFaqs = faqs.filter(faq => {
        const matchesCategory = selectedCategory === '?ô„Åπ?? || faq.category === selectedCategory;
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
            // Increment view count via API
            try {
                await api.faqs.update(id, { view_count: (faqs.find(f => f.id === id)?.viewCount || 0) + 1 });
            } catch (error) {
                console.error('Error updating FAQ view count:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            <SEO
                title="?¢„É≥?¥„É´?Ñ„Ç¢?º„Éª?¢„É≥?¥„É´?ÖË°å??Çà?è„ÅÇ?ãË≥™?è„ÄêMilkyway Japan??
                description="?¢„É≥?¥„É´?Ñ„Ç¢?º„Éª?¢„É≥?¥„É´?ÖË°å?´Èñ¢?ô„Çã?à„Åè?Ç„ÇãË≥™Âïè?®ÂõûÁ≠î„ÄÇ‰∫àÁ¥ÑÊñπÊ≥ï„ÄÅ„É¢?≥„Ç¥?´ÊóÖË°åË≤ª?®„ÄÅ„É¢?≥„Ç¥?´‰πóÈ¶¨ÊóÖË°å„ÅÆÊ∫ñÂÇô?Å„Ç¥?ìÁ†ÇÊº†„ÉÑ?¢„Éº??åÅ?°Áâ©?™„Å©?Å„ÅäÂÆ¢Êßò??ñë?è„ÇíËß£Ê±∫?Ñ„Åü?ó„Åæ?ô„Ä?
                keywords="?¢„É≥?¥„É´?Ñ„Ç¢?ºFAQ, ?¢„É≥?¥„É´?ÖË°åË≥™Âïè, ?¢„É≥?¥„É´?ÖË°åË≤ªÁî®, ?¢„É≥?¥„É´‰πóÈ¶¨?ÖË°åÊ∫ñÂÇô, ?¢„É≥?¥„É´?Ñ„Ç¢?º‰∫àÁ¥?
                url="/faq"
                breadcrumb={[
                    { name: '?õ„Éº??, url: '/' },
                    { name: '?à„Åè?Ç„ÇãË≥™Âïè', url: '/faq' }
                ]}
                structuredData={faqs.length > 0 ? {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": faqs.slice(0, 20).map(faq => ({
                        "@type": "Question",
                        "name": faq.question,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": faq.answer
                        }
                    }))
                } : undefined}
            />
            <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 min-h-screen overflow-y-auto">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between px-4 h-14">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
                        </button>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">?à„Åè?Ç„ÇãË≥™Âïè</h1>
                        <div className="w-10"></div>
                    </div>
                </header>

                {/* Search */}
                <div className="p-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Ê∞ó„Å´?™„Çã?ÖÂ??íÊ§úÁ¥¢„Åó?¶„Åø?¶„Åè?†„Åï??
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
                            <p className="mt-4 text-gray-500 dark:text-gray-400">?ªÈå≤?ï„Çå?üFAQ??ÅÇ?ä„Åæ?õ„Çì??/p>
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
