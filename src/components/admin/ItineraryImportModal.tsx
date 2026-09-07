import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { getOptimizedImageUrl } from '../../utils/cloudflareImage';
import { firstItineraryImage, itineraryDayCount, itineraryPhotoCount, toItinerarySource, type ItinerarySource } from './itineraryImport';

interface ItineraryImportModalProps {
    open: boolean;
    /** 편집 중인 상품 — 목록에서 뺀다 (자기 자신을 불러오는 건 의미가 없으므로) */
    currentProductId?: string;
    onPick: (source: ItinerarySource) => void;
    onClose: () => void;
}

/**
 * 「일정표 불러오기」 — 기존 상품의 일정표(일차 정보·타임라인·사진)를 골라 그대로 가져온다.
 * 새 상품을 만들 때 비슷한 상품의 일정표를 불러온 뒤 편집만 하면 되도록.
 */
export const ItineraryImportModal: React.FC<ItineraryImportModalProps> = ({ open, currentProductId, onPick, onClose }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[230] bg-black/50 flex items-center justify-center p-6" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">일정표 불러오기</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">기존 상품의 일정표(일차 정보·타임라인·사진)를 그대로 가져옵니다. 가져온 뒤 편집만 하면 됩니다.</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center" aria-label="닫기">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>
                {/* 열릴 때마다 새로 마운트되어 목록을 다시 읽는다 */}
                <ImportList currentProductId={currentProductId} onPick={onPick} />
            </div>
        </div>
    );
};

function ImportList({ currentProductId, onPick }: { currentProductId?: string; onPick: (source: ItinerarySource) => void }) {
    const [sources, setSources] = useState<ItinerarySource[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    useEffect(() => {
        let cancelled = false;
        api.products.list()
            .then((data: unknown) => {
                if (cancelled) return;
                const items = Array.isArray(data) ? data : [];
                setSources(items
                    .map(it => toItinerarySource(it as Record<string, unknown>))
                    .filter(s => s.id !== currentProductId && (s.blocks.length > 0 || s.images.length > 0)));
            })
            .catch(() => { if (!cancelled) setSources([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [currentProductId]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return needle ? sources.filter(s => s.name.toLowerCase().includes(needle)) : sources;
    }, [sources, q]);

    return (
        <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="상품명 검색"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="py-20 text-center text-slate-500">불러오는 중...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">일정표가 있는 다른 상품이 없습니다.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                            <tr className="text-xs text-slate-500 dark:text-slate-400">
                                <th className="text-left px-4 py-2.5 font-medium w-16">대표</th>
                                <th className="text-left px-4 py-2.5 font-medium">상품명</th>
                                <th className="text-center px-4 py-2.5 font-medium w-16">일수</th>
                                <th className="text-center px-4 py-2.5 font-medium w-16">사진</th>
                                <th className="text-right px-4 py-2.5 font-medium w-28">선택</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => {
                                const thumb = firstItineraryImage(s);
                                const days = itineraryDayCount(s);
                                return (
                                    <tr key={s.id} data-import-row={s.id} className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-teal-50/40 dark:hover:bg-teal-900/20 transition-colors" onClick={() => onPick(s)}>
                                        <td className="px-4 py-2">
                                            {thumb
                                                ? <img src={getOptimizedImageUrl(thumb, 'productThumbnail')} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                : <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="font-semibold text-slate-900 dark:text-white">{s.name}</div>
                                            <div className="text-[11px] text-slate-400">{s.id}</div>
                                        </td>
                                        <td className="px-4 py-2 text-center whitespace-nowrap">{days > 0 ? `${days}일` : (s.blocks.length > 0 ? '일정만' : '사진만')}</td>
                                        <td className="px-4 py-2 text-center whitespace-nowrap">{itineraryPhotoCount(s)}장</td>
                                        <td className="px-4 py-2 text-right">
                                            <button type="button" className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); onPick(s); }}>불러오기</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
