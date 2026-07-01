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
type DisplayRule = CategoryRule | ProductRule | LocalCategoryRule | LocalProductRule;

const categoryOptions = [
  { id: "c-salmon", name: "Salmon Tek Sab" },
  { id: "c-trout-au", name: "Trout Australi" },
  { id: "c-trout-bkk", name: "Trout BKK" },
  { id: "c-seafood", name: "Seafood Premium" }
];

const productOptions = [
  { id: "p-salmon-tek-sab", name: "Salmon Tek Sab", categoryId: "c-salmon" },
  { id: "p-trout-au", name: "Trout Australi", categoryId: "c-trout-au" },
  { id: "p-trout-bkk-1kg", name: "Trout BKK 1Kg", categoryId: "c-trout-bkk" },
  { id: "p-seafood-box", name: "Seafood Premium Box", categoryId: "c-seafood" }
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
  { id: "shops", label: "Shop Commission", slug: "shop-commission" },
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
  const [draftValueType, setDraftValueType] = useState<CommissionValueType>("percentage");
  const [draftValue, setDraftValue] = useState("15");
  const [draftEffectiveDate, setDraftEffectiveDate] = useState(todayInputValue());
  const [draftStatus, setDraftStatus] = useState<CommissionStatus>("active");
  const [draftNote, setDraftNote] = useState("");
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
  const managedShop =
    selectedMerchant.shops.find((shop) => shop.shopId === managedShopId) ?? selectedMerchant.shops[0];
  const managedCommissionType = managedShop?.useMerchantRule
    ? selectedMerchant.defaultValueType
    : managedShop?.defaultValueType ?? "percentage";
  const managedCommissionValue = managedShop?.useMerchantRule
    ? selectedMerchant.defaultValue
    : managedShop?.defaultValue ?? 0;
  const managedShopCategoryRules = currentCategoryRules.filter((rule) => rule.shopId === managedShop?.shopId);
  const managedShopProductRules = currentProductRules.filter((rule) => rule.shopId === managedShop?.shopId);

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

  function openJourneyTab(tab: Tab) {
    setActiveTab(tab);

    const nextHash = hashForTab(tab);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function openRuleDrawer(type: Exclude<RuleDrawerType, null>) {
    setIsCreatingMerchant(false);
    setIsManagingStores(false);
    setIsAddingTier(false);
    setDrawerType(type);
    setDraftScope("merchant");
    setDraftShopId(selectedMerchant.shops[0]?.shopId ?? "");
    setDraftCategoryId(categoryOptions[0].id);
    setDraftProductId(productOptions[0].id);
    setDraftValueType(type === "category" ? "percentage" : "amount_per_kg");
    setDraftValue(type === "category" ? "15" : "1");
    setDraftEffectiveDate(todayInputValue());
    setDraftStatus("active");
    setDraftNote("");
  }

  function closeRuleDrawer() {
    setDrawerType(null);
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
          shopName: `${newMerchantName} Main Shop`,
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
    }

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
                <p>Create merchant main profile, default commission, monthly tiers, and first shop setup.</p>
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
                  <p>{newTotalShops || "0"} shops will inherit this commission setup</p>
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
                  <span>Shop Rule</span>
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
                "Merchant profile and shop count",
                "Default commission fallback",
                "Monthly tier thresholds",
                "First shop inheritance setup",
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
                    <span>Total Shops</span>
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
                  <strong>Shop Setup</strong>
                </div>
                <div className="tierControlHeader">
                  <div>
                    <strong>Use Merchant Main Commission</strong>
                    <span>All new shops inherit the main merchant commission unless a shop override is added later.</span>
                  </div>
                  <button className="switch isOn" type="button" aria-pressed="true">
                    <span />
                  </button>
                </div>
                <div className="rulePreviewStrip">
                  <span>First shop name</span>
                  <strong>{newMerchantName || "New Merchant"} Main Shop</strong>
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
                    <span>Total Shops</span>
                    <strong>{newTotalShops || "0"} shops</strong>
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
                <p>Review shop inheritance, custom commission overrides, category rules, and product rules.</p>
              </div>
              <div className="rulePageActions">
                <button className="secondaryButton" type="button" onClick={closeManageStorePage}>Back</button>
                <button className="primaryButton" type="button" onClick={closeManageStorePage}>Save Store</button>
              </div>
            </div>

            <section className="merchantHeroCard">
              <div className="merchantHeroBanner storeHeroBanner">
                <div className="merchantLogoPreview">
                  {managedShop?.shopName.slice(0, 2).toUpperCase() ?? "ST"}
                </div>
                <div className="merchantHeroText">
                  <span>Store Commission Profile</span>
                  <strong>{managedShop?.shopName ?? "Store"}</strong>
                  <p>{selectedMerchant.merchantName} / {managedShop?.useMerchantRule ? "Using merchant main rule" : "Custom shop rule"}</p>
                </div>
              </div>
              <div className="merchantHeroStats">
                <div>
                  <span>Commission Source</span>
                  <strong>{managedShop?.useMerchantRule ? "Merchant Main" : "Shop Override"}</strong>
                </div>
                <div>
                  <span>Default Commission</span>
                  <strong>
                    {managedShop?.useMerchantRule
                      ? formatCommissionValue(selectedMerchant.defaultValueType, selectedMerchant.defaultValue)
                      : formatCommissionValue(managedShop?.defaultValueType ?? "percentage", managedShop?.defaultValue ?? 0)}
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
                      className={shop.shopId === managedShop?.shopId ? "shopSelectorItem active" : "shopSelectorItem"}
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
                  <button className={managedShop?.useMerchantRule ? "switch isOn" : "switch"} type="button" aria-pressed={managedShop?.useMerchantRule}>
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
                  {(managedShop?.useMerchantRule ? selectedMerchant.tiers : managedShop?.tiers ?? []).map((tier) => (
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

            <CaptureBrief
              title={`${drawerType === "category" ? "Category" : "Product"} Rule Capture`}
              description="Rules can apply to all shops under the merchant main account or only to one selected shop."
              items={[
                "Rule scope and target shop",
                drawerType === "category" ? "Category target" : "Category and product target",
                "Commission type and value",
                "Effective date and status",
                "Note for approval and history"
              ]}
            />

            <div className="rulePageGrid">
              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>01</span>
                  <strong>Rule Target</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Rule Scope</span>
                    <select
                      value={draftScope}
                      onChange={(event) => setDraftScope(event.target.value as RuleScope)}
                    >
                      <option value="merchant">Merchant Main</option>
                      <option value="shop">Shop Override</option>
                    </select>
                  </label>
                  <label className="fieldBlock">
                    <span>Shop</span>
                    <select
                      disabled={draftScope === "merchant"}
                      value={draftScope === "merchant" ? "all" : draftShopId}
                      onChange={(event) => setDraftShopId(event.target.value)}
                    >
                      <option value="all">All Shops</option>
                      {selectedMerchant.shops.map((shop) => (
                        <option key={shop.shopId} value={shop.shopId}>{shop.shopName}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>02</span>
                  <strong>{drawerType === "category" ? "Category Detail" : "Product Detail"}</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Category</span>
                    <select
                      value={draftCategoryId}
                      onChange={(event) => setDraftCategoryId(event.target.value)}
                    >
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                  {drawerType === "product" && (
                    <label className="fieldBlock">
                      <span>Product</span>
                      <select
                        value={draftProductId}
                        onChange={(event) => {
                          const product = productOptions.find((item) => item.id === event.target.value);
                          setDraftProductId(event.target.value);
                          if (product) {
                            setDraftCategoryId(product.categoryId);
                          }
                        }}
                      >
                        {productOptions.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </section>

              <section className="rulePageCard">
                <div className="sectionLabel">
                  <span>03</span>
                  <strong>Commission Detail</strong>
                </div>
                <div className="designerFieldGrid">
                  <label className="fieldBlock">
                    <span>Commission Type</span>
                    <select
                      value={draftValueType}
                      onChange={(event) => setDraftValueType(event.target.value as CommissionValueType)}
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                      <option value="amount_per_kg">Amount per Kg</option>
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
                  <span>04</span>
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
                    <span>Scope</span>
                    <strong>{draftScope === "merchant" ? "Merchant Main" : "Shop Override"}</strong>
                  </div>
                  <div>
                    <span>Shop</span>
                    <strong>
                      {draftScope === "merchant"
                        ? "All Shops"
                        : selectedMerchant.shops.find((shop) => shop.shopId === draftShopId)?.shopName}
                    </strong>
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
                  <th>Total Shops</th>
                  <th>Default Commission</th>
                  <th>Monthly Tier</th>
                  <th>Shop Override</th>
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
                    <td>{merchant.totalShops} shops</td>
                    <td>{formatCommissionValue(merchant.defaultValueType, merchant.defaultValue)}</td>
                    <td>{merchant.tiers.length} tiers</td>
                    <td>{merchant.shops.filter((shop) => !shop.useMerchantRule).length} shops</td>
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
              <p>{selectedMerchant.totalShops} shops under this merchant</p>
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

          {activeTab === "main" && (
            <div className="mainCommissionLayout">
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
                  <li>Shop Product Commission</li>
                  <li>Shop Category Commission</li>
                  <li>Merchant Main Product Commission</li>
                  <li>Merchant Main Category Commission</li>
                  <li>Shop Monthly Tier Commission</li>
                  <li>Shop Default Commission</li>
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
                  <h2>Shop Commission</h2>
                  <p>{customShopCount} custom shop override</p>
                </div>
                <button className="secondaryButton" type="button" onClick={openManageStorePage}>Manage Store</button>
              </div>
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>Shop Name</th>
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
                      const isSelectedPreviewShop = selectedShopId === shop.shopId;
                      const isExpandedShop = expandedShopId === shop.shopId;
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
                      const shopPreview = isSelectedPreviewShop ? preview : null;

                      return (
                      <Fragment key={shop.shopId}>
                      <tr
                        className={isExpandedShop ? "clickableRuleRow selectedRow" : "clickableRuleRow"}
                        key={shop.shopId}
                        onClick={() => {
                          setSelectedShopId(shop.shopId);
                          setExpandedShopId(isExpandedShop ? "" : shop.shopId);
                          void refreshPreview(shop.shopId);
                        }}
                      >
                        <td>{shop.shopName}</td>
                        <td>{shop.useMerchantRule ? "Merchant Main Rule" : "Custom Shop Rule"}</td>
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
                            className={isExpandedShop ? "previewActionButton active" : "previewActionButton"}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedShopId(shop.shopId);
                              setExpandedShopId(isExpandedShop ? "" : shop.shopId);
                              void refreshPreview(shop.shopId);
                            }}
                          >
                            {isExpandedShop ? "Hide Detail" : "Detail"}
                          </button>
                        </td>
                      </tr>
                      {isExpandedShop && (
                        <tr className="shopDetailRow">
                          <td colSpan={7}>
                            <div className="shopDetailPanel">
                              <div className="shopDetailHeader">
                                <div>
                                  <span className="eyebrow">Shop Detail</span>
                                  <h3>{shop.shopName}</h3>
                                  <p>{shop.useMerchantRule ? "Using merchant main commission rules" : "Using custom shop commission rules"}</p>
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
                                  <strong>{shop.useMerchantRule ? "Merchant Main Rule" : "Custom Shop Rule"}</strong>
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
                                      <p>No monthly tier for this shop.</p>
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
                  <p>Merchant main and shop-level category commission</p>
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
                      <th>Shop</th>
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
                        ? "All Shops"
                        : selectedMerchant.shops.find((shop) => shop.shopId === rule.shopId)?.shopName ?? "-";

                      return (
                      <Fragment key={rule.id}>
                      <tr
                        className={isExpandedRule ? "clickableRuleRow selectedRuleRow" : "clickableRuleRow"}
                        onClick={() => setExpandedRuleKey(isExpandedRule ? "" : ruleKey)}
                      >
                        <td>{rule.scope === "merchant" ? "Main Rule" : "Shop Rule"}</td>
                        <td>{ruleShopName}</td>
                        <td>{rule.categoryName}</td>
                        <td>{formatCommissionType(rule.valueType)}</td>
                        <td>{formatCommissionValue(rule.valueType, rule.value)}</td>
                        <td>{getEffectiveDate(rule)}</td>
                        <td><StatusBadge status={rule.status} /></td>
                        <td>{getRuleNote(rule)}</td>
                      </tr>
                      {isExpandedRule && (
                        <tr className="ruleDetailRow">
                          <td colSpan={8}>
                            <div className="ruleDetailPanel">
                              <div className="ruleDetailHeader">
                                <div>
                                  <span className="eyebrow">Category Rule Detail</span>
                                  <h3>{rule.categoryName}</h3>
                                  <p>{rule.scope === "merchant" ? "Applies to every shop under this merchant." : `Applies only to ${ruleShopName}.`}</p>
                                </div>
                                <StatusBadge status={rule.status} />
                              </div>
                              <div className="ruleDetailStats">
                                <div>
                                  <span>Rule Scope</span>
                                  <strong>{rule.scope === "merchant" ? "Main Rule" : "Shop Rule"}</strong>
                                </div>
                                <div>
                                  <span>Shop</span>
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
                      <th>Shop</th>
                      <th>Category</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Effective Date</th>
                      <th>Status</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProductRules.map((rule) => {
                      const ruleKey = `product-${rule.id}`;
                      const isExpandedRule = expandedRuleKey === ruleKey;
                      const ruleShopName = rule.scope === "merchant"
                        ? "All Shops"
                        : selectedMerchant.shops.find((shop) => shop.shopId === rule.shopId)?.shopName ?? "-";
                      const ruleCategoryName = categoryOptions.find((category) => category.id === rule.categoryId)?.name ?? "-";

                      return (
                      <Fragment key={rule.id}>
                      <tr
                        className={isExpandedRule ? "clickableRuleRow selectedRuleRow" : "clickableRuleRow"}
                        onClick={() => setExpandedRuleKey(isExpandedRule ? "" : ruleKey)}
                      >
                        <td>{rule.scope === "merchant" ? "Main Rule" : "Shop Rule"}</td>
                        <td>{ruleShopName}</td>
                        <td>{ruleCategoryName}</td>
                        <td>{rule.productName}</td>
                        <td>{formatCommissionType(rule.valueType)}</td>
                        <td>{formatCommissionValue(rule.valueType, rule.value)}</td>
                        <td>{getEffectiveDate(rule)}</td>
                        <td><StatusBadge status={rule.status} /></td>
                        <td>{getRuleNote(rule)}</td>
                        <td className="actionCell">
                          <button
                            aria-label={`Show detail for ${rule.productName}`}
                            className={isExpandedRule ? "previewActionButton active" : "previewActionButton"}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedRuleKey(isExpandedRule ? "" : ruleKey);
                            }}
                          >
                            {isExpandedRule ? "Hide Detail" : "Detail"}
                          </button>
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
                                  <p>{rule.scope === "merchant" ? "Applies to every shop under this merchant." : `Applies only to ${ruleShopName}.`}</p>
                                </div>
                                <StatusBadge status={rule.status} />
                              </div>
                              <div className="ruleDetailStats">
                                <div>
                                  <span>Rule Scope</span>
                                  <strong>{rule.scope === "merchant" ? "Main Rule" : "Shop Rule"}</strong>
                                </div>
                                <div>
                                  <span>Shop</span>
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
                  Shop
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
          )}
        </section>
          </>
        )}
      </section>
    </main>
  );
}
