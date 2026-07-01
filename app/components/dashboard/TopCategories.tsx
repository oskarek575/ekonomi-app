"use client";

import { Purchase } from "../../types/database";

type Props = {
  purchases: Purchase[];
};

export default function TopCategories({
  purchases,
}: Props) {
  const categoryTotals = purchases.reduce((acc, purchase) => {
    acc[purchase.kategori] =
      (acc[purchase.kategori] || 0) + purchase.belopp;

    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const highest =
    sorted.length > 0 ? sorted[0][1] : 1;

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
        🥇 Mest spenderat
      </h2>

      <div className="space-y-6">

        {sorted.map(([category, total]) => (

          <div key={category}>

            <div className="flex justify-between mb-2">

              <span className="font-semibold">
                {category}
              </span>

              <span className="text-green-400 font-bold">
                {total.toLocaleString("sv-SE")} kr
              </span>

            </div>

            <div className="w-full bg-zinc-800 rounded-full h-3">

              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(total / highest) * 100}%`,
                }}
              />

            </div>

          </div>

        ))}

        {sorted.length === 0 && (
          <p className="text-zinc-500">
            Inga köp ännu.
          </p>
        )}

      </div>

    </div>
  );
}