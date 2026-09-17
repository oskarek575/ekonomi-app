"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Circle,
  Edit3, Minus, Pause, Play, Plus, RotateCcw, SlidersHorizontal, Trash2, X,
} from "lucide-react";
import {
  addHabit,
  deleteHabit,
  getHabitData,
  renameHabit,
  saveJournalEntry,
  setHabitCheck,
  toggleHabitPause,
} from "../../../lib/api";
import {
  emptyHabitData,
  getHabitScheduleLabel,
  habitCounts,
  habitDayKey,
  habitMoods,
  habitMonthDays,
  habitStatusOf,
  habitWeekdays,
  moveHabitMonth,
  parseHabitDay,
  shiftHabitDay,
  type Habit,
  type HabitCheckStatus,
  type HabitData,
  type HabitStatus,
} from "../../../lib/habits/model";

type HabitTab = "today" | "history" | "journal";

const statusLabels: Record<HabitStatus, string> = {
  done: "Klart",
  skipped: "Överhoppad",
  missed: "Missad",
  pending: "Kvar idag",
  unscheduled: "Inte planerad",
};

function formatHabitDate(day: string, options: Intl.DateTimeFormatOptions) {
  return parseHabitDay(day).toLocaleDateString("sv-SE", options);
}

function isHabitPaused(habit: Habit) {
  return habit.pauses.some((pause) => pause.until === null);
}

function getHabitSaveError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Vanan kunde inte sparas.";
}

export default function HabitsSection() {
  const [data, setData] = useState<HabitData>(emptyHabitData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<HabitTab>("today");
  const [today, setToday] = useState(habitDayKey());
  const [selectedDay, setSelectedDay] = useState(habitDayKey());
  const [historyMonth, setHistoryMonth] = useState(habitDayKey());
  const [showManager, setShowManager] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [habitDays, setHabitDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [journalText, setJournalText] = useState("");
  const [journalMood, setJournalMood] = useState<number | null>(null);
  const [journalSaved, setJournalSaved] = useState(false);

  useEffect(() => {
    let active = true;

    getHabitData()
      .then((habitData) => {
        if (!active) return;
        setData(habitData);
        setError("");
      })
      .catch((loadError) => {
        console.error(loadError);
        if (!active) return;
        setError("Kunde inte hämta vanor. Kontrollera att Supabase-tabellerna är skapade.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const refreshToday = () => {
      const nextToday = habitDayKey();
      setToday(nextToday);
      setSelectedDay((current) => current > nextToday ? nextToday : current);
    };
    const interval = window.setInterval(refreshToday, 30000);

    window.addEventListener("focus", refreshToday);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshToday);
    };
  }, []);

  useEffect(() => {
    const entry = data.journal[selectedDay];
    setJournalText(entry?.text ?? "");
    setJournalMood(entry?.mood ?? null);
    setJournalSaved(false);
  }, [data.journal, selectedDay]);

  const selectedCounts = habitCounts(data, selectedDay, today);
  const todayCounts = habitCounts(data, today, today);
  const visibleHabits = data.habits.filter((habit) => habitStatusOf(data, habit, selectedDay, today) !== "unscheduled");
  const journalDirty = journalText !== (data.journal[selectedDay]?.text ?? "") || journalMood !== (data.journal[selectedDay]?.mood ?? null);
  const historyDays = habitMonthDays(historyMonth);
  const historySummary = useMemo(() => {
    const days = historyDays.filter((day): day is string => day !== null && day <= today);

    return days.reduce((total, day) => {
      const count = habitCounts(data, day, today);

      return {
        done: total.done + count.done,
        missed: total.missed + count.missed,
      };
    }, { done: 0, missed: 0 });
  }, [data, historyDays, today]);

  async function reload() {
    setLoading(true);
    try {
      setData(await getHabitData());
      setError("");
    } catch (loadError) {
      console.error(loadError);
      setError("Kunde inte hämta vanor just nu.");
    } finally {
      setLoading(false);
    }
  }

  async function saveHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = habitName.trim();
    if (!name || !habitDays.length || saving) return;

    setSaving(true);
    try {
      if (editingHabitId) {
        await renameHabit(editingHabitId, name);
      } else {
        await addHabit({ name, weekdays: habitDays, created: today });
      }

      setHabitName("");
      setHabitDays([0, 1, 2, 3, 4, 5, 6]);
      setEditingHabitId(null);
      await reload();
    } catch (saveError) {
      console.error(saveError);
      setError(getHabitSaveError(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function recordHabit(habit: Habit, status: HabitCheckStatus) {
    if (selectedDay > today || saving) return;

    const current = data.checks[habit.id]?.[selectedDay];
    const nextStatus = current === status ? null : status;
    setSaving(true);
    try {
      await setHabitCheck(habit.id, selectedDay, nextStatus);
      await reload();
    } catch (saveError) {
      console.error(saveError);
      setError("Markeringen kunde inte sparas.");
    } finally {
      setSaving(false);
    }
  }

  async function pauseHabit(habit: Habit) {
    if (saving) return;

    setSaving(true);
    try {
      await toggleHabitPause(habit.id, today);
      await reload();
    } catch (saveError) {
      console.error(saveError);
      setError("Pausen kunde inte sparas.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHabit(habit: Habit) {
    if (saving) return;

    setSaving(true);
    try {
      await deleteHabit(habit.id);
      await reload();
    } catch (saveError) {
      console.error(saveError);
      setError("Vanan kunde inte tas bort.");
    } finally {
      setSaving(false);
    }
  }

  async function saveJournal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      await saveJournalEntry(selectedDay, journalText, journalMood);
      await reload();
      setJournalSaved(true);
    } catch (saveError) {
      console.error(saveError);
      setError("Dagboken kunde inte sparas.");
    } finally {
      setSaving(false);
    }
  }

  function startEditingHabit(habit: Habit) {
    setHabitName(habit.name);
    setHabitDays(habit.weekdays);
    setEditingHabitId(habit.id);
    setShowManager(true);
  }

  function selectTab(nextTab: HabitTab) {
    if (journalDirty && tab === "journal") {
      setError("Spara dagboksanteckningen innan du byter flik.");
      return;
    }

    setError("");
    setTab(nextTab);
  }

  function selectDay(day: string) {
    if (day > today) return;
    if (journalDirty && tab === "journal" && day !== selectedDay) {
      setError("Spara dagboksanteckningen innan du byter dag.");
      return;
    }

    setError("");
    setSelectedDay(day);
  }

  return (
    <div className="habits-section">
      {error && (
        <div className="habit-alert" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} type="button"><X size={15}/></button>
        </div>
      )}

      <section className="habit-hero panel">
        <div>
          <span>En dag i taget</span>
          <h3>{tab === "today" ? "Dina vanor." : tab === "history" ? "Din kalender." : "Din dagbok."}</h3>
          <p>Små steg som inte behöver vara perfekta. Kolla av idag, se vad som missats tidigare och skriv några rader när du vill.</p>
        </div>
        <div className="habit-score-card">
          <small>Idag</small>
          <strong>{todayCounts.done}<em>/ {todayCounts.total}</em></strong>
          <span>{todayCounts.pending ? `${todayCounts.pending} kvar idag` : todayCounts.total ? "Allt klart för idag" : "Inga vanor planerade"}</span>
        </div>
      </section>

      <div className="habit-tabs" role="tablist" aria-label="Vanor">
        <button className={tab === "today" ? "active" : ""} onClick={() => selectTab("today")} type="button"><Check size={16}/> Idag</button>
        <button className={tab === "history" ? "active" : ""} onClick={() => selectTab("history")} type="button"><CalendarDays size={16}/> Historik</button>
        <button className={tab === "journal" ? "active" : ""} onClick={() => selectTab("journal")} type="button"><BookOpen size={16}/> Dagbok</button>
        <button onClick={() => setShowManager((value) => !value)} type="button"><SlidersHorizontal size={16}/> Hantera</button>
      </div>

      {showManager && (
        <section className="habit-manager panel">
          <div className="habit-manager-heading">
            <div>
              <span>Hantera vanor</span>
              <b>{editingHabitId ? "Redigera vana" : "Skapa en vana"}</b>
              <small>Pausa en vana utan att gamla dagar räknas om. Historiken ligger kvar.</small>
            </div>
          </div>
          <form onSubmit={saveHabit} className="habit-form">
            <input maxLength={70} placeholder="Till exempel: Ta en promenad" value={habitName} onChange={(event) => setHabitName(event.target.value)} />
            <div className="habit-weekday-grid">
              {habitWeekdays.map((weekday) => (
                <button
                  className={habitDays.includes(weekday.n) ? "selected" : ""}
                  key={weekday.n}
                  onClick={() => setHabitDays((current) => current.includes(weekday.n) ? current.filter((day) => day !== weekday.n) : [...current, weekday.n])}
                  type="button"
                >
                  {weekday.label}
                </button>
              ))}
            </div>
            <button disabled={saving || !habitName.trim() || !habitDays.length} type="submit">
              <Plus size={16}/> {saving ? "Sparar..." : editingHabitId ? "Spara vana" : "Skapa vana"}
            </button>
            {editingHabitId && <button className="secondary-action" onClick={() => { setEditingHabitId(null); setHabitName(""); }} type="button">Avbryt</button>}
          </form>

          <div className="habit-manage-list">
            {data.habits.map((habit) => (
              <div key={habit.id}>
                <span>
                  <b>{habit.name}</b>
                  <small>{isHabitPaused(habit) ? "Pausad" : getHabitScheduleLabel(habit.weekdays)}</small>
                </span>
                <button onClick={() => startEditingHabit(habit)} type="button"><Edit3 size={15}/> Redigera</button>
                <button onClick={() => pauseHabit(habit)} type="button">
                  {isHabitPaused(habit) ? <Play size={15}/> : <Pause size={15}/>}
                  {isHabitPaused(habit) ? "Återuppta" : "Pausa"}
                </button>
                <button className="danger-action" onClick={() => removeHabit(habit)} type="button"><Trash2 size={15}/></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="panel habit-empty">Hämtar dina vanor...</div>
      ) : tab === "today" ? (
        <section className="habit-day-layout">
          <div className="habit-date-row">
            <button onClick={() => selectDay(shiftHabitDay(selectedDay, -7))} type="button"><ChevronLeft size={17}/> Vecka</button>
            <strong>{formatHabitDate(selectedDay, { month: "long", year: "numeric" })}</strong>
            <button disabled={selectedDay >= today} onClick={() => selectDay(shiftHabitDay(selectedDay, 7) > today ? today : shiftHabitDay(selectedDay, 7))} type="button">Vecka <ChevronRight size={17}/></button>
          </div>
          <div className="habit-week-strip">
            {Array.from({ length: 7 }, (_, index) => shiftHabitDay(selectedDay, index - 3)).map((day) => (
              <button className={day === selectedDay ? "active" : ""} disabled={day > today} key={day} onClick={() => selectDay(day)} type="button">
                <small>{formatHabitDate(day, { weekday: "short" }).replace(".", "")}</small>
                <b>{parseHabitDay(day).getDate()}</b>
              </button>
            ))}
          </div>
          {selectedDay !== today && <button className="habit-today-button" onClick={() => selectDay(today)} type="button">Tillbaka till idag</button>}

          <div className="habit-progress panel">
            <span>Dina små steg</span>
            <b>{selectedCounts.done}<em>/ {selectedCounts.total}</em></b>
            <i><strong style={{ width: `${selectedCounts.total ? (selectedCounts.done / selectedCounts.total) * 100 : 0}%` }}/></i>
            <small>{selectedCounts.missed ? `${selectedCounts.missed} missade från tidigare dag` : selectedCounts.pending ? "Du behöver inte göra allt på en gång." : "Snyggt. Dagen är i fas."}</small>
          </div>

          <HabitList data={data} day={selectedDay} today={today} habits={visibleHabits} saving={saving} onRecord={recordHabit} />

          <button className="habit-journal-link panel" onClick={() => selectTab("journal")} type="button">
            <BookOpen size={20}/>
            <span><b>En stund för dig</b><small>Skriv några rader om dagen.</small></span>
            <ChevronRight size={17}/>
          </button>
        </section>
      ) : tab === "history" ? (
        <section className="habit-history-layout">
          <div className="habit-date-row">
            <button onClick={() => setHistoryMonth(moveHabitMonth(historyMonth, -1))} type="button"><ChevronLeft size={17}/> Månad</button>
            <strong>{formatHabitDate(historyMonth, { month: "long", year: "numeric" })}</strong>
            <button disabled={historyMonth.slice(0, 7) >= today.slice(0, 7)} onClick={() => setHistoryMonth(moveHabitMonth(historyMonth, 1))} type="button">Månad <ChevronRight size={17}/></button>
          </div>
          <div className="habit-calendar panel">
            {["M", "T", "O", "T", "F", "L", "S"].map((weekday) => <span key={weekday}>{weekday}</span>)}
            {historyDays.map((day, index) => {
              const count = day ? habitCounts(data, day, today) : null;
              const complete = Boolean(count?.total && count.done === count.total);

              return day ? (
                <button className={`${day === selectedDay ? "active" : ""} ${complete ? "complete" : ""} ${count?.missed ? "missed" : ""}`} disabled={day > today} key={day} onClick={() => selectDay(day)} type="button">
                  <b>{parseHabitDay(day).getDate()}</b>
                  <small>{complete ? "✓" : count?.missed ? "×" : count?.done ? "•" : ""}</small>
                </button>
              ) : <i key={`blank-${index}`}/>;
            })}
          </div>
          <div className="habit-history-summary">
            <div className="panel"><b>{historySummary.done}</b><span>genomförda</span></div>
            <div className="panel"><b>{historySummary.missed}</b><span>missade</span></div>
          </div>
          <h3>{formatHabitDate(selectedDay, { day: "numeric", month: "long" })}</h3>
          <HabitList data={data} day={selectedDay} today={today} habits={visibleHabits} saving={saving} onRecord={recordHabit} />
        </section>
      ) : (
        <section className="habit-journal-layout">
          <div className="habit-date-row">
            <button onClick={() => selectDay(shiftHabitDay(selectedDay, -1))} type="button"><ChevronLeft size={17}/> Dag</button>
            <strong>{selectedDay === today ? "Idag" : formatHabitDate(selectedDay, { day: "numeric", month: "long" })}</strong>
            <button disabled={selectedDay >= today} onClick={() => selectDay(shiftHabitDay(selectedDay, 1))} type="button">Dag <ChevronRight size={17}/></button>
          </div>
          <form className="habit-journal-form panel" onSubmit={saveJournal}>
            <span>{formatHabitDate(selectedDay, { day: "numeric", month: "long" }).toUpperCase()}</span>
            <b>Hur känns det idag?</b>
            <div className="habit-mood-grid">
              {habitMoods.map((mood, index) => (
                <button className={journalMood === index + 1 ? "selected" : ""} key={mood} onClick={() => { setJournalMood(journalMood === index + 1 ? null : index + 1); setJournalSaved(false); }} type="button">
                  {mood}
                </button>
              ))}
            </div>
            <textarea placeholder="Vad gick bra? Vad behöver du imorgon?" value={journalText} onChange={(event) => { setJournalText(event.target.value); setJournalSaved(false); }} />
            <button disabled={saving || !journalDirty} type="submit"><Check size={16}/> {saving ? "Sparar..." : "Spara anteckning"}</button>
            <small>{journalDirty ? "Osparade ändringar — spara innan du byter dag." : journalSaved ? "Sparat." : "Dina ord, din egen plats."}</small>
          </form>
          <div className="habit-journal-list">
            {Object.entries(data.journal)
              .filter(([date]) => date !== selectedDay)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 8)
              .map(([date, entry]) => (
                <article className="panel" key={date}>
                  <span>{formatHabitDate(date, { day: "numeric", month: "long", year: "numeric" })}</span>
                  {entry.mood && <small>{habitMoods[entry.mood - 1]}</small>}
                  {entry.text && <p>{entry.text}</p>}
                </article>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function HabitList({
  data,
  day,
  today,
  habits,
  saving,
  onRecord,
}: {
  data: HabitData;
  day: string;
  today: string;
  habits: Habit[];
  saving: boolean;
  onRecord: (habit: Habit, status: HabitCheckStatus) => void;
}) {
  if (!habits.length) {
    return (
      <div className="panel habit-empty">
        <Circle size={24}/>
        <b>Plats för dina vanor</b>
        <span>{data.habits.length ? "Inga vanor är planerade den här dagen." : "Lägg till det du vill göra regelbundet. Varje liten handling räknas."}</span>
      </div>
    );
  }

  return (
    <div className="habit-list">
      {habits.map((habit) => {
        const status = habitStatusOf(data, habit, day, today);
        const done = status === "done";
        const skipped = status === "skipped";
        const missed = status === "missed";

        return (
          <article className={`habit-row panel ${done ? "done" : ""} ${missed ? "missed" : ""}`} key={habit.id}>
            <button disabled={saving || day > today} onClick={() => onRecord(habit, "done")} type="button">
              {done ? <Check size={20}/> : missed ? <X size={20}/> : <Circle size={20}/>}
            </button>
            <span>
              <b>{habit.name}</b>
              <small>{statusLabels[status]}</small>
            </span>
            <button className={skipped ? "active" : ""} disabled={saving || day > today} onClick={() => onRecord(habit, "skipped")} type="button">
              {skipped ? <RotateCcw size={17}/> : <Minus size={17}/>}
              <small>{skipped ? "Ångra" : "Hoppa"}</small>
            </button>
          </article>
        );
      })}
    </div>
  );
}
