import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { DEFAULT_CATEGORIES, type Category } from '../types/category';

export const EstimateComplete: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const estimate = location.state || {};
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await api.categories.list('product');
                if (Array.isArray(data) && data.length > 0) {
                    setCategories(data.filter((c: any) => c.type === 'product' || !c.type).map((c: any) => ({
                        id: c.id,
                        icon: c.icon,
                        name: c.name,
                        description: c.description,
                        isActive: c.is_active,
                        order: c.order
                    })));
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCategories();
    }, []);

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#121716] dark:text-gray-100 min-h-screen">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center px-4 py-4 justify-end sticky top-0 z-10 transition-colors">
                    <button
                        onClick={() => navigate('/')}
                        className="text-[#121716] dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[28px]">close</span>
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col px-6 pt-4 pb-32">
                    {/* Success Animation / Icon */}
                    <div className="flex justify-center mb-6 mt-4">
                        <div className="relative flex items-center justify-center size-24 rounded-full bg-primary/10 dark:bg-primary/20">
                            <span className="material-symbols-outlined text-primary text-[48px] animate-bounce" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check</span>
                            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse"></div>
                        </div>
                    </div>

                    {/* Headlines */}
                    <div className="text-center mb-10">
                        <h1 className="text-[#121716] dark:text-white tracking-tight text-[28px] font-bold leading-tight pb-3">
                            견적 요청이<br />접수되었습니다
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-[16px] font-normal leading-relaxed">
                            담당자가 확인 후 24시간 이내에<br />맞춤 견적을 보내드릴게요.
                        </p>
                    </div>

                    {/* Summary Card (DescriptionList Style) */}
                    <div className="bg-white dark:bg-[#1a2c28] rounded-3xl p-6 shadow-sm mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">요청 내역 요약</h3>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">여행 일정</p>
                            <p className="text-[#121716] dark:text-gray-200 text-sm font-medium">{estimate.period || '날짜 미정'}</p>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">여행 인원</p>
                            <p className="text-[#121716] dark:text-gray-200 text-sm font-medium">{estimate.headcount || '인원 미정'}</p>
                        </div>
                        <div className="flex justify-between items-center pt-3">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">예상 답변 시간</p>
                            <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-primary text-[14px]">schedule</span>
                                <p className="text-primary text-sm font-bold">평균 3시간 이내</p>
                            </div>
                        </div>
                    </div>

                    {/* Engagement Section (Categories) */}
                    <div className="w-full mb-12">
                        <div className="flex justify-between items-end mb-3 px-1">
                            <h3 className="text-lg font-bold text-[#121716] dark:text-white">기다리는 동안 구경하기</h3>
                            <button onClick={() => navigate('/products')} className="text-xs text-gray-400 font-medium cursor-pointer">더보기</button>
                        </div>

                        <div className="flex overflow-x-auto hide-scrollbar px-1 gap-4 py-4 no-scrollbar">
                            {categories.filter(c => c.isActive).map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => navigate(`/products?category=${category.id}`)}
                                    className="flex flex-col items-center gap-2 shrink-0"
                                >
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center transition-all opacity-90 hover:opacity-100 bg-gray-100 dark:bg-zinc-800">
                                        {category.icon.startsWith('data:') ? (
                                            <img
                                                src={category.icon}
                                                alt={category.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-2xl text-gray-500 dark:text-gray-400">
                                                {category.icon}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium text-[#0e1a18] dark:text-white">
                                        {category.name}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Actions (Fixed) */}
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md z-20 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => {
                            // Unified navigation to My Travels (Quotes tab)
                            navigate('/mypage/reservations?tab=quotes');
                        }}
                        className="w-full bg-primary hover:bg-[#189f84] text-white text-[16px] font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mb-3"
                    >
                        내 견적 현황 보기
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-[15px] font-medium py-3 rounded-xl transition-colors"
                    >
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
};
