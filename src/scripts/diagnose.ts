import '@shopify/shopify-api/adapters/web-api'

import { ApiVersion, Session, shopifyApi } from '@shopify/shopify-api'

import { getAllFulfilledOrders, getProviderStats } from '../db'

// Check environment variables
console.log('=== Environment Check ===')
console.log('SHOPIFY_API_KEY:', process.env['SHOPIFY_API_KEY'] ? '✓ Set' : '✗ Missing')
console.log('SHOPIFY_API_SECRET:', process.env['SHOPIFY_API_SECRET'] ? '✓ Set' : '✗ Missing')
console.log('SHOPIFY_ACCESS_TOKEN:', process.env['SHOPIFY_ACCESS_TOKEN'] ? '✓ Set' : '✗ Missing')
console.log('SHOPIFY_SHOP_DOMAIN:', process.env['SHOPIFY_SHOP_DOMAIN'] || 'Missing')
console.log('')

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
  console.log('=== Testing Shopify GraphQL API Access ===')

  const client = new shopify.clients.Graphql({ session })

  // Test 1: Shop info (basic test)
  try {
    console.log('\n1. Testing shop access...')
    const shopResponse = await client.request(SHOP_QUERY)

    if (shopResponse.data) {
      const shop = shopResponse.data.shop
      console.log('✓ Shop access successful:', shop.name)
      console.log('  - Email:', shop.email)
      console.log('  - Currency:', shop.currencyCode)
      console.log('  - Domain:', shop.primaryDomain.url)
    }
  } catch (error: any) {
    console.error('✗ Shop access failed:', error.message)
    if (error.response) {
      console.error('Response:', error.response)
    }
  }

  // Test 2: Access scopes
  try {
    console.log('\n2. Checking access scopes...')
    const scopeResponse = await client.request(ACCESS_SCOPES_QUERY)

    if (scopeResponse.data) {
      if (scopeResponse.data.appInstallation?.accessScopes) {
        const scopes = scopeResponse.data.appInstallation.accessScopes.map((s: any) => s.handle).join(', ')
        console.log('✓ Access scopes:', scopes)
      } else {
        // Fallback to REST API for access scopes if GraphQL doesn't work
        console.log('  GraphQL access scopes not available, trying REST API...')
        const restResponse = await fetch(
          `https://${process.env['SHOPIFY_SHOP_DOMAIN']}/admin/oauth/access_scopes.json`,
          {
            headers: {
              'X-Shopify-Access-Token': process.env['SHOPIFY_ACCESS_TOKEN']!,
              'Content-Type': 'application/json',
            },
          }
        )

        if (restResponse.ok) {
          const scopes = await restResponse.json()
          console.log('✓ Access scopes (via REST):', scopes.access_scopes.map((s: any) => s.handle).join(', '))
        }
      }
    }
  } catch (error: any) {
    console.error('✗ Scope check failed:', error.message)
  }

  // Test 3: Locations access
  try {
    console.log('\n3. Testing locations access...')
    const locationsResponse = await client.request(LOCATIONS_QUERY)

    if (locationsResponse.data) {
      const locations = locationsResponse.data.locations.edges
      console.log('✓ Locations access successful. Found', locations.length, 'locations:')
      locations.forEach((edge: any) => {
        const loc = edge.node
        console.log(`   - ${loc.name} (ID: ${loc.id}) ${loc.isActive ? '' : '[INACTIVE]'}`)
      })
    }
  } catch (error: any) {
    console.error('✗ Locations access failed:', error.message)
    if (error.response) {
      console.error('Response:', error.response)
    }
  }

  // Test 4: Orders and Fulfillment Orders access
  try {
    console.log('\n4. Testing orders access...')
    const ordersResponse = await client.request(ORDERS_QUERY)

    if (ordersResponse.data) {
      const orders = ordersResponse.data.orders.edges
      console.log('✓ Orders access successful')

      if (orders.length > 0 && orders[0]) {
        const order = orders[0].node
        console.log(`  - Recent order: ${order.name} (${order.displayFulfillmentStatus})`)

        // Test 4b: Fulfillment orders are included in the same query
        if (order.fulfillmentOrders?.edges) {
          console.log('\n4b. Fulfillment orders included in query:')
          console.log(`  ✓ Found ${order.fulfillmentOrders.edges.length} fulfillment orders`)

          order.fulfillmentOrders.edges.forEach((foEdge: any) => {
            const fo = foEdge.node
            console.log(
              `     - FO ${fo.id.split('/').pop()} (${fo.status}) at ${fo.assignedLocation?.location?.name || 'Unknown location'}`
            )
          })
        }
      } else {
        console.log('  - No orders found in the store')
      }
    }
  } catch (error: any) {
    console.error('✗ Orders access failed:', error.message)
    if (error.response) {
      console.error('Response:', error.response)
    }
  }

  // Test 5: Verify Rouzao locations
  console.log('\n5. Checking for Rouzao locations...')
  try {
    const locationsResponse = await client.request(LOCATIONS_QUERY)

    if (locationsResponse.data) {
      const locations = locationsResponse.data.locations.edges

      const rouzaoLocations = locations.filter((edge: any) => {
        const loc = edge.node
        return (
          loc.name.toLowerCase().includes('rouzao') ||
          loc.id === 'gid://shopify/Location/89848578324' ||
          loc.id === 'gid://shopify/Location/93230334228'
        )
      })

      if (rouzaoLocations.length > 0) {
        console.log('✓ Found Rouzao locations:')
        rouzaoLocations.forEach((edge: any) => {
          const loc = edge.node
          console.log(`   - ${loc.name} (ID: ${loc.id})`)
        })
      } else {
        console.log('⚠ No Rouzao locations found. The app will not be able to fulfill orders.')
      }
    }
  } catch (error: any) {
    console.error('✗ Failed to check Rouzao locations:', error.message)
  }

  // Test 6: Check database statistics
  console.log('\n6. Database Statistics...')
  try {
    const stats = getProviderStats()
    if (stats.length > 0) {
      console.log('✓ Fulfillment statistics by provider:')
      stats.forEach(stat => {
        console.log(`   - ${stat.provider}: ${stat.count} orders`)
      })

      // Show recent fulfillments
      const recentOrders = getAllFulfilledOrders().slice(0, 5)
      if (recentOrders.length > 0) {
        console.log('\n   Recent fulfillments:')
        recentOrders.forEach(order => {
          const date = new Date(order.createdAt * 1000).toISOString()
          console.log(
            `   - ${order.provider} #${order.providerOrderId} → Shopify #${order.shopifyOrderNumber} (${date})`
          )
        })
      }
    } else {
      console.log('✓ No fulfillments in database yet')
    }
  } catch (error: any) {
    console.error('✗ Failed to read database:', error.message)
  }
}

diagnose().catch(console.error)
