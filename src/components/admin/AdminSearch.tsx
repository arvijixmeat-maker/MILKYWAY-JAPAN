import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { ReceiptText, Search, Ticket, X, type LucideIcon } from 'lucide-react';
import { ADMIN_NAV } from './adminNav';

interface Hit { key: string; icon: LucideIcon; title: string; meta?: string; href: string; group: string }

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/\s+/g, '');

/**
 * 검색창 (Ctrl/⌘+K) — 메뉴 이름, 예약번호·고객명·상품명으로 찾아 바로 이동한다.
 * 예약·견적 목록은 창을 처음 열 때 한 번 불러온다.
 */
export const AdminSearch: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [q, setQ] = useState('');
    const [cursor, setCursor] = useState(0);
    const [records, setRecords] = useState<{ reservations: any[]; quotes: any[] } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        let alive = true;
        Promise.all([api.reservations.list().catch(() => []), api.quotes.list().catch(() => [])])
            .then(([reservations, quotes]) => {
                if (alive) setRecords({ reservations: Array.isArray(reservations) ? reservations : [], quotes: Array.isArray(quotes) ? quotes : [] });
            });
        return () => { alive = false; };
    }, []);

    const hits = useMemo<Hit[]>(() => {
        const key = norm(q);
        const menus: Hit[] = ADMIN_NAV.flatMap((g) => g.items
            .filter((i) => !key || norm(i.label).includes(key) || norm(g.label).includes(key))
            .map((i) => ({ key: `m-${i.id}`, icon: i.icon, title: i.label, meta: g.label, href: i.href, group: '메뉴' })));
        if (!key || !records) return menus;

        const reservations: Hit[] = records.reservations
            .map((r) => ({
                id: String(r.id || ''),
                no: r.reservationNumber || r.reservation_number || '',
                name: r.customerName || r.customer_name || '',
                product: r.productName || r.product_name || '',
            }))
            .filter((r) => r.id && (norm(r.no).includes(key) || norm(r.name).includes(key) || norm(r.product).includes(key) || norm(r.id).startsWith(key)))
            .slice(0, 6)
            .map((r) => ({
                key: `r-${r.id}`, icon: Ticket, title: r.name || '이름 없음',
                meta: [r.no ? `#${r.no}` : `#${r.id.slice(0, 6)}`, r.product].filter(Boolean).join(' · '),
                href: `/admin/reservations?open=${encodeURIComponent(r.id)}`, group: '예약',
            }));
        const quotes: Hit[] = records.quotes
            .filter((x) => x?.id && (norm(x.name).includes(key) || norm(x.destination).includes(key) || norm(x.id).startsWith(key)))
            .slice(0, 4)
            .map((x) => ({
                key: `q-${x.id}`, icon: ReceiptText, title: x.name || '이름 없음',
                meta: [`#${String(x.id).slice(0, 6)}`, x.destination].filter(Boolean).join(' · '),
                href: `/admin/reservations?open=${encodeURIComponent(x.id)}`, group: '견적',
            }));
        return [...reservations, ...quotes, ...menus];
    }, [q, records]);

    useEffect(() => { setCursor(0); }, [q]);

    const go = (hit?: Hit) => { if (hit) window.location.href = hit.href; };
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, hits.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); go(hits[cursor]); }
    };

    let lastGroup = '';
    return (
        <div className="cmdk-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cmdk" role="dialog" aria-modal="true" aria-label="검색" onKeyDown={onKeyDown}>
                <label className="cmdk-input">
                    <Search size={20} strokeWidth={1.5} />
                    <input
                        ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                        placeholder="예약번호·고객명·메뉴 검색" aria-label="검색어"
                    />
                    <button type="button" className="side-icon-btn" aria-label="검색 닫기" onClick={onClose}><X size={20} strokeWidth={1.5} /></button>
                </label>
                <div className="cmdk-list">
                    {hits.length === 0 && (
                        <div className="cmdk-empty">{records || !q ? '찾는 결과가 없습니다.' : '불러오는 중입니다.'}</div>
                    )}
                    {hits.map((hit, i) => {
                        const head = hit.group !== lastGroup ? hit.group : '';
                        lastGroup = hit.group;
                        return (
                            <React.Fragment key={hit.key}>
                                {head && <div className="cmdk-group">{head}</div>}
                                <a
                                    href={hit.href} className={`cmdk-row${i === cursor ? ' on' : ''}`}
                                    onMouseEnter={() => setCursor(i)}
                                >
                                    <span className="cmdk-ico"><hit.icon size={18} strokeWidth={1.5} /></span>
                                    <span className="cmdk-title">{hit.title}</span>
                                    {hit.meta && <span className="cmdk-meta">{hit.meta}</span>}
                                </a>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
