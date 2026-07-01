import { useEffect, useState } from "react";
import {
  getBudgets,
  getPurchases,
  addPurchase,
  deletePurchase,
  getProfile,
} from "../lib/api";

import { Budget, Purchase } from "../types/database";

export function useDashboard() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [kop, setKop] = useState<Purchase[]>([]);

  const [beskrivning, setBeskrivning] = useState("");
  const [belopp, setBelopp] = useState("");
  const [kategori, setKategori] = useState("Mat");

  const [income, setIncome] = useState(0);
  const [savings, setSavings] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth()
  );

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );

  async function loadBudgets() {
    const data = await getBudgets();
    setBudgets(data);
  }

  async function loadKop() {
    const data = await getPurchases(
      selectedMonth,
      selectedYear
    );

    setKop(data);
  }

  async function loadProfile() {
    const profile = await getProfile();

    setIncome(profile.monthly_income);
    setSavings(profile.monthly_savings);
  }

  useEffect(() => {
    loadBudgets();
    loadKop();
    loadProfile();
  }, [selectedMonth, selectedYear]);

  async function sparaKop() {
    await addPurchase(
      beskrivning,
      Number(belopp),
      kategori
    );

    setBeskrivning("");
    setBelopp("");
    setKategori("Mat");

    await loadKop();
    await loadBudgets();
  }

  async function taBortKop(id: number) {
    await deletePurchase(id);
    await loadKop();
  }

  function previousMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((year) => year - 1);
    } else {
      setSelectedMonth((month) => month - 1);
    }
  }

  function nextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((year) => year + 1);
    } else {
      setSelectedMonth((month) => month + 1);
    }
  }

  const totalBudget = budgets.reduce(
    (sum, budget) => sum + budget.monthly_budget,
    0
  );

  const totalSpent = kop.reduce(
    (sum, purchase) => sum + purchase.belopp,
    0
  );

  const budgetLeft = totalBudget - totalSpent;

  return {
    budgets,
    kop,

    beskrivning,
    setBeskrivning,

    belopp,
    setBelopp,

    kategori,
    setKategori,

    income,
    savings,

    selectedMonth,
    selectedYear,

    previousMonth,
    nextMonth,

    sparaKop,
    taBortKop,

    totalBudget,
    totalSpent,
    budgetLeft,
  };
}