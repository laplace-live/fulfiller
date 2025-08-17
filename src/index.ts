import { Cron } from 'croner'

import type { Provider, ProviderOrder } from '@/types'

import { cleanupOldOrders, isOrderFulfilled, storeFulfilledOrder } from '@/lib/db/client'
import { createLogger } from '@/lib/logger'
import { providerRegistry } from '@/lib/providers/registry'
import {
  canFulfillOrder,
  checkProviderFulfillmentStatus,
  createFulfillmentGraphQL,
  getOrderByNumberGraphQL,
} from '@/lib/shopify'

const logger = createLogger('main')

// Process a single shipped order from a provider
async function processShippedOrder(provider: Provider, order: ProviderOrder): Promise<void> {
  try {
    // Check if already processed
    if (await isOrderFulfilled(provider.id, order.orderId)) {
      logger.info({ provider: provider.name, orderId: order.orderId }, `Order already fulfilled, skipping...`)
      return
    }

    // Fetch order details from provider
    const orderDetail = await provider.fetchOrderDetail(order.orderId)
    if (!orderDetail) {
      logger.error({ provider: provider.name, orderId: order.orderId }, `Failed to fetch details for order`)
      return
    }

    // Extract Shopify order number
    const shopifyOrderNumber = provider.extractShopifyOrderNumber(orderDetail)
    if (!shopifyOrderNumber) {
      logger.info({ provider: provider.name, orderId: order.orderId }, `No Shopify order number found`)
      return
    }

    logger.info({ provider: provider.name, orderId: order.orderId, shopifyOrderNumber }, `Processing Shopify order`)

    // Get Shopify order using GraphQL
    const shopifyOrder = await getOrderByNumberGraphQL(shopifyOrderNumber)

    if (!shopifyOrder) {
      logger.error({ provider: provider.name, shopifyOrderNumber }, `Shopify order not found`)
      return
    }

    // Check provider fulfillment status
    const { hasProviderItems, allProviderItemsFulfilled } = checkProviderFulfillmentStatus(shopifyOrder, provider)

    // Case 1: Order has provider items that are already fulfilled
    if (hasProviderItems && allProviderItemsFulfilled) {
      logger.info(
        { provider: provider.name, shopifyOrderNumber },
        `Order has ${provider.name} items but they're already fulfilled`
      )

      // Store this state to avoid repeated checks
      await storeFulfilledOrder({
        provider: provider.id,
        providerOrderId: order.orderId,
        shopifyOrderNumber: shopifyOrderNumber,
        shopifyOrderId: shopifyOrder.id,
        fulfilledAt: Math.floor(Date.now() / 1000),
      })

      logger.info({ provider: provider.name, shopifyOrderNumber }, `Stored state for order to skip future checks`)
      return
    }

    // Case 2: Order has no provider items at all
    if (!hasProviderItems) {
      logger.info(
        { provider: provider.name, shopifyOrderNumber },
        `Order has no ${provider.name} location items, skipping`
      )
      // Don't store in DB - this order is not relevant to this provider
      return
    }

    // Case 3: Order has provider items that need fulfillment
    // First check if the entire order can be fulfilled
    if (!(await canFulfillOrder(shopifyOrder))) {
      logger.info(
        { provider: provider.name, shopifyOrderNumber },
        `Order cannot be fulfilled (no open fulfillment orders)`
      )
      // Don't store - this might be a temporary state
      return
    }

    // Get tracking info and attempt fulfillment
    const trackingInfo = provider.getTrackingInfo(orderDetail)
    logger.info({ provider: provider.name, shopifyOrderNumber }, `Starting fulfillment for order`)

    const success = await createFulfillmentGraphQL(shopifyOrder, provider, trackingInfo)

    if (success) {
      logger.info({ provider: provider.name, shopifyOrderNumber }, `✅ Successfully fulfilled Shopify order`)

      // Store successful fulfillment
      await storeFulfilledOrder({
        provider: provider.id,
        providerOrderId: order.orderId,
        shopifyOrderNumber: shopifyOrderNumber,
        shopifyOrderId: shopifyOrder.id,
        fulfilledAt: Math.floor(Date.now() / 1000),
      })
    } else {
      logger.info(
        { provider: provider.name, shopifyOrderNumber },
        `Failed to fulfill order (no open ${provider.name} items found)`
      )
      // Don't store - this might be a temporary state or error
    }
  } catch (error) {
    logger.error({ provider: provider.name, orderId: order.orderId, error }, `Error processing order`)
  }
}

// Process orders from all enabled providers
async function processAllProviders() {
  const providers = providerRegistry.getEnabledProviders()

  logger.info({ count: providers.length }, `Processing enabled provider(s)...`)

  for (const provider of providers) {
    try {
      // Fetch shipped orders from provider
      const shippedOrders = await provider.fetchShippedOrders()

      // Process each shipped order
      for (const order of shippedOrders) {
        await processShippedOrder(provider, order)
      }
    } catch (error) {
      logger.error({ provider: provider.name, error }, `Error processing provider`)
    }
  }

  // Clean up old records periodically (once per day)
  const now = new Date()
  if (now.getHours() === 0 && now.getMinutes() < 5) {
    await cleanupOldOrders()
    logger.info(`Cleaned up old fulfilled orders`)
  }
}

// Check for --once flag
const runOnce = process.argv.includes('--once')

// Show startup info
logger.info(`LAPLACE fulfiller ${runOnce ? '(one-time run)' : 'started'}`)
logger.info({ providers: providerRegistry.getEnabledProviders().map(p => p.name) }, `Registered providers`)

if (!runOnce) {
  // Create cron job
  const job = new Cron('*/5 * * * *', async () => {
    await processAllProviders()
  })

  logger.info({ nextRun: job.nextRun() }, `Next run scheduled`)
}

// Process once and exit
await processAllProviders()
