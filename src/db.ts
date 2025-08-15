import { Database } from 'bun:sqlite'

// Initialize database
const db = new Database('fulfillments.db', { create: true })

// Drop old table if exists (for schema migration)
db.exec(`DROP TABLE IF EXISTS fulfilled_orders`)

// Create table for fulfilled orders with multi-provider support
db.exec(`
  CREATE TABLE IF NOT EXISTS fulfilled_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    provider_order_id TEXT NOT NULL,
    shopify_order_number TEXT NOT NULL,
    shopify_order_id TEXT NOT NULL,
    fulfilled_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(provider, provider_order_id)
  )
`)

// Create indexes for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_provider_order ON fulfilled_orders(provider, provider_order_id)
`)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_shopify_order ON fulfilled_orders(shopify_order_number)
`)

export interface FulfilledOrder {
  id?: number
  provider: string
  provider_order_id: string
  shopify_order_number: string
  shopify_order_id: string
  fulfilled_at: number
  created_at?: number
}

// Check if an order has already been fulfilled
export function isOrderFulfilled(provider: string, providerOrderId: string): boolean {
  const query = db.query<{ 1: number }, [string, string]>(
    'SELECT 1 FROM fulfilled_orders WHERE provider = ? AND provider_order_id = ?'
  )
  return query.get(provider, providerOrderId) !== null
}

// Store a fulfilled order
export function storeFulfilledOrder(order: FulfilledOrder): void {
  const query = db.prepare<void, [string, string, string, string, number]>(`
    INSERT OR IGNORE INTO fulfilled_orders
    (provider, provider_order_id, shopify_order_number, shopify_order_id, fulfilled_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  query.run(
    order.provider,
    order.provider_order_id,
    order.shopify_order_number,
    order.shopify_order_id,
    order.fulfilled_at
  )
}

// Get all fulfilled orders (for debugging/monitoring)
export function getAllFulfilledOrders(provider?: string): FulfilledOrder[] {
  if (provider) {
    const query = db.query<FulfilledOrder, string>(
      'SELECT * FROM fulfilled_orders WHERE provider = ? ORDER BY created_at DESC'
    )
    return query.all(provider)
  }

  const query = db.query<FulfilledOrder, []>('SELECT * FROM fulfilled_orders ORDER BY created_at DESC')
  return query.all()
}

// Get fulfilled order by Shopify order number
export function getFulfilledOrderByShopifyNumber(shopifyOrderNumber: string): FulfilledOrder | null {
  const query = db.query<FulfilledOrder, string>(
    'SELECT * FROM fulfilled_orders WHERE shopify_order_number = ? ORDER BY created_at DESC LIMIT 1'
  )
  return query.get(shopifyOrderNumber) || null
}

// Clean up old fulfilled orders (keep last 30 days)
export function cleanupOldOrders(): void {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
  const query = db.prepare<void, number>('DELETE FROM fulfilled_orders WHERE created_at < ?')
  query.run(thirtyDaysAgo)
}

// Get statistics by provider
export function getProviderStats(): { provider: string; count: number }[] {
  const query = db.query<{ provider: string; count: number }, []>(
    'SELECT provider, COUNT(*) as count FROM fulfilled_orders GROUP BY provider ORDER BY count DESC'
  )
  return query.all()
}

// Close database connection (for graceful shutdown)
export function closeDatabase(): void {
  db.close()
}

// Export database instance for advanced queries if needed
export { db }
