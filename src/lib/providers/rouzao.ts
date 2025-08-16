import type { CarrierInfo, Provider, ProviderOrder, ProviderOrderDetail, TrackingInfo } from '@/types'
import type { RouzaoOrderDetail, RouzaoOrderItem, RouzaoOrders } from '@/types/rouzao'

// Rouzao-specific configuration
const ROUZAO_API_BASE = 'https://api.rouzao.com'
const ROUZAO_LOCATION_IDS = [
  'gid://shopify/Location/89848578324', // Rouzao Warehouse
  'gid://shopify/Location/93230334228', // Rouzao EMS Warehouse
]

/**
 * Unified carrier mapping for Rouzao
 * Maps Rouzao carrier codes to carrier info (name + tracking URL)
 */
const CARRIER_MAPPING: Record<string, CarrierInfo> = {
  postb: {
    name: 'China Post',
    trackingUrlTemplate: 'http://yjcx.ems.com.cn/qps/yjcx/{tracking_number}',
  },
  sf: {
    name: 'SF Express',
    trackingUrlTemplate:
      'https://www.sf-express.com/cn/en/dynamic_function/waybill/#search/bill-number/{tracking_number}',
  },
  zto: {
    name: 'ZTO Express',
    trackingUrlTemplate: 'https://www.zto.com/express/expressCheck?txtbill={tracking_number}',
  },
  yto: {
    name: 'YTO Express',
    trackingUrlTemplate: 'https://www.yto.net.cn/gw/service/tracking?waybillNo={tracking_number}',
  },
  sto: {
    name: 'STO Express',
    trackingUrlTemplate: 'https://www.sto.cn/web/waybill.html?billcode={tracking_number}',
  },
  yunda: {
    name: 'Yunda Express',
    trackingUrlTemplate: 'https://www.yundaex.com/cn/track/?nu={tracking_number}',
  },
  jd: {
    name: 'JD Logistics',
    trackingUrlTemplate: 'https://www.jdl.com/bill/{tracking_number}',
  },
  ems: {
    name: 'EMS',
    trackingUrlTemplate: 'http://www.ems.com.cn/english-main.jsp', // Generic page, no direct tracking
  },
}

class RouzaoProvider implements Provider {
  id = 'rouzao'
  name = 'Rouzao'
  locationIds = ROUZAO_LOCATION_IDS

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
      console.log(`[${new Date().toISOString()}] [${this.name}] Fetching orders...`)

      const resp = await fetch(API_URL, {
        headers: this.getHeaders(),
      })

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`)
      }

      const json: RouzaoOrders = await resp.json()
      console.log(`[${new Date().toISOString()}] [${this.name}] Fetched ${json.data.data.length} orders`)

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

      console.log(`[${new Date().toISOString()}] [${this.name}] Found ${shippedOrders.length} shipped orders`)
      return shippedOrders
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [${this.name}] Error fetching orders:`, error)
      return []
    }
  }

  async fetchOrderDetail(orderId: string): Promise<ProviderOrderDetail | null> {
    const API_URL = `${ROUZAO_API_BASE}/talent/order/detail?id=${orderId}`

    try {
      console.log(`[${new Date().toISOString()}] [${this.name}] Fetching order details for ${orderId}...`)

      const resp = await fetch(API_URL, {
        headers: this.getHeaders(),
      })

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`)
      }

      const json: RouzaoOrderDetail = await resp.json()

      if (json.code !== 0) {
        console.error(`[${new Date().toISOString()}] [${this.name}] API returned error code: ${json.code}`)
        return null
      }

      const orderDetail: ProviderOrderDetail<RouzaoOrderDetail> = {
        orderId,
        thirdPartyOrderSn: json.data.third_party_order_sn,
        _raw: json,
      }
      return orderDetail
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [${this.name}] Error fetching order detail:`, error)
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

    const carrierInfo = CARRIER_MAPPING[express.express_company]
    const trackingUrl = carrierInfo?.trackingUrlTemplate
      ? carrierInfo.trackingUrlTemplate.replace('{tracking_number}', express.express_number)
      : undefined

    return {
      trackingNumber: express.express_number,
      trackingCompany: carrierInfo?.name || express.express_company_name,
      trackingCompanyCode: express.express_company,
      trackingUrl,
    }
  }
}

// Export singleton instance
export const rouzaoProvider = new RouzaoProvider()
