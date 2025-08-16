import { Cron } from 'croner'

import type { Provider, ProviderOrder } from '@/types'

import { cleanupOldOrders, isOrderFulfilled, storeFulfilledOrder } from '@/lib/db/client'
import { providerRegistry } from '@/lib/providers/registry'
import {
  canFulfillOrder,
  checkProviderFulfillmentStatus,
  createFulfillmentGraphQL,
  getOrderByNumberGraphQL,
} from '@/lib/shopify'

// Process a single shipped order from a provider
async function processShippedOrder(provider: Provider, order: ProviderOrder): Promise<void> {
  try {
    // Check if already processed
    if (isOrderFulfilled(provider.id, order.orderId)) {
      console.log(
        `[${new Date().toISOString()}] [${provider.name}] Order ${order.orderId} already fulfilled, skipping...`
      )
      return
    }

    // Fetch order details from provider
    const orderDetail = await provider.fetchOrderDetail(order.orderId)
    if (!orderDetail) {
      console.error(
        `[${new Date().toISOString()}] [${provider.name}] Failed to fetch details for order ${order.orderId}`
      )
      return
    }

    // Extract Shopify order number
    const shopifyOrderNumber = provider.extractShopifyOrderNumber(orderDetail)
    if (!shopifyOrderNumber) {
      console.log(`[${new Date().toISOString()}] [${provider.name}] No Shopify order number found for ${order.orderId}`)
      return
    }

    console.log(
      `[${new Date().toISOString()}] [${provider.name}] Processing Shopify order #${shopifyOrderNumber} for order ${order.orderId}`
    )

    // Get Shopify order using GraphQL
    const shopifyOrder = await getOrderByNumberGraphQL(shopifyOrderNumber)

    if (!shopifyOrder) {
      console.error(`[${new Date().toISOString()}] [${provider.name}] Shopify order #${shopifyOrderNumber} not found`)
      return
    }

    // Check provider fulfillment status
    const { hasProviderItems, allProviderItemsFulfilled } = checkProviderFulfillmentStatus(shopifyOrder, provider)

    // Case 1: Order has provider items that are already fulfilled
    if (hasProviderItems && allProviderItemsFulfilled) {
      console.log(
        `[${new Date().toISOString()}] [${provider.name}] Order #${shopifyOrderNumber} has ${provider.name} items but they're already fulfilled`
      )

      // Store this state to avoid repeated checks
      storeFulfilledOrder({
        provider: provider.id,
        providerOrderId: order.orderId,
        shopifyOrderNumber: shopifyOrderNumber,
        shopifyOrderId: shopifyOrder.id,
        fulfilledAt: Math.floor(Date.now() / 1000),
      })

      console.log(
        `[${new Date().toISOString()}] [${provider.name}] Stored state for order #${shopifyOrderNumber} to skip future checks`
      )
      return
    }

    // Case 2: Order has no provider items at all
    if (!hasProviderItems) {
      console.log(
        `[${new Date().toISOString()}] [${provider.name}] Order #${shopifyOrderNumber} has no ${provider.name} location items, skipping`
      )
      // Don't store in DB - this order is not relevant to this provider
      return
    }

    // Case 3: Order has provider items that need fulfillment
    // First check if the entire order can be fulfilled
    if (!(await canFulfillOrder(shopifyOrder))) {
      console.log(
        `[${new Date().toISOString()}] [${provider.name}] Order #${shopifyOrderNumber} cannot be fulfilled (no open fulfillment orders)`
      )
      // Don't store - this might be a temporary state
      return
    }

    // Get tracking info and attempt fulfillment
    const trackingInfo = provider.getTrackingInfo(orderDetail)
    console.log(
      `[${new Date().toISOString()}] [${provider.name}] Starting fulfillment for order #${shopifyOrderNumber}`
    )

    const success = await createFulfillmentGraphQL(shopifyOrder, provider, trackingInfo)

    if (success) {
      console.log(
        `[${new Date().toISOString()}] [${provider.name}] ✅ Successfully fulfilled Shopify order #${shopifyOrderNumber}`
      )

      // Store successful fulfillment
      storeFulfilledOrder({
        provider: provider.id,
        providerOrderId: order.orderId,
        shopifyOrderNumber: shopifyOrderNumber,
        shopifyOrderId: shopifyOrder.id,
        fulfilledAt: Math.floor(Date.now() / 1000),
      })
    } else {
      console.log(
        `[${new Date().toISOString()}] [${provider.name}] Failed to fulfill order #${shopifyOrderNumber} (no open ${provider.name} items found)`
      )
      // Don't store - this might be a temporary state or error
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [${provider.name}] Error processing order ${order.orderId}:`, error)
  }
}

// Process orders from all enabled providers
async function processAllProviders() {
  const providers = providerRegistry.getEnabledProviders()

  console.log(`[${new Date().toISOString()}] Processing ${providers.length} enabled provider(s)...`)

  for (const provider of providers) {
    try {
      // Fetch shipped orders from provider
      const shippedOrders = await provider.fetchShippedOrders()

      // Process each shipped order
      for (const order of shippedOrders) {
        await processShippedOrder(provider, order)
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [${provider.name}] Error processing provider:`, error)
    }
  }

  // Clean up old records periodically (once per day)
  const now = new Date()
  if (now.getHours() === 0 && now.getMinutes() < 5) {
    cleanupOldOrders()
    console.log(`[${new Date().toISOString()}] Cleaned up old fulfilled orders`)
  }
}

// Check for --once flag
const runOnce = process.argv.includes('--once')

// Show startup info
console.log(`LAPLACE fulfiller ${runOnce ? '(one-time run)' : 'started'}`)
console.log(
  `Registered providers: ${
    providerRegistry
      .getEnabledProviders()
      .map(p => p.name)
      .join(', ') || 'None'
  }`
)

if (!runOnce) {
  // Create cron job
  const job = new Cron('*/5 * * * *', async () => {
    await processAllProviders()
  })

  console.log(`Next run scheduled at: ${job.nextRun()}`)
}

// Process once and exit
await processAllProviders()
