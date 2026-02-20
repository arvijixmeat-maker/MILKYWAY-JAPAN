import { api } from './api';

type NotificationType = 'ESTIMATE_COMPLETED' | 'GUIDE_ASSIGNED' | 'RESERVATION_REQUESTED' | 'QUOTE_RECEIVED';

interface EmailData {
    customerName: string;
    destination?: string;     // For Estimate
    productName?: string;     // For Guide/Reservation/Quote
    estimateUrl?: string;     // For Estimate
    adminNote?: string;       // For Estimate
    guideName?: string;       // For Guide
    guidePhone?: string;      // For Guide
    reservationId?: string;
    depositAmount?: string;   // For Reservation Payment
    bankAccount?: {           // For Reservation Payment
        bankName: string;
        accountNumber: string;
        accountHolder: string;
    };
}

export const sendNotificationEmail = async (
    to: string,
    type: NotificationType,
    data: EmailData
) => {
    try {
        const response = await api.notifications.sendEmail(to, type, data);
        console.log('Email sent successfully:', response);
        return { success: true, data: response };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error };
    }
};
