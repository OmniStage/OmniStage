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
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
    <div className="admin-shell">
      <style>{`
        .admin-shell {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          color: #0f172a;
        }

        .admin-mobile-topbar {
          display: none;
        }

        .admin-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 300px;
          background: rgba(255,255,255,0.92);
          border-right: 1px solid #e2e8f0;
          padding: 24px;
          z-index: 40;
          backdrop-filter: blur(14px);
          box-shadow: 8px 0 30px rgba(15,23,42,0.035);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .admin-main {
          min-height: 100vh;
          margin-left: 300px;
          padding: 40px;
          background:
            radial-gradient(circle at 8% 0%, rgba(124,58,237,0.06), transparent 34%),
            linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 26px;
          color: #0f172a;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.04em;
          line-height: 1.05;
        }

        .admin-brand-dot {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          box-shadow: 0 0 0 7px rgba(124,58,237,0.08);
          flex: 0 0 auto;
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .admin-nav-link {
          display: block;
          padding: 13px 16px;
          border-radius: 16px;
          text-decoration: none;
          color: #64748b;
          background: transparent;
          font-weight: 900;
          transition:
            background 170ms ease,
            color 170ms ease,
            transform 190ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease;
        }

        .admin-nav-link:hover {
          background: #f1f5f9;
          color: #6d28d9;
          transform: translateX(3px);
        }

        .admin-nav-link.active {
          color: #6d28d9;
          background: linear-gradient(135deg, #ede9fe, #f5f3ff);
          box-shadow: inset 0 0 0 1px rgba(109,40,217,0.08);
        }

        .admin-logout {
          width: 100%;
          margin-top: 22px;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid rgba(220,38,38,0.18);
          background: #fee2e2;
          color: #991b1b;
          font-weight: 950;
          cursor: pointer;
          transition:
            background 170ms ease,
            transform 190ms cubic-bezier(.2,.8,.2,1),
            box-shadow 170ms ease;
        }

        .admin-logout:hover {
          background: #fecaca;
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(220,38,38,0.10);
        }

        .admin-overlay {
          display: none;
        }

        @media (max-width: 900px) {
          .admin-mobile-topbar {
            position: sticky;
            top: 0;
            z-index: 35;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255,255,255,0.92);
            border-bottom: 1px solid #e2e8f0;
            backdrop-filter: blur(18px);
          }

          .admin-mobile-brand {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #0f172a;
            font-size: 18px;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .admin-menu-button {
            width: 42px;
            height: 42px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            color: #0f172a;
            border-radius: 14px;
            font-size: 22px;
            font-weight: 950;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(15,23,42,0.05);
          }

          .admin-sidebar {
            width: min(82vw, 330px);
            transform: translateX(-105%);
            transition: transform 230ms cubic-bezier(.2,.8,.2,1);
            box-shadow: 20px 0 60px rgba(15,23,42,0.16);
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .admin-overlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 38;
            background: rgba(15,23,42,0.26);
            backdrop-filter: blur(4px);
            opacity: 0;
            pointer-events: none;
            transition: opacity 200ms ease;
          }

          .admin-overlay.open {
            opacity: 1;
            pointer-events: auto;
          }

          .admin-main {
            margin-left: 0;
            padding: 16px;
            min-height: calc(100vh - 64px);
            background:
              radial-gradient(circle at 10% 0%, rgba(109,40,217,0.018), transparent 32%),
              #f8fafc;
          }

          .admin-main > * {
            max-width: 100%;
          }

          h1 {
            font-size: 28px !important;
            line-height: 1.08 !important;
            letter-spacing: -0.04em !important;
          }

          h2 {
            font-size: 20px !important;
          }

          button,
          a,
          input,
          select {
            max-width: 100%;
          }
        }

        @media (max-width: 560px) {
          .admin-mobile-topbar {
            height: 60px;
            padding: 10px 12px;
          }

          .admin-main {
            padding: 12px;
          }

          .admin-sidebar {
            padding: 18px;
          }

          .admin-brand {
            font-size: 22px;
            margin-bottom: 22px;
          }

          .admin-nav-link {
            padding: 12px 14px;
            border-radius: 14px;
            font-size: 15px;
          }
        }
      `}</style>

      <header className="admin-mobile-topbar">
        <button
          className="admin-menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          ☰
        </button>

        <div className="admin-mobile-brand">
          <span className="admin-brand-dot" />
          Admin OmniStage
        </div>

        <button
          onClick={handleLogout}
          aria-label="Sair"
          className="admin-menu-button"
          style={{ fontSize: 13 }}
        >
          Sair
        </button>
      </header>

      <div
        className={menuOpen ? "admin-overlay open" : "admin-overlay"}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={menuOpen ? "admin-sidebar open" : "admin-sidebar"}>
        <div>
          <div className="admin-brand">
            <span className="admin-brand-dot" />
            <div>
              <div>Admin</div>
              <div>OmniStage</div>
            </div>
          </div>

          <nav className="admin-nav">
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
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout} className="admin-logout">
          Sair
        </button>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
