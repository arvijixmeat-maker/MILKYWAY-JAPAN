import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './console/Icon';
import { api } from '../../lib/api';
import type { Hotel } from '../../types/hotel';

interface HotelPickerModalProps {
    /** Whether the modal is open. */
    open: boolean;
    /** Called with the selected hotel; consumer decides what to store. */
    onPick: (hotel: Hotel) => void;
    /** Close without picking. */
    onClose: () => void;
    /** Optional title override (default: "호텔 마스터에서 선택"). */
    title?: string;
}

/**
 * Reusable hotel picker. Opens over the admin product editor (or anywhere
 * else that wants to attach a hotel) and lets the admin search the master
 * library. Returns the full Hotel object so callers can snapshot whatever
 * fields they want.
 */
export const HotelPickerModal: React.FC<HotelPickerModalProps> = ({
    open,
    onPick,
    onClose,
    title = '호텔 마스터에서 선택',
}) => {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const data = await api.hotels.list({ active: true });
                if (!cancelled) setHotels(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Hotel picker load failed:', e);
                if (!cancelled) setHotels([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        setQ('');
        return () => { cancelled = true; };
    }, [open]);

    const filtered = useMemo(() => {
        return hotels.filter((h) => {
            if (q) {
                const needle = q.toLowerCase();
                const hay = `${h.name_kr} ${h.name_local || ''}`.toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [hotels, q]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[230] bg-[rgba(0,0,0,0.45)] flex items-center justify-center p-6"
            onClick={onClose}
        >
            <div
                className="bg-[var(--mw-surface)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--mw-line)]">
                    <div>
                        <h2 className="text-lg font-bold text-[color:var(--mw-ink)]">{title}</h2>
                        <p className="text-xs text-[color:var(--mw-muted)] mt-0.5">
                            검색 후 행을 클릭하면 해당 호텔이 일정에 입력됩니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg hover:bg-[var(--mw-gray-100)] flex items-center justify-center"
                    >
                        <Icon name="close" className="text-[color:var(--mw-muted)]" />
                    </button>
                </div>

                {/* Filter bar */}
                <div className="p-4 border-b border-[color:var(--mw-line)]">
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="호텔명으로 검색"
                        autoFocus
                        className="w-full px-3 py-2 border border-[color:var(--mw-line)] rounded-lg bg-[var(--mw-surface)] text-sm focus:ring-2 focus:ring-[color:var(--mw-green-700)] outline-none"
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="py-20 text-center text-[color:var(--mw-muted)]">불러오는 중...</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-sm text-[color:var(--mw-muted)]">
                            {hotels.length === 0
                                ? '아직 등록된 호텔이 없습니다. 사이드바 → "호텔 마스터" 메뉴에서 먼저 호텔을 등록해주세요.'
                                : '조건에 맞는 호텔이 없습니다.'}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--mw-gray-50)] sticky top-0">
                                <tr className="text-xs text-[color:var(--mw-muted)]">
                                    <th className="text-left px-4 py-2.5 font-medium w-16">대표</th>
                                    <th className="text-left px-4 py-2.5 font-medium">호텔명</th>
                                    <th className="text-left px-4 py-2.5 font-medium">주소</th>
                                    <th className="text-center px-4 py-2.5 font-medium w-16">사진</th>
                                    <th className="text-right px-4 py-2.5 font-medium w-24">선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((h) => {
                                    const thumb = (h.images || []).find((url) => !!url);
                                    return (
                                        <tr
                                            key={h.id}
                                            onClick={() => onPick(h)}
                                            className="border-t border-[color:var(--mw-line)] cursor-pointer hover:bg-[var(--mw-green-50)] transition-colors"
                                        >
                                            <td className="px-4 py-2">
                                                <div className="w-12 h-12 rounded overflow-hidden bg-[var(--mw-gray-100)] border border-[color:var(--mw-line)] flex items-center justify-center">
                                                    {thumb ? (
                                                        <img src={thumb} alt={h.name_kr} loading="lazy" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icon name="hotel" className="text-[color:var(--mw-gray-500)] text-sm" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-[color:var(--mw-ink)]">
                                                {h.name_kr}
                                                {h.name_local && (
                                                    <span className="ml-2 text-xs font-normal text-[color:var(--mw-muted)]">{h.name_local}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-[color:var(--mw-muted)]">
                                                {h.address || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-[color:var(--mw-muted)]">
                                                {(h.images || []).length}장
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-block px-3 py-1 rounded bg-[var(--mw-primary)] text-[color:var(--mw-accent)] text-xs font-bold">
                                                    선택
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
        </div>
    );
};
