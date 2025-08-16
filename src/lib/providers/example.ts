// Example provider implementation for reference
import type { Provider, ProviderOrder, ProviderOrderDetail, TrackingInfo } from '@/types'

// Define your provider-specific types for type safety
// Replace with your actual API response types
interface ExampleApiOrder {
  id: string
  status: string
  // Add other fields from your API
}

interface ExampleApiOrderDetail {
  id: string
  external_reference?: string
  shopify_order_number?: string
  shipping?: {
    tracking_number?: string
    carrier_code?: string
    carrier_name?: string
    carrier?: string
  }
  tracking_info?: {
    tracking_number?: string
    carrier_code?: string
    carrier_name?: string
    carrier?: string
  }
  // Add other fields from your API
}

// Example configuration - replace with your provider's details
const EXAMPLE_API_BASE = 'https://api.example.com'
const EXAMPLE_LOCATION_IDS = [
  'gid://shopify/Location/123456789', // Example Warehouse 1
  'gid://shopify/Location/987654321', // Example Warehouse 2
]

// Map your provider's carrier codes to Shopify carrier names
const CARRIER_MAPPING: Record<string, string> = {
  ups: 'UPS',
  fedex: 'FedEx',
  dhl: 'DHL',
  // Add more mappings as needed
}

// URL templates for tracking links
const CARRIER_URL_TEMPLATES: Record<string, string> = {
  ups: 'https://www.ups.com/track?tracknum={tracking_number}',
  fedex: 'https://www.fedex.com/fedextrack/?tracknumbers={tracking_number}',
  dhl: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking_number}',
}

class ExampleProvider implements Provider {
  id = 'example'
  name = 'Example Provider'
  locationIds = EXAMPLE_LOCATION_IDS

  isConfigured(): boolean {
    return !!process.env['EXAMPLE_API_KEY']
  }

  private getHeaders(): RequestInit['headers'] {
    const apiKey = process.env['EXAMPLE_API_KEY']

    if (!apiKey) {
      throw new Error('EXAMPLE_API_KEY is not set')
    }

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  isProviderLocation(locationName: string, locationId: string): boolean {
    // Check if location belongs to this provider
    // You can check by name pattern or by ID
    return locationName.toLowerCase().includes('example') || this.locationIds.includes(locationId)
  }

  async fetchShippedOrders(): Promise<ProviderOrder[]> {
    const API_URL = `${EXAMPLE_API_BASE}/orders?status=shipped&limit=50`

    try {
      console.log(`[${new Date().toISOString()}] [${this.name}] Fetching orders...`)

      const resp = await fetch(API_URL, {
        headers: this.getHeaders(),
      })

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`)
      }

      // Type your API response properly
      const json: { orders: ExampleApiOrder[] } = await resp.json()
      console.log(`[${new Date().toISOString()}] [${this.name}] Fetched ${json.orders.length} orders`)

      // Map your provider's order structure to ProviderOrder
      // This example assumes json.orders is an array of orders
      const shippedOrders = json.orders
        .filter(order => order.status === 'shipped') // Adjust based on your API
        .map(
          (order): ProviderOrder<ExampleApiOrder> => ({
            orderId: order.id,
            orderStatus: order.status,
            _raw: order,
          })
        )

      console.log(`[${new Date().toISOString()}] [${this.name}] Found ${shippedOrders.length} shipped orders`)
      return shippedOrders
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [${this.name}] Error fetching orders:`, error)
      return []
    }
  }

  async fetchOrderDetail(orderId: string): Promise<ProviderOrderDetail | null> {
    const API_URL = `${EXAMPLE_API_BASE}/orders/${orderId}`

    try {
      console.log(`[${new Date().toISOString()}] [${this.name}] Fetching order details for ${orderId}...`)

      const resp = await fetch(API_URL, {
        headers: this.getHeaders(),
      })

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`)
      }

      const json: ExampleApiOrderDetail = await resp.json()

      // Map your provider's response to ProviderOrderDetail
      const orderDetail: ProviderOrderDetail<ExampleApiOrderDetail> = {
        orderId,
        // Extract the Shopify order reference from your provider's data
        // This example assumes it's in a field called 'external_reference'
        thirdPartyOrderSn: json.external_reference || json.shopify_order_number,
        _raw: json,
      }
      return orderDetail
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [${this.name}] Error fetching order detail:`, error)
      return null
    }
  }

  extractShopifyOrderNumber(orderDetail: ProviderOrderDetail): string | null {
    if (!orderDetail.thirdPartyOrderSn) {
      return null
    }

    // Extract Shopify order number based on your provider's format
    // Example patterns:
    // - Direct number: "2049"
    // - With prefix: "SHOP#2049" -> extract "2049"
    // - Complex: "STORE-ORDER-2049-ABC" -> extract "2049"

    // Example 1: Direct number
    if (/^\d+$/.test(orderDetail.thirdPartyOrderSn)) {
      return orderDetail.thirdPartyOrderSn
    }

    // Example 2: With prefix (SHOP#2049)
    const prefixMatch = orderDetail.thirdPartyOrderSn.match(/SHOP#(\d+)/)
    if (prefixMatch) {
      return prefixMatch[1] ?? null
    }

    // Example 3: Complex pattern
    const complexMatch = orderDetail.thirdPartyOrderSn.match(/ORDER-(\d+)/)
    if (complexMatch) {
      return complexMatch[1] ?? null
    }

    // Add more patterns as needed
    return null
  }

  getTrackingInfo(orderDetail: ProviderOrderDetail<ExampleApiOrderDetail>): TrackingInfo {
    // Check if orderDetail has _raw property
    if (!orderDetail._raw) {
      return {}
    }

    // Cast to ExampleApiOrderDetail since we know this is from Example provider
    const exampleDetail = orderDetail._raw

    // Extract tracking information based on your provider's data structure
    // This example assumes tracking info is in 'shipping' object
    const shipping = exampleDetail.shipping || exampleDetail.tracking_info

    if (!shipping || !shipping.tracking_number) {
      return {}
    }

    const carrierCode = shipping.carrier_code || shipping.carrier
    const trackingUrl = carrierCode ? this.getTrackingUrl(carrierCode, shipping.tracking_number) : undefined

    return {
      trackingNumber: shipping.tracking_number,
      trackingCompany: carrierCode ? CARRIER_MAPPING[carrierCode] || shipping.carrier_name || carrierCode : undefined,
      trackingCompanyCode: carrierCode,
      trackingUrl,
    }
  }

  private getTrackingUrl(carrierCode: string, trackingNumber: string): string | undefined {
    const template = CARRIER_URL_TEMPLATES[carrierCode]
    if (!template) {
      return undefined
    }

    return template.replace('{tracking_number}', trackingNumber)
  }
}

// Export singleton instance
export const exampleProvider = new ExampleProvider()

// HOW TO USE THIS EXAMPLE:
// 1. Copy this file and rename it (e.g., myprovider.ts)
// 2. Replace 'example' with your provider name throughout
// 3. Update the isConfigured() method to check YOUR required env vars
// 4. Update the API endpoints and authentication method
// 5. Adjust the data mapping in fetchShippedOrders, fetchOrderDetail, etc.
// 6. Update carrier mappings and tracking URL templates
// 7. Add your Shopify location IDs
// 8. Register your provider in src/providers/registry.ts:
//    import { myProvider } from './myprovider'
//    this.register(myProvider)
// 9. Add required environment variables to .env:
//    MYPROVIDER_API_KEY=your-api-key
