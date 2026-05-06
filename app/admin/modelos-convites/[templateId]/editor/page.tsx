"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Rnd } from "react-rnd";
import { supabase } from "@/lib/supabase";

type BlockType =
  | "text"
  | "event_name"
  | "guest_name"
  | "date_time"
  | "location"
  | "logo"
  | "button"
  | "divider"
  | "qr";

type ConviteBlock = {
  id: string;
  template_id: string;
  type: BlockType;
  label: string | null;
  content: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  font_family: string;
  color: string;
  background: string | null;
  border_radius: number;
  z_index: number;
  visible: boolean;
};

type TemplateData = {
  id: string;
  nome: string | null;
  name: string | null;
  html_template: string | null;
  preview_image: string | null;
};

const CANVAS_W = 430;
const CANVAS_H = 920;

const buttonBase: CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #dbe3ef",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  ...buttonBase,
  border: "none",
  background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
  color: "#fff",
  boxShadow: "0 12px 26px rgba(124,58,237,.22)",
};

const smallButton: CSSProperties = {
  ...buttonBase,
  minHeight: 34,
  padding: "0 10px",
  borderRadius: 10,
  fontSize: 12,
};

function toNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function defaultBlock(
  templateId: string,
  type: BlockType,
  nextZ: number,
): ConviteBlock {
  const base = {
    id: createLocalId(),
    template_id: templateId,
    type,
    label: null,
    content: "Novo texto",
    x: 80,
    y: 120,
    width: 260,
    height: 70,
    font_size: 24,
    font_family: "Inter",
    color: "#ffffff",
    background: null,
    border_radius: 12,
    z_index: nextZ,
    visible: true,
  };

  if (type === "event_name") {
    return {
      ...base,
      label: "Nome do evento",
      content: "{{nome_evento}}",
      x: 42,
      y: 160,
      width: 346,
      height: 82,
      font_size: 38,
      color: "#f7d477",
    };
  }

  if (type === "guest_name") {
    return {
      ...base,
      label: "Nome do convidado",
      content: "{{nome_convidado}}",
      x: 55,
      y: 260,
      width: 320,
      height: 56,
      font_size: 24,
    };
  }

  if (type === "date_time") {
    return {
      ...base,
      label: "Data e horário",
      content: "{{data_evento}} • {{hora_evento}}",
      x: 55,
      y: 340,
      width: 320,
      height: 50,
      font_size: 22,
    };
  }

  if (type === "location") {
    return {
      ...base,
      label: "Local",
      content: "{{local_evento}}",
      x: 55,
      y: 400,
      width: 320,
      height: 50,
      font_size: 21,
    };
  }

  if (type === "logo") {
    return {
      ...base,
      label: "Logo do evento",
      content: "{{logo_evento}}",
      x: 145,
      y: 60,
      width: 140,
      height: 140,
      font_size: 16,
      color: "#ffffff",
      background: "rgba(255,255,255,.12)",
      border_radius: 24,
    };
  }

  if (type === "button") {
    return {
      ...base,
      label: "Botão",
      content: "CONFIRMAR PRESENÇA",
      x: 55,
      y: 620,
      width: 320,
      height: 58,
      font_size: 17,
      color: "#ffffff",
      background: "rgba(255,255,255,.14)",
      border_radius: 18,
    };
  }

  if (type === "divider") {
    return {
      ...base,
      label: "Linha",
      content: "",
      x: 55,
      y: 560,
      width: 320,
      height: 2,
      font_size: 1,
      background: "rgba(255,255,255,.32)",
      border_radius: 999,
    };
  }

  if (type === "qr") {
    return {
      ...base,
      label: "QR Code",
      content: "{{qr_code}}",
      x: 150,
      y: 710,
      width: 130,
      height: 130,
      font_size: 12,
      color: "#0f172a",
      background: "#ffffff",
      border_radius: 16,
    };
  }

  return base;
}

function renderBlock(block: ConviteBlock, selected: boolean, updateContent: (content: string) => void) {
  const shared: CSSProperties = {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    borderRadius: block.border_radius,
    color: block.color,
    background: block.background || "transparent",
    fontFamily: block.font_family,
    fontSize: block.font_size,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    lineHeight: 1.12,
    padding: block.type === "divider" ? 0 : 8,
    outline: selected ? "2px solid #a78bfa" : "1px dashed rgba(255,255,255,.36)",
    boxShadow: selected ? "0 0 0 4px rgba(124,58,237,.18)" : "none",
    overflow: "hidden",
    userSelect: "none",
  };

  if (block.type === "logo") {
    return (
      <div style={shared}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            borderRadius: block.border_radius,
            background:
              "radial-gradient(circle at 50% 0%, rgba(255,255,255,.26), rgba(255,255,255,.08))",
          }}
        >
          <div style={{ fontSize: Math.max(12, block.font_size), opacity: 0.92 }}>
            LOGO<br />EVENTO
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "qr") {
    return (
      <div style={shared}>
        <div
          style={{
            width: "78%",
            height: "78%",
            borderRadius: 8,
            background:
              "linear-gradient(90deg,#111 10px,transparent 10px) 0 0/22px 22px, linear-gradient(#111 10px,transparent 10px) 0 0/22px 22px, #fff",
            opacity: 0.92,
          }}
        />
      </div>
    );
  }

  if (block.type === "divider") {
    return <div style={shared} />;
  }

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => updateContent(e.currentTarget.innerText)}
      style={shared}
    >
      {block.content}
    </div>
  );
}

export default function EditorModeloConvitePage({
  params,
}: {
  params: { templateId: string };
}) {
  const templateId = params.templateId;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [blocks, setBlocks] = useState<ConviteBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) || null,
    [blocks, selectedId],
  );

  const nextZ = useMemo(() => {
    return Math.max(0, ...blocks.map((b) => b.z_index || 0)) + 1;
  }, [blocks]);

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  async function carregarTudo() {
    setLoading(true);

    const [{ data: templateData }, { data: blockData, error: blocksError }] =
      await Promise.all([
        supabase
          .from("invite_templates")
          .select("id, nome, name, html_template, preview_image")
          .eq("id", templateId)
          .single(),
        supabase
          .from("invite_template_blocks")
          .select("*")
          .eq("template_id", templateId)
          .order("z_index", { ascending: true }),
      ]);

    if (templateData) setTemplate(templateData as TemplateData);

    if (blocksError) {
      alert(
        "Erro ao carregar blocos. Confirme se a tabela invite_template_blocks foi criada no Supabase: " +
          blocksError.message,
      );
    }

    const loadedBlocks = (blockData || []).map((b: any) => ({
      id: String(b.id),
      template_id: String(b.template_id),
      type: (b.type || "text") as BlockType,
      label: b.label || null,
      content: b.content || "",
      x: toNumber(b.x, 0),
      y: toNumber(b.y, 0),
      width: toNumber(b.width, 200),
      height: toNumber(b.height, 60),
      font_size: toNumber(b.font_size, 24),
      font_family: b.font_family || "Inter",
      color: b.color || "#ffffff",
      background: b.background || null,
      border_radius: toNumber(b.border_radius, 0),
      z_index: toNumber(b.z_index, 1),
      visible: b.visible !== false,
    })) as ConviteBlock[];

    setBlocks(
      loadedBlocks.length
        ? loadedBlocks
        : [
            defaultBlock(templateId, "event_name", 1),
            {
              ...defaultBlock(templateId, "date_time", 2),
              y: 250,
            },
            {
              ...defaultBlock(templateId, "location", 3),
              y: 310,
            },
            {
              ...defaultBlock(templateId, "button", 4),
              y: 640,
            },
          ],
    );

    setLoading(false);
  }

  function updateBlock(id: string, updates: Partial<ConviteBlock>) {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? {
              ...block,
              ...updates,
            }
          : block,
      ),
    );
  }

  function addBlock(type: BlockType) {
    const block = defaultBlock(templateId, type, nextZ);
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setBlocks((prev) => prev.filter((b) => b.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedBlock) return;

    const duplicate: ConviteBlock = {
      ...selectedBlock,
      id: createLocalId(),
      x: selectedBlock.x + 18,
      y: selectedBlock.y + 18,
      z_index: nextZ,
    };

    setBlocks((prev) => [...prev, duplicate]);
    setSelectedId(duplicate.id);
  }

  function bringForward() {
    if (!selectedBlock) return;
    updateBlock(selectedBlock.id, { z_index: nextZ });
  }

  async function salvarBlocos() {
    setSaving(true);

    const { error: deleteError } = await supabase
      .from("invite_template_blocks")
      .delete()
      .eq("template_id", templateId);

    if (deleteError) {
      setSaving(false);
      alert("Erro ao limpar blocos antigos: " + deleteError.message);
      return;
    }

    const payload = blocks.map((b, index) => ({
      template_id: templateId,
      type: b.type,
      label: b.label,
      content: b.content,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      font_size: b.font_size,
      font_family: b.font_family,
      color: b.color,
      background: b.background,
      border_radius: b.border_radius,
      z_index: b.z_index || index + 1,
      visible: b.visible,
    }));

    const { error } = await supabase.from("invite_template_blocks").insert(payload);

    setSaving(false);

    if (error) {
      alert("Erro ao salvar blocos: " + error.message);
      return;
    }

    alert("Layout salvo!");
    await carregarTudo();
  }

  return (
    <main style={page}>
      <section style={topbar}>
        <div>
          <div style={eyebrow}>Editor Visual OmniStage</div>
          <h1 style={title}>
            {template?.nome || template?.name || "Editor de Convite"}
          </h1>
          <p style={subtitle}>
            Arraste, redimensione, altere fonte e posicione os elementos do convite.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            style={buttonBase}
            onClick={() => {
              window.location.href = "/admin/modelos-convites";
            }}
          >
            Voltar
          </button>

          <button style={primaryButton} onClick={salvarBlocos} disabled={saving}>
            {saving ? "Salvando..." : "Salvar layout"}
          </button>
        </div>
      </section>

      <section style={layout}>
        <aside style={panel}>
          <h2 style={panelTitle}>Componentes</h2>

          <div style={componentGrid}>
            <button style={smallButton} onClick={() => addBlock("text")}>
              + Texto
            </button>
            <button style={smallButton} onClick={() => addBlock("event_name")}>
              + Nome evento
            </button>
            <button style={smallButton} onClick={() => addBlock("guest_name")}>
              + Convidado
            </button>
            <button style={smallButton} onClick={() => addBlock("date_time")}>
              + Data/hora
            </button>
            <button style={smallButton} onClick={() => addBlock("location")}>
              + Local
            </button>
            <button style={smallButton} onClick={() => addBlock("logo")}>
              + Logo evento
            </button>
            <button style={smallButton} onClick={() => addBlock("button")}>
              + Botão
            </button>
            <button style={smallButton} onClick={() => addBlock("divider")}>
              + Linha
            </button>
            <button style={smallButton} onClick={() => addBlock("qr")}>
              + QR
            </button>
          </div>

          <div style={divider} />

          <h2 style={panelTitle}>Bloco selecionado</h2>

          {!selectedBlock ? (
            <div style={emptyBox}>Clique em um bloco no convite para editar.</div>
          ) : (
            <div style={editStack}>
              <label style={field}>
                <span style={label}>Conteúdo / variável</span>
                <textarea
                  value={selectedBlock.content || ""}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, { content: e.target.value })
                  }
                  style={textarea}
                />
              </label>

              <div style={twoCols}>
                <label style={field}>
                  <span style={label}>Fonte</span>
                  <input
                    type="number"
                    min={8}
                    max={120}
                    value={selectedBlock.font_size}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        font_size: Number(e.target.value),
                      })
                    }
                    style={input}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Arredondar</span>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={selectedBlock.border_radius}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        border_radius: Number(e.target.value),
                      })
                    }
                    style={input}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={smallButton}
                  onClick={() =>
                    updateBlock(selectedBlock.id, {
                      font_size: Math.max(8, selectedBlock.font_size - 2),
                    })
                  }
                >
                  A-
                </button>
                <button
                  style={smallButton}
                  onClick={() =>
                    updateBlock(selectedBlock.id, {
                      font_size: Math.min(140, selectedBlock.font_size + 2),
                    })
                  }
                >
                  A+
                </button>
                <button style={smallButton} onClick={bringForward}>
                  Frente
                </button>
              </div>

              <div style={twoCols}>
                <label style={field}>
                  <span style={label}>Cor</span>
                  <input
                    type="color"
                    value={selectedBlock.color || "#ffffff"}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { color: e.target.value })
                    }
                    style={colorInput}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Fundo</span>
                  <input
                    value={selectedBlock.background || ""}
                    placeholder="transparent, #fff, rgba(...)"
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        background: e.target.value || null,
                      })
                    }
                    style={input}
                  />
                </label>
              </div>

              <div style={twoCols}>
                <label style={field}>
                  <span style={label}>X</span>
                  <input
                    type="number"
                    value={selectedBlock.x}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { x: Number(e.target.value) })
                    }
                    style={input}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Y</span>
                  <input
                    type="number"
                    value={selectedBlock.y}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, { y: Number(e.target.value) })
                    }
                    style={input}
                  />
                </label>
              </div>

              <div style={twoCols}>
                <label style={field}>
                  <span style={label}>Largura</span>
                  <input
                    type="number"
                    value={selectedBlock.width}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        width: Number(e.target.value),
                      })
                    }
                    style={input}
                  />
                </label>

                <label style={field}>
                  <span style={label}>Altura</span>
                  <input
                    type="number"
                    value={selectedBlock.height}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        height: Number(e.target.value),
                      })
                    }
                    style={input}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={smallButton} onClick={duplicateSelected}>
                  Duplicar
                </button>
                <button
                  style={{
                    ...smallButton,
                    background: "#fee2e2",
                    color: "#991b1b",
                  }}
                  onClick={deleteSelected}
                >
                  Excluir
                </button>
              </div>
            </div>
          )}

          <div style={divider} />

          <h2 style={panelTitle}>Variáveis dinâmicas</h2>
          <div style={variables}>
            {[
              "{{nome_evento}}",
              "{{nome_convidado}}",
              "{{data_evento}}",
              "{{hora_evento}}",
              "{{local_evento}}",
              "{{endereco_evento}}",
              "{{logo_evento}}",
              "{{qr_code}}",
              "{{link_rsvp}}",
            ].map((v) => (
              <button
                key={v}
                style={variablePill}
                onClick={() => {
                  if (!selectedBlock) return;
                  updateBlock(selectedBlock.id, {
                    content: `${selectedBlock.content || ""}${v}`,
                  });
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </aside>

        <section style={canvasArea}>
          {loading ? (
            <div style={emptyBox}>Carregando editor...</div>
          ) : (
            <div style={phoneFrame}>
              <div style={canvas}>
                {blocks
                  .filter((b) => b.visible)
                  .sort((a, b) => a.z_index - b.z_index)
                  .map((block) => {
                    const selected = selectedId === block.id;

                    return (
                      <Rnd
                        key={block.id}
                        size={{
                          width: block.width,
                          height: block.height,
                        }}
                        position={{
                          x: block.x,
                          y: block.y,
                        }}
                        bounds="parent"
                        onMouseDown={() => setSelectedId(block.id)}
                        onDragStop={(_, d) => {
                          updateBlock(block.id, {
                            x: Math.round(d.x),
                            y: Math.round(d.y),
                          });
                        }}
                        onResizeStop={(_, __, ref, ___, position) => {
                          updateBlock(block.id, {
                            width: Math.round(ref.offsetWidth),
                            height: Math.round(ref.offsetHeight),
                            x: Math.round(position.x),
                            y: Math.round(position.y),
                          });
                        }}
                        style={{
                          zIndex: block.z_index,
                        }}
                      >
                        {renderBlock(block, selected, (content) =>
                          updateBlock(block.id, { content }),
                        )}
                      </Rnd>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 20% 0%, #f5f3ff 0, transparent 36%), #eef2ff",
  color: "#0f172a",
  padding: 24,
};

const topbar: CSSProperties = {
  background: "rgba(255,255,255,.9)",
  border: "1px solid #dbe3ef",
  borderRadius: 24,
  padding: 22,
  marginBottom: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  boxShadow: "0 18px 44px rgba(15,23,42,.08)",
};

const eyebrow: CSSProperties = {
  color: "#7c3aed",
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: ".12em",
};

const title: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 34,
  lineHeight: 1,
  letterSpacing: "-.04em",
};

const subtitle: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontWeight: 700,
};

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: 18,
  alignItems: "start",
};

const panel: CSSProperties = {
  background: "rgba(255,255,255,.92)",
  border: "1px solid #dbe3ef",
  borderRadius: 24,
  padding: 18,
  boxShadow: "0 18px 44px rgba(15,23,42,.08)",
  position: "sticky",
  top: 18,
  maxHeight: "calc(100vh - 36px)",
  overflow: "auto",
};

const panelTitle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 16,
};

const componentGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const divider: CSSProperties = {
  height: 1,
  background: "#e2e8f0",
  margin: "18px 0",
};

const emptyBox: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: 16,
  padding: 18,
  color: "#64748b",
  background: "#f8fafc",
  textAlign: "center",
};

const editStack: CSSProperties = {
  display: "grid",
  gap: 12,
};

const field: CSSProperties = {
  display: "grid",
  gap: 6,
};

const label: CSSProperties = {
  fontSize: 12,
  color: "#475569",
  fontWeight: 900,
};

const input: CSSProperties = {
  width: "100%",
  minHeight: 40,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: "0 10px",
  boxSizing: "border-box",
};

const textarea: CSSProperties = {
  width: "100%",
  minHeight: 72,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: 10,
  boxSizing: "border-box",
  resize: "vertical",
};

const colorInput: CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: 4,
  boxSizing: "border-box",
};

const twoCols: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const variables: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const variablePill: CSSProperties = {
  border: "1px solid #ddd6fe",
  background: "#f5f3ff",
  color: "#6d28d9",
  borderRadius: 999,
  padding: "6px 8px",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const canvasArea: CSSProperties = {
  minHeight: "calc(100vh - 160px)",
  display: "grid",
  placeItems: "start center",
  overflow: "auto",
  padding: "18px 0 60px",
};

const phoneFrame: CSSProperties = {
  width: CANVAS_W,
  height: CANVAS_H,
  borderRadius: 34,
  padding: 0,
  background: "#020617",
  boxShadow: "0 34px 90px rgba(15,23,42,.34)",
  overflow: "hidden",
};

const canvas: CSSProperties = {
  width: CANVAS_W,
  height: CANVAS_H,
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,.11), transparent 30%), linear-gradient(180deg,#0b1530,#211f63)",
};
