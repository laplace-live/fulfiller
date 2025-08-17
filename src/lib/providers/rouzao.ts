import type { Provider, ProviderOrder, ProviderOrderDetail, TrackingInfo } from '@/types'
import type { RouzaoOrderDetail, RouzaoOrderItem, RouzaoOrders } from '@/types/rouzao'

import { getCarrierInfo } from '@/lib/carriers'
import { createLogger } from '@/lib/logger'

const logger = createLogger('rouzao')

// Rouzao-specific configuration
const ROUZAO_API_BASE = 'https://api.rouzao.com'

/**
 * Default location IDs for Rouzao fulfillment
 * Can be overridden by ROUZAO_LOCATION_IDS env var
 */
const DEFAULT_LOCATION_IDS: string[] = []

class RouzaoProvider implements Provider {
  id = 'rouzao'
  name = 'Rouzao'
  locationIds: string[] = []

  constructor() {
    // Load location IDs from environment or use defaults
    const envLocationIds = process.env['ROUZAO_LOCATION_IDS']
    if (envLocationIds) {
      this.locationIds = envLocationIds.split(',').map(id => id.trim())
    } else {
      this.locationIds = DEFAULT_LOCATION_IDS
    }
  }

  isConfigured(): boolean {
    return !!process.env['ROUZAO_TOKEN']
  }

  private getHeaders(): RequestInit['headers'] {
    const rouzaoToken = process.env['ROUZAO_TOKEN']

    if (!rouzaoToken) {
      throw new Error('ROUZAO_TOKEN is not set')
    }

    return {
      'Rouzao-Token': rouzaoToken,
      'Rouzao-Web-Ver': '1',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      'Referer': 'https://www.rouzao.com/',
      'Origin': 'https://www.rouzao.com',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    }
  }

  isProviderLocation(locationName: string, locationId: string): boolean {
    return locationName.toLowerCase().includes('rouzao') || this.locationIds.includes(locationId)
  }

  async fetchShippedOrders(): Promise<ProviderOrder[]> {
    const API_URL = `${ROUZAO_API_BASE}/talent/order?page=1&page_size=50`

    try {
      logger.info(`Fetching orders...`)

      const resp = await fetch(API_URL, {
        headers: this.getHeaders(),
      })

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`)
      }

      const json: RouzaoOrders = await resp.json()
      logger.info({ count: json.data.data.length }, `Fetched orders`)

      // Filter and map shipped orders
      const shippedOrders = json.data.data
        .filter((order: RouzaoOrderItem) => order.order_status === '已发货')
        .map(
          (order: RouzaoOrderItem): ProviderOrder<RouzaoOrderItem> => ({
            orderId: order.order_id,
            orderStatus: order.order_status,
            _raw: order,
          })
        )

      logger.info({ count: shippedOrders.length }, `Found shipped orders`)
      return shippedOrders
    } catch (error) {
      logger.error({ error }, `Error fetching orders`)
      return []
    }
  }

  async fetchOrderDetail(orderId: string): Promise<ProviderOrderDetail | null> {
    const API_URL = `${ROUZAO_API_BASE}/talent/order/detail?id=${orderId}`

    try {
      logger.info({ orderId }, `Fetching order details...`)

      const resp = await fetch(API_URL, {
        headers: this.getHeaders(),
      })

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`)
      }

      const json: RouzaoOrderDetail = await resp.json()

      if (json.code !== 0) {
        logger.error({ code: json.code }, `API returned error code`)
        return null
      }

      const orderDetail: ProviderOrderDetail<RouzaoOrderDetail> = {
        orderId,
        thirdPartyOrderSn: json.data.third_party_order_sn,
        _raw: json,
      }
      return orderDetail
    } catch (error) {
      logger.error({ error, orderId }, `Error fetching order detail`)
      return null
    }
  }

  extractShopifyOrderNumber(orderDetail: ProviderOrderDetail<RouzaoOrderDetail>): string | null {
    if (!orderDetail.thirdPartyOrderSn) {
      return null
    }

    // Pattern: SUBSPACE#xxxx
    const match = orderDetail.thirdPartyOrderSn.match(/SUBSPACE#(\d+)/)
    return match?.[1] ?? null
  }

  getTrackingInfo(orderDetail: ProviderOrderDetail<RouzaoOrderDetail>): TrackingInfo {
    // Type guard to check if orderDetail has _raw property
    if (!orderDetail._raw) {
      return {}
    }

    // Cast to RouzaoOrderDetail since we know this is from Rouzao provider
    const rouzaoDetail = orderDetail._raw
    const express = rouzaoDetail.data.express

    if (!express || !express.express_number) {
      return {}
    }

    // Use centralized tracking details lookup
    const carrierInfo = getCarrierInfo(express.express_company, express.express_number)

    return {
      trackingNumber: express.express_number,
      trackingCompany: carrierInfo?.name || express.express_company_name,
      trackingCompanyCode: express.express_company,
      trackingUrl: carrierInfo?.trackingUrl,
    }
  }
}

// Export singleton instance
export const rouzaoProvider = new RouzaoProvider()
