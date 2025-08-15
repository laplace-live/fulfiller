import '@shopify/shopify-api/adapters/web-api'

import { ApiVersion, Session, shopifyApi } from '@shopify/shopify-api'

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
    // 'read_fulfillments',
    // 'write_fulfillments',
    // 'read_locations',
    'read_merchant_managed_fulfillment_orders',
    'write_merchant_managed_fulfillment_orders',
    // 'read_assigned_fulfillment_orders',
    // 'write_assigned_fulfillment_orders',
  ],
  hostName: process.env['SHOPIFY_APP_URL'] || 'localhost:3000',
  apiVersion: ApiVersion.October24,
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

async function diagnose() {
  console.log('=== Testing Shopify API Access ===')

  const client = new shopify.clients.Rest({ session })

  // Test 1: Shop info (basic test)
  try {
    console.log('\n1. Testing shop access...')
    const shopResponse = (await client.get({
      path: 'shop',
    })) as any
    console.log('✓ Shop access successful:', shopResponse.body.shop.name)
  } catch (error: any) {
    console.error('✗ Shop access failed:', error.message)
    if (error.response) {
      console.error('Response:', error.response)
    }
  }

  // Test 2: Access scopes
  try {
    console.log('\n2. Checking access scopes...')
    const scopeResponse = await fetch(`https://${process.env['SHOPIFY_SHOP_DOMAIN']}/admin/oauth/access_scopes.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env['SHOPIFY_ACCESS_TOKEN']!,
        'Content-Type': 'application/json',
      },
    })

    if (scopeResponse.ok) {
      const scopes = await scopeResponse.json()
      console.log('✓ Access scopes:', scopes.access_scopes.map((s: any) => s.handle).join(', '))
    } else {
      console.error('✗ Failed to fetch scopes:', scopeResponse.status, scopeResponse.statusText)
    }
  } catch (error: any) {
    console.error('✗ Scope check failed:', error.message)
  }

  // Test 3: Locations access
  try {
    console.log('\n3. Testing locations access...')
    const locationsResponse = (await client.get({
      path: 'locations',
    })) as any
    console.log('✓ Locations access successful. Found', locationsResponse.body.locations.length, 'locations:')
    locationsResponse.body.locations.forEach((loc: any) => {
      console.log(`   - ${loc.name} (ID: ${loc.id})`)
    })
  } catch (error: any) {
    console.error('✗ Locations access failed:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.code)
      console.error('Response body:', error.response.body)
    }
  }

  // Test 4: Orders access
  try {
    console.log('\n4. Testing orders access...')
    const ordersResponse = (await client.get({
      path: 'orders',
      query: { limit: 1, status: 'any' },
    })) as any
    console.log('✓ Orders access successful')

    // Test 4b: Fulfillment orders access
    if (ordersResponse.body.orders.length > 0) {
      const orderId = ordersResponse.body.orders[0].id
      console.log('\n4b. Testing fulfillment orders access...')
      try {
        const fulfillmentOrdersResponse = (await client.get({
          path: `orders/${orderId}/fulfillment_orders`,
        })) as any
        console.log(
          '✓ Fulfillment orders access successful. Found',
          fulfillmentOrdersResponse.body.fulfillment_orders.length,
          'fulfillment orders'
        )
      } catch (error: any) {
        console.error('✗ Fulfillment orders access failed:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.code)
          console.error('Response body:', error.response.body)
        }
      }
    }
  } catch (error: any) {
    console.error('✗ Orders access failed:', error.message)
  }
}

diagnose().catch(console.error)
