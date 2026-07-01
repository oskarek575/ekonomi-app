"use client";

import { useEffect, useState } from "react";

import { getSubscriptions } from "../../lib/api";
import { Subscription } from "../../types/database";

export default function UpcomingSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    try {
      const data = await getSubscriptions();

      const active = data
        .filter((s) => s.active)
        .sort(
          (a, b) => a.day_of_month - b.day_of_month
        );

      setSubscriptions(active);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

      <h2 className="text-2xl font-bold mb-6">
        🔔 Kommande betalningar
      </h2>

      <div className="space-y-4">

        {subscriptions.length === 0 && (
          <p className="text-zinc-500">
            Inga aktiva abonnemang.
          </p>
        )}

        {subscriptions.map((subscription) => (

          <div
            key={subscription.id}
            className="flex justify-between items-center"
          >

            <div>

              <h3 className="font-semibold">
                {subscription.name}
              </h3>

              <p className="text-zinc-500 text-sm">
                Dag {subscription.day_of_month}
              </p>

            </div>

            <span className="font-bold text-red-400">
              {Number(subscription.amount).toLocaleString("sv-SE")} kr
            </span>

          </div>

        ))}

      </div>

    </div>
  );
}