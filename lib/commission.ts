import type {
  CategoryRule,
  CommissionLine,
  CommissionPreview,
  CommissionValueType,
  MerchantCommission,
  OrderItem,
  ProductRule,
  ShopCommission,
  TierRule
} from "./types";

const money = (value: number) => Math.round(value * 100) / 100;

function percentage(amount: number, value: number) {
  return money((amount * value) / 100);
}

function amountPerKg(item: OrderItem, value: number) {
  return money((item.quantityKg ?? 1) * value);
}

function calculateByType(item: OrderItem, valueType: CommissionValueType, value: number) {
  if (valueType === "fixed_amount") {
    return money(value);
  }

  if (valueType === "amount_per_kg") {
    return amountPerKg(item, value);
  }

  return percentage(item.amount, value);
}

function findHighestTier(tiers: TierRule[], monthlySales: number) {
  return [...tiers]
    .filter((tier) => tier.status === "active" && monthlySales >= tier.monthlySalesFrom)
    .sort((a, b) => b.monthlySalesFrom - a.monthlySalesFrom)[0];
}

function findShop(merchant: MerchantCommission, shopId: string) {
  return merchant.shops.find((shop) => shop.shopId === shopId);
}

function findProductRule(
  rules: ProductRule[],
  item: OrderItem,
  scope: "shop" | "merchant",
  shopId?: string
) {
  return rules.find((rule) => {
    if (rule.status !== "active" || rule.scope !== scope || rule.productId !== item.productId) {
      return false;
    }

    return scope === "merchant" || rule.shopId === shopId;
  });
}

function findCategoryRule(
  rules: CategoryRule[],
  item: OrderItem,
  scope: "shop" | "merchant",
  shopId?: string
) {
  return rules.find((rule) => {
    if (rule.status !== "active" || rule.scope !== scope || rule.categoryId !== item.categoryId) {
      return false;
    }

    return scope === "merchant" || rule.shopId === shopId;
  });
}

function lineFromRule(item: OrderItem, ruleName: string, type: CommissionValueType, value: number) {
  return {
    productName: item.productName,
    baseAmount: item.amount,
    commissionAmount: calculateByType(item, type, value),
    appliedRule: ruleName
  };
}

function formatRuleValue(type: CommissionValueType, value: number) {
  if (type === "amount_per_kg") {
    return `$${value}/kg`;
  }

  if (type === "fixed_amount") {
    return `$${value}`;
  }

  return `${value}%`;
}

function lineFromTier(item: OrderItem, tier: TierRule, source: string) {
  return {
    productName: item.productName,
    baseAmount: item.amount,
    commissionAmount: percentage(item.amount, tier.value),
    appliedRule: `${source} ${tier.name} (${tier.value}%)`
  };
}

function lineFromDefault(
  item: OrderItem,
  type: "percentage" | "fixed_amount",
  value: number,
  source: string
) {
  return {
    productName: item.productName,
    baseAmount: item.amount,
    commissionAmount: calculateByType(item, type, value),
    appliedRule: `${source} default (${formatRuleValue(type, value)})`
  };
}

function calculateItemLine(
  merchant: MerchantCommission,
  shop: ShopCommission | undefined,
  item: OrderItem,
  monthlySales: number
): CommissionLine {
  const shopProductRule = shop?.useMerchantRule
    ? undefined
    : findProductRule(merchant.productRules, item, "shop", shop?.shopId);
  if (shopProductRule) {
    return lineFromRule(
      item,
      `Shop product rule (${formatRuleValue(shopProductRule.valueType, shopProductRule.value)})`,
      shopProductRule.valueType,
      shopProductRule.value
    );
  }

  const shopCategoryRule = shop?.useMerchantRule
    ? undefined
    : findCategoryRule(merchant.categoryRules, item, "shop", shop?.shopId);
  if (shopCategoryRule) {
    return lineFromRule(
      item,
      `Shop category rule (${formatRuleValue(shopCategoryRule.valueType, shopCategoryRule.value)})`,
      shopCategoryRule.valueType,
      shopCategoryRule.value
    );
  }

  const shopTier = shop?.useMerchantRule ? undefined : findHighestTier(shop?.tiers ?? [], monthlySales);
  const merchantProductRule = findProductRule(merchant.productRules, item, "merchant");
  if (merchantProductRule) {
    return lineFromRule(
      item,
      `Merchant product rule (${formatRuleValue(merchantProductRule.valueType, merchantProductRule.value)})`,
      merchantProductRule.valueType,
      merchantProductRule.value
    );
  }

  const merchantCategoryRule = findCategoryRule(merchant.categoryRules, item, "merchant");
  if (merchantCategoryRule) {
    return lineFromRule(
      item,
      `Merchant category rule (${formatRuleValue(merchantCategoryRule.valueType, merchantCategoryRule.value)})`,
      merchantCategoryRule.valueType,
      merchantCategoryRule.value
    );
  }

  if (shopTier) {
    return lineFromTier(item, shopTier, "Shop");
  }

  if (shop && !shop.useMerchantRule) {
    return lineFromDefault(item, shop.defaultValueType, shop.defaultValue, "Shop");
  }

  const merchantTier = findHighestTier(merchant.tiers, monthlySales);
  if (merchantTier) {
    return lineFromTier(item, merchantTier, "Merchant");
  }

  return lineFromDefault(item, merchant.defaultValueType, merchant.defaultValue, "Merchant");
}

export function calculateCommissionPreview(
  merchant: MerchantCommission,
  shopId: string,
  monthlySales: number,
  items: OrderItem[]
): CommissionPreview {
  const shop = findShop(merchant, shopId);
  const lines = items.map((item) => calculateItemLine(merchant, shop, item, monthlySales));
  const orderTotal = money(items.reduce((total, item) => total + item.amount, 0));
  const redAntCommission = money(lines.reduce((total, line) => total + line.commissionAmount, 0));

  return {
    merchantId: merchant.merchantId,
    shopId,
    monthlySales,
    orderTotal,
    redAntCommission,
    merchantReceive: money(orderTotal - redAntCommission),
    lines
  };
}
