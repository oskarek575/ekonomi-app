"use client";

import { Purchase } from "../../types/database";

type Props = {
  purchases: Purchase[];
};

export default function BiggestPurchase({
  purchases,
}: Props) {
  if (purchases.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6">
          🏆 Månadens största köp
        </h2>

        <p className="text-zinc-500">
          Inga köp registrerade ännu.
        </p>
      </div>
    );
  }

  const biggestPurchase = purchases.reduce((largest, current) =>
    current.belopp > largest.belopp ? current : largest
  );

  return (
    <div
      className="
        bg-zinc-900
        border
        border-zinc-800
        rounded-2xl
        p-6
      "
    >
      <h2 className="text-2xl font-bold mb-6">
        🏆 Månadens största köp
      </h2>

      <div className="space-y-4">

        <div>
          <p className="text-zinc-400 text-sm">
            Beskrivning
          </p>

          <h3 className="text-2xl font-bold">
            {biggestPurchase.beskrivning}
          </h3>
        </div>

        <div>
          <p className="text-zinc-400 text-sm">
            Kategori
          </p>

          <p className="text-lg">
            {biggestPurchase.kategori}
          </p>
        </div>

        <div>
          <p className="text-zinc-400 text-sm">
            Belopp
          </p>

          <p className="text-4xl font-black text-red-400">
            {biggestPurchase.belopp.toLocaleString("sv-SE")} kr
          </p>
        </div>

        <div>
          <p className="text-zinc-400 text-sm">
            Datum
          </p>

          <p>
            {new Date(
              biggestPurchase.created_at
            ).toLocaleDateString("sv-SE")}
          </p>
        </div>

      </div>
    </div>
  );
}