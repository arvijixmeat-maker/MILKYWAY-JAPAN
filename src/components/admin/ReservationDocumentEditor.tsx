import React, { useEffect, useState } from 'react';
import {
    TemplatePreview,
    mergeDocumentSettings,
    defaultDocumentSettings,
    parseDayActivitiesText,
    type DocumentSettings,
    type TemplateDay,
    type ActivityType,
} from '../../pages/AdminTemplateManage';

export interface ReservationDocContent {
    name: string;
    description: string;
    days: TemplateDay[];
    documentSettings: DocumentSettings;
}

interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    documentType?: 'itinerary' | 'contract';
    /** 실제 고객 데이터 — TemplatePreview 상단/금액에 자동 표시 */
    customer: {
        tripNumber?: string;
        period?: string;
        tripLength?: string;
        headcount?: string;
        name?: string;
        tripType?: string;
        totalAmount?: number;
        deposit?: number;
        localAmount?: number;
        peopleCount?: number;
    };
    /** 저장돼 있던 문서 내용(없으면 템플릿/기본값) */
    initialContent: ReservationDocContent | null;
    onSave: (content: ReservationDocContent) => Promise<void>;
    /** 가이드·숙소 배정 (상세내역의 picker 재사용) */
    assignedGuide?: { name?: string; phone?: string; image?: string } | null;
    dailyAccommodations?: Array<{ day: number; accommodation: { name?: string } }>;
    onAssignGuide?: () => void;
    onAssignAccommodation?: (day: number) => void;
}

export const ReservationDocumentEditor: React.FC<Props> = ({ open, onClose, title, documentType = 'itinerary', customer, initialContent, onSave, assignedGuide, dailyAccommodations, onAssignGuide, onAssignAccommodation }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [days, setDays] = useState<TemplateDay[]>([]);
    const [docSettings, setDocSettings] = useState<DocumentSettings>(defaultDocumentSettings());
    const [saving, setSaving] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);

    useEffect(() => {
        if (!open) return;
        setName(initialContent?.name || customer.tripType || '');
        setDescription(initialContent?.description || '');
        setDays(Array.isArray(initialContent?.days) ? initialContent!.days : []);
        setDocSettings(mergeDocumentSettings(initialContent?.documentSettings));
        setSelectedDayIndex(0);
    }, [open, initialContent]);

    // ── Day / activity 핸들러 ──
    const updateDay = (idx: number, field: keyof TemplateDay, value: any) =>
        setDays(d => d.map((x, i) => i === idx ? { ...x, [field]: value } : x));
    const addDay = () => setDays(d => {
        setSelectedDayIndex(d.length);
        return [...d, { day: d.length + 1, title: '', region: '', summary: '', activities: [], meals: {}, accommodation: null }];
    });
    const removeDay = (idx: number) => setDays(d => {
        const next = d.filter((_, i) => i !== idx).map((x, i) => ({ ...x, day: i + 1 }));
        setSelectedDayIndex(current => Math.max(0, Math.min(current > idx ? current - 1 : current, next.length - 1)));
        return next;
    });
    const addActivity = (dayIdx: number) => setDays(d => d.map((x, i) => i === dayIdx ? { ...x, activities: [...x.activities, { time: '', type: 'sightseeing' as ActivityType, title: '', description: '' }] } : x));
    const removeActivity = (dayIdx: number, actIdx: number) => setDays(d => d.map((x, i) => i === dayIdx ? { ...x, activities: x.activities.filter((_, j) => j !== actIdx) } : x));
    const updateActivity = (dayIdx: number, actIdx: number, field: 'time' | 'title' | 'description', value: string) =>
        setDays(d => d.map((x, i) => i === dayIdx ? { ...x, activities: x.activities.map((a, j) => j === actIdx ? { ...a, [field]: value } : a) } : x));

    // ── documentSettings 핸들러 ──
    const updateDocSection = <K extends keyof DocumentSettings>(section: K, patch: Partial<DocumentSettings[K]>) =>
        setDocSettings(s => ({ ...s, [section]: { ...s[section], ...patch } }));
    const updateIncluded = (idx: number, field: 'icon' | 'label', value: string) =>
        setDocSettings(s => ({ ...s, overview: { ...s.overview, included: s.overview.included.map((it, i) => i === idx ? { ...it, [field]: value } : it) } }));
    const updateCancellation = (idx: number, field: 'period' | 'fee', value: string) =>
        setDocSettings(s => ({ ...s, contract: { ...s.contract, cancellationRows: s.contract.cancellationRows.map((r, i) => i === idx ? { ...r, [field]: value } : r) } }));
    const updateGuideNotice = (idx: number, field: 'title' | 'body', value: string) =>
        setDocSettings(s => ({ ...s, guide: { ...s.guide, notices: s.guide.notices.map((n, i) => i === idx ? { ...n, [field]: value } : n) } }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({ name, description, days, documentSettings: docSettings });
            onClose();
        } catch (e: any) {
            alert('저장 실패: ' + (e?.message || e));
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const totalAmount = customer.totalAmount || 0;
    const includedCount = docSettings.overview.included.filter(item => item.label?.trim()).length;
    const excludedCount = docSettings.overview.excludedText.split(/\r?\n/).filter(Boolean).length;
    const selectedDay = days[selectedDayIndex];

    return (
        <div className="fixed inset-0 z-[210] bg-slate-900/50 backdrop-blur-sm p-3 sm:p-6">
            <div className="bg-[#F7FAFA] dark:bg-slate-900 rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl">
                <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">고객 문서 편집</p>
                            <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">취소</button>
                        <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-lg inline-flex items-center gap-1.5 shadow-md shadow-teal-500/20 disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">check</span>{saving ? '저장 중' : '저장'}
                        </button>
                    </div>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
                        <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">고객</p>
                            <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{customer.name || '고객명 없음'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">예약번호</p>
                            <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{customer.tripNumber || '-'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">여행기간</p>
                            <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{customer.period || customer.tripLength || '-'}</p>
                        </div>
                    </div>
                    {documentType === 'contract' && (onAssignGuide || onAssignAccommodation) && (
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {onAssignGuide && (
                            <button onClick={onAssignGuide} className="inline-flex h-12 items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 text-sm font-black text-teal-700 shadow-sm transition-colors hover:bg-teal-50 dark:border-teal-700 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-teal-900/30">
                                <span className="material-symbols-outlined text-[20px]">{assignedGuide?.name ? 'badge' : 'person_add'}</span>
                                <span>{assignedGuide?.name || '가이드 배정'}</span>
                            </button>
                        )}
                        {onAssignAccommodation && (
                            <div className="flex flex-wrap items-center gap-2">
                                {Array.from({ length: Math.max(days.length, dailyAccommodations?.length || 0, 1) }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const a = dailyAccommodations?.find(d => d.day === dayNum);
                                    return (
                                        <button key={i} onClick={() => onAssignAccommodation(dayNum)} className={`inline-flex h-12 items-center gap-1.5 rounded-xl border px-3 text-xs font-black shadow-sm transition-colors hover:bg-teal-50 dark:hover:bg-teal-900/30 ${a ? 'border-teal-200 bg-white text-teal-700 dark:border-teal-700 dark:bg-slate-800 dark:text-teal-300' : 'border-dashed border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800'}`}>
                                            <span className="material-symbols-outlined text-[18px]">hotel</span>
                                            <span>{dayNum}日: {a?.accommodation?.name || '숙소 선택'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        </div>
                    )}
                </div>
                {documentType === 'contract' && <div className="flex flex-shrink-0 items-center gap-2 border-b border-teal-200 bg-teal-50 px-6 py-2 text-xs font-bold text-[#0F8F84] dark:border-teal-800 dark:bg-teal-900/20">
                    <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
                    <span>문서를 클릭해서 수정하고, 상단에서 담당 가이드와 일자별 숙소를 배정하면 일정표·계약서에 함께 반영됩니다.</span>
                </div>}
                <div className="flex-1 overflow-hidden bg-[#F7FAFA] dark:bg-slate-900">
                    {documentType === 'itinerary' ? (
                    <div className="grid h-full grid-cols-[240px_minmax(560px,1fr)_280px] overflow-hidden max-xl:grid-cols-[210px_minmax(520px,1fr)] max-lg:block max-lg:overflow-y-auto">
                        <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-lg:border-b max-lg:border-r-0">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">일정 구성</p>
                                    <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">{days.length}일 일정</h2>
                                </div>
                                <button onClick={addDay} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F8F84] text-white" title="DAY 추가">
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                </button>
                            </div>
                            <div className="space-y-2">
                                {days.map((day, index) => (
                                    <button
                                        key={`${day.day}-${index}`}
                                        type="button"
                                        onClick={() => setSelectedDayIndex(index)}
                                        className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedDayIndex === index ? 'border-[#39C4B7] bg-[#EAF8F7] shadow-sm' : 'border-slate-200 bg-white hover:border-[#8FE7DE]'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black text-[#0F8F84]">DAY {day.day}</span>
                                            <span className="text-[9px] font-bold text-slate-400">{day.activities.length}개 일정</span>
                                        </div>
                                        <p className="mt-1 truncate text-xs font-black text-slate-800">{day.title || '일차 제목을 입력하세요'}</p>
                                        <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{day.region || '지역 미정'}</p>
                                    </button>
                                ))}
                                {days.length === 0 && (
                                    <button onClick={addDay} className="w-full rounded-xl border-2 border-dashed border-[#8FE7DE] px-3 py-8 text-xs font-black text-[#0F8F84]">
                                        첫 번째 DAY 추가
                                    </button>
                                )}
                            </div>
                        </aside>

                        <main className="min-w-0 overflow-hidden p-4 max-lg:h-[760px]">
                            <TemplatePreview
                        name={name}
                        description={description}
                        days={days}
                        documentSettings={docSettings}
                        customer={customer}
                        assignedGuide={assignedGuide}
                        dailyAccommodations={dailyAccommodations}
                        onNameChange={setName}
                        onDescriptionChange={setDescription}
                        onDocSection={updateDocSection}
                        onIncluded={updateIncluded}
                        onCancellation={updateCancellation}
                        onGuideNotice={updateGuideNotice}
                        onDayChange={updateDay}
                        onActivityChange={updateActivity}
                        onAddDay={addDay}
                        onAddActivity={addActivity}
                        onRemoveDay={removeDay}
                        onRemoveActivity={removeActivity}
                        onDayActivitiesText={(d, text) => setDays(ds => ds.map((x, i) => i === d ? { ...x, activities: parseDayActivitiesText(text) } : x))}
                                onPickHotel={onAssignAccommodation}
                                defaultPage="detail"
                                focusDayIndex={selectedDayIndex}
                                showPageTabs={false}
                            />
                        </main>

                        <aside className="overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-xl:hidden">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">여행 요약</p>
                            <div className="mt-3 rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-[#0F8F84]">calendar_month</span>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400">여행 기간</p>
                                        <p className="text-xs font-black text-slate-800">{customer.period || customer.tripLength || '-'}</p>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-slate-50 p-2">
                                        <p className="text-[9px] font-bold text-slate-400">인원</p>
                                        <p className="mt-1 text-xs font-black text-slate-800">{customer.headcount || '-'}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-2">
                                        <p className="text-[9px] font-bold text-slate-400">총 금액</p>
                                        <p className="mt-1 text-xs font-black text-slate-800">{totalAmount ? `¥${totalAmount.toLocaleString()}` : '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-slate-800">현재 DAY</p>
                                    <span className="rounded-full bg-[#EAF8F7] px-2 py-1 text-[10px] font-black text-[#0F8F84]">DAY {selectedDay?.day || 0}</span>
                                </div>
                                <dl className="mt-3 space-y-2 text-[11px]">
                                    <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">지역</dt><dd className="truncate font-black text-slate-700">{selectedDay?.region || '미정'}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">주요 일정</dt><dd className="font-black text-slate-700">{selectedDay?.activities.length || 0}개</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">숙소</dt><dd className="truncate font-black text-slate-700">{dailyAccommodations?.find(item => item.day === selectedDay?.day)?.accommodation?.name || selectedDay?.accommodation?.name || '미정'}</dd></div>
                                </dl>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-200 p-3">
                                <p className="text-xs font-black text-slate-800">포함·불포함</p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-emerald-50 p-2 text-center">
                                        <p className="text-[9px] font-bold text-emerald-600">포함 사항</p>
                                        <p className="mt-1 text-lg font-black text-emerald-700">{includedCount}</p>
                                    </div>
                                    <div className="rounded-lg bg-rose-50 p-2 text-center">
                                        <p className="text-[9px] font-bold text-rose-500">불포함 사항</p>
                                        <p className="mt-1 text-lg font-black text-rose-600">{excludedCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {onAssignGuide && <button onClick={onAssignGuide} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-black text-slate-700 hover:border-[#39C4B7]">
                                    <span className="material-symbols-outlined text-[18px] text-[#0F8F84]">badge</span>{assignedGuide?.name || '담당 가이드 배정'}
                                </button>}
                                {onAssignAccommodation && selectedDay && <button onClick={() => onAssignAccommodation(selectedDay.day)} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-black text-slate-700 hover:border-[#39C4B7]">
                                    <span className="material-symbols-outlined text-[18px] text-[#0F8F84]">hotel</span>DAY {selectedDay.day} 숙소 배정
                                </button>}
                            </div>
                        </aside>
                    </div>
                    ) : (
                        <div className="h-full p-4">
                            <TemplatePreview
                                name={name}
                                description={description}
                                days={days}
                                documentSettings={docSettings}
                                customer={customer}
                                assignedGuide={assignedGuide}
                                dailyAccommodations={dailyAccommodations}
                                onNameChange={setName}
                                onDescriptionChange={setDescription}
                                onDocSection={updateDocSection}
                                onIncluded={updateIncluded}
                                onCancellation={updateCancellation}
                                onGuideNotice={updateGuideNotice}
                                onDayChange={updateDay}
                                onActivityChange={updateActivity}
                                onAddDay={addDay}
                                onAddActivity={addActivity}
                                onRemoveDay={removeDay}
                                onRemoveActivity={removeActivity}
                                onDayActivitiesText={(d, text) => setDays(ds => ds.map((x, i) => i === d ? { ...x, activities: parseDayActivitiesText(text) } : x))}
                                defaultPage="contract"
                                showPageTabs={false}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
