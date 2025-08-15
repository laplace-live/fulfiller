import { Cron } from 'croner'

import { cleanupOldOrders, isOrderFulfilled, storeFulfilledOrder } from './db'
import { extractShopifyOrderNumber, fetchRouzaoOrderDetail, getRouzaoHeaders, getTrackingInfo } from './rouzao'
import { canFulfillOrder, createFulfillmentGraphQL, getOrderByNumberGraphQL } from './shopify'
import type { RouzaoOrderItem, RouzaoOrders } from './types'

// Process a single shipped order using GraphQL
async function processShippedOrder(order: RouzaoOrderItem): Promise<void> {
  try {
    // Check if already processed
    if (isOrderFulfilled('rouzao', order.order_id)) {
      console.log(`[${new Date().toISOString()}] Order ${order.order_id} already fulfilled, skipping...`)
      return
    }

    // Fetch order details
    const orderDetail = await fetchRouzaoOrderDetail(order.order_id)
    if (!orderDetail) {
      console.error(`[${new Date().toISOString()}] Failed to fetch details for order ${order.order_id}`)
      return
    }

    // Extract Shopify order number
    const thirdPartyOrderSn = orderDetail.data.third_party_order_sn
    if (!thirdPartyOrderSn) {
      console.log(`[${new Date().toISOString()}] No third party order SN for ${order.order_id}`)
      return
    }

    const shopifyOrderNumber = extractShopifyOrderNumber(thirdPartyOrderSn)
    if (!shopifyOrderNumber) {
      console.log(`[${new Date().toISOString()}] Invalid third party order SN format: ${thirdPartyOrderSn}`)
      return
    }

    console.log(
      `[${new Date().toISOString()}] Processing Shopify order #${shopifyOrderNumber} for Rouzao order ${order.order_id}`
    )

    // Get Shopify order using GraphQL
    const shopifyOrder = await getOrderByNumberGraphQL(shopifyOrderNumber)

    if (!shopifyOrder) {
      console.error(`[${new Date().toISOString()}] Shopify order #${shopifyOrderNumber} not found`)
      return
    }

    // Check if order can be fulfilled
    if (!(await canFulfillOrder(shopifyOrder))) {
      console.log(
        `[${new Date().toISOString()}] Order #${shopifyOrderNumber} cannot be fulfilled or has no open fulfillment orders`
      )
      return
    }

    // Get tracking info
    const trackingInfo = getTrackingInfo(orderDetail)

    console.log(`[${new Date().toISOString()}] Starting fulfillment for order #${shopifyOrderNumber}`)

    // Create fulfillment using GraphQL
    const success = await createFulfillmentGraphQL(shopifyOrder, trackingInfo)

    if (success) {
      // Store in database
      storeFulfilledOrder({
        provider: 'rouzao',
        providerOrderId: order.order_id,
        shopifyOrderNumber: shopifyOrderNumber,
        shopifyOrderId: shopifyOrder.id,
        fulfilledAt: Math.floor(Date.now() / 1000),
      })

      console.log(`[${new Date().toISOString()}] ✅ Successfully fulfilled Shopify order #${shopifyOrderNumber}`)
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing order ${order.order_id}:`, error)
  }
}

async function fetchRouzaoOrders() {
  const API_URL = 'https://api.rouzao.com/talent/order?page=1&page_size=50'

  try {
    console.log(`[${new Date().toISOString()}] Fetching orders...`)

    const resp = await fetch(API_URL, {
      headers: getRouzaoHeaders(),
    })

    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`)
    }

    const json: RouzaoOrders = await resp.json()
    console.log(`[${new Date().toISOString()}] Fetched ${json.data.data.length} orders`)

    // Process shipped orders
    const shippedOrders = json.data.data.filter(order => order.order_status === '已发货')
    console.log(`[${new Date().toISOString()}] Found ${shippedOrders.length} shipped orders`)

    // Process each shipped order
    for (const order of shippedOrders) {
      await processShippedOrder(order)
    }

    // Clean up old records periodically (once per day)
    // NOTE: disabled for now, will be enabled later
    // const now = new Date()
    // if (now.getHours() === 0 && now.getMinutes() < 5) {
    //   cleanupOldOrders()
    //   console.log(`[${new Date().toISOString()}] Cleaned up old fulfilled orders`)
    // }

    return json
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching orders:`, error)
  }
}

// Create cron job to run every 5 minutes
const job = new Cron('*/5 * * * *', async () => {
  await fetchRouzaoOrders()
})

console.log('Cron job started - fetching orders every 5 minutes')
console.log(`Next run scheduled at: ${job.nextRun()}`)

// Fetch immediately on startup
fetchRouzaoOrders()
