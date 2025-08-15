export interface RouzaoOrders {
  data: {
    data: RouzaoOrderItem[]
    total: number
    /**
     * - 0: "已取消"
     * - 1: "待支付"
     * - 2: "待发货"
     * - 3: "已发货"
     * - 4: "已完成"
     * - 5: "已退款"
     * - 6: "待生产"
     * - 7: "订单无法生产"
     * - 8: "生产中"
     * - 9: "订单已拆分"
     */
    order_status: { [key: string]: string }
    platforms: string
    shopPlatforms: { [key: string]: string }
    userShops: {
      id: number
      name: string
      outShopId: string
      platform: number
      platformText: string
      platformIcon: string
      defaultTemplateId: string
      defaultLogisticsId: string
      /**
       * Formatted creation date
       * @example '2023-08-18 23:32:22'
       */
      fmtCreatedAt: string
    }[]
  }
  code: number
}

export interface RouzaoOrderItem {
  order_id: string
  order_sn: string
  talent_user_id: number
  /**
   * Platform name
   * @example '柔造'
   */
  platform: string
  /**
   * Platform ID, -1 for Rouzao
   * @example -1
   */
  platformId: number
  platform_url: string
  created_at: string
  /**
   * Order status text
   * @example '已发货' | '已完成' | '生产中'
   */
  order_status: string
  total_amount: string
  profit_amount: string
  postal_fee: string
  cost_amount: string
  products: {
    id: number
    talent_product_id: number
    talent_product_sku_id: number
    talent_product_name: string
    talent_sku_name: string
    talent_product_image: string
    unit_price: string
    count: number
    cost_price: string
    profit_price: string
    rate_price: string
    sold_conf: {
      /**
       * Pricing type, typically 'tiered' for tiered pricing
       * @example 'rule' | 'tiered'
       */
      price_type: string
      sales_limit?: {
        min_quantity: number
        max_quantity?: number
        quantity_multiple?: number
      } | null
      tiered_price: {
        rules: {
          count: number | null
          price: string
        }[]
        price_tmpl?: number
      }
      package_count?: number
      /**
       * Method of sale
       * @example 1
       */
      method_of_sale: number
      /**
       * Whether available for third party sale
       * @example true
       */
      sale_for_thirdparty?: boolean
      supply_price?: number
      product_weight?: number
    }
    sold_count: number
    unit: string
    stock: {
      id: number
      baseProductId: number
      status: number
      stock: number
      warningTip: string
      extra: {
        isTemporary?: boolean
        refreshedStock: number
        dailyPreloadStock: number
      }
    } | null
    is_compensation_product: boolean
    inner_count: number
    use_inner_calculate: boolean
    inner_unit_price: number
  }[]
  union_order: {
    unionOrderId: string
    unionOrderSn: string
    /**
     * Creation time in format 'YYYY-MM-DD HH:mm:ss'
     * @example '2025-08-14 01:02:51'
     */
    createdAt: string
    /**
     * Payment time in format 'YYYY-MM-DD HH:mm:ss'
     * @example '2025-08-14 01:03:12'
     */
    paidAt: string
    /**
     * Payment type code
     * @example 11
     */
    paymentType: number
    /**
     * Payment type description
     * @example '支付宝-柔造'
     */
    paymentTypeText: string
    totalAmount: number
    freightAmount: number
    discountAmount: number
    realFee: number
    costAmount: number
    profitAmount: number
  }

  view_status: {
    /**
     * Order reminder status
     * @example '已发货' | '已完成' | '生产中'
     */
    orderRemind: string
    /**
     * Order show status code
     * @example 3 (已发货) | 8 (生产中)
     */
    orderShowStatus: number
    /**
     * @example '已发货' | '已完成' | '生产中-开始生产'
     */
    statusText: string
    /**
     * Shipping status
     * @example '已签收' | ''
     */
    orderShipStatus: string
    /**
     * @example '预计发货：2025-08-29' | ''
     */
    estimatedShippingAt: string
    willCancelAt: number
    stockWarning: string
    stopDeliveryTips: string
  }
  xhs_package_sn: string
  xhs_is_shipped: boolean
  third_is_shipped: boolean
  source: number
  express_number: string
  address_info: {
    id: number
    name: string
    consignee: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
    address: string
    areaCode: string
    /**
     * @example 'cn'
     */
    countryCode: string
    unionOrderId: string
  }
  address_stop_msg: string
  shop: {
    id: number
    name: string
    outShopId: string
    platform: number
    platformText: string
    platformIcon: string
    defaultTemplateId: string
    defaultLogisticsId: string
    /**
     * Formatted creation date
     * @example '2023-08-18 23:32:22'
     */
    fmtCreatedAt: string
  }

  express_info: {
    /**
     * Express company code
     * @example 'postb' | 'sf' | 'zto'
     */
    company_code: string
    /**
     * Express company name
     * @example 'EMS小件' | '顺丰标快' | '中通快递'
     */
    company_name: string
    express_no?: string
  }
  produce_expand: {
    can_specify_logistics: boolean
    has_specified_logistics: boolean
    has_refund_freight: boolean
    specified_logistics: string
    refund_freight: string
  }
  invoice: {
    canOrderApplyInvoice: boolean
  }
  task_ongoing: {
    tips: string
  }
  /**
   * Buyer show state
   * @example 1 | 2
   */
  buyer_show_state: number
  can_confirm: boolean
  is_signed: boolean
  /**
   * Production status code
   * @example 10 (生产中) | 57 (已发货)
   */
  produce_status: number
  order_extend: {
    id: number
    order_id: number
    extends: {
      carpool: {
        is_carpool_order: boolean
        is_charter_order?: boolean
      }
      push_error: string
      billPackage: {
        key: string
        /**
         * @example '订单1'
         */
        name: string
        skus: {
          id: number
          name: string
          unit: string
          wrap: {
            id: number
            name: string
            type: number
            image: string[]
            title: string
            images: string[]
            volume: number
            packFee: number
            pack_fee: string
            subtotal: number
            unitPrice: number
            usedCount: number
            unit_price: string
            packSubtotal: number
            materialSubtotal: number
          }
          count: number
          image: string
          /**
           * Can use CP30 service
           * @example false | 1
           */
          canCP30: boolean | number
          cp30Fee: number
          assembly: {
            type: number
            count: number
            subtotal: number
            unit_price: number
            pre_assembly_type: number
          } | null
          soldConf: {
            price_type: string
            sales_limit?: {
              min_quantity: number
              max_quantity?: number
              quantity_multiple?: number
            } | null
            tiered_price: {
              rules: {
                count: number | null
                price: string
              }[]
              price_tmpl?: number
            }
            package_count?: number
            method_of_sale: number
            sale_for_thirdparty?: boolean
            supply_price?: number
            product_weight?: number
          }
          subtotal: number
          canUrgent: boolean
          costPrice: number
          soldCount: number
          tieredHit: string
          unitPrice: number
          urgentFee: number
          weworkAct: {
            actIsValid: boolean
            weworkPrice: number
            hasWeworkPrice: boolean
            isAddPrivateWework: boolean
          }
          innerCount: number
          share_info: any[]
          yingePrice: number
          tieredPrice: {
            count: number
            price: string
            discount?: number
            innerUnitPrice?: number
          }[]
          workmanship: {
            amount: number
            status: number
            skuType: number
            scmSkuId: number
            isDefault: number
            mappingId: number
            stockInfo: {
              hasStock: boolean
              stockTextV2: null
              stockTextList: null
              stockWarningTip: string
              capacityConfigType: number
              capacityConfigStatus: number
            }
            diffAmount: number
            scmSkuName: string
            /**
             * Special flag for events/holidays
             * @example '2025ChineseNewYear'
             */
            specialFlag: string
            scmProductId: number
            baseProductId: number
            workmanshipId: number
            capacityConfig: {
              id: number
              /**
               * Config type
               * @example 1
               */
              type: number
              extra: {
                delayCompensationConfig: {
                  /**
                   * State: 0=disabled, 1=enabled
                   * @example 0 | 1
                   */
                  state: number
                }
                urgentCompensationConfig: {
                  /**
                   * Days for urgent production
                   * @example 5
                   */
                  day: number
                  /**
                   * State: 0=disabled, 1=enabled
                   * @example 0 | 1
                   */
                  state: number
                } | null
                estimatedShippingTimeConfig: {
                  dayRangeTypeOf1: number
                  dayRangeTypeOf2?: number
                }
              }
              status: number
              /**
               * Creation timestamp
               * @example 1711101632
               */
              created_at: number
              /**
               * Last update time in ISO format
               * @example '2025-08-13T23:59:02+08:00'
               */
              updated_at: string
              talent_base_product_id: number
              talent_production_process_id: number
            }
            scmProductName: string
            capacityConfigId: number
            partReplaceItems: null
            productWorkmanship: {
              id: number
              extra: null
              thumb: string
              showName: string
              innerName: string
              baseProductIds: null
            }
          }
          dayRangeType: number
          isSelectCP30: boolean
          baseProductId: number
          isWeworkPrice: boolean
          stockQuantity: number
          innerUnitPrice: number
          isSelectUrgent: boolean
          talentProductId: number
          workmanshipPrice: number
          talentProductName: string
          useInnerCalculate: boolean
          isFreeShippingProduct: number
        }[]
        isCP30: boolean
        isUrgent: boolean
        shipping: {
          icon: string
          amount: number
          subtotal: number
          /**
           * Express company code
           * @example 'postb' | 'sf' | 'zto'
           */
          companyCode: string
          /**
           * Express company name
           * @example '中国邮政EMS' | '中通快递' | '顺丰标快'
           */
          companyName: string
        }[]
        isGuoqing: boolean
        costAmount: number
        urgentText: string
        pkgSkuCount: number
        warehouseId: number
        cp30FeeTotal: number
        selectTicket: any[]
        /**
         * Selected shipping company code
         * @example 'postb' | 'sf' | 'zto'
         */
        shippingCode: string
        talentSkuIds: number[]
        subtotalDetail: {
          innerPack: number
          branchAmount: number
          outerPackFee: number
          innerMaterial: number
          workmanshipAmount: number
        }
        ticketDiscount: {
          totalDiscount: number
          ticketTotalDiscount: number
          urgentTotalDiscount: number
        }
        urgentFeeTotal: number
        packageSubtotal: number
        productSubtotal: number
        /**
         * Order split rule
         * @example 'most_efficient'
         */
        selectSplitRule: string
        assemblyFeeTotal: number
        compensationType: number
        shippingSubtotal: number
        stopDeliveryTips: string
        freeShippingSkuIds: number[]
        selectUrgentTicket: null
        estimatedShippingAt: number
        isDelayCompensation: boolean
        forceDelayCompensation: boolean
        delayCompensationSwitch: boolean
        /**
         * Estimated shipping days text
         * @example '10天发货' | '11天发货' | '15天发货'
         */
        estimatedShippingAtText: string
        packageShippingDiscount: any[]
        freeShippingProductAmount: number
        urgentEstimatedShippingDays: number
      }
      willCancelAt: number
      consumeStockRt: boolean
      specialMarking: {
        samplingOrderFlags: number
        highValueOrderFlags: number
        multiCountOrderFlags: number
      }
      shareReceiveRes: {
        /**
         * Consumption status
         * @example 'success'
         */
        consume: string
        skuCountInfo: {
          [key: string]: {
            buyCount: number
            talentSkuId: number
            dayRangeType: number
            baseProductId: number
            stockQuantity: number
            talentSkuName: string
            workmanshipId: number
            talentProductId: number
            talentProductName: string
          }
        }
      }
      consumeStockDetail: boolean
      /**
       * Estimated shipping date
       * @example '2025-08-29'
       */
      estimatedShippingAt: string
      isSendCommentSubscribeMessage?: boolean
    }
    /**
     * Creation timestamp
     * @example 1755104571
     */
    created_at: number
    /**
     * Deletion timestamp, 0 if not deleted
     * @example 0
     */
    deleted_at: number
    /**
     * Last update time
     * @example '2025-08-14 01:03:15'
     */
    updated_at: string
  }
  specialMarking: {
    samplingOrderFlags: number
    highValueOrderFlags: number
    multiCountOrderFlags: number
  }
  compensation: {
    id: number
    talent_order_id: number
    /**
     * Estimated shipping timestamp
     * @example 1756400571
     */
    estimated_shipping_at: number
    /**
     * Compensation type
     * @example 2
     */
    type: number
    /**
     * Compensation fee amount
     * @example 0
     */
    compensation_fee: number
    /**
     * Compensation timestamp, 0 if not compensated
     * @example 0
     */
    compensation_at: number
    /**
     * Compensation status
     * @example 15
     */
    status: number
    extend: any[]
    /**
     * Creation timestamp
     * @example 1755104571
     */
    created_at: number
    /**
     * Last update time
     * @example '2025-08-14 01:02:51'
     */
    updated_at: string
  }
  split_info: {
    can_be_splited: boolean
    splited_orders: null
    split_original_order: boolean
  }
  delay_compensation_info: null
  carpool_car: null
}

export interface RouzaoOrderDetail {
  data: {
    /**
     * Order ID
     * @example "EGJDE7w0"
     */
    id: string
    /**
     * Order serial number
     * @example "250805195953001572"
     */
    order_sn: string
    union_order_id: number
    talent_user_id: number
    /**
     * Order status code
     * @example 60 (已发货，待用户确认收货)
     */
    order_status: number
    /**
     * Order status description
     * @example "已发货，待用户确认收货"
     */
    order_status_text: string
    order_amount: number
    cost_amount: number
    profit_amount: number
    /**
     * Shipping confirmation timestamp
     * @example 1754546734
     */
    confirm_ship_at: number
    /**
     * Sign confirmation timestamp
     * @example 1754739152
     */
    confirm_sign_at: number
    talent_product_id: number
    /**
     * Customer mobile number
     * @example "18624586236"
     */
    mobile: string
    /**
     * Third party order serial number
     * @example "SUBSPACE#2049"
     */
    third_party_order_sn: string
    /**
     * Platform ID, -1 for Rouzao
     * @example -1
     */
    platform: number
    /**
     * Platform text, empty for Rouzao
     * @example ""
     */
    platform_text: string
    products: {
      id: number
      talent_order_id: number
      base_product_id: number
      talent_product_id: number
      talent_product_sku_id: number
      talent_product_name: string
      talent_sku_name: string
      talent_product_image: string
      extends: {
        wrap: {
          id: number
          /**
           * @example "独立包装"
           */
          name: string
          type: number
          image: string[]
          title: string
          images: string[]
          volume: number
          packFee: number
          pack_fee: string
          subtotal: number
          unitPrice: number
          usedCount: number
          unit_price: string
          packSubtotal: number
          materialSubtotal: number
        }
        urgentFee: number
        workmanship: {
          amount: number
          /**
           * Status: 2
           * @example 2
           */
          status: number
          skuType: number
          scmSkuId: number
          isDefault: number
          mappingId: number
          stockInfo: {
            hasStock: boolean
            stockTextV2: null
            stockTextList: null
            stockWarningTip: string
            capacityConfigType: number
            capacityConfigStatus: number
          }
          diffAmount: number
          scmSkuName: string
          /**
           * Special flag for events/holidays
           * @example "2025ChineseNewYear"
           */
          specialFlag: string
          scmProductId: number
          baseProductId: number
          workmanshipId: number
          capacityConfig: {
            id: number
            /**
             * Config type
             * @example 1
             */
            type: number
            extra: {
              delayCompensationConfig: {
                /**
                 * State: 0=disabled, 1=enabled
                 * @example 1
                 */
                state: number
              }
              urgentCompensationConfig: {
                /**
                 * Days for urgent production
                 * @example 5
                 */
                day: number
                /**
                 * State: 0=disabled, 1=enabled
                 * @example 1
                 */
                state: number
              }
              estimatedShippingTimeConfig: {
                /**
                 * @example 10
                 */
                dayRangeTypeOf1: number
                /**
                 * @example 15
                 */
                dayRangeTypeOf2: number
              }
            }
            status: number
            /**
             * Creation timestamp
             * @example 1711101636
             */
            created_at: number
            /**
             * Last update time in ISO format
             * @example "2025-08-04T23:59:02+08:00"
             */
            updated_at: string
            talent_base_product_id: number
            talent_production_process_id: number
          }
          scmProductName: string
          capacityConfigId: number
          partReplaceItems: null
          productWorkmanship: {
            id: number
            extra: null
            thumb: string
            /**
             * @example "热转印 "
             */
            showName: string
            /**
             * @example "热转印（吧唧类）"
             */
            innerName: string
            baseProductIds: null
          }
        }
        ticketDiscount: number
        delayCompensationSwitch: boolean
      }
      /**
       * Production images
       */
      production_image: string[]
      cost_price: number
      unit_price: number
      offset_price: number
      profit_price: number
      count: number
      rate_price: number
    }[]
    union_order: {
      id: number
      /**
       * Platform ID, -1 for Rouzao
       * @example -1
       */
      platform: number
      /**
       * Union order serial number
       * @example "250805195953001512"
       */
      union_order_sn: string
      user_id: number
      /**
       * Payment status: 1=paid
       * @example 1
       */
      union_pay_status: number
      /**
       * Refund status: 0=no refund
       * @example 0
       */
      union_refund_status: number
      /**
       * Order status: 4=completed
       * @example 4
       */
      union_order_status: number
      freight_amount: number
      total_amount: number
      profit_amount: number
      cost_amount: number
      /**
       * Payment type
       * @example 11
       */
      payment_type: number
      /**
       * Payment timestamp
       * @example 1754395238
       */
      paid_at: number
      /**
       * Third party payment serial number
       * @example "2025080522001458461459545263"
       */
      third_pay_sn: string
      remark: string
      /**
       * Shipping confirmation timestamp
       * @example 1754718111
       */
      confirm_ship_at: number
      third_party_order_sn: string
      talent_shop_id: number
      /**
       * Creation timestamp
       * @example 1754395193
       */
      created_at: number
      /**
       * Last update time
       * @example "2025-08-09 19:32:32"
       */
      updated_at: string
      /**
       * Deletion timestamp, 0 if not deleted
       * @example 0
       */
      deleted_at: number
      address: {
        id: number
        union_order_id: number
        receiver_name: string
        receiver_phone: string
        /**
         * Province
         * @example "上海市"
         */
        prov: string
        /**
         * City
         * @example "上海市" | "金华市"
         */
        city: string
        /**
         * District/Area
         * @example "浦东新区"
         */
        area: string
        /**
         * Zip code, often empty
         * @example ""
         */
        zip_code: string
        /**
         * Country code
         * @example "cn"
         */
        country_code: string
        /**
         * Full address
         * @example "详细地址xx路xx号xx楼"
         */
        address: string
        extends: null
        /**
         * Creation timestamp
         * @example 1754395193
         */
        created_at: number
        updated_at: null
      }
    }
    express: {
      id: number
      order_id: number
      /**
       * Express tracking number
       * @example "9879714448018"
       */
      express_number: string
      /**
       * Express company name
       * @example "EMS小件"
       */
      express_company_name: string
      /**
       * Express company code
       * @example "postb"
       */
      express_company: string
      package_count: number
      /**
       * Shipping status code
       * @example 25
       */
      shipping_status: number
      traces: {
        /**
         * City name
         * @example "上海市" | "金华市" | ""
         */
        city: string
        /**
         * Trace time
         * @example "2025-08-09 15:17:41"
         */
        time: string
        /**
         * Delivery status
         * @example "已签收" | "运输中" | ""
         */
        status: string
        /**
         * Trace context/description
         */
        context: string
      }[]
      /**
       * Creation timestamp
       * @example 1754546734
       */
      created_at: number
      updated_at: null
      /**
       * Deletion timestamp, 0 if not deleted
       * @example 0
       */
      deleted_at: number
    }
    production: {
      id: number
      order_id: number
      ipc_order_id: number
      /**
       * Production serial number
       * @example "IPC2508051959530015721"
       */
      production_sn: string
      /**
       * IPC production ID
       * @example "466915660"
       */
      ipc_production_id: string
      /**
       * Production status
       * @example 0
       */
      production_status: number
      factory_id: number
      factory_name: string
      reason: string
      remark: string
      extra_data: null
      /**
       * Creation timestamp
       * @example 1754395312
       */
      created_at: number
      updated_at: null
      /**
       * Deletion timestamp, 0 if not deleted
       * @example 0
       */
      deleted_at: number
    }
    /**
     * Formatted creation date
     * @example "2025-08-05 19:59:53"
     */
    fmt_created_at: string
    /**
     * Formatted payment date
     * @example "2025-08-05 20:00:38"
     */
    fmt_paid_at: string
    /**
     * Source
     * @example 0
     */
    source: number
    /**
     * Summary status
     * @example 20
     */
    summary_status: number
    view_status: {
      /**
       * Order reminder
       * @example "已发货"
       */
      orderRemind: string
      /**
       * Order show status code
       * @example 3
       */
      orderShowStatus: number
      /**
       * Status text
       * @example "已发货"
       */
      statusText: string
      /**
       * Order ship status
       * @example "已签收"
       */
      orderShipStatus: string
      /**
       * Estimated shipping date, empty if shipped
       * @example ""
       */
      estimatedShippingAt: string
      willCancelAt: number
      stockWarning: string
      stopDeliveryTips: string
    }
    bill_package: {
      key: string
      /**
       * @example "订单1"
       */
      name: string
      skus: {
        id: number
        name: string
        /**
         * @example "张"
         */
        unit: string
        wrap: {
          id: number
          /**
           * @example "独立包装"
           */
          name: string
          type: number
          image: string[]
          title: string
          images: string[]
          volume: number
          packFee: number
          pack_fee: string
          subtotal: number
          unitPrice: number
          usedCount: number
          unit_price: string
          packSubtotal: number
          materialSubtotal: number
        }
        count: number
        image: string
        /**
         * Can use CP30 service
         * @example 1
         */
        canCP30: number
        cp30Fee: number
        assembly: null
        soldConf: {
          /**
           * Pricing type
           * @example "tiered"
           */
          price_type: string
          sales_limit: {
            /**
             * Minimum quantity
             * @example 1
             */
            min_quantity: number
          }
          tiered_price: {
            rules: {
              count: number
              price: string
            }[]
          }
          package_count: number
          /**
           * Method of sale
           * @example 1
           */
          method_of_sale: number
          /**
           * Whether available for third party sale
           * @example true
           */
          sale_for_thirdparty: boolean
        }
        subtotal: number
        canUrgent: boolean
        costPrice: number
        soldCount: number
        /**
         * @example "1~9张"
         */
        tieredHit: string
        unitPrice: number
        urgentFee: number
        weworkAct: {
          actIsValid: boolean
          weworkPrice: number
          hasWeworkPrice: boolean
          isAddPrivateWework: boolean
        }
        innerCount: number
        share_info: any[]
        yingePrice: number
        tieredPrice: {
          count: number
          price: string
        }[]
        workmanship: {
          amount: number
          status: number
          skuType: number
          scmSkuId: number
          isDefault: number
          mappingId: number
          stockInfo: {
            hasStock: boolean
            stockTextV2: null
            stockTextList: null
            stockWarningTip: string
            capacityConfigType: number
            capacityConfigStatus: number
          }
          diffAmount: number
          scmSkuName: string
          /**
           * Special flag for events/holidays
           * @example "2025ChineseNewYear"
           */
          specialFlag: string
          scmProductId: number
          baseProductId: number
          workmanshipId: number
          capacityConfig: {
            id: number
            type: number
            extra: {
              delayCompensationConfig: {
                state: number
              }
              urgentCompensationConfig: {
                day: number
                state: number
              }
              estimatedShippingTimeConfig: {
                dayRangeTypeOf1: number
                dayRangeTypeOf2: number
              }
            }
            status: number
            created_at: number
            updated_at: string
            talent_base_product_id: number
            talent_production_process_id: number
          }
          scmProductName: string
          capacityConfigId: number
          partReplaceItems: null
          productWorkmanship: {
            id: number
            extra: null
            thumb: string
            showName: string
            innerName: string
            baseProductIds: null
          }
        }
        dayRangeType: number
        isSelectCP30: boolean
        baseProductId: number
        isWeworkPrice: boolean
        stockQuantity: number
        innerUnitPrice: number
        isSelectUrgent: boolean
        talentProductId: number
        workmanshipPrice: number
        talentProductName: string
        useInnerCalculate: boolean
        /**
         * Free shipping product flag
         * @example 1
         */
        isFreeShippingProduct: number
      }[]
      isCP30: boolean
      isUrgent: boolean
      shipping: {
        icon: string
        amount: number
        subtotal: number
        /**
         * Express company code
         * @example "postb" | "zto" | "sf"
         */
        companyCode: string
        /**
         * Express company name
         * @example "中国邮政EMS" | "中通快递" | "顺丰标快"
         */
        companyName: string
      }[]
      isGuoqing: boolean
      costAmount: number
      /**
       * @example "16点前支付，5天发货；16点后支付，6天发货。超时免单"
       */
      urgentText: string
      pkgSkuCount: number
      /**
       * Warehouse ID
       * @example 1
       */
      warehouseId: number
      cp30FeeTotal: number
      selectTicket: any[]
      /**
       * Selected shipping company code
       * @example "postb"
       */
      shippingCode: string
      talentSkuIds: number[]
      subtotalDetail: {
        innerPack: number
        branchAmount: number
        outerPackFee: number
        innerMaterial: number
        workmanshipAmount: number
      }
      ticketDiscount: {
        totalDiscount: number
        ticketTotalDiscount: number
        urgentTotalDiscount: number
      }
      urgentFeeTotal: number
      packageSubtotal: number
      productSubtotal: number
      /**
       * Order split rule
       * @example "most_efficient"
       */
      selectSplitRule: string
      assemblyFeeTotal: number
      /**
       * Compensation type
       * @example 2
       */
      compensationType: number
      shippingSubtotal: number
      stopDeliveryTips: string
      freeShippingSkuIds: number[]
      selectUrgentTicket: null
      /**
       * Estimated shipping timestamp
       * @example 1755345592
       */
      estimatedShippingAt: number
      isDelayCompensation: boolean
      forceDelayCompensation: boolean
      delayCompensationSwitch: boolean
      /**
       * Estimated shipping days text
       * @example "11天发货"
       */
      estimatedShippingAtText: string
      packageShippingDiscount: any[]
      freeShippingProductAmount: number
      /**
       * Urgent estimated shipping days
       * @example 6
       */
      urgentEstimatedShippingDays: number
    }
    address_info: {
      id: number
      union_order_id: number
      receiver_name: string
      receiver_phone: string
      /**
       * Province
       * @example "上海市"
       */
      prov: string
      /**
       * City
       * @example "上海市"
       */
      city: string
      /**
       * District/Area
       * @example "浦东新区"
       */
      area: string
      /**
       * Zip code, often empty
       * @example ""
       */
      zip_code: string
      /**
       * Country code
       * @example "cn"
       */
      country_code: string
      /**
       * Full address
       * @example "详细地址xx路xx号xx楼"
       */
      address: string
      extends: null
      /**
       * Creation timestamp
       * @example 1754395193
       */
      created_at: number
      updated_at: null
    }
    address_stop_msg: string
    delay_compensation_info: null
    carpool: {
      is_carpool_order: boolean
      is_charter_order: boolean
    }
  }
  /**
   * Response code, 0 for success
   * @example 0
   */
  code: number
}
