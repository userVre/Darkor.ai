"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, CreditCard, Receipt, RefreshCcw } from "lucide-react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";

type CurrentUser = {
  plan: string;
  credits: number;
};

type BillingInvoice = {
  _id: string;
  amountCents: number;
  currency: string;
  status: string;
  description?: string;
  receiptUrl?: string;
  invoiceNumber?: string;
  paidAtMs: number;
};

type CreditsPack = {
  key: "starter" | "growth" | "scale";
  label: string;
  credits: number;
};

const packs: CreditsPack[] = [
  { key: "starter", label: "Starter", credits: 50 },
  { key: "growth", label: "Growth", credits: 150 },
  { key: "scale", label: "Scale", credits: 400 },
];

const PLAN_ALLOWANCE: Record<string, number> = {
  pro: 100,
  premium: 500,
  ultra: 2000,
  free: 0,
};

export default function BillingPage() {
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [activePack, setActivePack] = useState<CreditsPack["key"] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const me = useQuery("users:me" as any) as CurrentUser | null | undefined;
  const invoices = useQuery("billing:getMyInvoices" as any) as BillingInvoice[] | undefined;

  const normalizedPlan = (me?.plan ?? "free").toLowerCase();
  const planCredits = PLAN_ALLOWANCE[normalizedPlan] ?? 0;
  const currentCredits = Number(me?.credits ?? 0);
  const creditsProgress = planCredits > 0 ? Math.min(100, (currentCredits / planCredits) * 100) : 0;

  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }),
    [],
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const openPortal = async () => {
    try {
      setIsPortalLoading(true);
      const response = await fetch("/api/polar/portal", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data?.portalUrl) {
        throw new Error(data?.error ?? "Could not open customer portal");
      }
      window.location.href = data.portalUrl;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not open customer portal");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const buyCredits = async (pack: CreditsPack["key"]) => {
    try {
      setActivePack(pack);
      const response = await fetch("/api/polar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType: "credits", pack }),
      });
      const data = await response.json();
      if (!response.ok || !data?.checkoutUrl) {
        throw new Error(data?.error ?? "Could not create checkout");
      }
      window.location.href = data.checkoutUrl;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not create checkout");
      setActivePack(null);
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-zinc-950 px-6 py-10 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Billing &amp; Subscription</h1>
          <p className="mt-2 text-zinc-400">Manage your plan, monitor credits, and review receipts.</p>
        </div>

        {toast && (
          <div className="fixed right-6 top-24 z-50 rounded-xl border border-white/15 bg-zinc-900/95 px-4 py-2 text-sm shadow-xl backdrop-blur">
            {toast}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-fuchsia-400/25 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),rgba(9,9,11,0.94)_45%)] p-6 shadow-[0_0_40px_rgba(217,70,239,0.2)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200/80">Current Plan</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {(me?.plan ?? "Free").toString().charAt(0).toUpperCase() + (me?.plan ?? "Free").toString().slice(1)}
              </h2>
              <p className="mt-1 text-sm text-zinc-300">Your billing and subscriptions are managed securely with Polar.</p>
            </div>

            <button
              type="button"
              onClick={openPortal}
              disabled={isPortalLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-500/80 to-purple-500/80 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" />
              {isPortalLoading ? "Opening Portal..." : "Manage Subscription"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Remaining Credits</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {currentCredits} {planCredits > 0 ? `/ ${planCredits}` : ""}
              </p>
            </div>
            <p className="text-sm text-zinc-400">Live from Convex</p>
          </div>

          <div className="h-4 overflow-hidden rounded-full border border-white/10 bg-zinc-950">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${creditsProgress}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-500"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur">
          <div className="mb-5 flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-fuchsia-300" />
            <h3 className="text-lg font-semibold text-white">Quick Refill</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {packs.map((pack) => (
              <article key={pack.key} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{pack.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">+{pack.credits} credits</p>
                <button
                  type="button"
                  onClick={() => buyCredits(pack.key)}
                  disabled={activePack !== null}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/10 px-4 py-2.5 text-sm font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activePack === pack.key ? "Redirecting..." : "Buy Extra Credits"}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur">
          <div className="mb-5 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-fuchsia-300" />
            <h3 className="text-lg font-semibold text-white">Invoice History</h3>
          </div>

          {invoices === undefined && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-white/10 bg-zinc-800/70" />
              ))}
            </div>
          )}

          {invoices !== undefined && invoices.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 text-sm text-zinc-400">
              No invoices yet. Your receipts will appear here after successful payments.
            </div>
          )}

          {invoices !== undefined && invoices.length > 0 && (
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const paidAt = new Date(invoice.paidAtMs);
                const amount = money.format((Number(invoice.amountCents) || 0) / 100);

                return (
                  <div
                    key={invoice._id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{invoice.description ?? "Darkor Billing"}</p>
                      <p className="text-xs text-zinc-400">
                        {invoice.invoiceNumber ? `${invoice.invoiceNumber} • ` : ""}
                        {paidAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                        {invoice.status}
                      </span>
                      <span className="text-sm font-semibold text-zinc-100">{amount}</span>
                      {invoice.receiptUrl ? (
                        <a
                          href={invoice.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-fuchsia-300/50 hover:text-white"
                        >
                          Receipt
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

