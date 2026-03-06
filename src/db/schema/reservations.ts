import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const reservations = sqliteTable('reservations', {
    id: text('id').primaryKey(),
    type: text('type').default('tour'),
    productName: text('product_name'),
    customerName: text('customer_name'),
    customerEmail: text('customer_email'),
    customerPhone: text('customer_phone'),
    travelers: integer('travelers').default(1),
    startDate: text('start_date'),
    endDate: text('end_date'),
    status: text('status').default('pending_payment'),
    totalPrice: real('total_price').default(0),
    depositAmount: real('deposit_amount').default(0),
    balanceAmount: real('balance_amount').default(0),
    paymentMethod: text('payment_method'),
    dailyAccommodations: text('daily_accommodations').default('[]'),
    notes: text('notes'),
    history: text('history').default('[]'),
    userId: text('user_id'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
