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
                    order: c.order,
                    type: c.type || 'product'
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
            alert('?ÖÎç∞?¥Ìä∏ ?§Ìå®: ' + error);
        }
    };

    // Delete category
    const deleteCategory = async (id: string) => {
        if (id === 'all') {
            alert('"?ÑÏ≤¥" Ïπ¥ÌÖåÍ≥†Î¶¨????†ú?????ÜÏäµ?àÎã§.');
            return;
        }
        if (confirm('?ïÎßê ??Ïπ¥ÌÖåÍ≥†Î¶¨Î•???†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) {
            try {
                await api.categories.delete(id);
                fetchCategories();
            } catch (error) {
                alert('??†ú ?§Ìå®: ' + error);
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
            if (selectedCategory) {
                // Update
                await api.categories.update(category.id, {
                    icon: category.icon,
                    name: category.name,
                    description: category.description,
                    is_active: category.isActive
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
                    type: 'product'
                };
                await api.categories.create(newCategory);
            }
            setIsModalOpen(false);
            setSelectedCategory(null);
            fetchCategories();
        } catch (error: any) {
            console.error(error);
            alert('?Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.');
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
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Ïπ¥ÌÖåÍ≥†Î¶¨ Í¥ÄÎ¶?/h1>
                    <button
                        onClick={() => {
                            setSelectedCategory(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Ïπ¥ÌÖåÍ≥†Î¶¨ Ï∂îÍ?
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 p-8">

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">?úÏÑú</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">?ÑÏù¥ÏΩ?/th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">?¥Î¶Ñ</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">?§Î™Ö</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">?ÅÌÉú</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">?ëÏóÖ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {sortedCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            ?±Î°ù??Ïπ¥ÌÖåÍ≥†Î¶¨Í∞Ä ?ÜÏäµ?àÎã§.
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
                                                    {category.isActive ? '?úÏÑ±' : 'ÎπÑÌôú??}
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
                                                    ?òÏ†ï
                                                </button>
                                                {category.id !== 'all' && (
                                                    <button
                                                        onClick={() => deleteCategory(category.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        ??†ú
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
            alert('?ÑÏàò ??™©???ÖÎ†•?¥Ï£º?∏Ïöî.');
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
                            {category ? 'Ïπ¥ÌÖåÍ≥†Î¶¨ ?òÏ†ï' : `${type === 'product' ? '?ÅÌíà' : 'Îß§Í±∞Ïß?} Ïπ¥ÌÖåÍ≥†Î¶¨ Ï∂îÍ?`}
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
                                Ïπ¥ÌÖåÍ≥†Î¶¨ ?¥Î¶Ñ *
                            </label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder={type === 'product' ? "?? ?úÎ?Î™ΩÍ≥®" : "?? Î™ΩÍ≥® Í∏∞Î≥∏ ?ïÎ≥¥"}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                ?§Î™Ö
                            </label>
                            <input
                                type="text"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder={type === 'product' ? "?? ?åÌ????∞Îß• ?∏Î†à?? : "?? ?òÏ†Ñ, ?†Ïã¨, ?†Ïî® ??}
                            />
                        </div>

                        {/* Icon */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                ?ÑÏù¥ÏΩ??¥Î?ÏßÄ *
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
                                            alert('?¥Î?ÏßÄ ?ÖÎ°ú???§Ìå®');
                                        }
                                    }
                                }}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Í∂åÏû•: 1:1 ÎπÑÏú®???¥Î?ÏßÄ (?¨Ïö©???îÎ©¥?êÏÑú ?êÌòï?ºÎ°ú ?úÏãú?©Îãà??
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
                                ?úÏÑ±??
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
                            Ï∑®ÏÜå
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-bold"
                        >
                            {category ? '?òÏ†ï ?ÑÎ£å' : 'Ï∂îÍ? ?ÑÎ£å'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
