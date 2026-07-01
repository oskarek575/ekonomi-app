"use client";

import { Trash2, X } from "lucide-react";
import { Category } from "../../types/database";

type Props = {
  category: Category | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
};

export default function DeleteCategoryModal({
  category,
  open,
  onClose,
  onConfirm,
}: Props) {
  if (!open || !category) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[500px] p-8">

        <div className="flex items-center gap-3 mb-6">

          <Trash2
            size={28}
            className="text-red-500"
          />

          <h2 className="text-2xl font-bold">
            Ta bort kategori
          </h2>

        </div>

        <p className="text-zinc-400 leading-7">
          Är du säker på att du vill ta bort
          <span className="font-bold text-white">
            {" "}
            {category.icon} {category.name}
          </span>
          ?
        </p>

        <div className="flex justify-end gap-4 mt-8">

          <button
            onClick={onClose}
            className="
              px-5
              py-3
              rounded-xl
              bg-zinc-700
              hover:bg-zinc-600
            "
          >
            <X size={18} className="inline mr-2" />
            Avbryt
          </button>

          <button
            onClick={() => onConfirm(category.id)}
            className="
              px-5
              py-3
              rounded-xl
              bg-red-600
              hover:bg-red-500
              flex
              items-center
              gap-2
            "
          >
            <Trash2 size={18} />
            Ta bort
          </button>

        </div>

      </div>

    </div>
  );
}