"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { Category } from "../../types/database";

type Purchase = {
  id: number;
  beskrivning: string;
  belopp: number;
  kategori: string;
};

type Props = {
  purchase: Purchase | null;
  categories: Category[];
  open: boolean;
  onClose: () => void;
  onSave: (
    id: number,
    beskrivning: string,
    belopp: number,
    kategori: string
  ) => Promise<void>;
};

export default function EditPurchaseModal({
  purchase,
  categories,
  open,
  onClose,
  onSave,
}: Props) {
  const [beskrivning, setBeskrivning] = useState("");
  const [belopp, setBelopp] = useState("");
  const [kategori, setKategori] = useState("");

  useEffect(() => {
    if (purchase) {
      setBeskrivning(purchase.beskrivning);
      setBelopp(purchase.belopp.toString());
      setKategori(purchase.kategori);
    }
  }, [purchase]);

  if (!open || !purchase) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-[500px]">

        <div className="flex justify-between items-center mb-8">

          <h2 className="text-2xl font-bold text-white">
            ✏️ Redigera köp
          </h2>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition"
          >
            <X />
          </button>

        </div>

        <div className="space-y-5">

          <input
            value={beskrivning}
            onChange={(e) => setBeskrivning(e.target.value)}
            placeholder="Beskrivning"
            className="w-full bg-zinc-800 rounded-xl p-4 outline-none"
          />

          <input
            type="number"
            value={belopp}
            onChange={(e) => setBelopp(e.target.value)}
            placeholder="Belopp"
            className="w-full bg-zinc-800 rounded-xl p-4 outline-none"
          />

          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-4"
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

        </div>

        <div className="flex justify-end gap-4 mt-8">

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
          >
            Avbryt
          </button>

          <button
            onClick={() =>
              onSave(
                purchase.id,
                beskrivning,
                Number(belopp),
                kategori
              )
            }
            className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 transition flex items-center gap-2"
          >
            <Save size={18} />
            Spara
          </button>

        </div>

      </div>

    </div>
  );
}