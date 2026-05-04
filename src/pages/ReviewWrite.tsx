import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';

// Review text constraints — keep in sync with any backend validation.
const REVIEW_MIN_LENGTH = 10;
const REVIEW_MAX_LENGTH = 2000;

type Mode = 'reservation' | 'free';

interface ReservationLite {
    id: string;
    productId?: string;
    productName: string;
    startDate: string;
    endDate: string;
}

interface ProductLite {
    id: string;
    name: string;
    thumbnail?: string;
}

const STAR_FILL = '#facc15';
const STAR_EMPTY = '#e5e7eb';

// Build YYYY-MM options for the last 24 months (most-recent first) for the visit-month picker.
const buildVisitMonthOptions = (): { value: string; label: string }[] => {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
        out.push({ value, label });
    }
    return out;
};

export const ReviewWrite: React.FC = () => {
    const navigate = useNavigate();

    const [mode, setMode] = useState<Mode>('reservation');
    const [selectedReservationId, setSelectedReservationId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [visitMonth, setVisitMonth] = useState<string>('');
    const [rating, setRating] = useState<number>(4);
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [completedReservations, setCompletedReservations] = useState<ReservationLite[]>([]);
    const [allProducts, setAllProducts] = useState<ProductLite[]>([]);

    const visitMonthOptions = useMemo(buildVisitMonthOptions, []);

    useEffect(() => {
        // Fetch user's completed reservations
        const fetchReservations = async () => {
            try {
                const meResponse = await api.auth.me();
                const me = meResponse?.user;
                if (!me) return;

                const data = await api.reservations.list();
                if (!Array.isArray(data)) return;

                const myCompleted = data.filter((r: any) => r.user_id === me.id && r.status === 'completed');
                myCompleted.sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

                const mapped: ReservationLite[] = myCompleted.map((r: any) => ({
                    id: r.id,
                    productId: r.product_id,
                    productName: r.product_name,
                    startDate: r.start_date,
                    endDate: r.end_date,
                }));
                setCompletedReservations(mapped);

                // If the user has no completed reservations, default to "free" mode so they
                // can still write a review (off-platform / Instagram / custom-quote travelers).
                if (mapped.length === 0) {
                    setMode('free');
                }
            } catch (error) {
                console.error('Failed to fetch reservations:', error);
            }
        };

        // Fetch active products (used by free-mode product picker)
        const fetchProducts = async () => {
            try {
                const data = await api.products.list();
                if (!Array.isArray(data)) return;
                const mapped: ProductLite[] = data
                    .filter((p: any) => p.status === 'active')
                    .map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        thumbnail: p.thumbnail || (Array.isArray(p.mainImages) && p.mainImages[0]) || (Array.isArray(p.main_images) && p.main_images[0]),
                    }));
                setAllProducts(mapped);
            } catch (error) {
                console.error('Failed to fetch products:', error);
            }
        };

        fetchReservations();
        fetchProducts();
    }, []);

    const selectedReservation = completedReservations.find(r => r.id === selectedReservationId);
    const selectedProduct = allProducts.find(p => p.id === selectedProductId);

    const canSubmit = useMemo(() => {
        if (submitting) return false;
        if (content.trim().length < REVIEW_MIN_LENGTH) return false;
        if (mode === 'reservation') return !!selectedReservationId;
        if (mode === 'free') return !!selectedProductId && !!visitMonth;
        return false;
    }, [submitting, content, mode, selectedReservationId, selectedProductId, visitMonth]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const maxImages = 10;
        const remainingSlots = maxImages - images.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        try {
            const uploadPromises = filesToProcess.map(file => uploadImage(file, 'reviews'));
            const uploadedUrls = await Promise.all(uploadPromises);
            setImages(prev => [...prev, ...uploadedUrls]);
        } catch (error) {
            alert('画像のアップロードに失敗しました。');
        }

        event.target.value = '';
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        // Strip any HTML/script tags the user might paste; keep plain text only.
        const sanitized = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();

        if (sanitized.length < REVIEW_MIN_LENGTH) {
            alert(`レビューは${REVIEW_MIN_LENGTH}文字以上でお書きください。`);
            return;
        }
        if (sanitized.length > REVIEW_MAX_LENGTH) {
            alert(`レビューは${REVIEW_MAX_LENGTH}文字以内でお書きください。`);
            return;
        }

        // Resolve which tour the review is about based on the active mode.
        let productId = '';
        let productName = '';
        let visitDateLabel = '';

        if (mode === 'reservation' && selectedReservation) {
            productId = selectedReservation.productId || '';
            productName = selectedReservation.productName;
            visitDateLabel = selectedReservation.startDate.slice(0, 7) + ' 訪問';
        } else if (mode === 'free' && selectedProduct) {
            productId = selectedProduct.id;
            productName = selectedProduct.name;
            visitDateLabel = visitMonth + ' 訪問';
        } else {
            return;
        }

        setSubmitting(true);
        try {
            const meResponse = await api.auth.me();
            const me = meResponse?.user;
            if (!me) {
                alert('ログインが必要です。');
                return;
            }

            await api.reviews.create({
                product_id: productId,
                product_name: productName,
                rating,
                title: `${productName} レビュー`,
                content: sanitized,
                images,
                visit_date: visitDateLabel,
            });

            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Failed to save review:', error);
            alert('レビューの保存に失敗しました: ' + (error.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const hasReservations = completedReservations.length > 0;

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0e1a18] dark:text-white min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
                {/* TopAppBar */}
                <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 justify-between border-b border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-[#0e1a18] dark:text-white flex size-10 items-center justify-start cursor-pointer"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">レビュー作成</h2>
                </div>

                <div className="flex-1 pb-32">
                    {/* Mode toggle: pick how to identify the tour the review is about */}
                    <div className="px-4 pt-6">
                        <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-4">
                            参加されたツアー
                        </h3>
                        <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => hasReservations && setMode('reservation')}
                                disabled={!hasReservations}
                                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'reservation'
                                    ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm'
                                    : 'text-gray-500 disabled:opacity-50'
                                    }`}
                            >
                                ご予約から選ぶ{hasReservations ? `（${completedReservations.length}件）` : ''}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('free')}
                                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'free'
                                    ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm'
                                    : 'text-gray-500'
                                    }`}
                            >
                                直接ツアーを選ぶ
                            </button>
                        </div>

                        {/* Reservation mode list */}
                        {mode === 'reservation' && (
                            <div className="flex flex-col gap-3">
                                {hasReservations ? (
                                    completedReservations.map((reservation) => (
                                        <div
                                            key={reservation.id}
                                            onClick={() => setSelectedReservationId(reservation.id)}
                                            className={`flex items-center gap-4 bg-white dark:bg-[#1a2e2a] p-4 rounded-xl border-2 shadow-sm cursor-pointer transition-all ${selectedReservationId === reservation.id ? 'border-primary' : 'border-transparent opacity-60'
                                                }`}
                                        >
                                            <div className="bg-primary/10 flex items-center justify-center aspect-square rounded-lg size-16 shrink-0">
                                                <span className="material-symbols-outlined text-primary">tour</span>
                                            </div>
                                            <div className="flex flex-col justify-center flex-1 min-w-0">
                                                <p className="text-[#0e1a18] dark:text-white text-base font-bold leading-normal line-clamp-1">
                                                    {reservation.productName}
                                                </p>
                                                <p className={`text-sm font-medium leading-normal ${selectedReservationId === reservation.id ? 'text-primary' : 'text-gray-500'}`}>
                                                    {reservation.startDate} {reservation.endDate !== reservation.startDate && `- ${reservation.endDate.slice(5)}`}
                                                </p>
                                            </div>
                                            {selectedReservationId === reservation.id && (
                                                <div className="shrink-0">
                                                    <span
                                                        className="material-symbols-outlined text-primary"
                                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                                    >
                                                        check_circle
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <p>完了したご予約はありません。</p>
                                        <p className="text-xs pt-2">「直接ツアーを選ぶ」からもご投稿いただけます。</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Free mode: product picker + visit month */}
                        {mode === 'free' && (
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#0e1a18] dark:text-white mb-2">
                                        ツアーを選択
                                    </label>
                                    <select
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1a2e2a] border border-gray-200 dark:border-zinc-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base text-[#0e1a18] dark:text-white"
                                    >
                                        <option value="">— ツアーを選択してください —</option>
                                        {allProducts.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#0e1a18] dark:text-white mb-2">
                                        ご旅行の時期
                                    </label>
                                    <select
                                        value={visitMonth}
                                        onChange={(e) => setVisitMonth(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white dark:bg-[#1a2e2a] border border-gray-200 dark:border-zinc-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base text-[#0e1a18] dark:text-white"
                                    >
                                        <option value="">— 旅行された月をお選びください —</option>
                                        {visitMonthOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <span className="material-symbols-outlined text-primary text-[14px] align-middle mr-1">info</span>
                                    投稿いただいたレビューは、管理者の確認後にサイトへ掲載されます。
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Rating */}
                    <div className="px-4 pt-8">
                        <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-2">今回の旅行はいかがでしたか？</h3>
                        <p className="text-gray-500 text-sm mb-6">星の数を選択してください。</p>
                        <div className="flex justify-center gap-2 py-4">
                            {[1, 2, 3, 4, 5].map((star) => {
                                const on = star <= rating;
                                return (
                                    <span
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className="material-symbols-outlined cursor-pointer"
                                        style={{
                                            fontSize: '36px',
                                            color: on ? STAR_FILL : STAR_EMPTY,
                                            fontVariationSettings: on ? "'FILL' 1" : "'FILL' 0",
                                        }}
                                    >
                                        star
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section: Photo Upload */}
                    <div className="px-4 pt-8">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">写真アップロード</h3>
                            <p className="text-gray-500 text-sm"><span className="text-primary font-bold">{images.length}</span>/10</p>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {/* Upload Button */}
                            <label className="flex flex-col items-center justify-center shrink-0 size-24 bg-white dark:bg-[#1a2e2a] border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={images.length >= 10}
                                />
                                <span className="material-symbols-outlined text-gray-400">add_a_photo</span>
                                <span className="text-[10px] text-gray-400 mt-1 font-bold">追加</span>
                            </label>

                            {/* Uploaded Images */}
                            {images.map((image, index) => (
                                <div
                                    key={index}
                                    className="relative shrink-0 size-24 rounded-xl bg-center bg-cover"
                                    style={{ backgroundImage: `url("${image}")` }}
                                >
                                    <div
                                        onClick={() => handleRemoveImage(index)}
                                        className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 border-2 border-white dark:border-zinc-900 shadow-sm cursor-pointer hover:bg-red-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-xs block">close</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section: Detailed Review */}
                    <div className="px-4 pt-8 pb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">詳細レビュー</h3>
                            <span className={`text-xs font-medium ${content.length > REVIEW_MAX_LENGTH ? 'text-red-500' : content.length >= REVIEW_MIN_LENGTH ? 'text-primary' : 'text-gray-400'}`}>
                                {content.length} / {REVIEW_MAX_LENGTH}
                            </span>
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value.slice(0, REVIEW_MAX_LENGTH))}
                            maxLength={REVIEW_MAX_LENGTH}
                            className="w-full min-h-[200px] p-4 rounded-xl bg-white dark:bg-[#1a2e2a] border border-gray-100 dark:border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base resize-none transition-all placeholder:text-gray-400 text-[#0e1a18] dark:text-white"
                            placeholder="モンゴルでの大切な思い出を共有してください（天気、ガイド、宿泊施設など自由なご意見）"
                        ></textarea>
                        <p className="text-xs text-gray-400 mt-1.5">{REVIEW_MIN_LENGTH}文字以上、{REVIEW_MAX_LENGTH}文字以内でお書きください。</p>
                    </div>
                </div>

                {/* Sticky Bottom Button */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent z-[60]">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="w-full bg-primary hover:bg-[#19a186] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl shadow-lg transition-colors active:scale-[0.98]"
                        >
                            {submitting ? '送信中...' : '作成完了'}
                        </button>
                    </div>
                    <div className="h-4"></div> {/* iOS Home Indicator Area */}
                </div>

                {/* Success Modal */}
                {isSuccessModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="mx-6 w-full max-w-[320px] transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-6 shadow-2xl transition-all animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center justify-center pt-4 pb-6">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                                    <span
                                        className="material-symbols-outlined text-primary text-4xl"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                        check_circle
                                    </span>
                                </div>
                                <h3 className="text-[#0e1a18] dark:text-white tracking-tight text-xl font-bold leading-tight text-center px-2">
                                    レビューを<br />受付しました
                                </h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-relaxed pt-3 px-4 text-center">
                                    管理者の確認後にサイトへ掲載されます。<br />ご投稿ありがとうございます。
                                </p>
                            </div>
                            <div className="flex pt-2">
                                <button
                                    onClick={() => navigate('/reviews')}
                                    className="flex h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary text-white text-base font-bold leading-normal tracking-wide active:scale-[0.98] transition-transform hover:bg-[#19a186]"
                                >
                                    <span className="truncate">確認</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
