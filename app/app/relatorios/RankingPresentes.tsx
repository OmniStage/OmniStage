"use client";

import { useState } from "react";

type RankingItem = {
  id?: string;
  nome: string;
  presente?: string;
  quantidade: number;
  valor: number;
};

function formatCurrencyBR(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function RankingCard({
  title,
  subtitle,
  items,
  emptyText,
  accent,
}: {
  title: string;
  subtitle: string;
  items: RankingItem[];
  emptyText: string;
  accent: "purple" | "green";
}) {
  const [open, setOpen] = useState(false);
  const visibleItems = open ? items.slice(0, 10) : items.slice(0, 2);

  const colors = {
    purple: {
      first: "#fef3c7",
      second: "#e2e8f0",
      third: "#fed7aa",
      other: "#ede9fe",
      text: "#6d28d9",
    },
    green: {
      first: "#dcfce7",
      second: "#dbeafe",
      third: "#fef3c7",
      other: "#ede9fe",
      text: "#166534",
    },
  }[accent];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 30,
        padding: 28,
        boxShadow: "0 18px 42px rgba(15,23,42,.06)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          border: 0,
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          gap: 18,
          alignItems: "flex-start",
          textAlign: "left",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 26,
              lineHeight: 1,
              letterSpacing: "-.04em",
              fontWeight: 900,
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              fontSize: 15,
              lineHeight: 1.35,
              fontWeight: 700,
            }}
          >
            {subtitle}
          </p>
        </div>

        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 900,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .18s ease",
          }}
        >
          ↓
        </span>
      </button>

      <div style={{ marginTop: 22, display: "grid", gap: 12 }}>
        {visibleItems.length ? (
          visibleItems.map((item, index) => (
              <div
                key={item.id || item.nome}
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px 1fr auto",
                  gap: 14,
                  alignItems: "center",
                  padding: "14px 16px",
                  borderRadius: 18,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    background:
                      index === 0
                        ? colors.first
                        : index === 1
                          ? colors.second
                          : index === 2
                            ? colors.third
                            : colors.other,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: index === 0 ? colors.text : "#0f172a",
                    fontWeight: 900,
                  }}
                >
                  {index + 1}
                </div>

                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#0f172a",
                      fontSize: 14,
                      lineHeight: 1.25,
                      fontWeight: 900,
                    }}
                  >
                    {item.nome}
                  </strong>

                  {item.presente && (
                    <small
                      style={{
                        display: "block",
                        marginTop: 4,
                        color: "#64748b",
                        fontSize: 12,
                        lineHeight: 1.3,
                        fontWeight: 800,
                      }}
                    >
                      {item.presente}
                    </small>
                  )}

                  <small
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {item.quantidade} presente(s)
                  </small>
                </div>

                <strong
                  style={{
                    color: "#16a34a",
                    fontSize: 14,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatCurrencyBR(item.valor)}
                </strong>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {emptyText}
            </div>
        )}
      </div>
    </div>
  );
}

export default function RankingPresentes({
  rankingItensPresentes,
  rankingPresenteadores,
}: {
  rankingItensPresentes: RankingItem[];
  rankingPresenteadores: RankingItem[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 22,
      }}
    >
      <RankingCard
        title="Ranking de presentes recebidos"
        subtitle="10 presentes com maior valor informado"
        items={rankingItensPresentes}
        emptyText="Nenhum presente recebido encontrado."
        accent="purple"
      />

      <RankingCard
        title="Ranking de presenteadores"
        subtitle="10 convidados que mais presentearam por valor"
        items={rankingPresenteadores}
        emptyText="Nenhum presenteador encontrado."
        accent="green"
      />
    </div>
  );
}
