/**
 * HiCustom (指纹科技) API type definitions
 */

/**
 * OAuth token response
 */
export interface HiCustomTokenResponse {
  status: string
  code: number
  data: {
    access_token: string
    expires_in: number // 7200 seconds
    refresh_token: string
    refresh_token_expires_in: number // 172800 seconds (2 days)
  }
}

/**
 * Order status codes
 */
export enum HiCustomOrderStatus {
  Unpaid = -1, // 未付货款
  ToEdit = -2, // 待编辑
  Paid = 3, // 已付货款
  Scheduling = 5, // 排单中
  Production = 8, // 确认生产
  Shipped = 9, // 已发货
  Cancelled = 7, // 已取消
}

/**
 * Currency codes
 */
export enum HiCustomCurrency {
  USD = 1, // 美元
  GBP = 2, // 英镑
  CAD = 3, // 加元
  JPY = 4, // 日元
  EUR = 5, // 欧元
  MXN = 6, // 比索
  CNY = 7, // 人民币
  AUD = 8, // 澳元
  MYR = 9, // 马币
  IDR = 10, // 印尼币
  TWD = 11, // 台币
}

/**
 * Order item
 */
export interface HiCustomOrderItem {
  qty: number
  size: string
  color: string
  product_name: string
  product_code: string
  view_img: Array<{
    id: string
    name: string
    en_name: string
    small_img: string
    big_img: string
  }>
  image: string
  price: string
  total: string
  out_item_id: string
  sku: string
  third_product_id: string
  child_product_id: string
  product_link: string
  product_image_url: string
  third_color: string
  third_size: string
  stock_item_id?: number
  platform_price?: string
}

/**
 * Order list item
 */
export interface HiCustomOrder {
  order_id: string // Platform order ID (e.g., O84761421111000000)
  out_order_id: string // External order ID (e.g., Shopify order number)
  status: HiCustomOrderStatus
  order_time: string // yyyy-MM-dd HH:mm:ss
  payment_time: string // yyyy-MM-dd HH:mm:ss
  currency_code: HiCustomCurrency
  subtotal: string
  shipping_amount: string
  discount_amount: string
  grand_total: string
  total_item_count: number
  total_qty_ordered: number
  delivery_time: string
  remark: string
  pay_currency: string
  created: string // yyyy-MM-dd HH:mm:ss
  item: HiCustomOrderItem[]
}

/**
 * Order list response
 */
export interface HiCustomOrderListResponse {
  status: string
  code: number
  msg: string
  data: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    data: HiCustomOrder[]
  }
}

/**
 * Shipping status codes
 */
export enum HiCustomShippingStatus {
  NotFound = -1, // 查询不到
  None = 0, // 无
  InTransit = 10, // 运输途中
  AwaitingPickup = 20, // 到达待取
  Delivered = 40, // 成功签收
  DeliveryFailed = 50, // 投递失败
  PossibleException = 60, // 可能异常
}

/**
 * Order detail logistics info
 */
export interface HiCustomLogisticsInfo {
  /**
   * @example: 圆通速递 | 顺丰速运 | DHL-20KG以上
   */
  logistics_company_name: string
  shipping_track_number: string
  shipping_time: string // yyyy-MM-dd HH:mm:ss
  shipping_duration: number
  shipping_status: HiCustomShippingStatus
  group_package_logistics?: {
    shipping_time: string
    shipping_track_number: string
    logistics_company_name: string
  }
}

/**
 * Order detail address
 */
export interface HiCustomAddress {
  country: string // Country code
  region: string // State/Province
  city: string
  area: string // District/County
  street: string
  postcode: string
  firstname: string
  lastname: string
  mobile_phone: string
  telephone: string
  email: string
}

/**
 * Order detail
 */
export interface HiCustomOrderDetail {
  order_id: string
  /**
   * @example: SUBSPACE#xxxx
   */
  out_order_id: string
  store_id: number
  status: HiCustomOrderStatus
  order_time: string
  payment_time: string
  currency_code: HiCustomCurrency
  subtotal: string
  shipping_amount: string
  discount_amount: string
  grand_total: string
  total_item_count: number
  total_qty_ordered: number
  platform_subtotal: string
  platform_shipping_amount: string
  platform_discount_amount: string
  platform_grand_total: string
  error_msg: string
  delivery_time: string
  remark: string
  created: string
  item: HiCustomOrderItem[]
  logistic_info: HiCustomLogisticsInfo
  address: HiCustomAddress
  weight?: number
  volume?: number
  check_time?: string
  platform_pay_time?: string
  platform_delivery_time?: string
}

/**
 * Order detail response
 */
export interface HiCustomOrderDetailResponse {
  status: string
  code: number
  msg: string
  data: HiCustomOrderDetail
}
