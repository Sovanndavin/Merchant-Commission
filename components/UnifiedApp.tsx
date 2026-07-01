import { useEffect, useMemo, useState } from "react";
import { CommissionDashboard } from "@/components/CommissionDashboard";
import { StoreProfileDesigner } from "@/components/StoreProfileDesigner";
import { calculateCommissionPreview } from "@/lib/commission";
import { merchantCommissions, sampleOrderItems } from "@/lib/data";

type AppScreen = "store-profile" | "merchant-commission";

const screens: Array<{ id: AppScreen; label: string; path: string }> = [
  { id: "store-profile", label: "Store Profile", path: "#/store-profile" },
  { id: "merchant-commission", label: "Merchant Commission", path: "#/merchant-commission" }
];

function screenFromHash(): AppScreen {
  return window.location.hash === "#/merchant-commission" ? "merchant-commission" : "store-profile";
}

export function UnifiedApp() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>(screenFromHash);

  const commissionPreview = useMemo(() => {
    const selectedMerchant = merchantCommissions[0];
    const selectedShop = selectedMerchant.shops[0];

    return calculateCommissionPreview(selectedMerchant, selectedShop.shopId, 12000, sampleOrderItems);
  }, []);

  useEffect(() => {
    function syncScreen() {
      setActiveScreen(screenFromHash());
    }

    window.addEventListener("hashchange", syncScreen);

    if (!window.location.hash) {
      window.history.replaceState(null, "", "#/store-profile");
    }

    return () => window.removeEventListener("hashchange", syncScreen);
  }, []);

  function openScreen(screen: AppScreen) {
    const route = screens.find((item) => item.id === screen);

    if (route) {
      window.location.hash = route.path;
    }
  }

  return (
    <>
      <nav className="singlePortSwitcher" aria-label="App switcher">
        {screens.map((screen) => (
          <button
            aria-current={activeScreen === screen.id ? "page" : undefined}
            className={activeScreen === screen.id ? "active" : ""}
            key={screen.id}
            onClick={() => openScreen(screen.id)}
            type="button"
          >
            {screen.label}
          </button>
        ))}
      </nav>

      {activeScreen === "merchant-commission" ? (
        <CommissionDashboard
          merchants={merchantCommissions}
          initialMerchantId={merchantCommissions[0].merchantId}
          initialShopId={merchantCommissions[0].shops[0].shopId}
          initialPreview={commissionPreview}
          onOpenStoreProfile={() => openScreen("store-profile")}
        />
      ) : (
        <StoreProfileDesigner onOpenMerchantCommission={() => openScreen("merchant-commission")} />
      )}
    </>
  );
}
