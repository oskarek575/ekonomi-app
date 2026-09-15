export type Habit = {
  id: string;
  name: string;
  weekdays: number[];
  created: string;
  pauses: HabitPause[];
};

export type HabitPause = {
  id?: string;
  from: string;
  until: string | null;
};

export type HabitCheckStatus = "done" | "skipped";
export type HabitStatus = HabitCheckStatus | "missed" | "pending" | "unscheduled";

export type HabitJournalEntry = {
  text: string;
  mood: number | null;
};

export type HabitData = {
  habits: Habit[];
  checks: Record<string, Record<string, HabitCheckStatus>>;
  journal: Record<string, HabitJournalEntry>;
};

export const emptyHabitData: HabitData = {
  habits: [],
  checks: {},
  journal: {},
};

export const habitWeekdays = [
  { n: 1, label: "Mån" },
  { n: 2, label: "Tis" },
  { n: 3, label: "Ons" },
  { n: 4, label: "Tor" },
  { n: 5, label: "Fre" },
  { n: 6, label: "Lör" },
  { n: 0, label: "Sön" },
];

export const habitMoods = ["Tungt", "Sådär", "Okej", "Bra", "Toppen"];

export function habitDayKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseHabitDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

export function shiftHabitDay(day: string, amount: number): string {
  const date = parseHabitDay(day);
  date.setDate(date.getDate() + amount);

  return habitDayKey(date);
}

export function habitIsScheduled(habit: Habit, day: string): boolean {
  return (
    day >= habit.created
    && habit.weekdays.includes(parseHabitDay(day).getDay())
    && !habit.pauses.some((pause) => day >= pause.from && (pause.until === null || day < pause.until))
  );
}

export function habitStatusOf(
  data: HabitData,
  habit: Habit,
  day: string,
  today: string
): HabitStatus {
  const recorded = data.checks[habit.id]?.[day];
  if (recorded) return recorded;
  if (!habitIsScheduled(habit, day)) return "unscheduled";

  return day < today ? "missed" : "pending";
}

export function habitCounts(data: HabitData, day: string, today: string) {
  const statuses = data.habits.map((habit) => habitStatusOf(data, habit, day, today));

  return {
    total: statuses.filter((status) => status !== "unscheduled").length,
    done: statuses.filter((status) => status === "done").length,
    missed: statuses.filter((status) => status === "missed").length,
    skipped: statuses.filter((status) => status === "skipped").length,
    pending: statuses.filter((status) => status === "pending").length,
  };
}

export function habitMonthDays(month: string): (string | null)[] {
  const first = parseHabitDay(`${month.slice(0, 7)}-01`);
  const offset = (first.getDay() + 6) % 7;
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  return [
    ...Array(offset).fill(null),
    ...Array.from({ length }, (_, index) => shiftHabitDay(habitDayKey(first), index)),
  ];
}

export function moveHabitMonth(day: string, delta: number): string {
  const date = parseHabitDay(day);

  return habitDayKey(new Date(date.getFullYear(), date.getMonth() + delta, 1, 12));
}

export function getHabitScheduleLabel(weekdays: number[]) {
  if (weekdays.length === 7) return "Varje dag";

  return habitWeekdays
    .filter((weekday) => weekdays.includes(weekday.n))
    .map((weekday) => weekday.label)
    .join(", ");
}
