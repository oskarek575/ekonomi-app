"use client";

type Props = {
  selectedMonth: number;
  selectedYear: number;
  previousMonth: () => void;
  nextMonth: () => void;
};

export default function DashboardHeader({
  selectedMonth,
  selectedYear,
  previousMonth,
  nextMonth,
}: Props) {
  const monthName = new Date(
    selectedYear,
    selectedMonth
  ).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mb-8">

      <h1 className="text-4xl font-bold mb-6">
        🔥 Oskars Ekonomi
      </h1>

      <div className="flex items-center justify-between">

        <button
          onClick={previousMonth}
          className="
            bg-zinc-800
            hover:bg-zinc-700
            rounded-xl
            px-4
            py-2
            transition
          "
        >
          ◀
        </button>

        <h2 className="text-2xl font-bold capitalize">
          {monthName}
        </h2>

        <button
          onClick={nextMonth}
          className="
            bg-zinc-800
            hover:bg-zinc-700
            rounded-xl
            px-4
            py-2
            transition
          "
        >
          ▶
        </button>

      </div>

    </div>
  );
}