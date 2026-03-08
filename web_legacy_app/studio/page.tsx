import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function StudioPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-[#04070d] px-6 py-24 text-zinc-100">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40">
        <h1 className="text-4xl font-bold">Welcome to Darkor Studio</h1>
        <p className="mt-4 text-zinc-300">
          You are authenticated and ready. This page is protected by Clerk.
          Next: connect your generation workspace, saved projects, and user history.
        </p>
      </div>
    </main>
  );
}
