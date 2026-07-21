"use client";

import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import type { AppSection } from "./components/Sidebar";
import Dashboard from "./components/dashboard/Dashboard";

const sections: AppSection[] = [
  "overview",
  "transactions",
  "freePurchases",
  "budgets",
  "categories",
  "goals",
  "travel",
  "subscriptions",
  "insights",
  "reports",
  "settings",
];

export default function Home() {
  const [activeSection, setActiveSection] = useState<AppSection>("overview");

  useEffect(() => {
    const section = window.location.hash.replace("#", "") as AppSection;
    if (sections.includes(section)) {
      setActiveSection(section);
    }
  }, []);

  function navigate(section: AppSection) {
    setActiveSection(section);
    window.history.replaceState(null, "", section === "overview" ? "/" : `#${section}`);
  }

  return (
    <main className="app-frame">
      <Sidebar activeSection={activeSection} onNavigate={navigate} />
      <Dashboard activeSection={activeSection} onNavigate={navigate} />
    </main>
  );
}
