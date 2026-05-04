"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const menu = [
    { name: "Dashboard", href: "/admin" },
    { name: "Clientes / Empresas", href: "/admin/clientes" },
    { name: "Redes / Franquias", href: "/admin/redes" },
    { name: "Eventos", href: "/admin/eventos" },
    { name: "Modelos de Convite", href: "/admin/modelos-convites" },
    { name: "Usuários", href: "/admin/usuarios" },
    { name: "Usuários x Redes", href: "/admin/usuarios-rede" },
    { name: "Planos", href: "/admin/planos" },
    { name: "Configurações", href: "/admin/configuracoes" },
  ];

  // 🔐 PROTEÇÃO DO ADMIN
  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 🚫 não logado
      if (!user) {
        router.push("/login");
        return;
      }

      // 🔍 busca perfil
      const { data: perfil } = await supabase
        .from("perfis")
        .select("role")
        .eq("id", user.id)
        .single();

      // 🚫 não é admin
      if (!perfil || perfil.role !== "admin") {
        router.push("/app");
        return;
      }

      setLoading(false);
    }

    checkAccess();
  }, []);

  // 🔒 LOADING (evita "flash" do admin)
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "#fff",
        }}
      >
        Validando acesso...
      </div>
    );
  }

  // 🚪 LOGOUT
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 260,
          background: "#020617",
          borderRight: "1px solid rgba(148,163,184,0.1)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
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
        </div>

        {/* 🔴 BOTÃO DE SAIR */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: 20,
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: "#7f1d1d",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </aside>

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
