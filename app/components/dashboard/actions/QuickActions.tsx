"use client";

import Link from "next/link";

export default function QuickActions() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">

      <h2 className="text-2xl font-bold mb-6">
        ⚡ Snabbåtgärder
      </h2>

      <div className="grid grid-cols-2 gap-4">

        <Link
          href="/"
          className="bg-zinc-800 hover:bg-green-600 transition rounded-2xl p-6 text-center"
        >
          <div className="text-4xl mb-3">
            ➕
          </div>

          <p className="font-semibold">
            Nytt köp
          </p>
        </Link>

        <Link
          href="/budgets"
          className="bg-zinc-800 hover:bg-green-600 transition rounded-2xl p-6 text-center"
        >
          <div className="text-4xl mb-3">
            💰
          </div>

          <p className="font-semibold">
            Budgetar
          </p>
        </Link>

        <Link
          href="/categories"
          className="bg-zinc-800 hover:bg-green-600 transition rounded-2xl p-6 text-center"
        >
          <div className="text-4xl mb-3">
            📂
          </div>

          <p className="font-semibold">
            Kategorier
          </p>
        </Link>

        <Link
          href="/subscriptions"
          className="bg-zinc-800 hover:bg-green-600 transition rounded-2xl p-6 text-center"
        >
          <div className="text-4xl mb-3">
            🔄
          </div>

          <p className="font-semibold">
            Abonnemang
          </p>
        </Link>

      </div>

    </div>
  );
}