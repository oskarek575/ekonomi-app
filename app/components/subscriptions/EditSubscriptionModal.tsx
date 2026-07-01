"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";

type Subscription = {
  id: number;
  name: string;
  amount: number;
  category: string;
  day_of_month: number;
  active: boolean;
};

type Props = {
  subscription: Subscription | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    id: number,
    name: string,
    amount: number,
    category: string,
    day_of_month: number,
    active: boolean
  ) => Promise<void>;
};

export default function EditSubscriptionModal({
  subscription,
  open,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [day, setDay] = useState("1");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (subscription) {
      setName(subscription.name);
      setAmount(subscription.amount.toString());
      setCategory(subscription.category);
      setDay(subscription.day_of_month.toString());
      setActive(subscription.active);
    }
  }, [subscription]);

  if (!open || !subscription) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-[500px]">

        <div className="flex justify-between items-center mb-8">

          <h2 className="text-2xl font-bold">
            ✏️ Redigera utgift
          </h2>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
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
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Belopp"
            className="w-full bg-zinc-800 rounded-xl p-4"
          />

          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Kategori"
            className="w-full bg-zinc-800 rounded-xl p-4"
          />

          <input
            type="number"
            min={1}
            max={31}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-4"
          />

          <label className="flex items-center gap-3">

            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />

            Aktiv

          </label>

        </div>

        <div className="flex justify-end gap-4 mt-8">

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700"
          >
            Avbryt
          </button>

          <button
            onClick={() =>
              onSave(
                subscription.id,
                name,
                Number(amount),
                category,
                Number(day),
                active
              )
            }
            className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 flex items-center gap-2"
          >
            <Save size={18} />
            Spara
          </button>

        </div>

      </div>

    </div>
  );
}