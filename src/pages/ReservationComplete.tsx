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
                alert('予約情報の読み込みに失敗しました。');
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
                    <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">予約申し込み完了</h2>
                    <div className="size-10"></div>
                </div>

                <div className="flex-1 overflow-y-auto pb-48 px-6">
                    <div className="pt-12 pb-10 text-center">
                        <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-primary text-5xl font-bold">check</span>
                        </div>
                        <h3 className="text-[#0e1a18] dark:text-white text-2xl font-bold mb-3">予約の申し込みが完了しました！</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-relaxed">
                            ご入力いただいたメールアドレスに<br />PayPalの請求書をお送りします。<br />
                            <strong className="text-primary font-bold">お支払い完了をもって予約確定となります。</strong>
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <div className="mb-6">
                            <p className="text-[13px] font-bold text-gray-400 mb-1 uppercase tracking-wider">決済する予約金額</p>
                            <p className="text-3xl font-bold text-[#0e1a18] dark:text-white">{formatPrice(price_breakdown?.deposit)}円</p>
                        </div>
                        <div className="h-px bg-gray-200 dark:bg-zinc-700 w-full mb-6"></div>
                        <div className="flex flex-col gap-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-green-500 text-lg shrink-0 mt-0.5">mark_email_read</span>
                                <p>ご登録のEメール宛に決済用のPayPalご請求メールをお送りします。</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-green-500 text-lg shrink-0 mt-0.5">credit_score</span>
                                <p>メール内のリンクから、クレジットカード等で安全・簡単にお支払いいただけます。</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-orange-500 text-lg shrink-0 mt-0.5">warning</span>
                                <p>お支払いが確認できない場合、自動的にキャンセルとなることがございます。</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-start gap-3 px-2">
                        <span className="material-symbols-outlined text-gray-400 text-xl">info</span>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            決済が完了するとすぐに予約が確定し、ご案内メールが送信されます。ご不明な点がございましたらお問い合わせください。
                        </p>
                    </div>
                </div>

                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-4 pb-10 z-[60] text-center">
                    <button
                        onClick={() => navigate('/mypage/reservations')}
                        className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all mb-4 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">receipt_long</span>
                        予約履歴を確認する
                    </button>
                    <button
                        onClick={() => navigate('/products')}
                        className="text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        トップページへ戻る
                    </button>
                </div>
            </div>
        </div>
    );
};
