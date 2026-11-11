"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { onAuthChange } from "../lib/api";
import {
  Activity, BellRing, Boxes, BriefcaseBusiness, ChevronDown, CircleDollarSign,
  CreditCard, LayoutDashboard, Menu, Plane, Settings, WalletCards, X,
} from "lucide-react";

export type AppSection =
  | "overview"
  | "transactions"
  | "freePurchases"
  | "budgets"
  | "categories"
  | "goals"
  | "loans"
  | "travel"
  | "business"
  | "subscriptions"
  | "insights"
  | "reports"
  | "settings";

const links = [
  ["Översikt", "overview", LayoutDashboard],
  ["Transaktioner", "transactions", CreditCard],
  ["Budget", "budgets", WalletCards],
  ["Fasta utgifter", "subscriptions", BellRing],
  ["Resebudget", "travel", Plane],
  ["Företag", "business", BriefcaseBusiness],
  ["Kategorier", "categories", Boxes],
  ["Rapporter", "reports", Activity],
  ["Inställningar", "settings", Settings],
] as const;

function getDisplayName(user: User | null) {
  const metadataName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  return user?.email?.split("@")[0] ?? "Gäst";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

type SidebarProps = {
  activeSection?: AppSection;
  onNavigate?: (section: AppSection) => void;
};

export default function Sidebar({
  activeSection = "overview",
  onNavigate,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data } = onAuthChange(setUser);
    return () => data.subscription.unsubscribe();
  }, []);

  const displayName = getDisplayName(user);

  function navigate(section: AppSection) {
    onNavigate?.(section);
    setMobileMenuOpen(false);
  }

  function rememberTouchStart(clientX: number) {
    touchStartX.current = clientX;
  }

  function closeOnSwipe(clientX: number) {
    if (touchStartX.current !== null && clientX - touchStartX.current < -45) {
      setMobileMenuOpen(false);
    }

    touchStartX.current = null;
  }

  return (
    <>
      <button
        aria-expanded={mobileMenuOpen}
        aria-label="Öppna meny"
        className={`mobile-nav-toggle ${mobileMenuOpen ? "menu-open" : ""}`}
        onClick={() => setMobileMenuOpen(true)}
        onTouchStart={(event) => rememberTouchStart(event.touches[0].clientX)}
        onTouchEnd={(event) => {
          const startX = touchStartX.current;
          if (startX !== null && event.changedTouches[0].clientX - startX > 20) {
            setMobileMenuOpen(true);
          }
          touchStartX.current = null;
        }}
        type="button"
      >
        <Menu size={20} />
      </button>

      <button
        aria-label="Stäng meny"
        className={`mobile-nav-overlay ${mobileMenuOpen ? "menu-open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        type="button"
      />

      <aside
        className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}
        onTouchStart={(event) => rememberTouchStart(event.touches[0].clientX)}
        onTouchEnd={(event) => closeOnSwipe(event.changedTouches[0].clientX)}
      >
        <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)} type="button" aria-label="Stäng meny">
          <X size={19} />
        </button>
        <button className="brand" onClick={() => navigate("overview")}>
          <span className="brand-mark"><CircleDollarSign size={17} /></span>
          <b>Oskars Ekonomi</b>
        </button>
        <nav className="nav-list">
          {links.map(([label, section, Icon]) => (
            <button
              className={`nav-item ${activeSection === section ? "active" : ""}`}
              key={section}
              onClick={() => navigate(section)}
              type="button"
            >
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="profile-row" onClick={() => navigate("settings")} type="button">
            <span className="avatar">{getInitials(displayName)}</span>
            <span><b>{displayName}</b><small>{user?.email ?? "Inte inloggad"}</small></span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}
