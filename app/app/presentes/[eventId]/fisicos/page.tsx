import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getIAStatus(record: any) {
  if (!record.foto_url) {
    return {
      label: "Sem foto",
      className:
        "bg-gray-100 text-gray-600 border border-gray-200",
    };
  }

  if (!record.ia_processado) {
    return {
      label: "Processando IA",
      className:
        "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }

  return {
    label: "IA detectada",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
}

export default async function PresentesFisicosPage({
  params,
}: PageProps) {
  const { eventId } = await params;

  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, nome")
    .eq("id", eventId)
    .single();

  const { data: presentes = [] } = await supabase
    .from("event_gift_records")
    .select("*")
    .eq("evento_id", eventId)
    .eq("tipo_presente", "presente_fisico")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-white/60 bg-gradient-to-r from-[#f6f0ff] to-[#eefbf5] p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                Presentes físicos
              </div>

              <h1 className="text-4xl font-black tracking-tight text-[#101828]">
                Recepção no evento
              </h1>

              <p className="mt-3 max-w-3xl text-base text-[#667085]">
                Controle presentes recebidos no check-in,
                etiquetas, embalagens e análise automática
                por IA.
              </p>

              <div className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#344054] shadow-sm">
                {evento?.nome || "Evento"}
              </div>
            </div>

            <Link
              href={`/app/presentes/${eventId}/lista`}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#111827] transition hover:bg-[#f9fafb]"
            >
              Voltar para presentes
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              Presentes físicos
            </div>

            <div className="mt-2 text-4xl font-black text-[#111827]">
              {presentes.length}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              IA processados
            </div>

            <div className="mt-2 text-4xl font-black text-[#111827]">
              {
                presentes.filter(
                  (item) => item.ia_processado
                ).length
              }
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              Pendentes IA
            </div>

            <div className="mt-2 text-4xl font-black text-[#111827]">
              {
                presentes.filter(
                  (item) => !item.ia_processado
                ).length
              }
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
              Fotos registradas
            </div>

            <div className="mt-2 text-4xl font-black text-[#111827]">
              {
                presentes.filter(
                  (item) => item.foto_url
                ).length
              }
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {presentes.map((presente: any) => {
            const iaStatus = getIAStatus(presente);

            return (
              <div
                key={presente.id}
                className="overflow-hidden rounded-[32px] border border-[#eaecf0] bg-white shadow-sm"
              >
                <div className="relative aspect-[4/3] bg-[#f4f4f5]">
                  {presente.foto_url ? (
                    <img
                      src={presente.foto_url}
                      alt="Presente"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-[#667085]">
                      Sem foto
                    </div>
                  )}

                  <div className="absolute left-4 top-4">
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${iaStatus.className}`}
                    >
                      {iaStatus.label}
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-[#111827]">
                        {presente.nome_convidado ||
                          "Convidado"}
                      </h2>

                      <p className="mt-1 text-sm font-medium text-[#667085]">
                        {presente.grupo || "-"}
                      </p>
                    </div>

                    <div className="rounded-full bg-[#f4ebff] px-3 py-1 text-xs font-bold text-violet-700">
                      {presente.etiqueta_codigo}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl bg-[#f9fafb] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Categoria detectada
                      </div>

                      <div className="mt-1 text-base font-bold text-[#111827]">
                        {presente.categoria_detectada ||
                          "Aguardando IA"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#f9fafb] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Marca detectada
                      </div>

                      <div className="mt-1 text-base font-bold text-[#111827]">
                        {presente.marca_detectada ||
                          "Aguardando IA"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-sm text-[#667085]">
                    <span>
                      Confiança IA:
                    </span>

                    <span className="font-bold text-[#111827]">
                      {presente.ia_confianca
                        ? `${Math.round(
                            presente.ia_confianca * 100
                          )}%`
                        : "-"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-[#667085]">
                    <span>
                      Registrado em
                    </span>

                    <span className="font-semibold text-[#111827]">
                      {formatDate(
                        presente.created_at
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!presentes.length && (
          <div className="mt-8 rounded-[32px] border border-dashed border-[#d0d5dd] bg-white p-16 text-center">
            <div className="text-lg font-bold text-[#111827]">
              Nenhum presente físico registrado
            </div>

            <p className="mt-2 text-[#667085]">
              Os presentes registrados no check-in
              aparecerão aqui automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
