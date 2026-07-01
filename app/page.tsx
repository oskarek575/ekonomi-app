"use client";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/dashboard/Dashboard";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-zinc-950 text-white">

      <Sidebar />

      <div className="flex-1">
  <Dashboard />
</div>

    </main>
  );
}