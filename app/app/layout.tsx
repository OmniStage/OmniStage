"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menu = [
    { name: "Dashboard", href: "/app/dashboard" },
    { name: "Eventos", href: "/app/eventos" },
    { name: "Convidados", href: "/app/convidados" },
    { name: "Convite Digital", href: "/app/convite" },
    { name: "RSVP", href: "/app/rsvp" },
    { name: "Check-in / Totem", href: "/app/checkin" },
    { name: "Envios", href: "/app/envios" },
    { name: "Relatórios", href: "/app/relatorios" },
    { name: "Configurações", href: "/app/configuracoes" },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      {/* MENU LATERAL */}
      <aside
        style={{
          width: 260,
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          padding: 20,
          boxShadow: "1px 0 3px rgba(15,23,42,0.04)",
        }}
      >
        <h2
          style={{
            color: "#0f172a",
            marginBottom: 30,
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          <span style={{ color: "#6d28d9" }}>●</span> OmniStage App
        </h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {menu.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: active ? "#6d28d9" : "#64748b",
                  background: active ? "#ede9fe" : "transparent",
                  border: active
                    ? "1px solid rgba(109,40,217,0.18)"
                    : "1px solid transparent",
                  fontWeight: 700,
                }}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main
        style={{
          flex: 1,
          padding: 40,
          background: "#f8fafc",
        }}
      >
        {children}
      </main>
    </div>
  );
}
