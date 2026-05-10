"use client";

type CartaoActionsProps = {
  whatsappUrl: string;
};

export default function CartaoActions({ whatsappUrl }: CartaoActionsProps) {
  return (
    <div
      style={{
        marginTop: 18,
        display: "flex",
        justifyContent: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        style={{
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

      <button
        type="button"
        onClick={() => window.print()}
        style={{
          border: "none",
          borderRadius: 999,
          padding: "12px 16px",
          background: "linear-gradient(180deg, #e1c178, #cfa958)",
          color: "#0d1d3d",
          fontSize: 13,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Imprimir
      </button>
    </div>
  );
}
