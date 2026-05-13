"use client";

type GrupoConvidado = {
  id: string;
  nome: string;
  telefone: string | null;
  token: string | null;
};

type CartaoActionsProps = {
  whatsappUrl: string;
  isGrupoPrincipal: boolean;
  grupoNome: string | null;
  integrantesGrupo: GrupoConvidado[];
  nomeEvento: string;
  siteUrl: string;
};

function somenteNumeros(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

export default function CartaoActions({
  whatsappUrl,
  isGrupoPrincipal,
  grupoNome,
  integrantesGrupo,
  nomeEvento,
  siteUrl,
}: CartaoActionsProps) {
  function abrirWhatsAppIntegrante(integrante: GrupoConvidado) {
    if (!integrante.token) return;

    const telefone = somenteNumeros(integrante.telefone);
    const linkCartao = `${siteUrl}/cartao/${encodeURIComponent(integrante.token)}`;

    const mensagem = encodeURIComponent(
      `Olá ${integrante.nome} ✨\n\nSegue seu cartão de entrada para o evento ${nomeEvento}:\n\n${linkCartao}\n\nApresente o QR Code na entrada do evento.`,
    );

    const url = telefone
      ? `https://wa.me/${telefone}?text=${mensagem}`
      : `https://wa.me/?text=${mensagem}`;

    window.open(url, "_blank");
    localStorage.setItem(`cartao_enviado_${integrante.token}`, "1");

    const item = document.getElementById(`status-${integrante.id}`);
    if (item) item.textContent = "✓ Enviado neste aparelho";
  }

  return (
    <div style={{ marginTop: 18 }}>
      {isGrupoPrincipal && integrantesGrupo.length > 1 ? (
        <div
          style={{
            border: "1px solid rgba(37,211,102,.28)",
            background: "rgba(37,211,102,.08)",
            borderRadius: 18,
            padding: 14,
            textAlign: "left",
          }}
        >
          <strong
            style={{
              display: "block",
              color: "#25D366",
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            Cartões do grupo {grupoNome ? `• ${grupoNome}` : ""}
          </strong>

          <p
            style={{
              margin: "0 0 12px",
              color: "rgba(255,255,255,.72)",
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            Envie pelo WhatsApp, visualize ou abra o cartão individual para salvar.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {integrantesGrupo.map((integrante) => {
              const jaEnviado =
                typeof window !== "undefined" &&
                integrante.token &&
                localStorage.getItem(`cartao_enviado_${integrante.token}`) ===
                  "1";

              const linkVisualizar = integrante.token
                ? `${siteUrl}/cartao/${encodeURIComponent(integrante.token)}?preview=1`
                : "#";

              const linkSalvar = integrante.token
                ? `${siteUrl}/cartao/${encodeURIComponent(integrante.token)}?save=1`
                : "#";

              return (
                <div
                  key={integrante.id}
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: 12,
                    borderRadius: 14,
                    background: "rgba(255,255,255,.07)",
                    border: "1px solid rgba(255,255,255,.10)",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: 13 }}>
                      {integrante.nome}
                    </strong>

                    <small
                      id={`status-${integrante.id}`}
                      style={{
                        color: jaEnviado
                          ? "#25D366"
                          : "rgba(255,255,255,.62)",
                        fontSize: 11,
                      }}
                    >
                      {jaEnviado
                        ? "✓ Enviado neste aparelho"
                        : integrante.telefone
                          ? `Telefone: ${integrante.telefone}`
                          : "Sem telefone cadastrado"}
                    </small>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(105px, 1fr))",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => abrirWhatsAppIntegrante(integrante)}
                      disabled={!integrante.token}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "10px 12px",
                        background:
                          "linear-gradient(180deg, #25D366, #128C7E)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: integrante.token ? "pointer" : "not-allowed",
                        opacity: integrante.token ? 1 : 0.45,
                      }}
                    >
                      WhatsApp
                    </button>

                    <a
                      href={linkVisualizar}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        borderRadius: 999,
                        padding: "10px 12px",
                        background:
                          "linear-gradient(180deg, #ffffff, #dbeafe)",
                        color: "#0d1d3d",
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: "none",
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: integrante.token ? 1 : 0.45,
                        pointerEvents: integrante.token ? "auto" : "none",
                      }}
                    >
                      Visualizar
                    </a>

                    <a
                      href={linkSalvar}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        borderRadius: 999,
                        padding: "10px 12px",
                        background:
                          "linear-gradient(180deg, #e1c178, #cfa958)",
                        color: "#0d1d3d",
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: "none",
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: integrante.token ? 1 : 0.45,
                        pointerEvents: integrante.token ? "auto" : "none",
                      }}
                    >
                      Salvar
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            border: "none",
            borderRadius: 999,
            padding: "12px 16px",
            background: "linear-gradient(180deg, #25D366, #128C7E)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}
