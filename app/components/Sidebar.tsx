"use client";

import {
  Activity, BellRing, Boxes, ChevronDown, CircleDollarSign,
  CreditCard, Crown, LayoutDashboard, Plane, Settings, WalletCards,
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
  | "subscriptions"
  | "insights"
  | "reports"
  | "settings";

const links = [
  ["Översikt", "overview", LayoutDashboard],
  ["Fria pengar", "freePurchases", CircleDollarSign],
  ["Transaktioner", "transactions", CreditCard],
  ["Budget", "budgets", WalletCards],
  ["Fasta utgifter", "subscriptions", BellRing],
  ["Resebudget", "travel", Plane],
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
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate?.("overview")}>
        <span className="brand-mark"><CircleDollarSign size={17} /></span>
        <b>Oskars Ekonomi</b>
      </button>
      <nav className="nav-list">
        {links.map(([label, section, Icon]) => (
          <button
            className={`nav-item ${activeSection === section ? "active" : ""}`}
            key={section}
            onClick={() => onNavigate?.(section)}
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
          <button type="button" onClick={() => onNavigate?.("settings")}>Uppgradera nu</button>
        </div>
        <button className="profile-row" onClick={() => onNavigate?.("settings")} type="button">
          <span className="avatar">OE</span>
          <span><b>Oskar Ek</b><small>oskarek@example.com</small></span>
          <ChevronDown size={15} />
        </button>
      </div>
    </aside>
  );
}
