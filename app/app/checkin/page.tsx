import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nome: string | null;
  status: string | null;
};

export default async function CheckinPage() {
  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, nome, status")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 8,
          }}
        >
          OmniStage Check-in
        </div>

        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            margin: 0,
          }}
        >
          Escolha o evento
        </h1>

        <p
          style={{
            marginTop: 10,
            color: "var(--muted)",
            fontSize: 16,
          }}
        >
          Selecione o evento para abrir a portaria e iniciar o check-in.
        </p>
      </div>

      {!eventos?.length && (
        <div
          style={{
            padding: 20,
            border: "1px solid var(--line)",
            borderRadius: 16,
            background: "var(--card)",
          }}
        >
          Nenhum evento encontrado.
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {eventos?.map((evento) => (
          <Link
            key={evento.id}
            href={`/app/eventos/${evento.id}/checkin`}
            style={{
              display: "block",
              padding: 20,
              borderRadius: 18,
              border: "1px solid var(--line)",
              background: "var(--card)",
              textDecoration: "none",
              color: "var(--text)",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 900,
                  }}
                >
                  {evento.nome || "Evento sem nome"}
                </h2>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  ID: {evento.id}
                  {evento.status && ` • ${evento.status}`}
                </div>
              </div>

              <div
                style={{
                  alignSelf: "center",
                  background: "#6d28d9",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 12,
                  fontWeight: 900,
                }}
              >
                Abrir
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
