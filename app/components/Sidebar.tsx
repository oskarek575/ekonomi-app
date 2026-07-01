"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Home,
  ShoppingBag,
  Wallet,
  FolderOpen,
  Settings,
  TrendingUp,
} from "lucide-react";

const menuItems = [
  {
    name: "Översikt",
    href: "/",
    icon: Home,
  },
  {
    name: "Köp",
    href: "/purchases",
    icon: ShoppingBag,
  },
  {
    name: "Budgetar",
    href: "/budgets",
    icon: Wallet,
  },
  {
    name: "Kategorier",
    href: "/categories",
    icon: FolderOpen,
  },
  {
    name: "Inställningar",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="
        w-72
        min-h-screen
        bg-zinc-950
        border-r
        border-zinc-800
        flex
        flex-col
        justify-between
        p-6
      "
    >
      <div>

        <div className="flex items-center gap-4 mb-12">

          <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg">
            <TrendingUp size={30} className="text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Oskars
            </h1>

            <p className="text-zinc-400">
              Ekonomi
            </p>
          </div>

        </div>

        <nav className="space-y-3">

          {menuItems.map((item) => {
            const Icon = item.icon;

            const active = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  w-full
                  flex
                  items-center
                  gap-4
                  rounded-xl
                  px-4
                  py-4
                  transition-all
                  duration-300
                  ${
                    active
                      ? "bg-green-500 text-white shadow-lg"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }
                `}
              >
                <Icon size={22} />

                <span className="font-semibold">
                  {item.name}
                </span>
              </Link>
            );
          })}

        </nav>

      </div>

      <div
        className="
          bg-zinc-900
          border
          border-zinc-800
          rounded-2xl
          p-5
        "
      >
        <div className="flex items-center gap-4">

          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-lg font-bold text-white">
            O
          </div>

          <div>
            <p className="font-bold text-white">
              Oskar
            </p>

            <p className="text-zinc-400 text-sm">
              Premium Dashboard
            </p>
          </div>

        </div>
      </div>

    </aside>
  );
}