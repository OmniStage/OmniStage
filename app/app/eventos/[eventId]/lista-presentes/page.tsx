"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Evento = {
  id: string;
  nome: string | null;
  tenant_id: string | null;
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
  tenant_id: string;
  evento_id: string;
  tipo: "presente" | "experiencia" | "presente_valor" | "cota_pix" | string;
  nome: string;
  descricao: string | null;
  valor_sugerido: number | null;
  imagem_url: string | null;
  quantidade_total: number | null;
  quantidade_reservada: number | null;
  ativo: boolean | null;
  ordem: number | null;
  created_at: string | null;
};

type FormItem = {
  tipo: "presente" | "experiencia" | "presente_valor";
  nome: string;
  descricao: string;
  valor_sugerido: string;
  imagem_url: string;
  quantidade_total: string;
  ativo: boolean;
};

const formItemInicial: FormItem = {
  tipo: "presente",
  nome: "",
  descricao: "",
  valor_sugerido: "",
  imagem_url: "",
  quantidade_total: "",
  ativo: true,
};

function normalizarMoeda(valor: string) {
  const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

function formatarMoeda(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "Valor livre";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function valorParaInput(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "";
  return Number(valor).toFixed(2).replace(".", ",");
}

export default function ListaPresentesEventoPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params?.eventId || "");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [evento, setEvento] = useState<Evento | null>(null);
  const [items, setItems] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [toast, setToast] = useState("");
  const [formItem, setFormItem] = useState<FormItem>(formItemInicial);
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  async function carregarTudo() {
    setLoading(true);
    await carregarEvento();
    await carregarItems();
    setLoading(false);
  }

  async function carregarEvento() {
    const { data, error } = await supabase
      .from("eventos")
      .select(`
        id,
        nome,
        tenant_id,
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

    if (error) {
      alert("Erro ao carregar evento: " + error.message);
      return;
    }

    if (!data) {
      alert("Evento não encontrado.");
      router.push("/app/eventos");
      return;
    }

    setEvento(data as Evento);
  }

  async function carregarItems() {
    const { data, error } = await supabase
      .from("gift_items")
      .select(`
        id,
        tenant_id,
        evento_id,
        tipo,
        nome,
        descricao,
        valor_sugerido,
        imagem_url,
        quantidade_total,
        quantidade_reservada,
        ativo,
        ordem,
        created_at
      `)
      .eq("evento_id", eventId)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar itens da lista: " + error.message);
      return;
    }

    setItems((data || []) as GiftItem[]);
  }

  async function salvarConfiguracaoEvento() {
    if (!evento) return;

    setSalvandoEvento(true);

    const { error } = await supabase
      .from("eventos")
      .update({
        lista_presentes_ativa: evento.lista_presentes_ativa === true,
        lista_presentes_titulo:
          evento.lista_presentes_titulo?.trim() || "Lista de Presentes",
        pix_nome_recebedor: evento.pix_nome_recebedor?.trim() || null,
        pix_chave: evento.pix_chave?.trim() || null,
        pix_cidade: evento.pix_cidade?.trim() || null,
        presentes_fisicos_enabled: evento.presentes_fisicos_enabled === true,
        experiencias_enabled: evento.experiencias_enabled === true,
        presentes_valor_enabled: evento.presentes_valor_enabled === true,
      })
      .eq("id", evento.id);

    if (error) {
      alert("Erro ao salvar configurações: " + error.message);
      setSalvandoEvento(false);
      return;
    }

    setSalvandoEvento(false);
    showToast("Configurações salvas com sucesso.");
    await carregarEvento();
  }

  async function uploadImagemItem(file: File) {
    if (!evento?.tenant_id) {
      alert("Evento sem tenant vinculado.");
      return;
    }

    const extensao = file.name.split(".").pop() || "jpg";
    const nomeArquivo = `${evento.tenant_id}/gift-items/${evento.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extensao}`;

    const { error } = await supabase.storage
      .from("event-assets")
      .upload(nomeArquivo, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      alert(
        "Erro ao enviar imagem. Confirme se o bucket 'event-assets' existe e está público. Detalhe: " +
          error.message
      );
      return;
    }

    const { data } = supabase.storage
      .from("event-assets")
      .getPublicUrl(nomeArquivo);

    setFormItem((old) => ({
      ...old,
      imagem_url: data.publicUrl,
    }));

    showToast("Imagem enviada com sucesso.");
  }

  function editarItem(item: GiftItem) {
    setItemEditandoId(item.id);

    setFormItem({
      tipo:
        item.tipo === "experiencia"
          ? "experiencia"
          : item.tipo === "presente_valor" || item.tipo === "cota_pix"
          ? "presente_valor"
          : "presente",
      nome: item.nome || "",
      descricao: item.descricao || "",
      valor_sugerido: valorParaInput(item.valor_sugerido),
      imagem_url: item.imagem_url || "",
      quantidade_total: item.quantidade_total ? String(item.quantidade_total) : "",
      ativo: item.ativo === true,
    });

    setTimeout(() => {
      document.getElementById("form-item-lista-presentes")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function cancelarEdicao() {
    setItemEditandoId(null);
    setFormItem(formItemInicial);
  }

  async function salvarItem() {
    if (!evento?.tenant_id) {
      alert("Evento sem tenant vinculado.");
      return;
    }

    if (!formItem.nome.trim()) {
      alert("Informe o nome do item.");
      return;
    }

    setSalvandoItem(true);

    const payload = {
      tenant_id: evento.tenant_id,
      evento_id: evento.id,
      tipo: formItem.tipo,
      nome: formItem.nome.trim(),
      descricao: formItem.descricao.trim() || null,
      valor_sugerido: normalizarMoeda(formItem.valor_sugerido),
      imagem_url: formItem.imagem_url.trim() || null,
      quantidade_total: formItem.quantidade_total
        ? Number(formItem.quantidade_total)
        : null,
      ativo: formItem.ativo,
    };

    if (itemEditandoId) {
      const { error } = await supabase
        .from("gift_items")
        .update(payload)
        .eq("id", itemEditandoId)
        .eq("evento_id", evento.id);

      if (error) {
        alert("Erro ao atualizar item: " + error.message);
        setSalvandoItem(false);
        return;
      }

      setItemEditandoId(null);
      setFormItem(formItemInicial);
      setSalvandoItem(false);
      showToast("Item atualizado com sucesso.");
      await carregarItems();
      return;
    }

    const { error } = await supabase.from("gift_items").insert({
      ...payload,
      quantidade_reservada: 0,
      ordem: items.length + 1,
    });

    if (error) {
      alert("Erro ao criar item: " + error.message);
      setSalvandoItem(false);
      return;
    }

    setFormItem(formItemInicial);
    setSalvandoItem(false);
    showToast("Item criado com sucesso.");
    await carregarItems();
  }

  async function alternarAtivo(item: GiftItem) {
    const { error } = await supabase
      .from("gift_items")
      .update({ ativo: item.ativo !== true })
      .eq("id", item.id);

    if (error) {
      alert("Erro ao atualizar item: " + error.message);
      return;
    }

    await carregarItems();
  }

  async function excluirItem(item: GiftItem) {
    const ok = window.confirm(`Excluir "${item.nome}" da lista?`);
    if (!ok) return;

    const { error } = await supabase.from("gift_items").delete().eq("id", item.id);

    if (error) {
      alert("Erro ao excluir item: " + error.message);
      return;
    }

    if (itemEditandoId === item.id) cancelarEdicao();

    showToast("Item excluído.");
    await carregarItems();
  }

  const stats = useMemo(() => {
    return {
      total: items.length,
      ativos: items.filter((item) => item.ativo === true).length,
      presentes: items.filter((item) => item.tipo === "presente").length,
      experiencias: items.filter((item) => item.tipo === "experiencia").length,
      valor: items.filter(
        (item) => item.tipo === "presente_valor" || item.tipo === "cota_pix"
      ).length,
    };
  }, [items]);

  if (loading) {
    return <div style={loadingStyle}>Carregando lista de presentes...</div>;
  }

  if (!evento) {
    return <div style={loadingStyle}>Evento não encontrado.</div>;
  }

  return (
    <div className="gift-page">
      <style>{`
        .gift-page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .hero, .panel, .metric, .gift-card {
          background: #fff;
          border: 1px solid rgba(226,232,240,.95);
          box-shadow: 0 24px 70px rgba(15,23,42,.08);
        }

        .hero {
          border-radius: 28px;
          padding: 30px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          background:
            radial-gradient(circle at 5% 0%, rgba(124,58,237,.10), transparent 34%),
            radial-gradient(circle at 96% 10%, rgba(245,158,11,.10), transparent 30%),
            #fff;
        }

        .eyebrow {
          color: #7c3aed;
          font-weight: 950;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .title {
          margin: 8px 0;
          font-size: 38px;
          font-weight: 950;
          color: #0f172a;
          letter-spacing: -.05em;
        }

        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.5;
          max-width: 820px;
        }

        .actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .primary, .secondary, .danger, .warning {
          border: none;
          border-radius: 15px;
          font-weight: 950;
          cursor: pointer;
          transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease, opacity .18s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .primary {
          background: linear-gradient(135deg,#7c3aed,#5b21b6);
          color: #fff;
          padding: 14px 20px;
          box-shadow: 0 16px 34px rgba(124,58,237,.26);
        }

        .secondary {
          background: #fff;
          color: #0f172a;
          padding: 13px 18px;
          border: 1px solid rgba(203,213,225,.95);
        }

        .warning {
          background: #fef3c7;
          color: #92400e;
          padding: 11px 14px;
          border: 1px solid rgba(245,158,11,.24);
        }

        .danger {
          background: #fee2e2;
          color: #991b1b;
          padding: 11px 14px;
        }

        .primary:hover, .secondary:hover, .danger:hover, .warning:hover {
          transform: translateY(-1px);
        }

        .primary:disabled {
          opacity: .55;
          cursor: not-allowed;
          transform: none;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
        }

        .metric {
          border-radius: 22px;
          padding: 18px;
        }

        .metric-label {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .metric-value {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 30px;
          font-weight: 950;
        }

        .panel {
          border-radius: 26px;
          padding: 26px;
        }

        .panel.editing {
          border-color: rgba(124,58,237,.35);
          box-shadow: 0 0 0 5px rgba(124,58,237,.08), 0 24px 70px rgba(15,23,42,.08);
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .panel-title {
          margin: 0;
          color: #0f172a;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -.035em;
        }

        .panel-desc {
          margin: 7px 0 0;
          color: #64748b;
          line-height: 1.5;
          font-weight: 750;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .full { grid-column: 1 / -1; }

        .field-label {
          display: block;
          color: #334155;
          font-size: 14px;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .field-help {
          margin-top: 8px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 750;
        }

        .image-preview-box {
          margin-top: 12px;
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 18px;
          overflow: hidden;
          background: #f8fafc;
        }

        .image-preview-box img {
          width: 100%;
          max-height: 260px;
          object-fit: cover;
          display: block;
          background: #f1f5f9;
        }

        .image-preview-box a {
          display: inline-flex;
          margin: 12px;
          color: #6d28d9;
          font-weight: 900;
          text-decoration: none;
        }

        .input, .select, .textarea {
          width: 100%;
          padding: 15px 16px;
          border-radius: 17px;
          border: 1px solid rgba(203,213,225,.95);
          background: #fff;
          color: #0f172a;
          outline: none;
          font-size: 14px;
          font-weight: 800;
        }

        .textarea {
          min-height: 120px;
          resize: vertical;
          font-family: inherit;
        }

        .input:focus, .select:focus, .textarea:focus {
          border-color: rgba(124,58,237,.45);
          box-shadow: 0 0 0 4px rgba(124,58,237,.10);
        }

        .toggle-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .toggle-card {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 16px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(124,58,237,.08), rgba(255,255,255,.95));
          border: 1px solid rgba(124,58,237,.16);
          cursor: pointer;
          color: #0f172a;
          font-weight: 950;
        }

        .toggle-card input {
          width: 18px;
          height: 18px;
          accent-color: #7c3aed;
          margin-top: 2px;
        }

        .toggle-card span {
          display: block;
          color: #64748b;
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 750;
        }

        .items-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
          gap: 14px;
        }

        .gift-card {
          border-radius: 22px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .gift-card.editing {
          border-color: rgba(124,58,237,.40);
          box-shadow: 0 0 0 4px rgba(124,58,237,.08);
        }

        .gift-img {
          width: 100%;
          height: 150px;
          border-radius: 18px;
          background: linear-gradient(135deg,#f1f5f9,#fff);
          border: 1px solid rgba(226,232,240,.95);
          object-fit: cover;
        }

        .gift-title {
          margin: 0;
          color: #0f172a;
          font-size: 18px;
          font-weight: 950;
        }

        .gift-desc {
          margin: 0;
          color: #64748b;
          line-height: 1.45;
          font-size: 14px;
        }

        .badge-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 950;
        }

        .badge-purple { background: #ede9fe; color: #6d28d9; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-yellow { background: #fef3c7; color: #92400e; }

        .card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: auto;
        }

        .empty {
          padding: 24px;
          border-radius: 20px;
          border: 1px dashed rgba(148,163,184,.5);
          color: #64748b;
          background: linear-gradient(180deg,#fff,#f8fafc);
        }

        .toast {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 80;
          background: #0f172a;
          color: #fff;
          border-radius: 18px;
          padding: 14px 16px;
          box-shadow: 0 22px 60px rgba(15,23,42,.25);
          font-weight: 850;
          max-width: 360px;
        }

        @media (max-width: 900px) {
          .form-grid, .toggle-grid {
            grid-template-columns: 1fr;
          }

          .hero, .panel {
            padding: 22px;
            border-radius: 24px;
          }

          .title {
            font-size: 30px;
          }
        }
      `}</style>

      <section className="hero">
        <div>
          <span className="eyebrow">OmniStage App</span>
          <h1 className="title">Lista de Presentes</h1>
          <p className="subtitle">
            Configure presentes físicos, experiências e presentes em valor para o evento{" "}
            <strong>{evento.nome || "sem nome"}</strong>.
          </p>
        </div>

        <div className="actions">
          <button onClick={() => router.push("/app/eventos")} className="secondary">
            Voltar
          </button>

          <button
            onClick={salvarConfiguracaoEvento}
            disabled={salvandoEvento}
            className="primary"
          >
            {salvandoEvento ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      </section>

      <section className="metrics">
        <Metric label="Itens cadastrados" value={stats.total} />
        <Metric label="Ativos" value={stats.ativos} />
        <Metric label="Presentes físicos" value={stats.presentes} />
        <Metric label="Experiências" value={stats.experiencias} />
        <Metric label="Presentes em valor" value={stats.valor} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Configuração do evento</h2>
            <p className="panel-desc">
              Defina se a lista ficará ativa e quais modalidades estarão disponíveis para os convidados.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label className="full toggle-card">
            <input
              type="checkbox"
              checked={evento.lista_presentes_ativa === true}
              onChange={(e) =>
                setEvento((old) =>
                  old ? { ...old, lista_presentes_ativa: e.target.checked } : old
                )
              }
            />
            <div>
              Lista de presentes ativa
              <span>Quando ativo, o convite público poderá exibir a lista para os convidados.</span>
            </div>
          </label>

          <label className="full">
            <span className="field-label">Título da lista</span>
            <input
              className="input"
              value={evento.lista_presentes_titulo || ""}
              onChange={(e) =>
                setEvento((old) =>
                  old ? { ...old, lista_presentes_titulo: e.target.value } : old
                )
              }
              placeholder="Ex: Lista de Presentes da Valentina"
            />
          </label>

          <div className="full toggle-grid">
            <label className="toggle-card">
              <input
                type="checkbox"
                checked={evento.presentes_fisicos_enabled === true}
                onChange={(e) =>
                  setEvento((old) =>
                    old ? { ...old, presentes_fisicos_enabled: e.target.checked } : old
                  )
                }
              />
              <div>
                Presentes físicos
                <span>Produtos, brinquedos, decoração, enxoval ou itens personalizados.</span>
              </div>
            </label>

            <label className="toggle-card">
              <input
                type="checkbox"
                checked={evento.experiencias_enabled === true}
                onChange={(e) =>
                  setEvento((old) =>
                    old ? { ...old, experiencias_enabled: e.target.checked } : old
                  )
                }
              />
              <div>
                Experiências
                <span>Passeios, viagens, jantares, museus, hospedagens e momentos especiais.</span>
              </div>
            </label>

            <label className="toggle-card">
              <input
                type="checkbox"
                checked={evento.presentes_valor_enabled === true}
                onChange={(e) =>
                  setEvento((old) =>
                    old ? { ...old, presentes_valor_enabled: e.target.checked } : old
                  )
                }
              />
              <div>
                Presentes em valor
                <span>Valores enviados via PIX para sonhos, viagens e experiências.</span>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Dados para presentes em valor</h2>
            <p className="panel-desc">
              Estes dados serão exibidos ao convidado quando ele escolher presentear em valor via PIX.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span className="field-label">Nome do recebedor</span>
            <input
              className="input"
              value={evento.pix_nome_recebedor || ""}
              onChange={(e) =>
                setEvento((old) =>
                  old ? { ...old, pix_nome_recebedor: e.target.value } : old
                )
              }
              placeholder="Ex: Valentina José"
            />
          </label>

          <label>
            <span className="field-label">Cidade do PIX</span>
            <input
              className="input"
              value={evento.pix_cidade || ""}
              onChange={(e) =>
                setEvento((old) =>
                  old ? { ...old, pix_cidade: e.target.value } : old
                )
              }
              placeholder="Ex: Macaé"
            />
          </label>

          <label className="full">
            <span className="field-label">Chave PIX</span>
            <input
              className="input"
              value={evento.pix_chave || ""}
              onChange={(e) =>
                setEvento((old) =>
                  old ? { ...old, pix_chave: e.target.value } : old
                )
              }
              placeholder="CPF, e-mail, telefone ou chave aleatória"
            />
          </label>
        </div>
      </section>

      <section
        id="form-item-lista-presentes"
        className={itemEditandoId ? "panel editing" : "panel"}
      >
        <div className="panel-head">
          <div>
            <h2 className="panel-title">
              {itemEditandoId ? "Editar item" : "Adicionar item"}
            </h2>
            <p className="panel-desc">
              {itemEditandoId
                ? "Altere as informações do item selecionado e salve."
                : "Cadastre presentes físicos, experiências ou sugestões de presentes em valor."}
            </p>
          </div>

          {itemEditandoId && (
            <button onClick={cancelarEdicao} className="secondary">
              Cancelar edição
            </button>
          )}
        </div>

        <div className="form-grid">
          <label>
            <span className="field-label">Tipo</span>
            <select
              className="select"
              value={formItem.tipo}
              onChange={(e) =>
                setFormItem((old) => ({
                  ...old,
                  tipo: e.target.value as FormItem["tipo"],
                }))
              }
            >
              <option value="presente">Presente físico</option>
              <option value="experiencia">Experiência</option>
              <option value="presente_valor">Presente em valor</option>
            </select>
          </label>

          <label>
            <span className="field-label">Valor sugerido</span>
            <input
              className="input"
              value={formItem.valor_sugerido}
              onChange={(e) =>
                setFormItem((old) => ({ ...old, valor_sugerido: e.target.value }))
              }
              placeholder="Ex: 250,00"
            />
          </label>

          <label className="full">
            <span className="field-label">Nome</span>
            <input
              className="input"
              value={formItem.nome}
              onChange={(e) =>
                setFormItem((old) => ({ ...old, nome: e.target.value }))
              }
              placeholder="Ex: Visita ao Louvre"
            />
          </label>

          <label className="full">
            <span className="field-label">Descrição</span>
            <textarea
              className="textarea"
              value={formItem.descricao}
              onChange={(e) =>
                setFormItem((old) => ({ ...old, descricao: e.target.value }))
              }
              placeholder="Ex: Uma experiência especial durante a viagem em família."
            />
          </label>

          <label>
            <span className="field-label">Imagem do item</span>
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImagemItem(file);
              }}
            />
            <div className="field-help">
              Envie uma imagem do computador. Links de produto, como Mercado Livre, não são imagem direta.
            </div>
          </label>

          <label>
            <span className="field-label">Quantidade</span>
            <input
              className="input"
              value={formItem.quantidade_total}
              onChange={(e) =>
                setFormItem((old) => ({
                  ...old,
                  quantidade_total: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="Opcional"
            />
          </label>

          <label className="full">
            <span className="field-label">URL da imagem</span>
            <input
              className="input"
              value={formItem.imagem_url}
              onChange={(e) =>
                setFormItem((old) => ({ ...old, imagem_url: e.target.value }))
              }
              placeholder="https://...jpg ou imagem enviada automaticamente"
            />
            {formItem.imagem_url && (
              <div className="image-preview-box">
                <img src={formItem.imagem_url} alt="Preview do item" />
                <a href={formItem.imagem_url} target="_blank" rel="noreferrer">
                  Abrir imagem
                </a>
              </div>
            )}
          </label>

          <label className="full toggle-card">
            <input
              type="checkbox"
              checked={formItem.ativo}
              onChange={(e) =>
                setFormItem((old) => ({ ...old, ativo: e.target.checked }))
              }
            />
            <div>
              Item ativo
              <span>Itens ativos ficam disponíveis para os convidados.</span>
            </div>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <button onClick={salvarItem} disabled={salvandoItem} className="primary">
            {salvandoItem
              ? "Salvando..."
              : itemEditandoId
              ? "Salvar alterações"
              : "Adicionar item"}
          </button>

          {itemEditandoId && (
            <button onClick={cancelarEdicao} className="secondary">
              Cancelar
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Itens cadastrados</h2>
            <p className="panel-desc">
              Gerencie os itens que aparecerão na lista pública do evento.
            </p>
          </div>

          <button onClick={carregarItems} className="secondary">
            Atualizar
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty">Nenhum item cadastrado ainda.</div>
        ) : (
          <div className="items-list">
            {items.map((item) => (
              <article
                key={item.id}
                className={itemEditandoId === item.id ? "gift-card editing" : "gift-card"}
              >
                {item.imagem_url ? (
                  <img className="gift-img" src={item.imagem_url} alt={item.nome} />
                ) : (
                  <div className="gift-img" />
                )}

                <div className="badge-row">
                  <span className="badge badge-purple">{labelTipo(item.tipo)}</span>
                  <span className={item.ativo ? "badge badge-green" : "badge badge-red"}>
                    {item.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <span className="badge badge-yellow">
                    {formatarMoeda(item.valor_sugerido)}
                  </span>
                </div>

                <h3 className="gift-title">{item.nome}</h3>

                {item.descricao && <p className="gift-desc">{item.descricao}</p>}

                <div className="card-actions">
                  <button onClick={() => editarItem(item)} className="warning">
                    Editar
                  </button>

                  <button onClick={() => alternarAtivo(item)} className="secondary">
                    {item.ativo ? "Desativar" : "Ativar"}
                  </button>

                  <button onClick={() => excluirItem(item)} className="danger">
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric">
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
    </article>
  );
}

function labelTipo(tipo: string) {
  if (tipo === "presente") return "Presente físico";
  if (tipo === "experiencia") return "Experiência";
  if (tipo === "presente_valor" || tipo === "cota_pix") return "Presente em valor";
  return tipo;
}

const loadingStyle: React.CSSProperties = {
  minHeight: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0f172a",
  fontWeight: 900,
};

