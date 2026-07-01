"use client";

import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../lib/api";


export default function SettingsPage() {
  const [income, setIncome] = useState("");
  const [savings, setSavings] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getProfile();

        setIncome(profile.monthly_income.toString());
        setSavings(profile.monthly_savings.toString());
      } catch (error) {
        console.log(error);
      }
    }

    loadProfile();
  }, []);

 async function saveSettings() {
  try {
    await updateProfile(
      Number(income),
      Number(savings)
    );

    alert("Inställningar sparade!");
  } catch (error) {
    console.log(error);
  }
}

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">

      <h1 className="text-4xl font-bold mb-8">
        ⚙️ Inställningar
      </h1>

      <div className="grid grid-cols-2 gap-6">

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">

          <h2 className="text-2xl font-bold mb-6">
            💼 Inkomst
          </h2>

          <input
            type="number"
            placeholder="Månadslön"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full p-3 rounded-lg bg-zinc-800 mb-4"
          />

        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">

          <h2 className="text-2xl font-bold mb-6">
            💰 Sparande
          </h2>

          <input
            type="number"
            placeholder="Månadssparande"
            value={savings}
            onChange={(e) => setSavings(e.target.value)}
            className="w-full p-3 rounded-lg bg-zinc-800 mb-4"
          />

        </div>

      </div>

      <button
        onClick={saveSettings}
        className="mt-8 bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl font-semibold transition"
      >
        💾 Spara inställningar
      </button>

    </main>
  );
}