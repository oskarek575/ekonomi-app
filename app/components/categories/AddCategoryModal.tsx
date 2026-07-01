"use client";

import { useState, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    color: string,
    icon: string
  ) => void;
};

export default function AddCategoryModal({
  open,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("green");
  const [icon, setIcon] = useState("📁");

  useEffect(() => {
    if (open) {
      setName("");
      setColor("green");
      setIcon("📁");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[500px] p-8">

        <h2 className="text-3xl font-bold mb-6">
          ➕ Ny kategori
        </h2>

        <div className="space-y-5">

          <input
            placeholder="Namn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-4"
          />

          <input
            placeholder="Ikon (😀 🍔 🚗)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
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
            onClick={() => onSave(name, color, icon)}
            className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-500"
          >
            Spara
          </button>

        </div>

      </div>

    </div>
  );
}