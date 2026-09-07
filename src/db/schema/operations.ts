import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const auditLogs = sqliteTable('audit_logs', {
    id: text('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    actorId: text('actor_id'),
    actorRole: text('actor_role'),
    previousData: text('previous_data'),
    nextData: text('next_data'),
    metadata: text('metadata'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
