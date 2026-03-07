import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import ConvexClientProvider from "./components/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Darkor.ai - AI Interior Design Generator",
  description:
    "Generate premium interior redesigns instantly with Darkor.ai. Virtual staging, walkthroughs, and 55+ styles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#22d3ee",
              colorBackground: "#04070d",
              colorInputBackground: "#0b1220",
              colorInputText: "#f4f4f5",
              borderRadius: "0.75rem",
            },
          }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/dashboard/workspace"
          signUpFallbackRedirectUrl="/dashboard/workspace"
        >
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

