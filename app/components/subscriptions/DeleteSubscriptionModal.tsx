"use client";

import { Trash2, X } from "lucide-react";

type Subscription = {
  id: number;
  name: string;
};

type Props = {
  subscription: Subscription | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
};

export default function DeleteSubscriptionModal({
  subscription,
  open,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !subscription) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-[450px]">

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-2xl font-bold text-red-400">
            🗑 Ta bort utgift
          </h2>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <X />
          </button>

        </div>

        <p className="text-zinc-300 mb-8">
          Är du säker på att du vill ta bort
          <span className="font-bold"> {subscription.name}</span>?
        </p>

        <div className="flex justify-end gap-4">

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700"
          >
            Avbryt
          </button>

          <button
            onClick={() => onConfirm(subscription.id)}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 flex items-center gap-2"
          >
            <Trash2 size={18} />
            Ta bort
          </button>

        </div>

      </div>

    </div>
  );
}