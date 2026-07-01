"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

import {
  getSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  generateSubscriptionsForCurrentMonth,
} from "../lib/api";

import { Subscription } from "../types/database";

import AddSubscriptionModal from "../components/subscriptions/AddSubscriptionModal";
import EditSubscriptionModal from "../components/subscriptions/EditSubscriptionModal";
import DeleteSubscriptionModal from "../components/subscriptions/DeleteSubscriptionModal";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);

  async function loadSubscriptions() {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function handleAdd(
    name: string,
    amount: number,
    category: string,
    day_of_month: number
  ) {
    try {
      await addSubscription(
        name,
        amount,
        category,
        day_of_month
      );

      await loadSubscriptions();
      setAddOpen(false);
    } catch (error) {
      console.log(error);
    }
  }

  function handleEdit(subscription: Subscription) {
    setSelectedSubscription(subscription);
    setEditOpen(true);
  }

  async function handleSave(
    id: number,
    name: string,
    amount: number,
    category: string,
    day_of_month: number,
    active: boolean
  ) {
    try {
      await updateSubscription(
        id,
        name,
        amount,
        category,
        day_of_month,
        active
      );

      await loadSubscriptions();

      setEditOpen(false);
      setSelectedSubscription(null);
    } catch (error) {
      console.log(error);
    }
  }

  function handleDelete(subscription: Subscription) {
    setSelectedSubscription(subscription);
    setDeleteOpen(true);
  }

  async function handleConfirmDelete(id: number) {
    try {
      await deleteSubscription(id);

      await loadSubscriptions();

      setDeleteOpen(false);
      setSelectedSubscription(null);
    } catch (error) {
      console.log(error);
    }
  }
async function handleGenerate() {
  try {
    await generateSubscriptionsForCurrentMonth();

    alert("✅ Månadens utgifter skapades!");
  } catch (error) {
    console.log(error);
  }
}
  const totalMonthly = subscriptions.reduce(
    (sum, subscription) => sum + Number(subscription.amount),
    0
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">

      <div className="flex justify-between items-center mb-10">

        <div>

          <h1 className="text-4xl font-bold">
            🔄 Återkommande utgifter
          </h1>

          <p className="text-zinc-400 mt-2">
            Hantera dina fasta månadsutgifter
          </p>

        </div>

        <div className="flex gap-3">

  <button
    onClick={handleGenerate}
    className="bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-xl transition"
  >
    🔄 Skapa månadens utgifter
  </button>

  <button
    onClick={() => setAddOpen(true)}
    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-5 py-3 rounded-xl transition"
  >
    <Plus size={20} />
    Ny utgift
  </button>

</div>

      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">

          <p className="text-zinc-400">
            Antal abonnemang
          </p>

          <h2 className="text-4xl font-bold mt-2">
            {subscriptions.length}
          </h2>

        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">

          <p className="text-zinc-400">
            Månadskostnad
          </p>

          <h2 className="text-4xl font-bold mt-2 text-red-400">
            {totalMonthly.toLocaleString("sv-SE")} kr
          </h2>

        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">

          <p className="text-zinc-400">
            Aktiva
          </p>

          <h2 className="text-4xl font-bold mt-2 text-green-400">
            {subscriptions.filter((s) => s.active).length}
          </h2>

        </div>

      </div>

      <div className="space-y-4">

        {subscriptions.map((subscription) => (

          <div
            key={subscription.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex justify-between items-center"
          >

            <div>

              <h2 className="text-xl font-bold">
                {subscription.name}
              </h2>

              <p className="text-zinc-400 mt-1">
                {subscription.category}
              </p>

              <p className="text-zinc-500 text-sm mt-1">
                Dag {subscription.day_of_month}
              </p>

            </div>

            <div className="flex items-center gap-6">

              <div className="text-right">

                <h2 className="text-2xl font-bold text-red-400">
                  {Number(subscription.amount).toLocaleString("sv-SE")} kr
                </h2>

                <p
                  className={
                    subscription.active
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {subscription.active ? "Aktiv" : "Inaktiv"}
                </p>

              </div>

              <button
                onClick={() => handleEdit(subscription)}
                className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl"
              >
                <Pencil size={18} />
              </button>

              <button
                onClick={() => handleDelete(subscription)}
                className="bg-red-600 hover:bg-red-500 p-3 rounded-xl"
              >
                <Trash2 size={18} />
              </button>

            </div>

          </div>

        ))}

      </div>

      <AddSubscriptionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
      />

      <EditSubscriptionModal
        subscription={selectedSubscription}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedSubscription(null);
        }}
        onSave={handleSave}
      />

      <DeleteSubscriptionModal
        subscription={selectedSubscription}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedSubscription(null);
        }}
        onConfirm={handleConfirmDelete}
      />

    </main>
  );
}