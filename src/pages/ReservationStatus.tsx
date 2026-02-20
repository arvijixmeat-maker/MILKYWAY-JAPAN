import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const ReservationStatus: React.FC = () => {
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText("110-123-456789");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="max-w-[430px] mx-auto bg-white dark:bg-zinc-900 min-h-screen flex flex-col relative overflow-x-hidden shadow-2xl">

                {/* Toast Notification */}
                <div
                    className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-max px-5 py-3.5 bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md rounded-2xl flex items-center gap-2.5 shadow-xl border border-white/10 dark:border-black/5 transition-opacity duration-300 ${showToast ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                >
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <p className="text-white dark:text-zinc-900 text-sm font-medium tracking-tight">계좌번호가 복사되었습니다</p>
                </div>

                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-4 justify-between">
                    <div className="size-10"></div>
                    <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center"></h2>
                    <button
                        onClick={() => navigate('/')}
                        className="text-[#0e1a18] dark:text-white flex size-10 shrink-0 items-center justify-end cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-40">
                    <div className="mt-4 mb-10">
                        {/* Stepper */}
                        <div className="relative flex justify-between items-start max-w-[280px] mx-auto">
                            <div className="absolute top-[12px] left-0 right-0 h-[2px] bg-gray-200 dark:bg-zinc-800 z-0"></div>
                            <div className="absolute top-[12px] left-0 w-1/2 h-[2px] bg-primary z-0"></div>

                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className="size-6 rounded-full bg-primary flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-sm">
                                    <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>
                                </div>
                                <span className="text-[11px] font-bold text-gray-400">신청 완료</span>
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className="size-6 rounded-full bg-primary flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-sm">
                                    <div className="size-2 bg-white rounded-full"></div>
                                </div>
                                <span className="text-[11px] font-bold text-primary">입금 대기</span>
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className="size-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center border-4 border-white dark:border-zinc-900">
                                </div>
                                <span className="text-[11px] font-bold text-gray-400">예약 확정</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h1 className="text-[#0e1a18] dark:text-white text-2xl font-bold mb-3">입금을 기다리고 있어요</h1>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            아래 계좌로 예약금을 입금하시면<br />
                            예약이 최종 확정됩니다.
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6 mb-8 flex flex-col items-center border border-gray-100 dark:border-zinc-800">
                        <span className="text-[13px] font-semibold text-gray-400 mb-1">입금하실 금액</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-[#0e1a18] dark:text-white">600,000</span>
                            <span className="text-xl font-bold text-[#0e1a18] dark:text-white">원</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">입금 계좌</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-[#0e1a18] dark:text-white">신한은행</span>
                                    <span className="text-lg font-bold text-[#0e1a18] dark:text-white tracking-tight">110-123-456789</span>
                                </div>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 bg-primary/5 hover:bg-primary/10 rounded-xl text-xs font-bold text-primary transition-all flex items-center gap-1.5 active:scale-95 border border-primary/10"
                            >
                                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                복사
                            </button>
                        </div>
                        <div className="h-px bg-gray-50 dark:bg-zinc-700"></div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">예금주</span>
                            <p className="text-base font-bold text-[#0e1a18] dark:text-white">(주)몽골리아 은하수</p>
                        </div>
                    </div>

                    <div className="mt-8 p-5 bg-orange-50/50 dark:bg-orange-500/5 rounded-2xl border border-orange-100/50 dark:border-orange-500/10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-orange-500 text-[20px]">error</span>
                            <p className="text-[14px] font-bold text-orange-600 dark:text-orange-400">입금 전 꼭 확인하세요</p>
                        </div>
                        <ul className="space-y-2.5">
                            <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                <span className="text-orange-400 mt-0.5">•</span>
                                <span>입금자명은 반드시 <span className="text-[#0e1a18] dark:text-white font-bold">예약자 성함</span>과 동일해야 합니다.</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                <span className="text-orange-400 mt-0.5">•</span>
                                <span>24시간 이내 미입금 시 예약이 자동 취소됩니다.</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                <span className="text-orange-400 mt-0.5">•</span>
                                <span>입금 확인 후 확정 알림이 발송됩니다.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 p-4 pb-10 z-[60]">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                    >
                        홈으로 이동
                        <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">home</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
