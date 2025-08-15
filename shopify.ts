import '@shopify/shopify-api/adapters/web-api'

import { ApiVersion, Session, shopifyApi } from '@shopify/shopify-api'

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env['SHOPIFY_API_KEY']!,
  apiSecretKey: process.env['SHOPIFY_API_SECRET']!,
  scopes: [
    'read_orders',
    'write_orders',
    // 'read_fulfillments',
    // 'write_fulfillments',
    'read_merchant_managed_fulfillment_orders',
    'write_merchant_managed_fulfillment_orders',
    // 'read_assigned_fulfillment_orders',
    // 'write_assigned_fulfillment_orders',
  ],
  hostName: process.env['SHOPIFY_APP_URL'] || 'localhost:3000',
  apiVersion: ApiVersion.October24,
  isEmbeddedApp: false,
})

// Create a session for API access
function getSession(): Session {
  return new Session({
    id: 'offline',
    shop: process.env['SHOPIFY_SHOP_DOMAIN']!,
    state: 'active',
    isOnline: false,
    accessToken: process.env['SHOPIFY_ACCESS_TOKEN']!,
  })
}

export interface ShopifyOrder {
  id: string
  name: string // Order number like #1234
  fulfillment_status: string | null
  line_items: {
    id: string
    name: string
    quantity: number
    fulfillable_quantity: number
    fulfillment_service: string
    requires_shipping: boolean
  }[]
  fulfillment_orders?: {
    id: string
    status: string
    assigned_location: {
      name: string
      location_id: string
    }
    line_items: {
      id: string
      quantity: number
      line_item_id: string
    }[]
  }[]
}

// Get order by order number with fulfillment orders
export async function getShopifyOrderByNumber(orderNumber: string): Promise<ShopifyOrder | null> {
  try {
    const client = new shopify.clients.Rest({ session: getSession() })

    // Search for order by name (order number)
    const response = await client.get<{ orders: ShopifyOrder[] }>({
      path: 'orders',
      query: {
        name: orderNumber,
        status: 'any',
        fields: 'id,name,fulfillment_status,line_items',
      },
    })

    if (response.body.orders.length > 0) {
      const order = response.body.orders[0]

      if (order) {
        // Get fulfillment orders for this order
        try {
          const fulfillmentOrdersResponse = await client.get<{ fulfillment_orders: any[] }>({
            path: `orders/${order.id}/fulfillment_orders`,
          })

          order.fulfillment_orders = fulfillmentOrdersResponse.body.fulfillment_orders
        } catch (error) {
          console.log(
            `[${new Date().toISOString()}] Could not fetch fulfillment orders, continuing without them`,
            error
          )
        }

        return order
      }
    }

    return null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching Shopify order:`, error)
    return null
  }
}

// Create fulfillment using fulfillment orders API
export async function createFulfillmentForRouzao(
  order: ShopifyOrder,
  trackingNumber?: string,
  trackingCompany?: string
): Promise<boolean> {
  try {
    const client = new shopify.clients.Rest({ session: getSession() })

    // Find Rouzao fulfillment orders
    // Known Rouzao location IDs: 89848578324 (Rouzao Warehouse), 93230334228 (Rouzao EMS Warehouse)
    const rouzaoFulfillmentOrders =
      order.fulfillment_orders?.filter(
        fo => fo.assigned_location.name.toLowerCase().includes('rouzao')
        // fo.assigned_location.location_id === '89848578324' || // Rouzao Warehouse
        // fo.assigned_location.location_id === '93230334228' // Rouzao EMS Warehouse
      ) || []

    if (rouzaoFulfillmentOrders.length === 0) {
      console.log(`[${new Date().toISOString()}] No fulfillment orders found for Rouzao`)
      return false
    }

    // Process each fulfillment order
    for (const fulfillmentOrder of rouzaoFulfillmentOrders) {
      if (fulfillmentOrder.status !== 'open') {
        console.log(
          `[${new Date().toISOString()}] Fulfillment order ${fulfillmentOrder.id} is not open (status: ${fulfillmentOrder.status})`
        )
        continue
      }

      const fulfillmentData = {
        fulfillment: {
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_id: fulfillmentOrder.id,
              fulfillment_order_line_items: fulfillmentOrder.line_items.map((item: any) => ({
                id: item.id,
                quantity: item.quantity,
              })),
            },
          ],
          tracking_info: {
            number: trackingNumber,
            company: trackingCompany,
          },
          notify_customer: true,
        },
      }

      console.log(`[${new Date().toISOString()}] Creating fulfillment for order ${order.name}`)

      // For testing, uncomment the mock
      console.log(`mock fulfill`, JSON.stringify(fulfillmentData, null, 2))
      return true

      await client.post({
        path: 'fulfillments',
        data: fulfillmentData,
      })

      console.log(`[${new Date().toISOString()}] Successfully created fulfillment for order ${order.name}`)
    }

    return true
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating fulfillment:`, error)
    return false
  }
}

// Check if order can be fulfilled
export async function canFulfillOrder(order: ShopifyOrder): Promise<boolean> {
  // Check if there are unfulfilled line items
  const hasUnfulfilledItems = order.line_items.some(item => item.fulfillable_quantity > 0 && item.requires_shipping)

  if (!hasUnfulfilledItems) {
    return false
  }

  // Check if there are open fulfillment orders
  const hasOpenFulfillmentOrders = order.fulfillment_orders?.some(fo => fo.status === 'open') || false

  return hasOpenFulfillmentOrders
}
