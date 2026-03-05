"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

export default function AuthNavActions() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <SignInButton mode="modal">
          <button className="rounded-full border border-white/25 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-cyan-300 hover:text-cyan-200">
            Log in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-[#041018] shadow-lg shadow-cyan-500/20 transition hover:brightness-110">
            Start for free
          </button>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/studio"
        className="rounded-full border border-white/25 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-cyan-300 hover:text-cyan-200"
      >
        Studio
      </Link>
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "h-10 w-10 ring-2 ring-cyan-400/40",
            userButtonPopoverCard: "bg-[#0a0f1b] border border-white/10",
          },
        }}
      />
    </div>
  );
}


