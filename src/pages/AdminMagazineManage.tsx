import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { SimpleSlider } from '../components/ui/SimpleSlider';

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
    createdAt?: string;
    updatedAt?: string;
}

interface MagazineCategory {
    id: string;
    name: string;
    order: number;
    isActive: boolean;
    type: string;
}

// Custom Blot Definitions
const BlockEmbed = ReactQuill.Quill.import('blots/block/embed') as any;

class DividerBlot extends BlockEmbed {
    static create() {
        const node = super.create();
        return node;
    }
}
// @ts-ignore
DividerBlot.blotName = 'divider';
// @ts-ignore
DividerBlot.tagName = 'hr';

class SliderBlot extends BlockEmbed {
    static create(value: string) {
        const node = super.create();
        node.setAttribute('class', 'magazine-slider');
        node.setAttribute('data-images', value);

        // Container
        const container = document.createElement('div');
        container.style.cssText = 'padding: 1rem; border: 2px dashed #cbd5e1; border-radius: 0.75rem; background-color: #f8fafc; text-align: center; margin: 1rem 0; position: relative;';

        // Remove Button
        const removeBtn = document.createElement('div');
        const removeBtnIcon = document.createElement('span');
        removeBtnIcon.className = 'material-symbols-outlined';
        removeBtnIcon.style.fontSize = '16px';
        removeBtnIcon.textContent = 'close';
        removeBtn.appendChild(removeBtnIcon);
        removeBtn.style.cssText = 'position: absolute; top: -10px; right: -10px; width: 24px; height: 24px; background-color: #ef4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10;';

        // Add click listener to remove the blot
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent editor selection
            // Find the closest ql-editor to trigger an update if needed, but removing the node is usually enough for key events. 
            // However, to be safe with ReactQuill, we just remove the DOM node.
            // Quill's MutationObserver will handle the deletion.
            node.remove();
        });

        // Content
        const images = value.split(',').filter(url => /^https?:\/\//.test(url.trim()));
        const content = document.createElement('div');

        const label = document.createElement('div');
        label.style.cssText = 'font-weight: bold; color: #64748b; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;';
        const labelIcon = document.createElement('span');
        labelIcon.className = 'material-symbols-outlined';
        labelIcon.style.fontSize = '1.25rem';
        labelIcon.textContent = 'photo_library';
        const labelText = document.createElement('span');
        labelText.textContent = `이미지 슬라이더 (${images.length}장)`;
        label.appendChild(labelIcon);
        label.appendChild(labelText);

        const thumbnails = document.createElement('div');
        thumbnails.style.cssText = 'display: flex; gap: 0.5rem; justify-content: center; overflow-x: auto; padding-bottom: 0.5rem;';
        images.forEach(url => {
            const img = document.createElement('img');
            img.src = url.trim();
            img.style.cssText = 'height: 60px; width: 60px; object-fit: cover; border-radius: 0.5rem; border: 1px solid #e2e8f0;';
            thumbnails.appendChild(img);
        });

        content.appendChild(label);
        content.appendChild(thumbnails);

        container.appendChild(removeBtn);
        container.appendChild(content);
        node.appendChild(container);

        node.contentEditable = 'false';
        return node;
    }

    static value(node: HTMLElement) {
        return node.getAttribute('data-images');
    }
}
// @ts-ignore
SliderBlot.blotName = 'slider';
// @ts-ignore
SliderBlot.tagName = 'div';
// @ts-ignore
SliderBlot.className = 'magazine-slider';

// LocationBlot — inline place card embedded in magazine content.
// Stores a JSON payload (URL-encoded) so newlines / special chars in
// `hours` survive HTML attribute serialization round-trips.
class LocationBlot extends BlockEmbed {
    static create(value: string) {
        const node = super.create();
        node.setAttribute('class', 'magazine-location');
        node.setAttribute('data-payload', value);

        let parsed: any = {};
        try { parsed = JSON.parse(decodeURIComponent(value)); } catch { /* ignore */ }

        // Container
        const container = document.createElement('div');
        container.style.cssText = 'padding: 1rem 1.25rem; border: 2px dashed #14b8a6; border-radius: 0.75rem; background-color: #f0fdfa; margin: 1rem 0; position: relative;';

        // Remove button
        const removeBtn = document.createElement('div');
        const removeIcon = document.createElement('span');
        removeIcon.className = 'material-symbols-outlined';
        removeIcon.style.fontSize = '16px';
        removeIcon.textContent = 'close';
        removeBtn.appendChild(removeIcon);
        removeBtn.style.cssText = 'position: absolute; top: -10px; right: -10px; width: 24px; height: 24px; background-color: #ef4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10;';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            node.remove();
        });

        // Header row: pin icon + place name
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;';
        const pin = document.createElement('span');
        pin.className = 'material-symbols-outlined';
        pin.style.cssText = 'font-size: 20px; color: #0f766e;';
        pin.textContent = 'place';
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight: bold; color: #0f766e; font-size: 14px;';
        titleEl.textContent = parsed.name || '(이름 없음)';
        header.appendChild(pin);
        header.appendChild(titleEl);

        // Body: address + extras
        const body = document.createElement('div');
        body.style.cssText = 'font-size: 12px; color: #475569; line-height: 1.5;';
        if (parsed.address) {
            const addrLine = document.createElement('div');
            addrLine.textContent = `📍 ${parsed.address}`;
            body.appendChild(addrLine);
        }
        if (parsed.phone) {
            const phoneLine = document.createElement('div');
            phoneLine.textContent = `📞 ${parsed.phone}`;
            body.appendChild(phoneLine);
        }
        const extras: string[] = [];
        if (parsed.mapEmbedUrl) extras.push('🗺️ 지도');
        if (parsed.hours) extras.push('🕐 운영시간');
        if (parsed.website) extras.push('🌐 홈페이지');
        if (extras.length > 0) {
            const extraLine = document.createElement('div');
            extraLine.style.cssText = 'margin-top: 4px; color: #64748b; font-size: 11px;';
            extraLine.textContent = extras.join('  ·  ');
            body.appendChild(extraLine);
        }

        container.appendChild(removeBtn);
        container.appendChild(header);
        container.appendChild(body);
        node.appendChild(container);

        node.contentEditable = 'false';
        return node;
    }

    static value(node: HTMLElement) {
        return node.getAttribute('data-payload');
    }
}
// @ts-ignore
LocationBlot.blotName = 'location';
// @ts-ignore
LocationBlot.tagName = 'div';
// @ts-ignore
LocationBlot.className = 'magazine-location';

// @ts-ignore
ReactQuill.Quill.register(DividerBlot);
// @ts-ignore
ReactQuill.Quill.register(SliderBlot);
// @ts-ignore
ReactQuill.Quill.register(LocationBlot);

// Custom Toolbar Icons
const icons = ReactQuill.Quill.import('ui/icons') as any;
icons['divider'] = '<svg viewBox="0 0 18 18"> <line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"></line> </svg>';
icons['slider'] = '<svg viewBox="0 0 18 18"> <rect class="ql-stroke" height="10" width="12" x="3" y="4"></rect> <circle class="ql-fill" cx="6" cy="7" r="1"></circle> <polyline class="ql-even ql-fill" points="5 12 5 11 7 9 8 10 9.4 8 13.4 12 5 12"></polyline> </svg>';
icons['location'] = '<svg viewBox="0 0 18 18"> <path class="ql-stroke" d="M9,1 C5.5,1 3,3.5 3,7 C3,11 9,17 9,17 C9,17 15,11 15,7 C15,3.5 12.5,1 9,1 Z" fill="none"></path> <circle class="ql-fill" cx="9" cy="7" r="2"></circle> </svg>';


export const AdminMagazineManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);


    const [editorContent, setEditorContent] = useState('');

    const quillRef = useRef<ReactQuill>(null);
    const sliderInputRef = useRef<HTMLInputElement>(null);
    const savedRange = useRef<ReactQuill.Range | null>(null);

    // Inline location modal state (for embedded LocationBlot)
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationModalForm, setLocationModalForm] = useState({
        name: '',
        address: '',
        phone: '',
        website: '',
        mapEmbedUrl: '',
        mapQuery: '',
        hours: '',
    });

    // View Mode: 'list' | 'edit'
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [editingMagazine, setEditingMagazine] = useState<Magazine | null>(null);

    // Tab: 'magazines' | 'categories'
    const [activeTab, setActiveTab] = useState<'magazines' | 'categories'>('magazines');

    // Data State
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [magazineCategories, setMagazineCategories] = useState<MagazineCategory[]>([]);

    // Category Management State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string, order: number, isActive: boolean } | null>(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', isActive: true });

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    // Form State
    const [formData, setFormData] = useState<Partial<Magazine>>({
        title: '',
        description: '',
        content: '',
        category: '여행 팁',
        image: '',
        tag: '',
        isFeatured: false,
        isActive: true,
        order: 0,
    });

    // Editor Handlers
    const handleImageHandler = React.useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
                try {
                    const url = await uploadImage(file, 'magazine-content');
                    const quill = quillRef.current?.getEditor();
                    if (quill) {
                        const range = quill.getSelection();
                        quill.insertEmbed(range?.index || 0, 'image', url);
                    }
                } catch (error) {
                    console.error('Image upload failed:', error);
                    alert('이미지 업로드 실패');
                }
            }
        };
    }, []);

    const handleDivider = () => {
        const quill = quillRef.current?.getEditor();
        if (quill) {
            const range = quill.getSelection();
            if (range) {
                quill.insertEmbed(range.index, 'divider', true);
                quill.setSelection(range.index + 1, 0);
            }
        }
    };

    const handleSlider = () => {
        const quill = quillRef.current?.getEditor();
        if (quill) {
            // Save current selection before losing focus to file input
            savedRange.current = quill.getSelection();
        }
        sliderInputRef.current?.click();
    };

    const handleSliderFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            try {
                const uploadedUrls: string[] = [];
                for (let i = 0; i < files.length; i++) {
                    const url = await uploadImage(files[i], 'magazine-slider');
                    uploadedUrls.push(url);
                }

                const quill = quillRef.current?.getEditor();
                if (quill) {
                    // Use saved selection or fall back to end of document
                    const range = savedRange.current || { index: quill.getLength(), length: 0 };

                    if (range) {
                        if (uploadedUrls.length === 0) {
                            alert('이미지 업로드에 실패했습니다.');
                            return;
                        }

                        const index = range.index;

                        // 1. Insert Custom Slider Blot
                        quill.insertEmbed(index, 'slider', uploadedUrls.join(','));

                        // 2. Insert TWO newlines after the slider to guarantee a new editable paragraph
                        //    First newline closes the embed's block, second creates a fresh <p>
                        quill.insertText(index + 1, '\n\n');

                        // 3. Force focus and move cursor to the new paragraph
                        quill.focus();
                        quill.setSelection(index + 2, 0);
                    }
                }
            } catch (error) {
                console.error('Slider images upload failed:', error);
                alert('슬라이더 이미지 업로드 실패');
            }
        }
        // Reset input
        if (sliderInputRef.current) sliderInputRef.current.value = '';
    };

    // Open location modal — saves cursor position so we can insert at the right spot
    const handleLocation = () => {
        const quill = quillRef.current?.getEditor();
        if (quill) {
            savedRange.current = quill.getSelection();
        }
        setLocationModalForm({
            name: '',
            address: '',
            phone: '',
            website: '',
            mapEmbedUrl: '',
            mapQuery: '',
            hours: '',
        });
        setIsLocationModalOpen(true);
    };

    const insertLocationBlot = () => {
        if (!locationModalForm.name && !locationModalForm.address && !locationModalForm.mapEmbedUrl) {
            alert('장소 이름 / 주소 / 지도 임베드 중 하나는 입력해주세요.');
            return;
        }
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const range = savedRange.current || { index: quill.getLength(), length: 0 };
        const payload = encodeURIComponent(JSON.stringify(locationModalForm));
        const index = range.index;

        quill.insertEmbed(index, 'location', payload);
        // Insert two newlines so the cursor lands on a fresh paragraph below the block
        quill.insertText(index + 1, '\n\n');
        quill.focus();
        quill.setSelection(index + 2, 0);

        setIsLocationModalOpen(false);
    };

    // Custom Toolbar Options with registered blot names
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                [{ color: [] }, { background: [] }],
                [{ align: [] }],
                ['link', 'image', 'video'],
                ['divider', 'slider', 'location'], // Custom buttons
                ['clean']
            ],
            handlers: {
                image: handleImageHandler,
                divider: handleDivider,
                slider: handleSlider,
                location: handleLocation
            }
        }
    }), [handleImageHandler]);


    // Fetch data from API
    const fetchMagazines = async () => {
        try {
            const data = await api.magazines.list();
            if (Array.isArray(data)) {
                setMagazines(data.map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    description: m.subtitle || m.description || '', // Map subtitle
                    content: m.content,
                    category: m.category,
                    image: m.thumbnail || m.image || '', // Map thumbnail
                    tag: m.tag,
                    isFeatured: m.is_featured,
                    isActive: m.is_active,
                    order: m.order,
                    createdAt: m.created_at,
                    updatedAt: m.updated_at,
                })));
            }
        } catch (error) {
            console.error('Error fetching magazines:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await api.categories.list('magazine');
            if (Array.isArray(data)) {
                const magazineCats = data.filter((c: any) => c.type === 'magazine');
                setMagazineCategories(magazineCats.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    order: c.order,
                    isActive: c.is_active,
                    type: c.type
                })));
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        fetchMagazines();
        fetchCategories();
    }, []);

    const categories = magazineCategories?.map(c => c.name) || [];

    // Sync default category
    useEffect(() => {
        if (categories.length > 0 && !categories.includes(formData.category || '')) {
            setFormData(prev => ({ ...prev, category: categories[0] }));
        }
    }, [categories, formData.category]);

    // Filter Logic
    const filteredMagazines = magazines?.filter(magazine => {
        const matchesSearch = magazine.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || magazine.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const isReorderable = searchQuery === '' && filterCategory === 'all';

    const moveMagazine = async (index: number, direction: 'up' | 'down') => {
        if (!filteredMagazines) return;
        const currentMagazine = filteredMagazines[index];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const targetMagazine = filteredMagazines[targetIndex];
        if (!targetMagazine) return;

        const currentOrder = currentMagazine.order;
        const targetOrder = targetMagazine.order;

        await api.magazines.update(currentMagazine.id, { order: targetOrder });
        await api.magazines.update(targetMagazine.id, { order: currentOrder });
        fetchMagazines();
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const url = await uploadImage(file, 'magazines');
                setFormData(prev => ({ ...prev, image: url }));
            } catch (error) {
                console.error('Magazine image upload failed:', error);
                alert('이미지 업로드 실패');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            content: '',
            category: categories[0] || '여행 팁',
            image: '',
            tag: '',
            isFeatured: false,
            isActive: true,
            order: 0
        });
        setEditorContent('');
        setEditingMagazine(null);
        setViewMode('list');
    };

    const handleCreateNew = () => {
        resetForm();
        setViewMode('edit');
    };

    const handleEdit = (magazine: Magazine) => {
        setEditingMagazine(magazine);
        setFormData(magazine);
        setEditorContent(magazine.content || '');
        setViewMode('edit');
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            try {
                await api.magazines.delete(id);
                fetchMagazines();
            } catch (error) {
                console.error('Error deleting magazine:', error);
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    const handleSubmit = async () => {
        try {
            const content = editorContent || formData.content || '';

            if (!formData.title?.trim()) {
                alert('제목을 입력해주세요.');
                return;
            }

            const maxOrder = magazines.length > 0 ? Math.max(...magazines.map(m => m.order)) : 0;

            const magazineData = {
                title: formData.title || '',
                subtitle: formData.description || '', // Map description to subtitle
                content: content,
                category: formData.category || '여행 팁',
                thumbnail: formData.image || '', // Map image to thumbnail
                tag: formData.tag,
                is_featured: formData.isFeatured || false,
                is_active: formData.isActive ?? true,
                order: editingMagazine ? formData.order! : maxOrder + 1,
                updated_at: new Date().toISOString()
            };

            if (editingMagazine) {
                await api.magazines.update(editingMagazine.id, magazineData);
            } else {
                await api.magazines.create({
                    ...magazineData,
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString()
                });
            }

            alert('저장되었습니다!');
            fetchMagazines();
            resetForm();
        } catch (error: any) {
            console.error('Error saving magazine:', error);
            alert(`저장 실패: ${error.message || '저장 중 오류가 발생했습니다.'}`);
        }
    };

    // Update editor content when formData loaded
    useEffect(() => {
        if (viewMode === 'edit' && formData.content) {
            setEditorContent(formData.content);
        }
    }, [viewMode, formData.content]);

    // Category CRUD logic
    const handleSaveCategory = async () => {
        if (!categoryForm.name) {
            alert('카테고리명을 입력해주세요.');
            return;
        }
        if (editingCategory) {
            await api.categories.update(editingCategory.id, {
                name: categoryForm.name,
                is_active: categoryForm.isActive
            });
        } else {
            const maxOrder = magazineCategories?.length ? Math.max(...magazineCategories.map(c => c.order)) : 0;
            await api.categories.create({
                id: `mag-cat-${Date.now()}`,
                name: categoryForm.name,
                is_active: categoryForm.isActive,
                order: maxOrder + 1,
                type: 'magazine',
                icon: 'article',
                description: ''
            });
        }
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
        setCategoryForm({ name: '', isActive: true });
        fetchCategories();
    };

    const handleDeleteCategory = async (cat: MagazineCategory) => {
        const count = magazines?.filter(m => m.category === cat.name).length || 0;
        if (count > 0) {
            alert('이 카테고리에 매거진이 있어 삭제할 수 없습니다.');
            return;
        }
        if (confirm('이 카테고리를 삭제하시겠습니까?')) {
            await api.categories.delete(cat.id);
            fetchCategories();
        }
    };

    const handleToggleCategoryActive = async (cat: MagazineCategory) => {
        await api.categories.update(cat.id, { is_active: !cat.isActive });
        fetchCategories();
    };

    const moveCategoryOrder = async (index: number, direction: 'up' | 'down') => {
        if (!magazineCategories) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= magazineCategories.length) return;

        const current = magazineCategories[index];
        const target = magazineCategories[targetIndex];

        await api.categories.update(current.id, { order: target.order });
        await api.categories.update(target.id, { order: current.order });
        fetchCategories();
    };


    return (
        <div className={`min-h-screen font-sans ${isDarkMode ? 'dark' : ''}`}>
            {/* Custom Quill Styles for Sticky Toolbar & Dark Mode */}
            <style>{`
                .quill { display: flex; flex-direction: column; overflow: hidden; }
                .ql-toolbar { flex-shrink: 0; background: white; z-index: 10; }
                .ql-container { flex: 1; overflow: hidden !important; display: flex; flex-direction: column; }
                .ql-editor { flex: 1; overflow-y: auto; }
                
                /* Dark Mode Overrides */
                .dark .ql-toolbar { background: #1e293b; border-color: #334155 !important; }
                .dark .ql-container { border-color: #334155 !important; }
                .dark .ql-stroke { stroke: #94a3b8 !important; }
                .dark .ql-fill { fill: #94a3b8 !important; }
                .dark .ql-picker { color: #94a3b8 !important; }
                .dark .ql-picker-options { background: #1e293b !important; border-color: #334155 !important; }
                .dark .ql-editor { color: #e2e8f0; }
                .dark .ql-editor.ql-blank::before { color: #64748b; }
            `}</style>
            <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
                <AdminSidebar activePage="magazines" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

                <main className="flex-1 ml-64 p-8">
                    <div className="max-w-[1600px] mx-auto space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-4 items-center justify-between">
                            <div className="flex gap-2">
                                <button onClick={() => setActiveTab('magazines')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'magazines' ? 'bg-teal-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>매거진 목록</button>
                                <button onClick={() => setActiveTab('categories')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'categories' ? 'bg-teal-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>카테고리 관리</button>
                            </div>
                        </div>

                        {/* Contents moved from previous file... keeping structure identical */}
                        {activeTab === 'categories' && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">매거진 카테고리</h2>
                                    <button
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setCategoryForm({ name: '', isActive: true });
                                            setIsCategoryModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>
                                        카테고리 추가
                                    </button>
                                </div>
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">순서</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">카테고리명</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">매거진 수</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">상태</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">액션</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {magazineCategories?.map((cat, index) => (
                                            <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => moveCategoryOrder(index, 'up')} disabled={index === 0} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30">
                                                            <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                        </button>
                                                        <button onClick={() => moveCategoryOrder(index, 'down')} disabled={index === magazineCategories.length - 1} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30">
                                                            <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{cat.name}</td>
                                                <td className="px-6 py-4 text-center text-sm text-slate-500">{magazines?.filter(m => m.category === cat.name).length || 0}개</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => handleToggleCategoryActive(cat)}>
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {cat.isActive ? '활성' : '비활성'}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => {
                                                            setEditingCategory({ id: cat.id, name: cat.name, order: cat.order, isActive: cat.isActive });
                                                            setCategoryForm({ name: cat.name, isActive: cat.isActive });
                                                            setIsCategoryModalOpen(true);
                                                        }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'magazines' && (
                            <>
                                {viewMode === 'list' && (
                                    <>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                            <div>
                                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">매거진 관리</h1>
                                                <p className="text-slate-500 dark:text-slate-400 mt-1">전문 에디터로 여행 가이드를 작성하고 관리하세요.</p>
                                            </div>
                                            <button onClick={handleCreateNew} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-teal-500/20 active:scale-95">
                                                <span className="material-symbols-outlined">edit_document</span>
                                                <span>새 매거진 작성</span>
                                            </button>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1 relative">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="제목 검색..."
                                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <select
                                                value={filterCategory}
                                                onChange={(e) => setFilterCategory(e.target.value)}
                                                className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white min-w-[160px]"
                                            >
                                                <option value="all">모든 카테고리</option>
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {filteredMagazines?.length === 0 ? (
                                                <div className="col-span-full py-20 text-center text-slate-400">검색 결과가 없습니다.</div>
                                            ) : (
                                                filteredMagazines?.map((magazine, index) => (
                                                    <div key={magazine.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full group hover:border-teal-500 transition-colors">
                                                        <div className="relative h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 mb-4">
                                                            {magazine.image ? (
                                                                <img src={magazine.image} alt={magazine.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-slate-400">
                                                                    <span className="material-symbols-outlined text-4xl">image</span>
                                                                </div>
                                                            )}
                                                            <div className="absolute top-2 right-2 flex gap-1">
                                                                {magazine.isFeatured && (
                                                                    <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">Featured</span>
                                                                )}
                                                                {!magazine.isActive && (
                                                                    <span className="bg-slate-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">Hidden</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-md">{magazine.category}</span>
                                                        </div>
                                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">{magazine.title}</h3>
                                                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-4 flex-grow">{magazine.description}</p>

                                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                                                            {isReorderable ? (
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => moveMagazine(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30">
                                                                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                                                    </button>
                                                                    <button onClick={() => moveMagazine(index, 'down')} disabled={index === filteredMagazines.length - 1} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30">
                                                                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400">{magazine.createdAt ? new Date(magazine.createdAt).toLocaleDateString() : ''}</span>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleEdit(magazine)} className="p-2 text-slate-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors">
                                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                                </button>
                                                                <button onClick={() => handleDelete(magazine.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}{viewMode === 'edit' && (
                                    <div className="grid grid-cols-12 gap-8 h-[calc(100vh-6rem)]">
                                        <div className="col-span-12 lg:col-span-3 space-y-6 overflow-y-auto pr-2">
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3">기본 설정</h3>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">카테고리</label>
                                                    <select
                                                        value={formData.category}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                    >
                                                        {categories.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">대표 이미지</label>
                                                    <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 flex flex-col items-center justify-center overflow-hidden group hover:border-teal-500 transition-colors cursor-pointer">
                                                        {formData.image ? (
                                                            <>
                                                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFormData(prev => ({ ...prev, image: '' }));
                                                                    }}
                                                                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="text-center p-4">
                                                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">add_photo_alternate</span>
                                                                <p className="text-xs text-slate-500">클릭하여 업로드</p>
                                                            </div>
                                                        )}
                                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">요약 설명</label>
                                                    <textarea
                                                        value={formData.description}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none h-32 text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">태그</label>
                                                    <input
                                                        type="text"
                                                        value={formData.tag}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                    />
                                                </div>

                                                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">발행 상태</span>
                                                        <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))} className="w-4 h-4" />
                                                    </label>
                                                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">인기 게시물</span>
                                                        <input type="checkbox" checked={formData.isFeatured} onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))} className="w-4 h-4" />
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={resetForm} className="px-4 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">작성 취소</button>
                                                <button onClick={handleSubmit} className="px-4 py-3 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/20 active:scale-95 transition-all">{editingMagazine ? '수정 완료' : '발행하기'}</button>
                                            </div>

                                        </div>

                                        <div className="col-span-12 lg:col-span-9 flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                                                <input
                                                    type="text"
                                                    value={formData.title}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                                    className="w-full text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 border-none outline-none bg-transparent"
                                                    placeholder="제목을 입력하세요"
                                                />
                                            </div>
                                            <div className="flex-1 overflow-hidden p-4 flex flex-col bg-slate-50 dark:bg-slate-900">
                                                <ReactQuill
                                                    ref={quillRef}
                                                    theme="snow"
                                                    value={editorContent}
                                                    onChange={setEditorContent}
                                                    modules={modules}
                                                    className="h-full bg-white dark:bg-slate-800 rounded-xl overflow-hidden flex flex-col"
                                                />
                                                <input type="file" ref={sliderInputRef} onChange={handleSliderFiles} multiple accept="image/*" className="hidden" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        {/* Inline Location Block Modal */}
                        {isLocationModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-black/50" onClick={() => setIsLocationModalOpen(false)}></div>
                                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-teal-500">add_location</span>
                                        <h2 className="text-lg font-bold dark:text-white">위치 카드 삽입</h2>
                                        <button
                                            onClick={() => setIsLocationModalOpen(false)}
                                            className="ml-auto w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                    <div className="p-6 overflow-y-auto space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">장소 이름</label>
                                            <input
                                                type="text"
                                                value={locationModalForm.name}
                                                onChange={(e) => setLocationModalForm(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="예: チンギスハーン博物館"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">주소</label>
                                            <textarea
                                                value={locationModalForm.address}
                                                onChange={(e) => setLocationModalForm(prev => ({ ...prev, address: e.target.value }))}
                                                placeholder="Sambuu St, Ulaanbaatar 15141, Mongolia"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none h-16"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">전화</label>
                                                <input
                                                    type="tel"
                                                    value={locationModalForm.phone}
                                                    onChange={(e) => setLocationModalForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+976 xxxx xxxx"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">홈페이지</label>
                                                <input
                                                    type="url"
                                                    value={locationModalForm.website}
                                                    onChange={(e) => setLocationModalForm(prev => ({ ...prev, website: e.target.value }))}
                                                    placeholder="https://..."
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                                                Google 지도 임베드
                                                <span className="text-[10px] text-slate-400 ml-1">— iframe 코드 또는 src URL</span>
                                            </label>
                                            <textarea
                                                value={locationModalForm.mapEmbedUrl}
                                                onChange={(e) => setLocationModalForm(prev => ({ ...prev, mapEmbedUrl: e.target.value }))}
                                                placeholder='Google 지도 → "공유" → "지도 임베드" → HTML 복사'
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none resize-none h-16"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                                                길찾기 검색어
                                                <span className="text-[10px] text-slate-400 ml-1">— 좌표 또는 주소</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={locationModalForm.mapQuery}
                                                onChange={(e) => setLocationModalForm(prev => ({ ...prev, mapQuery: e.target.value }))}
                                                placeholder="47.918,106.917 or place name"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                                                운영시간
                                                <span className="text-[10px] text-slate-400 ml-1">— 요일별 1줄씩</span>
                                            </label>
                                            <textarea
                                                value={locationModalForm.hours}
                                                onChange={(e) => setLocationModalForm(prev => ({ ...prev, hours: e.target.value }))}
                                                placeholder={'月: 09:00 - 17:00\n火: 09:00 - 17:00\n日: 休業'}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none resize-none h-28"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                                        <button
                                            onClick={() => setIsLocationModalOpen(false)}
                                            className="flex-1 px-4 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={insertLocationBlot}
                                            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 shadow-md shadow-teal-500/30 active:scale-95 transition-all"
                                        >
                                            본문에 삽입
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isCategoryModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-black/50" onClick={() => setIsCategoryModalOpen(false)}></div>
                                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                        <h2 className="text-lg font-bold">{editingCategory ? '카테고리 수정' : '카테고리 추가'}</h2>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">카테고리명</label>
                                            <input
                                                type="text"
                                                value={categoryForm.name}
                                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                                placeholder="예: 여행 팁"
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
                                        <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">취소</button>
                                        <button onClick={handleSaveCategory} className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600">저장</button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </main>
                <style>{`
                    .ql-toolbar {
                        border-top-left-radius: 0.75rem;
                        border-top-right-radius: 0.75rem;
                        border-color: #e2e8f0 !important;
                        background-color: white;
                    }
                    .dark .ql-toolbar {
                        border-color: #334155 !important;
                        background-color: #1e293b;
                        color: white !important;
                    }
                     .dark .ql-toolbar .ql-stroke {
                         stroke: #cbd5e1;
                     }
                      .dark .ql-toolbar .ql-fill {
                         fill: #cbd5e1;
                     }
                      .dark .ql-toolbar .ql-picker {
                         color: #cbd5e1;
                     }
                    .ql-container {
                        border-bottom-left-radius: 0.75rem;
                        border-bottom-right-radius: 0.75rem;
                        border-color: #e2e8f0 !important;
                        font-family: inherit;
                        font-size: 1rem;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                     .dark .ql-container {
                        border-color: #334155 !important;
                        color: white;
                     }
                    .ql-editor {
                        padding: 1.5rem;
                        min-height: 300px;


                `}</style>
            </div>
        </div>
    );
};
