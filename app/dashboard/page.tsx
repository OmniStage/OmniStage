"use client";

import { useEffect, useMemo, useState } from "react";
import GuestCard from "@/components/GuestCard";
import { supabase } from "@/lib/supabase";
import type { Guest, GuestStatus } from "@/lib/types";
import { guestName, guestPhone, guestStatus } from "@/lib/types";

const filters: Array<{ key: "todos" | GuestStatus | "faltam"; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "confirmado", label: "Confirmados" },
  { key: "pendente", label: "Pendentes" },
  { key: "entrou", label: "Entraram" },
  { key: "faltam", label: "Faltam entrar" },
  { key: "nao", label: "Não vão" },
];

export default function DashboardPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filter, setFilter] = useState<typeof filters[number]["key"]>("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadGuests() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("guests").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setGuests(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadGuests();
    const channel = supabase
      .channel("guests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, loadGuests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmado = guests.filter((g) => guestStatus(g) === "confirmado").length;
    const pendente = guests.filter((g) => guestStatus(g) === "pendente").length;
    const entrou = guests.filter((g) => guestStatus(g) === "entrou" || g.checkin).length;
    const nao = guests.filter((g) => guestStatus(g) === "nao").length;
    return { total, confirmado, pendente, entrou, nao, faltam: Math.max(confirmado - entrou, 0) };
  }, [guests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return guests.filter((g) => {
      const s = guestStatus(g);
      const entered = s === "entrou" || !!g.checkin;
      const matchFilter = filter === "todos" || (filter === "faltam" ? s === "confirmado" && !entered : filter === s || (filter === "entrou" && entered));
      const hay = `${guestName(g)} ${guestPhone(g)} ${g.grupo || ""} ${g.id} ${g.token || ""}`.toLowerCase();
      return matchFilter && (!q || hay.includes(q));
    });
  }, [guests, filter, search]);

  return (
    <main className="shell">
      <section className="panel">
        <h1 className="title"><span>Lista de convidados</span> / status ao vivo</h1>

        <div className="tabs">
          {filters.map((f) => <button key={f.key} onClick={() => setFilter(f.key)} className={`tab ${filter === f.key ? "active" : ""}`}>{f.label}</button>)}
        </div>

        <div className="stats">
          <div className="stat"><div className="k">Total</div><div className="v">{stats.total}</div></div>
          <div className="stat"><div className="k">Confirmados</div><div className="v" style={{ color: "var(--green)" }}>{stats.confirmado}</div></div>
          <div className="stat"><div className="k">Entraram</div><div className="v" style={{ color: "var(--blue)" }}>{stats.entrou}</div></div>
          <div className="stat"><div className="k">Faltam entrar</div><div className="v" style={{ color: "var(--gold)" }}>{stats.faltam}</div></div>
        </div>

        <div className="tools">
          <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, grupo, telefone ou ID" />
          <div className="count">{filtered.length} itens</div>
        </div>

        {error && <div className="error">Erro ao carregar convidados: {error}</div>}
        {loading && !error && <div className="error">Carregando convidados...</div>}

        <div className="list">
          {!loading && !error && filtered.map((guest) => <GuestCard key={String(guest.id)} guest={guest} />)}
        </div>
      </section>
    </main>
  );
}
