"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Evento = {
  id: string;
  tenant_id: string | null;
  nome: string | null;
  data_evento: string | null;
  cidade: string | null;
  logo_url: string | null;
  background_url: string | null;
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

function limparTextoPix(valor: string, limite: number) {
  const semAcento = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const permitido = semAcento
    .split("")
    .filter((char) => {
      return /^[A-Za-z0-9 $%*+.\\/:_-]$/.test(char);
    })
    .join("");

  return permitido.trim().slice(0, limite);
}

function emv(id: string, value: string) {
  const tamanho = String(value.length).padStart(2, "0");
  return `${id}${tamanho}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }

      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function gerarPixCopiaECola({
  chave,
  nome,
  cidade,
  valor,
}: {
  chave: string;
  nome?: string | null;
  cidade?: string | null;
  valor?: number | null;
}) {
  const chaveLimpa = chave.trim();
  const nomePix = limparTextoPix(nome || "Recebedor", 25) || "Recebedor";
  const cidadePix = limparTextoPix(cidade || "BRASIL", 15) || "BRASIL";

  const merchantAccountInfo = emv("00", "br.gov.bcb.pix") + emv("01", chaveLimpa);

  let payload =
    emv("00", "01") +
    emv("26", merchantAccountInfo) +
    emv("52", "0000") +
    emv("53", "986");

  if (valor && Number.isFinite(Number(valor)) && Number(valor) > 0) {
    payload += emv("54", Number(valor).toFixed(2));
  }

  payload +=
    emv("58", "BR") +
    emv("59", nomePix) +
    emv("60", cidadePix) +
    emv("62", emv("05", "***"));

  const payloadComCRC = `${payload}6304`;
  return `${payloadComCRC}${crc16(payloadComCRC)}`;
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
  const [presenteSelecionado, setPresenteSelecionado] = useState<GiftItem | null>(null);
  const [efeitoPresente, setEfeitoPresente] = useState(false);
  const [nomePresenteador, setNomePresenteador] = useState("");
  const [telefonePresenteador, setTelefonePresenteador] = useState("");
  const [mensagemPresenteador, setMensagemPresenteador] = useState("");
  const [confirmandoPresente, setConfirmandoPresente] = useState(false);
  const [presenteConfirmado, setPresenteConfirmado] = useState(false);

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
        tenant_id,
        nome,
        data_evento,
        cidade,
        logo_url,
        background_url,
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

  async function copiarPixCopiaECola(valor?: number | null) {
    if (!evento?.pix_chave) return;

    const codigoPix = gerarPixCopiaECola({
      chave: evento.pix_chave,
      nome: evento.pix_nome_recebedor,
      cidade: evento.pix_cidade,
      valor,
    });

    try {
      await navigator.clipboard.writeText(codigoPix);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copie o código PIX:", codigoPix);
    }
  }

  function abrirPresente(item: GiftItem) {
    setPresenteSelecionado(item);
    setEfeitoPresente(true);
    setNomePresenteador("");
    setTelefonePresenteador("");
    setMensagemPresenteador("");
    setPresenteConfirmado(false);

    setTimeout(() => {
      setEfeitoPresente(false);
    }, 1200);
  }

  function fecharPresente() {
    setPresenteSelecionado(null);
    setEfeitoPresente(false);
    setNomePresenteador("");
    setTelefonePresenteador("");
    setMensagemPresenteador("");
    setConfirmandoPresente(false);
    setPresenteConfirmado(false);
  }

  async function confirmarPresente() {
    if (!evento || !presenteSelecionado) return;

    if (!nomePresenteador.trim()) {
      alert("Informe seu nome para confirmar o presente.");
      return;
    }

    if (!evento.tenant_id) {
      alert("Evento sem tenant vinculado.");
      return;
    }

    setConfirmandoPresente(true);

    const { error: reservationError } = await supabase
      .from("gift_reservations")
      .insert({
        gift_item_id: presenteSelecionado.id,
        evento_id: evento.id,
        tenant_id: evento.tenant_id,
        nome_presenteador: nomePresenteador.trim(),
        telefone_presenteador: telefonePresenteador.trim() || null,
        mensagem: mensagemPresenteador.trim() || null,
        valor_presenteado: presenteSelecionado.valor_sugerido,
        status: "presenteado",
      });

    if (reservationError) {
      alert("Erro ao confirmar presente: " + reservationError.message);
      setConfirmandoPresente(false);
      return;
    }

    const novaQuantidade = Number(presenteSelecionado.quantidade_reservada || 0) + 1;

    const { error: updateError } = await supabase
      .from("gift_items")
      .update({
        quantidade_reservada: novaQuantidade,
      })
      .eq("id", presenteSelecionado.id);

    if (updateError) {
      alert(
        "O presente foi registrado, mas não foi possível atualizar a quantidade: " +
          updateError.message
      );
    }

    setItems((old) =>
      old.map((item) =>
        item.id === presenteSelecionado.id
          ? { ...item, quantidade_reservada: novaQuantidade }
          : item
      )
    );

    setPresenteSelecionado((old) =>
      old ? { ...old, quantidade_reservada: novaQuantidade } : old
    );

    setPresenteConfirmado(true);
    setConfirmandoPresente(false);
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

      <section className="hero hero-with-logo">
        <div className="hero-copy">
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

        <div
          className="event-logo-card"
          style={
            evento.background_url
              ? ({
                  "--event-backdrop-url": `url(${evento.background_url})`,
                } as React.CSSProperties)
              : undefined
          }
        >
          <img
            src={evento.logo_url || "https://placehold.co/600x400/png?text=Evento"}
            alt={evento.nome || "Logo do evento"}
            onError={(event) => {
              event.currentTarget.src =
                "https://placehold.co/600x400/png?text=Evento";
            }}
          />
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

                    <button
                      type="button"
                      className="badge presentear"
                      onClick={() => abrirPresente(item)}
                    >
                      Presentear
                    </button>
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

      {presenteSelecionado && (
        <div className="gift-modal-backdrop" onClick={fecharPresente}>
          <div className="gift-modal" onClick={(event) => event.stopPropagation()}>
            {efeitoPresente ? (
              <div className="gift-effect-stage">
                <div className="gift-box-animation">
                  <div className="gift-lid" />
                  <div className="gift-ribbon-v" />
                  <div className="gift-ribbon-h" />
                  <div className="gift-box-body" />
                </div>

                <div className="gift-sparkles">
                  <span>✦</span>
                  <span>✧</span>
                  <span>✦</span>
                  <span>✧</span>
                </div>

                <h2>Preparando seu presente...</h2>
              </div>
            ) : (
              <>
                <button className="modal-close" onClick={fecharPresente}>
                  ×
                </button>

                <span className="modal-kicker">Presentear</span>

                <h2>{presenteSelecionado.nome}</h2>

                <div className="modal-badges">
                  <span>{labelTipo(presenteSelecionado.tipo)}</span>
                  <span>{formatarMoeda(presenteSelecionado.valor_sugerido)}</span>
                </div>

                {presenteSelecionado.descricao && (
                  <p className="modal-desc">{presenteSelecionado.descricao}</p>
                )}

                {evento.pix_chave ? (
                  <div className="modal-pix-card">
                    <h3>Dados para PIX</h3>

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

                    <div className="pix-qr-box">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                          gerarPixCopiaECola({
                            chave: evento.pix_chave,
                            nome: evento.pix_nome_recebedor,
                            cidade: evento.pix_cidade,
                            valor: presenteSelecionado.valor_sugerido,
                          })
                        )}`}
                        alt="QR Code PIX"
                      />

                      <div>
                        <strong>QR Code PIX</strong>
                        <span>
                          Escaneie pelo aplicativo do banco ou copie o código PIX abaixo.
                        </span>
                      </div>
                    </div>

                    <div className="pix-actions">
                      <button
                        className="primary-btn"
                        onClick={() => copiarPixCopiaECola(presenteSelecionado.valor_sugerido)}
                      >
                        {copiado ? "PIX copiado" : "Copiar PIX copia e cola"}
                      </button>

                      <button className="secondary-btn" onClick={copiarPix}>
                        Copiar só a chave
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="modal-pix-card">
                    <h3>PIX não cadastrado</h3>
                    <p>O anfitrião ainda não informou uma chave PIX para este evento.</p>
                  </div>
                )}

                <div className="confirm-gift-card">
                  {presenteConfirmado ? (
                    <div className="confirm-success">
                      <strong>Presente confirmado com sucesso!</strong>
                      <span>
                        Obrigado por registrar seu presente. O anfitrião conseguirá ver quem presenteou.
                      </span>
                    </div>
                  ) : (
                    <>
                      <h3>Confirme seu presente</h3>
                      <p>
                        Depois de fazer o PIX ou escolher o produto, informe seus dados para o anfitrião saber quem presenteou.
                      </p>

                      <label>
                        <span>Seu nome</span>
                        <input
                          value={nomePresenteador}
                          onChange={(event) => setNomePresenteador(event.target.value)}
                          placeholder="Ex: Maria Souza"
                        />
                      </label>

                      <label>
                        <span>WhatsApp / telefone</span>
                        <input
                          value={telefonePresenteador}
                          onChange={(event) => setTelefonePresenteador(event.target.value)}
                          placeholder="Opcional"
                        />
                      </label>

                      <label>
                        <span>Mensagem</span>
                        <textarea
                          value={mensagemPresenteador}
                          onChange={(event) => setMensagemPresenteador(event.target.value)}
                          placeholder="Opcional: deixe uma mensagem para o anfitrião"
                        />
                      </label>

                      <button
                        className="primary-btn"
                        onClick={confirmarPresente}
                        disabled={confirmandoPresente}
                      >
                        {confirmandoPresente ? "Confirmando..." : "Confirmar que presenteei"}
                      </button>
                    </>
                  )}
                </div>

                <div className="modal-actions">
                  {presenteSelecionado.link_produto && (
                    <a
                      href={presenteSelecionado.link_produto}
                      target="_blank"
                      rel="noreferrer"
                      className="secondary-btn"
                    >
                      Ver produto
                    </a>
                  )}

                  <button className="secondary-btn" onClick={fecharPresente}>
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
    max-width: 1320px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero {
    background: rgba(255,255,255,.76);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(226,232,240,.95);
    border-radius: 34px;
    padding: 42px;
    box-shadow: 0 28px 90px rgba(15,23,42,.08);
  }

  .hero-with-logo {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 32px;
    align-items: center;
  }

  .hero-copy {
    min-width: 0;
  }

  .event-logo-card {
    min-height: 220px;
    border-radius: 28px;
    border: 1px solid rgba(226,232,240,.95);
    background-image: var(--event-backdrop-url);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #0b1020;
    box-shadow: 0 18px 48px rgba(15,23,42,.08);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: hidden;
    position: relative;
  }

  .event-logo-card::before,
  .event-logo-card::after {
    display: none;
  }

  .event-logo-card img {
    max-width: 100%;
    max-height: 180px;
    object-fit: contain;
    display: block;
    position: relative;
    z-index: 2;
    filter: none;
  }

  .event-logo-placeholder {
    width: 100%;
    min-height: 150px;
    border-radius: 22px;
    background: #f1f5f9;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 18px;
    font-weight: 950;
    line-height: 1.15;
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
    background: rgba(255,255,255,.62);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(226,232,240,.72);
    border-radius: 999px;
    padding: 10px;
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
    max-width: 1320px;
    margin: 20px auto 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 18px;
  }

  .gift-card {
    background: rgba(255,255,255,.86);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
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
    gap: 10px;
  }

  .badge {
    border-radius: 999px;
    padding: 10px 14px;
    background: #ede9fe;
    color: #6d28d9;
    font-size: 13px;
    font-weight: 950;
  }

  .badge.value {
    background: #fef3c7;
    color: #92400e;
  }

  .badge.presentear {
    border: none;
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    color: #fff;
    cursor: pointer;
    box-shadow: 0 12px 26px rgba(124,58,237,.18);
  }

  .badge.presentear:hover {
    transform: translateY(-1px);
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


  .gift-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(15,23,42,.52);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 18px;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .gift-modal {
    position: relative;
    width: min(560px, 100%);
    min-height: 320px;
    max-height: calc(100dvh - 36px);
    margin: auto 0;
    background:
      radial-gradient(circle at 20% 0%, rgba(124,58,237,.12), transparent 34%),
      #fff;
    border: 1px solid rgba(226,232,240,.95);
    border-radius: 30px;
    box-shadow: 0 34px 110px rgba(15,23,42,.28);
    padding: 30px;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    animation: modalIn .28s cubic-bezier(.16,1,.3,1) both;
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    border: 1px solid rgba(226,232,240,.95);
    background: #fff;
    color: #0f172a;
    border-radius: 14px;
    cursor: pointer;
    font-size: 24px;
    font-weight: 950;
  }

  .modal-kicker {
    color: #7c3aed;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .gift-modal h2 {
    margin: 10px 44px 0 0;
    color: #0f172a;
    font-size: 34px;
    line-height: 1.05;
    font-weight: 950;
    letter-spacing: -.05em;
  }

  .modal-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  .modal-badges span {
    border-radius: 999px;
    padding: 8px 11px;
    background: #f1f5f9;
    color: #334155;
    font-size: 12px;
    font-weight: 950;
  }

  .modal-desc {
    color: #64748b;
    line-height: 1.6;
    font-weight: 750;
    margin: 16px 0 0;
  }

  .modal-pix-card {
    margin-top: 18px;
    border-radius: 22px;
    background: #f8fafc;
    border: 1px solid rgba(226,232,240,.95);
    padding: 18px;
    color: #334155;
    line-height: 1.8;
    font-weight: 800;
    word-break: break-word;
  }

  .modal-pix-card h3 {
    margin: 0 0 8px;
    color: #0f172a;
    font-size: 20px;
    font-weight: 950;
  }

  .modal-pix-card .primary-btn {
    margin-top: 14px;
  }

  .pix-qr-box {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 14px;
    align-items: center;
    border-radius: 20px;
    background: #fff;
    border: 1px solid rgba(226,232,240,.95);
    padding: 14px;
  }

  .pix-qr-box img {
    width: 150px;
    height: 150px;
    border-radius: 16px;
    background: #fff;
    border: 1px solid rgba(226,232,240,.95);
  }

  .pix-qr-box span {
    display: block;
    margin-top: 5px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 750;
  }

  .pix-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 14px;
  }

  .confirm-gift-card {
    margin-top: 18px;
    border-radius: 22px;
    background: #fff;
    border: 1px solid rgba(226,232,240,.95);
    padding: 18px;
  }

  .confirm-gift-card h3 {
    margin: 0;
    color: #0f172a;
    font-size: 20px;
    font-weight: 950;
  }

  .confirm-gift-card p {
    margin: 8px 0 14px;
    color: #64748b;
    line-height: 1.5;
    font-weight: 750;
  }

  .confirm-gift-card label {
    display: block;
    margin-top: 12px;
  }

  .confirm-gift-card label span {
    display: block;
    color: #334155;
    font-size: 13px;
    font-weight: 950;
    margin-bottom: 7px;
  }

  .confirm-gift-card input,
  .confirm-gift-card textarea {
    width: 100%;
    border: 1px solid rgba(203,213,225,.95);
    background: #fff;
    color: #0f172a;
    border-radius: 15px;
    padding: 13px 14px;
    outline: none;
    font-weight: 800;
    font-family: inherit;
  }

  .confirm-gift-card textarea {
    min-height: 88px;
    resize: vertical;
  }

  .confirm-gift-card input:focus,
  .confirm-gift-card textarea:focus {
    border-color: rgba(124,58,237,.45);
    box-shadow: 0 0 0 4px rgba(124,58,237,.10);
  }

  .confirm-gift-card .primary-btn {
    margin-top: 14px;
  }

  .confirm-success {
    display: flex;
    flex-direction: column;
    gap: 7px;
    border-radius: 18px;
    background: #dcfce7;
    color: #166534;
    padding: 16px;
    font-weight: 850;
  }

  .confirm-success strong {
    color: #14532d;
    font-size: 17px;
  }

  .confirm-success span {
    color: #166534;
    line-height: 1.5;
  }

  .primary-btn:disabled {
    opacity: .58;
    cursor: not-allowed;
  }

  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }

  .gift-effect-stage {
    min-height: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    text-align: center;
  }

  .gift-effect-stage h2 {
    margin: 0;
    font-size: 26px;
  }

  .gift-box-animation {
    position: relative;
    width: 150px;
    height: 140px;
    animation: giftBounce .85s cubic-bezier(.2,.8,.2,1) infinite alternate;
  }

  .gift-box-body {
    position: absolute;
    left: 18px;
    bottom: 0;
    width: 114px;
    height: 86px;
    border-radius: 18px 18px 22px 22px;
    background: linear-gradient(135deg,#7c3aed,#5b21b6);
    box-shadow: 0 24px 48px rgba(124,58,237,.28);
  }

  .gift-lid {
    position: absolute;
    left: 10px;
    bottom: 78px;
    width: 130px;
    height: 34px;
    border-radius: 16px;
    background: linear-gradient(135deg,#fbbf24,#f59e0b);
    transform-origin: left bottom;
    animation: lidOpen 1.2s cubic-bezier(.16,1,.3,1) both;
  }

  .gift-ribbon-v {
    position: absolute;
    left: 65px;
    bottom: 0;
    width: 20px;
    height: 112px;
    border-radius: 999px;
    background: rgba(255,255,255,.72);
    z-index: 3;
  }

  .gift-ribbon-h {
    position: absolute;
    left: 18px;
    bottom: 42px;
    width: 114px;
    height: 18px;
    border-radius: 999px;
    background: rgba(255,255,255,.72);
    z-index: 3;
  }

  .gift-sparkles span {
    position: absolute;
    color: #f59e0b;
    font-size: 28px;
    animation: sparklePop 1.1s ease-in-out infinite alternate;
  }

  .gift-sparkles span:nth-child(1) { transform: translate(-110px, -90px); }
  .gift-sparkles span:nth-child(2) { transform: translate(110px, -80px); animation-delay: .12s; }
  .gift-sparkles span:nth-child(3) { transform: translate(-90px, 60px); animation-delay: .22s; }
  .gift-sparkles span:nth-child(4) { transform: translate(92px, 54px); animation-delay: .32s; }

  @keyframes modalIn {
    from { opacity: 0; transform: translateY(16px) scale(.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes giftBounce {
    from { transform: translateY(0) rotate(-2deg); }
    to { transform: translateY(-10px) rotate(2deg); }
  }

  @keyframes lidOpen {
    0% { transform: rotate(0deg) translateY(0); }
    55% { transform: rotate(-12deg) translateY(-12px); }
    100% { transform: rotate(-8deg) translateY(-8px); }
  }

  @keyframes sparklePop {
    from { opacity: .3; scale: .75; }
    to { opacity: 1; scale: 1.25; }
  }

  @media (max-width: 720px) {
    .public-gift-page {
      padding: 16px;
      overflow-x: hidden;
    }

    .hero {
      padding: 26px;
      border-radius: 26px;
    }

    .hero-with-logo {
      grid-template-columns: 1fr;
    }

    .event-logo-card {
      min-height: 170px;
      padding: 18px;
    }

    .event-logo-card img {
      max-height: 130px;
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

    .gift-modal {
      padding: 24px;
      border-radius: 24px;
      max-height: calc(100dvh - 24px);
      margin: 12px 0;
    }

    .gift-modal h2 {
      font-size: 28px;
    }

    .modal-actions,
    .pix-actions {
      flex-direction: column;
    }

    .pix-qr-box {
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
    }

    .gift-image {
      height: 200px;
    }
  }
`;


