import { useMemo, useState, type ReactNode } from "react";

type DaySchedule = {
  day: string;
  open: boolean;
  start: string;
  end: string;
};

type DocumentState = "verified" | "review" | "missing";

type StoreDocument = {
  name: string;
  owner: string;
  state: DocumentState;
  updated: string;
};

type CommissionPeriod = {
  id: number;
  startDate: string;
  endDate: string;
  rate: string;
};

type CommissionTier = {
  id: number;
  name: string;
  amountFrom: string;
  rate: string;
};

type PaymentTerm = "credit" | "instant";

type StoreProfileTab = {
  id: string;
  label: string;
  targetId: string;
};

type StoreProfileDesignerProps = {
  onOpenMerchantCommission?: () => void;
};

const navItems = [
  "Dashboard",
  "Store Profile",
  "Orders",
  "Menu",
  "Commission",
  "Payments",
  "Marketing",
  "Support",
  "Settings"
];

const sectionNav = [
  { id: "summary", label: "Summary" },
  { id: "info", label: "Information" },
  { id: "location", label: "Location" },
  { id: "business", label: "Business" },
  { id: "hours", label: "Hours" },
  { id: "media", label: "Media" },
  { id: "documents", label: "Documents" }
];

const storeProfileTabs: StoreProfileTab[] = [
  { id: "profile", label: "Profile", targetId: "summary" },
  { id: "commission", label: "Commission", targetId: "business" },
  { id: "category", label: "Category", targetId: "store-category" },
  { id: "menu", label: "Menu", targetId: "store-menu" },
  { id: "wallet", label: "Wallet", targetId: "store-wallet" },
  { id: "performance", label: "Performance", targetId: "store-performance" },
  { id: "user-device", label: "User & Device", targetId: "store-user-device" }
];

const initialSchedule: DaySchedule[] = [
  { day: "Monday", open: true, start: "07:00", end: "21:00" },
  { day: "Tuesday", open: true, start: "07:00", end: "21:00" },
  { day: "Wednesday", open: true, start: "07:00", end: "21:00" },
  { day: "Thursday", open: true, start: "07:00", end: "21:00" },
  { day: "Friday", open: true, start: "07:00", end: "22:00" },
  { day: "Saturday", open: true, start: "08:00", end: "22:00" },
  { day: "Sunday", open: false, start: "08:00", end: "18:00" }
];

const documents: StoreDocument[] = [
  { name: "Business License", owner: "King Mart Co., Ltd", state: "verified", updated: "30 Jun 2026" },
  { name: "Merchant Contract", owner: "Operation Team", state: "review", updated: "28 Jun 2026" },
  { name: "Owner ID Card", owner: "Sok Dara", state: "missing", updated: "Required" }
];

function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="storeField">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      aria-pressed={checked}
      className={`storeToggle ${checked ? "isOn" : ""}`}
      onClick={onChange}
      type="button"
    >
      <span />
      {label}
    </button>
  );
}

function StatusPill({ tone, children }: { tone: "green" | "amber" | "red" | "gray"; children: ReactNode }) {
  return <span className={`storePill storePill-${tone}`}>{children}</span>;
}

function DocumentCard({ document }: { document: StoreDocument }) {
  const toneByState: Record<DocumentState, "green" | "amber" | "red"> = {
    verified: "green",
    review: "amber",
    missing: "red"
  };

  const labelByState: Record<DocumentState, string> = {
    verified: "Verified",
    review: "In Review",
    missing: "Missing"
  };

  return (
    <article className="documentCard">
      <div>
        <strong>{document.name}</strong>
        <span>{document.owner}</span>
      </div>
      <StatusPill tone={toneByState[document.state]}>{labelByState[document.state]}</StatusPill>
      <span className="documentDate">{document.updated}</span>
      <button aria-label={`Upload ${document.name}`} className="storeIconButton" type="button">
        +
      </button>
    </article>
  );
}

function ScheduleRow({
  schedule,
  onToggle,
  onChange
}: {
  schedule: DaySchedule;
  onToggle: () => void;
  onChange: (key: "start" | "end", value: string) => void;
}) {
  return (
    <div className={`scheduleRow ${schedule.open ? "" : "isClosed"}`}>
      <strong>{schedule.day}</strong>
      <Toggle checked={schedule.open} label={schedule.open ? "Open" : "Closed"} onChange={onToggle} />
      <input
        aria-label={`${schedule.day} open time`}
        disabled={!schedule.open}
        onChange={(event) => onChange("start", event.target.value)}
        type="time"
        value={schedule.start}
      />
      <input
        aria-label={`${schedule.day} close time`}
        disabled={!schedule.open}
        onChange={(event) => onChange("end", event.target.value)}
        type="time"
        value={schedule.end}
      />
    </div>
  );
}

function UploadTile({ title, detail }: { title: string; detail: string }) {
  return (
    <button className="uploadTile" type="button">
      <span>+</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </button>
  );
}

export function StoreProfileDesigner({ onOpenMerchantCommission }: StoreProfileDesignerProps = {}) {
  const [activeStoreTab, setActiveStoreTab] = useState(storeProfileTabs[0].id);
  const [isActive, setIsActive] = useState(true);
  const [isOpenNow, setIsOpenNow] = useState(true);
  const [allowsDelivery, setAllowsDelivery] = useState(true);
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>("credit");
  const [settlePeriod, setSettlePeriod] = useState("Weekly");
  const [commissionPeriods, setCommissionPeriods] = useState<CommissionPeriod[]>([
    { id: 1, startDate: "12-03-2026", endDate: "12-06-2026", rate: "0" },
    { id: 2, startDate: "13-06-2026", endDate: "13-07-2026", rate: "7" }
  ]);
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([
    { id: 1, name: "Tier 1", amountFrom: "0", rate: "8" },
    { id: 2, name: "Tier 2", amountFrom: "10000", rate: "12" }
  ]);
  const [fixedCommissionRate, setFixedCommissionRate] = useState("17.5");
  const [schedule, setSchedule] = useState(initialSchedule);
  const [saveState, setSaveState] = useState("All changes saved");

  const openDayCount = useMemo(() => schedule.filter((item) => item.open).length, [schedule]);
  const completedDocuments = documents.filter((document) => document.state === "verified").length;

  function updateSchedule(index: number, patch: Partial<DaySchedule>) {
    setSchedule((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
    setSaveState("Unsaved changes");
  }

  function markSaved() {
    setSaveState("Saved at 11:58 AM");
  }

  function updateCommissionPeriod(id: number, patch: Partial<CommissionPeriod>) {
    setCommissionPeriods((current) =>
      current.map((period) => (period.id === id ? { ...period, ...patch } : period))
    );
    setSaveState("Unsaved changes");
  }

  function addCommissionPeriod() {
    setCommissionPeriods((current) => {
      const nextId = current.length ? Math.max(...current.map((period) => period.id)) + 1 : 1;

      return [
        ...current,
        {
          id: nextId,
          startDate: "14-07-2026",
          endDate: "14-08-2026",
          rate: "10"
        }
      ];
    });
    setSaveState("Unsaved changes");
  }

  function removeCommissionPeriod(id: number) {
    setCommissionPeriods((current) =>
      current.length === 1 ? current : current.filter((period) => period.id !== id)
    );
    setSaveState("Unsaved changes");
  }

  function updateCommissionTier(id: number, patch: Partial<CommissionTier>) {
    setCommissionTiers((current) => current.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)));
    setSaveState("Unsaved changes");
  }

  function addCommissionTier() {
    setCommissionTiers((current) => {
      const nextId = current.length ? Math.max(...current.map((tier) => tier.id)) + 1 : 1;

      return [
        ...current,
        {
          id: nextId,
          name: `Tier ${nextId}`,
          amountFrom: String(nextId * 10000),
          rate: "15"
        }
      ];
    });
    setSaveState("Unsaved changes");
  }

  function removeCommissionTier(id: number) {
    setCommissionTiers((current) => (current.length === 1 ? current : current.filter((tier) => tier.id !== id)));
    setSaveState("Unsaved changes");
  }

  function openStoreTab(tab: StoreProfileTab) {
    if (tab.id === "commission") {
      onOpenMerchantCommission?.();
      return;
    }

    setActiveStoreTab(tab.id);
    document.getElementById(tab.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="storeDesignerShell">
      <aside className="storeDesignerSidebar" aria-label="Main navigation">
        <div className="storeDesignerBrand">
          <div>RA</div>
          <span>Red Ant</span>
          <strong>Merchant Admin</strong>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              className={item === "Store Profile" ? "active" : ""}
              key={item}
              onClick={item === "Commission" ? onOpenMerchantCommission : undefined}
              type="button"
            >
              <span>{item.slice(0, 2).toUpperCase()}</span>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="storeDesignerMain">
        <header className="storeTopbar">
          <div>
            <p className="breadcrumb">Store Management / Store Profile / Edit</p>
            <h1>Store Edit Form</h1>
          </div>
          <div className="storeTopbarProfile">
            <button aria-label="Notifications" className="storeIconButton" type="button">
              3
            </button>
            <div>
              <strong>Sokha</strong>
              <span>Operation Admin</span>
            </div>
            <div className="storeAvatar">SK</div>
          </div>
        </header>

        <div className="storeStickyActions">
          <div>
            <strong>King Mart BKK</strong>
            <span>{saveState}</span>
          </div>
          <div>
            <button className="storeGhostButton" type="button">
              Cancel
            </button>
            <button className="storeSecondaryButton" type="button">
              Save Draft
            </button>
            <button className="storePrimaryButton" onClick={markSaved} type="button">
              Update Store
            </button>
          </div>
        </div>

        <nav className="storeProfileTabs" aria-label="Store profile tabs">
          <button aria-label="Back to store list" className="storeProfileBack" type="button">
            <span />
          </button>
          {storeProfileTabs.map((tab) => (
            <button
              aria-selected={activeStoreTab === tab.id}
              className={activeStoreTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => openStoreTab(tab)}
              type="button"
            >
              {tab.id === "profile" && <span className="storeTabIcon" aria-hidden="true" />}
              {tab.label}
            </button>
          ))}
          <button aria-label="Open wallet action" className="storeProfileUtility" type="button">
            <span />
          </button>
        </nav>

        <div className="storeDesignerLayout">
          <nav className="storeSectionNav" aria-label="Store edit sections">
            {sectionNav.map((section) => (
              <a href={`#${section.id}`} key={section.id}>
                {section.label}
              </a>
            ))}
          </nav>

          <div className="storeContentStack">
            <section className="storeHeroPanel" id="summary">
              <div className="storeCoverArt">
                <div className="storeLogoMark">KM</div>
                <div>
                  <StatusPill tone="green">Active</StatusPill>
                  <h2>King Mart BKK</h2>
                  <p>Premium grocery and daily essentials store near Boeung Keng Kang.</p>
                </div>
              </div>
              <div className="storeHeroStats">
                <div>
                  <span>Store ID</span>
                  <strong>STR-000214</strong>
                </div>
                <div>
                  <span>Profile</span>
                  <strong>86% Complete</strong>
                </div>
                <div>
                  <span>Open Days</span>
                  <strong>{openDayCount}/7</strong>
                </div>
                <div>
                  <span>Documents</span>
                  <strong>{completedDocuments}/3</strong>
                </div>
              </div>
            </section>

            <section className="storePanel" id="info">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Basic Information</span>
                  <h2>Store identity</h2>
                </div>
                <div className="storeInlineActions">
                  <Toggle checked={isActive} label={isActive ? "Active" : "Inactive"} onChange={() => setIsActive(!isActive)} />
                  <Toggle checked={isOpenNow} label={isOpenNow ? "Open now" : "Closed"} onChange={() => setIsOpenNow(!isOpenNow)} />
                </div>
              </div>
              <div className="storeFormGrid">
                <Field label="Store Name EN">
                  <input defaultValue="King Mart BKK" onChange={() => setSaveState("Unsaved changes")} />
                </Field>
                <Field label="Store Name KH">
                  <input defaultValue="King Mart Boeung Keng Kang" onChange={() => setSaveState("Unsaved changes")} />
                </Field>
                <Field label="Store Phone">
                  <input defaultValue="+855 12 345 678" onChange={() => setSaveState("Unsaved changes")} />
                </Field>
                <Field label="Email">
                  <input defaultValue="bkk@kingmart.example" onChange={() => setSaveState("Unsaved changes")} />
                </Field>
                <Field label="Contact Person">
                  <input defaultValue="Dara Sok" onChange={() => setSaveState("Unsaved changes")} />
                </Field>
                <Field label="Category">
                  <select defaultValue="grocery" onChange={() => setSaveState("Unsaved changes")}>
                    <option value="grocery">Grocery</option>
                    <option value="fresh">Fresh Food</option>
                    <option value="retail">Retail</option>
                  </select>
                </Field>
              </div>
            </section>

            <section className="storePanel locationPanel" id="location">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Location</span>
                  <h2>Address and map pin</h2>
                </div>
                <button className="storeSecondaryButton" type="button">
                  Use Pin Location
                </button>
              </div>
              <div className="locationGrid">
                <div className="storeFormGrid compact">
                  <Field label="Search Address">
                    <input defaultValue="Street 63, BKK 1, Phnom Penh" onChange={() => setSaveState("Unsaved changes")} />
                  </Field>
                  <Field label="Full Address">
                    <textarea defaultValue="No. 128, Street 63, Boeung Keng Kang 1, Phnom Penh" onChange={() => setSaveState("Unsaved changes")} />
                  </Field>
                  <Field label="Latitude">
                    <input defaultValue="11.5539" onChange={() => setSaveState("Unsaved changes")} />
                  </Field>
                  <Field label="Longitude">
                    <input defaultValue="104.9218" onChange={() => setSaveState("Unsaved changes")} />
                  </Field>
                </div>
                <div className="mapMock" aria-label="Store map preview">
                  <div className="mapGrid" />
                  <span className="mapRoad horizontal top" />
                  <span className="mapRoad horizontal bottom" />
                  <span className="mapRoad vertical left" />
                  <span className="mapRoad vertical right" />
                  <span className="mapPin" />
                  <div className="mapZoom">
                    <button aria-label="Zoom in" type="button">
                      +
                    </button>
                    <button aria-label="Zoom out" type="button">
                      -
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="storePanel" id="business">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Business Settings</span>
                  <h2>Operation rules</h2>
                </div>
                <StatusPill tone="amber">Needs Finance Review</StatusPill>
              </div>
              <div className="businessGrid">
                <div className="paymentTermCard" aria-label="Payment term settings">
                  <h3>Payment Term</h3>
                  <div className="paymentTermRows">
                    <label className="paymentTermRow">
                      <span>
                        Payment Term <strong>*</strong>
                      </span>
                      <select
                        aria-label="Payment term"
                        onChange={(event) => {
                          const nextTerm = event.target.value as PaymentTerm;
                          setPaymentTerm(nextTerm);
                          if (nextTerm === "instant") {
                            setSettlePeriod("Instant payout");
                          } else {
                            setSettlePeriod("Weekly");
                          }
                          setSaveState("Unsaved changes");
                        }}
                        value={paymentTerm}
                      >
                        <option value="credit">Credit</option>
                        <option value="instant">Instantly</option>
                      </select>
                    </label>
                    <label className="paymentTermRow">
                      <span>
                        Settle Period <strong>*</strong>
                      </span>
                      <select
                        aria-label="Settle period"
                        disabled={paymentTerm === "instant"}
                        onChange={(event) => {
                          setSettlePeriod(event.target.value);
                          setSaveState("Unsaved changes");
                        }}
                        value={settlePeriod}
                      >
                        {paymentTerm === "instant" ? (
                          <option value="Instant payout">Instant payout</option>
                        ) : (
                          <>
                            <option value="Weekly">Weekly</option>
                            <option value="Biweekly">Biweekly</option>
                            <option value="Monthly">Monthly</option>
                          </>
                        )}
                      </select>
                    </label>
                  </div>
                  <div className={`paymentTermLogic ${paymentTerm === "credit" ? "credit" : "instant"}`}>
                    <strong>{paymentTerm === "credit" ? "Credit selected" : "Instantly selected"}</strong>
                    <span>
                      {paymentTerm === "credit"
                        ? "Tier commission is available because payment is settled later."
                        : "Tier commission is hidden for instant payout to keep settlement simple."}
                    </span>
                  </div>
                </div>
                <div className="commissionRateCard" aria-label="Commission rate settings">
                  <div className="commissionRateHeader">
                    <h3>Commission Rate</h3>
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
                            aria-label={`Period ${index + 1} date range`}
                            onChange={(event) => {
                              const [startDate = "", endDate = ""] = event.target.value
                                .split(" - ")
                                .map((part) => part.trim());
                              updateCommissionPeriod(period.id, { startDate, endDate: endDate || period.endDate });
                            }}
                            value={`${period.startDate} - ${period.endDate}`}
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
                  {paymentTerm === "credit" ? (
                    <div className="tierCommissionGroup">
                      <div className="tierCommissionHeader">
                        <span>Tier Commission Rate</span>
                        <button
                          aria-label="Add commission tier"
                          className="rateActionButton add"
                          onClick={addCommissionTier}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <div className="tierCommissionList">
                        {commissionTiers.map((tier, index) => (
                          <div className="tierCommissionRow" key={tier.id}>
                            <span className="periodLabel">Tier {index + 1}</span>
                            <div className="tierAmountControl">
                              <span>$</span>
                              <input
                                aria-label={`Tier ${index + 1} amount from`}
                                onChange={(event) =>
                                  updateCommissionTier(tier.id, { amountFrom: event.target.value })
                                }
                                value={tier.amountFrom}
                              />
                            </div>
                            <div className="periodRateControl">
                              <input
                                aria-label={`Tier ${index + 1} commission rate`}
                                onChange={(event) => updateCommissionTier(tier.id, { rate: event.target.value })}
                                value={tier.rate}
                              />
                              <span>%</span>
                            </div>
                            <button
                              aria-label={`Remove tier ${index + 1}`}
                              className="rateActionButton remove"
                              onClick={() => removeCommissionTier(tier.id)}
                              type="button"
                            >
                              -
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="tierHiddenNotice">
                      <strong>Tier commission hidden</strong>
                      <span>Switch payment term to Credit if this store needs tier commission.</span>
                    </div>
                  )}
                  <div className="fixedRateRow">
                    <span>Fixed Commission Rate</span>
                    <div className="periodRateControl">
                      <input
                        aria-label="Fixed commission rate"
                        onChange={(event) => {
                          setFixedCommissionRate(event.target.value);
                          setSaveState("Unsaved changes");
                        }}
                        value={fixedCommissionRate}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
                <Field label="Minimum Order">
                  <div className="inputPrefix">
                    <span>$</span>
                    <input defaultValue="5.00" onChange={() => setSaveState("Unsaved changes")} />
                  </div>
                </Field>
                <Field label="Delivery Radius">
                  <div className="inputSuffix">
                    <input defaultValue="4.5" onChange={() => setSaveState("Unsaved changes")} />
                    <span>km</span>
                  </div>
                </Field>
                <div className="settingStack">
                  <Toggle
                    checked={allowsDelivery}
                    label="Delivery enabled"
                    onChange={() => {
                      setAllowsDelivery(!allowsDelivery);
                      setSaveState("Unsaved changes");
                    }}
                  />
                  <Toggle
                    checked={acceptsCash}
                    label="Cash accepted"
                    onChange={() => {
                      setAcceptsCash(!acceptsCash);
                      setSaveState("Unsaved changes");
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="storePanel" id="store-category">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Category</span>
                  <h2>Store categories</h2>
                </div>
                <button className="storeSecondaryButton" type="button">
                  Add Category
                </button>
              </div>
              <div className="storeTabCardGrid">
                {["Grocery", "Fresh Produce", "Household", "Beverage"].map((category) => (
                  <article className="storeTabCard" key={category}>
                    <strong>{category}</strong>
                    <span>Active category</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="storePanel" id="store-menu">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Menu</span>
                  <h2>Menu readiness</h2>
                </div>
                <button className="storeSecondaryButton" type="button">
                  Manage Menu
                </button>
              </div>
              <div className="storeTabMetricGrid">
                <div>
                  <span>Total Items</span>
                  <strong>148</strong>
                </div>
                <div>
                  <span>Available</span>
                  <strong>132</strong>
                </div>
                <div>
                  <span>Out of Stock</span>
                  <strong>16</strong>
                </div>
              </div>
            </section>

            <section className="storePanel" id="store-wallet">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Wallet</span>
                  <h2>Settlement account</h2>
                </div>
                <StatusPill tone="green">Connected</StatusPill>
              </div>
              <div className="storeTabMetricGrid">
                <div>
                  <span>Available Balance</span>
                  <strong>$2,840.25</strong>
                </div>
                <div>
                  <span>Pending Settlement</span>
                  <strong>$615.40</strong>
                </div>
                <div>
                  <span>Next Payout</span>
                  <strong>03 Jul 2026</strong>
                </div>
              </div>
            </section>

            <section className="storePanel" id="store-performance">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Performance</span>
                  <h2>Store performance</h2>
                </div>
                <StatusPill tone="green">Healthy</StatusPill>
              </div>
              <div className="storeTabMetricGrid">
                <div>
                  <span>Acceptance Rate</span>
                  <strong>96%</strong>
                </div>
                <div>
                  <span>Avg Prep Time</span>
                  <strong>18 min</strong>
                </div>
                <div>
                  <span>Rating</span>
                  <strong>4.7</strong>
                </div>
              </div>
            </section>

            <section className="storePanel" id="store-user-device">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">User & Device</span>
                  <h2>Access devices</h2>
                </div>
                <button className="storeSecondaryButton" type="button">
                  Add Device
                </button>
              </div>
              <div className="storeTabCardGrid">
                {["POS Tablet", "Manager Phone", "Kitchen Display"].map((device) => (
                  <article className="storeTabCard" key={device}>
                    <strong>{device}</strong>
                    <span>Last active today</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="storePanel" id="hours">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Opening Hours</span>
                  <h2>Weekly schedule</h2>
                </div>
                <button
                  className="storeSecondaryButton"
                  onClick={() =>
                    setSchedule((current) =>
                      current.map((item) => ({ ...item, open: true, start: "07:00", end: "21:00" }))
                    )
                  }
                  type="button"
                >
                  Apply to All
                </button>
              </div>
              <div className="scheduleTable">
                {schedule.map((item, index) => (
                  <ScheduleRow
                    key={item.day}
                    schedule={item}
                    onChange={(key, value) => updateSchedule(index, key === "start" ? { start: value } : { end: value })}
                    onToggle={() => updateSchedule(index, { open: !item.open })}
                  />
                ))}
              </div>
            </section>

            <section className="storePanel" id="media">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Media</span>
                  <h2>Cover, logo, and gallery</h2>
                </div>
                <button className="storeSecondaryButton" type="button">
                  Sort Gallery
                </button>
              </div>
              <div className="mediaGrid">
                <div className="galleryPreview groceryOne" />
                <div className="galleryPreview groceryTwo" />
                <div className="galleryPreview groceryThree" />
                <UploadTile detail="1200 x 480 recommended" title="Cover Image" />
                <UploadTile detail="Square PNG or JPG" title="Store Logo" />
              </div>
            </section>

            <section className="storePanel" id="documents">
              <div className="storePanelHeader">
                <div>
                  <span className="storeEyebrow">Documents</span>
                  <h2>Verification files</h2>
                </div>
                <button className="storePrimaryButton" type="button">
                  Upload File
                </button>
              </div>
              <div className="documentGrid">
                {documents.map((document) => (
                  <DocumentCard document={document} key={document.name} />
                ))}
              </div>
              <Field label="Reviewer Note">
                <textarea defaultValue="Merchant contract is pending final finance confirmation." onChange={() => setSaveState("Unsaved changes")} />
              </Field>
            </section>
          </div>

          <aside className="storeReviewPanel">
            <div>
              <span className="storeEyebrow">Review</span>
              <h2>Publishing checklist</h2>
            </div>
            <div className="reviewProgress">
              <span style={{ width: "86%" }} />
            </div>
            <ul>
              <li className="done">Store identity completed</li>
              <li className="done">Map pin confirmed</li>
              <li className="done">Opening hours ready</li>
              <li>Merchant contract in review</li>
              <li>Owner ID still missing</li>
            </ul>
            <div className="reviewMetric">
              <span>Profile Quality</span>
              <strong>86%</strong>
            </div>
            <button className="storePrimaryButton fullWidth" type="button">
              Submit for Approval
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
