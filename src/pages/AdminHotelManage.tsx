import React, { useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { api } from '../lib/api';
import { uploadImage } from '../utils/upload';
import type { Hotel } from '../types/hotel';

const EMPTY_HOTEL: Hotel = {
    id: '',
    code: '',
    name_kr: '',
    name_local: '',
    country: '',
    city: '',
    region: '',
    star_rating: 0,
    address: '',
    latitude: null,
    longitude: null,
    description: '',
    website: '',
    images: [],
    amenities: [],
    is_active: true,
};

/**
 * Admin page for the hotel master library.
 * Left side = filterable list. Right side = detail editor.
 * The "가져오기" button in the itinerary editor opens a similar list as a modal.
 */
export const AdminHotelManage: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const toggleTheme = () => {
        setIsDarkMode((v) => !v);
        document.documentElement.classList.toggle('dark');
    };

    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters
    const [q, setQ] = useState('');
    const [filterCountry, setFilterCountry] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

    // Selected hotel (right pane)
    const [editing, setEditing] = useState<Hotel | null>(null);
    const [isNew, setIsNew] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.hotels.list({ active: false }); // include inactive in admin
            setHotels(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Hotel list load failed:', e);
            setHotels([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // Derive country/city dropdown choices from the loaded list.
    const countries = useMemo(() => {
        const s = new Set<string>();
        hotels.forEach((h) => h.country && s.add(h.country));
        return Array.from(s).sort();
    }, [hotels]);
    const cities = useMemo(() => {
        const s = new Set<string>();
        hotels.forEach((h) => {
            if (filterCountry && h.country !== filterCountry) return;
            if (h.city) s.add(h.city);
        });
        return Array.from(s).sort();
    }, [hotels, filterCountry]);

    const filtered = useMemo(() => {
        return hotels.filter((h) => {
            if (filterActive === 'active' && !h.is_active) return false;
            if (filterActive === 'inactive' && h.is_active) return false;
            if (filterCountry && h.country !== filterCountry) return false;
            if (filterCity && h.city !== filterCity) return false;
            if (q) {
                const needle = q.toLowerCase();
                const hay = `${h.name_kr} ${h.name_local || ''} ${h.code || ''}`.toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [hotels, q, filterCountry, filterCity, filterActive]);

    const startNew = () => {
        setEditing({ ...EMPTY_HOTEL });
        setIsNew(true);
    };

    const startEdit = (h: Hotel) => {
        setEditing({ ...h });
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
                await api.hotels.create(editing);
            } else {
                await api.hotels.update(editing.id, editing);
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
        if (!confirm(`"${editing.name_kr}" 호텔을 삭제하시겠습니까?\n\n이 호텔을 사용 중인 상품의 일정에는 영향이 없습니다(스냅샷으로 저장되어 있음).`)) return;
        try {
            await api.hotels.delete(editing.id);
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
                    .map((f) => uploadImage(f, 'hotels'))
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
            <AdminSidebar activePage="hotels" isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="ml-64 flex-1 flex flex-col min-h-screen">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">호텔 관리</h1>
                    <button
                        type="button"
                        onClick={startNew}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        호텔 추가
                    </button>
                </header>

                <div className="flex-1 p-8 flex gap-6 min-h-0">
                    {/* ─── LEFT: List + filters ─── */}
                    <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <input
                                type="text"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="코드 또는 호텔명 검색"
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none col-span-2"
                            />
                            <select
                                value={filterCountry}
                                onChange={(e) => { setFilterCountry(e.target.value); setFilterCity(''); }}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            >
                                <option value="">국가 (전체)</option>
                                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            >
                                <option value="">도시 (전체)</option>
                                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="col-span-2 md:col-span-4 flex items-center gap-2 text-sm">
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
                                <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                                    전체 {hotels.length}개 중 <strong className="text-slate-900 dark:text-white">{filtered.length}</strong>개 표시
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {loading ? (
                                <div className="py-20 text-center text-slate-500">불러오는 중...</div>
                            ) : filtered.length === 0 ? (
                                <div className="py-20 text-center text-slate-500">
                                    {hotels.length === 0 ? '아직 등록된 호텔이 없습니다. 우상단 "호텔 추가" 버튼으로 시작하세요.' : '조건에 맞는 호텔이 없습니다.'}
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                                        <tr className="text-xs text-slate-500 dark:text-slate-400">
                                            <th className="text-left px-4 py-3 font-medium">코드</th>
                                            <th className="text-left px-4 py-3 font-medium">호텔명</th>
                                            <th className="text-left px-4 py-3 font-medium">국가</th>
                                            <th className="text-left px-4 py-3 font-medium">도시</th>
                                            <th className="text-center px-4 py-3 font-medium">★</th>
                                            <th className="text-center px-4 py-3 font-medium">사용</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((h) => (
                                            <tr
                                                key={h.id}
                                                onClick={() => startEdit(h)}
                                                className={`border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-teal-50/40 dark:hover:bg-teal-900/20 transition-colors ${editing?.id === h.id ? 'bg-teal-50/60 dark:bg-teal-900/30' : ''
                                                    }`}
                                            >
                                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                    {h.code || '-'}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                    {h.name_kr}
                                                    {h.name_local && (
                                                        <span className="ml-2 text-xs font-normal text-slate-500">{h.name_local}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{h.country || '-'}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{h.city || '-'}</td>
                                                <td className="px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-300">
                                                    {(h.star_rating ?? 0) > 0 ? '★'.repeat(h.star_rating!) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${h.is_active
                                                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                                        }`}>
                                                        {h.is_active ? 'Y' : 'N'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* ─── RIGHT: Detail editor ─── */}
                    {editing ? (
                        <div className="w-[520px] flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="font-bold text-slate-800 dark:text-white">
                                    {isNew ? '새 호텔 등록' : '호텔 정보 수정'}
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
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="명칭 (한글)" required>
                                        <input
                                            type="text"
                                            value={editing.name_kr}
                                            onChange={(e) => setEditing({ ...editing, name_kr: e.target.value })}
                                            placeholder="마리나베이샌즈호텔"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="명칭 (현지/영문)">
                                        <input
                                            type="text"
                                            value={editing.name_local || ''}
                                            onChange={(e) => setEditing({ ...editing, name_local: e.target.value })}
                                            placeholder="Marina Bay Sands"
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="코드 (선택)">
                                        <input
                                            type="text"
                                            value={editing.code || ''}
                                            onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                                            placeholder="HS40530"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="별점 (1~5, 0=미지정)">
                                        <input
                                            type="number"
                                            min={0}
                                            max={5}
                                            value={editing.star_rating ?? 0}
                                            onChange={(e) => setEditing({ ...editing, star_rating: Number(e.target.value) })}
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="지역">
                                        <input
                                            type="text"
                                            value={editing.region || ''}
                                            onChange={(e) => setEditing({ ...editing, region: e.target.value })}
                                            placeholder="아시아"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="국가">
                                        <input
                                            type="text"
                                            value={editing.country || ''}
                                            onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                                            placeholder="싱가포르"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="도시">
                                        <input
                                            type="text"
                                            value={editing.city || ''}
                                            onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                                            placeholder="싱가포르"
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>

                                <Field label="주소">
                                    <input
                                        type="text"
                                        value={editing.address || ''}
                                        onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                                        placeholder="10 Bayfront Ave, Singapore 018956"
                                        className={inputCls}
                                    />
                                </Field>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="위도 (선택)">
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={editing.latitude ?? ''}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    latitude: e.target.value === '' ? null : Number(e.target.value),
                                                })
                                            }
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="경도 (선택)">
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={editing.longitude ?? ''}
                                            onChange={(e) =>
                                                setEditing({
                                                    ...editing,
                                                    longitude: e.target.value === '' ? null : Number(e.target.value),
                                                })
                                            }
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>

                                <Field label="웹사이트">
                                    <input
                                        type="url"
                                        value={editing.website || ''}
                                        onChange={(e) => setEditing({ ...editing, website: e.target.value })}
                                        placeholder="https://..."
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label="상세 설명">
                                    <textarea
                                        value={editing.description || ''}
                                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                                        rows={4}
                                        placeholder="호텔 소개, 특징, 위치적 장점 등..."
                                        className={`${inputCls} resize-y min-h-[100px]`}
                                    />
                                </Field>

                                <Field label="편의시설 (쉼표로 구분)">
                                    <input
                                        type="text"
                                        value={(editing.amenities || []).join(', ')}
                                        onChange={(e) =>
                                            setEditing({
                                                ...editing,
                                                amenities: e.target.value
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean),
                                            })
                                        }
                                        placeholder="수영장, 사우나, 무료 Wi-Fi, 조식 포함"
                                        className={inputCls}
                                    />
                                </Field>

                                <Field label="이미지">
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
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            첫 번째 이미지가 일정 화면에 표시되는 대표 이미지입니다.
                                        </p>
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
                                <div className="text-5xl mb-3 opacity-60">🏨</div>
                                <p className="text-sm">왼쪽에서 호텔을 선택하거나 우상단 "호텔 추가" 버튼을 누르세요.</p>
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

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
    label,
    required,
    children,
}) => (
    <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);
