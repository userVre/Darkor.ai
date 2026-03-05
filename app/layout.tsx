import type { Metadata } from "next";
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
