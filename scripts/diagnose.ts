import '@shopify/shopify-api/adapters/web-api'

import { ApiVersion, Session, shopifyApi } from '@shopify/shopify-api'

import { getAllFulfilledOrders, getProviderStats } from '@/lib/db/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('diagnose')

// Check environment variables
logger.info('=== Environment Check ===')
logger.info(`SHOPIFY_API_KEY: ${process.env['SHOPIFY_API_KEY'] ? '✓ Set' : '✗ Missing'}`)
logger.info(`SHOPIFY_API_SECRET: ${process.env['SHOPIFY_API_SECRET'] ? '✓ Set' : '✗ Missing'}`)
logger.info(`SHOPIFY_ACCESS_TOKEN: ${process.env['SHOPIFY_ACCESS_TOKEN'] ? '✓ Set' : '✗ Missing'}`)
logger.info(`SHOPIFY_SHOP_DOMAIN: ${process.env['SHOPIFY_SHOP_DOMAIN'] || 'Missing'}`)
logger.info('')

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

// Create a session
const session = new Session({
  id: 'offline',
  shop: process.env['SHOPIFY_SHOP_DOMAIN']!,
  state: 'active',
  isOnline: false,
  accessToken: process.env['SHOPIFY_ACCESS_TOKEN']!,
})

// GraphQL queries
const SHOP_QUERY = `#graphql
  query getShop {
    shop {
      name
      email
      currencyCode
      primaryDomain {
        url
      }
    }
  }
`

const LOCATIONS_QUERY = `#graphql
  query getLocations {
    locations(first: 50) {
      edges {
        node {
          id
          name
          isActive
        }
      }
    }
  }
`

const ORDERS_QUERY = `#graphql
  query getRecentOrder {
    orders(first: 1) {
      edges {
        node {
          id
          name
          displayFulfillmentStatus
          fulfillmentOrders(first: 10) {
            edges {
              node {
                id
                status
                assignedLocation {
                  location {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

const ACCESS_SCOPES_QUERY = `#graphql
  query getAccessScopes {
    shop {
      id
    }
    appInstallation {
      accessScopes {
        handle
      }
    }
  }
`

async function diagnose() {
  logger.info('=== Testing Shopify GraphQL API Access ===')

  const client = new shopify.clients.Graphql({ session })

  // Test 1: Shop info (basic test)
  try {
    logger.info('\n1. Testing shop access...')
    const shopResponse = await client.request(SHOP_QUERY)

    if (shopResponse.data) {
      const shop = shopResponse.data.shop
      logger.info(`✓ Shop access successful: ${shop.name}`)
      logger.info(`  - Email: ${shop.email}`)
      logger.info(`  - Currency: ${shop.currencyCode}`)
      logger.info(`  - Domain: ${shop.primaryDomain.url}`)
    }
  } catch (error) {
    logger.error({ error }, '✗ Shop access failed')
  }

  // Test 2: Access scopes
  try {
    logger.info('\n2. Checking access scopes...')
    const scopeResponse = await client.request(ACCESS_SCOPES_QUERY)

    if (scopeResponse.data) {
      if (scopeResponse.data.appInstallation?.accessScopes) {
        const scopes = scopeResponse.data.appInstallation.accessScopes.map(s => s.handle).join(', ')
        logger.info(`✓ Access scopes: ${scopes}`)
      }
    }
  } catch (error) {
    logger.error({ error }, '✗ Scope check failed')
  }

  // Test 3: Locations access
  try {
    logger.info('\n3. Testing locations access...')
    const locationsResponse = await client.request(LOCATIONS_QUERY)

    if (locationsResponse.data) {
      const locations = locationsResponse.data.locations.edges
      logger.info(`✓ Locations access successful. Found ${locations.length} locations:`)
      locations.forEach(edge => {
        const loc = edge.node
        logger.info(`   - ${loc.name} (ID: ${loc.id}) ${loc.isActive ? '' : '[INACTIVE]'}`)
      })
    }
  } catch (error) {
    logger.error({ error }, '✗ Locations access failed')
  }

  // Test 4: Orders and Fulfillment Orders access
  try {
    logger.info('\n4. Testing orders access...')
    const ordersResponse = await client.request(ORDERS_QUERY)

    if (ordersResponse.data) {
      const orders = ordersResponse.data.orders.edges
      logger.info('✓ Orders access successful')

      if (orders.length > 0 && orders[0]) {
        const order = orders[0].node
        logger.info(`  - Recent order: ${order.name} (${order.displayFulfillmentStatus})`)

        // Test 4b: Fulfillment orders are included in the same query
        if (order.fulfillmentOrders?.edges) {
          logger.info('\n4b. Fulfillment orders included in query:')
          logger.info(`  ✓ Found ${order.fulfillmentOrders.edges.length} fulfillment orders`)

          order.fulfillmentOrders.edges.forEach(foEdge => {
            const fo = foEdge.node
            logger.info(
              `     - FO ${fo.id.split('/').pop()} (${fo.status}) at ${fo.assignedLocation?.location?.name || 'Unknown location'}`
            )
          })
        }
      } else {
        logger.info('  - No orders found in the store')
      }
    }
  } catch (error) {
    logger.error({ error }, '✗ Orders access failed')
  }

  // Test 5: Verify Rouzao locations
  logger.info('\n5. Checking for Rouzao locations...')
  try {
    const locationsResponse = await client.request(LOCATIONS_QUERY)

    if (locationsResponse.data) {
      const locations = locationsResponse.data.locations.edges

      const rouzaoLocations = locations.filter(edge => {
        const loc = edge.node
        return (
          loc.name.toLowerCase().includes('rouzao') ||
          loc.id === 'gid://shopify/Location/89848578324' ||
          loc.id === 'gid://shopify/Location/93230334228'
        )
      })

      if (rouzaoLocations.length > 0) {
        logger.info('✓ Found Rouzao locations:')
        rouzaoLocations.forEach(edge => {
          const loc = edge.node
          logger.info(`   - ${loc.name} (ID: ${loc.id})`)
        })
      } else {
        logger.warn('⚠ No Rouzao locations found. The app will not be able to fulfill orders.')
      }
    }
  } catch (error) {
    logger.error({ error }, '✗ Failed to check Rouzao locations')
  }

  // Test 6: Check database statistics
  logger.info('\n6. Database Statistics...')
  try {
    const stats = await getProviderStats()
    if (stats.length > 0) {
      logger.info('✓ Fulfillment statistics by provider:')
      stats.forEach(stat => {
        logger.info(`   - ${stat.provider}: ${stat.count} orders`)
      })

      // Show recent fulfillments
      const recentOrders = (await getAllFulfilledOrders()).slice(0, 5)
      if (recentOrders.length > 0) {
        logger.info('\n   Recent fulfillments:')
        recentOrders.forEach(order => {
          const date = new Date(order.createdAt * 1000).toISOString()
          logger.info(
            `   - ${order.provider} #${order.providerOrderId} → Shopify #${order.shopifyOrderNumber} (${date})`
          )
        })
      }
    } else {
      logger.info('✓ No fulfillments in database yet')
    }
  } catch (error) {
    logger.error({ error }, '✗ Failed to read database')
  }
}

diagnose().catch(error => logger.error({ error }, 'Diagnose script failed'))
