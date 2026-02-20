import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { uploadFile } from '../utils/upload';

export const BusinessEstimate: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        startDate: '',
        endDate: '',
        headcount: '',
        description: '',
    });

    const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set(['기업행사'])); // Default checked
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // Auth Check
    React.useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동합니다.');
                navigate('/login');
            }
        };
        checkAuth();
    }, [navigate]);

    // Toggle Chip
    const toggleChip = (label: string) => {
        const newSet = new Set(selectedChips);
        if (newSet.has(label)) {
            newSet.delete(label);
        } else {
            newSet.add(label);
        }
        setSelectedChips(newSet);
    };

    // Chip Component
    const CheckboxChip = ({ label }: { label: string }) => {
        const isChecked = selectedChips.has(label);
        return (
            <div
                onClick={() => toggleChip(label)}
                className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-medium border transition-all select-none
                    ${isChecked
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
            >
                {label}
            </div>
        );
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id === 'desc' ? 'description' : id]: value // Map 'desc' id to description field
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.name.trim()) { alert('담당자 성명을 입력해주세요.'); return; }
        if (!formData.phone.trim()) { alert('연락처를 입력해주세요.'); return; }
        if (!formData.email.trim()) { alert('이메일을 입력해주세요.'); return; }
        if (!formData.startDate) { alert('행사 시작일을 선택해주세요.'); return; }
        if (!formData.endDate) { alert('행사 종료일을 선택해주세요.'); return; }
        if (!formData.headcount) { alert('예상 인원을 입력해주세요.'); return; }
        if (!formData.description.trim()) { alert('행사 개요 및 요청사항을 입력해주세요.'); return; }

        const now = new Date();
        const period = `${formData.startDate.replace(/-/g, '.')} ~ ${formData.endDate.replace(/-/g, '.')}`;
        const people = `${formData.headcount}명`;

        // Upload attachment if exists
        let attachmentUrl: string | null = null;
        if (uploadedFile) {
            try {
                // Try to upload to 'files' bucket first, fallback to 'images' or warn user
                // For now, let's try 'images' but with a clearer error message as we suspect MIME type issues.
                // NOTE: If you have a dedicated 'files' bucket, change the second argument to 'files'.
                attachmentUrl = await uploadFile(uploadedFile, 'images', 'estimates');
            } catch (e: any) {
                console.error('File upload failed', e);
                let errorMessage = '파일 업로드에 실패했습니다.';
                if (e.message && e.message.includes('mime type')) {
                    errorMessage += '\n(지원하지 않는 파일 형식입니다. 이미지 파일만 가능하거나 관리자에게 문의하세요)';
                } else if (e.statusCode === '403' || e.error === 'AccessDenied') {
                    errorMessage += '\n(업로드 권한이 없습니다.)';
                }
                alert(`${errorMessage}\n\n견적 요청은 파일 없이 진행됩니다.`);
            }
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const newQuote = {
                user_id: user?.id || null,
                type: 'business',
                name: formData.name, // Contact Name
                phone: formData.phone,
                email: formData.email,
                destination: '몽골 비즈니스',
                headcount: people,
                period: period,
                status: 'new',
                travel_types: Array.from(selectedChips),
                additional_request: formData.description,
                attachment_url: attachmentUrl,
                created_at: now.toISOString()
            };

            const { data, error } = await supabase
                .from('quotes')
                .insert(newQuote)
                .select()
                .single();

            if (error) throw error;

            navigate('/estimate-complete', {
                state: {
                    ...newQuote,
                    id: data.id,
                    people: people,
                    date: period
                }
            });
        } catch (error: any) {
            console.error('Failed to submit estimate:', error);
            alert(`견적 요청 저장 중 오류가 발생했습니다.\n(${error.message || '알 수 없는 오류'})`);
        }
    };

    return (
        <div className="bg-white dark:bg-black font-display text-gray-900 dark:text-white antialiased selection:bg-primary selection:text-white min-h-screen pb-24">
            <div className="mx-auto min-h-screen w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden relative">
                {/* Header */}
                <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold">견적 요청</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </header>

                <main className="px-6 py-4 space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold leading-tight mb-2">
                            성공적인 <span className="text-primary">몽골 비즈니스</span>를<br />
                            함께 설계해 드립니다.
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            행사 규모와 성격에 맞는 최적의 플랜을 제안드립니다.<br />
                            담당자가 확인 후 빠르게 연락드리겠습니다.
                        </p>
                    </section>

                    <div className="h-px bg-gray-100 dark:bg-zinc-800 w-full"></div>

                    {/* Basic Info */}
                    <section className="space-y-5">
                        <h3 className="text-lg font-bold">기본 정보</h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1" htmlFor="name">담당자 성명</label>
                                <input
                                    id="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3.5 text-base focus:ring-2 focus:ring-primary placeholder-gray-400 transition-all outline-none"
                                    placeholder="성함을 입력해주세요"
                                    type="text"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1" htmlFor="phone">연락처</label>
                                <input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3.5 text-base focus:ring-2 focus:ring-primary placeholder-gray-400 transition-all outline-none"
                                    placeholder="010-0000-0000"
                                    type="tel"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1" htmlFor="email">이메일</label>
                                <input
                                    id="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3.5 text-base focus:ring-2 focus:ring-primary placeholder-gray-400 transition-all outline-none"
                                    placeholder="example@company.com"
                                    type="email"
                                />
                            </div>

                            {/* Schedule & Headcount */}
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1" htmlFor="startDate">행사 시작일</label>
                                    <input
                                        id="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3.5 text-base focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all outline-none"
                                        type="date"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1" htmlFor="endDate">행사 종료일</label>
                                    <input
                                        id="endDate"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3.5 text-base focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all outline-none"
                                        type="date"
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1" htmlFor="headcount">참가 예상 인원</label>
                                <input
                                    id="headcount"
                                    value={formData.headcount}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3.5 text-base focus:ring-2 focus:ring-primary placeholder-gray-400 transition-all outline-none"
                                    placeholder="예상 인원을 숫자로 입력해주세요 (예: 20)"
                                    type="number"
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1" htmlFor="desc">행사 개요 및 요청사항</label>
                                <textarea
                                    id="desc"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3.5 text-base focus:ring-2 focus:ring-primary placeholder-gray-400 resize-none transition-all outline-none"
                                    placeholder="행사 목적, 일정, 예상 인원 등 구체적인 내용을 적어주시면 더 정확한 견적이 가능합니다."
                                    rows={4}
                                ></textarea>
                            </div>
                        </div>
                    </section>

                    <div className="h-3 bg-gray-50 dark:bg-zinc-800/50 -mx-6"></div>

                    {/* Planning & Operation */}
                    <section className="space-y-3">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">event_note</span>
                            기획 및 운영
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <CheckboxChip label="국제회의 행사" />
                            <CheckboxChip label="기업행사" />
                            <CheckboxChip label="축제 행사" />
                            <CheckboxChip label="전시회" />
                            <CheckboxChip label="워크샵 행사" />
                            <CheckboxChip label="정부공식 행사" />
                            <CheckboxChip label="박람회" />
                        </div>
                    </section>

                    {/* Design System */}
                    <section className="space-y-3 pt-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">palette</span>
                            디자인 시스템
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <CheckboxChip label="키비쥬얼 디자인" />
                            <CheckboxChip label="현수막/배너" />
                            <CheckboxChip label="포토월" />
                            <CheckboxChip label="전시부스" />
                            <CheckboxChip label="기타 디자인" />
                        </div>
                    </section>

                    {/* Venue Styling */}
                    <section className="space-y-3 pt-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">celebration</span>
                            행사장 스타일링
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <CheckboxChip label="케이터링" />
                            <CheckboxChip label="푸드트럭" />
                            <CheckboxChip label="파티장 스타일링" />
                            <CheckboxChip label="그 외 문의" />
                        </div>
                    </section>

                    {/* Sound & Lighting */}
                    <section className="space-y-3 pt-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">speaker_group</span>
                            음향 및 조명
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <CheckboxChip label="소규모 시스템" />
                            <CheckboxChip label="200명 이하 공간" />
                            <CheckboxChip label="200명 이상 공간" />
                        </div>
                    </section>

                    {/* Venue Rental */}
                    <section className="space-y-3 pt-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">apartment</span>
                            장소 대관
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <CheckboxChip label="컨벤션홀" />
                            <CheckboxChip label="다목적홀" />
                            <CheckboxChip label="대강당" />
                            <CheckboxChip label="체육관" />
                            <CheckboxChip label="그 외" />
                        </div>
                    </section>

                    {/* Personnel */}
                    <section className="space-y-3 pt-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">groups</span>
                            인력 섭외
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <CheckboxChip label="진행요원" />
                            <CheckboxChip label="MC/아나운서" />
                            <CheckboxChip label="통역(동시/순차)" />
                            <CheckboxChip label="차량기사" />
                            <CheckboxChip label="그 외 섭외" />
                        </div>
                    </section>

                    {/* File Upload */}
                    <section className="space-y-3 pt-6 pb-20">
                        <h3 className="text-lg font-bold">참고 파일 첨부</h3>
                        <div className="w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-2xl cursor-pointer bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors" htmlFor="file-upload">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-500 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-3xl mb-2 text-primary">cloud_upload</span>
                                    <p className="text-sm font-medium"><span className="font-bold text-gray-700 dark:text-gray-300">
                                        {uploadedFile ? uploadedFile.name : '클릭하여 업로드'}
                                    </span></p>
                                    <p className="text-xs mt-1">PDF, JPG, PNG (최대 10MB)</p>
                                </div>
                                <input className="hidden" id="file-upload" type="file" onChange={handleFileChange} />
                            </label>
                        </div>
                    </section>
                </main>

                {/* Bottom Action */}
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-6 py-5 border-t border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-primary text-white font-bold py-4 rounded-2xl text-lg shadow-lg hover:bg-[#168f76] active:scale-[0.98] transition-all"
                    >
                        견적 요청하기
                    </button>
                </div>
            </div>
        </div>
    );
};
