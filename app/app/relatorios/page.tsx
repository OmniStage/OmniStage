return (
  <main
    style={{
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top left, rgba(109,40,217,.12), transparent 30%), #f6f8fc",
      padding: 28,
    }}
  >
    <div
      style={{
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* HERO */}

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 36,
          background:
            "linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#312e81 100%)",
          padding: 42,
          boxShadow: "0 30px 80px rgba(15,23,42,.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -80,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255,255,255,.04)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            justifyContent: "space-between",
            gap: 28,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 999,
                padding: "8px 14px",
                background: "rgba(255,255,255,.1)",
                color: "#cbd5e1",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                backdropFilter: "blur(12px)",
              }}
            >
              OmniStage Analytics
            </div>

            <h1
              style={{
                margin: "22px 0 12px",
                color: "#fff",
                fontSize: "clamp(46px,7vw,84px)",
                lineHeight: ".92",
                letterSpacing: "-.07em",
                fontWeight: 900,
              }}
            >
              Relatório Executivo
            </h1>

            <p
              style={{
                margin: 0,
                color: "#cbd5e1",
                fontSize: 17,
                lineHeight: 1.7,
                maxWidth: 680,
              }}
            >
              Inteligência completa do evento com análise de RSVP,
              presença, check-in e performance operacional.
            </p>
          </div>

          <div
            style={{
              minWidth: 320,
              borderRadius: 28,
              padding: 24,
              background: "rgba(255,255,255,.08)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <div
              style={{
                marginBottom: 18,
                color: "#94a3b8",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".12em",
              }}
            >
              Evento analisado
            </div>

            <form
              method="get"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <select
                name="eventoId"
                defaultValue={eventoSelecionado}
                style={{
                  height: 52,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(15,23,42,.55)",
                  color: "#fff",
                  padding: "0 16px",
                  fontWeight: 700,
                  fontSize: 15,
                  outline: "none",
                }}
              >
                {eventos.map((evento: any) => (
                  <option
                    key={evento.id}
                    value={evento.id}
                  >
                    {evento.nome}
                  </option>
                ))}
              </select>

              <button
                style={{
                  height: 52,
                  borderRadius: 16,
                  border: 0,
                  background:
                    "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow:
                    "0 14px 30px rgba(109,40,217,.35)",
                }}
              >
                Atualizar relatório
              </button>
            </form>

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop:
                  "1px solid rgba(255,255,255,.08)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  Taxa RSVP
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#fff",
                    fontSize: 28,
                    letterSpacing: "-.05em",
                  }}
                >
                  {taxaRsvp}%
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  Presença
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#fff",
                    fontSize: 28,
                    letterSpacing: "-.05em",
                  }}
                >
                  {taxaPresenca}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI GRID */}

      <div
        style={{
          marginTop: -42,
          position: "relative",
          zIndex: 10,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(240px,1fr))",
          gap: 20,
        }}
      >
        {[
          {
            titulo: "Total convidados",
            valor: totalConvidados,
            cor: "#eff6ff",
            destaque: "#2563eb",
          },
          {
            titulo: "Confirmados RSVP",
            valor: confirmados,
            cor: "#f5f3ff",
            destaque: "#7c3aed",
          },
          {
            titulo: "Entradas",
            valor: checkins,
            cor: "#ecfdf5",
            destaque: "#16a34a",
          },
          {
            titulo: "Não compareceram",
            valor: naoEntraram,
            cor: "#fff7ed",
            destaque: "#ea580c",
          },
        ].map((item) => (
          <div
            key={item.titulo}
            style={{
              background: "#fff",
              borderRadius: 28,
              padding: 26,
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 18px 40px rgba(15,23,42,.08)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: item.cor,
                marginBottom: 22,
              }}
            />

            <div
              style={{
                color: "#64748b",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {item.titulo}
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 54,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-.06em",
                color: "#0f172a",
              }}
            >
              {item.valor}
            </div>

            <div
              style={{
                marginTop: 18,
                height: 8,
                borderRadius: 999,
                background: "#f1f5f9",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "78%",
                  height: "100%",
                  background: item.destaque,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* RESTANTE */}

      <div style={{ marginTop: 30 }}>
        <Section
          titulo="Performance RSVP"
          descricao="Análise de confirmações do evento."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(260px,1fr))",
              gap: 18,
            }}
          >
            <Card
              titulo="Confirmados"
              valor={confirmados}
              percentual={taxaRsvp}
            />

            <Card
              titulo="Pendentes"
              valor={pendentes}
            />

            <Card
              titulo="Recusados"
              valor={recusados}
            />
          </div>
        </Section>

        <Section
          titulo="Performance Check-in"
          descricao="Indicadores de presença e entrada."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(260px,1fr))",
              gap: 18,
            }}
          >
            <Card
              titulo="Entraram"
              valor={checkins}
              percentual={taxaPresenca}
            />

            <Card
              titulo="Entrou sem RSVP"
              valor={entrouSemRsvp}
            />

            <Card
              titulo="No-show"
              valor={naoEntraram}
            />
          </div>
        </Section>
      </div>
    </div>
  </main>
);
