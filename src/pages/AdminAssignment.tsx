import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { GuideSelectionModal, AccommodationSelectionModal } from '../components/admin/SelectionModals';
import { supabase } from '../lib/supabaseClient';

interface Reservation {
    id: string;
    productName: string;
    customerName: string;
    startDate: string;
    duration: string;
    assignedGuide?: {
        id: string;
        name: string;
        image: string;
        introduction: string;
        phone: string;
        kakaoId: string;
    };
    dailyAccommodations?: Array<{
        day: number;
        accommodation: {
            id: string;
            name: string;
            type: string;
            location: string;
            images: string[];
            description: string;
            facilities: string[];
        };
    }>;
}

export const AdminAssignment: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showAccommodationModal, setShowAccommodationModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadReservations();
    }, []);

    const loadReservations = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mapData = data.map((r: any) => ({
                    id: r.id,
                    productName: r.product_name,
                    customerName: r.customer_name,
                    startDate: r.start_date,
                    duration: r.duration,
                    assignedGuide: r.assigned_guide_data,
                    dailyAccommodations: r.daily_accommodations
                }));
                setReservations(mapData);
            }
        } catch (e) {
            console.error('Failed to load reservations', e);
            alert('예약 목록을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const getTripDays = (duration: string): number => {
        if (!duration) return 1;
        const match = duration.match(/(\d+)박/);
        return match ? parseInt(match[1]) + 1 : 1;
    };

    const handleGuideAssign = async (guide: any) => {
        if (!selectedReservation) return;

        const updated: Reservation = {
            ...selectedReservation,
            assignedGuide: {
                id: guide.id,
                name: guide.name,
                image: guide.image,
                introduction: guide.introduction,
                phone: guide.phone,
                kakaoId: guide.kakaoId
            }
        };

        if (await updateReservation(updated)) {
            setSelectedReservation(updated);
        }
    };

    const handleAccommodationAssign = async (accommodation: any) => {
        if (!selectedReservation) return;

        const dailyAccommodations = selectedReservation.dailyAccommodations || [];
        const existingIndex = dailyAccommodations.findIndex(d => d.day === selectedDay);

        const newDaily = {
            day: selectedDay,
            accommodation: {
                id: accommodation.id,
                name: accommodation.name,
                type: accommodation.type,
                location: accommodation.location,
                images: accommodation.images,
                description: accommodation.description,
                facilities: accommodation.facilities
            }
        };

        let updatedDailies;
        if (existingIndex >= 0) {
            updatedDailies = [...dailyAccommodations];
            updatedDailies[existingIndex] = newDaily;
        } else {
            updatedDailies = [...dailyAccommodations, newDaily].sort((a, b) => a.day - b.day);
        }

        const updated: Reservation = {
            ...selectedReservation,
            dailyAccommodations: updatedDailies
        };

        if (await updateReservation(updated)) {
            setSelectedReservation(updated);
        }
    };

    const updateReservation = async (updated: Reservation) => {
        try {
            const updatePayload = {
                assigned_guide_id: updated.assignedGuide?.id || null,
                assigned_guide_data: updated.assignedGuide || null,
                daily_accommodations: updated.dailyAccommodations || []
            };

            const { error } = await supabase
                .from('reservations')
                .update(updatePayload)
                .eq('id', updated.id);

            if (error) throw error;

            setReservations(prev =>
                prev.map(res => res.id === updated.id ? updated : res)
            );
            return true;
        } catch (e) {
            console.error('Failed to update reservation', e);
            alert('할당 저장에 실패했습니다. DB 컬럼이 존재하는지 확인해주세요.');
            return false;
        }
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            <AdminSidebar activePage="assignment" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">가이드 & 숙소 할당</h1>
                </header>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
                    </div>
                ) : (
                    <div className="p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 예약 목록 */}
                            <div>
                                <h2 className="text-lg font-bold mb-4">예약 목록</h2>
                                <div className="space-y-3">
                                    {reservations.map(reservation => (
                                        <div
                                            key={reservation.id}
                                            onClick={() => setSelectedReservation(reservation)}
                                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedReservation?.id === reservation.id
                                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
                                                }`}
                                        >
                                            <p className="font-bold text-slate-800 dark:text-white">{reservation.productName}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{reservation.customerName} · {reservation.id.slice(0, 8)}...</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{reservation.duration} · {reservation.startDate}</p>
                                        </div>
                                    ))}
                                    {reservations.length === 0 && (
                                        <div className="text-center py-12 text-slate-500">
                                            예약이 없습니다
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 할당 패널 */}
                            <div>
                                {selectedReservation ? (
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                                        <h2 className="text-lg font-bold mb-4">{selectedReservation.productName}</h2>
                                        <p className="text-sm text-slate-500 mb-6">예약자: {selectedReservation.customerName}</p>

                                        {/* 가이드 할당 */}
                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg">badge</span>
                                                담당 가이드
                                            </h3>
                                            {selectedReservation.assignedGuide ? (
                                                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <img src={selectedReservation.assignedGuide.image} alt={selectedReservation.assignedGuide.name} className="w-12 h-12 rounded-full object-cover" />
                                                        <div>
                                                            <p className="font-bold text-slate-800 dark:text-white">{selectedReservation.assignedGuide.name}</p>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400">{selectedReservation.assignedGuide.phone}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowGuideModal(true)}
                                                        className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600"
                                                    >
                                                        변경
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setShowGuideModal(true)}
                                                    className="w-full px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-2xl text-slate-400">add</span>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">가이드 할당</p>
                                                </button>
                                            )}
                                        </div>

                                        {/* 숙소 할당 */}
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg">hotel</span>
                                                숙소 일정
                                            </h3>
                                            <div className="space-y-2">
                                                {Array.from({ length: getTripDays(selectedReservation.duration) }, (_, i) => i + 1).map(day => {
                                                    const assigned = selectedReservation.dailyAccommodations?.find(d => d.day === day);
                                                    const startDate = new Date(selectedReservation.startDate);
                                                    const currentDate = new Date(startDate);
                                                    currentDate.setDate(startDate.getDate() + day - 1);
                                                    const dateStr = currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

                                                    return (
                                                        <div key={day} className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs font-bold rounded">{day}일차</span>
                                                                    <span className="text-xs text-slate-600 dark:text-slate-400">{dateStr}</span>
                                                                </div>
                                                                {assigned ? (
                                                                    <p className="text-sm font-medium text-slate-800 dark:text-white">{assigned.accommodation.name}</p>
                                                                ) : (
                                                                    <p className="text-sm text-slate-500 dark:text-slate-500">미할당</p>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedDay(day);
                                                                    setShowAccommodationModal(true);
                                                                }}
                                                                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-600"
                                                            >
                                                                {assigned ? '변경' : '선택'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                                        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">assignment</span>
                                        <p className="text-slate-500 dark:text-slate-400">예약을 선택하여 가이드와 숙소를 배정하세요</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <GuideSelectionModal
                    isOpen={showGuideModal}
                    onClose={() => setShowGuideModal(false)}
                    onSelect={handleGuideAssign}
                    currentGuide={selectedReservation?.assignedGuide as any || null}
                />

                <AccommodationSelectionModal
                    isOpen={showAccommodationModal}
                    onClose={() => setShowAccommodationModal(false)}
                    onSelect={handleAccommodationAssign}
                    day={selectedDay}
                    currentAccommodation={selectedReservation?.dailyAccommodations?.find(d => d.day === selectedDay)?.accommodation || null}
                />
            </main>
        </div>
    );
};
