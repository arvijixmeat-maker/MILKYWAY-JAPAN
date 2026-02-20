import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { supabase } from '../lib/supabaseClient';

interface FAQ {
    id: string;
    category: string;
    question: string;
    answer: string;
    isActive: boolean;
    viewCount: number;
    order: number;
}

interface FAQCategory {
    id: string;
    name: string;
    isActive: boolean;
    order: number;
}

export const AdminFAQManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'faq' | 'category'>('faq');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
    const [selectedCategory, setSelectedCategoryEdit] = useState<FAQCategory | null>(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [categories, setCategories] = useState<FAQCategory[]>([]);

    // FAQ Form
    const [faqForm, setFaqForm] = useState({
        category: '',
        question: '',
        answer: '',
        isActive: true
    });

    // Category Form
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        isActive: true
    });

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    // Fetch data from Supabase
    useEffect(() => {
        const fetchData = async () => {
            const { data: faqData } = await supabase.from('faqs').select('*').order('order');
            const { data: catData } = await supabase.from('faq_categories').select('*').order('order');
            if (faqData) setFaqs(faqData.map((f: any) => ({ ...f, isActive: f.is_active, viewCount: f.view_count || 0 })));
            if (catData) setCategories(catData.map((c: any) => ({ ...c, isActive: c.is_active })));
        };
        fetchData();
    }, []);

    // Filter FAQs
    const filteredFaqs = faqs.filter(faq => {
        const matchesCategory = filterCategory === 'all' || faq.category === filterCategory;
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Add/Edit FAQ
    const handleSaveFAQ = async () => {
        if (!faqForm.question || !faqForm.answer || !faqForm.category) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        const now = new Date().toISOString();

        if (selectedFAQ) {
            const { error } = await supabase.from('faqs').update({
                category: faqForm.category,
                question: faqForm.question,
                answer: faqForm.answer,
                is_active: faqForm.isActive,
                updated_at: now
            }).eq('id', selectedFAQ.id);

            if (error) {
                alert('FAQ 수정 실패: ' + error.message);
                return;
            }

            setFaqs(faqs.map(f => f.id === selectedFAQ.id ? { ...f, ...faqForm, updatedAt: now } : f));
        } else {
            const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.order)) : 0;
            const newFaq = {
                id: `faq-${Date.now()}`,
                category: faqForm.category,
                question: faqForm.question,
                answer: faqForm.answer,
                is_active: faqForm.isActive,
                view_count: 0,
                order: maxOrder + 1,
                created_at: now,
                updated_at: now
            };
            const { error } = await supabase.from('faqs').insert(newFaq);

            if (error) {
                alert('FAQ 저장 실패: ' + error.message);
                return;
            }

            setFaqs([...faqs, { ...newFaq, isActive: newFaq.is_active, viewCount: 0 }]);
        }

        setIsModalOpen(false);
        setSelectedFAQ(null);
        setFaqForm({ category: '', question: '', answer: '', isActive: true });
    };

    // Delete FAQ
    const handleDeleteFAQ = async (id: string) => {
        if (confirm('이 FAQ를 삭제하시겠습니까?')) {
            await supabase.from('faqs').delete().eq('id', id);
            setFaqs(faqs.filter(f => f.id !== id));
        }
    };

    // Toggle FAQ Active
    const toggleFAQActive = async (faq: FAQ) => {
        await supabase.from('faqs').update({ is_active: !faq.isActive }).eq('id', faq.id);
        setFaqs(faqs.map(f => f.id === faq.id ? { ...f, isActive: !f.isActive } : f));
    };

    // Move FAQ Order
    const moveFAQOrder = async (faq: FAQ, direction: 'up' | 'down') => {
        const sorted = [...faqs].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex(f => f.id === faq.id);

        if (direction === 'up' && index > 0) {
            const prev = sorted[index - 1];
            await supabase.from('faqs').update({ order: prev.order }).eq('id', faq.id);
            await supabase.from('faqs').update({ order: faq.order }).eq('id', prev.id);
            setFaqs(faqs.map(f => f.id === faq.id ? { ...f, order: prev.order } : f.id === prev.id ? { ...f, order: faq.order } : f));
        } else if (direction === 'down' && index < sorted.length - 1) {
            const next = sorted[index + 1];
            await supabase.from('faqs').update({ order: next.order }).eq('id', faq.id);
            await supabase.from('faqs').update({ order: faq.order }).eq('id', next.id);
            setFaqs(faqs.map(f => f.id === faq.id ? { ...f, order: next.order } : f.id === next.id ? { ...f, order: faq.order } : f));
        }
    };

    // Add/Edit Category
    const handleSaveCategory = async () => {
        if (!categoryForm.name) {
            alert('카테고리명을 입력해주세요.');
            return;
        }

        if (selectedCategory) {
            // Update Category
            const { error } = await supabase.from('faq_categories')
                .update({ name: categoryForm.name, is_active: categoryForm.isActive })
                .eq('id', selectedCategory.id);

            if (error) {
                alert('카테고리 수정 실패: ' + error.message);
                return;
            }

            // If name changed, update all associated FAQs
            if (selectedCategory.name !== categoryForm.name) {
                const { error: faqError } = await supabase.from('faqs')
                    .update({ category: categoryForm.name })
                    .eq('category', selectedCategory.name);

                if (faqError) {
                    console.error('Failed to cascade category name update to FAQs:', faqError);
                    alert('카테고리 이름은 변경되었으나, 일부 FAQ의 카테고리 정보 수정에 실패했습니다.');
                } else {
                    // Update local faqs state
                    setFaqs(faqs.map(f => f.category === selectedCategory.name ? { ...f, category: categoryForm.name } : f));
                }
            }

            setCategories(categories.map(c => c.id === selectedCategory.id ? { ...c, ...categoryForm } : c));
        } else {
            const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : 0;
            const newCat = {
                id: `faq-cat-${Date.now()}`,
                name: categoryForm.name,
                is_active: categoryForm.isActive,
                order: maxOrder + 1
            };
            const { error } = await supabase.from('faq_categories').insert(newCat);

            if (error) {
                alert('카테고리 추가 실패: ' + error.message);
                return;
            }

            setCategories([...categories, { ...newCat, isActive: newCat.is_active }]);
        }

        setIsCategoryModalOpen(false);
        setSelectedCategoryEdit(null);
        setCategoryForm({ name: '', isActive: true });
    };

    // Delete Category
    const handleDeleteCategory = async (id: string) => {
        const faqsInCategory = faqs.filter(f => f.category === categories.find(c => c.id === id)?.name);
        if (faqsInCategory.length > 0) {
            alert('이 카테고리에 FAQ가 있어 삭제할 수 없습니다.');
            return;
        }
        if (confirm('이 카테고리를 삭제하시겠습니까?')) {
            await supabase.from('faq_categories').delete().eq('id', id);
            setCategories(categories.filter(c => c.id !== id));
        }
    };

    // Move Category Order
    const moveCategoryOrder = async (cat: FAQCategory, direction: 'up' | 'down') => {
        const sorted = [...categories].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex(c => c.id === cat.id);

        if (direction === 'up' && index > 0) {
            const prev = sorted[index - 1];
            await supabase.from('faq_categories').update({ order: prev.order }).eq('id', cat.id);
            await supabase.from('faq_categories').update({ order: cat.order }).eq('id', prev.id);
            setCategories(categories.map(c => c.id === cat.id ? { ...c, order: prev.order } : c.id === prev.id ? { ...c, order: cat.order } : c));
        } else if (direction === 'down' && index < sorted.length - 1) {
            const next = sorted[index + 1];
            await supabase.from('faq_categories').update({ order: next.order }).eq('id', cat.id);
            await supabase.from('faq_categories').update({ order: cat.order }).eq('id', next.id);
            setCategories(categories.map(c => c.id === cat.id ? { ...c, order: next.order } : c.id === next.id ? { ...c, order: cat.order } : c));
        }
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            <AdminSidebar activePage="faq" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold">FAQ 관리</h1>
                    <div className="flex gap-3">
                        {activeTab === 'category' ? (
                            <button
                                onClick={() => {
                                    setSelectedCategoryEdit(null);
                                    setCategoryForm({ name: '', isActive: true });
                                    setIsCategoryModalOpen(true);
                                }}
                                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">add</span>
                                카테고리 추가
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setSelectedFAQ(null);
                                    setFaqForm({ category: categories[0]?.name || '', question: '', answer: '', isActive: true });
                                    setIsModalOpen(true);
                                }}
                                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">add</span>
                                FAQ 추가
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-8">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('faq')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'faq' ? 'bg-teal-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                            FAQ 목록
                        </button>
                        <button
                            onClick={() => setActiveTab('category')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'category' ? 'bg-teal-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                        >
                            카테고리 관리
                        </button>
                    </div>

                    {activeTab === 'faq' ? (
                        <>
                            {/* Filters */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                        <input
                                            type="text"
                                            placeholder="질문 검색..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none"
                                        />
                                    </div>
                                </div>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                >
                                    <option value="all">전체 카테고리</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* FAQ Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">순서</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">카테고리</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">질문</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">조회</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">상태</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">액션</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {filteredFaqs.map((faq, index) => (
                                            <tr key={faq.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => moveFAQOrder(faq, 'up')} disabled={index === 0} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30">
                                                            <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                        </button>
                                                        <button onClick={() => moveFAQOrder(faq, 'down')} disabled={index === filteredFaqs.length - 1} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30">
                                                            <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded text-xs font-medium">{faq.category}</span>
                                                </td>
                                                <td className="px-4 py-3 max-w-md">
                                                    <p className="font-medium text-slate-900 dark:text-white truncate">{faq.question}</p>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-slate-500">{faq.viewCount}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => toggleFAQActive(faq)}>
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${faq.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {faq.isActive ? '활성' : '비활성'}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedFAQ(faq);
                                                                setFaqForm({ category: faq.category, question: faq.question, answer: faq.answer, isActive: faq.isActive });
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDeleteFAQ(faq.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredFaqs.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">등록된 FAQ가 없습니다.</div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Category Management */
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">순서</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">카테고리명</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">FAQ 수</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">상태</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">액션</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {categories.map((cat, index) => (
                                        <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    <button onClick={() => moveCategoryOrder(cat, 'up')} disabled={index === 0} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30">
                                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                    </button>
                                                    <button onClick={() => moveCategoryOrder(cat, 'down')} disabled={index === categories.length - 1} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30">
                                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{cat.name}</td>
                                            <td className="px-4 py-3 text-center text-sm text-slate-500">
                                                {faqs.filter(f => f.category === cat.name).length}개
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={async () => {
                                                    await supabase.from('faq_categories').update({ is_active: !cat.isActive }).eq('id', cat.id);
                                                    setCategories(categories.map(c => c.id === cat.id ? { ...c, isActive: !c.isActive } : c));
                                                }}>
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {cat.isActive ? '활성' : '비활성'}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCategoryEdit(cat);
                                                            setCategoryForm({ name: cat.name, isActive: cat.isActive });
                                                            setIsCategoryModalOpen(true);
                                                        }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {categories.length === 0 && (
                                <div className="text-center py-12 text-slate-500">등록된 카테고리가 없습니다.</div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* FAQ Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold">{selectedFAQ ? 'FAQ 수정' : 'FAQ 추가'}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">카테고리</label>
                                <select
                                    value={faqForm.category}
                                    onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                >
                                    <option value="">선택하세요</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">질문</label>
                                <input
                                    type="text"
                                    value={faqForm.question}
                                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                                    placeholder="질문을 입력하세요"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">답변</label>
                                <textarea
                                    value={faqForm.answer}
                                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                                    placeholder="답변을 입력하세요"
                                    rows={5}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 resize-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="faqActive"
                                    checked={faqForm.isActive}
                                    onChange={(e) => setFaqForm({ ...faqForm, isActive: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="faqActive" className="text-sm">활성화</label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                                취소
                            </button>
                            <button onClick={handleSaveFAQ} className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600">
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsCategoryModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold">{selectedCategory ? '카테고리 수정' : '카테고리 추가'}</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">카테고리명</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    placeholder="예: 여행 준비"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="catActive"
                                    checked={categoryForm.isActive}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="catActive" className="text-sm">활성화</label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                                취소
                            </button>
                            <button onClick={handleSaveCategory} className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600">
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
