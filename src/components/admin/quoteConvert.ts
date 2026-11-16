import type { QuoteRequest } from './QuoteModals';
import { countPeople } from '../trip-doc/tripDocModel';

/**
 * 견적 → 예약 전환 공통 처리 (견적 관리 · 통합 예약관리 두 곳에서 같이 쓴다).
 *
 * 견적 단계에서 문서 편집기로 만든 내용(일정·관광지/호텔 사진·새 견적서 항목·요금)을
 * 그대로 예약의 document_content 로 넘겨, 전환 즉시 같은 디자인의 확정일정표가 준비되게 한다.
 * → 「수동 예약 추가」로 다시 입력하거나 문서를 처음부터 다시 쓸 필요가 없다.
 */
export interface ConvertInput { startDate: string; endDate: string; totalAmount: number; deposit: number }

export const parseQuoteDoc = (raw: unknown): any => {
    if (!raw) return null;
    if (typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch { return null; }
};

/** 「견적 직접 만들기」에서 적어 둔 문의 경로 → 예약의 주문 경로(source) 값 */
const CHANNEL: Record<string, string> = { 인스타그램: 'instagram', 페이스북: 'facebook', LINE: 'line', 메일: 'email', 전화: 'phone', 홈페이지: 'website', 직접방문: 'visit', 기타: 'other' };
const channelOf = (request: QuoteRequest): string => {
    const m = String(request.additionalRequest || (request as any).additional_request || '').match(/\[문의 경로:\s*([^\]]+)\]/);
    return (m && CHANNEL[m[1].trim()]) || 'quote';
};

export function buildReservationFromQuote(request: QuoteRequest, data: ConvertInput) {
    const doc = parseQuoteDoc(request.documentContent ?? request.document_content);
    const nights = (() => {
        const s = new Date(`${data.startDate}T00:00:00`), e = new Date(`${data.endDate}T00:00:00`);
        const n = Math.round((e.getTime() - s.getTime()) / 86400000);
        return Number.isFinite(n) && n >= 0 ? n : null;
    })();
    return {
        user_id: request.userId || null,
        // 'quote' 로 만들면 예약관리 화면이 견적 행으로 취급해 문서 저장·고객 링크가 견적 테이블로 가 버린다
        type: 'custom',
        source: channelOf(request),
        product_name: doc?.name || `${request.destination || 'モンゴル'} 맞춤견적`,
        // 서버(POST /api/reservations)는 customer_info.{name,email,phone} 를 읽는다
        // — 예전 전환 코드는 customer_name 으로 보내 항상 400(필수값 누락)으로 실패했다
        customer_info: { name: request.name, email: request.email || '', phone: request.phone || '' },
        // 「大人4名」 같은 글자 인원 → 숫자
        total_people: countPeople(request.headcount),
        start_date: data.startDate,
        end_date: data.endDate,
        duration: nights != null ? `${nights}박 ${nights + 1}일` : null,
        status: 'pending_payment',
        price_breakdown: {
            total: data.totalAmount,
            deposit: data.deposit,
            local: data.totalAmount - data.deposit,
        },
        itinerary_template_id: request.itineraryTemplateId || request.itinerary_template_id || null,
        document_content: doc ? JSON.stringify(doc) : null,
        notes: `맞춤견적에서 전환 (견적 ID ${request.id})`,
        // 서버가 이 견적이 이미 전환됐는지 확인 — 같은 견적으로 예약·PayPal 청구서가 두 번 나가지 않게
        quote_id: request.id,
    };
}
