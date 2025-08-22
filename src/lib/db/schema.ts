import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// Define the fulfilled_orders table
export const fulfilledOrders = sqliteTable(
  'fulfilled_orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    provider: text('provider').notNull(),
    providerOrderId: text('provider_order_id').notNull(),
    shopifyOrderNumber: text('shopify_order_number').notNull(),
    shopifyOrderId: text('shopify_order_id').notNull(),
    fulfilledAt: integer('fulfilled_at').notNull(),
    createdAt: integer('created_at').notNull().default(sql`(strftime('%s', 'now'))`),
  },
  table => [
    // Indexes
    index('idx_provider_order').on(table.provider, table.providerOrderId),
    index('idx_shopify_order').on(table.shopifyOrderNumber),
    // Unique constraint
    uniqueIndex('provider_order_unique').on(table.provider, table.providerOrderId),
  ]
)

// Infer types for insert and select
export type FulfilledOrder = typeof fulfilledOrders.$inferSelect
export type NewFulfilledOrder = typeof fulfilledOrders.$inferInsert
