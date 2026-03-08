import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#04070d] px-6 py-16">
      <SignUp
        path="/sign-up"
        routing="path"
        fallbackRedirectUrl="/dashboard/workspace"
        forceRedirectUrl="/dashboard/workspace"
      />
    </main>
  );
}
