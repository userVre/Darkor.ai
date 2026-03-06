import { SignUp } from "@clerk/nextjs";

type SignUpPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectUrl = params.redirect_url ?? "/studio";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#04070d] px-6 py-16">
      <SignUp forceRedirectUrl={redirectUrl} signInForceRedirectUrl={redirectUrl} />
    </main>
  );
}
