"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type ThemeMode = "auto" | "light" | "dark";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

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

  function aplicarTema(mode: ThemeMode) {
    setThemeMode(mode);

    if (typeof window === "undefined") return;

    localStorage.setItem("omnistage-theme", mode);

    if (mode === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = prefersDark ? "dark" : "light";
      return;
    }

    document.documentElement.dataset.theme = mode;
  }

  useEffect(() => {
    const savedTheme = (localStorage.getItem("omnistage-theme") as ThemeMode | null) || "auto";
    aplicarTema(savedTheme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      const currentTheme = (localStorage.getItem("omnistage-theme") as ThemeMode | null) || "auto";

      if (currentTheme === "auto") {
        document.documentElement.dataset.theme = media.matches ? "dark" : "light";
      }
    };

    media.addEventListener("change", handleSystemThemeChange);

    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* MENU LATERAL */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          background: "var(--card)",
          borderRight: "1px solid var(--line)",
          padding: 20,
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <h2
          style={{
            color: "var(--text)",
            marginBottom: 24,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          <span style={{ color: "var(--primary)" }}>●</span> OmniStage App
        </h2>

        <div
          style={{
            display: "grid",
            gap: 8,
            marginBottom: 24,
            padding: 10,
            borderRadius: 14,
            border: "1px solid var(--line)",
            background: "var(--bg)",
          }}
        >
          <span
            style={{
              color: "var(--muted)",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Tema
          </span>

          <select
            value={themeMode}
            onChange={(event) => aplicarTema(event.target.value as ThemeMode)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "var(--card)",
              color: "var(--text)",
              fontWeight: 700,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="auto">Automático</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>

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
                  color: active ? "var(--primary)" : "var(--muted)",
                  background: active ? "var(--primary-soft)" : "transparent",
                  border: active ? "1px solid var(--line)" : "1px solid transparent",
                  fontWeight: 700,
                  transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
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
          minWidth: 0,
          width: "100%",
          padding: 40,
          background: "var(--bg)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
