"use client";

import { Trash2, X } from "lucide-react";

type Purchase = {
  id: number;
 beskrivning: string;
  belopp: number;
  kategori: string;
};

type Props = {
  purchase: Purchase | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
};

export default function DeletePurchaseModal({
  purchase,
  open,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !purchase) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-[480px]">

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Trash2 className="text-red-500" />
            Ta bort köp
          </h2>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition"
          >
            <X />
          </button>

        </div>

        <p className="text-zinc-300 mb-6">
          Är du säker på att du vill ta bort detta köp?
        </p>

        <div className="bg-zinc-800 rounded-xl p-5 mb-8">

          <h3 className="font-bold text-lg">
            {purchase.beskrivning}
          </h3>

          <div className="flex justify-between mt-3">

            <span className="text-zinc-400">
              {purchase.kategori}
            </span>

            <span className="font-bold text-red-400">
              -{purchase.belopp.toLocaleString("sv-SE")} kr
            </span>

          </div>

        </div>

        <div className="flex justify-end gap-4">

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
          >
            Avbryt
          </button>

          <button
            onClick={() => onConfirm(purchase.id)}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 transition flex items-center gap-2"
          >
            <Trash2 size={18} />
            Ta bort
          </button>

        </div>

      </div>

    </div>
  );
}