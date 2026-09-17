"use client";

import { useRef, useState } from "react";
import {
  Activity, BellRing, Boxes, CalendarCheck, ChevronDown, CircleDollarSign,
  CreditCard, Crown, LayoutDashboard, Menu, Plane, Settings, WalletCards, X,
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
  | "habits"
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
  ["Vanor", "habits", CalendarCheck],
  ["Kategorier", "categories", Boxes],
  ["Rapporter", "reports", Activity],
  ["Inställningar", "settings", Settings],
] as const;

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
          <div className="pro-card">
            <div className="pro-title"><Crown size={16} /> Pro-version</div>
            <p>Få tillgång till alla funktioner och AI-insikter</p>
            <button type="button" onClick={() => navigate("settings")}>Uppgradera nu</button>
          </div>
          <button className="profile-row" onClick={() => navigate("settings")} type="button">
            <span className="avatar">OE</span>
            <span><b>Oskar Ek</b><small>oskarek@example.com</small></span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}
