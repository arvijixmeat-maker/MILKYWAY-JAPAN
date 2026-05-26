import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';

// ─── Types ───────────────────────────────────────────────
type ActivityType = 'pickup' | 'transport' | 'meal' | 'sightseeing' | 'activity' | 'checkin' | 'free' | 'other';
interface Activity { time?: string; type?: ActivityType; title: string; description: string; }
interface TemplateDay { day: number; title: string; region?: string; activities: Activity[]; }
interface ItineraryTemplate { id: string; name: string; description: string; days: TemplateDay[]; createdAt: string; }

const ACTIVITY_TYPES: { id: ActivityType; label: string; icon: string }[] = [
    { id: 'pickup', label: '픽업', icon: 'flight_land' },
    { id: 'transport', label: '이동', icon: 'directions_car' },
    { id: 'meal', label: '식사', icon: 'restaurant' },
    { id: 'sightseeing', label: '관광', icon: 'photo_camera' },
    { id: 'activity', label: '체험', icon: 'sports_handball' },
    { id: 'checkin', label: '체크인', icon: 'hotel' },
    { id: 'free', label: '자유시간', icon: 'park' },
    { id: 'other', label: '기타', icon: 'more_horiz' },
];
const TYPE_MAP = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t]));

interface Guide {
    id: string; name: string; image: string; introduction: string;
    phone: string; languages: string[]; specialties: string[]; status: string; experienceYears: number;
}

interface Accommodation {
    id: string; name: string; images: string[]; description: string;
    type: string; location: string;
}

const LANGUAGES = ['한국어', '영어', '몽골어', '중국어', '일본어'];
const SPECIALTIES = ['고비사막', '홉스골', '테를지', '승마', '문화체험', '사진촬영'];
const ACCOM_TYPES = { '호텔': ['2성급 호텔', '3성급 호텔', '4성급 호텔', '5성급 호텔'], '게르': ['일반 게르', '고급 게르', '럭셔리 게르'], '게스트하우스': ['게스트하우스'] };

// ─── Live Preview (mini DocumentItinerary) ───────────────
const TemplatePreview: React.FC<{ name: string; description: string; days: TemplateDay[] }> = ({ name, description, days }) => (
    <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-4 h-full overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-5 text-white" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}>
                <p className="text-[10px] font-bold tracking-widest uppercase text-white/70 mb-1">고객 화면 미리보기</p>
                <h3 className="font-bold text-base leading-tight tracking-tight">{name || '템플릿 이름'}</h3>
                {description && <p className="text-xs text-white/80 mt-1.5">{description}</p>}
            </div>
            <div className="px-5 py-4">
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">日程 ({days.length}日間)</p>
                {days.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">일정이 비어있습니다</p>
                ) : (
                    <div className="space-y-4">
                        {days.map(d => (
                            <div key={d.day} className="grid grid-cols-[36px_1fr] gap-3">
                                <div>
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold tracking-tight shadow-md shadow-teal-500/30"
                                        style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>
                                        D-{d.day}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    {(d.title || d.region) && (
                                        <div className="mb-2">
                                            {d.region && <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">{d.region}</p>}
                                            {d.title && <p className="font-bold text-sm text-slate-900 dark:text-white">{d.title}</p>}
                                        </div>
                                    )}
                                    {d.activities.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic">활동이 비어있습니다</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {d.activities.map((a, i) => {
                                                const t = a.type ? TYPE_MAP[a.type] : null;
                                                return (
                                                    <li key={i} className="grid grid-cols-[40px_24px_1fr] gap-1.5 items-start">
                                                        <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{a.time || '--:--'}</span>
                                                        <span className="material-symbols-outlined text-teal-600 text-base mt-0.5">{t?.icon || 'check_circle'}</span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{a.title || '(활동 제목)'}</p>
                                                            {a.description && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{a.description}</p>}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
);

// ─── Tab: Itinerary Templates ────────────────────────────
const TemplatesTab: React.FC = () => {
    const [templates, setTemplates] = useState<ItineraryTemplate[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<ItineraryTemplate | null>(null);
    const [form, setForm] = useState<{ name: string; description: string; days: TemplateDay[] }>({ name: '', description: '', days: [] });
    const [quickDays, setQuickDays] = useState(4);
    const [bulkText, setBulkText] = useState('');

    const load = async () => {
        try {
            const data = await api.itineraryTemplates.list();
            if (Array.isArray(data)) {
                setTemplates(data.map((t: any) => ({
                    id: t.id, name: t.name, description: t.description || '',
                    days: typeof t.days === 'string' ? JSON.parse(t.days || '[]') : (t.days || []),
                    createdAt: t.created_at || t.createdAt
                })));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ name: '', description: '', days: [] }); setEditing(null); setBulkText(''); setQuickDays(4); };

    const inferActivityType = (text: string): ActivityType => {
        const value = text.toLowerCase();
        if (/(공항|픽업|도착|미팅|arrival|airport)/i.test(value)) return 'pickup';
        if (/(이동|출발|전용차|차량|버스|transfer|drive)/i.test(value)) return 'transport';
        if (/(식사|조식|중식|석식|점심|저녁|아침|meal|lunch|dinner|breakfast)/i.test(value)) return 'meal';
        if (/(숙박|호텔|게르|체크인|hotel|stay|check[-\s]?in)/i.test(value)) return 'checkin';
        if (/(체험|승마|낙타|트레킹|공연|activity|experience)/i.test(value)) return 'activity';
        if (/(자유|휴식|free)/i.test(value)) return 'free';
        return 'sightseeing';
    };

    const createBlankDays = () => {
        const count = Math.max(1, Math.min(30, quickDays || 1));
        setForm(f => ({
            ...f,
            days: Array.from({ length: count }, (_, idx) => ({
                day: idx + 1,
                title: f.days[idx]?.title || '',
                region: f.days[idx]?.region || '',
                activities: f.days[idx]?.activities || [],
            })),
        }));
    };

    const loadBulkSample = () => {
        setBulkText([
            'Day 1 울란바토르 도착',
            '10:00 공항 도착 - 가이드 미팅 후 전용차 이동',
            '12:30 점심 식사',
            '14:00 시내 관광 - 수흐바타르 광장, 국립역사박물관',
            '숙박: 울란바토르 호텔',
            '',
            'Day 2 테를지 국립공원',
            '09:00 호텔 출발 - 테를지 국립공원 이동',
            '11:00 거북바위 관광',
            '13:00 현지식 점심',
            '15:00 승마 체험',
            '숙박: 게르 캠프',
        ].join('\n'));
    };

    const importBulkText = () => {
        const lines = bulkText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) {
            alert('붙여넣을 일정표 내용을 입력해 주세요.');
            return;
        }

        const parsedDays: TemplateDay[] = [];
        let currentDay: TemplateDay | null = null;
        const commitDay = () => {
            if (currentDay) parsedDays.push(currentDay);
        };

        lines.forEach(line => {
            const dayMatch = line.match(/^(?:day|d)[-\s]*(\d+)\s*[:.)-]?\s*(.*)$/i) || line.match(/^(\d+)\s*일차\s*[:.)-]?\s*(.*)$/);
            if (dayMatch) {
                commitDay();
                currentDay = { day: parsedDays.length + 1, title: dayMatch[2]?.trim() || '', region: '', activities: [] };
                return;
            }

            if (!currentDay) {
                currentDay = { day: 1, title: '', region: '', activities: [] };
            }

            const stayMatch = line.match(/^(숙박|宿泊|hotel|stay)\s*[:：]\s*(.+)$/i);
            if (stayMatch) {
                const title = stayMatch[2].trim();
                currentDay.activities.push({ time: '', type: 'checkin', title, description: '숙박' });
                return;
            }

            const activityMatch = line.match(/^(\d{1,2}:\d{2})\s+(.+?)(?:\s*[-–]\s*(.+))?$/);
            if (activityMatch) {
                const title = activityMatch[2].trim();
                const description = activityMatch[3]?.trim() || '';
                currentDay.activities.push({
                    time: activityMatch[1],
                    type: inferActivityType(`${title} ${description}`),
                    title,
                    description,
                });
                return;
            }

            if (!currentDay.title) {
                currentDay.title = line;
            } else {
                currentDay.activities.push({ time: '', type: inferActivityType(line), title: line, description: '' });
            }
        });

        commitDay();
        const days = parsedDays.map((day, idx) => ({ ...day, day: idx + 1 }));
        setForm(f => ({ ...f, days }));
    };

    // Day operations
    const addDay = () => setForm(f => ({ ...f, days: [...f.days, { day: f.days.length + 1, title: '', region: '', activities: [] }] }));
    const removeDay = (idx: number) => setForm(f => ({ ...f, days: f.days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1 })) }));
    const updateDay = (idx: number, field: keyof TemplateDay, value: any) => setForm(f => { const d = [...f.days]; d[idx] = { ...d[idx], [field]: value }; return { ...f, days: d }; });
    const moveDay = (idx: number, dir: -1 | 1) => setForm(f => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= f.days.length) return f;
        const d = [...f.days];
        [d[idx], d[newIdx]] = [d[newIdx], d[idx]];
        return { ...f, days: d.map((x, i) => ({ ...x, day: i + 1 })) };
    });
    const duplicateDay = (idx: number) => setForm(f => {
        const src = f.days[idx];
        const copy = { ...src, activities: src.activities.map(a => ({ ...a })) };
        const d = [...f.days.slice(0, idx + 1), copy, ...f.days.slice(idx + 1)];
        return { ...f, days: d.map((x, i) => ({ ...x, day: i + 1 })) };
    });

    // Activity operations
    const addActivity = (dayIdx: number) => setForm(f => { const d = [...f.days]; d[dayIdx].activities = [...d[dayIdx].activities, { time: '', type: 'sightseeing', title: '', description: '' }]; return { ...f, days: d }; });
    const removeActivity = (dayIdx: number, actIdx: number) => setForm(f => { const d = [...f.days]; d[dayIdx].activities = d[dayIdx].activities.filter((_, i) => i !== actIdx); return { ...f, days: d }; });
    const updateActivity = (dayIdx: number, actIdx: number, field: keyof Activity, value: any) => setForm(f => { const d = [...f.days]; d[dayIdx].activities[actIdx] = { ...d[dayIdx].activities[actIdx], [field]: value }; return { ...f, days: d }; });
    const moveActivity = (dayIdx: number, actIdx: number, dir: -1 | 1) => setForm(f => {
        const acts = [...f.days[dayIdx].activities];
        const newIdx = actIdx + dir;
        if (newIdx < 0 || newIdx >= acts.length) return f;
        [acts[actIdx], acts[newIdx]] = [acts[newIdx], acts[actIdx]];
        const d = [...f.days];
        d[dayIdx] = { ...d[dayIdx], activities: acts };
        return { ...f, days: d };
    });
    const sortByTime = (dayIdx: number) => setForm(f => {
        const acts = [...f.days[dayIdx].activities].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const d = [...f.days];
        d[dayIdx] = { ...d[dayIdx], activities: acts };
        return { ...f, days: d };
    });

    const handleSubmit = async () => {
        if (!form.name.trim()) { alert('템플릿 이름을 입력하세요.'); return; }
        try {
            if (editing) { await api.itineraryTemplates.update(editing.id, form); }
            else { await api.itineraryTemplates.create(form); }
            await load(); setIsModalOpen(false); resetForm();
        } catch (e: any) { alert('저장 실패: ' + e.message); }
    };

    const handleEdit = (t: ItineraryTemplate) => { setEditing(t); setForm({ name: t.name, description: t.description, days: t.days }); setIsModalOpen(true); };
    const handleDelete = async (id: string) => { if (!confirm('삭제하시겠습니까?')) return; try { await api.itineraryTemplates.delete(id); await load(); } catch (e: any) { alert('삭제 실패'); } };
    const handleDuplicate = (t: ItineraryTemplate) => {
        setEditing(null);
        setForm({
            name: `${t.name} (복사본)`,
            description: t.description,
            days: t.days.map(d => ({ ...d, activities: d.activities.map(a => ({ ...a })) })),
        });
        setIsModalOpen(true);
    };

    const closeEditor = () => {
        if (form.name || form.days.length > 0) {
            if (!confirm('편집 중인 내용이 사라집니다. 닫으시겠습니까?')) return;
        }
        setIsModalOpen(false); resetForm();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">예약에 적용할 일정 템플릿을 미리 작성합니다.</p>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-sm">add</span> 템플릿 추가
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <span className="material-symbols-outlined text-5xl mb-2">event_note</span>
                    <p>등록된 템플릿이 없습니다</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(t => (
                        <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-800 dark:text-white truncate">{t.name}</h3>
                                    {t.description && <p className="text-sm text-slate-500 mt-0.5 truncate">{t.description}</p>}
                                </div>
                                <span className="px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-600 text-xs font-bold rounded-lg flex-shrink-0 ml-2">{t.days.length}일</span>
                            </div>
                            <div className="space-y-1 mb-4">
                                {t.days.slice(0, 3).map(d => (
                                    <div key={d.day} className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="w-10 px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded font-bold text-center">{d.day}일차</span>
                                        <span className="truncate">{d.region ? `${d.region} · ` : ''}{d.title || '제목 없음'}</span>
                                        <span className="text-slate-300 flex-shrink-0">({d.activities.length})</span>
                                    </div>
                                ))}
                                {t.days.length > 3 && <p className="text-xs text-slate-400 pl-12">+ {t.days.length - 3}일 더...</p>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(t)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium">수정</button>
                                <button onClick={() => handleDuplicate(t)} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium inline-flex items-center gap-1" title="이 템플릿 복제">
                                    <span className="material-symbols-outlined text-sm">content_copy</span>복제
                                </button>
                                <button onClick={() => handleDelete(t.id)} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-sm font-medium" title="삭제">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 p-3 sm:p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl">

                        {/* Sticky header */}
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button onClick={closeEditor} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{editing ? '템플릿 수정' : '새 템플릿'}</p>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="템플릿 이름 (예: 고비사막 4박5일 기본형)"
                                        className="w-full text-lg font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={closeEditor} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">취소</button>
                                <button onClick={handleSubmit} className="px-5 py-2 text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-lg inline-flex items-center gap-1.5 shadow-md shadow-teal-500/20">
                                    <span className="material-symbols-outlined text-base">check</span>{editing ? '저장' : '생성'}
                                </button>
                            </div>
                        </div>

                        {/* Body: editor + preview */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_440px] overflow-hidden">

                            {/* Editor */}
                            <div className="overflow-y-auto px-6 py-5 bg-slate-50/50 dark:bg-slate-950/30">

                                {/* Description */}
                                <div className="mb-5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">설명 (선택)</label>
                                    <input
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="이 템플릿이 어떤 일정인지 한 줄 설명"
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>

                                {/* Quick builder */}
                                <div className="mb-5 grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-3">
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <span className="material-symbols-outlined text-teal-600">auto_awesome</span>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">빠른 골격 만들기</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">먼저 여행 일수만 만들고 세부 일정은 아래에서 채웁니다.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                max={30}
                                                value={quickDays}
                                                onChange={e => setQuickDays(Number(e.target.value))}
                                                className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-500">일</span>
                                            <button onClick={createBlankDays} className="ml-auto px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">calendar_add_on</span>골격 생성
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined text-teal-600">content_paste_go</span>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">일정표 원문 붙여넣기</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">Day 1, 1일차, 10:00 일정 - 상세내용 형식을 자동으로 읽습니다.</p>
                                                </div>
                                            </div>
                                            <button onClick={loadBulkSample} className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg text-xs font-bold">
                                                예시
                                            </button>
                                        </div>
                                        <textarea
                                            value={bulkText}
                                            onChange={e => setBulkText(e.target.value)}
                                            rows={6}
                                            placeholder={'Day 1 울란바토르 도착\n10:00 공항 도착 - 가이드 미팅\n12:30 점심 식사\n숙박: 울란바토르 호텔\n\nDay 2 테를지 국립공원'}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <p className="text-[11px] text-slate-400">붙여넣기 후 자동 생성하고, 부족한 부분만 아래에서 수정하세요.</p>
                                            <button onClick={importBulkText} className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 flex-shrink-0">
                                                <span className="material-symbols-outlined text-sm">bolt</span>일정 자동 생성
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Days */}
                                <div className="mb-3 flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">일정 ({form.days.length}일)</label>
                                    <button onClick={addDay} className="text-xs px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold inline-flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">add</span>일차 추가
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {form.days.map((day, dayIdx) => (
                                        <div key={dayIdx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                            {/* Day header */}
                                            <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 grid grid-cols-[auto_120px_1fr_auto] gap-2 items-center">
                                                <span className="px-2 py-1 bg-teal-500 text-white text-[10px] font-bold rounded">D-{day.day}</span>
                                                <input
                                                    value={day.region || ''}
                                                    onChange={e => updateDay(dayIdx, 'region', e.target.value)}
                                                    placeholder="지역"
                                                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                />
                                                <input
                                                    value={day.title}
                                                    onChange={e => updateDay(dayIdx, 'title', e.target.value)}
                                                    placeholder="일차 제목 (예: 울란바토르 도착 & 시내 투어)"
                                                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                />
                                                <div className="flex items-center gap-0.5">
                                                    <button onClick={() => moveDay(dayIdx, -1)} disabled={dayIdx === 0} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-default" title="위로">
                                                        <span className="material-symbols-outlined text-base">arrow_upward</span>
                                                    </button>
                                                    <button onClick={() => moveDay(dayIdx, 1)} disabled={dayIdx === form.days.length - 1} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-default" title="아래로">
                                                        <span className="material-symbols-outlined text-base">arrow_downward</span>
                                                    </button>
                                                    <button onClick={() => duplicateDay(dayIdx)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30" title="이 일차 복제">
                                                        <span className="material-symbols-outlined text-base">content_copy</span>
                                                    </button>
                                                    <button onClick={() => removeDay(dayIdx)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50" title="삭제">
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Activities */}
                                            <div className="p-2 space-y-1.5">
                                                {day.activities.map((act, actIdx) => {
                                                    const t = act.type ? TYPE_MAP[act.type] : null;
                                                    return (
                                                        <div key={actIdx} className="grid grid-cols-[60px_120px_1fr_auto] gap-1.5 items-start bg-slate-50/50 dark:bg-slate-700/20 rounded-lg p-1.5">
                                                            <input
                                                                type="time"
                                                                value={act.time || ''}
                                                                onChange={e => updateActivity(dayIdx, actIdx, 'time', e.target.value)}
                                                                className="px-1.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 text-center"
                                                            />
                                                            <select
                                                                value={act.type || 'other'}
                                                                onChange={e => updateActivity(dayIdx, actIdx, 'type', e.target.value)}
                                                                className="px-1.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                            >
                                                                {ACTIVITY_TYPES.map(opt => (
                                                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                                ))}
                                                            </select>
                                                            <div className="space-y-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    {t && <span className="material-symbols-outlined text-teal-600 text-base flex-shrink-0">{t.icon}</span>}
                                                                    <input
                                                                        value={act.title}
                                                                        onChange={e => updateActivity(dayIdx, actIdx, 'title', e.target.value)}
                                                                        placeholder="활동 제목"
                                                                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                                    />
                                                                </div>
                                                                <input
                                                                    value={act.description}
                                                                    onChange={e => updateActivity(dayIdx, actIdx, 'description', e.target.value)}
                                                                    placeholder="세부 내용 (선택)"
                                                                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <button onClick={() => moveActivity(dayIdx, actIdx, -1)} disabled={actIdx === 0} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-default" title="위로">
                                                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                                </button>
                                                                <button onClick={() => moveActivity(dayIdx, actIdx, 1)} disabled={actIdx === day.activities.length - 1} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-default" title="아래로">
                                                                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                                </button>
                                                                <button onClick={() => removeActivity(dayIdx, actIdx)} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50" title="삭제">
                                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div className="flex items-center gap-2 pt-1">
                                                    <button onClick={() => addActivity(dayIdx)} className="text-xs text-teal-500 hover:text-teal-600 inline-flex items-center gap-1 font-semibold">
                                                        <span className="material-symbols-outlined text-sm">add</span>활동 추가
                                                    </button>
                                                    {day.activities.length > 1 && (
                                                        <button onClick={() => sortByTime(dayIdx)} className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 font-semibold ml-auto" title="시간 순으로 정렬">
                                                            <span className="material-symbols-outlined text-sm">sort</span>시간순 정렬
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {form.days.length === 0 && (
                                        <button onClick={addDay} className="w-full py-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 hover:text-teal-500 hover:border-teal-400 hover:bg-teal-50/30 transition-colors flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-2xl">add_circle</span>
                                            <span className="text-sm font-semibold">첫 번째 일차 추가</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Live preview */}
                            <div className="hidden lg:block border-l border-slate-200 dark:border-slate-800 overflow-hidden p-4 bg-white dark:bg-slate-900">
                                <TemplatePreview name={form.name} description={form.description} days={form.days} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Tab: Guides ─────────────────────────────────────────
const GuidesTab: React.FC = () => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Guide | null>(null);
    const [form, setForm] = useState({ name: '', image: '', introduction: '', phone: '', experienceYears: 0, languages: [] as string[], specialties: [] as string[] });

    const load = async () => {
        try {
            const data = await api.tourGuides.list();
            if (Array.isArray(data)) setGuides(data.map((g: any) => ({
                id: g.id, name: g.name, image: g.image || '', introduction: g.bio || g.introduction || '',
                phone: g.phone || '', languages: typeof g.languages === 'string' ? JSON.parse(g.languages || '[]') : (g.languages || []),
                specialties: typeof g.specialties === 'string' ? JSON.parse(g.specialties || '[]') : (g.specialties || []),
                status: g.status || 'active', experienceYears: g.experience_years || 0,
            })));
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ name: '', image: '', introduction: '', phone: '', experienceYears: 0, languages: [], specialties: [] }); setEditing(null); };
    const toggle = (field: 'languages' | 'specialties', val: string) => setForm(f => ({ ...f, [field]: f[field].includes(val) ? f[field].filter(v => v !== val) : [...f[field], val] }));

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        try { const url = await uploadImage(file, 'guides'); setForm(f => ({ ...f, image: url })); } catch { alert('이미지 업로드 실패'); }
    };

    const handleSubmit = async () => {
        if (!form.name || !form.phone) { alert('이름과 연락처는 필수입니다.'); return; }
        try {
            const payload = { name: form.name, bio: form.introduction, phone: form.phone, image: form.image, experience_years: form.experienceYears, languages: form.languages, specialties: form.specialties };
            if (editing) { await api.tourGuides.update(editing.id, { ...payload, status: editing.status }); }
            else { await api.tourGuides.create({ ...payload, status: 'active' }); }
            await load(); setIsModalOpen(false); resetForm();
        } catch (e: any) { alert('저장 실패: ' + e.message); }
    };

    const handleApprove = async (g: Guide) => {
        try { await api.tourGuides.update(g.id, { name: g.name, bio: g.introduction, phone: g.phone, image: g.image, experience_years: g.experienceYears, languages: g.languages, specialties: g.specialties, status: 'active' }); await load(); }
        catch (e: any) { alert('승인 실패'); }
    };

    const handleDelete = async (id: string) => { if (!confirm('삭제하시겠습니까?')) return; try { await api.tourGuides.delete(id); await load(); } catch { alert('삭제 실패'); } };

    const pendingCount = guides.filter(g => g.status === 'pending').length;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">가이드를 등록하고 관리합니다.</p>
                    {pendingCount > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">승인대기 {pendingCount}</span>}
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-sm">add</span> 가이드 등록
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {guides.map(g => (
                    <div key={g.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-[72px_1fr_auto] gap-4 items-center">
                        <div className="relative w-18 h-18 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0" style={{ width: 72, height: 72 }}>
                            {g.image ? <img src={g.image} alt={g.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-3xl text-slate-300">person</span></div>}
                            {g.status === 'pending' && <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded">대기</span>}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-bold text-slate-800 dark:text-white truncate">{g.name}</h3>
                                {g.experienceYears > 0 && <span className="text-[11px] text-slate-500 inline-flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">workspace_premium</span>{g.experienceYears}년</span>}
                                <span className="text-[11px] text-slate-400 font-mono inline-flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">phone</span>{g.phone}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">{g.introduction || '소개글 없음'}</p>
                            {g.languages.length > 0 && <div className="flex flex-wrap gap-1">{g.languages.map(l => <span key={l} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-semibold rounded">{l}</span>)}</div>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {g.status === 'pending' && <button onClick={() => handleApprove(g)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold">승인</button>}
                            <button onClick={() => { setEditing(g); setForm({ name: g.name, image: g.image, introduction: g.introduction, phone: g.phone, experienceYears: g.experienceYears, languages: g.languages, specialties: g.specialties }); setIsModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" title="수정"><span className="material-symbols-outlined text-base">edit</span></button>
                            <button onClick={() => handleDelete(g.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500" title="삭제"><span className="material-symbols-outlined text-base">delete</span></button>
                        </div>
                    </div>
                ))}
                {guides.length === 0 && <div className="col-span-full text-center py-20 text-slate-400"><span className="material-symbols-outlined text-5xl mb-2">person_off</span><p>등록된 가이드가 없습니다</p></div>}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 dark:text-white">{editing ? '가이드 수정' : '가이드 등록'}</h2>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }}><span className="material-symbols-outlined text-slate-400">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    {form.image ? <img src={form.image} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-3xl text-slate-300">person</span>}
                                </div>
                                <label className="cursor-pointer px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                                    사진 선택 <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">이름 *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">연락처 *</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">경력 연수</label><div className="flex items-center gap-2"><input type="number" min={0} value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: Number(e.target.value) }))} className="w-24 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-center" /><span className="text-sm text-slate-500">년</span></div></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">소개글</label><textarea value={form.introduction} onChange={e => setForm(f => ({ ...f, introduction: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">언어</label><div className="flex flex-wrap gap-2">{LANGUAGES.map(l => <button key={l} type="button" onClick={() => toggle('languages', l)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.languages.includes(l) ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{l}</button>)}</div></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">전문 분야</label><div className="flex flex-wrap gap-2">{SPECIALTIES.map(s => <button key={s} type="button" onClick={() => toggle('specialties', s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.specialties.includes(s) ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{s}</button>)}</div></div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium">취소</button>
                                <button onClick={handleSubmit} className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold">{editing ? '수정' : '등록'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Tab: Accommodations ─────────────────────────────────
const AccommodationsTab: React.FC = () => {
    const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Accommodation | null>(null);
    const [form, setForm] = useState({ name: '', images: [] as string[], description: '', type: '3성급 호텔', location: '' });

    const load = async () => {
        try {
            const data = await api.accommodations.list();
            if (Array.isArray(data)) setAccommodations(data.map((a: any) => ({
                id: a.id, name: a.name, images: typeof a.images === 'string' ? JSON.parse(a.images || '[]') : (a.images || []),
                description: a.description || '', type: a.type || '', location: a.location || '',
            })));
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ name: '', images: [], description: '', type: '3성급 호텔', location: '' }); setEditing(null); };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files; if (!files) return;
        try { const urls = await Promise.all(Array.from(files).map(f => uploadImage(f, 'accommodations'))); setForm(f => ({ ...f, images: [...f.images, ...urls] })); }
        catch { alert('이미지 업로드 실패'); }
    };

    const handleSubmit = async () => {
        if (!form.name || !form.location) { alert('숙소명과 위치는 필수입니다.'); return; }
        try {
            const payload = { name: form.name, images: form.images, description: form.description, type: form.type, location: form.location };
            if (editing) { await api.accommodations.update(editing.id, payload); }
            else { await api.accommodations.create({ ...payload, id: `ACCOM-${Date.now()}` }); }
            await load(); setIsModalOpen(false); resetForm();
        } catch (e: any) { alert('저장 실패: ' + e.message); }
    };

    const handleDelete = async (id: string) => { if (!confirm('삭제하시겠습니까?')) return; try { await api.accommodations.delete(id); await load(); } catch { alert('삭제 실패'); } };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">숙소를 등록하고 예약에 배정합니다.</p>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-sm">add</span> 숙소 등록
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {accommodations.map(a => (
                    <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-[96px_1fr_auto] gap-4 items-center">
                        <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0" style={{ width: 96, height: 72 }}>
                            {a.images.length > 0 ? <img src={a.images[0]} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-3xl text-slate-300">hotel</span></div>}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-bold text-slate-800 dark:text-white truncate">{a.name}</h3>
                                {a.type && <span className="px-1.5 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 text-[10px] font-semibold rounded">{a.type}</span>}
                            </div>
                            <div className="text-[11px] text-slate-500 mb-1 inline-flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">location_on</span>{a.location}</div>
                            <p className="text-xs text-slate-500 line-clamp-1">{a.description || '설명 없음'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => { setEditing(a); setForm({ name: a.name, images: a.images, description: a.description, type: a.type, location: a.location }); setIsModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" title="수정"><span className="material-symbols-outlined text-base">edit</span></button>
                            <button onClick={() => handleDelete(a.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500" title="삭제"><span className="material-symbols-outlined text-base">delete</span></button>
                        </div>
                    </div>
                ))}
                {accommodations.length === 0 && <div className="col-span-full text-center py-20 text-slate-400"><span className="material-symbols-outlined text-5xl mb-2">hotel</span><p>등록된 숙소가 없습니다</p></div>}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 dark:text-white">{editing ? '숙소 수정' : '숙소 등록'}</h2>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }}><span className="material-symbols-outlined text-slate-400">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">이미지</label>
                                {form.images.length > 0 && <div className="grid grid-cols-3 gap-2 mb-2">{form.images.map((img, i) => <div key={i} className="relative aspect-video"><img src={img} className="w-full h-full object-cover rounded-lg" /><button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><span className="material-symbols-outlined text-xs">close</span></button></div>)}</div>}
                                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="text-sm" />
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">숙소명 *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">위치 *</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="예: 울란바토르 시내, 테를지 국립공원" /></div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">숙소 타입</label>
                                {Object.entries(ACCOM_TYPES).map(([cat, subs]) => (
                                    <div key={cat} className="mb-3">
                                        <p className="text-xs font-semibold text-slate-500 mb-1.5">{cat}</p>
                                        <div className="grid grid-cols-2 gap-2">{subs.map(s => <button key={s} type="button" onClick={() => setForm(f => ({ ...f, type: s }))} className={`py-2 rounded-lg text-sm font-medium transition-all ${form.type === s ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{s}</button>)}</div>
                                    </div>
                                ))}
                            </div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">설명</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium">취소</button>
                                <button onClick={handleSubmit} className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold">{editing ? '수정' : '등록'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────
const TABS = [
    { id: 'templates', label: '일정 템플릿', icon: 'event_note' },
    { id: 'guides', label: '가이드 관리', icon: 'badge' },
    { id: 'accommodations', label: '숙소 관리', icon: 'hotel' },
];

export const AdminTemplateManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [activeTab, setActiveTab] = useState('templates');

    const toggleTheme = () => { setIsDarkMode(!isDarkMode); document.documentElement.classList.toggle('dark'); };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            <AdminSidebar activePage="templates" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center">
                    <h1 className="text-xl font-bold">템플릿 관리</h1>
                </header>

                <div className="px-8 pt-6">
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit mb-6">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="pb-8">
                        {activeTab === 'templates' && <TemplatesTab />}
                        {activeTab === 'guides' && <GuidesTab />}
                        {activeTab === 'accommodations' && <AccommodationsTab />}
                    </div>
                </div>
            </main>
        </div>
    );
};
