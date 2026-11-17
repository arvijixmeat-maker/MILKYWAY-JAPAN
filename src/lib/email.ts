import { api } from './api';

type NotificationType = 'ESTIMATE_COMPLETED' | 'GUIDE_ASSIGNED' | 'RESERVATION_REQUESTED' | 'QUOTE_RECEIVED' | 'ITINERARY_READY' | 'CONTRACT_READY';

interface EmailData {
    customerName: string;
    destination?: string;
    productName?: string;
    estimateUrl?: string;
    adminNote?: string;
    guideName?: string;
    guidePhone?: string;
    reservationId?: string;
    depositAmount?: string;
    totalAmount?: string;
    localAmount?: string;
    customerPhone?: string;
    customerEmail?: string;
    [key: string]: any;
}

/** 관리자 발송 버튼용 — 메일이 나가지 않았으면 예외를 던져 「발송 실패」로 처리되게 한다 */
export const sendNotificationEmailOrThrow = async (to: string, type: NotificationType, data: EmailData) => {
    const r = await sendNotificationEmail(to, type, data);
    if (!r.success) {
        const why = typeof r.error === 'string' ? r.error : r.error instanceof Error ? r.error.message : '';
        throw new Error(`메일이 발송되지 않았습니다${why ? ` (${why})` : ''}. 고객 이메일 주소를 확인해 주세요.`);
    }
    return r;
};

export const sendNotificationEmail = async (
    to: string,
    type: NotificationType,
    data: EmailData
) => {
    try {
        const response = (await api.notifications.sendEmail(to, type, data)) as { emailed?: boolean; emailError?: string } | undefined;
        // 서버가 emailed:false 를 돌려주면 메일은 나가지 않은 것 (메일 키 없음·주소 오류 등) — 인앱 알림만 생성됨
        if (response && response.emailed === false) {
            console.error('Email not delivered:', response.emailError);
            return { success: false, data: response, error: response.emailError || 'email not sent' };
        }
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error };
    }
};
