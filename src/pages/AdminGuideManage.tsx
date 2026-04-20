import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';

interface Guide {
    id: string;
    name: string;
    image: string;
    introduction: string;
    phone: string;
    languages: string[];
    specialties: string[];
    status: string;
    experienceYears: number;
    createdAt: string;
}

export const AdminGuideManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [guides, setGuides] = useState<Guide[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Omit<Guide, 'id' | 'createdAt' | 'status'>>({
        name: '',
        image: '',
        introduction: '',
        phone: '',
        experienceYears: 0,
        languages: [],
        specialties: []
    });

    const loadGuides = async () => {
        try {
            const data = await api.tourGuides.list();
            if (Array.isArray(data)) {
                setGuides(data.map((g: any) => ({
                    id: g.id,
                    name: g.name,
                    image: g.image || '',
                    introduction: g.bio || g.introduction || '',
                    phone: g.phone || '',
                    experienceYears: g.experience_years || 0,
                    languages: typeof g.languages === 'string' ? JSON.parse(g.languages || '[]') : (g.languages || []),
                    specialties: typeof g.specialties === 'string' ? JSON.parse(g.specialties || '[]') : (g.specialties || []),
                    status: g.status || 'active',
                    createdAt: g.created_at || g.createdAt
                })));
            }
        } catch (error) {
            console.error('Error fetching guides:', error);
        }
    };

    useEffect(() => { loadGuides(); }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const url = await uploadImage(file, 'guides');
                setFormData({ ...formData, image: url });
            } catch (error) {
                console.error('Guide image upload failed:', error);
                alert('이미지 업로드 실패');
            }
        }
    };

    const handleLanguageToggle = (lang: string) => {
        const updated = formData.languages.includes(lang)
            ? formData.languages.filter(l => l !== lang)
            : [...formData.languages, lang];
        setFormData({ ...formData, languages: updated });
    };

    const handleSpecialtyToggle = (specialty: string) => {
        const updated = formData.specialties.includes(specialty)
            ? formData.specialties.filter(s => s !== specialty)
            : [...formData.specialties, specialty];
        setFormData({ ...formData, specialties: updated });
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.phone) {
            alert('이름과 연락처는 필수 입력 항목입니다.');
            return;
        }

        try {
            const payload = {
                name: formData.name,
                bio: formData.introduction,
                phone: formData.phone,
                image: formData.image,
                experience_years: formData.experienceYears,
                languages: formData.languages,
                specialties: formData.specialties,
            };

            if (editingGuide) {
                await api.tourGuides.update(editingGuide.id, payload);
            } else {
                await api.tourGuides.create({ ...payload, status: 'active' });
            }

            await loadGuides();
            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            console.error('Guide save error:', error);
            alert('저장 실패: ' + error.message);
        }
    };

    const handleApprove = async (guide: Guide) => {
        try {
            await api.tourGuides.update(guide.id, {
                name: guide.name,
                bio: guide.introduction,
                phone: guide.phone,
                image: guide.image,
                experience_years: guide.experienceYears,
                languages: guide.languages,
                specialties: guide.specialties,
                status: 'active',
            });
            await loadGuides();
        } catch (error: any) {
            alert('승인 실패: ' + error.message);
        }
    };

    const handleEdit = (guide: Guide) => {
        setEditingGuide(guide);
        setFormData({
            name: guide.name,
            image: guide.image,
            introduction: guide.introduction,
            phone: guide.phone,
            experienceYears: guide.experienceYears,
            languages: guide.languages,
            specialties: guide.specialties
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('정말 삭제하시겠습니까?')) {
            try {
                await api.tourGuides.delete(id);
                await loadGuides();
            } catch (error: any) {
                alert('삭제 실패: ' + error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            image: '',
            introduction: '',
            phone: '',
            experienceYears: 0,
            languages: [],
            specialties: []
        });
        setEditingGuide(null);
    };

    const filteredGuides = guides.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCount = guides.filter(g => g.status === 'pending').length;

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    const availableLanguages = ['한국어', '영어', '몽골어', '중국어', '일본어'];
    const availableSpecialties = ['고비사막', '홉스골', '테를지', '승마', '문화체험', '사진촬영'];

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            <AdminSidebar activePage="guides" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">가이드 관리</h1>
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full">
                                승인대기 {pendingCount}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        가이드 등록
                    </button>
                </header>

                {/* Search */}
                <div className="p-8">
                    <div className="mb-6">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="가이드 이름 검색..."
                            className="w-full max-w-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {/* Guide List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGuides.map(guide => (
                            <div key={guide.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                <div className="aspect-square bg-slate-100 dark:bg-slate-700 relative">
                                    {guide.image ? (
                                        <img src={guide.image} alt={guide.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-6xl text-slate-400">person</span>
                                        </div>
                                    )}
                                    {guide.status === 'pending' && (
                                        <div className="absolute top-2 left-2">
                                            <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-md">승인대기</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{guide.name}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{guide.introduction || '소개글이 없습니다.'}</p>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="material-symbols-outlined text-slate-400 text-lg">phone</span>
                                            <span className="text-slate-700 dark:text-slate-300">{guide.phone}</span>
                                        </div>
                                        {guide.experienceYears > 0 && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="material-symbols-outlined text-slate-400 text-lg">workspace_premium</span>
                                                <span className="text-slate-700 dark:text-slate-300">경력 {guide.experienceYears}년</span>
                                            </div>
                                        )}
                                    </div>

                                    {guide.languages.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {guide.languages.map(lang => (
                                                <span key={lang} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                                                    {lang}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {guide.status === 'pending' && (
                                        <button
                                            onClick={() => handleApprove(guide)}
                                            className="w-full mb-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors"
                                        >
                                            승인하기
                                        </button>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(guide)}
                                            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => handleDelete(guide.id)}
                                            className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredGuides.length === 0 && (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">person_off</span>
                            <p className="text-slate-500 dark:text-slate-400">등록된 가이드가 없습니다</p>
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
                                {editingGuide ? '가이드 수정' : '가이드 등록'}
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
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">프로필 사진</label>
                                <div className="flex items-center gap-4">
                                    {formData.image ? (
                                        <img src={formData.image} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="text-sm"
                                    />
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">이름 *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="가이드 이름"
                                />
                            </div>

                            {/* Introduction */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">소개글</label>
                                <textarea
                                    value={formData.introduction}
                                    onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="가이드 경력, 전문 분야 등을 입력하세요"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">연락처 *</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="010-0000-0000"
                                />
                            </div>

                            {/* Experience Years */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">경력 연수</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={formData.experienceYears}
                                        onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                                        className="w-28 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">년</span>
                                </div>
                            </div>

                            {/* Languages */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">언어</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableLanguages.map(lang => (
                                        <button
                                            key={lang}
                                            type="button"
                                            onClick={() => handleLanguageToggle(lang)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.languages.includes(lang)
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Specialties */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">전문 분야</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableSpecialties.map(specialty => (
                                        <button
                                            key={specialty}
                                            type="button"
                                            onClick={() => handleSpecialtyToggle(specialty)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.specialties.includes(specialty)
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                        >
                                            {specialty}
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
                                    {editingGuide ? '수정' : '등록'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};