/**
 * Provider interface for different fulfillment providers
 */
export interface Provider {
  /** Provider identifier (e.g., 'rouzao', 'provider2') */
  id: string

  /** Human-readable provider name */
  name: string

  /** Shopify location IDs managed by this provider */
  locationIds: string[]

  /** Check if provider has required configuration */
  isConfigured(): boolean

  /** Check if a location name belongs to this provider */
  isProviderLocation(locationName: string, locationId: string): boolean

  /** Fetch shipped orders from the provider */
  fetchShippedOrders(): Promise<ProviderOrder[]>

  /** Fetch detailed order information */
  fetchOrderDetail(orderId: string): Promise<ProviderOrderDetail | null>

  /** Extract Shopify order number from provider's order data */
  extractShopifyOrderNumber(orderDetail: ProviderOrderDetail): string | null

  /** Get tracking information from order detail */
  getTrackingInfo(orderDetail: ProviderOrderDetail): TrackingInfo
}

/**
 * Generic provider order type
 * @template TRaw - Type of the raw order data from the provider API
 */
export interface ProviderOrder<TRaw = unknown> {
  /** Provider's order ID */
  orderId: string
  /** Order status from provider */
  orderStatus: string
  /** Raw order data from provider API */
  _raw?: TRaw
}

/**
 * Generic provider order detail type
 * @template TRaw - Type of the raw order detail data from the provider API
 */
export interface ProviderOrderDetail<TRaw = unknown> {
  /** Provider's order ID */
  orderId: string
  /** Third party order reference (e.g., Shopify order number) */
  thirdPartyOrderSn?: string
  /** Raw order detail data from provider API */
  _raw?: TRaw
}

/**
 * Tracking information for shipments
 */
export interface TrackingInfo {
  /** Tracking number */
  trackingNumber?: string
  /** Carrier company name for display */
  trackingCompany?: string
  /** Carrier company code */
  trackingCompanyCode?: string
  /** Tracking URL */
  trackingUrl?: string
}

/**
 * Carrier information with name and tracking URL template
 */
export interface CarrierInfo {
  /** Display name for the carrier */
  name: string
  /** URL template for tracking, use {tracking_number} as placeholder */
  trackingUrlTemplate?: string
}
