import { Database } from 'bun:sqlite'

// Initialize database
const db = new Database('fulfillments.db', { create: true })

// Create table for fulfilled orders
db.exec(`
  CREATE TABLE IF NOT EXISTS fulfilled_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rouzao_order_id TEXT UNIQUE NOT NULL,
    shopify_order_number TEXT NOT NULL,
    shopify_order_id TEXT NOT NULL,
    fulfilled_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`)

// Create index for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_rouzao_order_id ON fulfilled_orders(rouzao_order_id)
`)

export interface FulfilledOrder {
  id?: number
  rouzao_order_id: string
  shopify_order_number: string
  shopify_order_id: string
  fulfilled_at: number
  created_at?: number
}

// Check if an order has already been fulfilled
export function isOrderFulfilled(rouzaoOrderId: string): boolean {
  const query = db.query<{ 1: number }, string>('SELECT 1 FROM fulfilled_orders WHERE rouzao_order_id = ?')
  return query.get(rouzaoOrderId) !== null
}

// Store a fulfilled order
export function storeFulfilledOrder(order: FulfilledOrder): void {
  const query = db.prepare<void, [string, string, string, number]>(`
    INSERT OR IGNORE INTO fulfilled_orders
    (rouzao_order_id, shopify_order_number, shopify_order_id, fulfilled_at)
    VALUES (?, ?, ?, ?)
  `)

  query.run(order.rouzao_order_id, order.shopify_order_number, order.shopify_order_id, order.fulfilled_at)
}

// Get all fulfilled orders (for debugging/monitoring)
export function getAllFulfilledOrders(): FulfilledOrder[] {
  const query = db.query<FulfilledOrder, []>('SELECT * FROM fulfilled_orders ORDER BY created_at DESC')
  return query.all()
}

// Clean up old fulfilled orders (keep last 30 days)
export function cleanupOldOrders(): void {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
  const query = db.prepare<void, number>('DELETE FROM fulfilled_orders WHERE created_at < ?')
  query.run(thirtyDaysAgo)
}

// Close database connection (for graceful shutdown)
export function closeDatabase(): void {
  db.close()
}
