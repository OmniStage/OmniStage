"use client";

import { useState } from "react";

type ImportMode = "spreadsheet" | "smart_paste" | "whatsapp_txt";

export default function ConvidadosPage({
  params,
}: {
  params: { eventId: string };
}) {
  const [mode, setMode] = useState<ImportMode>("spreadsheet");

  return (
    <main className="min-h-screen bg-[#07070A] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="text-sm text-white/50">OmniStage</p>
          <h1 className="text-3xl font-semibold">Convidados</h1>
          <p className="text-white/60 mt-2">
            Importe convidados por planilha, lista inteligente ou arquivo TXT do WhatsApp.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ImportCard
            active={mode === "spreadsheet"}
            title="Planilha"
            description="Excel, CSV ou modelo padrão."
            onClick={() => setMode("spreadsheet")}
          />

          <ImportCard
            active={mode === "smart_paste"}
            title="Colar lista inteligente"
            description="Cole nomes, grupos e quantidades."
            onClick={() => setMode("smart_paste")}
          />

          <ImportCard
            active={mode === "whatsapp_txt"}
            title="WhatsApp TXT"
            description="Importe conversa exportada do WhatsApp."
            onClick={() => setMode("whatsapp_txt")}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          {mode === "spreadsheet" && <SpreadsheetImport eventId={params.eventId} />}
          {mode === "smart_paste" && <SmartPasteImport eventId={params.eventId} />}
          {mode === "whatsapp_txt" && <WhatsappTxtImport eventId={params.eventId} />}
        </section>
      </div>
    </main>
  );
}

function ImportCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "text-left rounded-3xl border p-5 transition",
        active
          ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_40px_rgba(250,204,21,0.15)]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-white/55 mt-2">{description}</p>
    </button>
  );
}

function SpreadsheetImport({ eventId }: { eventId: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Importar por planilha</h2>
      <p className="text-white/60 mt-2">
        Aceita CSV ou Excel. Depois vamos mostrar uma prévia antes de salvar.
      </p>

      <input
        type="file"
        accept=".csv,.xlsx"
        className="mt-6 block w-full rounded-2xl border border-white/10 bg-black/30 p-4"
      />

      <button className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-black">
        Ler planilha
      </button>
    </div>
  );
}

function SmartPasteImport({ eventId }: { eventId: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Colar lista inteligente</h2>
      <p className="text-white/60 mt-2">
        Exemplo: João, Maria +1, Família Silva (4), Pedro - 21999999999.
      </p>

      <textarea
        rows={10}
        placeholder={`João da Silva\nMaria +1\nFamília Souza (4)\nCarlos - 21999999999`}
        className="mt-6 w-full rounded-2xl border border-white/10 bg-black/30 p-4 outline-none"
      />

      <button className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-black">
        Interpretar lista
      </button>
    </div>
  );
}

function WhatsappTxtImport({ eventId }: { eventId: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Importar TXT do WhatsApp</h2>
      <p className="text-white/60 mt-2">
        O cliente exporta a conversa do WhatsApp e envia o arquivo .txt.
      </p>

      <input
        type="file"
        accept=".txt"
        className="mt-6 block w-full rounded-2xl border border-white/10 bg-black/30 p-4"
      />

      <button className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-black">
        Ler conversa
      </button>
    </div>
  );
}
