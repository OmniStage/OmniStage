"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type RelatorioActionsProps = {
  reportElementId: string;
  reportUrl: string;
  eventoNome: string;
  totalConvidados: number;
  confirmados: number;
  entradasConfirmados: number;
  restantes: number;
  taxaConfirmacao: number;
  taxaPresenca: number;
  taxaPresencaGeral: number;
  horaPico: string;
};

declare global {
  interface Window {
    html2canvas?: any;
  }
}

function buildWhatsappMessage({
  reportUrl,
  eventoNome,
  totalConvidados,
  confirmados,
  entradasConfirmados,
  restantes,
  taxaConfirmacao,
  taxaPresenca,
  taxaPresencaGeral,
  horaPico,
}: RelatorioActionsProps) {
  return [
    `📊 *Relatório do Evento - ${eventoNome}*`,
    "",
    `👥 Convidados: ${totalConvidados}`,
    `✅ Confirmados: ${confirmados}`,
    `🎟️ Entradas confirmadas: ${entradasConfirmados}`,
    `⚠️ No-show: ${restantes}`,
    "",
    `📈 RSVP: ${taxaConfirmacao}%`,
    `🟢 Presença sobre confirmados: ${taxaPresenca}%`,
    `🔥 Presença geral: ${taxaPresencaGeral}%`,
    `⏱️ Pico de entrada: ${horaPico}`,
    "",
    `Ver relatório completo: ${reportUrl}`,
  ].join("\n");
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar o gerador de imagem."));
    document.body.appendChild(script);
  });
}

export default function RelatorioActions(props: RelatorioActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  const whatsappMessage = useMemo(() => buildWhatsappMessage(props), [props]);

  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(
      props.reportUrl
    )}`;
  }, [props.reportUrl]);

  useEffect(() => {
    if (!liveMode) return;

    const interval = window.setInterval(() => {
      window.location.reload();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [liveMode]);

  async function getReportCanvas() {
    const element = document.getElementById(props.reportElementId);
    if (!element) throw new Error("Área do relatório não encontrada.");

    if (!window.html2canvas) {
      await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
    }

    if (!window.html2canvas) {
      throw new Error("Gerador de imagem indisponível.");
    }

    return window.html2canvas(element, {
      backgroundColor: "#f6f8fc",
      scale: Math.min(window.devicePixelRatio || 2, 2),
      ignoreElements: (node: Element) => node.classList?.contains("relatorios-actions"),
    });
  }

  async function downloadImage() {
    try {
      setIsGenerating(true);
      const canvas = await getReportCanvas();
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `relatorio-${props.eventoNome.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.click();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível gerar a imagem.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function shareImage() {
    try {
      setIsGenerating(true);
      const canvas = await getReportCanvas();

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Não foi possível preparar a imagem.");

      const file = new File([blob], `relatorio-${props.eventoNome}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Relatório - ${props.eventoNome}`,
          text: whatsappMessage,
          files: [file],
        });
        return;
      }

      await downloadImage();
      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, "_blank");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível compartilhar a imagem.");
    } finally {
      setIsGenerating(false);
    }
  }

  function shareWhatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, "_blank");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(props.reportUrl);
    alert("Link do relatório copiado.");
  }

  function exportPdf() {
    window.print();
  }

  return (
    <section
      className="relatorios-actions"
      style={{
        marginBottom: 34,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 28,
        padding: 22,
        boxShadow: "0 18px 42px rgba(15,23,42,.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#6d28d9",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Compartilhamento executivo
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              color: "#0f172a",
              fontSize: 24,
              lineHeight: 1.05,
              letterSpacing: "-.04em",
            }}
          >
            Enviar relatório do evento
          </h2>
        </div>

        <img
          src={qrCodeUrl}
          alt="QR Code do relatório"
          style={{
            width: 86,
            height: 86,
            borderRadius: 18,
            border: "1px solid #e2e8f0",
            background: "#fff",
            padding: 8,
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginTop: 20,
        }}
      >
        <button type="button" onClick={shareWhatsapp} style={buttonStyle("#16a34a", "#fff")}>
          WhatsApp
        </button>

        <button type="button" onClick={shareImage} disabled={isGenerating} style={buttonStyle("#6d28d9", "#fff")}>
          {isGenerating ? "Gerando..." : "Imagem + WhatsApp"}
        </button>

        <button type="button" onClick={downloadImage} disabled={isGenerating} style={buttonStyle("#0f172a", "#fff")}>
          Baixar imagem
        </button>

        <button type="button" onClick={exportPdf} style={buttonStyle("#fff", "#0f172a")}>
          Exportar PDF
        </button>

        <button type="button" onClick={copyLink} style={buttonStyle("#fff", "#0f172a")}>
          Copiar link
        </button>

        <button
          type="button"
          onClick={() => setLiveMode((value) => !value)}
          style={buttonStyle(liveMode ? "#dcfce7" : "#fff", liveMode ? "#16a34a" : "#0f172a")}
        >
          {liveMode ? "Live ligado" : "Live 60s"}
        </button>
      </div>
    </section>
  );
}

function buttonStyle(background: string, color: string): CSSProperties {
  return {
    minHeight: 48,
    borderRadius: 999,
    border: background === "#fff" ? "1px solid #e2e8f0" : "0",
    background,
    color,
    padding: "0 16px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: background === "#fff" ? "none" : "0 12px 24px rgba(15,23,42,.12)",
  };
}
