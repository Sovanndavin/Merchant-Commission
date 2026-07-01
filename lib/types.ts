export type CommissionValueType = "percentage" | "fixed_amount" | "amount_per_kg";
export type DefaultCommissionValueType = "percentage" | "fixed_amount";
export type RuleScope = "merchant" | "shop";
export type CommissionStatus = "active" | "inactive";

export type TierRule = {
  id: string;
  name: string;
  monthlySalesFrom: number;
  valueType: "percentage";
  value: number;
  status: CommissionStatus;
};

export type CategoryRule = {
  id: string;
  scope: RuleScope;
  shopId?: string;
  categoryId: string;
  categoryName: string;
  valueType: CommissionValueType;
  value: number;
  status: CommissionStatus;
};

export type ProductRule = {
  id: string;
  scope: RuleScope;
  shopId?: string;
  productId: string;
  productName: string;
  categoryId: string;
  valueType: CommissionValueType;
  value: number;
  status: CommissionStatus;
};

export type ShopCommission = {
  shopId: string;
  shopName: string;
  useMerchantRule: boolean;
  defaultValueType: DefaultCommissionValueType;
  defaultValue: number;
  tiers: TierRule[];
  status: CommissionStatus;
};

export type MerchantCommission = {
  merchantId: string;
  merchantName: string;
  merchantCode: string;
  totalShops: number;
  defaultValueType: DefaultCommissionValueType;
  defaultValue: number;
  tiers: TierRule[];
  shops: ShopCommission[];
  categoryRules: CategoryRule[];
  productRules: ProductRule[];
  status: CommissionStatus;
  updatedAt: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  quantityKg?: number;
};

export type CommissionLine = {
  productName: string;
  baseAmount: number;
  commissionAmount: number;
  appliedRule: string;
};

export type CommissionPreview = {
  merchantId: string;
  shopId: string;
  monthlySales: number;
  orderTotal: number;
  redAntCommission: number;
  merchantReceive: number;
  lines: CommissionLine[];
};
