"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    Html5Qrcode?: any;
  }
}

type Convidado = {
  id: string;
  evento_id: string | null;
  tenant_id: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
  token: string;
  status_rsvp: string | null;
  checkin_realizado: boolean | null;
  data_checkin: string | null;
  status_checkin: string | null;
  grupo: string | null;
};

export default function CheckinPage({
  params,
}: {
  params: { eventId: string };
}) {
  const eventoId = params.eventId;

  const [convidados, setConvidados] = useState<Convidado[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [qrAtivo, setQrAtivo] = useState(false);
  const [scannerPronto, setScannerPronto] = useState(false);

  const qrRef = useRef<any>(null);

  useEffect(() => {
    carregar();
    carregarQr();
    return () => pararQr();
  }, []);

  async function carregar() {
    setLoading(true);

    const { data } = await supabase
      .from("convidados")
      .select("*")
      .eq("evento_id", eventoId)
      .ilike("status_rsvp", "confirmado");

    setConvidados((data || []) as Convidado[]);
    setLoading(false);
  }

  function carregarQr() {
    if (window.Html5Qrcode) {
      setScannerPronto(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onload = () => setScannerPronto(true);

    document.body.appendChild(script);
  }

  function normalizar(v: any) {
    return String(v || "").toUpperCase().trim();
  }

  function entrou(c: Convidado) {
    return c.checkin_realizado || normalizar(c.status_checkin) === "ENTROU";
  }

  async function liberar(c: Convidado) {
    if (entrou(c)) return;

    const agora = new Date().toISOString();

    setConvidados((prev) =>
      prev.map((i) =>
        i.id === c.id
          ? {
              ...i,
              checkin_realizado: true,
              status_checkin: "entrou",
              data_checkin: agora,
            }
          : i
      )
    );

    await supabase
      .from("convidados")
      .update({
        checkin_realizado: true,
        status_checkin: "entrou",
        data_checkin: agora,
      })
      .eq("id", c.id);
  }

  async function iniciarQr() {
    if (!window.Html5Qrcode || qrAtivo) return;

    const qr = new window.Html5Qrcode("qr");
    qrRef.current = qr;

    await qr.start(
      { facingMode: "environment" },
      { fps: 10 },
      async (txt: string) => {
        const token = txt.trim();

        const convidado = convidados.find(
          (c) => normalizar(c.token) === normalizar(token)
        );

        if (convidado) await liberar(convidado);
      }
    );

    setQrAtivo(true);
  }

  async function pararQr() {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        await qrRef.current.clear();
      }
    } catch {}
    setQrAtivo(false);
  }

  const lista = convidados.filter((c) =>
    normalizar(c.nome).includes(normalizar(busca))
  );

  return (
    <main style={{ padding: 24 }}>
      <h1>Check-in Evento</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={carregar}>Atualizar</button>
        <button onClick={qrAtivo ? pararQr : iniciarQr}>
          {qrAtivo ? "Parar QR" : "Iniciar QR"}
        </button>
      </div>

      <input
        placeholder="Buscar nome"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div id="qr" style={{ width: 300, height: 300 }} />

      {loading ? (
        <p>Carregando...</p>
      ) : (
        lista.map((c) => (
          <div key={c.id}>
            <strong>{c.nome}</strong>
            <button onClick={() => liberar(c)}>
              {entrou(c) ? "Entrou" : "Liberar"}
            </button>
          </div>
        ))
      )}
    </main>
  );
}
