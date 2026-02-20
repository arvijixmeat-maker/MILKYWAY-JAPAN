import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { supabase } from '../lib/supabaseClient';

export const MyBusinessEstimates: React.FC = () => {
    const navigate = useNavigate();
    const [estimates, setEstimates] = useState<any[]>([]);

    useEffect(() => {
        const fetchEstimates = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Or show login prompt

            // Fetch business quotes from Supabase
            const { data } = await supabase
                .from('quotes')
                .select('*')
                .eq('user_id', user.id)
                .eq('type', 'business')
                .order('created_at', { ascending: false });

            if (data) {
                const mappedEstimates = data.map(item => ({
                    id: item.id,
                    status: item.status === 'new' ? 'processing' : item.status, // 'new' -> 'processing' default for business view? Or just 'waiting'
                    statusLabel: item.status === 'new' ? '접수 완료' : item.status === 'completed' ? '답변 완료' : item.status === 'converted' ? '예약 전환' : '처리 중',
                    date: new Date(item.created_at).toLocaleDateString(),
                    title: `몽골 비즈니스 견적 요청 (${item.name})`,
                    type: `기업 행사 (${item.headcount})`,
                    schedule: item.period,
                    contact: {
                        name: item.name,
                        phone: item.phone,
                        email: item.email
                    },
                    headcount: item.headcount,
                    description: item.additional_request,
                    travelTypes: item.travel_types || [],
                    attachment: null // Pending bucket implementation
                }));
                setEstimates(mappedEstimates);
            }
        };

        fetchEstimates();
    }, []);

    return (
        <div className="bg-gray-50 dark:bg-zinc-900 font-display antialiased min-h-screen flex justify-center w-full">
            <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-gray-50 dark:bg-zinc-900 shadow-xl overflow-x-hidden pb-[100px]">
                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-gray-50/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 py-4 transition-colors border-b border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-text-main dark:text-white hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-text-main dark:text-white flex-1 text-center pr-8">기업 견적 요청 내역</h1>
                </div>

                {/* Content */}
                <div className="px-5 pt-4 flex flex-col gap-4">
                    {estimates.map((estimate) => (
                        <div
                            key={estimate.id}
                            onClick={() => navigate('/estimate-complete', { state: estimate })}
                            className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer border border-transparent dark:border-gray-800 hover:shadow-md"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-[17px] font-bold text-text-main dark:text-white leading-snug line-clamp-2 pr-8">
                                    {estimate.title}
                                </h3>
                                <button
                                    className="text-gray-300 hover:text-text-main dark:hover:text-white p-1 -mr-2 -mt-1 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                </button>
                            </div>
                            <div className="flex flex-col gap-1 mb-4">
                                <div className="flex items-center gap-1.5 text-text-sub text-sm">
                                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                    <span>{estimate.schedule}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-text-sub text-sm">
                                    <span className="material-symbols-outlined text-[16px]">groups</span>
                                    <span>{estimate.type}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                <span className={`text-xs font-medium flex items-center gap-1 ${estimate.status === 'converted' ? 'text-indigo-500' :
                                    estimate.status === 'completed' ? 'text-primary' :
                                        estimate.status === 'processing' ? 'text-primary' :
                                            'text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {estimate.status === 'converted' ? (
                                        <>
                                            <span className="material-symbols-outlined text-[14px]">event_available</span>
                                            예약 확정됨
                                        </>
                                    ) : estimate.status === 'completed' ? (
                                        <>
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            견적서 확인 가능
                                        </>
                                    ) : estimate.status === 'processing' ? (
                                        <>
                                            <span className="material-symbols-outlined text-[14px]">mark_email_read</span>
                                            담당자 확인 중
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                            접수 완료
                                        </>
                                    )}
                                </span>
                                <span className="text-xs text-gray-400">{estimate.date}</span>
                            </div>
                        </div>
                    ))}

                    {estimates.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">folder_open</span>
                            <p className="text-sm">요청한 기업 견적 내역이 없습니다.</p>
                        </div>
                    )}
                </div>

                <BottomNav />
            </div>
        </div>
    );
};
