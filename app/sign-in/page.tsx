import { SignIn } from "@clerk/nextjs";

type SignInPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectUrl = params.redirect_url ?? "/studio";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#04070d] px-6 py-16">
      <SignIn forceRedirectUrl={redirectUrl} signUpForceRedirectUrl={redirectUrl} />
    </main>
  );
}
