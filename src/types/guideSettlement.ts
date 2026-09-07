export type GuideSettlementStatus =
    | 'draft'
    | 'in_progress'
    | 'submitted'
    | 'changes_requested'
    | 'approved'
    | 'paid';

export interface GuideExpenseReceipt {
    id: string;
    reportId: string;
    itemId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    createdAt: string;
    url: string;
}

export interface GuideExpenseItem {
    id: string;
    reportId: string;
    spentAt: string;
    category: string;
    description: string;
    quantity: number;
    unitPrice: number;
    plannedAmount: number;
    actualAmount: number;
    currency: string;
    exchangeRate: number;
    baseAmount: number;
    merchant?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    receipts: GuideExpenseReceipt[];
}

export interface GuideSettlement {
    id: string;
    reservationId: string;
    reservationNumber?: string;
    guideId?: string;
    guideName: string;
    guidePhone?: string;
    title: string;
    startDate?: string;
    endDate?: string;
    travelers: number;
    baseCurrency: string;
    exchangeRate: number;
    advanceAmount: number;
    status: GuideSettlementStatus;
    adminNote?: string;
    submittedAt?: string;
    approvedAt?: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
    items?: GuideExpenseItem[];
    totals: {
        planned: number;
        actual: number;
        variance: number;
        cashBalance: number;
        reimbursement: number;
        itemCount: number;
        receiptCount: number;
        missingReceiptCount: number;
    };
}

