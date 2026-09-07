import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const reservations = sqliteTable('reservations', {
    id: text('id').primaryKey(),
    type: text('type').default('tour'),
    productName: text('product_name'),
    productId: text('product_id'),          // 예약한 상품 ID — 이름 유사매칭 대신 정확 연결용
    quoteId: text('quote_id'),              // 맞춤 견적에서 전환된 예약의 원본 견적

    customerName: text('customer_name'),
    customerEmail: text('customer_email'),
    customerPhone: text('customer_phone'),
    travelers: integer('travelers').default(1),
    startDate: text('start_date'),
    endDate: text('end_date'),
    duration: text('duration'),
    status: text('status').default('pending_payment'),
    totalPrice: real('total_price').default(0),
    depositAmount: real('deposit_amount').default(0),
    balanceAmount: real('balance_amount').default(0),
    paymentMethod: text('payment_method'),
    dailyAccommodations: text('daily_accommodations').default('[]'),
    notes: text('notes'),
    history: text('history').default('[]'),
    userId: text('user_id'),
    reservationNumber: text('reservation_number'),
    itineraryTemplateId: text('itinerary_template_id'),
    contractData: text('contract_data'),
    documentContent: text('document_content'),
    assignedGuide: text('assigned_guide'),
    contractUrl: text('contract_url'),
    itineraryUrl: text('itinerary_url'),
    depositStatus: text('deposit_status').default('unpaid'),
    balanceStatus: text('balance_status').default('unpaid'),
    areAssignmentsVisibleToUser: integer('are_assignments_visible_to_user').default(0),
    priceBreakdown: text('price_breakdown'),
    idempotencyKey: text('idempotency_key'),
    priceSource: text('price_source'),       // product_catalog | quote | admin_manual
    priceVerifiedAt: text('price_verified_at'),
    source: text('source'),                 // 주문 경로: line | email | phone | website | visit | other
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
