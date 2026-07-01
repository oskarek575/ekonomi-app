"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import {
  getBudgets,
  addBudget,
  updateBudget,
  deleteBudget,
  getCategories,
} from "../lib/api";

import {
  Budget,
  Category,
} from "../types/database";

import BudgetList from "../components/budgets/BudgetList";
import AddBudgetModal from "../components/budgets/AddBudgetModal";
import EditBudgetModal from "../components/budgets/EditBudgetModal";
import DeleteBudgetModal from "../components/budgets/DeleteBudgetModal";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedBudget, setSelectedBudget] =
    useState<Budget | null>(null);

  async function loadBudgets() {
    try {
      const data = await getBudgets();
      setBudgets(data);
    } catch (error) {
      console.log(error);
    }
  }

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    loadBudgets();
    loadCategories();
  }, []);

  async function handleAddBudget(
    category: string,
    monthly_budget: number
  ) {
    try {
      await addBudget(category, monthly_budget);

      await loadBudgets();

      setAddModalOpen(false);
    } catch (error) {
      console.log(error);
    }
  }

  function handleEdit(budget: Budget) {
    setSelectedBudget(budget);
    setEditModalOpen(true);
  }

  async function handleSave(
    id: number,
    category: string,
    monthly_budget: number
  ) {
    try {
      await updateBudget(
        id,
        category,
        monthly_budget
      );

      await loadBudgets();

      setEditModalOpen(false);
      setSelectedBudget(null);

    } catch (error) {
      console.log(error);
    }
  }

  function handleDeleteClick(budget: Budget) {
    setSelectedBudget(budget);
    setDeleteModalOpen(true);
  }

  async function handleDelete(id: number) {
    try {
      await deleteBudget(id);

      await loadBudgets();

      setDeleteModalOpen(false);
      setSelectedBudget(null);

    } catch (error) {
      console.log(error);
    }
  }

  const totalBudget = budgets.reduce(
    (sum, budget) => sum + budget.monthly_budget,
    0
  );

  const averageBudget =
    budgets.length > 0
      ? Math.round(totalBudget / budgets.length)
      : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">

      <div className="flex justify-between items-center mb-10">

        <div>
          <h1 className="text-4xl font-bold">
            💰 Budgetar
          </h1>

          <p className="text-zinc-400 mt-2">
            Hantera dina månadsbudgetar
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="
            flex
            items-center
            gap-2
            bg-green-600
            hover:bg-green-500
            px-5
            py-3
            rounded-xl
            transition
          "
        >
          <Plus size={20} />
          Ny budget
        </button>

      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <p className="text-zinc-400">
            Antal budgetar
          </p>

          <h2 className="text-4xl font-bold mt-2">
            {budgets.length}
          </h2>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <p className="text-zinc-400">
            Total budget
          </p>

          <h2 className="text-4xl font-bold mt-2 text-green-400">
            {totalBudget.toLocaleString("sv-SE")} kr
          </h2>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <p className="text-zinc-400">
            Genomsnitt
          </p>

          <h2 className="text-4xl font-bold mt-2">
            {averageBudget.toLocaleString("sv-SE")} kr
          </h2>
        </div>

      </div>

      <BudgetList
        budgets={budgets}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      <AddBudgetModal
        open={addModalOpen}
        categories={categories}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddBudget}
      />

      <EditBudgetModal
        budget={selectedBudget}
        categories={categories}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedBudget(null);
        }}
        onSave={handleSave}
      />

      <DeleteBudgetModal
        budget={selectedBudget}
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedBudget(null);
        }}
        onConfirm={handleDelete}
      />

    </main>
  );
}