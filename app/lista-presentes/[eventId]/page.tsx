"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Evento = {
  id: string;
  nome: string | null;
  data_evento: string | null;
  cidade: string | null;
  lista_presentes_ativa: boolean | null;
  lista_presentes_titulo: string | null;
  pix_nome_recebedor: string | null;
  pix_chave: string | null;
  pix_cidade: string | null;
  presentes_fisicos_enabled: boolean | null;
  experiencias_enabled: boolean | null;
  presentes_valor_enabled: boolean | null;
};

type GiftItem = {
  id: string;
  tipo: "presente" | "experiencia" | "presente_valor" | "cota_pix" | string;
  nome: string;
  descricao: string | null;
  valor_sugerido: number | null;
  imagem_url: string | null;
  link_produto: string | null;
  quantidade_total: number | null;
  quantidade_reservada: number | null;
  ativo: boolean | null;
  ordem: number | null;
};

type FiltroTipo = "todos" | "presente" | "experiencia" | "presente_valor";

function formatarMoeda(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return "Valor livre";
  }

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string | null) {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;

  return data;
}

function labelTipo(tipo: string) {
  if (tipo === "presente") return "Presente físico";
  if (tipo === "experiencia") return "Experiência";
  if (tipo === "presente_valor" || tipo === "cota_pix") return "Presente em valor";
  return tipo;
}

function normalizarTipo(tipo: string): FiltroTipo {
  if (tipo === "experiencia") return "experiencia";
  if (tipo === "presente_valor" || tipo === "cota_pix") return "presente_valor";
  return "presente";
}

export default function ListaPresentesPublicaPage() {
  const params = useParams();
  const eventId = String(params?.eventId || "");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [evento, setEvento] = useState<Evento | null>(null);
  const [items, setItems] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (eventId) carregarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function carregarLista() {
    setLoading(true);
    setErro("");

    const { data: eventoData, error: eventoError } = await supabase
      .from("eventos")
      .select(`
        id,
        nome,
        data_evento,
        cidade,
        lista_presentes_ativa,
        lista_presentes_titulo,
        pix_nome_recebedor,
        pix_chave,
        pix_cidade,
        presentes_fisicos_enabled,
        experiencias_enabled,
        presentes_valor_enabled
      `)
      .eq("id", eventId)
      .maybeSingle();

    if (eventoError) {
      setErro("Não foi possível carregar esta lista.");
      setLoading(false);
      return;
    }

    if (!eventoData) {
      setErro("Lista não encontrada.");
      setLoading(false);
      return;
    }

    const eventoCarregado = eventoData as Evento;
    setEvento(eventoCarregado);

    if (eventoCarregado.lista_presentes_ativa !== true) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("gift_items")
      .select(`
        id,
        tipo,
        nome,
        descricao,
        valor_sugerido,
        imagem_url,
        link_produto,
        quantidade_total,
        quantidade_reservada,
        ativo,
        ordem
      `)
      .eq("evento_id", eventId)
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (itemsError) {
      setErro("Não foi possível carregar os presentes.");
      setLoading(false);
      return;
    }

    setItems((itemsData || []) as GiftItem[]);
    setLoading(false);
  }

  async function copiarPix() {
    if (!evento?.pix_chave) return;

    try {
      await navigator.clipboard.writeText(evento.pix_chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert("Não foi possível copiar automaticamente. Copie a chave manualmente.");
    }
  }

  const tiposDisponiveis = useMemo(() => {
    const tipos = new Set(items.map((item) => normalizarTipo(item.tipo)));

    return {
      presente: tipos.has("presente"),
      experiencia: tipos.has("experiencia"),
      presente_valor: tipos.has("presente_valor"),
    };
  }, [items]);

  const itensFiltrados = useMemo(() => {
    return items.filter((item) => {
      const tipo = normalizarTipo(item.tipo);

      if (tipo === "presente" && evento?.presentes_fisicos_enabled !== true) return false;
      if (tipo === "experiencia" && evento?.experiencias_enabled !== true) return false;
      if (tipo === "presente_valor" && evento?.presentes_valor_enabled !== true) return false;

      if (filtro === "todos") return true;
      return tipo === filtro;
    });
  }, [evento, filtro, items]);

  if (loading) {
    return (
      <main style={loadingStyle}>
        Carregando lista de presentes...
      </main>
    );
  }

  if (erro || !evento) {
    return (
      <main style={loadingStyle}>
        {erro || "Lista não encontrada."}
      </main>
    );
  }

  if (evento.lista_presentes_ativa !== true) {
    return (
      <main className="public-gift-page">
        <style>{styles}</style>

        <section className="empty-shell">
          <span className="eyebrow">Lista de Presentes</span>
          <h1>Lista indisponível</h1>
          <p>
            A lista de presentes deste evento ainda não está ativa.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-gift-page">
      <style>{styles}</style>

      <section className="hero">
        <div>
          <span className="eyebrow">Lista de Presentes</span>

          <h1>
            {evento.lista_presentes_titulo || `Presentes de ${evento.nome || "evento"}`}
          </h1>

          <p>
            Escolha um presente físico, uma experiência especial ou um presente em valor.
            Sua presença e carinho já fazem parte dessa celebração.
          </p>

          <div className="event-meta">
            {evento.nome && <span>{evento.nome}</span>}
            {evento.data_evento && <span>{formatarData(evento.data_evento)}</span>}
            {evento.cidade && <span>{evento.cidade}</span>}
          </div>
        </div>
      </section>

      <section className="filters">
        <button
          className={filtro === "todos" ? "filter active" : "filter"}
          onClick={() => setFiltro("todos")}
        >
          Todos
        </button>

        {tiposDisponiveis.presente && evento.presentes_fisicos_enabled && (
          <button
            className={filtro === "presente" ? "filter active" : "filter"}
            onClick={() => setFiltro("presente")}
          >
            Presentes físicos
          </button>
        )}

        {tiposDisponiveis.experiencia && evento.experiencias_enabled && (
          <button
            className={filtro === "experiencia" ? "filter active" : "filter"}
            onClick={() => setFiltro("experiencia")}
          >
            Experiências
          </button>
        )}

        {tiposDisponiveis.presente_valor && evento.presentes_valor_enabled && (
          <button
            className={filtro === "presente_valor" ? "filter active" : "filter"}
            onClick={() => setFiltro("presente_valor")}
          >
            Presentes em valor
          </button>
        )}
      </section>

      {evento.presentes_valor_enabled && evento.pix_chave && (
        <section className="pix-panel">
          <div>
            <span className="panel-kicker">Presentes em valor</span>
            <h2>Presenteie via PIX</h2>
            <p>
              Para contribuir com sonhos, viagens ou experiências especiais,
              copie a chave PIX abaixo.
            </p>

            <div className="pix-data">
              {evento.pix_nome_recebedor && (
                <div>
                  <strong>Recebedor:</strong> {evento.pix_nome_recebedor}
                </div>
              )}

              {evento.pix_cidade && (
                <div>
                  <strong>Cidade:</strong> {evento.pix_cidade}
                </div>
              )}

              <div>
                <strong>Chave PIX:</strong> {evento.pix_chave}
              </div>
            </div>
          </div>

          <button className="primary-btn" onClick={copiarPix}>
            {copiado ? "Chave copiada" : "Copiar chave PIX"}
          </button>
        </section>
      )}

      {itensFiltrados.length === 0 ? (
        <section className="empty-shell">
          <h2>Nenhum item disponível</h2>
          <p>
            Ainda não há itens ativos nesta categoria.
          </p>
        </section>
      ) : (
        <section className="items-grid">
          {itensFiltrados.map((item) => {
            const tipo = normalizarTipo(item.tipo);

            return (
              <article key={item.id} className="gift-card">
                {item.imagem_url ? (
                  <img className="gift-image" src={item.imagem_url} alt={item.nome} />
                ) : (
                  <div className="gift-image placeholder">
                    {tipo === "experiencia"
                      ? "Experiência"
                      : tipo === "presente_valor"
                      ? "Valor"
                      : "Presente"}
                  </div>
                )}

                <div className="gift-body">
                  <div className="badges">
                    <span className="badge">{labelTipo(item.tipo)}</span>
                    <span className="badge value">{formatarMoeda(item.valor_sugerido)}</span>
                  </div>

                  <h3>{item.nome}</h3>

                  {item.descricao && <p>{item.descricao}</p>}

                  {item.quantidade_total !== null && item.quantidade_total !== undefined && (
                    <div className="stock">
                      Disponível:{" "}
                      {Math.max(
                        Number(item.quantidade_total || 0) -
                          Number(item.quantidade_reservada || 0),
                        0
                      )}
                    </div>
                  )}

                  <div className="gift-actions">
                    {item.link_produto && (
                      <a
                        href={item.link_produto}
                        target="_blank"
                        rel="noreferrer"
                        className="primary-link"
                      >
                        Ver produto
                      </a>
                    )}

                    {tipo === "presente_valor" && evento.pix_chave && (
                      <button onClick={copiarPix} className="secondary-btn">
                        Copiar PIX
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

const loadingStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "radial-gradient(circle at 10% 0%, rgba(124,58,237,.10), transparent 34%), #f8fafc",
  color: "#0f172a",
  fontWeight: 900,
};

const styles = `
  .public-gift-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 8% 0%, rgba(124,58,237,.10), transparent 34%),
      radial-gradient(circle at 92% 0%, rgba(245,158,11,.10), transparent 30%),
      linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    color: #0f172a;
    padding: 32px;
  }

  .hero,
  .pix-panel,
  .gift-card,
  .empty-shell,
  .filters {
    max-width: 1180px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero {
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(226,232,240,.95);
    border-radius: 34px;
    padding: 42px;
    box-shadow: 0 28px 90px rgba(15,23,42,.08);
  }

  .eyebrow,
  .panel-kicker {
    display: inline-block;
    color: #7c3aed;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .14em;
    margin-bottom: 12px;
  }

  .hero h1 {
    margin: 0;
    color: #0f172a;
    font-size: clamp(34px, 6vw, 68px);
    line-height: .95;
    font-weight: 950;
    letter-spacing: -.07em;
  }

  .hero p {
    max-width: 760px;
    margin: 18px 0 0;
    color: #64748b;
    font-size: 18px;
    line-height: 1.7;
    font-weight: 750;
  }

  .event-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }

  .event-meta span {
    display: inline-flex;
    border-radius: 999px;
    background: #f1f5f9;
    color: #334155;
    padding: 9px 13px;
    font-weight: 900;
    font-size: 13px;
  }

  .filters {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .filter {
    border: 1px solid rgba(226,232,240,.95);
    background: #fff;
    color: #334155;
    border-radius: 999px;
    padding: 12px 16px;
    font-weight: 900;
    cursor: pointer;
  }

  .filter.active {
    background: #ede9fe;
    color: #6d28d9;
    border-color: rgba(124,58,237,.26);
  }

  .pix-panel {
    margin-top: 20px;
    margin-bottom: 20px;
    background:
      radial-gradient(circle at 0% 0%, rgba(124,58,237,.10), transparent 32%),
      #fff;
    border: 1px solid rgba(226,232,240,.95);
    border-radius: 30px;
    padding: 28px;
    box-shadow: 0 22px 70px rgba(15,23,42,.07);
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
  }

  .pix-panel h2 {
    margin: 0;
    color: #0f172a;
    font-size: 28px;
    font-weight: 950;
    letter-spacing: -.04em;
  }

  .pix-panel p {
    margin: 10px 0 0;
    color: #64748b;
    line-height: 1.6;
    font-weight: 750;
  }

  .pix-data {
    margin-top: 14px;
    color: #334155;
    line-height: 1.8;
    font-weight: 800;
    word-break: break-word;
  }

  .primary-btn,
  .secondary-btn,
  .primary-link {
    border: none;
    border-radius: 16px;
    text-decoration: none;
    font-weight: 950;
    cursor: pointer;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  .primary-btn,
  .primary-link {
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    color: #fff;
    padding: 14px 18px;
    box-shadow: 0 16px 34px rgba(124,58,237,.24);
  }

  .secondary-btn {
    background: #fff;
    color: #6d28d9;
    border: 1px solid rgba(124,58,237,.22);
    padding: 13px 16px;
  }

  .items-grid {
    max-width: 1180px;
    margin: 20px auto 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 18px;
  }

  .gift-card {
    background: #fff;
    border: 1px solid rgba(226,232,240,.95);
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 20px 70px rgba(15,23,42,.07);
    display: flex;
    flex-direction: column;
  }

  .gift-image {
    width: 100%;
    height: 230px;
    object-fit: cover;
    background: #f1f5f9;
    display: block;
  }

  .gift-image.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-weight: 950;
    font-size: 18px;
  }

  .gift-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .badge {
    border-radius: 999px;
    padding: 7px 10px;
    background: #ede9fe;
    color: #6d28d9;
    font-size: 11px;
    font-weight: 950;
  }

  .badge.value {
    background: #fef3c7;
    color: #92400e;
  }

  .gift-body h3 {
    margin: 0;
    color: #0f172a;
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -.035em;
  }

  .gift-body p {
    margin: 0;
    color: #64748b;
    line-height: 1.55;
    font-weight: 700;
  }

  .stock {
    color: #475569;
    font-size: 13px;
    font-weight: 900;
  }

  .gift-actions {
    margin-top: auto;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .empty-shell {
    background: #fff;
    border: 1px dashed rgba(148,163,184,.45);
    border-radius: 30px;
    padding: 40px;
    margin-top: 24px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(15,23,42,.05);
  }

  .empty-shell h1,
  .empty-shell h2 {
    margin: 0;
    color: #0f172a;
    font-size: 32px;
    font-weight: 950;
    letter-spacing: -.04em;
  }

  .empty-shell p {
    margin: 12px auto 0;
    color: #64748b;
    line-height: 1.6;
    max-width: 520px;
  }

  @media (max-width: 720px) {
    .public-gift-page {
      padding: 16px;
    }

    .hero {
      padding: 26px;
      border-radius: 26px;
    }

    .pix-panel {
      padding: 22px;
      border-radius: 24px;
    }

    .primary-btn,
    .primary-link,
    .secondary-btn {
      width: 100%;
    }

    .gift-image {
      height: 200px;
    }
  }
`;
