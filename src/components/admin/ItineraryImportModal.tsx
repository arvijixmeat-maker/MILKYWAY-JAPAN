import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './console/Icon';
import { api } from '../../lib/api';
import { getOptimizedImageUrl } from '../../utils/cloudflareImage';
import { splitItineraryDays, toItinerarySource, type DaySource, type ItinerarySource } from './itineraryImport';

interface ItineraryImportModalProps {
    open: boolean;
    /** 편집 중인 상품 — 목록에서 뺀다 (자기 자신을 불러오는 건 의미가 없으므로) */
    currentProductId?: string;
    /** 선택한 일차들을 순서대로 합친 결과 */
    onPick: (selection: ItinerarySource) => void;
    onClose: () => void;
}

/**
 * 「일정표 불러오기」 — 다른 상품들의 일정을 **일차 단위**로 골라 가져온다.
 * 예: A상품의 「テレルジ国立公園」 하루 + B상품의 「ミニゴビ」 하루를 체크해서 한 번에 불러오기.
 * 새 상품을 만들 때 필요한 일차만 조합한 뒤 편집만 하면 되도록.
 */
export const ItineraryImportModal: React.FC<ItineraryImportModalProps> = ({ open, currentProductId, onPick, onClose }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[230] bg-[rgba(0,0,0,0.45)] flex items-center justify-center p-6" onClick={onClose}>
            <div className="bg-[var(--mw-surface)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--mw-line)]">
                    <div>
                        <h2 className="text-lg font-bold text-[color:var(--mw-ink)]">일정표 불러오기</h2>
                        <p className="text-xs text-[color:var(--mw-muted)] mt-0.5">다른 상품의 일정을 일차 단위로 골라 가져옵니다. 여러 상품의 일차를 섞어서 선택할 수 있고, 일차 번호는 자동으로 다시 매겨집니다.</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-[var(--mw-gray-100)] flex items-center justify-center" aria-label="닫기">
                        <Icon name="close" className="text-[color:var(--mw-muted)]" />
                    </button>
                </div>
                {/* 열릴 때마다 새로 마운트되어 목록을 다시 읽는다 */}
                <DayPicker currentProductId={currentProductId} onPick={onPick} />
            </div>
        </div>
    );
};

function DayPicker({ currentProductId, onPick }: { currentProductId?: string; onPick: (selection: ItinerarySource) => void }) {
    const [days, setDays] = useState<DaySource[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [selected, setSelected] = useState<string[]>([]);   // 선택한 순서 유지 (불러오는 순서)

    useEffect(() => {
        let cancelled = false;
        api.products.list()
            .then((data: unknown) => {
                if (cancelled) return;
                const items = Array.isArray(data) ? data : [];
                setDays(items
                    .map(it => toItinerarySource(it as Record<string, unknown>))
                    .filter(s => s.id !== currentProductId)
                    .flatMap(splitItineraryDays));
            })
            .catch(() => { if (!cancelled) setDays([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [currentProductId]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return days;
        return days.filter(d => `${d.tags.join(' ')} ${d.title} ${d.description} ${d.dayLabel} ${d.productName}`.toLowerCase().includes(needle));
    }, [days, q]);

    /** 상품별로 묶어서 표시 (검색 결과 순서 유지) */
    const groups = useMemo(() => {
        const out: { productId: string; productName: string; days: DaySource[] }[] = [];
        for (const d of filtered) {
            const last = out[out.length - 1];
            if (last && last.productId === d.productId) last.days.push(d);
            else out.push({ productId: d.productId, productName: d.productName, days: [d] });
        }
        return out;
    }, [filtered]);

    const toggle = (key: string) => setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    const toggleProduct = (g: { days: DaySource[] }) => {
        const keys = g.days.map(d => d.key);
        const all = keys.every(k => selected.includes(k));
        setSelected(prev => (all ? prev.filter(k => !keys.includes(k)) : [...prev, ...keys.filter(k => !prev.includes(k))]));
    };

    const submit = () => {
        const picked = selected.map(k => days.find(d => d.key === k)).filter((d): d is DaySource => !!d);
        if (picked.length === 0) return;
        const names = picked.map(d => d.title || d.dayLabel || d.productName);
        onPick({
            id: picked.map(d => d.key).join(','),
            name: names.length > 2 ? `${names[0]} 외 ${names.length - 1}일차` : names.join(' + '),
            blocks: picked.flatMap(d => d.blocks),
            images: picked.flatMap(d => d.images),
        });
    };

    return (
        <>
            <div className="p-4 border-b border-[color:var(--mw-line)]">
                <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="여행지·일정 제목·상품명 검색 (예: Terelj, テレルジ, ミニゴビ)"
                    className="w-full px-3 py-2 border border-[color:var(--mw-line)] rounded-lg bg-[var(--mw-surface)] text-sm focus:ring-2 focus:ring-[color:var(--mw-green-700)] outline-none"
                />
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="py-20 text-center text-[color:var(--mw-muted)]">불러오는 중...</div>
                ) : groups.length === 0 ? (
                    <div className="py-20 text-center text-sm text-[color:var(--mw-muted)]">{q ? '검색 결과가 없습니다.' : '일정표가 있는 다른 상품이 없습니다.'}</div>
                ) : (
                    <table className="w-full text-sm">
                        <tbody>
                            {groups.map(g => {
                                const allOn = g.days.every(d => selected.includes(d.key));
                                return (
                                    <React.Fragment key={g.productId}>
                                        <tr className="bg-[var(--mw-gray-50)]" data-import-product={g.productId}>
                                            <td colSpan={5} className="px-4 py-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={allOn} onChange={() => toggleProduct(g)} className="w-4 h-4 accent-[color:var(--mw-green-700)]" />
                                                    <span className="text-xs font-bold text-[color:var(--mw-gray-800)]">{g.productName}</span>
                                                    <span className="text-[11px] text-[color:var(--mw-gray-500)]">{g.productId} · {g.days.length}일</span>
                                                </label>
                                            </td>
                                        </tr>
                                        {g.days.map(d => {
                                            const on = selected.includes(d.key);
                                            return (
                                                <tr key={d.key} data-import-day={d.key} onClick={() => toggle(d.key)} className={`border-t border-[color:var(--mw-line)] cursor-pointer transition-colors ${on ? 'bg-[var(--mw-green-50)]' : 'hover:bg-[var(--mw-green-50)]'}`}>
                                                    <td className="pl-5 pr-2 py-2 w-10">
                                                        <input type="checkbox" checked={on} onChange={() => toggle(d.key)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-[color:var(--mw-green-700)]" />
                                                    </td>
                                                    <td className="px-2 py-2 w-14">
                                                        {d.thumb
                                                            ? <img src={getOptimizedImageUrl(d.thumb, 'productThumbnail')} alt="" className="w-10 h-10 rounded-lg object-cover bg-[var(--mw-gray-100)]" onError={(e) => { const el = e.currentTarget; if (el.src !== d.thumb) el.src = d.thumb; else el.style.visibility = 'hidden'; }} />
                                                            : <div className="w-10 h-10 rounded-lg bg-[var(--mw-gray-100)]" />}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        {d.tags.length > 0 && (
                                                            <div data-import-tags className="text-[11.5px] font-bold text-[color:var(--mw-green-700)] tracking-tight">{d.tags.join(' / ')}</div>
                                                        )}
                                                        <div className="font-semibold text-[color:var(--mw-ink)]">
                                                            {d.dayLabel && <span className="text-[11px] font-bold text-[color:var(--mw-gray-500)] mr-1.5">{d.dayLabel}</span>}
                                                            {d.title || '(제목 없음)'}
                                                        </div>
                                                        {d.description && <div className="text-[11px] text-[color:var(--mw-gray-500)] truncate max-w-[420px]">{d.description}</div>}
                                                    </td>
                                                    <td className="px-2 py-2 text-center whitespace-nowrap text-[color:var(--mw-muted)] w-20">일정 {d.eventCount}</td>
                                                    <td className="px-4 py-2 text-center whitespace-nowrap text-[color:var(--mw-muted)] w-20">사진 {d.photoCount}</td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-[color:var(--mw-line)] bg-[var(--mw-surface)]">
                <div className="text-sm text-[color:var(--mw-muted)]">
                    {selected.length > 0 ? <><b className="text-[color:var(--mw-green-700)]">{selected.length}일차</b> 선택됨 — 체크한 순서대로 들어갑니다</> : '불러올 일차를 체크하세요'}
                </div>
                <div className="flex items-center gap-2">
                    {selected.length > 0 && (
                        <button type="button" onClick={() => setSelected([])} className="px-3 py-2 rounded-lg text-xs font-semibold text-[color:var(--mw-muted)] hover:bg-[var(--mw-gray-100)]">선택 해제</button>
                    )}
                    <button type="button" onClick={submit} disabled={selected.length === 0} data-import-submit className="px-4 py-2 rounded-lg bg-[var(--mw-primary)] text-[color:var(--mw-accent)] text-sm font-semibold hover:bg-[var(--mw-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed">
                        선택한 일차 불러오기
                    </button>
                </div>
            </div>
        </>
    );
}
