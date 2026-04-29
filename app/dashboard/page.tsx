import { Header } from "@/components/Header";
import { DashboardClient } from "@/componentes/DashboardClient";

export default function DashboardPage() {
  return (
    <main className="page">
      <div className="shell">
        <Header />
        <DashboardClient />
      </div>
    </main>
  );
}
