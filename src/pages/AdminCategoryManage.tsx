// Migrated to API
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { DEFAULT_CATEGORIES, DEFAULT_MAGAZINE_CATEGORIES, type Category } from '../types/category';

export const AdminCategoryManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);

    // Fetch categories from API
    const fetchCategories = async () => {
        try {
            const data = await api.categories.list();

            if (Array.isArray(data) && data.length > 0) {
                const productCats = data.filter((c: any) => c.type === 'product' || !c.type);
                setCategories(productCats.map((c: any) => ({
                    id: c.id,
                    icon: c.icon,
                    name: c.name,
                    description: c.description,
                    isActive: c.is_active,
                    order: c.order ?? c.sort_order ?? 0,
                    type: c.type || 'product',
                    landing_hero_image: c.landing_hero_image,
                    landing_hero_tagline: c.landing_hero_tagline,
                    landing_hero_title: c.landing_hero_title,
                    landing_hero_subtitle: c.landing_hero_subtitle,
                    landing_accent_color: c.landing_accent_color,
                    landing_highlights: Array.isArray(c.landing_highlights) ? c.landing_highlights : [],
                    landing_product_grid_title: c.landing_product_grid_title,
                })));
            } else {
                // Seed default categories if empty
                await seedDefaultCategories();
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
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
        for (const cat of inserts) {
            await api.categories.create(cat);
        }

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
        for (const cat of magInserts) {
            await api.categories.create(cat);
        }

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
            await api.categories.update(id, { is_active: !currentStatus });
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
                await api.categories.delete(id);
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
        await api.categories.update(currentCat.id, { order: targetCat.order });
        await api.categories.update(targetCat.id, { order: currentCat.order });
        fetchCategories();
    };

    const handleSaveCategory = async (category: Category) => {
        try {
            const landingPayload = {
                landing_hero_image: category.landing_hero_image || null,
                landing_hero_tagline: category.landing_hero_tagline || null,
                landing_hero_title: category.landing_hero_title || null,
                landing_hero_subtitle: category.landing_hero_subtitle || null,
                landing_accent_color: category.landing_accent_color || null,
                landing_highlights: category.landing_highlights || [],
                landing_product_grid_title: category.landing_product_grid_title || null,
            };
            if (selectedCategory) {
                // Update
                await api.categories.update(category.id, {
                    icon: category.icon,
                    name: category.name,
                    description: category.description,
                    is_active: category.isActive,
                    ...landingPayload,
                });
            } else {
                // Add New
                const newCategory = {
                    id: `cat-${Date.now()}`,
                    icon: category.icon,
                    name: category.name,
                    description: category.description,
                    is_active: category.isActive ?? true,
                    order: sortedCategories.length,
                    type: 'product',
                    ...landingPayload,
                };
                await api.categories.create(newCategory);
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
                                                {category.icon.startsWith('data:') || category.icon.startsWith('http') || category.icon.startsWith('/') ? (
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
                            {formData.icon && (formData.icon.startsWith('data:') || formData.icon.startsWith('http') || formData.icon.startsWith('/')) && (
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

                        {/* Landing page editor — only for product categories */}
                        {type === 'product' && (
                            <LandingPageEditor
                                formData={formData}
                                setFormData={setFormData}
                            />
                        )}
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

// ─── Landing Page Editor ────────────────────────────────────────────
interface LandingEditorProps {
    formData: Partial<Category>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Category>>>;
}

const LandingPageEditor: React.FC<LandingEditorProps> = ({ formData, setFormData }) => {
    const [expanded, setExpanded] = useState(false);
    const highlights = formData.landing_highlights || [];

    const updateHighlights = (next: any[]) => setFormData({ ...formData, landing_highlights: next });

    const addSection = () => {
        updateHighlights([...highlights, { label: `ハイライト ${highlights.length + 1}`, title: '', subtitle: '', cards: [] }]);
    };
    const updateSection = (idx: number, patch: any) => {
        const next = [...highlights];
        next[idx] = { ...next[idx], ...patch };
        updateHighlights(next);
    };
    const removeSection = (idx: number) => {
        updateHighlights(highlights.filter((_, i) => i !== idx));
    };
    const addCard = (sectionIdx: number) => {
        const next = [...highlights];
        next[sectionIdx] = { ...next[sectionIdx], cards: [...(next[sectionIdx].cards || []), { image: '', tags: [], title: '', description: '' }] };
        updateHighlights(next);
    };
    const updateCard = (sectionIdx: number, cardIdx: number, patch: any) => {
        const next = [...highlights];
        const cards = [...next[sectionIdx].cards];
        cards[cardIdx] = { ...cards[cardIdx], ...patch };
        next[sectionIdx] = { ...next[sectionIdx], cards };
        updateHighlights(next);
    };
    const removeCard = (sectionIdx: number, cardIdx: number) => {
        const next = [...highlights];
        next[sectionIdx] = { ...next[sectionIdx], cards: next[sectionIdx].cards.filter((_: any, i: number) => i !== cardIdx) };
        updateHighlights(next);
    };

    const uploadImageTo = async (file: File, cb: (url: string) => void) => {
        try {
            const url = await uploadImage(file, 'categories');
            cb(url);
        } catch (e) { alert('이미지 업로드 실패'); }
    };

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-teal-600">web</span>
                    랜딩 페이지 편집 (/category/{formData.id || '...'})
                </span>
                <span className={`material-symbols-outlined transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {expanded && (
                <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
                    {/* Hero */}
                    <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">히어로 배너</p>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">배경 이미지</label>
                            {formData.landing_hero_image && (
                                <img src={formData.landing_hero_image} alt="hero" className="mb-2 w-full aspect-video object-cover rounded-lg border border-slate-200" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadImageTo(file, (url) => setFormData({ ...formData, landing_hero_image: url }));
                                }}
                                className="text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">소제목 (tagline)</label>
                                <input
                                    type="text"
                                    value={formData.landing_hero_tagline || ''}
                                    onChange={(e) => setFormData({ ...formData, landing_hero_tagline: e.target.value })}
                                    placeholder="例: 満天の星空が待っている"
                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">강조 색상 (accent)</label>
                                <input
                                    type="color"
                                    value={formData.landing_accent_color || '#0f766e'}
                                    onChange={(e) => setFormData({ ...formData, landing_accent_color: e.target.value })}
                                    className="w-full h-10 border border-slate-200 dark:border-slate-700 rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">메인 제목</label>
                            <input
                                type="text"
                                value={formData.landing_hero_title || ''}
                                onChange={(e) => setFormData({ ...formData, landing_hero_title: e.target.value })}
                                placeholder="例: ゴビ砂漠ツアー"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">서브 제목 (설명)</label>
                            <textarea
                                value={formData.landing_hero_subtitle || ''}
                                onChange={(e) => setFormData({ ...formData, landing_hero_subtitle: e.target.value })}
                                rows={2}
                                placeholder="例: 天の川がはっきり見える空、夕陽に染まる砂丘..."
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">상품 섹션 제목</label>
                            <input
                                type="text"
                                value={formData.landing_product_grid_title || ''}
                                onChange={(e) => setFormData({ ...formData, landing_product_grid_title: e.target.value })}
                                placeholder="例: ゴビ砂漠の人気ツアー"
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Highlights */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">하이라이트 섹션 ({highlights.length})</p>
                            <button type="button" onClick={addSection} className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-sm">add</span>섹션 추가
                            </button>
                        </div>

                        <div className="space-y-3">
                            {highlights.map((section: any, sIdx: number) => (
                                <div key={sIdx} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-[10px] font-bold text-teal-600">섹션 {sIdx + 1}</span>
                                        <button type="button" onClick={() => removeSection(sIdx)} className="text-slate-400 hover:text-red-500">
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={section.label || ''}
                                            onChange={(e) => updateSection(sIdx, { label: e.target.value })}
                                            placeholder="뱃지 라벨 (例: ハイライト 1)"
                                            className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                        <input
                                            type="text"
                                            value={section.title || ''}
                                            onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                                            placeholder="섹션 제목"
                                            className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={section.subtitle || ''}
                                        onChange={(e) => updateSection(sIdx, { subtitle: e.target.value })}
                                        placeholder="섹션 서브타이틀"
                                        className="mt-2 w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />

                                    {/* Cards */}
                                    <div className="mt-3 space-y-2">
                                        {(section.cards || []).map((card: any, cIdx: number) => (
                                            <div key={cIdx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded p-2">
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-shrink-0 w-16 h-16 rounded bg-slate-100 overflow-hidden">
                                                        {card.image ? (
                                                            <img src={card.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <span className="material-symbols-outlined">image</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1.5">
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) uploadImageTo(file, (url) => updateCard(sIdx, cIdx, { image: url }));
                                                                }}
                                                                className="text-[10px] w-28"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={(card.tags || []).join(', ')}
                                                                onChange={(e) => updateCard(sIdx, cIdx, { tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                                placeholder="태그 (콤마 구분)"
                                                                className="flex-1 px-1.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded"
                                                            />
                                                            <button type="button" onClick={() => removeCard(sIdx, cIdx)} className="text-slate-400 hover:text-red-500">
                                                                <span className="material-symbols-outlined text-xs">close</span>
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={card.title || ''}
                                                            onChange={(e) => updateCard(sIdx, cIdx, { title: e.target.value })}
                                                            placeholder="카드 제목"
                                                            className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={card.description || ''}
                                                            onChange={(e) => updateCard(sIdx, cIdx, { description: e.target.value })}
                                                            placeholder="카드 설명"
                                                            className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => addCard(sIdx)} className="w-full py-2 text-[11px] font-semibold text-slate-500 border border-dashed border-slate-300 rounded hover:text-teal-600 hover:border-teal-300">
                                            <span className="material-symbols-outlined text-xs">add</span> 카드 추가
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {highlights.length === 0 && (
                                <p className="text-xs text-center text-slate-400 py-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                    위 "섹션 추가" 버튼으로 하이라이트를 만드세요
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
