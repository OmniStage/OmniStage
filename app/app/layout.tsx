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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* MENU LATERAL */}
      <aside
        style={{
          width: 260,
          background: "#020617",
          borderRight: "1px solid rgba(148,163,184,0.1)",
          padding: 20,
        }}
      >
        <h2 style={{ color: "#fff", marginBottom: 30 }}>
          🔵 OmniStage App
        </h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  color: active ? "#fff" : "#94a3b8",
                  background: active
                    ? "linear-gradient(135deg, #22c55e, #065f46)"
                    : "transparent",
                  fontWeight: 600,
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
          background:
            "radial-gradient(circle at top left, rgba(34,197,94,0.2), transparent 28%), linear-gradient(135deg, #030712, #0f172a)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
