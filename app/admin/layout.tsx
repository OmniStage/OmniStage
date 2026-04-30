"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menu = [
    { name: "Dashboard", href: "/admin" },
    { name: "Clientes / Empresas", href: "/admin/clientes" },
    { name: "Redes / Franquias", href: "/admin/redes" },
    { name: "Eventos", href: "/admin/eventos" },
    { name: "Usuários", href: "/admin/usuarios" },
    { name: "Usuários x Redes", href: "/admin/usuarios-rede" },
    { name: "Planos", href: "/admin/planos" },
    { name: "Configurações", href: "/admin/configuracoes" },
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
          🟣 Admin OmniStage
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
                    ? "linear-gradient(135deg, #7c3aed, #4c1d95)"
                    : "transparent",
                  fontWeight: 600,
                  transition: "all 0.2s",
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
            "radial-gradient(circle at top left, rgba(124,58,237,0.25), transparent 28%), linear-gradient(135deg, #030712, #0f172a)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
