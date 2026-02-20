import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { supabase } from '../lib/supabaseClient';
import { uploadImage } from '../utils/upload';

interface Accommodation {
    id: string;
    name: string;
    images: string[];
    description: string;
    type: string; // Changed from union to string to support subtypes
    location: string;
    facilities: string[];
    createdAt: string;
}

export const AdminAccommodationManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Omit<Accommodation, 'id' | 'createdAt'>>({
        name: '',
        images: [],
        description: '',
        type: '3성급 호텔',
        location: '',
        facilities: []
    });

    // Load accommodations from Supabase
    useEffect(() => {
        const fetchAccommodations = async () => {
            const { data } = await supabase.from('accommodations').select('*').order('created_at', { ascending: false });
            if (data) {
                setAccommodations(data.map((a: any) => ({
                    id: a.id,
                    name: a.name,
                    images: a.images || [],
                    description: a.description,
                    type: a.type,
                    location: a.location,
                    facilities: a.facilities || [],
                    createdAt: a.created_at
                })));
            }
        };
        fetchAccommodations();
    }, []);

    // Save accommodations to Supabase
    const saveAccommodations = async (updated: Accommodation[]) => {
        try {
            // Delete all and re-insert
            await supabase.from('accommodations').delete().neq('id', '');
            const inserts = updated.map(a => ({
                id: a.id,
                name: a.name,
                images: a.images,
                description: a.description,
                type: a.type,
                location: a.location,
                facilities: a.facilities,
                created_at: a.createdAt
            }));
            if (inserts.length > 0) {
                await supabase.from('accommodations').insert(inserts);
            }
            setAccommodations(updated);
            return true;
        } catch (e) {
            console.error('Failed to save accommodations', e);
            alert('저장에 실패했습니다.');
            return false;
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            try {
                const uploadPromises = Array.from(files).map(file => uploadImage(file, 'accommodations'));
                const urls = await Promise.all(uploadPromises);
                setFormData({ ...formData, images: [...formData.images, ...urls] });
            } catch (error) {
                console.error('Accommodation image upload failed:', error);
                alert('이미지 업로드 실패');
            }
        }
    };

    const removeImage = (index: number) => {
        setFormData({
            ...formData,
            images: formData.images.filter((_, i) => i !== index)
        });
    };

    const handleFacilityToggle = (facility: string) => {
        const updated = formData.facilities.includes(facility)
            ? formData.facilities.filter(f => f !== facility)
            : [...formData.facilities, facility];
        setFormData({ ...formData, facilities: updated });
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.location) {
            alert('숙소명과 위치는 필수 입력 항목입니다.');
            return;
        }

        if (editingAccommodation) {
            // Update existing accommodation
            const updated = accommodations.map(a =>
                a.id === editingAccommodation.id ? { ...formData, id: a.id, createdAt: a.createdAt } : a
            );
            if (await saveAccommodations(updated)) {
                setIsModalOpen(false);
                resetForm();
            }
        } else {
            // Create new accommodation
            const newAccommodation: Accommodation = {
                ...formData,
                id: `ACCOM-${Date.now()}`,
                createdAt: new Date().toISOString()
            };
            if (await saveAccommodations([...accommodations, newAccommodation])) {
                setIsModalOpen(false);
                resetForm();
            }
        }
    };

    const handleEdit = (accommodation: Accommodation) => {
        setEditingAccommodation(accommodation);
        setFormData({
            name: accommodation.name,
            images: accommodation.images,
            description: accommodation.description,
            type: accommodation.type,
            location: accommodation.location,
            facilities: accommodation.facilities
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('정말 삭제하시겠습니까?')) {
            saveAccommodations(accommodations.filter(a => a.id !== id));
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            images: [],
            description: '',
            type: '3성급 호텔',
            location: '',
            facilities: []
        });
        setEditingAccommodation(null);
    };

    const filteredAccommodations = accommodations.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    const availableFacilities = ['Wi-Fi', '조식 포함', '주차장', '에어컨', '난방', '온수', '세탁 서비스', '픽업 서비스'];

    const accommodationTypes = {
        '호텔': ['2성급 호텔', '3성급 호텔', '4성급 호텔', '5성급 호텔'],
        '게르': ['일반 게르', '고급 게르', '럭셔리 게르'],
        '게스트하우스': ['게스트하우스']
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            <AdminSidebar activePage="accommodations" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">숙소 관리</h1>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        숙소 등록
                    </button>
                </header>

                {/* Search */}
                <div className="p-8">
                    <div className="mb-6">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="숙소 이름 검색..."
                            className="w-full max-w-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {/* Accommodation List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAccommodations.map(accommodation => (
                            <div key={accommodation.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                <div className="aspect-video bg-slate-100 dark:bg-slate-700 relative">
                                    {accommodation.images.length > 0 ? (
                                        <img src={accommodation.images[0]} alt={accommodation.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-6xl text-slate-400">hotel</span>
                                        </div>
                                    )}
                                    {accommodation.images.length > 1 && (
                                        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs">
                                            +{accommodation.images.length - 1}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{accommodation.name}</h3>
                                        <span className="px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs rounded-md">
                                            {accommodation.type}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                                        <span className="material-symbols-outlined text-lg">location_on</span>
                                        <span>{accommodation.location}</span>
                                    </div>

                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                                        {accommodation.description || '설명이 없습니다.'}
                                    </p>

                                    {accommodation.facilities.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {accommodation.facilities.slice(0, 3).map(facility => (
                                                <span key={facility} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-md">
                                                    {facility}
                                                </span>
                                            ))}
                                            {accommodation.facilities.length > 3 && (
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-md">
                                                    +{accommodation.facilities.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(accommodation)}
                                            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => handleDelete(accommodation.id)}
                                            className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredAccommodations.length === 0 && (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">hotel</span>
                            <p className="text-slate-500 dark:text-slate-400">등록된 숙소가 없습니다</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingAccommodation ? '숙소 수정' : '숙소 등록'}
                            </h2>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    resetForm();
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Images Upload */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">숙소 이미지</label>
                                <div className="space-y-3">
                                    {formData.images.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {formData.images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-video">
                                                    <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                                                    <button
                                                        onClick={() => removeImage(idx)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="text-sm"
                                    />
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">숙소명 *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="숙소 이름"
                                />
                            </div>


                            {/* Type */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">숙소 타입</label>
                                <div className="space-y-3">
                                    {Object.entries(accommodationTypes).map(([category, subtypes]) => (
                                        <div key={category}>
                                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">{category}</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {subtypes.map(subtype => (
                                                    <button
                                                        key={subtype}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, type: subtype })}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === subtype
                                                            ? 'bg-teal-500 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                            }`}
                                                    >
                                                        {subtype}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">위치 *</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="예: 울란바토르 시내, 테를지 국립공원"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">숙소 설명</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="숙소에 대한 설명을 입력하세요"
                                />
                            </div>

                            {/* Facilities */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">시설</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableFacilities.map(facility => (
                                        <button
                                            key={facility}
                                            type="button"
                                            onClick={() => handleFacilityToggle(facility)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${formData.facilities.includes(facility)
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                        >
                                            {facility}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold transition-colors"
                                >
                                    {editingAccommodation ? '수정' : '등록'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
