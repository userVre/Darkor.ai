import { ReactNode } from "react";
import DashboardNav from "../components/DashboardNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <DashboardNav />
      {children}
    </div>
  );
}
