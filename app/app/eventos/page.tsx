"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  horario: string | null;
  local: string | null;
  endereco: string | null;
  mapa_url: string | null;
  status: string | null;
  cliente_id: string | null;
  status_aprovacao?: string | null;
  ativo?: boolean | null;
  created_at: string | null;
  background_image?: string | null;
  logo_image?: string | null;
  music_file?: string | null;
};

type EventForm = {
  nome: string;
  data_evento: string;
  horario: string;
  local: string;
  endereco: string;
  mapa_url: string;
  status: string;
};

const initialForm: EventForm = {
  nome: "",
  data_evento: "",
  horario: "",
  local: "",
  endereco: "",
  mapa_url: "",
  status: "ativo",
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [form, setForm] = useState<EventForm>(initialForm);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [planoNome, setPlanoNome] = useState<string | null>(null);
  const [limiteEventos, setLimiteEventos] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return eventos.filter((evento) => {
      const statusOk = filtroStatus === "todos" || evento.status === filtroStatus;
      const buscaOk =
        !termo ||
        [evento.nome, evento.local, evento.endereco, evento.status]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(termo));

      return statusOk && buscaOk;
    });
  }, [eventos, busca, filtroStatus]);

  function updateForm(field: keyof EventForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function limparFormulario() {
    setForm(initialForm);
    setBackgroundFile(null);
    setLogoFile(null);
    setMusicFile(null);
    setEditandoId(null);
  }

  function abrirCriacao() {
    limparFormulario();
    setFormAberto(true);
  }

  function cancelarFormulario() {
    limparFormulario();
    setFormAberto(false);
  }

  async function carregarCliente() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      return null;
    }

    const { data, error } = await supabase
      .from("cliente_usuarios")
      .select(`
        cliente_id,
        status,
        clientes:cliente_id (
          id,
          nome,
          plano_id,
          planos:plano_id (
            id,
            nome,
            limite_eventos
          )
        )
      `)
      .eq("usuario_id", user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();

    if (error || !data?.cliente_id) {
      alert("Este usuário ainda não está vinculado a um cliente/empresa.");
      return null;
    }

    const cliente = Array.isArray((data as any).clientes)
      ? (data as any).clientes[0]
      : (data as any).clientes;

    const plano = Array.isArray(cliente?.planos)
      ? cliente?.planos[0]
      : cliente?.planos;

    setClienteId(data.cliente_id);
    setPlanoNome(plano?.nome || null);
    setLimiteEventos(plano?.limite_eventos ?? null);

    return data.cliente_id as string;
  }

  async function carregarEventos(cliente: string) {
    const { data, error } = await supabase
      .from("eventos")
      .select(`
        id,
        nome,
        data_evento,
        horario,
        local,
        endereco,
        mapa_url,
        status,
        cliente_id,
        status_aprovacao,
        ativo,
        created_at,
        background_image,
        logo_image,
        music_file
      `)
      .eq("cliente_id", cliente)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar eventos: " + error.message);
      return;
    }

    setEventos((data || []) as Evento[]);
  }

  async function iniciarTela() {
    const cliente = await carregarCliente();

    if (cliente) {
      await carregarEventos(cliente);
    }
  }

  function slugify(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function uploadArquivo(cliente: string, eventoSlug: string, file: File | null, tipo: string) {
    if (!file) return null;

    const extension = file.name.split(".").pop() || "file";
    const path = `${cliente}/${eventoSlug}/${tipo}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("event-assets")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      throw new Error(`Erro ao subir ${tipo}: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("event-assets").getPublicUrl(path);

    return publicUrl;
  }

  async function salvarEvento() {
    if (!form.nome.trim()) {
      alert("Digite o nome do evento.");
      return;
    }

    let cliente = clienteId;

    if (!cliente) {
      cliente = await carregarCliente();
    }

    if (!cliente) return;

    setLoading(true);

    try {
      const estavaEditando = Boolean(editandoId);

      if (!estavaEditando) {
        const { data: permitido, error: limiteError } = await supabase.rpc("pode_criar_evento", {
          p_cliente_id: cliente,
        });

        if (limiteError) {
          throw new Error("Erro ao validar limite do plano: " + limiteError.message);
        }

        if (!permitido) {
          alert("Seu plano atingiu o limite de eventos. Solicite upgrade para criar novos eventos.");
          setLoading(false);
          return;
        }
      }

      const eventoSlug = slugify(form.nome) || "evento";
      const [backgroundUrl, logoUrl, musicUrl] = await Promise.all([
        uploadArquivo(cliente, eventoSlug, backgroundFile, "fundo"),
        uploadArquivo(cliente, eventoSlug, logoFile, "logo"),
        uploadArquivo(cliente, eventoSlug, musicFile, "musica"),
      ]);

      const payload = {
        nome: form.nome.trim(),
        data_evento: form.data_evento || null,
        horario: form.horario.trim() || null,
        local: form.local.trim() || null,
        endereco: form.endereco.trim() || null,
        mapa_url: form.mapa_url.trim() || null,
        status: form.status,
        ...(backgroundUrl ? { background_image: backgroundUrl } : {}),
        ...(logoUrl ? { logo_image: logoUrl } : {}),
        ...(musicUrl ? { music_file: musicUrl } : {}),
      };

      const { error } = editandoId
        ? await supabase
            .from("eventos")
            .update(payload)
            .eq("id", editandoId)
            .eq("cliente_id", cliente)
        : await supabase.from("eventos").insert({
            ...payload,
            cliente_id: cliente,
            status_aprovacao: "aguardando_aprovacao",
            ativo: true,
            background_image: backgroundUrl,
            logo_image: logoUrl,
            music_file: musicUrl,
          });

      if (error) {
        throw new Error(error.message);
      }

      limparFormulario();
      setFormAberto(false);
      await carregarEventos(cliente);
      alert(estavaEditando ? "Evento atualizado." : "Evento criado e enviado para aprovação.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar evento.");
    } finally {
      setLoading(false);
    }
  }

  function editarEvento(evento: Evento) {
    setEditandoId(evento.id);
    setForm({
      nome: evento.nome || "",
      data_evento: evento.data_evento || "",
      horario: evento.horario || "",
      local: evento.local || "",
      endereco: evento.endereco || "",
      mapa_url: evento.mapa_url || "",
      status: evento.status || "ativo",
    });
    setBackgroundFile(null);
    setLogoFile(null);
    setMusicFile(null);
    setFormAberto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirEvento(evento: Evento) {
    if (!clienteId) return;

    const confirmar = confirm(
      `Tem certeza que deseja excluir o evento "${evento.nome}"? Essa ação pode remover dados ligados a este evento.`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", evento.id)
      .eq("cliente_id", clienteId);

    if (error) {
      alert("Erro ao excluir evento: " + error.message);
      return;
    }

    setEventos((current) => current.filter((item) => item.id !== evento.id));
    alert("Evento excluído.");
  }

  useEffect(() => {
    iniciarTela();
  }, []);

  return (
    <main style={{ color: "#fff" }}>
      <h1 style={{ fontSize: 48, margin: 0 }}>Eventos</h1>

      <p style={{ color: "#94a3b8", marginTop: 8 }}>
        Cadastre seus eventos. Novos eventos ficam aguardando aprovação do administrador antes de liberar o uso completo.
      </p>

      <p style={{ color: "#94a3b8", marginTop: 6, fontWeight: 700 }}>
        Plano: {planoNome || "não definido"} {limiteEventos !== null ? `· Limite: ${limiteEventos} evento(s)` : ""}
      </p>

      <div style={topActionsStyle}>
        <button onClick={abrirCriacao} style={buttonStyle}>
          + Criar evento
        </button>
      </div>

      {formAberto && (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ margin: 0 }}>{editandoId ? "Editar evento" : "Criar evento"}</h2>
            <button onClick={cancelarFormulario} style={secondaryButtonStyle}>
              Fechar
            </button>
          </div>

          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span>Nome do evento</span>
              <input
                value={form.nome}
                onChange={(event) => updateForm("nome", event.target.value)}
                placeholder="Ex: Valentina XV"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Data</span>
              <input
                type="date"
                value={form.data_evento}
                onChange={(event) => updateForm("data_evento", event.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Horário</span>
              <input
                value={form.horario}
                onChange={(event) => updateForm("horario", event.target.value)}
                placeholder="Ex: 20h"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value)}
                style={inputStyle}
              >
                <option value="ativo">Ativo</option>
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </label>

            <label style={fieldStyle}>
              <span>Local</span>
              <input
                value={form.local}
                onChange={(event) => updateForm("local", event.target.value)}
                placeholder="Ex: Espaço Grand Hall"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Endereço</span>
              <input
                value={form.endereco}
                onChange={(event) => updateForm("endereco", event.target.value)}
                placeholder="Rua, número, cidade"
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <span>Link do mapa</span>
              <input
                value={form.mapa_url}
                onChange={(event) => updateForm("mapa_url", event.target.value)}
                placeholder="https://maps.google.com/..."
                style={inputStyle}
              />
            </label>
          </div>

          <div style={uploadGridStyle}>
            <label style={uploadBoxStyle}>
              <strong>Imagem de fundo</strong>
              <span>{editandoId ? "Envie apenas se quiser substituir." : "JPG, PNG ou WEBP usado no convite."}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setBackgroundFile(event.target.files?.[0] || null)}
              />
            </label>

            <label style={uploadBoxStyle}>
              <strong>Logo do evento</strong>
              <span>{editandoId ? "Envie apenas se quiser substituir." : "PNG/JPG para aplicar no layout."}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
              />
            </label>

            <label style={uploadBoxStyle}>
              <strong>Música</strong>
              <span>{editandoId ? "Envie apenas se quiser substituir." : "MP3 opcional para convites com áudio."}</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => setMusicFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div style={formActionsStyle}>
            <button onClick={salvarEvento} disabled={loading} style={buttonStyle}>
              {loading ? "Salvando..." : editandoId ? "Salvar alterações" : "Criar evento"}
            </button>
            <button onClick={cancelarFormulario} style={secondaryButtonStyle}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={{ margin: 0 }}>Eventos criados</h2>
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>
            {eventosFiltrados.length} de {eventos.length}
          </span>
        </div>

        <div style={filtersStyle}>
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, local, endereço..."
            style={inputStyle}
          />

          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value)}
            style={inputStyle}
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="rascunho">Rascunho</option>
            <option value="publicado">Publicado</option>
            <option value="encerrado">Encerrado</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {eventos.length === 0 && (
            <div style={emptyStyle}>Nenhum evento cadastrado para este cliente.</div>
          )}

          {eventos.length > 0 && eventosFiltrados.length === 0 && (
            <div style={emptyStyle}>Nenhum evento encontrado com estes filtros.</div>
          )}

          {eventosFiltrados.map((evento) => (
            <article key={evento.id} style={eventCardStyle}>
              <div>
                <strong style={{ fontSize: 22 }}>{evento.nome}</strong>
                <p style={{ color: "#94a3b8", marginBottom: 0 }}>
                  {evento.data_evento || "Sem data"} · {evento.horario || "Sem horário"} ·{" "}
                  {evento.local || "Sem local"}
                </p>
                <small style={{ color: "#64748b" }}>{evento.endereco || "Endereço não informado"}</small>
              </div>

              <div style={eventActionsColumnStyle}>
                <span style={statusStyle}>{evento.status || "sem status"}</span>
                <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 13 }}>
                  {evento.background_image ? "Fundo ok" : "Sem fundo"} ·{" "}
                  {evento.logo_image ? "Logo ok" : "Sem logo"} ·{" "}
                  {evento.music_file ? "Música ok" : "Sem música"}
                </div>
                <div style={rowActionsStyle}>
                  <button onClick={() => editarEvento(evento)} style={smallButtonStyle}>
                    Editar
                  </button>
                  <button
                    onClick={() => excluirEvento(evento)}
                    style={{ ...smallButtonStyle, background: "#7f1d1d" }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const sectionStyle: CSSProperties = {
  marginTop: 28,
  padding: 22,
  borderRadius: 18,
  border: "1px solid #334155",
  background: "#020617",
};

function labelStatusAprovacao(status: string | null | undefined) {
  if (status === "aprovado") return "Aprovado";
  if (status === "aguardando_aprovacao") return "Aguardando aprovação";
  if (status === "bloqueado") return "Bloqueado";
  if (status === "reprovado") return "Reprovado";
  return "Rascunho";
}

const topActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  marginTop: 24,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#cbd5e1",
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 10,
  background: "#020617",
  color: "#fff",
  border: "1px solid #334155",
};

const uploadGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
  marginTop: 18,
};

const uploadBoxStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 16,
  borderRadius: 14,
  border: "1px dashed #334155",
  color: "#94a3b8",
};

const formActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 20,
};

const buttonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 10,
  background: "#22c55e",
  border: "none",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 10,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const filtersStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 220px",
  gap: 12,
  marginBottom: 18,
};

const eventCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  background: "#0f172a",
  padding: 18,
  borderRadius: 14,
  border: "1px solid #334155",
};

const eventActionsColumnStyle: CSSProperties = {
  minWidth: 260,
  textAlign: "right",
};

const rowActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 14,
};

const smallButtonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 9,
  background: "#2563eb",
  border: "none",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const statusStyle: CSSProperties = {
  display: "inline-block",
  padding: "7px 11px",
  borderRadius: 999,
  background: "rgba(34,197,94,0.14)",
  color: "#86efac",
  fontWeight: 800,
  fontSize: 12,
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  border: "1px dashed #334155",
  color: "#94a3b8",
};

