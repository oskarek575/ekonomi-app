type Kop = {
  id: number;
  beskrivning: string;
  belopp: number;
  kategori: string;
};

type Props = {
  kop: Kop[];
  onDelete: (id: number) => void;
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

export default function RecentPurchases({
  kop,
  onDelete,
}: Props) {
  return (
    <div
      className="
        mt-10
        bg-zinc-900
        border
        border-zinc-800
        rounded-2xl
        p-8
        shadow-lg
        transition-all
        duration-300
        hover:border-green-500/40
        hover:shadow-green-500/10
      "
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">
          🛒 Senaste köp
        </h2>

        <span className="text-zinc-500">
          {kop.length} köp
        </span>
      </div>

      {kop.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          Inga köp registrerade ännu.
        </div>
      ) : (
        <div className="space-y-4">
          {kop.map((item) => (
            <div
              key={item.id}
              className="
                flex
                justify-between
                items-center
                bg-zinc-800/40
                rounded-xl
                p-4
                transition-all
                duration-300
                hover:bg-zinc-800
              "
            >
              <div>

                <h3 className="font-bold text-lg">
                  {item.beskrivning}
                </h3>

                <span
                  className={`
                    inline-block
                    mt-2
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

              </div>

              <div className="flex items-center gap-6">

                <span className="text-xl font-bold text-red-400">
                  -{item.belopp.toLocaleString("sv-SE")} kr
                </span>

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
                    duration-300
                  "
                >
                  🗑
                </button>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}