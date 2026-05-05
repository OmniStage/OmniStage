import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string | null;
  status: string | null;
  created_at: string | null;
};

export default async function CheckinPage() {
  const { data: eventos, error } = await supabase
    .from("eventos")
    .select("id, nome, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] p-8 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Erro ao carregar eventos</h1>
          <p className="mt-3 text-slate-500">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] p-6 text-slate-950 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
            OmniStage Check-in
          </div>

          <h1 className="text-4xl font-semibold tracking-tight">
            Escolha o evento
          </h1>

          <p className="mt-2 text-slate-500">
            Selecione o evento para abrir a portaria, QR code e check-in manual.
          </p>
        </div>

        {!eventos?.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
            Nenhum evento encontrado.
          </div>
        ) : (
          <div className="grid gap-4">
            {(eventos as Evento[]).map((evento) => (
              <Link
                key={evento.id}
                href={`/app/eventos/${evento.id}/checkin`}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {evento.nome || "Evento sem nome"}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                      <span>ID: {evento.id}</span>
                      {evento.status && <span>• Status: {evento.status}</span>}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition group-hover:bg-slate-800">
                    Abrir check-in
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
