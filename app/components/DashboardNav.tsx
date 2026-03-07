"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard/pro", label: "Pro Workspace" },
  { href: "/dashboard/workspace", label: "Workspace" },
  { href: "/dashboard/gallery", label: "Gallery" },
  { href: "/dashboard/billing", label: "Billing" },
] as const;

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-6">
        <Link href="/dashboard/pro" className="text-lg font-semibold tracking-tight text-zinc-100">
          Darkor<span className="text-fuchsia-300">.ai</span>
        </Link>

        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 p-1">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-fuchsia-500/85 to-purple-500/85 text-white shadow-[0_0_18px_rgba(217,70,239,0.35)]"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
