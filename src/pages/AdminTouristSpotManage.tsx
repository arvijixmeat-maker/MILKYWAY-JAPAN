import React, { useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';
import type { TouristSpot } from '../types/touristSpot';

const EMPTY_SPOT: TouristSpot = {
    id: '',
    name_kr: '',
    name_local: '',
    address: '',
    description: '',
    images: [],
    is_active: true,
};

/**
 * Admin page for the tourist spot master library.
 * Same shape as AdminHotelManage. Picking from a TIMELINE block's
 * "관광지에서 선택" button populates that block's title / description /
 * images automatically.
 */
export const AdminTouristSpotManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const toggleTheme = () => {
        setIsDarkMode((v) => !v);
        document.documentElement.classList.toggle('dark');
    };

    const [spots, setSpots] = useState<TouristSpot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [q, setQ] = useState('');
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

    const [editing, setEditing] = useState<TouristSpot | null>(null);
    const [isNew, setIsNew] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.touristSpots.list({ active: false });
            setSpots(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Tourist spot list load failed:', e);
            setSpots([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        return spots.filter((s) => {
            if (filterActive === 'active' && !s.is_active) return false;
            if (filterActive === 'inactive' && s.is_active) return false;
            if (q) {
                const needle = q.toLowerCase();
                const hay = `${s.name_kr} ${s.name_local || ''}`.toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [spots, q, filterActive]);

    const startNew = () => {
        setEditing({ ...EMPTY_SPOT });
        setIsNew(true);
    };

    const startEdit = (s: TouristSpot) => {
        setEditing({ ...s });
        setIsNew(false);
    };

    const handleSave = async () => {
        if (!editing) return;
        if (!editing.name_kr.trim()) {
            alert('한글 명칭은 필수입니다.');
            return;
        }
        setSaving(true);
        try {
            if (isNew) {
                await api.touristSpots.create(editing);
            } else {
                await api.touristSpots.update(editing.id, editing);
            }
            await load();
            setEditing(null);
            setIsNew(false);
        } catch (e: any) {
            alert('저장 실패: ' + (e?.message || '알 수 없는 오류'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editing || isNew) return;
        if (!confirm(`"${editing.name_kr}" 관광지를 삭제하시겠습니까?\n\n이 관광지를 사용 중인 상품의 일정에는 영향이 없습니다(스냅샷으로 저장되어 있음).`)) return;
        try {
            await api.touristSpots.delete(editing.id);
            await load();
            setEditing(null);
        } catch (e: any) {
            alert('삭제 실패: ' + (e?.message || '알 수 없는 오류'));
        }
    };

    const handleAddImages = async (files: FileList | null) => {
        if (!files || !editing) return;
        try {
            const urls = await Promise.all(
                Array.from(files)
                    .filter((f) => f.type.startsWith('image/'))
                    .map((f) => uploadImage(f, 'tourist-spots'))
            );
            setEditing({ ...editing, images: [...(editing.images || []), ...urls] });
        } catch (e) {
            console.error(e);
            alert('이미지 업로드 실패');
        }
    };

    const removeImage = (idx: number) => {
        if (!editing) return;
        const next = (editing.images || []).filter((_, i) => i !== idx);
        setEditing({ ...editing, images: next });
    };

    return (
        <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans ${isDarkMode ? 'dark' : ''}`}>
            <AdminSidebar activePage="tourist-spots" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">관광지 마스터</h1>
                    <button
                        type="button"
                        onClick={startNew}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        관광지 추가
                    </button>
                </header>

                <div className="flex-1 p-8 flex gap-6 min-h-0">
                    {/* LEFT: List */}
                    <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-wrap">
                            <input
                                type="text"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="관광지명으로 검색"
                                className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500 dark:text-slate-400">사용여부:</span>
                                {([
                                    { v: 'all', l: '전체' },
                                    { v: 'active', l: '사용중' },
                                    { v: 'inactive', l: '미사용' },
                                ] as const).map((opt) => (
                                    <button
                                        key={opt.v}
                                        type="button"
                                        onClick={() => setFilterActive(opt.v)}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${filterActive === opt.v
                                            ? 'bg-teal-500 border-teal-500 text-white'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {opt.l}
                                    </button>
                                ))}
                            </div>
                            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                                전체 {spots.length}개 중 <strong className="text-slate-900 dark:text-white">{filtered.length}</strong>개 표시
                            </span>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {loading ? (
                                <div className="py-20 text-center text-slate-500">불러오는 중...</div>
                            ) : filtered.length === 0 ? (
                                <div className="py-20 text-center text-slate-500">
                                    {spots.length === 0 ? '아직 등록된 관광지가 없습니다. 우상단 "관광지 추가" 버튼으로 시작하세요.' : '조건에 맞는 관광지가 없습니다.'}
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                                        <tr className="text-xs text-slate-500 dark:text-slate-400">
                                            <th className="text-left px-4 py-3 font-medium w-20">대표</th>
                                            <th className="text-left px-4 py-3 font-medium">관광지명</th>
                                            <th className="text-left px-4 py-3 font-medium">주소</th>
                                            <th className="text-center px-4 py-3 font-medium w-20">사진</th>
                                            <th className="text-center px-4 py-3 font-medium w-24">사용</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((s) => {
                                            const thumb = (s.images || []).find((url) => !!url);
                                            return (
                                                <tr
                                                    key={s.id}
                                                    onClick={() => startEdit(s)}
                                                    className={`border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-teal-50/40 dark:hover:bg-teal-900/20 transition-colors ${editing?.id === s.id ? 'bg-teal-50/60 dark:bg-teal-900/30' : ''
                                                        }`}
                                                >
                                                    <td className="px-4 py-2">
                                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                            {thumb ? (
                                                                <img
                                                                    src={thumb}
                                                                    alt={s.name_kr}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="material-symbols-outlined text-slate-400 text-base">image</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        {s.name_kr}
                                                        {s.name_local && (
                                                            <span className="ml-2 text-xs font-normal text-slate-500">{s.name_local}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                                                        {s.address || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                                                        {(s.images || []).length}장
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${s.is_active
                                                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                                            : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                                            }`}>
                                                            {s.is_active ? 'Y' : 'N'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Detail editor */}
                    {editing ? (
                        <div className="w-[520px] flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="font-bold text-slate-800 dark:text-white">
                                    {isNew ? '새 관광지 등록' : '관광지 정보 수정'}
                                </h2>
                                <div className="flex gap-2">
                                    {!isNew && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        >
                                            삭제
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setEditing(null); setIsNew(false); }}
                                        className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                    >
                                        닫기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-1.5 text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {saving ? '저장 중...' : '저장'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-4 space-y-3">
                                <Field label="명칭 (한글)" required hint="이 이름이 일정의 제목으로 자동 입력됩니다.">
                                    <input
                                        type="text"
                                        value={editing.name_kr}
                                        onChange={(e) => setEditing({ ...editing, name_kr: e.target.value })}
                                        placeholder="테렐지 국립공원"
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label="명칭 (현지/영문)">
                                    <input
                                        type="text"
                                        value={editing.name_local || ''}
                                        onChange={(e) => setEditing({ ...editing, name_local: e.target.value })}
                                        placeholder="Gorkhi-Terelj National Park (선택)"
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label="주소">
                                    <input
                                        type="text"
                                        value={editing.address || ''}
                                        onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                                        placeholder="울란바토르 동북쪽 70km (선택)"
                                        className={inputCls}
                                    />
                                </Field>

                                <Field
                                    label="상세 설명"
                                    hint="이 내용이 일정 항목의 설명으로 자동 입력됩니다."
                                >
                                    <textarea
                                        value={editing.description || ''}
                                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                        rows={5}
                                        placeholder="관광지 소개, 볼거리, 추천 사항 등..."
                                        className={`${inputCls} resize-y min-h-[120px]`}
                                    />
                                </Field>

                                <Field
                                    label="이미지"
                                    hint="이 사진들이 일정 항목의 사진으로 자동 첨부됩니다."
                                >
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-3 gap-2">
                                            {(editing.images || []).map((src, i) => (
                                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(i)}
                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 text-white text-xs flex items-center justify-center"
                                                        title="삭제"
                                                    >
                                                        ×
                                                    </button>
                                                    {i === 0 && (
                                                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-teal-500 text-white text-[10px] font-bold">
                                                            대표
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            <label className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-900/20 transition-colors">
                                                <span className="material-symbols-outlined text-slate-400">add_photo_alternate</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => {
                                                        handleAddImages(e.target.files);
                                                        e.target.value = '';
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </Field>

                                <Field label="사용 여부">
                                    <div className="flex gap-2">
                                        {([
                                            { v: true, l: '사용 (목록에 노출)' },
                                            { v: false, l: '미사용 (숨김)' },
                                        ] as const).map((opt) => (
                                            <button
                                                key={String(opt.v)}
                                                type="button"
                                                onClick={() => setEditing({ ...editing, is_active: opt.v })}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${editing.is_active === opt.v
                                                    ? 'bg-teal-500 border-teal-500 text-white'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                            </div>
                        </div>
                    ) : (
                        <div className="w-[520px] flex-shrink-0 flex items-center justify-center text-center p-8 text-slate-500 dark:text-slate-400">
                            <div>
                                <div className="text-5xl mb-3 opacity-60">📍</div>
                                <p className="text-sm">왼쪽에서 관광지를 선택하거나 우상단 "관광지 추가" 버튼을 누르세요.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const inputCls =
    'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none';

const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({
    label,
    required,
    hint,
    children,
}) => (
    <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
);
