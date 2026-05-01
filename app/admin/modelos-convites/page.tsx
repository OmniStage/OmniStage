"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ModelosConvitesAdmin() {
  const [modelos, setModelos] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [background, setBackground] = useState("");
  const [logo, setLogo] = useState("");
  const [musica, setMusica] = useState("");

  async function carregarModelos() {
    const { data } = await supabase
      .from("invite_templates")
      .select("*")
      .order("created_at", { ascending: false });

    setModelos(data || []);
  }

  async function criarModelo() {
    if (!nome || !slug) {
      alert("Preencha nome e slug");
      return;
    }

    const { error } = await supabase.from("invite_templates").insert({
      nome,
      name: nome,
      slug,
      active: true,
      status: "ativo",
      background_url: background,
      logo_url: logo,
      music_url: musica,
    });

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    setNome("");
    setSlug("");
    setBackground("");
    setLogo("");
    setMusica("");

    carregarModelos();
  }

  async function toggleAtivo(id: string, atual: boolean) {
    await supabase
      .from("invite_templates")
      .update({ active: !atual })
      .eq("id", id);

    carregarModelos();
  }

  useEffect(() => {
    carregarModelos();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 36 }}>Modelos de Convite</h1>

      {/* FORM */}
      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input placeholder="Slug (ex: valentina-xv)" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <input placeholder="Background URL" value={background} onChange={(e) => setBackground(e.target.value)} />
        <input placeholder="Logo URL" value={logo} onChange={(e) => setLogo(e.target.value)} />
        <input placeholder="Música URL" value={musica} onChange={(e) => setMusica(e.target.value)} />

        <button onClick={criarModelo}>Criar Modelo</button>
      </div>

      {/* LISTA */}
      <div style={{ marginTop: 40 }}>
        {modelos.map((m) => (
          <div key={m.id} style={{ marginBottom: 20 }}>
            <strong>{m.nome}</strong>
            <p>{m.slug}</p>
            <p>{m.active ? "Ativo" : "Inativo"}</p>

            <button onClick={() => toggleAtivo(m.id, m.active)}>
              {m.active ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
