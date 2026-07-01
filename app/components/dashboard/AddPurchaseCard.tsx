"use client";

import { Category } from "../../types/database";

type Props = {
  beskrivning: string;
  setBeskrivning: (value: string) => void;

  belopp: string;
  setBelopp: (value: string) => void;

  kategori: string;
  setKategori: (value: string) => void;

  categories: Category[];

  sparaKop: () => void;
};

export default function AddPurchaseCard({
  beskrivning,
  setBeskrivning,
  belopp,
  setBelopp,
  kategori,
  setKategori,
  categories,
  sparaKop,
}: Props) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 sticky top-8">

      <h2 className="text-xl font-bold mb-4">
        ➕ Lägg till köp
      </h2>

      <input
        type="text"
        placeholder="Beskrivning"
        value={beskrivning}
        onChange={(e) => setBeskrivning(e.target.value)}
        className="w-full p-3 mb-3 bg-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
      />

      <input
        type="number"
        placeholder="Belopp"
        value={belopp}
        onChange={(e) => setBelopp(e.target.value)}
        className="w-full p-3 mb-3 bg-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
      />

      <select
        value={kategori}
        onChange={(e) => setKategori(e.target.value)}
        className="w-full p-3 mb-4 bg-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
      >
        {categories.map((category) => (
          <option
            key={category.id}
            value={category.name}
          >
            {category.icon} {category.name}
          </option>
        ))}
      </select>

      <button
        onClick={sparaKop}
        className="w-full bg-green-600 hover:bg-green-500 rounded-lg py-3 font-semibold transition"
      >
        Spara köp
      </button>

    </div>
  );
}