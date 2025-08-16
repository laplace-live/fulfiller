/**
 * HiCustom (指纹科技) provider implementation
 */
import type { Provider, ProviderOrder, ProviderOrderDetail, TrackingInfo } from '@/types'
import type {
  HiCustomOrder,
  HiCustomOrderDetail,
  HiCustomOrderDetailResponse,
  HiCustomOrderListResponse,
  HiCustomTokenResponse,
} from '@/types/hicustom'

import { getCarrierInfo } from '@/lib/carriers'

/**
 * HiCustom configuration
 */
const HICUSTOM_API_BASE = process.env['HICUSTOM_API_URL'] || 'https://api.hicustom.com'

/**
 * Location IDs for HiCustom fulfillment
 * Can be overridden by HICUSTOM_LOCATION_IDS env var
 */
const DEFAULT_LOCATION_IDS: string[] = []

/**
 * Token management for OAuth
 */
interface TokenInfo {
  accessToken: string
  expiresAt: Date
  refreshToken: string
  refreshExpiresAt: Date
}

class HiCustomProvider implements Provider {
  id = 'hicustom'
  name = 'HiCustom'
  locationIds: string[] = []
  private tokenInfo: TokenInfo | null = null

  constructor() {
    // Load location IDs from environment or use defaults
    const envLocationIds = process.env['HICUSTOM_LOCATION_IDS']
    if (envLocationIds) {
      this.locationIds = envLocationIds.split(',').map(id => id.trim())
    } else {
      this.locationIds = DEFAULT_LOCATION_IDS
    }
  }

  /**
   * Check if provider has required configuration
   */
  isConfigured(): boolean {
    return !!(process.env['HICUSTOM_API_KEY'] && process.env['HICUSTOM_API_SECRET'])
  }

  /**
   * Get OAuth token with automatic refresh
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.tokenInfo && this.tokenInfo.expiresAt > new Date()) {
      return this.tokenInfo.accessToken
    }

    // Check if we can refresh the token
    if (this.tokenInfo && this.tokenInfo.refreshExpiresAt > new Date()) {
      return this.refreshAccessToken()
    }

    // Get a new token
    return this.fetchNewToken()
  }

  /**
   * Fetch a new access token
   *
   * @link http://xiaoyaoji.cn/project/1jPL8Hr5Xf7/1jUEaURCXKK
   */
  private async fetchNewToken(): Promise<string> {
    const appKey = process.env['HICUSTOM_API_KEY']
    const appSecret = process.env['HICUSTOM_API_SECRET']

    if (!appKey || !appSecret) {
      throw new Error('HICUSTOM_API_KEY and HICUSTOM_API_SECRET are required')
    }

    const url = `${HICUSTOM_API_BASE}/oauth/token?app_key=${appKey}&app_secret=${appSecret}`

    console.log(`[${new Date().toISOString()}] [${this.name}] Fetching new access token...`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch access token: ${response.status} ${response.statusText}`)
    }

    const data: HiCustomTokenResponse = await response.json()

    if (data.code !== 200) {
      throw new Error(`Failed to fetch access token: ${data.status}`)
    }

    // Store token info
    this.tokenInfo = {
      accessToken: data.data.access_token,
      expiresAt: new Date(Date.now() + data.data.expires_in * 1000 - 300000), // Subtract 5 minutes for safety
      refreshToken: data.data.refresh_token,
      refreshExpiresAt: new Date(Date.now() + data.data.refresh_token_expires_in * 1000 - 300000),
    }

    console.log(
      `[${new Date().toISOString()}] [${this.name}] Access token obtained, expires at ${this.tokenInfo.expiresAt.toISOString()}`
    )

    return this.tokenInfo.accessToken
  }

  /**
   * Refresh the access token
   *
   * @link http://xiaoyaoji.cn/project/1jPL8Hr5Xf7/1kErqGf2swS
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.tokenInfo) {
      return this.fetchNewToken()
    }

    const appKey = process.env['HICUSTOM_API_KEY']
    if (!appKey) {
      throw new Error('HICUSTOM_API_KEY is required')
    }

    const params = new URLSearchParams({
      app_key: appKey,
      refresh_token: this.tokenInfo.refreshToken,
      access_token: this.tokenInfo.accessToken,
    })
    const url = `${HICUSTOM_API_BASE}/oauth/refresh-token?${params.toString()}`

    console.log(`[${new Date().toISOString()}] [${this.name}] Refreshing access token...`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] [${this.name}] Failed to refresh token, fetching new one...`)
      return this.fetchNewToken()
    }

    const data: HiCustomTokenResponse = await response.json()

    if (data.code !== 200) {
      console.error(
        `[${new Date().toISOString()}] [${this.name}] Failed to refresh token: ${data.status}, fetching new one...`
      )
      return this.fetchNewToken()
    }

    // Update token info
    this.tokenInfo = {
      accessToken: data.data.access_token,
      expiresAt: new Date(Date.now() + data.data.expires_in * 1000 - 300000),
      refreshToken: data.data.refresh_token,
      refreshExpiresAt: new Date(Date.now() + data.data.refresh_token_expires_in * 1000 - 300000),
    }

    console.log(
      `[${new Date().toISOString()}] [${this.name}] Access token refreshed, expires at ${this.tokenInfo.expiresAt.toISOString()}`
    )

    return this.tokenInfo.accessToken
  }

  /**
   * Check if a location belongs to this provider
   */
  isProviderLocation(locationName: string, locationId: string): boolean {
    // Check by location ID first
    if (this.locationIds.includes(locationId)) {
      return true
    }

    // Check by name patterns
    const lowerName = locationName.toLowerCase()
    return lowerName.includes('hicustom')
  }

  /**
   * Fetch shipped orders from HiCustom
   *
   * @link http://xiaoyaoji.cn/project/1jPL8Hr5Xf7/1jVoxB3SjVQ
   */
  async fetchShippedOrders(): Promise<ProviderOrder[]> {
    try {
      console.log(`[${new Date().toISOString()}] [${this.name}] Fetching orders...`)

      const accessToken = await this.getAccessToken()
      const url = `${HICUSTOM_API_BASE}/api/v1/orders?status=9&page_size=50&access_token=${accessToken}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const json: HiCustomOrderListResponse = await response.json()

      if (json.code !== 200) {
        throw new Error(`API error: ${json.msg}`)
      }

      console.log(`[${new Date().toISOString()}] [${this.name}] Fetched ${json.data.data.length} orders`)

      // Map HiCustom orders to ProviderOrder
      const shippedOrders = json.data.data
        .filter(order => order.status === 9) // Status 9 = shipped
        .map(
          (order): ProviderOrder<HiCustomOrder> => ({
            orderId: order.order_id,
            orderStatus: String(order.status),
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

  /**
   * Fetch order detail from HiCustom
   *
   * @link http://xiaoyaoji.cn/project/1jPL8Hr5Xf7/1jVqkuvkqlk
   */
  async fetchOrderDetail(orderId: string): Promise<ProviderOrderDetail | null> {
    try {
      console.log(`[${new Date().toISOString()}] [${this.name}] Fetching order details for ${orderId}...`)

      const accessToken = await this.getAccessToken()
      const url = `${HICUSTOM_API_BASE}/api/v1/order/${orderId}?access_token=${accessToken}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const json: HiCustomOrderDetailResponse = await response.json()

      if (json.code !== 200) {
        throw new Error(`API error: ${json.msg}`)
      }

      // Map to ProviderOrderDetail
      const orderDetail: ProviderOrderDetail<HiCustomOrderDetail> = {
        orderId,
        thirdPartyOrderSn: json.data.out_order_id,
        _raw: json.data,
      }

      return orderDetail
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [${this.name}] Error fetching order detail:`, error)
      return null
    }
  }

  /**
   * Extract Shopify order number from HiCustom order
   */
  extractShopifyOrderNumber(orderDetail: ProviderOrderDetail<HiCustomOrderDetail>): string | null {
    if (!orderDetail.thirdPartyOrderSn) {
      return null
    }

    // HiCustom uses out_order_id for external order references
    // This should contain the Shopify order number
    const outOrderId = orderDetail.thirdPartyOrderSn

    // Try to extract just the numeric part
    // Shopify order numbers are typically just numbers
    const match = outOrderId.match(/\d+/)
    if (match) {
      return match[0]
    }

    // If no match, return the whole string
    return outOrderId
  }

  /**
   * Get tracking information from HiCustom order
   */
  getTrackingInfo(orderDetail: ProviderOrderDetail<HiCustomOrderDetail>): TrackingInfo {
    if (!orderDetail._raw || !orderDetail._raw.logistic_info) {
      return {}
    }

    const logistics = orderDetail._raw.logistic_info

    if (!logistics.shipping_track_number) {
      return {}
    }

    // Use centralized tracking details lookup
    const carrierName = logistics.logistics_company_name
    const carrierInfo = getCarrierInfo(carrierName, logistics.shipping_track_number)

    return {
      trackingNumber: logistics.shipping_track_number,
      trackingCompany: carrierInfo?.name || carrierName,
      trackingCompanyCode: carrierName,
      trackingUrl: carrierInfo?.trackingUrl,
    }
  }
}

/**
 * Export singleton instance
 */
export const hicustomProvider = new HiCustomProvider()
