import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const reservations = sqliteTable('reservations', {
    id: text('id').primaryKey(), // UUID
    type: text('type').notNull(), // 'product' | 'quote'

    // Product Info
    productName: text('product_name').notNull(),

    // Customer Info
    userId: text('user_id'), // Optional link to registered user
    customerName: text('customer_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),

    // Trip Details
    date: text('date').notNull(),
    headcount: text('headcount').notNull(), // "2명"
    totalPeople: integer('total_people').notNull(),

    // Status
    status: text('status').notNull().default('pending_payment'),

    // Payment
    totalAmount: integer('total_amount').notNull(),
    deposit: integer('deposit').notNull(),
    depositStatus: text('deposit_status').notNull().default('unpaid'),
    balance: integer('balance').notNull(),
    balanceStatus: text('balance_status').notNull().default('unpaid'),

    // Logistics
    assignedGuideId: text('assigned_guide_id'), // JSON or ID? keeping simple for now
    dailyAccommodations: text('daily_accommodations'), // JSON string

    // Meta
    history: text('history'), // JSON string for logs
    areAssignmentsVisibleToUser: integer('are_assignments_visible_to_user', { mode: 'boolean' }).default(false),

    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
