import { Database } from 'bun:sqlite'
import { and, desc, eq, lt, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'

import { fulfilledOrders, type FulfilledOrder, type NewFulfilledOrder } from '@/lib/db/schema'

// Initialize SQLite database
const sqlite = new Database('fulfillments.db', { create: true })
const db = drizzle(sqlite)

// Re-export types from schema
export type { FulfilledOrder, NewFulfilledOrder } from '@/lib/db/schema'

// Check if an order has already been fulfilled
export function isOrderFulfilled(provider: string, providerOrderId: string): boolean {
  const result = db
    .select({ count: sql<number>`1` })
    .from(fulfilledOrders)
    .where(and(eq(fulfilledOrders.provider, provider), eq(fulfilledOrders.providerOrderId, providerOrderId)))
    .get()

  return result !== undefined
}

// Store a fulfilled order
export function storeFulfilledOrder(order: NewFulfilledOrder): void {
  db.insert(fulfilledOrders).values(order).onConflictDoNothing().run()
}

// Get all fulfilled orders (for debugging/monitoring)
export function getAllFulfilledOrders(provider?: string): FulfilledOrder[] {
  return provider
    ? db
        .select()
        .from(fulfilledOrders)
        .where(eq(fulfilledOrders.provider, provider))
        .orderBy(desc(fulfilledOrders.createdAt))
        .all()
    : db.select().from(fulfilledOrders).orderBy(desc(fulfilledOrders.createdAt)).all()
}

// Clean up old fulfilled orders (keep last 30 days)
export function cleanupOldOrders(): void {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
  db.delete(fulfilledOrders).where(lt(fulfilledOrders.createdAt, thirtyDaysAgo)).run()
}

// Get statistics by provider
export function getProviderStats(): { provider: string; count: number }[] {
  const results = db
    .select({
      provider: fulfilledOrders.provider,
      count: sql<number>`count(*)`,
    })
    .from(fulfilledOrders)
    .groupBy(fulfilledOrders.provider)
    .orderBy(desc(sql`count(*)`))
    .all()

  return results
}

// Export database instance for advanced queries if needed
export { db }
