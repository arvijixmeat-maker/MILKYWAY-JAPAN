// Migrated to Supabase
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadImage } from '../utils/upload';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { DEFAULT_CATEGORIES, DEFAULT_MAGAZINE_CATEGORIES, type Category } from '../types/category';

export const AdminCategoryManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);

    // Fetch categories from Supabase
    const fetchCategories = async () => {
        const { data } = await supabase
            .from('categories')
            .select('*')
            .or('type.eq.product,type.is.null')
            .order('order');

        if (data && data.length > 0) {
            setCategories(data.map((c: any) => ({
                id: c.id,
                icon: c.icon,
                name: c.name,
                description: c.description,
                isActive: c.is_active,
                order: c.order,
                type: c.type || 'product'
            })));
        } else {
            // Seed default categories if empty
            await seedDefaultCategories();
        }
    };

    const seedDefaultCategories = async () => {
        const inserts = DEFAULT_CATEGORIES.map((c, idx) => ({
            id: c.id,
            icon: c.icon,
            name: c.name,
            description: c.description,
            is_active: c.isActive,
            order: idx,
            type: 'product'
        }));
        await supabase.from('categories').insert(inserts);

        // Also seed magazine categories
        const magInserts = DEFAULT_MAGAZINE_CATEGORIES.map((c, idx) => ({
            id: c.id,
            icon: c.icon,
            name: c.name,
            description: c.description,
            is_active: c.isActive,
            order: idx,
            type: 'magazine'
        }));
        await supabase.from('categories').insert(magInserts);

        fetchCategories();
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    // Toggle active status
    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await supabase.from('categories').update({ is_active: !currentStatus }).eq('id', id);
            fetchCategories();
        } catch (error) {
            alert('업데이트 실패: ' + error);
        }
    };

    // Delete category
    const deleteCategory = async (id: string) => {
        if (id === 'all') {
            alert('"전체" 카테고리는 삭제할 수 없습니다.');
            return;
        }
        if (confirm('정말 이 카테고리를 삭제하시겠습니까?')) {
            try {
                await supabase.from('categories').delete().eq('id', id);
                fetchCategories();
            } catch (error) {
                alert('삭제 실패: ' + error);
            }
        }
    };

    // Move category up/down
    const moveCategory = async (index: number, direction: 'up' | 'down') => {
        if (!sortedCategories) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= sortedCategories.length) return;

        const currentCat = sortedCategories[index];
        const targetCat = sortedCategories[newIndex];

        // Swap orders
        await supabase.from('categories').update({ order: targetCat.order }).eq('id', currentCat.id);
        await supabase.from('categories').update({ order: currentCat.order }).eq('id', targetCat.id);
        fetchCategories();
    };

    const handleSaveCategory = async (category: Category) => {
        try {
            if (selectedCategory) {
                // Update
                await supabase.from('categories').update({
                    icon: category.icon,
                    name: category.name,
                    description: category.description,
                    is_active: category.isActive
                }).eq('id', category.id);
            } else {
                // Add New
                const newCategory = {
                    id: `cat-${Date.now()}`,
                    icon: category.icon,
                    name: category.name,
                    description: category.description,
                    is_active: category.isActive ?? true,
                    order: sortedCategories.length,
                    type: 'product'
                };
                await supabase.from('categories').insert(newCategory);
            }
            setIsModalOpen(false);
            setSelectedCategory(null);
            fetchCategories();
        } catch (error: any) {
            console.error(error);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            <AdminSidebar
                activePage="categories"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">카테고리 관리</h1>
                    <button
                        onClick={() => {
                            setSelectedCategory(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined">add</span>
                        카테고리 추가
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 p-8">

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">순서</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">아이콘</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">이름</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">설명</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">상태</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {sortedCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            등록된 카테고리가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedCategories.map((category, index) => (
                                        <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => moveCategory(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                    </button>
                                                    <button
                                                        onClick={() => moveCategory(index, 'down')}
                                                        disabled={index === sortedCategories.length - 1}
                                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                    </button>
                                                    <span className="text-sm text-slate-500">{index + 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {category.icon.startsWith('data:') ? (
                                                    <img
                                                        src={category.icon}
                                                        alt={category.name}
                                                        className="w-8 h-8 object-cover rounded"
                                                    />
                                                ) : (
                                                    <span className="material-symbols-outlined text-teal-500">{category.icon}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">{category.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-500 dark:text-slate-400">{category.description}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => toggleActive(category.id, category.isActive)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold ${category.isActive
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                                        }`}
                                                >
                                                    {category.isActive ? '활성' : '비활성'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCategory(category);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="text-teal-600 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300 mr-4"
                                                >
                                                    수정
                                                </button>
                                                {category.id !== 'all' && (
                                                    <button
                                                        onClick={() => deleteCategory(category.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <CategoryModal
                    category={selectedCategory}
                    type="product"
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedCategory(null);
                    }}
                    onSave={handleSaveCategory}
                />
            )}
        </div>
    );
};

// Category Modal Component
interface CategoryModalProps {
    category: Category | null;
    type: 'product' | 'magazine';
    onClose: () => void;
    onSave: (category: Category) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ category, type, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Category>>(
        category || {
            name: '',
            icon: 'category',
            description: '',
            isActive: true,
            order: 0,
            type: type
        }
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.icon) {
            alert('필수 항목을 입력해주세요.');
            return;
        }
        // Ensure type matches the current tab if creating new
        if (!category) {
            formData.type = type;
        }
        onSave(formData as Category);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            {category ? '카테고리 수정' : `${type === 'product' ? '상품' : '매거진'} 카테고리 추가`}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                카테고리 이름 *
                            </label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder={type === 'product' ? "예: 서부몽골" : "예: 몽골 기본 정보"}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                설명
                            </label>
                            <input
                                type="text"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder={type === 'product' ? "예: 알타이 산맥 트레킹" : "예: 환전, 유심, 날씨 등"}
                            />
                        </div>

                        {/* Icon */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                아이콘 이미지 *
                            </label>

                            {/* Image Preview */}
                            {formData.icon && (
                                <div className="mb-3">
                                    <img
                                        src={formData.icon}
                                        alt="Category icon"
                                        className="w-20 h-20 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            )}

                            {/* File Upload */}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        try {
                                            const url = await uploadImage(file, 'categories');
                                            setFormData({ ...formData, icon: url });
                                        } catch (error) {
                                            console.error('Category image upload failed:', error);
                                            alert('이미지 업로드 실패');
                                        }
                                    }
                                }}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                권장: 1:1 비율의 이미지 (사용자 화면에서 원형으로 표시됩니다)
                            </p>
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive || false}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                활성화
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-bold"
                        >
                            {category ? '수정 완료' : '추가 완료'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
