import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { uploadImage } from '../utils/upload';

export const ReviewWrite: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [selectedReservationId, setSelectedReservationId] = useState<string>('');
    const [rating, setRating] = useState<number>(4);
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    // Fetch completed reservations from Supabase
    const [completedReservations, setCompletedReservations] = useState<any[]>([]);

    useEffect(() => {
        const fetchReservations = async () => {
            // For testing: we can't filter by user yet if we don't have auth ID properly in DB, 
            // but schema has user_id.
            // If user is not logged in, we shouldn't show anything anyway.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('reservations')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .order('start_date', { ascending: false });

            if (data) {
                // Map to frontend format
                const mapped = data.map((r: any) => ({
                    id: r.id,
                    productName: r.product_name,
                    startDate: r.start_date,
                    endDate: r.end_date,
                }));
                setCompletedReservations(mapped);
            }
        };
        fetchReservations();
    }, []);

    const selectedReservation = completedReservations?.find(r => r.id === selectedReservationId);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const maxImages = 10;
        const remainingSlots = maxImages - images.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        try {
            // Upload images in parallel
            const uploadPromises = filesToProcess.map(file => uploadImage(file, 'reviews'));
            const uploadedUrls = await Promise.all(uploadPromises);

            setImages(prev => [...prev, ...uploadedUrls]);
        } catch (error) {
            alert('이미지 업로드에 실패했습니다.');
        }

        // Reset input
        event.target.value = '';
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content.trim() || !selectedReservation) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('로그인이 필요합니다.');
                return;
            }

            const { error } = await supabase.from('reviews').insert({
                user_id: user.id,
                author_name: user.user_metadata.full_name || '익명',
                visit_date: selectedReservation.startDate.slice(0, 7) + ' 방문',
                rating: rating,
                product_name: selectedReservation.productName,
                title: `${selectedReservation.productName} 후기`,
                content: content,
                images: images,
                user_image: user.user_metadata.avatar_url
            });

            if (error) {
                console.error('Failed to save review:', error);
                alert('리뷰 저장에 실패했습니다: ' + error.message);
            } else {
                setIsSuccessModalOpen(true);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('오류가 발생했습니다.');
        }
    };

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
                    <h2 className="text-[#0e1a18] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">후기 작성</h2>
                </div>

                <div className="flex-1 pb-32">
                    {/* Section: Tour Selection */}
                    <div className="px-4 pt-6">
                        <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-4">최근 다녀온 투어</h3>
                        <div className="flex flex-col gap-3">
                            {completedReservations && completedReservations.length > 0 ? (
                                completedReservations.map((reservation) => (
                                    <div
                                        key={reservation.id}
                                        onClick={() => setSelectedReservationId(reservation.id)}
                                        className={`flex items-center gap-4 bg-white dark:bg-[#1a2e2a] p-4 rounded-xl border-2 shadow-sm cursor-pointer transition-all ${selectedReservationId === reservation.id ? 'border-primary' : 'border-transparent opacity-60'
                                            }`}
                                    >
                                        <div
                                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16"
                                            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB-DYbuMu07bWM9LbfmmvyK57Y0TT-DDDkHh2gXCG8IjX5qd7Mit2vDFBCbFv4vNj3JSWYIxdrQtwRi-QMsZUfBhVLtAU-xgkI0U2Y_JtmhtnkawJBuKFJBQ_SNFPgUJTzPtyrYh3v36I5tqPfphS0n9tzhjzH20wHgIlvmcRuT8XJwENkhG1q2tNsz-XzQEf7hrA78c-EGazQKwgvSBeKEwUYha5TpzwwhPIAGPAxIg7zSoD2crHfGT_K86-TjgBEH3k49Y9FH8Q")' }}
                                        ></div>
                                        <div className="flex flex-col justify-center flex-1">
                                            <p className="text-[#0e1a18] dark:text-white text-base font-bold leading-normal line-clamp-1">
                                                {reservation.productName}
                                            </p>
                                            <p className={`text-sm font-medium leading-normal ${selectedReservationId === reservation.id ? 'text-primary' : 'text-gray-500'}`}>
                                                {reservation.startDate} {reservation.endDate !== reservation.startDate && `- ${reservation.endDate.slice(5)}`}
                                            </p>
                                        </div>
                                        {selectedReservationId === reservation.id && (
                                            <div className="shrink-0">
                                                <span className="material-symbols-outlined text-primary fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <p>완료된 투어가 없습니다.</p>
                                    <p className="text-xs pt-2">예약 확정 및 여행 완료 후 작성 가능합니다.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: Rating */}
                    <div className="px-4 pt-8">
                        <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-2">이번 여행은 어떠셨나요?</h3>
                        <p className="text-gray-500 text-sm mb-6">별점을 선택해 주세요.</p>
                        <div className="flex justify-center gap-2 py-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`material-symbols-outlined text-4xl cursor-pointer ${star <= rating ? 'text-primary fill-current' : 'text-gray-200 dark:text-zinc-700'}`}
                                    style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    star
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Section: Photo Upload */}
                    <div className="px-4 pt-8">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">사진 업로드</h3>
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
                                <span className="text-[10px] text-gray-400 mt-1 font-bold">추가</span>
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
                        <h3 className="text-[#0e1a18] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-4">상세 후기</h3>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full min-h-[200px] p-4 rounded-xl bg-white dark:bg-[#1a2e2a] border border-gray-100 dark:border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base resize-none transition-all placeholder:text-gray-400 text-[#0e1a18] dark:text-white"
                            placeholder="몽골에서의 소중한 추억을 공유해주세요 (날씨, 가이드, 숙소 등 자유로운 의견)"
                        ></textarea>
                    </div>
                </div>

                {/* Sticky Bottom Button */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent z-[60]">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim() || !selectedReservationId}
                            className="w-full bg-primary hover:bg-[#19a186] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl shadow-lg transition-colors active:scale-[0.98]"
                        >
                            작성 완료
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
                                    <span className="material-symbols-outlined text-primary text-4xl fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                </div>
                                <h3 className="text-[#0e1a18] dark:text-white tracking-tight text-xl font-bold leading-tight text-center px-2">
                                    후기가 소중하게<br />등록되었습니다
                                </h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-relaxed pt-3 px-4 text-center">
                                    소중한 후기는 다른 여행자들에게<br />큰 도움이 됩니다.
                                </p>
                            </div>
                            <div className="flex pt-2">
                                <button
                                    onClick={() => navigate('/reviews')}
                                    className="flex h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary text-white text-base font-bold leading-normal tracking-wide active:scale-[0.98] transition-transform hover:bg-[#19a186]"
                                >
                                    <span className="truncate">확인</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
