/**
 * src/contexts/BrandingContext.tsx
 *
 * Pure REST API branding context — Firebase removed.
 */
import React, { createContext, useContext, useState, useEffect } from "react";

interface BrandingSettings {
  companyName: string;
  logoBase64: string | null;
  logoType: string | null;
}

interface BrandingContextType {
  branding: BrandingSettings;
  updateCompanyName: (name: string) => Promise<void>;
  updateLogo: (base64: string | null, type: string | null) => Promise<void>;
  loading: boolean;
}

const defaultBranding: BrandingSettings = {
  companyName: "Connect",
  logoBase64: null,
  logoType: null,
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const res = await fetch("/api/settings/branding");
      if (res.ok) {
        const data = await res.json();
        setBranding({
          companyName: data.companyName || defaultBranding.companyName,
          logoBase64: data.logoBase64 || null,
          logoType: data.logoType || null,
        });
      }
    } catch (e) {
      console.warn("[BrandingContext] Fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
    // Poll for branding changes every 60 seconds
    const interval = setInterval(fetchBranding, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (branding.companyName) {
      const currentTitle = document.title;
      const parts = currentTitle.split(" - ");
      const pageName = parts[0] || "Ticklora";
      document.title = `${pageName} - ${branding.companyName}`;
    }
    if (branding.logoBase64) {
      let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement("link");
        faviconLink.rel = "icon";
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = branding.logoBase64;
    }
  }, [branding]);

  const updateCompanyName = async (name: string) => {
    try {
      const res = await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: name, logoBase64: branding.logoBase64, logoType: branding.logoType, updatedBy: "System" }),
      });
      if (res.ok) setBranding((prev) => ({ ...prev, companyName: name }));
    } catch (e) {
      console.error("[BrandingContext] updateCompanyName failed:", e);
    }
  };

  const updateLogo = async (base64: string | null, type: string | null) => {
    try {
      const res = await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: branding.companyName, logoBase64: base64, logoType: type, updatedBy: "System" }),
      });
      if (res.ok) setBranding((prev) => ({ ...prev, logoBase64: base64, logoType: type }));
    } catch (e) {
      console.error("[BrandingContext] updateLogo failed:", e);
    }
  };

  return (
    <BrandingContext.Provider value={{ branding, updateCompanyName, updateLogo, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) throw new Error("useBranding must be used within a BrandingProvider");
  return context;
}
