import '@shopify/shopify-api/adapters/web-api'

import { ApiVersion, Session, shopifyApi } from '@shopify/shopify-api'

import type { Provider, TrackingInfo } from '@/types'
import type {
  FindOrderByNameQuery,
  FindOrderByNameQueryVariables,
  FulfillmentCreateMutation,
  FulfillmentCreateMutationVariables,
  GetLocationsQuery,
} from '@/types/admin.generated'
import type { FulfillmentInput } from '@/types/admin.types'

import { CREATE_FULFILLMENT, FIND_ORDER_BY_NAME, GET_LOCATIONS } from '@/lib/queries.graphql'

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env['SHOPIFY_API_KEY']!,
  apiSecretKey: process.env['SHOPIFY_API_SECRET']!,
  scopes: [
    'read_orders',
    'write_orders',
    'read_locations',
    'read_merchant_managed_fulfillment_orders',
    'write_merchant_managed_fulfillment_orders',
  ],
  hostName: process.env['SHOPIFY_APP_URL'] || 'localhost:3000',
  apiVersion: ApiVersion.July25,
  isEmbeddedApp: false,
})

// Create a session for GraphQL client
function getSession(): Session {
  return new Session({
    id: 'offline',
    shop: process.env['SHOPIFY_SHOP_DOMAIN']!,
    state: 'active',
    isOnline: false,
    accessToken: process.env['SHOPIFY_ACCESS_TOKEN']!,
  })
}

// GraphQL client
export async function createGraphQLClient() {
  const client = new shopify.clients.Graphql({
    session: getSession(),
  })
  return client
}

// Get Shopify order by number using GraphQL
export async function getOrderByNumberGraphQL(orderNumber: string) {
  try {
    const client = await createGraphQLClient()

    const response = await client.request<FindOrderByNameQuery>(FIND_ORDER_BY_NAME, {
      variables: {
        query: `name:#${orderNumber}`,
      } satisfies FindOrderByNameQueryVariables,
    })

    const data = response.data
    if (!data) {
      console.error(`[${new Date().toISOString()}] Invalid GraphQL response`)
      return null
    }

    const orders = data.orders?.edges || []
    if (orders.length === 0) {
      return null
    }

    return orders[0]?.node || null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching order via GraphQL:`, error)
    return null
  }
}

// Extract order type from the query - used internally for function parameters
type OrderNode = NonNullable<FindOrderByNameQuery['orders']['edges'][0]>['node']

// Create fulfillment for provider orders
export async function createFulfillmentGraphQL(
  order: OrderNode,
  provider: Provider,
  trackingInfo?: TrackingInfo
): Promise<boolean> {
  try {
    const client = await createGraphQLClient()

    // Find provider fulfillment orders
    const providerFulfillmentOrders =
      order.fulfillmentOrders?.edges?.filter(edge => {
        const node = edge.node
        const locationName = node.assignedLocation?.location?.name || ''
        const locationId = node.assignedLocation?.location?.id || ''

        return node.status === 'OPEN' && provider.isProviderLocation(locationName, locationId)
      }) || []

    if (providerFulfillmentOrders.length === 0) {
      console.log(`[${new Date().toISOString()}] No open ${provider.name} fulfillment orders found`)
      return false
    }

    // Process each fulfillment order
    for (const fulfillmentOrderEdge of providerFulfillmentOrders) {
      const fulfillmentOrder = fulfillmentOrderEdge.node

      // Prepare line items
      const lineItems = fulfillmentOrder.lineItems.edges
        .filter(edge => edge.node.remainingQuantity > 0)
        .map(edge => ({
          id: edge.node.id,
          quantity: edge.node.remainingQuantity,
        }))

      if (lineItems.length === 0) {
        console.log(`[${new Date().toISOString()}] No items to fulfill in fulfillment order ${fulfillmentOrder.id}`)
        continue
      }

      const fulfillmentInput: FulfillmentInput = {
        lineItemsByFulfillmentOrder: [
          {
            fulfillmentOrderId: fulfillmentOrder.id,
            fulfillmentOrderLineItems: lineItems,
          },
        ],
        notifyCustomer: true,
      }

      // Add tracking info if available
      if (trackingInfo?.trackingNumber) {
        fulfillmentInput.trackingInfo = {
          number: trackingInfo.trackingNumber,
          company: trackingInfo.trackingCompany || '',
          ...(trackingInfo.trackingUrl && { url: trackingInfo.trackingUrl }),
        }
      }

      console.log(`[${new Date().toISOString()}] Creating fulfillment for order ${order.name}`)

      // For testing, uncomment the mock
      console.log(`mock fulfill`, JSON.stringify(fulfillmentInput, null, 2))
      return true

      // const response = await client.request<FulfillmentCreateMutation>(CREATE_FULFILLMENT, {
      //   variables: {
      //     fulfillment: fulfillmentInput,
      //   } satisfies FulfillmentCreateMutationVariables,
      // })

      // const data = response.data
      // if (!data) {
      //   console.error(`[${new Date().toISOString()}] Invalid GraphQL response`)
      //   return false
      // }

      // const result = data.fulfillmentCreate
      // if (result?.userErrors && result.userErrors.length > 0) {
      //   console.error(`[${new Date().toISOString()}] Fulfillment errors:`, result.userErrors)
      //   return false
      // }

      // console.log(`[${new Date().toISOString()}] 📦 Successfully created fulfillment ${result?.fulfillment?.id}`)
    }

    return true
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating fulfillment via GraphQL:`, error)
    return false
  }
}

// Check if order can be fulfilled
export async function canFulfillOrder(order: OrderNode): Promise<boolean> {
  // Check if there are unfulfilled line items
  // In GraphQL, we need to check the fulfillment orders instead of line items
  const hasOpenFulfillmentOrders = order.fulfillmentOrders?.edges?.some(edge => edge.node.status === 'OPEN') || false

  return hasOpenFulfillmentOrders
}

// Check if order has provider items and their fulfillment status
export function checkProviderFulfillmentStatus(
  order: OrderNode,
  provider: Provider
): {
  hasProviderItems: boolean
  allProviderItemsFulfilled: boolean
} {
  const providerFulfillmentOrders =
    order.fulfillmentOrders?.edges?.filter(edge => {
      const node = edge.node
      const locationName = node.assignedLocation?.location?.name || ''
      const locationId = node.assignedLocation?.location?.id || ''

      return provider.isProviderLocation(locationName, locationId)
    }) || []

  const hasProviderItems = providerFulfillmentOrders.length > 0
  const allProviderItemsFulfilled =
    hasProviderItems && providerFulfillmentOrders.every(edge => edge.node.status !== 'OPEN')

  return { hasProviderItems, allProviderItemsFulfilled }
}

// Get all locations using GraphQL
export async function getLocationsGraphQL() {
  try {
    const client = await createGraphQLClient()

    const response = await client.request<GetLocationsQuery>(GET_LOCATIONS, {})

    const data = response.data
    if (!data) {
      console.error(`[${new Date().toISOString()}] Invalid GraphQL response`)
      return []
    }

    return data.locations?.edges?.map(edge => edge.node) || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching locations via GraphQL:`, error)
    return []
  }
}
