import React, { useEffect, useRef, useState } from 'react';
import { StrokeIcon, type StrokeIconName } from './console/StrokeIcon';
import type { AdminPending } from './adminNav';

/**
 * 알림 종 — 관리자가 먼저 처리해야 하는 건수(새 견적 · 예약 요청 · 새 문의)를 모아 보여 준다.
 * 따로 저장하는 알림은 없고, 목록에서 센 숫자 그대로다.
 */
export const AdminAlerts: React.FC<{ pending: AdminPending | null; className?: string }> = ({ pending, className = '' }) => {
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const all: { icon: StrokeIconName; title: string; count: number; href: string }[] = [
        { icon: 'uiDoc', title: '새 견적 요청', count: pending?.newQuotes ?? 0, href: '/admin/quotes' },
        { icon: 'navBooking', title: '예약 요청', count: pending?.requested ?? 0, href: '/admin/reservations' },
        { icon: 'navMail', title: '새 문의', count: pending?.newInquiries ?? 0, href: '/admin/inquiries' },
    ];
    const rows = all.filter((r) => r.count > 0);
    const total = rows.reduce((sum, r) => sum + r.count, 0);

    return (
        <div className={`alerts ${className}`} ref={boxRef}>
            <button
                type="button" className="side-icon-btn" aria-haspopup="true" aria-expanded={open}
                aria-label={total > 0 ? `알림 (처리할 일 ${total}건)` : '알림'}
                onClick={() => setOpen((v) => !v)}
            >
                <StrokeIcon name="uiBell" />
                {total > 0 && <span className="alerts-dot" />}
            </button>
            {open && (
                <div className="alerts-pop" role="dialog" aria-label="알림">
                    <div className="alerts-title">처리할 일</div>
                    {rows.length === 0 ? (
                        <div className="alerts-empty">
                            <StrokeIcon name="uiCheck" size={24} color="#848c94" />
                            {pending ? '지금 처리할 일이 없습니다.' : '불러오는 중입니다.'}
                        </div>
                    ) : rows.map((r) => (
                        <a key={r.title} href={r.href} className="alerts-row">
                            <span className="alerts-ico"><StrokeIcon name={r.icon} size={18} /></span>
                            <span className="alerts-text">{r.title}</span>
                            <span className="alerts-count">{r.count}</span>
                            <StrokeIcon name="uiChevRight" size={18} color="#848c94" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};
