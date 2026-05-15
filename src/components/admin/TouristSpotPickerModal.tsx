import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { TouristSpot } from '../../types/touristSpot';

interface TouristSpotPickerModalProps {
    open: boolean;
    onPick: (spot: TouristSpot) => void;
    onClose: () => void;
    title?: string;
}

/**
 * Reusable tourist spot picker. Same shape as HotelPickerModal but for the
 * tourist_spots master. Caller decides what to do with the returned spot —
 * typically push name_kr/description/images onto a timeline block.
 */
export const TouristSpotPickerModal: React.FC<TouristSpotPickerModalProps> = ({
    open,
    onPick,
    onClose,
    title = '관광지 마스터에서 선택',
}) => {
    const [spots, setSpots] = useState<TouristSpot[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const data = await api.touristSpots.list({ active: true });
                if (!cancelled) setSpots(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Tourist spot picker load failed:', e);
                if (!cancelled) setSpots([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        setQ('');
        return () => { cancelled = true; };
    }, [open]);

    const filtered = useMemo(() => {
        return spots.filter((s) => {
            if (q) {
                const needle = q.toLowerCase();
                const hay = `${s.name_kr} ${s.name_local || ''}`.toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [spots, q]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-6"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            검색 후 행을 클릭하면 일정의 제목·설명·사진이 자동으로 채워집니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>

                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="관광지명으로 검색"
                        autoFocus
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="py-20 text-center text-slate-500">불러오는 중...</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">
                            {spots.length === 0
                                ? '아직 등록된 관광지가 없습니다. 사이드바 → "관광지 마스터" 메뉴에서 먼저 등록해주세요.'
                                : '조건에 맞는 관광지가 없습니다.'}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                                <tr className="text-xs text-slate-500 dark:text-slate-400">
                                    <th className="text-left px-4 py-2.5 font-medium">관광지명</th>
                                    <th className="text-left px-4 py-2.5 font-medium">주소</th>
                                    <th className="text-center px-4 py-2.5 font-medium w-20">사진</th>
                                    <th className="text-right px-4 py-2.5 font-medium w-24">선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s) => (
                                    <tr
                                        key={s.id}
                                        onClick={() => onPick(s)}
                                        className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-teal-50/40 dark:hover:bg-teal-900/20 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                            {s.name_kr}
                                            {s.name_local && (
                                                <span className="ml-2 text-xs font-normal text-slate-500">{s.name_local}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                                            {s.address || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-slate-500">
                                            {(s.images || []).length}장
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="inline-block px-3 py-1 rounded bg-teal-500 text-white text-xs font-bold">
                                                선택
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
