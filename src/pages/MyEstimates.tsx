import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/layout/BottomNav';
import { supabase } from '../lib/supabaseClient';

export const MyEstimates: React.FC = () => {
    const navigate = useNavigate();

    const [estimates, setEstimates] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchEstimates = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('quotes')
                .select('*')
                .eq('user_id', user.id)
                .in('type', ['personal', 'custom']) // Fetch personal/custom quotes
                .order('created_at', { ascending: false });

            if (data) {
                setEstimates(data.map((e: any) => ({
                    id: e.id,
                    status: e.status === 'new' ? 'waiting' : e.status, // 'new' -> 'waiting' for user view
                    statusLabel: e.status === 'new' ? '답변 대기' : e.status === 'answered' ? '답변 완료' : e.status === 'converted' ? '예약 전환' : '상담 중',
                    title: `맞춤 견적 요청 (${e.destination || '몽골'})`,
                    date: e.period,
                    type: '맞춤여행', // Display text
                    people: e.headcount,
                    requestDate: new Date(e.created_at).toLocaleDateString('ko-KR')
                })));
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
                    <h1 className="text-lg font-bold text-text-main dark:text-white flex-1 text-center pr-8">투어 견적 요청 내역</h1>
                </div>

                {/* Content */}
                <div className="px-5 pt-4 flex flex-col gap-4">
                    {estimates.map((estimate) => (
                        <div
                            key={estimate.id}
                            onClick={() => navigate(`/estimate/${estimate.id}`)}
                            className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer border border-transparent dark:border-gray-800"
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
                                    <span>{estimate.date}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-text-sub text-sm">
                                    <span className="material-symbols-outlined text-[16px]">diversity_3</span>
                                    <span>{estimate.type} · {estimate.people}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                <span className={`text-xs font-medium flex items-center gap-1 ${estimate.status === 'converted' ? 'text-indigo-500' :
                                    estimate.status === 'answered' ? 'text-primary' :
                                        estimate.status === 'processing' ? 'text-primary' :
                                            'text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {estimate.status === 'converted' ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate('/mypage/reservations');
                                            }}
                                            className="flex items-center gap-1 hover:underline"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">event_available</span>
                                            예약 확정됨 (내역 확인)
                                        </button>
                                    ) : estimate.status === 'answered' ? (
                                        <>
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            견적서 확인하기
                                        </>
                                    ) : estimate.status === 'processing' ? (
                                        <>
                                            <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                                            상담 중
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                                            답변 대기
                                        </>
                                    )}
                                </span>
                                <span className="text-xs text-gray-400">{estimate.requestDate}</span>
                            </div>
                        </div>
                    ))}

                    <div className="py-6 text-center">
                        <p className="text-xs text-gray-400">최근 1년 간 요청한 견적 내역이 표시됩니다.</p>
                    </div>
                </div>

                <BottomNav />
            </div>
        </div>
    );
};
