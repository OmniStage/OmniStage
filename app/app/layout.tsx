"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type ThemeMode = "light" | "dark" | "auto";

type PerfilCliente = {
  nome: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  useEffect(() => {
    const saved = window.localStorage.getItem("omnistage-theme") as ThemeMode | null;
    aplicarTema(saved || "auto");
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    validarAcessoCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validarAcessoCliente() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: perfilEncontrado, error } = await supabase
      .from("perfis")
      .select("nome, email, role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar perfil:", error.message);
      router.push("/login");
      return;
    }

    if (!perfilEncontrado) {
      router.push("/login");
      return;
    }

    if (perfilEncontrado.status !== "ativo") {
      await supabase.auth.signOut();
      window.location.href = "/login";
      return;
    }

    if (perfilEncontrado.role === "admin") {
      router.push("/admin");
      return;
    }

    setPerfil({
      nome:
        perfilEncontrado.nome ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        "Cliente",
      email: perfilEncontrado.email || user.email || null,
      role: perfilEncontrado.role || "cliente",
      status: perfilEncontrado.status || "ativo",
    });

    setLoading(false);
  }

  function aplicarTema(tema: ThemeMode) {
    setThemeMode(tema);
    window.localStorage.setItem("omnistage-theme", tema);

    if (tema === "auto") {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      return;
    }

    document.documentElement.dataset.theme = tema;
  }

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

  const nomeCliente = perfil?.nome || "Cliente";
  const emailCliente = perfil?.email || "";

  return (
    <div className="omni-app-shell">
      <style>{`
        .omni-app-shell {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
        }

        .omni-mobile-topbar {
          display: none;
        }

        .omni-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 300px;
          background: rgba(255,255,255,0.86);
          border-right: 1px solid var(--line);
          padding: 22px;
          z-index: 40;
          backdrop-filter: blur(18px);
          box-shadow: 8px 0 30px rgba(15,23,42,0.035);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .omni-main {
          min-height: 100vh;
          margin-left: 300px;
          padding: 40px;
          background:
            radial-gradient(circle at 10% 0%, rgba(109,40,217,0.025), transparent 34%),
            radial-gradient(circle at 90% 0%, rgba(16,185,129,0.022), transparent 34%),
            #f8fafc;
        }

        .omni-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text);
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.04em;
          margin-bottom: 18px;
        }

        .omni-brand-dot {
          width: 11px;
          height: 11px;
          border-radius: 999px;
          background: #6d28d9;
          box-shadow: 0 0 0 6px rgba(109,40,217,0.08);
        }

        .omni-client-card {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 18px;
          background: rgba(248,250,252,0.86);
          box-shadow: 0 8px 20px rgba(15,23,42,0.035);
        }

        .omni-client-label {
          display: block;
          color: var(--muted);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }

        .omni-client-name {
          color: var(--text);
          font-size: 15px;
          font-weight: 900;
          line-height: 1.25;
          margin-bottom: 5px;
        }

        .omni-client-email {
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          word-break: break-word;
        }

        .omni-theme-box {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 24px;
          background: rgba(248,250,252,0.72);
        }

        .omni-theme-label {
          display: block;
          color: var(--muted);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }

        .omni-theme-select {
          width: 100%;
          border: 1px solid var(--line);
          background: var(--card);
          color: var(--text);
          border-radius: 12px;
          padding: 11px 12px;
          font-weight: 800;
          outline: none;
        }

        .omni-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .omni-nav-link {
          display: block;
          padding: 13px 16px;
          border-radius: 14px;
          text-decoration: none;
          color: var(--muted);
          font-weight: 850;
          transition:
            background 160ms ease,
            color 160ms ease,
            transform 160ms cubic-bezier(.2,.8,.2,1);
        }

        .omni-nav-link:hover {
          background: #f1f5f9;
          color: #6d28d9;
          transform: translateX(2px);
        }

        .omni-nav-link.active {
          background: #ede9fe;
          color: #6d28d9;
          box-shadow: inset 0 0 0 1px rgba(109,40,217,0.08);
        }

        .omni-logout {
          width: 100%;
          margin-top: 18px;
          border: 1px solid rgba(220,38,38,0.18);
          background: #fee2e2;
          color: #991b1b;
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 160ms ease, background 160ms ease;
        }

        .omni-logout:hover {
          background: #fecaca;
          transform: translateY(-1px);
        }

        .omni-overlay {
          display: none;
        }

        @media (max-width: 900px) {
          .omni-mobile-topbar {
            position: sticky;
            top: 0;
            z-index: 35;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255,255,255,0.86);
            border-bottom: 1px solid var(--line);
            backdrop-filter: blur(18px);
          }

          .omni-mobile-brand {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: -0.04em;
            color: var(--text);
          }

          .omni-menu-button {
            width: 42px;
            height: 42px;
            border: 1px solid var(--line);
            background: var(--card);
            color: var(--text);
            border-radius: 14px;
            font-size: 22px;
            font-weight: 900;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(15,23,42,0.05);
          }

          .omni-sidebar {
            width: min(82vw, 320px);
            transform: translateX(-105%);
            transition: transform 230ms cubic-bezier(.2,.8,.2,1);
            box-shadow: 20px 0 60px rgba(15,23,42,0.16);
          }

          .omni-sidebar.open {
            transform: translateX(0);
          }

          .omni-overlay {
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

          .omni-overlay.open {
            opacity: 1;
            pointer-events: auto;
          }

          .omni-main {
            margin-left: 0;
            padding: 16px;
            min-height: calc(100vh - 64px);
            background:
              radial-gradient(circle at 10% 0%, rgba(109,40,217,0.018), transparent 32%),
              #f8fafc;
          }

          .omni-main > * {
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
          .omni-mobile-topbar {
            height: 60px;
            padding: 10px 12px;
          }

          .omni-main {
            padding: 12px;
          }

          .omni-sidebar {
            padding: 18px;
          }

          .omni-nav-link {
            padding: 12px 14px;
            border-radius: 13px;
          }
        }
      `}</style>

      <header className="omni-mobile-topbar">
        <button
          className="omni-menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          ☰
        </button>

        <div className="omni-mobile-brand">
          <span className="omni-brand-dot" />
          OmniStage
        </div>

        <button
          onClick={handleLogout}
          aria-label="Sair"
          className="omni-menu-button"
          style={{ fontSize: 14 }}
        >
          Sair
        </button>
      </header>

      <div
        className={menuOpen ? "omni-overlay open" : "omni-overlay"}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={menuOpen ? "omni-sidebar open" : "omni-sidebar"}>
        <div className="omni-brand">
          <span className="omni-brand-dot" />
          OmniStage App
        </div>

        <div className="omni-client-card">
          <span className="omni-client-label">Cliente logado</span>
          <div className="omni-client-name">{nomeCliente}</div>
          {emailCliente && <div className="omni-client-email">{emailCliente}</div>}
        </div>

        <div className="omni-theme-box">
          <label className="omni-theme-label">Tema</label>
          <select
            className="omni-theme-select"
            value={themeMode}
            onChange={(event) => aplicarTema(event.target.value as ThemeMode)}
          >
            <option value="auto">Automático</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>

        <nav className="omni-nav">
          {menu.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "omni-nav-link active" : "omni-nav-link"}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <button onClick={handleLogout} className="omni-logout">
          Sair
        </button>
      </aside>

      <main className="omni-main">{children}</main>
    </div>
  );
}

