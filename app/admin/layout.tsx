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
    { name: "Dashboard", href: "/admin", icon: "⌁" },
    { name: "Clientes / Empresas", href: "/admin/clientes", icon: "◌" },
    { name: "Redes / Franquias", href: "/admin/redes", icon: "◎" },
    { name: "Eventos", href: "/admin/eventos", icon: "◇" },
    { name: "Modelos de Convite", href: "/admin/modelos-convites", icon: "▣" },
    { name: "Usuários", href: "/admin/usuarios", icon: "◉" },
    { name: "Usuários x Redes", href: "/admin/usuarios-rede", icon: "⟡" },
    { name: "Planos", href: "/admin/planos", icon: "◆" },
    { name: "Configurações", href: "/admin/configuracoes", icon: "⚙" },
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
      <style>{`
        .admin-sidebar {
          scrollbar-width: thin;
          scrollbar-color: rgba(124, 58, 237, 0.24) transparent;
        }

        .admin-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 46px;
          padding: 12px 14px;
          border-radius: 16px;
          text-decoration: none;
          color: #64748b;
          background: transparent;
          font-weight: 850;
          line-height: 1.12;
          overflow: hidden;
          isolation: isolate;
          transition:
            color 170ms ease,
            background 170ms ease,
            transform 190ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease;
        }

        .admin-nav-link::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          background:
            radial-gradient(circle at 12% 50%, rgba(124,58,237,0.13), transparent 38%),
            linear-gradient(135deg, rgba(237,233,254,0.9), rgba(245,243,255,0.9));
          opacity: 0;
          transition: opacity 170ms ease;
        }

        .admin-nav-link::after {
          content: "";
          position: absolute;
          left: 6px;
          top: 50%;
          width: 4px;
          height: 22px;
          border-radius: 999px;
          background: linear-gradient(180deg, #7c3aed, #a855f7);
          transform: translateY(-50%) scaleY(0.25);
          opacity: 0;
          transition:
            opacity 180ms ease,
            transform 200ms cubic-bezier(.2,.8,.2,1);
        }

        .admin-nav-link:hover {
          color: #6d28d9;
          transform: translateX(4px);
          box-shadow: 0 12px 26px rgba(15,23,42,0.055);
        }

        .admin-nav-link:hover::before {
          opacity: 1;
        }

        .admin-nav-link:hover .admin-nav-icon {
          background: #ffffff;
          color: #7c3aed;
          box-shadow: 0 8px 18px rgba(124,58,237,0.16);
          transform: scale(1.04);
        }

        .admin-nav-link.active {
          color: #6d28d9;
          background: linear-gradient(135deg, #ede9fe, #f5f3ff);
          box-shadow:
            inset 0 0 0 1px rgba(109,40,217,0.10),
            0 14px 30px rgba(124,58,237,0.12);
        }

        .admin-nav-link.active::after {
          opacity: 1;
          transform: translateY(-50%) scaleY(1);
        }

        .admin-nav-link.active .admin-nav-icon {
          background: #ffffff;
          color: #7c3aed;
          box-shadow: 0 8px 18px rgba(124,58,237,0.16);
        }

        .admin-nav-icon {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 950;
          transition:
            background 170ms ease,
            color 170ms ease,
            box-shadow 170ms ease,
            transform 170ms ease;
        }

        .admin-nav-text {
          flex: 1;
          min-width: 0;
        }

        .admin-logout {
          width: 100%;
          margin-top: 24px;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid rgba(220,38,38,0.18);
          background: #fff1f2;
          color: #991b1b;
          font-weight: 950;
          cursor: pointer;
          transition:
            background 170ms ease,
            transform 190ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease;
        }

        .admin-logout:hover {
          background: #fee2e2;
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(220,38,38,0.10);
        }

        @media (max-width: 900px) {
          .admin-shell {
            flex-direction: column;
          }

          .admin-sidebar {
            position: relative !important;
            width: 100% !important;
            height: auto !important;
          }

          .admin-main {
            padding: 18px !important;
          }
        }
      `}</style>

      <aside className="admin-sidebar" style={sidebarStyle}>
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
                  className={active ? "admin-nav-link active" : "admin-nav-link"}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span className="admin-nav-text">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout} className="admin-logout">
          Sair
        </button>
      </aside>

      <main className="admin-main" style={mainStyle}>{children}</main>
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
  overflowY: "auto",
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

const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: 40,
  background:
    "radial-gradient(circle at 8% 0%, rgba(124,58,237,0.06), transparent 34%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
};
