import type { MerchantCommission, OrderItem } from "./types";

export const merchantCommissions: MerchantCommission[] = [
  {
    merchantId: "m-001",
    merchantCode: "MCP00001",
    merchantName: "Davin Salmon",
    totalShops: 5,
    defaultValueType: "percentage",
    defaultValue: 15,
    tiers: [
      {
        id: "tier-1",
        name: "Tier 1",
        monthlySalesFrom: 10000,
        valueType: "percentage",
        value: 20,
        status: "active"
      },
      {
        id: "tier-2",
        name: "Tier 2",
        monthlySalesFrom: 20000,
        valueType: "percentage",
        value: 25,
        status: "active"
      },
      {
        id: "tier-3",
        name: "Tier 3",
        monthlySalesFrom: 30000,
        valueType: "percentage",
        value: 30,
        status: "active"
      }
    ],
    shops: [
      {
        shopId: "s-001",
        shopName: "King Mart BKK",
        useMerchantRule: false,
        defaultValueType: "percentage",
        defaultValue: 18,
        tiers: [
          {
            id: "shop-tier-1",
            name: "Tier 1",
            monthlySalesFrom: 10000,
            valueType: "percentage",
            value: 20,
            status: "active"
          },
          {
            id: "shop-tier-2",
            name: "Tier 2",
            monthlySalesFrom: 20000,
            valueType: "percentage",
            value: 25,
            status: "active"
          },
          {
            id: "shop-tier-3",
            name: "Tier 3",
            monthlySalesFrom: 30000,
            valueType: "percentage",
            value: 30,
            status: "active"
          }
        ],
        status: "active"
      },
      {
        shopId: "s-002",
        shopName: "King Mart TK",
        useMerchantRule: true,
        defaultValueType: "percentage",
        defaultValue: 15,
        tiers: [],
        status: "active"
      },
      {
        shopId: "s-003",
        shopName: "King Mart Toul Kork",
        useMerchantRule: true,
        defaultValueType: "percentage",
        defaultValue: 15,
        tiers: [],
        status: "active"
      },
      {
        shopId: "s-004",
        shopName: "King Mart Sen Sok",
        useMerchantRule: true,
        defaultValueType: "percentage",
        defaultValue: 15,
        tiers: [],
        status: "active"
      },
      {
        shopId: "s-005",
        shopName: "King Mart Mean Chey",
        useMerchantRule: true,
        defaultValueType: "percentage",
        defaultValue: 15,
        tiers: [],
        status: "active"
      }
    ],
    categoryRules: [
      {
        id: "cat-001",
        scope: "merchant",
        categoryId: "c-salmon",
        categoryName: "Salmon Tek Sab",
        valueType: "percentage",
        value: 15,
        status: "active"
      },
      {
        id: "cat-002",
        scope: "merchant",
        categoryId: "c-trout-au",
        categoryName: "Trout Australi",
        valueType: "percentage",
        value: 25,
        status: "active"
      },
      {
        id: "cat-003",
        scope: "shop",
        shopId: "s-001",
        categoryId: "c-trout-bkk",
        categoryName: "Trout BKK",
        valueType: "amount_per_kg",
        value: 1,
        status: "active"
      }
    ],
    productRules: [
      {
        id: "prod-001",
        scope: "shop",
        shopId: "s-001",
        productId: "p-trout-bkk-1kg",
        productName: "Trout BKK 1Kg",
        categoryId: "c-trout-bkk",
        valueType: "amount_per_kg",
        value: 1,
        status: "active"
      }
    ],
    status: "active",
    updatedAt: "2026-06-25 14:38:57"
  },
  {
    merchantId: "m-002",
    merchantCode: "MCP00002",
    merchantName: "Blue Moon",
    totalShops: 2,
    defaultValueType: "percentage",
    defaultValue: 12,
    tiers: [
      {
        id: "bm-tier-1",
        name: "Tier 1",
        monthlySalesFrom: 10000,
        valueType: "percentage",
        value: 18,
        status: "active"
      }
    ],
    shops: [
      {
        shopId: "s-101",
        shopName: "Blue Moon Riverside",
        useMerchantRule: true,
        defaultValueType: "percentage",
        defaultValue: 12,
        tiers: [],
        status: "active"
      },
      {
        shopId: "s-102",
        shopName: "Blue Moon Midtown",
        useMerchantRule: true,
        defaultValueType: "percentage",
        defaultValue: 12,
        tiers: [],
        status: "active"
      }
    ],
    categoryRules: [],
    productRules: [],
    status: "active",
    updatedAt: "2026-06-23 10:50:34"
  }
];

export const sampleOrderItems: OrderItem[] = [
  {
    productId: "p-salmon-tek-sab",
    productName: "Salmon Tek Sab",
    categoryId: "c-salmon",
    categoryName: "Salmon Tek Sab",
    amount: 100
  },
  {
    productId: "p-trout-au",
    productName: "Trout Australi",
    categoryId: "c-trout-au",
    categoryName: "Trout Australi",
    amount: 400
  },
  {
    productId: "p-trout-bkk-1kg",
    productName: "Trout BKK 1Kg",
    categoryId: "c-trout-bkk",
    categoryName: "Trout BKK",
    amount: 1,
    quantityKg: 1
  }
];
