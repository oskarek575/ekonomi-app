"use client";

import { useEffect, useState } from "react";

import {
  getBudgets,
  getPurchases,
  addPurchase,
  deletePurchase,
  getProfile,
  getCategories,
} from "../../lib/api";

import {
  Budget,
  Purchase,
  Category,
} from "../../types/database";

import DashboardHeader from "./DashboardHeader";
import DashboardStats from "./DashboardStats"; 
import DashboardCharts from "./DashboardCharts";
import DashboardBottom from "./DashboardBottom";

import AddPurchaseCard from "./AddPurchaseCard";
import FreeMoneyCard from "./FreeMoneyCard";
import AIInsights from "./AIInsights";

export default function Dashboard() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [kop, setKop] = useState<Purchase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [income, setIncome] = useState(0);
  const [savings, setSavings] = useState(0);

  const [beskrivning, setBeskrivning] = useState("");
  const [belopp, setBelopp] = useState("");
  const [kategori, setKategori] = useState("Mat");

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

  async function loadPurchases() {
    const data = await getPurchases(
      selectedMonth,
      selectedYear
    );

    setKop(data);
  }

  async function loadCategories() {
    const data = await getCategories();
    setCategories(data);
  }

  async function loadProfile() {
    const profile = await getProfile();

    setIncome(profile.monthly_income);
    setSavings(profile.monthly_savings);
  }

  useEffect(() => {
    loadBudgets();
    loadPurchases();
    loadCategories();
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

    await loadPurchases();
    await loadBudgets();
  }

  async function taBortKop(id: number) {
    await deletePurchase(id);

    await loadPurchases();
  }

  function previousMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }

  function nextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
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

  return (
   <div className="w-full p-8 overflow-y-auto">

      <div className="grid grid-cols-12 gap-8">

        <div className="col-span-4">

          <AddPurchaseCard
            beskrivning={beskrivning}
            setBeskrivning={setBeskrivning}
            belopp={belopp}
            setBelopp={setBelopp}
            kategori={kategori}
            setKategori={setKategori}
            categories={categories}
            sparaKop={sparaKop}
          />

        </div>

        <div className="col-span-8">

          <DashboardHeader
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            previousMonth={previousMonth}
            nextMonth={nextMonth}
          />

<FreeMoneyCard
  income={income}
  savings={savings}
  budgetTotal={totalBudget}
  spent={totalSpent}
/>

<AIInsights
  budgets={budgets}
  purchases={kop}
  income={income}
  savings={savings}
/>

<DashboardStats
  totalBudget={totalBudget}
  budgetLeft={budgetLeft}
  purchases={kop.length}
  budgets={budgets.length}
/>
          <DashboardCharts
            purchases={kop}
            budgets={budgets}
          />

          <DashboardBottom
            budgets={budgets}
            purchases={kop}
            onDeletePurchase={taBortKop}
          />

        </div>

      </div>

    </div>
  );
}