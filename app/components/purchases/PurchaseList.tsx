import { Pencil, Trash2 } from "lucide-react";

type Purchase = {
  id: number;
  beskrivning: string;
  belopp: number;
  kategori: string;
  created_at: string;
};

type Props = {
  purchases: Purchase[];
  onDelete?: (id: number) => void;
  onEdit?: (purchase: Purchase) => void;
  limit?: number;
};

function getCategoryColor(kategori: string) {
  switch (kategori) {
    case "Mat":
      return "bg-green-500/20 text-green-400";

    case "Golf":
      return "bg-emerald-500/20 text-emerald-400";

    case "Nöje":
      return "bg-purple-500/20 text-purple-400";

    case "Drivmedel":
      return "bg-yellow-500/20 text-yellow-400";

    default:
      return "bg-zinc-700 text-zinc-300";
  }
}

export default function PurchaseList({
  purchases,
  onDelete,
  onEdit,
  limit,
}: Props) {
  const items = limit ? purchases.slice(0, limit) : purchases;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-lg">

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">
          🛒 Köp
        </h2>

        <span className="text-zinc-500">
          {items.length} st
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          Inga köp hittades.
        </div>
      ) : (
        <div className="space-y-4">

          {items.map((item) => (
            <div
              key={item.id}
              className="
                flex
                justify-between
                items-center
                rounded-xl
                bg-zinc-800/40
                p-5
                transition-all
                duration-300
                hover:bg-zinc-800
              "
            >
              <div>

                <h3 className="font-bold text-lg">
                  {item.beskrivning}
                </h3>

                <div className="flex items-center gap-3 mt-2">

                  <span
                    className={`
                      px-3
                      py-1
                      rounded-full
                      text-xs
                      font-semibold
                      ${getCategoryColor(item.kategori)}
                    `}
                  >
                    {item.kategori}
                  </span>

                  <span className="text-zinc-500 text-sm">
                    {new Date(item.created_at).toLocaleDateString("sv-SE")}
                  </span>

                </div>

              </div>

              <div className="flex items-center gap-4">

                <span className="text-xl font-bold text-red-400">
                  -{item.belopp.toLocaleString("sv-SE")} kr
                </span>

                {onEdit && (
                  <button
                    onClick={() => onEdit(item)}
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-blue-500/10
                      text-blue-400
                      hover:bg-blue-500
                      hover:text-white
                      transition-all
                    "
                  >
                    <Pencil size={18} />
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="
                      w-10
                      h-10
                      rounded-full
                      bg-red-500/10
                      text-red-400
                      hover:bg-red-500
                      hover:text-white
                      transition-all
                    "
                  >
                    <Trash2 size={18} />
                  </button>
                )}

              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}