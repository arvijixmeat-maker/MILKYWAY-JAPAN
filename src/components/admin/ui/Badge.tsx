import React from 'react';
import { statusBadge, toneClass, type BadgeTone } from './status';

/**
 * 상태 뱃지 — 모든 관리자 화면이 같은 여섯 톤만 쓴다.
 * new 신규(회색) · sent 견적 발송(연민트) · wait 입금/회신 대기(테두리 + 노란 점) ·
 * paid 결제 완료(green-600) · confirmed 예약/수배 확정(진녹색) · cancel 취소(빨강)
 */
export const Badge: React.FC<{ tone?: BadgeTone; small?: boolean; className?: string; title?: string; children: React.ReactNode }> = ({
    tone = 'new', small, className = '', title, children,
}) => <span className={`badge ${toneClass(tone)}${small ? ' sm' : ''} ${className}`.trim()} title={title}>{children}</span>;

/** 예약 · 견적 상태값(`pending_payment` 등)을 넣으면 정해진 라벨과 톤으로 그린다. */
export const StatusBadge: React.FC<{ status?: string; label?: string; small?: boolean }> = ({ status, label, small }) => {
    const s = statusBadge(status);
    return <Badge tone={s.tone} small={small}>{label || s.label}</Badge>;
};

/** 메뉴 · 탭 옆 숫자 (green-600 바탕 + 흰 숫자). 0 이면 그리지 않는다. */
export const CountBadge: React.FC<{ count: number; label?: string; className?: string }> = ({ count, label, className = 'count-badge' }) =>
    count > 0 ? <span className={className} aria-label={label}>{count > 99 ? '99+' : count}</span> : null;
