import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BottomNav } from '../components/layout/BottomNav';

export const BusinessEstimateDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [estimate, setEstimate] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEstimate = async () => {
            if (!id) return;
            setLoading(true);

            const { data, error } = await supabase
                .from('quotes')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                // Map to component state structure
                const mappedEstimate = {
                    id: data.id,
                    status: data.status,
                    statusLabel: getStatusLabel(data.status),
                    title: data.name ? `${data.name}님의 견적 요청` : (data.title || '견적 요청'), // fallback if title missing
                    type: (data.travel_types && data.travel_types[0]) || '맞춤 여행',
                    date: new Date(data.created_at).toLocaleDateString() + ' 요청',
                    schedule: data.period,
                    description: data.additional_request,
                    contact: {
                        name: data.name,
                        phone: data.phone,
                        email: data.email
                    },
                    travelTypes: data.travel_types || [],
                    estimateUrl: data.estimate_url,
                    adminNote: data.admin_note,
                    attachmentUrl: data.attachment_url // Field from DB
                };
                setEstimate(mappedEstimate);
            } else {
                console.error("Failed to load estimate:", error);
            }
            setLoading(false);
        };

        loadEstimate();
    }, [id]);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'new': return '접수 대기';
            case 'processing': return '처리 중';
            case 'answered': return '답변 완료'; // maps to 'completed' in DB usually, but let's check what we used. 
            // In AdminQuoteManage we used 'completed'. 'answered' might be legacy. 
            // Let's support both or map 'completed' -> '답변 완료'
            case 'completed': return '답변 완료';
            case 'rejected': return '반려';
            case 'converted': return '예약 확정';
            case 'reservation_requested': return '예약 요청';
            default: return status;
        }
    };

    const handleRequestReservation = async () => {
        if (!estimate || !id) return;

        if (!confirm('견적서 내용을 확인하셨나요?\n예약 상담을 요청하시겠습니까?')) return;

        try {
            // Update Supabase
            const { error } = await supabase
                .from('quotes')
                .update({
                    status: 'reservation_requested',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Update Local State
            setEstimate((prev: any) => ({
                ...prev,
                status: 'reservation_requested',
                statusLabel: '예약 요청'
            }));

            alert('예약 상담 요청이 접수되었습니다.\n담당자가 확인 후 연락드리겠습니다.');
        } catch (error) {
            console.error("Failed to request reservation:", error);
            alert("요청 처리 중 오류가 발생했습니다.");
        }
    };

    if (!estimate) {
        return (
            <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
                <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-gray-50 dark:bg-zinc-900 shadow-xl overflow-x-hidden items-center justify-center">
                    <p className="text-gray-500">견적 정보를 찾을 수 없습니다.</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">뒤로가기</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex justify-center w-full">
            <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-gray-50 dark:bg-zinc-900 shadow-xl overflow-x-hidden pb-[100px]">
                {/* Header */}
                <div className="sticky top-0 z-50 flex items-center bg-gray-50/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 py-4 transition-colors border-b border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-text-main dark:text-white hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-text-main dark:text-white flex-1 text-center pr-8">비즈니스 견적 상세</h1>
                </div>

                <div className="px-5 pt-6 flex flex-col gap-6">
                    {/* Status & Title */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700">
                        <div className="flex items-center justify-between mb-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold 
                                ${estimate.status === 'answered' ? 'bg-primary/10 text-primary' : ''}
                                ${estimate.status === 'processing' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : ''}
                                ${estimate.status === 'rejected' ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400' : ''}
                            `}>
                                {estimate.statusLabel}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug mb-2">{estimate.title}</h2>
                        <p className="text-sm text-slate-400">{estimate.date}</p>
                    </div>

                    {/* Estimate Action Section (When Answered) */}
                    {(estimate.status === 'answered' || estimate.estimateUrl) && (
                        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-base font-bold text-teal-800 dark:text-teal-400 mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                견적서가 도착했습니다!
                            </h3>
                            <p className="text-sm text-teal-700 dark:text-teal-300 mb-4">
                                담당자가 보내드린 맞춤 견적서를 확인해보세요.
                            </p>

                            {estimate.adminNote && (
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-teal-100 dark:border-teal-800/50 mb-4">
                                    <span className="text-xs font-bold text-slate-400 block mb-1">담당자 메시지</span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{estimate.adminNote}</p>
                                </div>
                            )}

                            {estimate.estimateUrl && (
                                <a
                                    href={estimate.estimateUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98]"
                                >
                                    견적서 바로가기
                                </a>
                            )}

                            {/* Reservation Request Button (Show only if not converted) */}
                            {estimate.status !== 'converted' && estimate.status !== 'reservation_requested' ? (
                                <button
                                    onClick={handleRequestReservation}
                                    className="w-full mt-3 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">bookmark_add</span>
                                    예약 상담 요청하기
                                </button>
                            ) : estimate.status === 'reservation_requested' ? (
                                <div className="mt-3 bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-xl text-center border border-gray-100 dark:border-zinc-600">
                                    <p className="text-gray-600 dark:text-gray-300 font-bold mb-1">예약 상담 요청 대기 중</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">담당자가 확인 후 연락드리겠습니다.</p>
                                </div>
                            ) : (
                                <div className="mt-3 bg-primary/5 dark:bg-primary/10 p-4 rounded-xl text-center border border-primary/10 dark:border-primary/20">
                                    <p className="text-primary dark:text-primary-light font-bold mb-2 flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined">event_available</span>
                                        예약이 확정되었습니다
                                    </p>
                                    <button
                                        onClick={() => navigate('/my-reservations')}
                                        className="text-xs bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm shadow-primary/20"
                                    >
                                        예약 내역 확인하기
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary Info */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700 flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-700/50 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-lg">calendar_today</span>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 mb-0.5">행사 일정</h3>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{estimate.schedule}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-700/50 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-lg">business_center</span>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 mb-0.5">행사 타입</h3>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{estimate.type}</p>
                            </div>
                        </div>
                    </div>

                    {/* Request Details */}
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">요청 세부 사항</h3>
                        <div className="space-y-4">
                            {estimate.travelTypes && estimate.travelTypes.length > 0 && (
                                <div>
                                    <span className="text-xs font-bold text-slate-400 block mb-1.5">선택 항목</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {estimate.travelTypes.map((item: string, idx: number) => (
                                            <span key={idx} className="px-2.5 py-1 bg-gray-50 dark:bg-zinc-700 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300">{item}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <span className="text-xs font-bold text-slate-400 block mb-1.5">요청 내용</span>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {estimate.description || '내용 없음'}
                                </p>
                            </div>
                        </div>

                        {/* Attachment */}
                        {estimate.attachmentUrl && (
                            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-zinc-700">
                                <span className="text-xs font-bold text-slate-400 block mb-2">첨부파일</span>
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-700/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-700">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-zinc-600 flex items-center justify-center text-slate-500 dark:text-slate-300 flex-shrink-0">
                                            <span className="material-symbols-outlined">description</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                첨부파일
                                            </p>
                                            <a href={estimate.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                                                {estimate.attachmentUrl.split('/').pop()}
                                            </a>
                                        </div>
                                    </div>
                                    <a
                                        href={estimate.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title="다운로드"
                                    >
                                        <span className="material-symbols-outlined">download</span>
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contact Info */}
                    {estimate.contact && (
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700 mb-6">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">담당자 정보</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">이름</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{estimate.contact.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">전화번호</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{estimate.contact.phone}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">이메일</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{estimate.contact.email}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <BottomNav />
            </div>
        </div >
    );
};
