// @ts-nocheck

import { Fragment, useEffect, useMemo, useState } from "react";
import { calculateCommissionPreview } from "@/lib/commission";
import { sampleOrderItems } from "@/lib/data";
import type {
  CategoryRule,
  CommissionPreview,
  CommissionStatus,
  CommissionValueType,
  DefaultCommissionValueType,
  MerchantCommission,
  ProductRule,
  RuleScope
} from "@/lib/types";

type Props = {
  merchants: MerchantCommission[];
  initialMerchantId: string;
  initialShopId: string;
  initialPreview: CommissionPreview;
  onOpenStoreProfile?: () => void;
};

type Tab = "main" | "shops" | "categories" | "products" | "preview" | "history";
type RuleDrawerType = "category" | "product" | null;
type LocalCategoryRule = CategoryRule & {
  merchantId: string;
  effectiveDate: string;
  note: string;
};
type LocalProductRule = ProductRule & {
  merchantId: string;
  effectiveDate: string;
  note: string;
};
type LocalTierRule = {
  merchantId: string;
  id: string;
  name: string;
  monthlySalesFrom: number;
  valueType: "percentage";
  value: number;
  status: CommissionStatus;
  effectiveDate: string;
  note: string;
};
type CommissionPeriod = {
  id: number;
  startDate: string;
  endDate: string;
  rate: string;
};
type CommissionRateTier = {
  id: number;
  amountFrom: string;
  rate: string;
};
type DisplayRule = CategoryRule | ProductRule | LocalCategoryRule | LocalProductRule;

const categoryOptions = [
  { id: "c-salmon", name: "Salmon Tek Sab" },
  { id: "c-trout-au", name: "Trout Australi" },
  { id: "c-trout-bkk", name: "Trout BKK" },
  { id: "c-seafood", name: "Seafood Premium" },
  { id: "c-electronics", name: "Electronics" }
];

const productOptions = [
  { id: "p-salmon-tek-sab", name: "Salmon Tek Sab", categoryId: "c-salmon" },
  { id: "p-trout-au", name: "Trout Australi", categoryId: "c-trout-au" },
  { id: "p-trout-bkk-1kg", name: "Trout BKK 1Kg", categoryId: "c-trout-bkk" },
  { id: "p-seafood-box", name: "Seafood Premium Box", categoryId: "c-seafood" },
  { id: "p-iphone", name: "iPhone", categoryId: "c-electronics" },
  { id: "p-phone-yellow", name: "Phone Yellow - $1000", categoryId: "c-electronics" },
  { id: "p-phone-black", name: "Phone Black - $1500", categoryId: "c-electronics" },
  { id: "p-laptop", name: "Laptop", categoryId: "c-electronics" }
];

const merchantProfileTabs = [
  "Profile",
  "Commission",
  "Category",
  "Menu",
  "Wallet",
  "Performance",
  "User & Device"
];

const commissionJourneyTabs: Array<{ id: Tab; label: string; slug: string }> = [
  { id: "main", label: "Main Commission", slug: "main-commission" },
  { id: "shops", label: "Store Commission", slug: "store-commission" },
  { id: "categories", label: "Category Rules", slug: "category-rules" },
  { id: "products", label: "Product Rules", slug: "product-rules" },
  { id: "preview", label: "Preview", slug: "preview" },
  { id: "history", label: "History", slug: "history" }
];

function tabFromHash(): Tab {
  const slug = window.location.hash.replace("#/merchant-commission", "").replace(/^\/+/, "");
  return commissionJourneyTabs.find((tab) => tab.slug === slug)?.id ?? "main";
}

function hashForTab(tab: Tab) {
  const slug = commissionJourneyTabs.find((item) => item.id === tab)?.slug ?? "main-commission";
  return `#/merchant-commission/${slug}`;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const number = new Intl.NumberFormat("en-US");

const defaultCommissionTypeOptions: Array<{ value: CommissionValueType; label: string }> = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed_amount", label: "Fixed Amount" }
];

const weightCommissionTypeOption: { value: CommissionValueType; label: string } = {
  value: "amount_per_kg",
  label: "Amount per Kg"
};

function formatCurrency(value: number) {
  return currency.format(value);
}

function formatRuleCount(count: number) {
  return count === 1 ? "1 rule" : `${count} rules`;
}

function formatCommissionValue(type: string, value: number) {
  if (type === "amount_per_kg") {
    return `${formatCurrency(value)} / kg`;
  }

  if (type === "fixed_amount") {
    return formatCurrency(value);
  }

  return `${value}%`;
}

function formatCommissionType(type: string) {
  if (type === "fixed_amount") {
    return "Fixed Amount";
  }

  if (type === "amount_per_kg") {
    return "Amount / Kg";
  }

  return "Percentage";
}

function canUseAmountPerKg(productId: string, categoryId: string) {
  return productId === "p-trout-bkk-1kg" || categoryId === "c-trout-bkk";
}

function getCommissionTypeOptions(productId: string, categoryId: string) {
  if (canUseAmountPerKg(productId, categoryId)) {
    return [...defaultCommissionTypeOptions, weightCommissionTypeOption];
  }

  return defaultCommissionTypeOptions;
}

function getProductRuleSuggestion(productId: string, categoryId: string) {
  if (productId === "p-phone-yellow") {
    return {
      valueType: "fixed_amount" as CommissionValueType,
      value: "50",
      label: "$50",
      reason: "For a yellow phone priced at $1000, a $50 fixed commission equals about 5% and keeps the rule simple."
    };
  }

  if (productId === "p-phone-black") {
    return {
      valueType: "fixed_amount" as CommissionValueType,
      value: "75",
      label: "$75",
      reason: "For a black phone priced at $1500, a $75 fixed commission keeps the same 5% commission logic."
    };
  }

  if (productId === "p-iphone") {
    return {
      valueType: "percentage" as CommissionValueType,
      value: "5",
      label: "5%",
      reason: "iPhone is a high-value electronics item, so a lower percentage keeps the merchant payout competitive."
    };
  }

  if (productId === "p-laptop") {
    return {
      valueType: "fixed_amount" as CommissionValueType,
      value: "15",
      label: "$15",
      reason: "Laptop prices can vary widely, so a fixed commission gives Red Ant predictable earnings per order."
    };
  }

  if (productId === "p-trout-bkk-1kg" || categoryId === "c-trout-bkk") {
    return {
      valueType: "amount_per_kg" as CommissionValueType,
      value: "1",
      label: "$1 / kg",
      reason: "Best for weight-based seafood items where commission should follow kilogram quantity."
    };
  }

  if (categoryId === "c-trout-au") {
    return {
      valueType: "percentage" as CommissionValueType,
      value: "25",
      label: "25%",
      reason: "Premium imported trout can use a stronger percentage rule than the merchant default."
    };
  }

  if (categoryId === "c-seafood") {
    return {
      valueType: "fixed_amount" as CommissionValueType,
      value: "2.5",
      label: "$2.50",
      reason: "Fixed amount is easier to control for bundled seafood boxes and e-commerce items."
    };
  }

  if (categoryId === "c-electronics") {
    return {
      valueType: "percentage" as CommissionValueType,
      value: "6",
      label: "6%",
      reason: "Electronics usually need a lower commission rate because item prices are higher than food products."
    };
  }

  return {
    valueType: "percentage" as CommissionValueType,
    value: "15",
    label: "15%",
    reason: "Use the merchant default style for standard products unless this product needs a special override."
  };
}

function getProductRuleSuggestions(productId: string, categoryId: string) {
  const primary = getProductRuleSuggestion(productId, categoryId);
  const suggestions = [
    {
      ...primary,
      title: "Best Fit",
      tone: "recommended",
      detail: "Recommended for this selected product."
    }
  ];

  if (productId === "p-phone-yellow") {
    suggestions.push({
      valueType: "percentage" as CommissionValueType,
      value: "5",
      label: "5%",
      title: "Percentage Option",
      tone: "standard",
      detail: "Use when the merchant wants the rule to follow product price changes.",
      reason: "5% of the $1000 yellow phone price equals the same $50 commission."
    });
  } else if (productId === "p-phone-black") {
    suggestions.push({
      valueType: "percentage" as CommissionValueType,
      value: "5",
      label: "5%",
      title: "Percentage Option",
      tone: "standard",
      detail: "Use when the merchant wants the rule to follow product price changes.",
      reason: "5% of the $1500 black phone price equals the same $75 commission."
    });
  } else if (productId === "p-iphone") {
    suggestions.push({
      valueType: "fixed_amount" as CommissionValueType,
      value: "50",
      label: "$50",
      title: "Fixed Control",
      tone: "standard",
      detail: "Use when finance wants predictable earning per iPhone order.",
      reason: "A fixed amount is easier to audit for high-value phone items."
    });
  } else if (productId === "p-laptop") {
    suggestions.push({
      valueType: "percentage" as CommissionValueType,
      value: "4",
      label: "4%",
      title: "Price-Based",
      tone: "standard",
      detail: "Use when laptop prices differ a lot by model.",
      reason: "A low percentage keeps commission proportional across cheaper and premium laptops."
    });
  } else if (canUseAmountPerKg(productId, categoryId)) {
    suggestions.push(
      {
        valueType: "percentage" as CommissionValueType,
        value: "15",
        label: "15%",
        title: "Simple Percentage",
        tone: "standard",
        detail: "Use when order amount is more reliable than quantity weight.",
        reason: "Percentage is easier when product weight is not always entered consistently."
      },
      {
        valueType: "fixed_amount" as CommissionValueType,
        value: "1",
        label: "$1",
        title: "Fixed Per Item",
        tone: "standard",
        detail: "Use when each line item should earn the same amount.",
        reason: "Fixed amount avoids depending on product weight."
      }
    );
  } else if (categoryId === "c-electronics") {
    suggestions.push({
      valueType: "fixed_amount" as CommissionValueType,
      value: "50",
      label: "$50",
      title: "Fixed Control",
      tone: "standard",
      detail: "Use for high-price electronics when finance wants predictable earning.",
      reason: "Fixed commission avoids oversized commission on expensive products."
    });
  } else if (categoryId === "c-seafood") {
    suggestions.push({
      valueType: "percentage" as CommissionValueType,
      value: "12",
      label: "12%",
      title: "Percentage Option",
      tone: "standard",
      detail: "Use when seafood box prices change frequently.",
      reason: "Percentage keeps commission proportional to product price."
    });
  }

  return suggestions;
}

function getEffectiveDate(rule: DisplayRule) {
  return "effectiveDate" in rule ? rule.effectiveDate : "-";
}

function getRuleNote(rule: DisplayRule) {
  return "note" in rule && rule.note ? rule.note : "-";
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

function ActionButton({ children }: { children: React.ReactNode }) {
  return <button className="iconButton" type="button">{children}</button>;
}

function CaptureBrief({
  title,
  description,
  items
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <section className="captureBrief">
      <div>
        <span className="eyebrow">Information Capture</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="captureBriefList">
        {items.map((item, index) => (
          <div key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const [day, month, year] = value.split("-");
  if (day && month && year) {
    return `${year}-${month}-${day}`;
  }

  return value;
}

function getCommissionPeriodWarnings(periods: CommissionPeriod[]) {
  const normalizedPeriods = periods.map((period, index) => ({
    ...period,
    index,
    start: toDateInputValue(period.startDate),
    end: toDateInputValue(period.endDate)
  }));
  const warnings: string[] = [];

  normalizedPeriods.forEach((period) => {
    if (period.start && period.end && period.start > period.end) {
      warnings.push(`Period ${period.index + 1} end date must be after start date.`);
    }
  });

  normalizedPeriods.forEach((period, periodIndex) => {
    normalizedPeriods.slice(periodIndex + 1).forEach((nextPeriod) => {
      if (period.start <= nextPeriod.end && nextPeriod.start <= period.end) {
        warnings.push(`Period ${period.index + 1} overlaps Period ${nextPeriod.index + 1}.`);
      }
    });
  });

  return warnings;
}

function getCommissionTierWarnings(tiers: CommissionRateTier[]) {
  const warnings: string[] = [];
  const amounts = tiers.map((tier) => Number(tier.amountFrom));

  amounts.forEach((amount, index) => {
    if (Number.isNaN(amount)) {
      warnings.push(`Tier ${index + 1} amount must be a number.`);
    }

    if (index > 0 && amount <= amounts[index - 1]) {
      warnings.push(`Tier ${index + 1} amount must be higher than Tier ${index}.`);
    }
  });

  return warnings;
}

export function CommissionDashboard({
  merchants,
  initialMerchantId,
  initialShopId,
  initialPreview,
  onOpenStoreProfile
}: Props) {
  const [selectedMerchantId, setSelectedMerchantId] = useState(initialMerchantId);
  const [selectedShopId, setSelectedShopId] = useState(initialShopId);
  const [expandedShopId, setExpandedShopId] = useState("");
  const [expandedRuleKey, setExpandedRuleKey] = useState("");
  const [openRuleActionMenu, setOpenRuleActionMenu] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("main");
  const [monthlySales, setMonthlySales] = useState(12000);
  const [preview, setPreview] = useState(initialPreview);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [defaultCommissionType, setDefaultCommissionType] =
    useState<DefaultCommissionValueType>("percentage");
  const [drawerType, setDrawerType] = useState<RuleDrawerType>(null);
  const [localCategoryRules, setLocalCategoryRules] = useState<LocalCategoryRule[]>([]);
  const [localProductRules, setLocalProductRules] = useState<LocalProductRule[]>([]);
  const [localTierRules, setLocalTierRules] = useState<LocalTierRule[]>([]);
  const [tierEdits, setTierEdits] = useState<Record<string, Partial<LocalTierRule>>>({});
  const [editingTierIds, setEditingTierIds] = useState<string[]>([]);
  const [deletedTierIds, setDeletedTierIds] = useState<string[]>([]);
  const [draftScope, setDraftScope] = useState<RuleScope>("merchant");
  const [draftShopId, setDraftShopId] = useState(initialShopId);
  const [draftCategoryId, setDraftCategoryId] = useState(categoryOptions[0].id);
  const [draftProductId, setDraftProductId] = useState(productOptions[0].id);
  const [draftProductSearch, setDraftProductSearch] = useState("");
  const [draftValueType, setDraftValueType] = useState<CommissionValueType>("percentage");
  const [draftValue, setDraftValue] = useState("15");
  const [draftEffectiveDate, setDraftEffectiveDate] = useState(todayInputValue());
  const [draftStatus, setDraftStatus] = useState<CommissionStatus>("active");
  const [draftNote, setDraftNote] = useState("");
  const [ruleSaveStatus, setRuleSaveStatus] = useState("");
  const [isCreatingMerchant, setIsCreatingMerchant] = useState(false);
  const [localMerchants, setLocalMerchants] = useState<MerchantCommission[]>([]);
  const [newMerchantName, setNewMerchantName] = useState("New Merchant");
  const [newMerchantCode, setNewMerchantCode] = useState("MCP00003");
  const [newTotalShops, setNewTotalShops] = useState("1");
  const [newDefaultType, setNewDefaultType] = useState<DefaultCommissionValueType>("percentage");
  const [newDefaultValue, setNewDefaultValue] = useState("15");
  const [newTierOneSales, setNewTierOneSales] = useState("10000");
  const [newTierOneRate, setNewTierOneRate] = useState("20");
  const [newTierTwoSales, setNewTierTwoSales] = useState("20000");
  const [newTierTwoRate, setNewTierTwoRate] = useState("25");
  const [newTierThreeSales, setNewTierThreeSales] = useState("30000");
  const [newTierThreeRate, setNewTierThreeRate] = useState("30");
  const [newMerchantStatus, setNewMerchantStatus] = useState<CommissionStatus>("active");
  const [isManagingStores, setIsManagingStores] = useState(false);
  const [managedShopId, setManagedShopId] = useState(initialShopId);
  const [isAddingTier, setIsAddingTier] = useState(false);
  const [draftTierName, setDraftTierName] = useState("Tier 4");
  const [draftTierSalesFrom, setDraftTierSalesFrom] = useState("40000");
  const [draftTierRate, setDraftTierRate] = useState("35");
  const [draftTierEffectiveDate, setDraftTierEffectiveDate] = useState(todayInputValue());
  const [draftTierStatus, setDraftTierStatus] = useState<CommissionStatus>("active");
  const [draftTierNote, setDraftTierNote] = useState("");
  const [commissionPeriods, setCommissionPeriods] = useState<CommissionPeriod[]>([
    { id: 1, startDate: "12-03-2026", endDate: "12-06-2026", rate: "0" },
    { id: 2, startDate: "13-06-2026", endDate: "13-07-2026", rate: "7" }
  ]);
  const [commissionRateTiers, setCommissionRateTiers] = useState<CommissionRateTier[]>([
    { id: 1, amountFrom: "0", rate: "8" },
    { id: 2, amountFrom: "10000", rate: "12" }
  ]);
  const [fixedCommissionRate, setFixedCommissionRate] = useState("17.5");

  const displayMerchants = useMemo(() => [...merchants, ...localMerchants], [merchants, localMerchants]);

  const selectedMerchant = useMemo(
    () => displayMerchants.find((merchant) => merchant.merchantId === selectedMerchantId) ?? displayMerchants[0],
    [displayMerchants, selectedMerchantId]
  );

  const customShopCount = selectedMerchant.shops.filter((shop) => !shop.useMerchantRule).length;
  const currentCategoryRules = [
    ...selectedMerchant.categoryRules,
    ...localCategoryRules.filter((rule) => rule.merchantId === selectedMerchant.merchantId)
  ];
  const currentProductRules = [
    ...selectedMerchant.productRules,
    ...localProductRules.filter((rule) => rule.merchantId === selectedMerchant.merchantId)
  ];
  const currentTierRules = [
    ...selectedMerchant.tiers,
    ...localTierRules.filter((rule) => rule.merchantId === selectedMerchant.merchantId)
  ]
    .filter((tier) => !deletedTierIds.includes(tier.id))
    .map((tier) => ({ ...tier, ...tierEdits[tier.id] }))
    .sort((a, b) => a.monthlySalesFrom - b.monthlySalesFrom);
  const managedStore =
    selectedMerchant.shops.find((shop) => shop.shopId === managedShopId) ?? selectedMerchant.shops[0];
  const managedCommissionType = managedStore?.useMerchantRule
    ? selectedMerchant.defaultValueType
    : managedStore?.defaultValueType ?? "percentage";
  const managedCommissionValue = managedStore?.useMerchantRule
    ? selectedMerchant.defaultValue
    : managedStore?.defaultValue ?? 0;
  const managedShopCategoryRules = currentCategoryRules.filter((rule) => rule.shopId === managedStore?.shopId);
  const managedShopProductRules = currentProductRules.filter((rule) => rule.shopId === managedStore?.shopId);
  const productsForCategory = productOptions.filter((product) => product.categoryId === draftCategoryId);
  const selectedDraftProduct =
    productOptions.find((product) => product.id === draftProductId) ?? productsForCategory[0] ?? productOptions[0];
  const filteredProductOptions = productsForCategory
    .filter((product) => product.name.toLowerCase().includes(draftProductSearch.trim().toLowerCase()))
    .slice(0, 8);
  const productRuleSuggestion = getProductRuleSuggestion(draftProductId, draftCategoryId);
  const productRuleSuggestions = getProductRuleSuggestions(draftProductId, draftCategoryId);
  const commissionTypeOptions = getCommissionTypeOptions(draftProductId, draftCategoryId);
  const commissionPeriodWarnings = getCommissionPeriodWarnings(commissionPeriods);
  const commissionTierWarnings = getCommissionTierWarnings(commissionRateTiers);
  const commissionDesignerWarnings = [...commissionPeriodWarnings, ...commissionTierWarnings];
  const commissionDesignerStatus = commissionDesignerWarnings.length ? "Needs review" : "Ready";
  const activePeriodRate = commissionPeriods[0]?.rate ?? "0";
  const firstTier = commissionRateTiers[0];
  const firstTierText = firstTier ? `$${number.format(Number(firstTier.amountFrom) || 0)} at ${firstTier.rate}%` : "-";
  const historySuggestions = [
    {
      title: "Preview After History Changes",
      detail: "Monthly tier and category rules changed recently. Run a sample order preview before the next contract update.",
      action: "Open Preview",
      onClick: () => openJourneyTab("preview")
    },
    {
      title: "Review Premium Category Rate",
      detail: `${currentCategoryRules.find((rule) => rule.categoryId === "c-trout-au")?.categoryName ?? "Premium category"} is above the default commission. Confirm margin still supports this rate.`,
      action: "View Category Rules",
      onClick: () => openJourneyTab("categories")
    },
    {
      title: "Check Store Overrides",
      detail: `${customShopCount} store override ${customShopCount === 1 ? "is" : "are"} active. Confirm store-level rules still match merchant main commission.`,
      action: "View Stores",
      onClick: () => openJourneyTab("shops")
    }
  ];

  useEffect(() => {
    function syncJourneyFromUrl() {
      if (window.location.hash.startsWith("#/merchant-commission")) {
        setActiveTab(tabFromHash());
      }
    }

    if (window.location.hash === "#/merchant-commission") {
      window.history.replaceState(null, "", hashForTab("main"));
    }

    syncJourneyFromUrl();

    window.addEventListener("hashchange", syncJourneyFromUrl);
    return () => window.removeEventListener("hashchange", syncJourneyFromUrl);
  }, []);

  useEffect(() => {
    if (!drawerType) return;

    const isCurrentTypeAllowed = commissionTypeOptions.some((option) => option.value === draftValueType);

    if (!isCurrentTypeAllowed) {
      setDraftValueType(productRuleSuggestion.valueType);
      setDraftValue(productRuleSuggestion.value);
    }
  }, [commissionTypeOptions, draftValueType, drawerType, productRuleSuggestion]);

  function openJourneyTab(tab: Tab) {
    setActiveTab(tab);

    const nextHash = hashForTab(tab);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function updateCommissionPeriod(id: number, patch: Partial<CommissionPeriod>) {
    setCommissionPeriods((current) =>
      current.map((period) => (period.id === id ? { ...period, ...patch } : period))
    );
  }

  function addCommissionPeriod() {
    setCommissionPeriods((current) => {
      const nextId = current.length ? Math.max(...current.map((period) => period.id)) + 1 : 1;
      const previousRate = current[current.length - 1]?.rate ?? "7";

      return [
        ...current,
        {
          id: nextId,
          startDate: "14-07-2026",
          endDate: "14-08-2026",
          rate: String(Number(previousRate) + 3 || 10)
        }
      ];
    });
  }

  function removeCommissionPeriod(id: number) {
    setCommissionPeriods((current) =>
      current.length === 1 ? current : current.filter((period) => period.id !== id)
    );
  }

  function updateCommissionRateTier(id: number, patch: Partial<CommissionRateTier>) {
    setCommissionRateTiers((current) => current.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)));
  }

  function addCommissionRateTier() {
    setCommissionRateTiers((current) => {
      const nextId = current.length ? Math.max(...current.map((tier) => tier.id)) + 1 : 1;
      const lastAmount = Number(current[current.length - 1]?.amountFrom ?? 0);

      return [
        ...current,
        {
          id: nextId,
          amountFrom: String(lastAmount + 10000),
          rate: "15"
        }
      ];
    });
  }

  function removeCommissionRateTier(id: number) {
    setCommissionRateTiers((current) =>
      current.length === 1 ? current : current.filter((tier) => tier.id !== id)
    );
  }

  function openRuleDrawer(type: Exclude<RuleDrawerType, null>) {
    setIsCreatingMerchant(false);
    setIsManagingStores(false);
    setIsAddingTier(false);
    setRuleSaveStatus("");
    setOpenRuleActionMenu("");
    setDrawerType(type);
    setDraftScope("merchant");
    setDraftShopId(selectedMerchant.shops[0]?.shopId ?? "");
    setDraftCategoryId(categoryOptions[0].id);
    setDraftProductId(productOptions[0].id);
    setDraftProductSearch("");
    setDraftValueType(type === "category" ? "percentage" : "amount_per_kg");
    setDraftValue(type === "category" ? "15" : "1");
    setDraftEffectiveDate(todayInputValue());
    setDraftStatus("active");
    setDraftNote("");
  }

  function closeRuleDrawer() {
    setDrawerType(null);
    setOpenRuleActionMenu("");
  }

  function openCategoryRuleForEdit(rule: DisplayRule) {
    if (!("categoryName" in rule)) return;

    setDrawerType("category");
    setOpenRuleActionMenu("");
    setDraftScope(rule.scope);
    setDraftShopId(rule.shopId ?? selectedMerchant.shops[0]?.shopId ?? "");
    setDraftCategoryId(rule.categoryId);
    setDraftValueType(rule.valueType);
    setDraftValue(String(rule.value));
    setDraftEffectiveDate(getEffectiveDate(rule) === "-" ? todayInputValue() : getEffectiveDate(rule));
    setDraftStatus(rule.status);
    setDraftNote(getRuleNote(rule) === "-" ? "" : getRuleNote(rule));
  }

  function openProductRuleForEdit(rule: ProductRule | LocalProductRule) {
    setDrawerType("product");
    setOpenRuleActionMenu("");
    setDraftScope(rule.scope);
    setDraftShopId(rule.shopId ?? selectedMerchant.shops[0]?.shopId ?? "");
    setDraftCategoryId(rule.categoryId);
    setDraftProductId(rule.productId);
    setDraftProductSearch("");
    setDraftValueType(rule.valueType);
    setDraftValue(String(rule.value));
    setDraftEffectiveDate(getEffectiveDate(rule) === "-" ? todayInputValue() : getEffectiveDate(rule));
    setDraftStatus(rule.status);
    setDraftNote(getRuleNote(rule) === "-" ? "" : getRuleNote(rule));
  }

  function duplicateCategoryRuleAsDraft(rule: DisplayRule) {
    if (!("categoryName" in rule)) return;

    setLocalCategoryRules((rules) => [
      ...rules,
      {
        ...rule,
        id: `draft-cat-${Date.now()}`,
        merchantId: selectedMerchant.merchantId,
        status: "inactive",
        effectiveDate: todayInputValue(),
        note: `Draft duplicate from ${rule.categoryName}`
      }
    ]);
    setOpenRuleActionMenu("");
    setRuleSaveStatus(`Success: Draft category rule duplicated for ${rule.categoryName}.`);
  }

  function duplicateProductRuleAsDraft(rule: ProductRule | LocalProductRule) {
    setLocalProductRules((rules) => [
      ...rules,
      {
        ...rule,
        id: `draft-prod-${Date.now()}`,
        merchantId: selectedMerchant.merchantId,
        status: "inactive",
        effectiveDate: todayInputValue(),
        note: `Draft duplicate from ${rule.productName}`
      }
    ]);
    setOpenRuleActionMenu("");
    setRuleSaveStatus(`Success: Draft product rule duplicated for ${rule.productName}.`);
  }

  function applyProductRuleSuggestion(suggestion = productRuleSuggestion) {
    setDraftValueType(suggestion.valueType);
    setDraftValue(suggestion.value);
  }

  function selectDraftProduct(product: (typeof productOptions)[number]) {
    setDraftProductId(product.id);
    setDraftCategoryId(product.categoryId);
    setDraftProductSearch("");

    const nextSuggestion = getProductRuleSuggestion(product.id, product.categoryId);
    setDraftValueType(nextSuggestion.valueType);
    setDraftValue(nextSuggestion.value);
  }

  function openMerchantCreatePage() {
    setDrawerType(null);
    setIsManagingStores(false);
    setIsAddingTier(false);
    setIsCreatingMerchant(true);
    setNewMerchantName("New Merchant");
    setNewMerchantCode(`MCP${String(displayMerchants.length + 1).padStart(5, "0")}`);
    setNewTotalShops("1");
    setNewDefaultType("percentage");
    setNewDefaultValue("15");
    setNewTierOneSales("10000");
    setNewTierOneRate("20");
    setNewTierTwoSales("20000");
    setNewTierTwoRate("25");
    setNewTierThreeSales("30000");
    setNewTierThreeRate("30");
    setNewMerchantStatus("active");
  }

  function closeMerchantCreatePage() {
    setIsCreatingMerchant(false);
  }

  function openManageStorePage() {
    setDrawerType(null);
    setIsCreatingMerchant(false);
    setManagedShopId(selectedMerchant.shops[0]?.shopId ?? "");
    setIsManagingStores(true);
  }

  function closeManageStorePage() {
    setIsManagingStores(false);
    openJourneyTab("shops");
  }

  function openAddTierPage() {
    const nextTierNumber = currentTierRules.length + 1;
    const lastThreshold = currentTierRules[currentTierRules.length - 1]?.monthlySalesFrom ?? 30000;

    setDrawerType(null);
    setIsCreatingMerchant(false);
    setIsManagingStores(false);
    setIsAddingTier(true);
    setDraftTierName(`Tier ${nextTierNumber}`);
    setDraftTierSalesFrom(String(lastThreshold + 10000));
    setDraftTierRate("35");
    setDraftTierEffectiveDate(todayInputValue());
    setDraftTierStatus("active");
    setDraftTierNote("");
  }

  function closeAddTierPage() {
    setIsAddingTier(false);
    openJourneyTab("main");
  }

  function addInlineTierRule() {
    const nextTierNumber = currentTierRules.length + 1;
    const lastThreshold = currentTierRules[currentTierRules.length - 1]?.monthlySalesFrom ?? 30000;
    const id = `inline-tier-${Date.now()}`;
    const tier = {
      merchantId: selectedMerchant.merchantId,
      id,
      name: `Tier ${nextTierNumber}`,
      monthlySalesFrom: lastThreshold + 10000,
      valueType: "percentage",
      value: 35,
      status: "active",
      effectiveDate: todayInputValue(),
      note: "Added inline"
    };

    setLocalTierRules((rules) => [...rules, tier]);
    setTierEdits((edits) => ({ ...edits, [id]: tier }));
    setEditingTierIds((ids) => [...ids, id]);
  }

  function updateInlineTierRule(id: string, patch: Partial<LocalTierRule>) {
    setTierEdits((edits) => ({
      ...edits,
      [id]: {
        ...edits[id],
        ...patch
      }
    }));
  }

  function toggleInlineTierEdit(tier: LocalTierRule) {
    if (editingTierIds.includes(tier.id)) {
      setEditingTierIds((ids) => ids.filter((id) => id !== tier.id));
      return;
    }

    setTierEdits((edits) => ({
      ...edits,
      [tier.id]: edits[tier.id] ?? {
        name: tier.name,
        monthlySalesFrom: tier.monthlySalesFrom,
        value: tier.value,
        status: tier.status
      }
    }));
    setEditingTierIds((ids) => [...ids, tier.id]);
  }

  function deleteInlineTierRule(id: string) {
    setDeletedTierIds((ids) => [...ids, id]);
    setEditingTierIds((ids) => ids.filter((tierId) => tierId !== id));
  }

  function saveTierRule() {
    setLocalTierRules((rules) => [
      ...rules,
      {
        merchantId: selectedMerchant.merchantId,
        id: `local-tier-${Date.now()}`,
        name: draftTierName,
        monthlySalesFrom: Number(draftTierSalesFrom) || 0,
        valueType: "percentage",
        value: Number(draftTierRate) || 0,
        status: draftTierStatus,
        effectiveDate: draftTierEffectiveDate,
        note: draftTierNote
      }
    ]);
    closeAddTierPage();
  }

  function saveMerchantCommission() {
    const merchantId = `local-merchant-${Date.now()}`;
    const shopId = `${merchantId}-shop-1`;
    const createdMerchant: MerchantCommission = {
      merchantId,
      merchantCode: newMerchantCode,
      merchantName: newMerchantName,
      totalShops: Number(newTotalShops) || 1,
      defaultValueType: newDefaultType,
      defaultValue: Number(newDefaultValue) || 0,
      tiers: [
        {
          id: `${merchantId}-tier-1`,
          name: "Tier 1",
          monthlySalesFrom: Number(newTierOneSales) || 0,
          valueType: "percentage",
          value: Number(newTierOneRate) || 0,
          status: "active"
        },
        {
          id: `${merchantId}-tier-2`,
          name: "Tier 2",
          monthlySalesFrom: Number(newTierTwoSales) || 0,
          valueType: "percentage",
          value: Number(newTierTwoRate) || 0,
          status: "active"
        },
        {
          id: `${merchantId}-tier-3`,
          name: "Tier 3",
          monthlySalesFrom: Number(newTierThreeSales) || 0,
          valueType: "percentage",
          value: Number(newTierThreeRate) || 0,
          status: "active"
        }
      ],
      shops: [
        {
          shopId,
          shopName: `${newMerchantName} Main Store`,
          useMerchantRule: true,
          defaultValueType: newDefaultType,
          defaultValue: Number(newDefaultValue) || 0,
          tiers: [],
          status: "active"
        }
      ],
      categoryRules: [],
      productRules: [],
      status: newMerchantStatus,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " ")
    };

    setLocalMerchants((items) => [...items, createdMerchant]);
    setSelectedMerchantId(merchantId);
    setSelectedShopId(shopId);
    setDefaultCommissionType(createdMerchant.defaultValueType);
    openJourneyTab("main");
    setIsCreatingMerchant(false);
  }

  function saveRule() {
    const shopId = draftScope === "shop" ? draftShopId : undefined;
    const category = categoryOptions.find((item) => item.id === draftCategoryId) ?? categoryOptions[0];
    const numericValue = Number(draftValue) || 0;
    let savedRuleLabel = category.name;
    let savedRuleTab: Tab = "categories";

    if (drawerType === "category") {
      setLocalCategoryRules((rules) => [
        ...rules,
        {
          id: `local-cat-${Date.now()}`,
          merchantId: selectedMerchant.merchantId,
          scope: draftScope,
          shopId,
          categoryId: category.id,
          categoryName: category.name,
          valueType: draftValueType,
          value: numericValue,
          effectiveDate: draftEffectiveDate,
          status: draftStatus,
          note: draftNote
        }
      ]);
      savedRuleLabel = category.name;
      savedRuleTab = "categories";
    }

    if (drawerType === "product") {
      const product = productOptions.find((item) => item.id === draftProductId) ?? productOptions[0];
      const productCategory =
        categoryOptions.find((item) => item.id === product.categoryId) ?? categoryOptions[0];

      setLocalProductRules((rules) => [
        ...rules,
        {
          id: `local-prod-${Date.now()}`,
          merchantId: selectedMerchant.merchantId,
          scope: draftScope,
          shopId,
          productId: product.id,
          productName: product.name,
          categoryId: draftCategoryId || productCategory.id,
          valueType: draftValueType,
          value: numericValue,
          effectiveDate: draftEffectiveDate,
          status: draftStatus,
          note: draftNote
        }
      ]);
      savedRuleLabel = product.name;
      savedRuleTab = "products";
    }

    setRuleSaveStatus(
      `Success: ${drawerType === "product" ? "Product" : "Category"} rule saved for ${savedRuleLabel} at ${formatCommissionValue(draftValueType, numericValue)}.`
    );
    openJourneyTab(savedRuleTab);
    closeRuleDrawer();
  }

  function refreshPreview(nextShopId = selectedShopId, nextMonthlySales = monthlySales) {
    setIsPreviewLoading(true);
    setPreview(calculateCommissionPreview(selectedMerchant, nextShopId, nextMonthlySales, sampleOrderItems));
    setIsPreviewLoading(false);
  }

  function selectMerchant(merchantId: string) {
    const merchant = displayMerchants.find((item) => item.merchantId === merchantId);
    if (!merchant) return;

    const firstShopId = merchant.shops[0]?.shopId ?? "";
    setSelectedMerchantId(merchantId);
    setSelectedShopId(firstShopId);
    setDefaultCommissionType(merchant.defaultValueType);
    openJourneyTab("main");
    setIsCreatingMerchant(false);
    setIsManagingStores(false);
    setIsAddingTier(false);
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brandMark">
          <div className="brandIcon">RA</div>
          <div>
            <strong>RED ANT</strong>
            <span>express</span>
          </div>
        </div>
        <nav className="navMenu" aria-label="Main menu">
          {[
            "Dashboard",
            "Monitoring",
            "Merchant",
            "Driver",
            "Order List",
            "Warehouse",
            "Promotion",
            "Commission",
            "Wallets",
            "Adjustment",
            "Setting"
          ].map((item) => (
            <button className={item === "Commission" ? "navItem active" : "navItem"} key={item}>
              <span>{item.slice(0, 2).toUpperCase()}</span>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Finance, Wallets & Adjustment / Commission</p>
            <h1>Merchant Commission</h1>
          </div>
          <div className="profile">
            <span className="notification">1</span>
            <div className="avatar">SP</div>
            <div>
              <strong>San Phanith</strong>
              <span>Operation Manager</span>
            </div>
          </div>
        </header>

        <nav className="storeProfileTabs merchantCommissionTabs" aria-label="Merchant profile tabs">
          <button
            aria-label="Back to store profile"
            className="storeProfileBack"
            onClick={onOpenStoreProfile}
            type="button"
          >
            <span />
          </button>
          {merchantProfileTabs.map((tab) => (
            <button
              aria-selected={tab === "Commission"}
              className={tab === "Commission" ? "active" : ""}
              key={tab}
              onClick={tab === "Profile" ? onOpenStoreProfile : undefined}
              type="button"
            >
              {tab === "Profile" && <span className="storeTabIcon" aria-hidden="true" />}
              {tab}
            </button>
          ))}
          <button aria-label="Open wallet action" className="storeProfileUtility" type="button">
            <span />
          </button>
        </nav>

        {isCreatingMerchant ? (
          <section className="storeProfilePage">
            <div className="storeProfileToolbar">
              <div>
                <p className="breadcrumb">Merchant Commission / Add New</p>
                <h2>Add Merchant Commission</h2>
                <p>Create merchant main profile, default commission, monthly tiers, and first store setup.</p>
              </div>
              <div className="rulePageActions">
                <button className="secondaryButton" type="button" onClick={closeMerchantCreatePage}>Cancel</button>
                <button className="primaryButton" type="button" onClick={saveMerchantCommission}>Save Merchant</button>
              </div>
            </div>

            <section className="merchantHeroCard">
              <div className="merchantHeroBanner">
                <div className="merchantLogoPreview">
                  {newMerchantName.slice(0, 2).toUpperCase() || "NM"}
                </div>
                <div className="merchantHeroText">
                  <span>Merchant Main Profile</span>
                  <strong>{newMerchantName || "New Merchant"}</strong>
                  <p>{newTotalShops || "0"} stores will inherit this commission setup</p>
                </div>
              </div>
              <div className="merchantHeroStats">
                <div>
                  <span>Default Commission</span>
                  <strong>{formatCommissionValue(newDefaultType, Number(newDefaultValue) || 0)}</strong>
                </div>
                <div>
                  <span>Monthly Tier</span>
                  <strong>3 tiers enabled</strong>
                </div>
                <div>
                  <span>Store Rule</span>
                  <strong>Use main rule</strong>
                </div>
              </div>
            </section>

            <section className="commissionPromptCard" aria-label="Suggest merchant commission prompt">
              <div>
                <span className="eyebrow">Commission Prompt</span>
                <h2>Suggest Merchant Commission</h2>
                <p>
                  Review the merchant profile before saving and choose the best commission structure for this account.
                </p>
              </div>
              <div className="commissionPromptOptions">
                <span>Percentage</span>
                <span>Tier Commission</span>
                <span>By Products</span>
                <span>By Category</span>
                <span>Amount / E-commerce</span>
              </div>
            </section>

            <CaptureBrief
              title="Designer Work Split"
              description="This page captures the merchant main rule first, then prepares inherited setup for all stores under the merchant."
              items={[
                "Merchant profile and store count",
                "Default commission fallback",
                "Monthly tier thresholds",
                "First store inheritance setup",
                "Save-ready merchant summary"
              ]}
            />

            <div className="storeProfileGrid">
              <section className="storeProfileCard">
                <div className="sectionLabel">
                  <span>01</span>
                  <strong>Merchant Main</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Merchant Name</span>
                    <input value={newMerchantName} onChange={(event) => setNewMerchantName(event.target.value)} />
                  </label>
                  <label className="fieldBlock">
                    <span>Merchant ID</span>
                    <input value={newMerchantCode} onChange={(event) => setNewMerchantCode(event.target.value)} />
                  </label>
                  <label className="fieldBlock">
                    <span>Total Stores</span>
                    <input value={newTotalShops} onChange={(event) => setNewTotalShops(event.target.value)} />
                  </label>
                  <label className="fieldBlock">
                    <span>Status</span>
                    <select
                      value={newMerchantStatus}
                      onChange={(event) => setNewMerchantStatus(event.target.value as CommissionStatus)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="storeProfileCard">
                <div className="sectionLabel">
                  <span>02</span>
                  <strong>Default Commission</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Commission Type</span>
                    <select
                      value={newDefaultType}
                      onChange={(event) => setNewDefaultType(event.target.value as DefaultCommissionValueType)}
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                    </select>
                  </label>
                  <label className="fieldBlock">
                    <span>Commission Value</span>
                    {newDefaultType === "percentage" && (
                      <div className="inputAddon">
                        <input value={newDefaultValue} onChange={(event) => setNewDefaultValue(event.target.value)} />
                        <span>%</span>
                      </div>
                    )}
                    {newDefaultType === "fixed_amount" && (
                      <div className="moneyInput">
                        <span>$</span>
                        <input value={newDefaultValue} onChange={(event) => setNewDefaultValue(event.target.value)} />
                      </div>
                    )}
                  </label>
                </div>
                <div className="rulePreviewStrip">
                  <span>Default preview</span>
                  <strong>{formatCommissionValue(newDefaultType, Number(newDefaultValue) || 0)}</strong>
                </div>
              </section>

              <section className="storeProfileCard wideStoreCard">
                <div className="sectionLabel">
                  <span>03</span>
                  <strong>Monthly Tier Commission</strong>
                </div>
                <div className="tierControlHeader">
                  <div>
                    <strong>Enable monthly tier</strong>
                    <span>System uses the highest matched monthly sales tier.</span>
                  </div>
                  <button className="switch isOn" type="button" aria-pressed="true">
                    <span />
                  </button>
                </div>
                <div className="tierFormTable">
                  <div className="tierFormHead">
                    <span>Tier Name</span>
                    <span>Monthly Sales From</span>
                    <span>Commission</span>
                    <span>Status</span>
                  </div>
                  <div className="tierFormRow">
                    <input value="Tier 1" readOnly aria-label="Tier 1 name" />
                    <div className="moneyInput">
                      <span>$</span>
                      <input
                        value={newTierOneSales}
                        onChange={(event) => setNewTierOneSales(event.target.value)}
                        aria-label="Tier 1 monthly sales"
                      />
                    </div>
                    <div className="inputAddon">
                      <input
                        value={newTierOneRate}
                        onChange={(event) => setNewTierOneRate(event.target.value)}
                        aria-label="Tier 1 commission"
                      />
                      <span>%</span>
                    </div>
                    <StatusBadge status="active" />
                  </div>
                  <div className="tierFormRow">
                    <input value="Tier 2" readOnly aria-label="Tier 2 name" />
                    <div className="moneyInput">
                      <span>$</span>
                      <input
                        value={newTierTwoSales}
                        onChange={(event) => setNewTierTwoSales(event.target.value)}
                        aria-label="Tier 2 monthly sales"
                      />
                    </div>
                    <div className="inputAddon">
                      <input
                        value={newTierTwoRate}
                        onChange={(event) => setNewTierTwoRate(event.target.value)}
                        aria-label="Tier 2 commission"
                      />
                      <span>%</span>
                    </div>
                    <StatusBadge status="active" />
                  </div>
                  <div className="tierFormRow">
                    <input value="Tier 3" readOnly aria-label="Tier 3 name" />
                    <div className="moneyInput">
                      <span>$</span>
                      <input
                        value={newTierThreeSales}
                        onChange={(event) => setNewTierThreeSales(event.target.value)}
                        aria-label="Tier 3 monthly sales"
                      />
                    </div>
                    <div className="inputAddon">
                      <input
                        value={newTierThreeRate}
                        onChange={(event) => setNewTierThreeRate(event.target.value)}
                        aria-label="Tier 3 commission"
                      />
                      <span>%</span>
                    </div>
                    <StatusBadge status="active" />
                  </div>
                </div>
              </section>

              <section className="storeProfileCard">
                <div className="sectionLabel">
                  <span>04</span>
                  <strong>Store Setup</strong>
                </div>
                <div className="tierControlHeader">
                  <div>
                    <strong>Use Merchant Main Commission</strong>
                    <span>All new stores inherit the main merchant commission unless a store override is added later.</span>
                  </div>
                  <button className="switch isOn" type="button" aria-pressed="true">
                    <span />
                  </button>
                </div>
                <div className="rulePreviewStrip">
                  <span>First store name</span>
                  <strong>{newMerchantName || "New Merchant"} Main Store</strong>
                </div>
              </section>

              <aside className="storeProfileCard summaryStoreCard">
                <h3>Merchant Summary</h3>
                <div className="summaryList">
                  <div>
                    <span>Merchant</span>
                    <strong>{newMerchantName || "-"}</strong>
                  </div>
                  <div>
                    <span>Total Stores</span>
                    <strong>{newTotalShops || "0"} stores</strong>
                  </div>
                  <div>
                    <span>Default Commission</span>
                    <strong>{formatCommissionValue(newDefaultType, Number(newDefaultValue) || 0)}</strong>
                  </div>
                  <div>
                    <span>Tier 1</span>
                    <strong>{formatCurrency(Number(newTierOneSales) || 0)} / {newTierOneRate || 0}%</strong>
                  </div>
                  <div>
                    <span>Tier 2</span>
                    <strong>{formatCurrency(Number(newTierTwoSales) || 0)} / {newTierTwoRate || 0}%</strong>
                  </div>
                  <div>
                    <span>Tier 3</span>
                    <strong>{formatCurrency(Number(newTierThreeSales) || 0)} / {newTierThreeRate || 0}%</strong>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        ) : isAddingTier ? (
          <section className="rulePage">
            <div className="rulePageHeader">
              <div>
                <p className="breadcrumb">Merchant Commission / {selectedMerchant.merchantName} / Add Tier</p>
                <h2>Add Monthly Tier Commission</h2>
                <p>Create a monthly sales threshold and commission percentage for this merchant.</p>
              </div>
              <div className="rulePageActions">
                <button className="secondaryButton" type="button" onClick={closeAddTierPage}>Cancel</button>
                <button className="primaryButton" type="button" onClick={saveTierRule}>Save Tier</button>
              </div>
            </div>

            <CaptureBrief
              title="Tier Rule Capture"
              description="Tier commission is checked by monthly sales. The system applies the highest active matched tier."
              items={[
                "Tier name",
                "Monthly sales threshold",
                "Commission percentage",
                "Effective date and status",
                "Reason for audit history"
              ]}
            />

            <div className="rulePageGrid">
              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>01</span>
                  <strong>Tier Detail</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Tier Name</span>
                    <input value={draftTierName} onChange={(event) => setDraftTierName(event.target.value)} />
                  </label>
                  <label className="fieldBlock">
                    <span>Monthly Sales From</span>
                    <div className="moneyInput">
                      <span>$</span>
                      <input
                        value={draftTierSalesFrom}
                        onChange={(event) => setDraftTierSalesFrom(event.target.value)}
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>02</span>
                  <strong>Commission Detail</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Commission Type</span>
                    <select value="percentage" disabled>
                      <option value="percentage">Percentage</option>
                    </select>
                  </label>
                  <label className="fieldBlock">
                    <span>Commission Value</span>
                    <div className="inputAddon">
                      <input value={draftTierRate} onChange={(event) => setDraftTierRate(event.target.value)} />
                      <span>%</span>
                    </div>
                  </label>
                </div>
              </section>

              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>03</span>
                  <strong>Activation</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Effective Date</span>
                    <input
                      type="date"
                      value={draftTierEffectiveDate}
                      onChange={(event) => setDraftTierEffectiveDate(event.target.value)}
                    />
                  </label>
                  <label className="fieldBlock">
                    <span>Status</span>
                    <select
                      value={draftTierStatus}
                      onChange={(event) => setDraftTierStatus(event.target.value as CommissionStatus)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
                <label className="fieldBlock noteField">
                  <span>Note / Reason</span>
                  <textarea
                    value={draftTierNote}
                    onChange={(event) => setDraftTierNote(event.target.value)}
                    placeholder="Optional reason for this tier rule"
                  />
                </label>
              </section>

              <aside className="ruleSummaryCard">
                <h3>Tier Summary</h3>
                <div className="summaryList">
                  <div>
                    <span>Merchant</span>
                    <strong>{selectedMerchant.merchantName}</strong>
                  </div>
                  <div>
                    <span>Tier</span>
                    <strong>{draftTierName || "-"}</strong>
                  </div>
                  <div>
                    <span>Monthly Sales From</span>
                    <strong>{formatCurrency(Number(draftTierSalesFrom) || 0)}</strong>
                  </div>
                  <div>
                    <span>Commission</span>
                    <strong>{draftTierRate || 0}%</strong>
                  </div>
                  <div>
                    <span>Effective Date</span>
                    <strong>{draftTierEffectiveDate}</strong>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        ) : isManagingStores ? (
          <section className="storeProfilePage">
            <div className="storeProfileToolbar">
              <div>
                <p className="breadcrumb">Merchant Commission / {selectedMerchant.merchantName} / Manage Store</p>
                <h2>Manage Store Commission</h2>
                <p>Review store inheritance, custom commission overrides, category rules, and product rules.</p>
              </div>
              <div className="rulePageActions">
                <button className="secondaryButton" type="button" onClick={closeManageStorePage}>Back</button>
                <button className="primaryButton" type="button" onClick={closeManageStorePage}>Save Store</button>
              </div>
            </div>

            <section className="merchantHeroCard">
              <div className="merchantHeroBanner storeHeroBanner">
                <div className="merchantLogoPreview">
                  {managedStore?.shopName.slice(0, 2).toUpperCase() ?? "ST"}
                </div>
                <div className="merchantHeroText">
                  <span>Store Commission Profile</span>
                  <strong>{managedStore?.shopName ?? "Store"}</strong>
                  <p>{selectedMerchant.merchantName} / {managedStore?.useMerchantRule ? "Using merchant main rule" : "Custom store rule"}</p>
                </div>
              </div>
              <div className="merchantHeroStats">
                <div>
                  <span>Commission Source</span>
                  <strong>{managedStore?.useMerchantRule ? "Merchant Main" : "Store Override"}</strong>
                </div>
                <div>
                  <span>Default Commission</span>
                  <strong>
                    {managedStore?.useMerchantRule
                      ? formatCommissionValue(selectedMerchant.defaultValueType, selectedMerchant.defaultValue)
                      : formatCommissionValue(managedStore?.defaultValueType ?? "percentage", managedStore?.defaultValue ?? 0)}
                  </strong>
                </div>
                <div>
                  <span>Custom Rules</span>
                  <strong>{managedShopCategoryRules.length + managedShopProductRules.length} rules</strong>
                </div>
              </div>
            </section>

            <CaptureBrief
              title="Store Commission Capture"
              description="Each store can inherit merchant main commission or use a custom store override when its contract is different."
              items={[
                "Store selection",
                "Merchant rule inheritance",
                "Store default commission",
                "Store monthly tiers",
                "Category and product overrides"
              ]}
            />

            <div className="storeProfileGrid">
              <section className="storeProfileCard">
                <div className="sectionLabel">
                  <span>01</span>
                  <strong>Store List</strong>
                </div>
                <div className="shopSelectorList">
                  {selectedMerchant.shops.map((shop) => (
                    <button
                      className={shop.shopId === managedStore?.shopId ? "shopSelectorItem active" : "shopSelectorItem"}
                      key={shop.shopId}
                      type="button"
                      onClick={() => setManagedShopId(shop.shopId)}
                    >
                      <span>{shop.shopName}</span>
                      <strong>{shop.useMerchantRule ? "Main Rule" : "Custom Rule"}</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="storeProfileCard">
                <div className="sectionLabel">
                  <span>02</span>
                  <strong>Store Commission Setting</strong>
                </div>
                <div className="tierControlHeader">
                  <div>
                    <strong>Use Merchant Main Commission</strong>
                    <span>Turn off only when this store needs a special commission setup.</span>
                  </div>
                  <button className={managedStore?.useMerchantRule ? "switch isOn" : "switch"} type="button" aria-pressed={managedStore?.useMerchantRule}>
                    <span />
                  </button>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Commission Type</span>
                    <select defaultValue={managedCommissionType}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                    </select>
                  </label>
                  <label className="fieldBlock">
                    <span>Commission Value</span>
                    {managedCommissionType === "fixed_amount" ? (
                      <div className="moneyInput">
                        <span>$</span>
                        <input defaultValue={managedCommissionValue} />
                      </div>
                    ) : (
                      <div className="inputAddon">
                        <input defaultValue={managedCommissionValue} />
                        <span>%</span>
                      </div>
                    )}
                  </label>
                </div>
              </section>

              <section className="storeProfileCard wideStoreCard">
                <div className="sectionLabel">
                  <span>03</span>
                  <strong>Monthly Tier Commission</strong>
                </div>
                <div className="tierFormTable">
                  <div className="tierFormHead">
                    <span>Tier Name</span>
                    <span>Monthly Sales From</span>
                    <span>Commission</span>
                    <span>Status</span>
                  </div>
                  {(managedStore?.useMerchantRule ? selectedMerchant.tiers : managedStore?.tiers ?? []).map((tier) => (
                    <div className="tierFormRow" key={tier.id}>
                      <input defaultValue={tier.name} aria-label={`${tier.name} store tier name`} />
                      <div className="moneyInput">
                        <span>$</span>
                        <input defaultValue={number.format(tier.monthlySalesFrom)} aria-label={`${tier.name} store monthly sales`} />
                      </div>
                      <div className="inputAddon">
                        <input defaultValue={tier.value} aria-label={`${tier.name} store commission`} />
                        <span>%</span>
                      </div>
                      <StatusBadge status={tier.status} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="storeProfileCard">
                <div className="sectionLabel">
                  <span>04</span>
                  <strong>Category Overrides</strong>
                </div>
                <div className="summaryList compactSummary">
                  {managedShopCategoryRules.length ? managedShopCategoryRules.map((rule) => (
                    <div key={rule.id}>
                      <span>{rule.categoryName}</span>
                      <strong>{formatCommissionValue(rule.valueType, rule.value)}</strong>
                    </div>
                  )) : (
                    <div>
                      <span>No custom category rule</span>
                      <strong>Using merchant main rules</strong>
                    </div>
                  )}
                </div>
              </section>

              <section className="storeProfileCard">
                <div className="sectionLabel">
                  <span>05</span>
                  <strong>Product Overrides</strong>
                </div>
                <div className="summaryList compactSummary">
                  {managedShopProductRules.length ? managedShopProductRules.map((rule) => (
                    <div key={rule.id}>
                      <span>{rule.productName}</span>
                      <strong>{formatCommissionValue(rule.valueType, rule.value)}</strong>
                    </div>
                  )) : (
                    <div>
                      <span>No custom product rule</span>
                      <strong>Using category/default rules</strong>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        ) : drawerType ? (
          <section className="rulePage">
            <div className="rulePageHeader">
              <div>
                <p className="breadcrumb">Merchant Commission / {selectedMerchant.merchantName}</p>
                <h2>{drawerType === "category" ? "Add Category Rule" : "Add Product Rule"}</h2>
                <p>
                  Create a full commission rule with scope, target, commission value, activation, and reason.
                </p>
              </div>
              <div className="rulePageActions">
                <button className="secondaryButton" type="button" onClick={closeRuleDrawer}>Cancel</button>
                <button className="primaryButton" type="button" onClick={saveRule}>Save Rule</button>
              </div>
            </div>

            <div className="rulePageGrid">
              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>01</span>
                  <strong>{drawerType === "category" ? "Category Detail" : "Product Detail"}</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Category</span>
                    <select
                      value={draftCategoryId}
                      onChange={(event) => {
                        const nextCategoryId = event.target.value;
                        const nextProduct = productOptions.find((product) => product.categoryId === nextCategoryId);
                        setDraftCategoryId(nextCategoryId);
                        setDraftProductSearch("");

                        if (nextProduct) {
                          selectDraftProduct(nextProduct);
                        }
                      }}
                    >
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                  {drawerType === "product" && (
                    <label className="fieldBlock">
                      <span>Product</span>
                      <div className="productPicker">
                        <div className="selectedProductBox">
                          <div>
                            <span>Selected Product</span>
                            <strong>{selectedDraftProduct?.name ?? "No product selected"}</strong>
                          </div>
                          <em>{productsForCategory.length} products</em>
                        </div>
                        <input
                          aria-label="Search product"
                          placeholder="Search product name..."
                          value={draftProductSearch}
                          onChange={(event) => setDraftProductSearch(event.target.value)}
                        />
                        <div className="productResultList">
                          {filteredProductOptions.length ? filteredProductOptions.map((product) => (
                            <button
                              className={product.id === draftProductId ? "productResultItem active" : "productResultItem"}
                              key={product.id}
                              type="button"
                              onClick={() => selectDraftProduct(product)}
                            >
                              <span>{product.name}</span>
                              <strong>
                                {formatCommissionType(getProductRuleSuggestion(product.id, product.categoryId).valueType)}
                              </strong>
                            </button>
                          )) : (
                            <div className="productEmptyState">No matching product in this category.</div>
                          )}
                        </div>
                      </div>
                    </label>
                  )}
                </div>
                {drawerType === "product" && (
                  <div className="ruleSuggestionPanel">
                    <div className="ruleSuggestionHeader">
                      <div>
                        <span>Suggested Commission</span>
                        <strong>All usable options for {selectedDraftProduct?.name}</strong>
                        <p>Choose the method that matches the merchant contract. Invalid methods, such as kg pricing for phones, are hidden.</p>
                      </div>
                      <em>{productRuleSuggestions.length} options</em>
                    </div>
                    <div className="suggestionOptionGrid">
                      {productRuleSuggestions.map((suggestion) => (
                        <article
                          className={suggestion.tone === "recommended" ? "suggestionOption recommended" : "suggestionOption"}
                          key={`${suggestion.valueType}-${suggestion.value}-${suggestion.title}`}
                        >
                          <span>{suggestion.title}</span>
                          <strong>{formatCommissionType(suggestion.valueType)} / {suggestion.label}</strong>
                          <p>{suggestion.reason}</p>
                          <small>{suggestion.detail}</small>
                          <button
                            className={suggestion.tone === "recommended" ? "primaryButton" : "secondaryButton"}
                            type="button"
                            onClick={() => applyProductRuleSuggestion(suggestion)}
                          >
                            Use This
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>02</span>
                  <strong>Commission Detail</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Commission Type</span>
                    <select
                      value={draftValueType}
                      onChange={(event) => setDraftValueType(event.target.value as CommissionValueType)}
                    >
                      {commissionTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="fieldBlock">
                    <span>Commission Value</span>
                    {draftValueType === "percentage" && (
                      <div className="inputAddon">
                        <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
                        <span>%</span>
                      </div>
                    )}
                    {draftValueType === "fixed_amount" && (
                      <div className="moneyInput">
                        <span>$</span>
                        <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
                      </div>
                    )}
                    {draftValueType === "amount_per_kg" && (
                      <div className="kgInput">
                        <span>$</span>
                        <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
                        <span>/ kg</span>
                      </div>
                    )}
                  </label>
                </div>
              </section>

              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>03</span>
                  <strong>Activation</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Effective Date</span>
                    <input
                      type="date"
                      value={draftEffectiveDate}
                      onChange={(event) => setDraftEffectiveDate(event.target.value)}
                    />
                  </label>
                  <label className="fieldBlock">
                    <span>Status</span>
                    <select
                      value={draftStatus}
                      onChange={(event) => setDraftStatus(event.target.value as CommissionStatus)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
                <label className="fieldBlock noteField">
                  <span>Note / Reason</span>
                  <textarea
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder="Optional reason for this commission rule"
                  />
                </label>
              </section>

              <aside className="ruleSummaryCard">
                <h3>Rule Summary</h3>
                <div className="summaryList">
                  <div>
                    <span>Merchant</span>
                    <strong>{selectedMerchant.merchantName}</strong>
                  </div>
                  <div>
                    <span>Commission</span>
                    <strong>{formatCommissionValue(draftValueType, Number(draftValue) || 0)}</strong>
                  </div>
                  <div>
                    <span>Effective Date</span>
                    <strong>{draftEffectiveDate}</strong>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        ) : (
          <>
        <section className="toolbar" aria-label="Merchant commission toolbar">
          <button className="primaryButton" type="button" onClick={openMerchantCreatePage}>+ Add New</button>
          <div className="toolbarRight">
            <input aria-label="Search merchant" placeholder="Search merchant/store..." />
            <select aria-label="Commission status" defaultValue="all">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ActionButton>Filter</ActionButton>
            <ActionButton>Refresh</ActionButton>
            <ActionButton>Export</ActionButton>
          </div>
        </section>

        <section className="tablePanel">
          <div className="panelHeader">
            <div>
              <h2>Merchant Commission List</h2>
              <p>Showing 1 to {displayMerchants.length} of {displayMerchants.length} entries</p>
            </div>
            <div className="pager">
              <button type="button">Previous</button>
              <button className="current" type="button">1</button>
              <button type="button">Next</button>
            </div>
          </div>
          <div className="tableScroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Merchant Main</th>
                  <th>Total Stores</th>
                  <th>Default Commission</th>
                  <th>Monthly Tier</th>
                  <th>Store Override</th>
                  <th>Category Rules</th>
                  <th>Product Rules</th>
                  <th>Status</th>
                  <th>Updated Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayMerchants.map((merchant, index) => (
                  <tr
                    className={merchant.merchantId === selectedMerchant.merchantId ? "selectedRow" : ""}
                    key={merchant.merchantId}
                  >
                    <td>{index + 1}</td>
                    <td>
                      <strong>{merchant.merchantName}</strong>
                      <span className="mutedText">{merchant.merchantCode}</span>
                    </td>
                    <td>{merchant.totalShops} stores</td>
                    <td>{formatCommissionValue(merchant.defaultValueType, merchant.defaultValue)}</td>
                    <td>{merchant.tiers.length} tiers</td>
                    <td>{merchant.shops.filter((shop) => !shop.useMerchantRule).length} stores</td>
                    <td>{formatRuleCount(merchant.categoryRules.length)}</td>
                    <td>{formatRuleCount(merchant.productRules.length)}</td>
                    <td><StatusBadge status={merchant.status} /></td>
                    <td>{merchant.updatedAt}</td>
                    <td>
                      <button className="linkButton" type="button" onClick={() => selectMerchant(merchant.merchantId)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="editGrid">
          <div className="merchantSummary">
            <div>
              <p className="eyebrow">Merchant Main</p>
              <h2>{selectedMerchant.merchantName}</h2>
              <p>{selectedMerchant.totalShops} stores under this merchant</p>
            </div>
            <StatusBadge status={selectedMerchant.status} />
          </div>

          <div className="tabs" role="tablist" aria-label="Commission editor tabs">
            {commissionJourneyTabs.map(({ id, label }) => (
              <button
                aria-selected={activeTab === id}
                className={activeTab === id ? "tab active" : "tab"}
                key={id}
                onClick={() => openJourneyTab(id)}
                role="tab"
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {ruleSaveStatus && (
            <div className="successNotice" role="status">
              <strong>Success</strong>
              <span>{ruleSaveStatus.replace(/^Success: /, "")}</span>
            </div>
          )}

          {activeTab === "main" && (
            <div className="mainCommissionLayout">
              <section className="commissionRateCard merchantCommissionRateCard" aria-label="Merchant commission rate settings">
                <div className="designerCardHeader">
                  <div>
                    <h3>Commission Rate</h3>
                    <p>Merchant-level commission structure.</p>
                  </div>
                  <span className={commissionDesignerWarnings.length ? "pill warningPill" : "pill"}>
                    {commissionDesignerStatus}
                  </span>
                </div>

                <div className="commissionLogicSummary" aria-label="Commission logic summary">
                  <div>
                    <span>Current Period</span>
                    <strong>{activePeriodRate}%</strong>
                  </div>
                  <div>
                    <span>First Tier</span>
                    <strong>{firstTierText}</strong>
                  </div>
                  <div>
                    <span>Fallback</span>
                    <strong>{fixedCommissionRate}% fixed</strong>
                  </div>
                </div>

                <div className="commissionRateHeader">
                  <h3>Commission Period</h3>
                  <button
                    aria-label="Add commission period"
                    className="rateActionButton add"
                    onClick={addCommissionPeriod}
                    type="button"
                  >
                    +
                  </button>
                </div>
                <div className="commissionPeriodList">
                  {commissionPeriods.map((period, index) => (
                    <div className="commissionPeriodRow" key={period.id}>
                      <div className="periodDateControl">
                        <span className="periodLabel">Period {index + 1}</span>
                        <span className="calendarGlyph" aria-hidden="true" />
                        <input
                          aria-label={`Period ${index + 1} start date`}
                          onChange={(event) => updateCommissionPeriod(period.id, { startDate: event.target.value })}
                          onClick={(event) => event.currentTarget.showPicker?.()}
                          type="date"
                          value={toDateInputValue(period.startDate)}
                        />
                        <span className="periodRangeSeparator">-</span>
                        <input
                          aria-label={`Period ${index + 1} end date`}
                          onChange={(event) => updateCommissionPeriod(period.id, { endDate: event.target.value })}
                          onClick={(event) => event.currentTarget.showPicker?.()}
                          type="date"
                          value={toDateInputValue(period.endDate)}
                        />
                        <span className="selectChevron" aria-hidden="true" />
                      </div>
                      <div className="periodRateControl">
                        <input
                          aria-label={`Period ${index + 1} commission rate`}
                          onChange={(event) => updateCommissionPeriod(period.id, { rate: event.target.value })}
                          value={period.rate}
                        />
                        <span>%</span>
                      </div>
                      <button
                        aria-label={`Remove period ${index + 1}`}
                        className="rateActionButton remove"
                        onClick={() => removeCommissionPeriod(period.id)}
                        type="button"
                      >
                        -
                      </button>
                    </div>
                  ))}
                </div>
                {commissionPeriodWarnings.length > 0 && (
                  <div className="commissionWarningList" role="status">
                    {commissionPeriodWarnings.map((warning) => (
                      <span key={warning}>{warning}</span>
                    ))}
                  </div>
                )}

                <div className="tierCommissionGroup">
                  <div className="tierCommissionHeader">
                    <span>Tier Commission Rate</span>
                    <button
                      aria-label="Add commission tier"
                      className="rateActionButton add"
                      onClick={addCommissionRateTier}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <div className="tierCommissionList">
                    {commissionRateTiers.map((tier, index) => (
                      <div className="tierCommissionRow" key={tier.id}>
                        <span className="periodLabel">Tier {index + 1}</span>
                        <div className="tierAmountControl">
                          <span>$</span>
                          <input
                            aria-label={`Tier ${index + 1} amount from`}
                            onChange={(event) => updateCommissionRateTier(tier.id, { amountFrom: event.target.value })}
                            value={tier.amountFrom}
                          />
                        </div>
                        <div className="periodRateControl">
                          <input
                            aria-label={`Tier ${index + 1} commission rate`}
                            onChange={(event) => updateCommissionRateTier(tier.id, { rate: event.target.value })}
                            value={tier.rate}
                          />
                          <span>%</span>
                        </div>
                        <button
                          aria-label={`Remove tier ${index + 1}`}
                          className="rateActionButton remove"
                          onClick={() => removeCommissionRateTier(tier.id)}
                          type="button"
                        >
                          -
                        </button>
                      </div>
                    ))}
                  </div>
                  {commissionTierWarnings.length > 0 && (
                    <div className="commissionWarningList" role="status">
                      {commissionTierWarnings.map((warning) => (
                        <span key={warning}>{warning}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="fixedRateRow">
                  <span>Fixed Commission Rate</span>
                  <div className="periodRateControl">
                    <input
                      aria-label="Fixed commission rate"
                      onChange={(event) => setFixedCommissionRate(event.target.value)}
                      value={fixedCommissionRate}
                    />
                    <span>%</span>
                  </div>
                </div>
                <div className="commissionLogicNote">
                  <strong>How this applies</strong>
                  <span>Period rate applies by order date, tier rate applies by monthly sales, and fixed rate is the fallback.</span>
                </div>
              </section>

              <section className="designerCard">
                <div className="designerCardHeader">
                  <div>
                    <h3>Default Commission</h3>
                    <p>Base rule for this merchant when no special rule is matched.</p>
                  </div>
                  <span className="pill">Merchant Main</span>
                </div>

                <div className="designerSection">
                  <div className="sectionLabel">
                    <span>01</span>
                    <strong>Default Rule</strong>
                  </div>
                  <div className="designerFieldGrid">
                    <label className="fieldBlock">
                      <span>Commission Type</span>
                      <select
                        value={defaultCommissionType}
                        onChange={(event) => {
                          setDefaultCommissionType(event.target.value as DefaultCommissionValueType);
                        }}
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed_amount">Fixed Amount</option>
                      </select>
                    </label>
                    <label className="fieldBlock">
                      <span>Commission Value</span>
                      <div className={defaultCommissionType === "fixed_amount" ? "moneyInput" : "inputAddon"}>
                        {defaultCommissionType === "fixed_amount" && <span>$</span>}
                        <input defaultValue={selectedMerchant.defaultValue} />
                        {defaultCommissionType === "percentage" && <span>%</span>}
                      </div>
                    </label>
                  </div>
                  <div className="rulePreviewStrip">
                    <span>Current default</span>
                    <strong>{formatCommissionValue(defaultCommissionType, selectedMerchant.defaultValue)}</strong>
                  </div>
                </div>

                <div className="designerSection">
                  <div className="sectionLabel">
                    <span>02</span>
                    <strong>Monthly Tier Commission</strong>
                    <button className="secondaryButton compactButton" type="button" onClick={addInlineTierRule}>
                      + Add Tier
                    </button>
                  </div>
                  <div className="tierControlHeader">
                    <div>
                      <strong>Enable monthly tier</strong>
                      <span>System uses the highest matched monthly sales tier.</span>
                    </div>
                    <button className="switch isOn" type="button" aria-pressed="true">
                      <span />
                    </button>
                  </div>

                  <div className="tierFormTable">
                    <div className="tierFormHead tierFormHeadActions">
                      <span>Tier Name</span>
                      <span>Monthly Sales From</span>
                      <span>Commission</span>
                      <span>Status</span>
                      <span>Action</span>
                    </div>
                    {currentTierRules.map((tier) => {
                      const isEditingTier = editingTierIds.includes(tier.id);

                      return (
                      <div
                        className={isEditingTier ? "tierFormRow tierFormRowActionsEnabled editing" : "tierFormRow tierFormRowActionsEnabled"}
                        key={tier.id}
                      >
                        <input
                          aria-label={`${tier.name} name`}
                          disabled={!isEditingTier}
                          onChange={(event) => updateInlineTierRule(tier.id, { name: event.target.value })}
                          value={tier.name}
                        />
                        <div className="moneyInput">
                          <span>$</span>
                          <input
                            aria-label={`${tier.name} monthly sales`}
                            disabled={!isEditingTier}
                            onChange={(event) =>
                              updateInlineTierRule(tier.id, {
                                monthlySalesFrom: Number(event.target.value.replace(/,/g, "")) || 0
                              })
                            }
                            value={number.format(tier.monthlySalesFrom)}
                          />
                        </div>
                        <div className="inputAddon">
                          <input
                            aria-label={`${tier.name} commission`}
                            disabled={!isEditingTier}
                            onChange={(event) =>
                              updateInlineTierRule(tier.id, { value: Number(event.target.value) || 0 })
                            }
                            value={tier.value}
                          />
                          <span>%</span>
                        </div>
                        <StatusBadge status={tier.status} />
                        <div className="tierRowActions">
                          <button
                            className="tierActionButton"
                            type="button"
                            onClick={() => toggleInlineTierEdit(tier)}
                          >
                            {isEditingTier ? "Save" : "Edit"}
                          </button>
                          <button
                            className="tierDeleteButton"
                            type="button"
                            onClick={() => deleteInlineTierRule(tier.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <div className="tierActions">
                    <button className="secondaryButton" type="button" onClick={addInlineTierRule}>+ Add Tier</button>
                    <span>Example: Tier 1 / $10,000 / 20%</span>
                  </div>
                </div>
              </section>

              <section className="infoBox wide">
                <h3>Commission Priority</h3>
                <ol>
                  <li>Store Product Commission</li>
                  <li>Store Category Commission</li>
                  <li>Merchant Main Product Commission</li>
                  <li>Merchant Main Category Commission</li>
                  <li>Store Monthly Tier Commission</li>
                  <li>Store Default Commission</li>
                  <li>Merchant Main Monthly Tier Commission</li>
                  <li>Merchant Main Default Commission</li>
                </ol>
              </section>
            </div>
          )}

          {activeTab === "shops" && (
            <section className="tablePanel nested">
              <div className="panelHeader">
                <div>
                  <h2>Store Commission</h2>
                  <p>{customShopCount} custom store override</p>
                </div>
                <button className="secondaryButton" type="button" onClick={openManageStorePage}>Manage Store</button>
              </div>
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>Store Name</th>
                      <th>Source Rule</th>
                      <th>Default</th>
                      <th>Tier</th>
                      <th>Custom Rules</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMerchant.shops.map((shop) => {
                      const isSelectedPreviewStore = selectedShopId === shop.shopId;
                      const isExpandedStore = expandedShopId === shop.shopId;
                      const shopTierRules = shop.useMerchantRule ? currentTierRules : shop.tiers;
                      const shopCategoryRules = currentCategoryRules.filter(
                        (rule) => rule.scope === "shop" && rule.shopId === shop.shopId
                      );
                      const shopProductRules = currentProductRules.filter(
                        (rule) => rule.scope === "shop" && rule.shopId === shop.shopId
                      );
                      const shopDefaultType = shop.useMerchantRule ? selectedMerchant.defaultValueType : shop.defaultValueType;
                      const shopDefaultValue = shop.useMerchantRule ? selectedMerchant.defaultValue : shop.defaultValue;
                      const shopRuleCount = shopCategoryRules.length + shopProductRules.length;
                      const shopPreview = isSelectedPreviewStore ? preview : null;

                      return (
                      <Fragment key={shop.shopId}>
                      <tr
                        className={isExpandedStore ? "clickableRuleRow selectedRow" : "clickableRuleRow"}
                        key={shop.shopId}
                        onClick={() => {
                          setSelectedShopId(shop.shopId);
                          setExpandedShopId(isExpandedStore ? "" : shop.shopId);
                          void refreshPreview(shop.shopId);
                        }}
                      >
                        <td>{shop.shopName}</td>
                        <td>{shop.useMerchantRule ? "Merchant Main Rule" : "Custom Store Rule"}</td>
                        <td>
                          {shop.useMerchantRule
                            ? formatCommissionValue(selectedMerchant.defaultValueType, selectedMerchant.defaultValue)
                            : formatCommissionValue(shop.defaultValueType, shop.defaultValue)}
                        </td>
                        <td>{shop.useMerchantRule ? `${currentTierRules.length} tiers` : `${shop.tiers.length} tiers`}</td>
                        <td>
                          {currentCategoryRules.filter((rule) => rule.shopId === shop.shopId).length +
                            currentProductRules.filter((rule) => rule.shopId === shop.shopId).length}
                        </td>
                        <td><StatusBadge status={shop.status} /></td>
                        <td className="actionCell">
                          <button
                            aria-label={`Show detail for ${shop.shopName}`}
                            className={isExpandedStore ? "previewActionButton active" : "previewActionButton"}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedShopId(shop.shopId);
                              setExpandedShopId(isExpandedStore ? "" : shop.shopId);
                              void refreshPreview(shop.shopId);
                            }}
                          >
                            {isExpandedStore ? "Hide Detail" : "Detail"}
                          </button>
                        </td>
                      </tr>
                      {isExpandedStore && (
                        <tr className="shopDetailRow">
                          <td colSpan={7}>
                            <div className="shopDetailPanel">
                              <div className="shopDetailHeader">
                                <div>
                                  <span className="eyebrow">Store Detail</span>
                                  <h3>{shop.shopName}</h3>
                                  <p>{shop.useMerchantRule ? "Using merchant main commission rules" : "Using custom store commission rules"}</p>
                                </div>
                                <div className="shopDetailActions">
                                  <StatusBadge status={shop.status} />
                                  <button
                                    className="secondaryButton"
                                    type="button"
                                    onClick={() => {
                                      setSelectedShopId(shop.shopId);
                                      openJourneyTab("preview");
                                      void refreshPreview(shop.shopId);
                                    }}
                                  >
                                    Full Preview
                                  </button>
                                </div>
                              </div>

                              <div className="shopDetailStats">
                                <div>
                                  <span>Source Rule</span>
                                  <strong>{shop.useMerchantRule ? "Merchant Main Rule" : "Custom Store Rule"}</strong>
                                </div>
                                <div>
                                  <span>Default Commission</span>
                                  <strong>{formatCommissionValue(shopDefaultType, shopDefaultValue)}</strong>
                                </div>
                                <div>
                                  <span>Monthly Tier</span>
                                  <strong>{shopTierRules.length} tiers</strong>
                                </div>
                                <div>
                                  <span>Custom Rules</span>
                                  <strong>{formatRuleCount(shopRuleCount)}</strong>
                                </div>
                              </div>

                              <div className="shopDetailGrid">
                                <section>
                                  <h4>Monthly Tier Rules</h4>
                                  <div className="shopDetailList">
                                    {shopTierRules.length > 0 ? (
                                      shopTierRules.map((tier) => (
                                        <div key={tier.id}>
                                          <span>{tier.name}</span>
                                          <strong>{formatCurrency(tier.monthlySalesFrom)} from / {tier.value}%</strong>
                                        </div>
                                      ))
                                    ) : (
                                      <p>No monthly tier for this store.</p>
                                    )}
                                  </div>
                                </section>

                                <section>
                                  <h4>Custom Category & Product Rules</h4>
                                  <div className="shopDetailList">
                                    {[...shopCategoryRules, ...shopProductRules].length > 0 ? (
                                      [...shopCategoryRules, ...shopProductRules].map((rule) => (
                                        <div key={rule.id}>
                                          <span>{"categoryName" in rule ? rule.categoryName : rule.productName}</span>
                                          <strong>{formatCommissionValue(rule.valueType, rule.value)}</strong>
                                        </div>
                                      ))
                                    ) : (
                                      <p>No custom category or product rule.</p>
                                    )}
                                  </div>
                                </section>
                              </div>

                              {shopPreview && (
                                <div className="shopDetailPreview">
                                  <div>
                                    <span>Sample Order</span>
                                    <strong>{formatCurrency(shopPreview.orderTotal)}</strong>
                                  </div>
                                  <div>
                                    <span>Red Ant Commission</span>
                                    <strong>{formatCurrency(shopPreview.redAntCommission)}</strong>
                                  </div>
                                  <div>
                                    <span>Merchant Receive</span>
                                    <strong>{formatCurrency(shopPreview.merchantReceive)}</strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "categories" && (
            <section className="tablePanel nested">
              <div className="panelHeader">
                <div>
                  <h2>Category Rules</h2>
                  <p>Merchant main and store-level category commission</p>
                </div>
                <button className="secondaryButton" type="button" onClick={() => openRuleDrawer("category")}>
                  + Add Category Rule
                </button>
              </div>
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>Rule Scope</th>
                      <th>Store</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Effective Date</th>
                      <th>Status</th>
                      <th>Note</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCategoryRules.map((rule) => {
                      const ruleKey = `category-${rule.id}`;
                      const isExpandedRule = expandedRuleKey === ruleKey;
                      const ruleShopName = rule.scope === "merchant"
                        ? "All Stores"
                        : selectedMerchant.shops.find((shop) => shop.shopId === rule.shopId)?.shopName ?? "-";

                      return (
                      <Fragment key={rule.id}>
                      <tr
                        className={isExpandedRule ? "clickableRuleRow selectedRuleRow" : "clickableRuleRow"}
                        onClick={() => setExpandedRuleKey(isExpandedRule ? "" : ruleKey)}
                      >
                        <td>{rule.scope === "merchant" ? "Main Rule" : "Store Rule"}</td>
                        <td>{ruleShopName}</td>
                        <td>{rule.categoryName}</td>
                        <td>{formatCommissionType(rule.valueType)}</td>
                        <td>{formatCommissionValue(rule.valueType, rule.value)}</td>
                        <td>{getEffectiveDate(rule)}</td>
                        <td><StatusBadge status={rule.status} /></td>
                        <td>{getRuleNote(rule)}</td>
                        <td className="actionCell" onClick={(event) => event.stopPropagation()}>
                          <div className="ruleActionMenuWrap">
                            <button
                              aria-label={`Actions for ${rule.categoryName}`}
                              className="ruleActionIconButton"
                              type="button"
                              onClick={() => setOpenRuleActionMenu(openRuleActionMenu === ruleKey ? "" : ruleKey)}
                            >
                              <span className="actionChevron" aria-hidden="true" />
                            </button>
                            {openRuleActionMenu === ruleKey && (
                              <div className="ruleActionMenu">
                                <button type="button" onClick={() => openCategoryRuleForEdit(rule)}>
                                  <span className="menuIcon editIcon" aria-hidden="true" />
                                  Edit
                                </button>
                                <button type="button" onClick={() => duplicateCategoryRuleAsDraft(rule)}>
                                  <span className="menuIcon duplicateIcon" aria-hidden="true" />
                                  Duplicate as Draft
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpandedRule && (
                        <tr className="ruleDetailRow">
                          <td colSpan={9}>
                            <div className="ruleDetailPanel">
                              <div className="ruleDetailHeader">
                                <div>
                                  <span className="eyebrow">Category Rule Detail</span>
                                  <h3>{rule.categoryName}</h3>
                                  <p>{rule.scope === "merchant" ? "Applies to every store under this merchant." : `Applies only to ${ruleShopName}.`}</p>
                                </div>
                                <StatusBadge status={rule.status} />
                              </div>
                              <div className="ruleDetailStats">
                                <div>
                                  <span>Rule Scope</span>
                                  <strong>{rule.scope === "merchant" ? "Main Rule" : "Store Rule"}</strong>
                                </div>
                                <div>
                                  <span>Store</span>
                                  <strong>{ruleShopName}</strong>
                                </div>
                                <div>
                                  <span>Commission Type</span>
                                  <strong>{formatCommissionType(rule.valueType)}</strong>
                                </div>
                                <div>
                                  <span>Commission Value</span>
                                  <strong>{formatCommissionValue(rule.valueType, rule.value)}</strong>
                                </div>
                              </div>
                              <div className="ruleDetailMeta">
                                <div>
                                  <span>Effective Date</span>
                                  <strong>{getEffectiveDate(rule)}</strong>
                                </div>
                                <div>
                                  <span>Note</span>
                                  <strong>{getRuleNote(rule)}</strong>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "products" && (
            <section className="tablePanel nested">
              <div className="panelHeader">
                <div>
                  <h2>Product Rules</h2>
                  <p>Use product rules only for special products</p>
                </div>
                <button className="secondaryButton" type="button" onClick={() => openRuleDrawer("product")}>
                  + Add Product Rule
                </button>
              </div>
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>Rule Scope</th>
                      <th>Store</th>
                      <th>Category</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Effective Date</th>
                      <th>Status</th>
                      <th>Note</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProductRules.map((rule) => {
                      const ruleKey = `product-${rule.id}`;
                      const isExpandedRule = expandedRuleKey === ruleKey;
                      const ruleShopName = rule.scope === "merchant"
                        ? "All Stores"
                        : selectedMerchant.shops.find((shop) => shop.shopId === rule.shopId)?.shopName ?? "-";
                      const ruleCategoryName = categoryOptions.find((category) => category.id === rule.categoryId)?.name ?? "-";

                      return (
                      <Fragment key={rule.id}>
                      <tr
                        className={isExpandedRule ? "clickableRuleRow selectedRuleRow" : "clickableRuleRow"}
                        onClick={() => setExpandedRuleKey(isExpandedRule ? "" : ruleKey)}
                      >
                        <td>{rule.scope === "merchant" ? "Main Rule" : "Store Rule"}</td>
                        <td>{ruleShopName}</td>
                        <td>{ruleCategoryName}</td>
                        <td>{rule.productName}</td>
                        <td>{formatCommissionType(rule.valueType)}</td>
                        <td>{formatCommissionValue(rule.valueType, rule.value)}</td>
                        <td>{getEffectiveDate(rule)}</td>
                        <td><StatusBadge status={rule.status} /></td>
                        <td>{getRuleNote(rule)}</td>
                        <td className="actionCell">
                          <div className="ruleActionMenuWrap" onClick={(event) => event.stopPropagation()}>
                            <button
                              aria-label={`Actions for ${rule.productName}`}
                              className="ruleActionIconButton"
                              type="button"
                              onClick={() => setOpenRuleActionMenu(openRuleActionMenu === ruleKey ? "" : ruleKey)}
                            >
                              <span className="actionChevron" aria-hidden="true" />
                            </button>
                            {openRuleActionMenu === ruleKey && (
                              <div className="ruleActionMenu">
                                <button type="button" onClick={() => openProductRuleForEdit(rule)}>
                                  <span className="menuIcon editIcon" aria-hidden="true" />
                                  Edit
                                </button>
                                <button type="button" onClick={() => duplicateProductRuleAsDraft(rule)}>
                                  <span className="menuIcon duplicateIcon" aria-hidden="true" />
                                  Duplicate as Draft
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpandedRule && (
                        <tr className="ruleDetailRow">
                          <td colSpan={10}>
                            <div className="ruleDetailPanel">
                              <div className="ruleDetailHeader">
                                <div>
                                  <span className="eyebrow">Product Rule Detail</span>
                                  <h3>{rule.productName}</h3>
                                  <p>{rule.scope === "merchant" ? "Applies to every store under this merchant." : `Applies only to ${ruleShopName}.`}</p>
                                </div>
                                <StatusBadge status={rule.status} />
                              </div>
                              <div className="ruleDetailStats">
                                <div>
                                  <span>Rule Scope</span>
                                  <strong>{rule.scope === "merchant" ? "Main Rule" : "Store Rule"}</strong>
                                </div>
                                <div>
                                  <span>Store</span>
                                  <strong>{ruleShopName}</strong>
                                </div>
                                <div>
                                  <span>Category</span>
                                  <strong>{ruleCategoryName}</strong>
                                </div>
                                <div>
                                  <span>Commission Value</span>
                                  <strong>{formatCommissionValue(rule.valueType, rule.value)}</strong>
                                </div>
                              </div>
                              <div className="ruleDetailMeta">
                                <div>
                                  <span>Commission Type</span>
                                  <strong>{formatCommissionType(rule.valueType)}</strong>
                                </div>
                                <div>
                                  <span>Effective Date</span>
                                  <strong>{getEffectiveDate(rule)}</strong>
                                </div>
                                <div>
                                  <span>Note</span>
                                  <strong>{getRuleNote(rule)}</strong>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "preview" && (
            <div className="cardGrid">
              <section className="formCard">
                <div className="cardTitle">
                  <h3>Sample Order Preview</h3>
                  <span>Test before saving</span>
                </div>
                <label>
                  Store
                  <select
                    value={selectedShopId}
                    onChange={(event) => {
                      setSelectedShopId(event.target.value);
                      void refreshPreview(event.target.value);
                    }}
                  >
                    {selectedMerchant.shops.map((shop) => (
                      <option key={shop.shopId} value={shop.shopId}>{shop.shopName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Monthly Sales
                  <input
                    value={monthlySales}
                    onChange={(event) => setMonthlySales(Number(event.target.value))}
                    onBlur={() => void refreshPreview(selectedShopId, monthlySales)}
                  />
                </label>
                <button className="primaryButton" onClick={() => void refreshPreview()} type="button">
                  {isPreviewLoading ? "Calculating..." : "Calculate"}
                </button>
              </section>

              <section className="formCard wide">
                <div className="cardTitle">
                  <h3>Commission Result</h3>
                  <span>{number.format(preview.monthlySales)} monthly sales</span>
                </div>
                <div className="previewLines">
                  {preview.lines.map((line) => (
                    <div className="previewLine" key={`${line.productName}-${line.appliedRule}`}>
                      <div>
                        <strong>{line.productName}</strong>
                        <span>{line.appliedRule}</span>
                      </div>
                      <span>{formatCurrency(line.baseAmount)}</span>
                      <span>{formatCurrency(line.commissionAmount)}</span>
                    </div>
                  ))}
                </div>
                <div className="resultTotal">
                  <div>
                    <span>Order Total</span>
                    <strong>{formatCurrency(preview.orderTotal)}</strong>
                  </div>
                  <div>
                    <span>Red Ant Commission</span>
                    <strong>{formatCurrency(preview.redAntCommission)}</strong>
                  </div>
                  <div>
                    <span>Merchant Receive</span>
                    <strong>{formatCurrency(preview.merchantReceive)}</strong>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "history" && (
            <div className="historyLayout">
              <section className="historySuggestionPanel">
                <div className="historySuggestionHeader">
                  <div>
                    <span className="eyebrow">Suggested Next Steps</span>
                    <h2>History Suggestions</h2>
                    <p>Use recent changes to decide what needs review next.</p>
                  </div>
                  <span>{historySuggestions.length} suggestions</span>
                </div>
                <div className="historySuggestionGrid">
                  {historySuggestions.map((suggestion) => (
                    <article className="historySuggestionCard" key={suggestion.title}>
                      <strong>{suggestion.title}</strong>
                      <p>{suggestion.detail}</p>
                      <button className="secondaryButton" type="button" onClick={suggestion.onClick}>
                        {suggestion.action}
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="tablePanel nested">
                <div className="panelHeader">
                  <div>
                    <h2>Commission History</h2>
                    <p>Recent rule changes</p>
                  </div>
                </div>
                <div className="tableScroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Changed By</th>
                        <th>Rule Type</th>
                        <th>Old Value</th>
                        <th>New Value</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>2026-06-25 14:38:57</td>
                        <td>OPD.09</td>
                        <td>Monthly Tier</td>
                        <td>Tier 1: 18%</td>
                        <td>Tier 1: 20%</td>
                        <td>Merchant contract update</td>
                      </tr>
                      <tr>
                        <td>2026-06-23 10:50:34</td>
                        <td>OPD.01</td>
                        <td>Category Rule</td>
                        <td>Trout Australi: 20%</td>
                        <td>Trout Australi: 25%</td>
                        <td>Premium product margin</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </section>
          </>
        )}
      </section>
    </main>
  );
}
