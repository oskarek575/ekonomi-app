"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getPurchases,
  deletePurchase,
  updatePurchase,
  getCategories,
} from "../lib/api";

import PurchaseList from "../components/purchases/PurchaseList";
import EditPurchaseModal from "../components/purchases/EditPurchaseModal";
import DeletePurchaseModal from "../components/purchases/DeletePurchaseModal";

import {
  Purchase,
  Category,
} from "../types/database";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alla");
  const [sortBy, setSortBy] = useState("Nyast");

  const [selectedPurchase, setSelectedPurchase] =
    useState<Purchase | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function loadPurchases() {
    try {
      const data = await getPurchases(
        selectedMonth,
        selectedYear
      );

      setPurchases(data);
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
    loadPurchases();
    loadCategories();
  }, []);

  function handleEdit(purchase: Purchase) {
    setSelectedPurchase(purchase);
    setEditOpen(true);
  }

  function handleDeleteClick(purchase: Purchase) {
    setSelectedPurchase(purchase);
    setDeleteOpen(true);
  }

  async function handleDelete(id: number) {
    try {
      await deletePurchase(id);

      await loadPurchases();

      setDeleteOpen(false);
      setSelectedPurchase(null);
    } catch (error) {
      console.log(error);
    }
  }

  async function handleSave(
    id: number,
    beskrivning: string,
    belopp: number,
    kategori: string
  ) {
    try {
      await updatePurchase(
        id,
        beskrivning,
        belopp,
        kategori
      );

      await loadPurchases();

      setEditOpen(false);
      setSelectedPurchase(null);
    } catch (error) {
      console.log(error);
    }
  }

  const filteredPurchases = useMemo(() => {
    let result = [...purchases];

    if (search.trim() !== "") {
      result = result.filter((purchase) =>
        purchase.beskrivning
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    if (category !== "Alla") {
      result = result.filter(
        (purchase) => purchase.kategori === category
      );
    }

    switch (sortBy) {
      case "Äldst":
        result.sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );
        break;

      case "Högst belopp":
        result.sort((a, b) => b.belopp - a.belopp);
        break;

      case "Lägst belopp":
        result.sort((a, b) => a.belopp - b.belopp);
        break;

      default:
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
    }

    return result;
  }, [purchases, search, category, sortBy]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">

      <div className="mb-10">

        <h1 className="text-4xl font-bold">
          🛒 Alla köp
        </h1>

        <p className="text-zinc-400 mt-2">
          Hantera alla dina köp
        </p>

      </div>

      <div className="grid grid-cols-12 gap-4 mb-8">

        <div className="col-span-6">

          <input
            type="text"
            placeholder="🔍 Sök köp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full
              bg-zinc-900
              border
              border-zinc-800
              rounded-xl
              p-4
              outline-none
              focus:border-green-500
            "
          />

        </div>

        <div className="col-span-3">

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="
              w-full
              bg-zinc-900
              border
              border-zinc-800
              rounded-xl
              p-4
            "
          >
            <option value="Alla">Alla</option>

            {categories.map((cat) => (
              <option
                key={cat.id}
                value={cat.name}
              >
                {cat.icon} {cat.name}
              </option>
            ))}

          </select>

        </div>

        <div className="col-span-3">

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="
              w-full
              bg-zinc-900
              border
              border-zinc-800
              rounded-xl
              p-4
            "
          >
            <option>Nyast</option>
            <option>Äldst</option>
            <option>Högst belopp</option>
            <option>Lägst belopp</option>
          </select>

        </div>

      </div>

      <PurchaseList
        purchases={filteredPurchases}
        onEdit={handleEdit}
        onDelete={(id) => {
          const purchase = purchases.find(
            (p) => p.id === id
          );

          if (purchase) {
            handleDeleteClick(purchase);
          }
        }}
      />

      <EditPurchaseModal
        purchase={selectedPurchase}
        categories={categories}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedPurchase(null);
        }}
        onSave={handleSave}
      />

      <DeletePurchaseModal
        purchase={selectedPurchase}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedPurchase(null);
        }}
        onConfirm={handleDelete}
      />

    </main>
  );
}