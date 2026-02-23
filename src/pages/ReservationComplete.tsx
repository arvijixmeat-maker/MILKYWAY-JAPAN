import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';

export const ReservationComplete: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showToast, setShowToast] = useState(false);
    const [reservation, setReservation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bankAccount, setBankAccount] = useState<any>(null);

    const reservationId = location.state?.reservationId;

    useEffect(() => {
        if (!reservationId) {
            navigate('/', { replace: true });
            return;
        }

        const fetchReservation = async () => {
            try {
                const data = await api.reservations.get(reservationId);
                setReservation(data);

                // Handle Bank Account Logic here immediately
                if (data.bank_account?.bankName) {
                    setBankAccount(data.bank_account);
                } else {
                    // Fallback
                    const settingData = await api.settings.get('bank_account');

                    if (settingData?.value) {
                        setBankAccount(settingData.value);
                    }
                }
            } catch (error) {
                console.error('Error fetching reservation:', error);
                alert('예약 정보를 불러오는데 실패했습니다.');
                navigate('/', { replace: true });
            } finally {
                setLoading(false);
            }
        };

        fetchReservation();
    }, [reservationId, navigate]);

    const handleCopy = () => {
        if (bankAccount?.accountNumber) {
            navigator.clipboard.writeText(bankAccount.accountNumber);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2500);
        }
    };

    const formatPrice = (price: number) => price ? price.toLocaleString() : '0';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!reservation) return null;

    const { price_breakdown } = reservation;

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display">
            <div className="max-w-[430px] mx-auto bg-white dark:bg-zinc-900 min-h-screen flex flex-col relative overflow-x-hidden shadow-2xl">

                {/* Toast Notification */}
                <div
                    className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-max px-5 py-3.5 bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md rounded-2xl flex items-center gap-2.5 shadow-xl border border-white/10 dark:border-black/5 transition-opacity duration-300 ${showToast ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                >
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <p className="text-white dark:text-zinc-900 text-sm font-medium tracking-tight">계좌번호가 복사되었습니다</p>
                </div>

                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-4 justify-between border-b border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={() => navigate('/')}
                        className="text-[#0e1a18] dark:text-white flex size-10 shrink-0 items-center justify-start cursor-pointer"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">예약 신청 완료</h2>
                    <div className="size-10"></div>
                </div>

                <div className="flex-1 overflow-y-auto pb-48 px-6">
                    <div className="pt-12 pb-10 text-center">
                        <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-primary text-5xl font-bold">check</span>
                        </div>
                        <h3 className="text-[#0e1a18] dark:text-white text-2xl font-bold mb-3">예약 신청이 접수되었습니다!</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">입금을 완료하시면 예약이 확정됩니다</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800">
                        <div className="mb-6">
                            <p className="text-[13px] font-bold text-gray-400 mb-1 uppercase tracking-wider">입금하실 금액</p>
                            <p className="text-3xl font-bold text-[#0e1a18] dark:text-white">{formatPrice(price_breakdown?.deposit)}円</p>
                        </div>
                        <div className="h-px bg-gray-200 dark:bg-zinc-700 w-full mb-6"></div>
                        <div className="space-y-5">
                            <div>
                                <p className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">입금 계좌</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[#0e1a18] dark:text-white">{bankAccount?.bankName || '정보 없음'}</span>
                                        <span className="text-lg font-bold text-[#0e1a18] dark:text-white tracking-tight">{bankAccount?.accountNumber || ''}</span>
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className="px-4 py-2 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-xl text-xs font-bold text-[#0e1a18] dark:text-white shadow-sm active:scale-95 transition-all"
                                    >
                                        복사
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-gray-400 mb-1 uppercase tracking-wider">예금주</p>
                                <p className="text-sm font-bold text-[#0e1a18] dark:text-white">{bankAccount?.accountHolder || ''}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-start gap-3 px-2">
                        <span className="material-symbols-outlined text-gray-400 text-xl">info</span>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            예약 신청 시간으로부터 24시간 이내에 입금이 확인되지 않을 경우 예약이 자동으로 취소될 수 있습니다. 입금 확인 후 알림톡을 보내드립니다.
                        </p>
                    </div>
                </div>

                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-4 pb-10 z-[60] text-center">
                    <button
                        onClick={() => navigate('/mypage/reservations')}
                        className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all mb-4"
                    >
                        입금 후 확인 요청하기
                    </button>
                    <button
                        onClick={() => navigate('/mypage/reservations')}
                        className="text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        예약 내역 확인
                    </button>
                </div>
            </div>
        </div>
    );
};
