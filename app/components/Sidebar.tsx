"use client";

import {
  BarChart3, BellRing, Boxes, ChevronDown, CircleDollarSign,
  CreditCard, Crown, LayoutDashboard, Plane, Settings, Sparkles,
  Target, WalletCards,
} from "lucide-react";

export type AppSection =
  | "overview"
  | "transactions"
  | "freePurchases"
  | "budgets"
  | "categories"
  | "goals"
  | "travel"
  | "subscriptions"
  | "insights"
  | "reports"
  | "settings";

const links = [
  ["Översikt", "overview", LayoutDashboard],
  ["Transaktioner", "transactions", CreditCard],
  ["Fria köp", "freePurchases", CircleDollarSign],
  ["Budget", "budgets", WalletCards],
  ["Kategorier", "categories", Boxes],
  ["Mål", "goals", Target],
  ["Resebudget", "travel", Plane],
  ["Fasta utgifter", "subscriptions", BellRing],
  ["AI Insights", "insights", Sparkles],
  ["Rapporter", "reports", BarChart3],
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
