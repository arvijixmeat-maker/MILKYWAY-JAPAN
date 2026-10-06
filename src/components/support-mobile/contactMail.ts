import { COMPANY_INFO } from '../../constants/company';

/**
 * The site has no inquiry endpoint, so the contact form hands its content to the visitor's
 * mail app as a pre-filled message to the company address.
 */

export const INQUIRY_EMAIL = COMPANY_INFO.email;
export const INQUIRY_TYPES = ['ご予約', 'お支払い', 'ツアー内容', 'その他'] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];
/** Keeps the mailto: link within what mail apps accept. */
export const INQUIRY_MAX = 1000;

export interface Inquiry {
    type: InquiryType;
    reservationNo: string;
    message: string;
    /** Signed-in account, so staff can match the mail to its bookings. */
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
        q.email ? `ご登録メール：${q.email}` : '',
    ].filter(Boolean);
    return [...head, '', q.message.trim()].join('\n');
};

export const inquiryMailto = (q: Inquiry) =>
    `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent(inquirySubject(q))}&body=${encodeURIComponent(inquiryBody(q).replace(/\n/g, '\r\n'))}`;
