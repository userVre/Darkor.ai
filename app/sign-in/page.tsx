import { SignIn } from "@clerk/nextjs";

type SignInPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

function normalizeRedirectUrl(value: string | undefined): string {
  if (!value) {
    return "/studio";
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
    try {
      const parsed = new URL(decoded);
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return path.startsWith("/") ? path : "/studio";
    } catch {
      return "/studio";
    }
  }

  return decoded.startsWith("/") ? decoded : "/studio";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectUrl = normalizeRedirectUrl(params.redirect_url);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#04070d] px-6 py-16">
      <SignIn forceRedirectUrl={redirectUrl} signUpForceRedirectUrl={redirectUrl} />
    </main>
  );
}
