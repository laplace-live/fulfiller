import { and, desc, eq, lt, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'

import { fulfilledOrders, type FulfilledOrder, type NewFulfilledOrder } from '@/lib/db/schema'

// Initialize Turso database connection
const db = drizzle({
  connection: {
    url: process.env['TURSO_DATABASE_URL']!,
    authToken: process.env['TURSO_AUTH_TOKEN']!,
  },
})

// Re-export types from schema
export type { FulfilledOrder, NewFulfilledOrder } from '@/lib/db/schema'

// Check if an order has already been fulfilled
export async function isOrderFulfilled(provider: string, providerOrderId: string): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`1` })
    .from(fulfilledOrders)
    .where(and(eq(fulfilledOrders.provider, provider), eq(fulfilledOrders.providerOrderId, providerOrderId)))
    .get()

  return result !== undefined
}

// Store a fulfilled order
export async function storeFulfilledOrder(order: NewFulfilledOrder): Promise<void> {
  await db.insert(fulfilledOrders).values(order).onConflictDoNothing().run()
}

// Get all fulfilled orders (for debugging/monitoring)
export async function getAllFulfilledOrders(provider?: string): Promise<FulfilledOrder[]> {
  return provider
    ? await db
        .select()
        .from(fulfilledOrders)
        .where(eq(fulfilledOrders.provider, provider))
        .orderBy(desc(fulfilledOrders.createdAt))
        .all()
    : await db.select().from(fulfilledOrders).orderBy(desc(fulfilledOrders.createdAt)).all()
}

// Clean up old fulfilled orders (keep last 365 days)
export async function cleanupOldOrders(): Promise<void> {
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60
  await db.delete(fulfilledOrders).where(lt(fulfilledOrders.createdAt, oneYearAgo)).run()
}

// Get statistics by provider
export async function getProviderStats(): Promise<{ provider: string; count: number }[]> {
  const results = await db
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
