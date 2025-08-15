import type { RouzaoOrderDetail } from './types'

// Common headers for Rouzao API requests
export function getRouzaoHeaders(): RequestInit['headers'] {
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

// Fetch order details from Rouzao
export async function fetchRouzaoOrderDetail(orderId: string): Promise<RouzaoOrderDetail | null> {
  const API_URL = `https://api.rouzao.com/talent/order/detail?id=${orderId}`

  try {
    console.log(`[${new Date().toISOString()}] Fetching order details for ${orderId}...`)

    const resp = await fetch(API_URL, {
      headers: getRouzaoHeaders(),
    })

    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`)
    }

    const json: RouzaoOrderDetail = await resp.json()

    if (json.code !== 0) {
      console.error(`[${new Date().toISOString()}] API returned error code: ${json.code}`)
      return null
    }

    return json
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching order detail:`, error)
    return null
  }
}

// Extract Shopify order number from third_party_order_sn
export function extractShopifyOrderNumber(thirdPartyOrderSn: string): string | null {
  // Pattern: SUBSPACE#xxxx
  const match = thirdPartyOrderSn.match(/SUBSPACE#(\d+)/)
  return match?.[1] ?? null
}

// Get tracking information from order detail
export interface TrackingInfo {
  trackingNumber?: string
  trackingCompany?: string
  trackingCompanyCode?: string
  trackingUrl?: string
}

// Carrier URL templates mapping
const CARRIER_URL_TEMPLATES: Record<string, string> = {
  postb: 'https://www.ems.com.cn/', // China Post/EMS
  sf: 'https://www.sf-express.com/chn/en/waybill/waybill-detail/{tracking_number}', // SF Express
  zto: 'https://www.zto.com/express/expressCheck.html', // ZTO Express
  yto: 'https://www.yto.net.cn/ytoExpress/waybill/waybillDetail/?mailNo={tracking_number}', // YTO Express
  sto: 'https://www.sto.cn/', // STO Express
  yunda: 'https://web.yundaex.com/infoInquiry?homeWaybill={tracking_number}', // Yunda Express
  jd: 'https://www.jdl.com/orderSearch/?waybillCodes={tracking_number}', // JD Logistics
}

// Generate tracking URL for a carrier
export function getTrackingUrl(carrierCode: string, trackingNumber: string): string | undefined {
  const template = CARRIER_URL_TEMPLATES[carrierCode]
  if (!template) {
    return undefined
  }

  return template.replace('{tracking_number}', trackingNumber)
}

export function getTrackingInfo(orderDetail: RouzaoOrderDetail): TrackingInfo {
  const express = orderDetail.data.express

  if (!express || !express.express_number) {
    return {}
  }

  // Map Rouzao express company codes to Shopify carrier names
  const carrierMapping: Record<string, string> = {
    postb: 'China Post',
    sf: 'SF Express',
    zto: 'ZTO Express',
    yto: 'YTO Express',
    sto: 'STO Express',
    yunda: 'Yunda Express',
    jd: 'JD Logistics',
    ems: 'EMS',
  }

  const trackingUrl = getTrackingUrl(express.express_company, express.express_number)

  return {
    trackingNumber: express.express_number,
    trackingCompany: carrierMapping[express.express_company] || express.express_company_name,
    trackingCompanyCode: express.express_company,
    trackingUrl,
  }
}
