import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { sendNotificationEmail } from '../lib/email';
import { BottomNav } from '../components/layout/BottomNav';

export const CustomEstimate: React.FC = () => {
    const navigate = useNavigate();
    const [priceRange, setPriceRange] = useState(150);
    const [adultCount, setAdultCount] = useState(2);
    const [childCount, setChildCount] = useState(0);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDestinations, setSelectedDestinations] = useState<string[]>(['중앙몽골']);
    const [selectedThemes, setSelectedThemes] = useState<string[]>(['힐링/휴식', '호캉스']);
    const [selectedAccommodations, setSelectedAccommodations] = useState<string[]>(['4성급 호텔', '고급 게르']);
    const [selectedVehicle, setSelectedVehicle] = useState('스타렉스');
    const [additionalRequest, setAdditionalRequest] = useState('');

    const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    // Auth Check & Auto-fill
    React.useEffect(() => {
        const checkAuthAndLoadProfile = async () => {
            try {
                const me = await api.auth.me();
                if (!me) {
                    alert('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동합니다.');
                    navigate('/login');
                    return;
                }
                if (me.full_name || me.name) setName(me.full_name || me.name);
                if (me.email) setEmail(me.email);
                if (me.phone) setPhone(me.phone);
            } catch (error) {
                alert('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동합니다.');
                navigate('/login');
            }
        };
        checkAuthAndLoadProfile();
    }, [navigate]);

    const handleSubmit = async () => {
        if (!name || !phone || !email || !startDate || !endDate) {
            alert('필수 정보를 모두 입력해주세요.\n(여행 일정, 이름, 휴대폰 번호, 이메일)');
            return;
        }

        try {
            const me = await api.auth.me();

            const newEstimate = {
                user_id: me?.id || null,
                type: 'personal',
                status: 'new',
                name: name,
                phone: phone,
                email: email,
                destination: selectedDestinations.join(', '),
                period: `${startDate} ~ ${endDate}`,
                headcount: `성인 ${adultCount}명${childCount > 0 ? `, 아동 ${childCount}명` : ''}`,
                budget: `${priceRange}万円`,
                travel_types: selectedThemes,
                accommodations: selectedAccommodations,
                vehicle: selectedVehicle,
                additional_request: additionalRequest,
                created_at: new Date().toISOString()
            };

            const data = await api.quotes.create(newEstimate);

            // Send Email Notification
            await sendNotificationEmail(
                newEstimate.email,
                'QUOTE_RECEIVED',
                {
                    customerName: newEstimate.name,
                    productName: `몽골 맞춤 여행 (${newEstimate.period})`
                }
            );

            navigate('/estimate-complete', { state: { id: data?.id || '', ...newEstimate } });
        } catch (error: any) {
            console.error('Failed to submit estimate:', error);
            alert(`견적 요청 저장 중 오류가 발생했습니다.\n(${error.message || '상세 에러 없음'})`);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased selection:bg-primary selection:text-white pb-28">
            <div className="sticky top-0 z-50 flex items-center justify-between bg-white dark:bg-zinc-900 p-4 border-b border-gray-100 dark:border-zinc-800">
                <button
                    onClick={() => navigate(-1)}
                    className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 text-[#0e1a18] dark:text-white">몽골 맞춤 견적 요청</h2>
            </div>

            <div className="max-w-md mx-auto w-full flex flex-col gap-2">
                {/* Real-time Status */}
                <div className="px-4 pt-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden relative">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1eb496] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1eb496]"></span>
                            </span>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">실시간 견적 요청 현황</h3>
                        </div>
                        <div className="h-[100px] overflow-hidden relative w-full">
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none"></div>
                            <div className="animate-scroll-vertical flex flex-col gap-3">
                                {/* Item 1 */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-500">K</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-900 dark:text-white">김**님 <span className="text-slate-400 font-normal">|</span> 몽골 4박5일</span>
                                            <span className="text-[10px] text-[#1eb496] font-medium">견적 산출 중...</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">방금 전</span>
                                </div>
                                {/* Item 2 */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-500">L</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-900 dark:text-white">이**님 <span className="text-slate-400 font-normal">|</span> 몽골 5박6일</span>
                                            <span className="text-[10px] text-blue-500 font-medium">견적 발송 완료</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">1분 전</span>
                                </div>
                                {/* Item 3 */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-500">P</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-900 dark:text-white">박**님 <span className="text-slate-400 font-normal">|</span> 고비사막 투어</span>
                                            <span className="text-[10px] text-[#1eb496] font-medium">상담사 배정 중</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">3분 전</span>
                                </div>
                                {/* Item 4 */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-500">C</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-900 dark:text-white">최**님 <span className="text-slate-400 font-normal">|</span> 홉스굴 4박5일</span>
                                            <span className="text-[10px] text-[#1eb496] font-medium">견적 요청 접수</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">5분 전</span>
                                </div>
                                {/* Duplicates for Loop */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-500">K</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-900 dark:text-white">김**님 <span className="text-slate-400 font-normal">|</span> 몽골 4박5일</span>
                                            <span className="text-[10px] text-[#1eb496] font-medium">견적 산출 중...</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">방금 전</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-500">L</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-900 dark:text-white">이**님 <span className="text-slate-400 font-normal">|</span> 몽골 5박6일</span>
                                            <span className="text-[10px] text-blue-500 font-medium">견적 발송 완료</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">1분 전</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hope Tour Destination */}
                <div className="flex flex-col bg-white dark:bg-zinc-900 px-4 py-6 mt-2 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-3 px-1 text-slate-900 dark:text-white">희망 투어 여행지 <span className="text-sm font-normal text-slate-400 ml-1">(중복 선택 가능)</span></h3>
                    <div className="flex flex-wrap gap-2.5">
                        {[
                            { emoji: '🏞️', label: '중앙몽골', checked: true },
                            { emoji: '🐪', label: '고비사막', checked: false },
                            { emoji: '🌊', label: '홉스굴', checked: false },
                            { emoji: '🥾', label: '트레킹', checked: false },
                            { emoji: '⛳', label: '골프', checked: false },
                        ].map((item, idx) => (
                            <label key={idx} className="cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedDestinations.includes(item.label)}
                                    onChange={() => toggleSelection(item.label, selectedDestinations, setSelectedDestinations)}
                                    className="peer sr-only"
                                />
                                <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-transparent peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:border-primary/30 transition-all font-medium text-sm flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                    <span>{item.emoji}</span> {item.label}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Date */}
                <div className="flex flex-col bg-white dark:bg-zinc-900 px-4 py-6 mt-2 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-4 px-1 text-slate-900 dark:text-white">여행 일정</h3>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">몽골 입국일</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary text-sm font-medium"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">몽골 귀국일</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary text-sm font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* People */}
                <div className="bg-white dark:bg-zinc-900 px-4 py-6 mt-2 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-4 px-1 text-slate-900 dark:text-white">여행 인원</h3>
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-base font-bold text-slate-900 dark:text-white">성인</span>
                                <span className="text-xs font-medium text-slate-400">만 12세 이상</span>
                            </div>
                            <div className="flex items-center gap-5">
                                <button
                                    onClick={() => setAdultCount(Math.max(1, adultCount - 1))}
                                    className="size-10 rounded-full border border-slate-200 dark:border-gray-600 bg-white dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 text-slate-400 dark:text-slate-300 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">remove</span>
                                </button>
                                <span className="min-w-[1rem] text-center font-bold text-lg text-slate-900 dark:text-white">{adultCount}</span>
                                <button
                                    onClick={() => setAdultCount(adultCount + 1)}
                                    className="size-10 rounded-full border border-slate-200 dark:border-gray-600 bg-white dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-base font-bold text-slate-900 dark:text-white">아동</span>
                            </div>
                            <div className="flex items-center gap-5">
                                <button
                                    onClick={() => setChildCount(Math.max(0, childCount - 1))}
                                    className={`size-10 rounded-full border border-slate-200 dark:border-gray-600 bg-white dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors ${childCount === 0 ? 'text-slate-300 dark:text-slate-500 opacity-50 cursor-not-allowed' : 'text-slate-400 dark:text-slate-300'}`}
                                    disabled={childCount === 0}
                                >
                                    <span className="material-symbols-outlined text-lg">remove</span>
                                </button>
                                <span className={`min-w-[1rem] text-center font-bold text-lg ${childCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>{childCount}</span>
                                <button
                                    onClick={() => setChildCount(childCount + 1)}
                                    className="size-10 rounded-full border border-slate-200 dark:border-gray-600 bg-white dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tour Type */}
                <div className="bg-white dark:bg-zinc-900 px-4 py-6 mt-2 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-3 px-1 text-slate-900 dark:text-white">여행 타입</h3>
                    <div className="flex flex-wrap gap-2.5">
                        {[
                            { emoji: '💆‍♀️', label: '힐링/휴식', checked: true },
                            { emoji: '🏄‍♂️', label: '액티비티', checked: false },
                            { emoji: '🍽️', label: '맛집탐방', checked: false },
                            { emoji: '🏨', label: '호캉스', checked: true },
                            { emoji: '📸', label: '인생샷', checked: false },
                        ].map((item, idx) => (
                            <label key={idx} className="cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedThemes.includes(item.label)}
                                    onChange={() => toggleSelection(item.label, selectedThemes, setSelectedThemes)}
                                    className="peer sr-only"
                                />
                                <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-transparent peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:border-primary/30 transition-all font-medium text-sm flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                    <span>{item.emoji}</span> {item.label}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Accommodation */}
                <div className="bg-white dark:bg-zinc-900 px-4 py-6 mt-2 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-3 px-1 text-slate-900 dark:text-white">숙소 옵션</h3>
                    <div className="flex flex-wrap gap-2.5">
                        {[
                            { icon: 'hotel', label: '2성급 호텔', checked: false },
                            { icon: 'hotel', label: '3성급 호텔', checked: false },
                            { icon: 'hotel', label: '4성급 호텔', checked: true },
                            { icon: 'hotel', label: '5성급 호텔', checked: false },
                            { icon: 'bungalow', label: '일반 게르', checked: false },
                            { icon: 'holiday_village', label: '고급 게르', checked: true },
                            { icon: 'star', label: '럭셔리 게르', checked: false },
                            { icon: 'home', label: '게스트하우스', checked: false },
                        ].map((item, idx) => (
                            <label key={idx} className="cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedAccommodations.includes(item.label)}
                                    onChange={() => toggleSelection(item.label, selectedAccommodations, setSelectedAccommodations)}
                                    className="peer sr-only"
                                />
                                <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-transparent peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:border-primary/30 transition-all font-medium text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                    <span className="material-symbols-outlined text-[1.1rem]">{item.icon}</span>
                                    {item.label}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Vehicle */}
                <div className="bg-white dark:bg-zinc-900 px-4 py-6 mt-2 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-3 px-1 text-slate-900 dark:text-white">차량 옵션</h3>
                    <div className="flex flex-wrap gap-2.5">
                        {[
                            { icon: 'airport_shuttle', label: '스타렉스', checked: true },
                            { icon: 'local_shipping', label: '푸르공', checked: false },
                            { icon: 'airport_shuttle', label: '하이스', checked: false },
                            { icon: 'directions_bus', label: '소형버스', checked: false },
                            { icon: 'directions_bus', label: '대형버스', checked: false },
                        ].map((item, idx) => (
                            <label key={idx} className="cursor-pointer group">
                                <input
                                    type="radio"
                                    name="vehicle"
                                    checked={selectedVehicle === item.label}
                                    onChange={() => setSelectedVehicle(item.label)}
                                    className="peer sr-only"
                                />
                                <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-transparent peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:border-primary/30 transition-all font-medium text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-700">
                                    <span className="material-symbols-outlined text-[1.1rem]">{item.icon}</span>
                                    {item.label}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Budget */}
                <div className="bg-white dark:bg-zinc-900 px-4 py-6 mt-2 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold px-1 text-slate-900 dark:text-white">여행 경비</h3>
                        <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-md">인당 예산</span>
                    </div>
                    <div className="p-5 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 mt-2">
                        <div className="flex justify-between items-end mb-5">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{priceRange}万円</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">~ {priceRange + 50}万円</span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="500"
                            value={priceRange}
                            onChange={(e) => setPriceRange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary dark:bg-zinc-700"
                        />
                        <div className="flex justify-between mt-2.5 text-xs text-slate-400 font-medium px-0.5">
                            <span>최소</span>
                            <span>500万円+</span>
                        </div>
                    </div>
                </div>

                {/* Additional Request */}
                <div className="bg-white dark:bg-zinc-900 px-4 py-6 mt-2 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-4 px-1 text-slate-900 dark:text-white">기타 요청사항</h3>
                    <div className="relative">
                        <textarea
                            value={additionalRequest}
                            onChange={(e) => setAdditionalRequest(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary text-sm placeholder:text-slate-400 resize-none h-32"
                            placeholder="특별히 원하시는 사항이 있다면 자유롭게 적어주세요.">
                        </textarea>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white dark:bg-zinc-900 px-4 py-6 mt-2 mb-6 shadow-sm dark:border-t dark:border-b dark:border-zinc-800">
                    <h3 className="text-lg font-bold mb-4 px-1 text-slate-900 dark:text-white">신청자 정보</h3>
                    <div className="flex flex-col gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">이름</label>
                            <input
                                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary text-sm placeholder:text-slate-400"
                                placeholder="홍길동"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">휴대폰 번호</label>
                            <input
                                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary text-sm placeholder:text-slate-400"
                                placeholder="010-1234-5678"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">이메일</label>
                            <input
                                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary text-sm placeholder:text-slate-400"
                                placeholder="example@email.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-[84px] left-0 right-0 bg-transparent p-4 z-40 pointer-events-none">
                <div className="max-w-md mx-auto w-full flex items-center justify-end gap-4 pointer-events-auto">
                    <button
                        onClick={handleSubmit}
                        className="bg-primary hover:bg-[#159a80] text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-95 flex items-center gap-2"
                    >
                        <span>무료 견적 받기 ({adultCount + childCount}명)</span>
                        <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};
