/** 상태 뱃지 톤 — admin-console.css 의 b-new · b-sent · b-wait · b-paid · b-confirmed · b-cancel */
export type BadgeTone = 'new' | 'sent' | 'wait' | 'paid' | 'confirmed' | 'cancel';

/** 톤 → CSS 클래스 (클래스 이름으로 직접 써야 하는 예전 화면용) */
export const toneClass = (tone: BadgeTone): string => `b-${tone}`;

/**
 * 예약 · 견적 상태값의 한국어 라벨과 톤. 모든 화면이 이 표 하나를 쓴다.
 * 견적: new → processing → answered → reservation_requested → converted
 * 예약: reservation_requested → pending_payment → paid → confirmed → completed / cancelled
 */
export const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
    new: { label: '신규 요청', tone: 'new' },
    pending: { label: '신규 요청', tone: 'new' },
    processing: { label: '견적 작성중', tone: 'new' },
    answered: { label: '견적 발송됨', tone: 'sent' },
    reservation_requested: { label: '예약 요청', tone: 'wait' },
    pending_payment: { label: '입금 대기', tone: 'wait' },
    paid: { label: '결제 완료', tone: 'paid' },
    confirmed: { label: '예약 확정', tone: 'confirmed' },
    completed: { label: '여행 완료', tone: 'new' },
    converted: { label: '예약 전환', tone: 'new' },
    cancelled: { label: '취소됨', tone: 'cancel' },
    canceled: { label: '취소됨', tone: 'cancel' },
};

export const statusBadge = (status?: string): { label: string; tone: BadgeTone } =>
    STATUS_META[status || ''] || { label: status || '-', tone: 'new' };
