import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadImage } from '../utils/upload';
import { AdminSidebar } from '../components/admin/AdminSidebar';

export const AdminReviewManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [reviews, setReviews] = useState<any[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        author: '',
        writtenDate: '', // 작성일 (원래 후기가 작성된 날짜)
        visitDate: '',
        productName: '',
        title: '', // 제목
        rating: 5,
        content: '',
        images: [] as string[]
    });

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    // Fetch reviews from Supabase
    const fetchReviews = async () => {
        const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (data) {
            setReviews(data.map((r: any) => ({
                id: r.id,
                author: r.author_name,
                date: r.created_at ? r.created_at.substring(0, 10) : '',
                visitDate: r.visit_date,
                rating: r.rating,
                product_name: r.product_name,
                content: r.content,
                images: r.images
            })));
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('정말 이 후기를 삭제하시겠습니까?')) {
            try {
                await supabase.from('reviews').delete().eq('id', id);
                setReviews(reviews.filter(r => r.id !== id));
            } catch (error) {
                console.error('Failed to delete review:', error);
                alert('삭제에 실패했습니다.');
            }
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const maxImages = 5;
        const remainingSlots = maxImages - formData.images.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        try {
            const uploadPromises = filesToProcess.map(file => uploadImage(file, 'reviews'));
            const urls = await Promise.all(uploadPromises);
            setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
        } catch (error) {
            console.error('Review image upload failed:', error);
            alert('이미지 업로드 실패');
        }
        event.target.value = '';
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (!formData.author || !formData.content) {
            alert('작성자와 내용은 필수입니다.');
            return;
        }

        try {
            const { error } = await supabase.from('reviews').insert({
                author_name: formData.author,
                visit_date: formData.visitDate,
                product_name: formData.productName,
                title: formData.title,
                rating: formData.rating,
                content: formData.content,
                images: formData.images,
                created_at: formData.writtenDate ? new Date(formData.writtenDate).toISOString() : new Date().toISOString()
            });

            if (error) throw error;

            alert('리뷰가 등록되었습니다.');
            setIsModalOpen(false);
            setFormData({
                author: '',
                writtenDate: '',
                visitDate: '',
                productName: '',
                title: '',
                rating: 5,
                content: '',
                images: []
            });
            fetchReviews(); // Refresh list
        } catch (error: any) {
            console.error('Error adding review:', error);
            alert('등록 실패: ' + error.message);
        }
    };

    const filteredReviews = reviews.filter(review =>
        review.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (review.product_name && review.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            {/* Sidebar */}
            <AdminSidebar
                activePage="reviews"
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">후기 관리</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        새 후기 등록
                    </button>
                </header>

                <div className="p-8">
                    {/* Search & Actions */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input
                                    type="text"
                                    placeholder="작성자, 내용, 상품명 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Review List Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">작성일</th>
                                        <th className="px-6 py-3">방문시기</th>
                                        <th className="px-6 py-3">작성자</th>
                                        <th className="px-6 py-3">상품명</th>
                                        <th className="px-6 py-3">평점</th>
                                        <th className="px-6 py-3">내용</th>
                                        <th className="px-6 py-3 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                    {filteredReviews?.map((review) => (
                                        <tr key={review.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{review.date}</td>
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{review.visitDate || '-'}</td>
                                            <td className="px-6 py-4 font-bold">{review.author}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {review.product_name ? (
                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                                                        {review.product_name}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex text-yellow-400 text-base">
                                                    {[...Array(5)].map((_, i) => (
                                                        <span
                                                            key={i}
                                                            className={`material-symbols-outlined text-[16px] ${i < review.rating ? 'fill-current' : 'text-slate-200 dark:text-slate-700'}`}
                                                            style={{ fontVariationSettings: i < review.rating ? "'FILL' 1" : "'FILL' 0" }}
                                                        >
                                                            star
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="line-clamp-2 max-w-md text-slate-600 dark:text-slate-400">
                                                    {review.content}
                                                </p>
                                                {review.images && review.images.length > 0 && (
                                                    <div className="flex gap-1 mt-1">
                                                        <span className="material-symbols-outlined text-xs text-slate-400">image</span>
                                                        <span className="text-xs text-slate-400">사진 {review.images.length}장</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(review.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="삭제"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredReviews?.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                                                검색 결과가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Manual Register Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <h2 className="text-xl font-bold mb-4 dark:text-white">수동 리뷰 등록</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">작성자 명</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        placeholder="예: 김철수"
                                        value={formData.author}
                                        onChange={e => setFormData({ ...formData, author: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">작성일 (원래 후기가 작성된 날짜)</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        value={formData.writtenDate}
                                        onChange={e => setFormData({ ...formData, writtenDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">방문 시기</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        placeholder="예: 2024년 1월"
                                        value={formData.visitDate}
                                        onChange={e => setFormData({ ...formData, visitDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">상품명</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        placeholder="예: 고비사막 투어"
                                        value={formData.productName}
                                        onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">제목</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        placeholder="예: 잊을 수 없는 최고의 여행!"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">평점: {formData.rating}점</label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => setFormData({ ...formData, rating: star })}
                                                className={`material-symbols-outlined text-2xl ${star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                                style={{ fontVariationSettings: star <= formData.rating ? "'FILL' 1" : "'FILL' 0" }}
                                            >star</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">내용</label>
                                    <textarea
                                        className="w-full p-2 border rounded-lg h-32 resize-none dark:bg-slate-800 dark:border-slate-700"
                                        placeholder="내용을 입력하세요..."
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">사진 (최대 5장)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-slate-800 dark:file:text-slate-300"
                                    />
                                    <div className="flex gap-2 mt-2 overflow-x-auto">
                                        {formData.images.map((img, idx) => (
                                            <div key={idx} className="relative size-16 shrink-0">
                                                <img src={img} className="w-full h-full object-cover rounded" alt="upload" />
                                                <button onClick={() => removeImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 transform translate-x-1/3 -translate-y-1/3 shadow-sm">
                                                    <span className="material-symbols-outlined text-[12px] block">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 hover:bg-slate-100 rounded-lg text-slate-600 font-medium transition-colors dark:hover:bg-slate-800 dark:text-slate-400"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold transition-colors"
                                >
                                    등록하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
