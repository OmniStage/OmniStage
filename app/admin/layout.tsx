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

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: perfil } = await supabase
        .from("perfis")
        .select("role,status")
        .eq("id", user.id)
        .maybeSingle();

      if (!perfil || perfil.status !== "ativo") {
        router.push("/login");
        return;
      }

      if (perfil.role !== "admin") {
        router.push("/app");
        return;
      }

      setLoading(false);
    }

    checkAccess();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontWeight: 800,
        }}
      >
        Validando acesso...
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <aside style={sidebarStyle}>
        <div>
          <div style={brandStyle}>
            <span style={brandDotStyle} />
            <div>
              <div style={brandTitleStyle}>Admin</div>
              <div style={brandSubtitleStyle}>OmniStage</div>
            </div>
          </div>

          <nav style={navStyle}>
            {menu.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    ...navLinkStyle,
                    ...(active ? navLinkActiveStyle : {}),
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout} style={logoutButtonStyle}>
          Sair
        </button>
      </aside>

      <main style={mainStyle}>{children}</main>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  color: "#0f172a",
};

const sidebarStyle: React.CSSProperties = {
  width: 300,
  background: "rgba(255,255,255,0.92)",
  borderRight: "1px solid #e2e8f0",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "8px 0 30px rgba(15,23,42,0.035)",
  backdropFilter: "blur(14px)",
  position: "sticky",
  top: 0,
  height: "100vh",
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 34,
};

const brandDotStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
  boxShadow: "0 0 0 7px rgba(124,58,237,0.08)",
};

const brandTitleStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 25,
  fontWeight: 950,
  lineHeight: 1,
  letterSpacing: "-0.04em",
};

const brandSubtitleStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 25,
  fontWeight: 950,
  lineHeight: 1.05,
  letterSpacing: "-0.04em",
};

const navStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const navLinkStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: 15,
  textDecoration: "none",
  color: "#64748b",
  background: "transparent",
  fontWeight: 850,
  transition: "all 0.18s ease",
};

const navLinkActiveStyle: React.CSSProperties = {
  color: "#6d28d9",
  background: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
  boxShadow: "inset 0 0 0 1px rgba(109,40,217,0.08)",
};

const logoutButtonStyle: React.CSSProperties = {
  marginTop: 24,
  width: "100%",
  padding: "12px 16px",
  borderRadius: 15,
  border: "1px solid rgba(220,38,38,0.18)",
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 900,
  cursor: "pointer",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: 40,
  background:
    "radial-gradient(circle at 8% 0%, rgba(124,58,237,0.06), transparent 34%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
};
