import { COMPANY_INFO } from '../../constants/company';

/**
 * Contact form content, and the mail-app fallback: when the form cannot be sent to
 * /api/inquiries, the same content opens in the visitor's mail app addressed to the company.
 */

export const INQUIRY_EMAIL = COMPANY_INFO.email;
/** The server accepts exactly these (functions/api/inquiries.ts KINDS). */
export const INQUIRY_TYPES = ['ご予約', 'お支払い', 'ツアー内容', 'その他'] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];
/** Keeps the mailto: fallback within what mail apps accept (the server allows 2000). */
export const INQUIRY_MAX = 1000;
export const INQUIRY_NAME_MAX = 80;
export const INQUIRY_NO_MAX = 40;

/** Same rule as the server. */
export const isInquiryEmail = (v: string) => v.length <= 254 && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(v);

export interface Inquiry {
    type: InquiryType;
    reservationNo: string;
    message: string;
    name?: string;
    email?: string;
}

export const inquirySubject = (q: Inquiry) => {
    const no = q.reservationNo.trim();
    return `【お問い合わせ】${q.type}${no ? `（予約番号 ${no}）` : ''}`;
};

export const inquiryBody = (q: Inquiry) => {
    const no = q.reservationNo.trim();
    const head = [
        `お問い合わせ種別：${q.type}`,
        no ? `予約番号：${no}` : '',
        q.name ? `お名前：${q.name}` : '',
        q.email ? `メールアドレス：${q.email}` : '',
    ].filter(Boolean);
    return [...head, '', q.message.trim()].join('\n');
};

export const inquiryMailto = (q: Inquiry) =>
    `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent(inquirySubject(q))}&body=${encodeURIComponent(inquiryBody(q).replace(/\n/g, '\r\n'))}`;
