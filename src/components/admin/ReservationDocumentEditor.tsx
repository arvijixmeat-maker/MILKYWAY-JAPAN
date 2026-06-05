import React, { useEffect, useState } from 'react';
import {
    TemplatePreview,
    mergeDocumentSettings,
    defaultDocumentSettings,
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
    /** 실제 고객 데이터 — TemplatePreview 상단/금액에 자동 표시 */
    customer: {
        tripNumber?: string;
        period?: string;
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
}

export const ReservationDocumentEditor: React.FC<Props> = ({ open, onClose, title, customer, initialContent, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [days, setDays] = useState<TemplateDay[]>([]);
    const [docSettings, setDocSettings] = useState<DocumentSettings>(defaultDocumentSettings());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(initialContent?.name || customer.tripType || '');
        setDescription(initialContent?.description || '');
        setDays(Array.isArray(initialContent?.days) ? initialContent!.days : []);
        setDocSettings(mergeDocumentSettings(initialContent?.documentSettings));
    }, [open, initialContent]);

    // ── Day / activity 핸들러 ──
    const updateDay = (idx: number, field: 'title' | 'region', value: string) =>
        setDays(d => d.map((x, i) => i === idx ? { ...x, [field]: value } : x));
    const addDay = () => setDays(d => [...d, { day: d.length + 1, title: '', region: '', activities: [] }]);
    const removeDay = (idx: number) => setDays(d => d.filter((_, i) => i !== idx).map((x, i) => ({ ...x, day: i + 1 })));
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

    return (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm p-3 sm:p-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl">
                <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
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
                <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
                    <TemplatePreview
                        name={name}
                        description={description}
                        days={days}
                        documentSettings={docSettings}
                        customer={customer}
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
                    />
                </div>
            </div>
        </div>
    );
};
