/**
 * Centralized carrier configuration
 * Each carrier can have multiple aliases that different providers might use
 */

import type { CarrierInfo } from '@/types'

export interface CarrierConfig extends CarrierInfo {
  /** All possible aliases/codes this carrier might be known by */
  aliases: string[]
}

/**
 * Master list of all carriers with their aliases
 */
const CARRIERS: CarrierConfig[] = [
  {
    name: 'SF Express',
    aliases: ['sf', '顺丰速运', 'sf express'],
    trackingUrlTemplate:
      'https://www.sf-express.com/cn/en/dynamic_function/waybill/#search/bill-number/{tracking_number}',
  },
  {
    name: 'YTO Express',
    aliases: ['yto', '圆通速递', 'yto express'],
    trackingUrlTemplate: 'https://www.yto.net.cn/ytoExpress/waybill/waybillDetail/?mailNo={tracking_number}',
  },
  {
    name: 'ZTO Express',
    aliases: ['zto', '中通快递', 'zto express'],
    trackingUrlTemplate: 'https://www.zto.com/express/expressCheck.html',
  },
  {
    name: 'STO Express',
    aliases: ['sto', '申通快递', 'sto express'],
    trackingUrlTemplate: 'https://www.sto.cn/',
  },
  {
    name: 'Yunda Express',
    aliases: ['yunda', '韵达快递'],
    trackingUrlTemplate: 'https://web.yundaex.com/infoInquiry?homeWaybill={tracking_number}',
  },
  {
    name: 'JD Logistics',
    aliases: ['jd', '京东标准快递', '京东', '京东物流', 'jd logistics'],
    trackingUrlTemplate: 'https://www.jdl.com/orderSearch/?waybillCodes={tracking_number}',
  },
  {
    name: 'China Post',
    aliases: ['postb', 'ems', '中国邮政', 'china post'],
    trackingUrlTemplate: 'https://www.ems.com.cn/',
  },
  {
    name: 'DHL',
    aliases: ['dhl', 'dhl express'],
    trackingUrlTemplate: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking_number}',
  },
  {
    name: 'UPS',
    aliases: ['ups', 'united parcel service'],
    trackingUrlTemplate: 'https://www.ups.com/track?tracknum={tracking_number}',
  },
  {
    name: 'FedEx',
    aliases: ['fedex', 'federal express'],
    trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?tracknumbers={tracking_number}',
  },
]

/**
 * Build a lookup map for quick carrier retrieval
 */
const buildCarrierLookup = (): Map<string, CarrierInfo> => {
  const lookup = new Map<string, CarrierInfo>()

  for (const carrier of CARRIERS) {
    // Add each alias as a key pointing to the carrier info
    for (const alias of carrier.aliases) {
      lookup.set(alias.toLowerCase(), {
        name: carrier.name,
        trackingUrlTemplate: carrier.trackingUrlTemplate,
      })
    }
  }

  return lookup
}

// Create the lookup map once
const carrierLookup = buildCarrierLookup()

/**
 * Tracking details including carrier info and formatted URL
 */
export interface ResolvedCarrierInfo {
  /** Standardized carrier name */
  name: string
  /** Tracking URL if available */
  trackingUrl?: string
}

/**
 * Get complete tracking details for a carrier and tracking number
 * @param code - The carrier code/name/alias to look up (case-insensitive)
 * @param trackingNumber - The tracking number
 * @returns ResolvedCarrierInfo with carrier info and URL, or undefined if carrier not found
 */
export function getCarrierInfo(code: string, trackingNumber: string) {
  const carrier = carrierLookup.get(code.toLowerCase())
  if (!carrier) {
    return undefined
  }

  return {
    name: carrier.name,
    trackingUrl: carrier.trackingUrlTemplate
      ? carrier.trackingUrlTemplate.replace('{tracking_number}', trackingNumber)
      : undefined,
  }
}
