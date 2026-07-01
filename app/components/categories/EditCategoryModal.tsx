"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";

import { Category } from "../../types/database";

type Props = {
  category: Category | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    id: number,
    name: string,
    color: string,
    icon: string
  ) => Promise<void>;
};

export default function EditCategoryModal({
  category,
  open,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("green");
  const [icon, setIcon] = useState("📁");

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
      setIcon(category.icon);
    }
  }, [category]);

  if (!open || !category) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[500px] p-8">

        <div className="flex justify-between items-center mb-8">

          <h2 className="text-2xl font-bold">
            ✏️ Redigera kategori
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Namn"
            className="w-full bg-zinc-800 rounded-xl p-4"
          />

          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="Ikon"
            className="w-full bg-zinc-800 rounded-xl p-4"
          />

          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-4"
          >
            <option value="green">🟢 Grön</option>
            <option value="blue">🔵 Blå</option>
            <option value="red">🔴 Röd</option>
            <option value="yellow">🟡 Gul</option>
            <option value="purple">🟣 Lila</option>
            <option value="emerald">🟢 Emerald</option>
            <option value="orange">🟠 Orange</option>
            <option value="pink">🩷 Rosa</option>
          </select>

        </div>

        <div className="flex justify-end gap-4 mt-8">

          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600"
          >
            Avbryt
          </button>

          <button
            onClick={() =>
              onSave(
                category.id,
                name,
                color,
                icon
              )
            }
            className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-500 flex items-center gap-2"
          >
            <Save size={18} />
            Spara
          </button>

        </div>

      </div>

    </div>
  );
}