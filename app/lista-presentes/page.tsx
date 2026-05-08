"use client";

        <h1 className="title">Lista de Presentes</h1>

        <p className="subtitle">
          Configure presentes físicos, experiências e presentes em valor para cada evento.
          Seus convidados poderão visualizar a lista diretamente no convite digital.
        </p>
      </section>

      <section className="search-box">
        <input
          className="search-input"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por evento, cidade, categoria ou status"
        />
      </section>

      {loading ? (
        <div className="loading">Carregando eventos...</div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="empty">
          Nenhum evento encontrado para configurar lista de presentes.
        </div>
      ) : (
        <section className="events-grid">
          {eventosFiltrados.map((evento) => (
            <article key={evento.id} className="event-card">
              <div>
                <h2 className="event-name">{evento.nome || "Evento sem nome"}</h2>
              </div>

              <div className="meta">
                <span className="badge purple">
                  {evento.categoria || "Sem categoria"}
                </span>

                <span className={evento.lista_presentes_ativa ? "badge green" : "badge yellow"}>
                  {evento.lista_presentes_ativa
                    ? "Lista ativa"
                    : "Lista desativada"}
                </span>
              </div>

              <div className="info">
                <div>
                  <strong>Data:</strong> {formatarData(evento.data_evento)}
                </div>

                <div>
                  <strong>Cidade:</strong> {evento.cidade || "Não informada"}
                </div>
              </div>

              <div className="modules">
                {evento.presentes_fisicos_enabled && (
                  <span className="module-pill">Presentes físicos</span>
                )}

                {evento.experiencias_enabled && (
                  <span className="module-pill">Experiências</span>
                )}

                {evento.presentes_valor_enabled && (
                  <span className="module-pill">Presentes em valor</span>
                )}
              </div>

              <div className="actions">
                <Link
                  href={`/app/eventos/${evento.id}/lista-presentes`}
                  className="primary"
                >
                  Configurar lista
                </Link>

                <Link
                  href={`/app/eventos/${evento.id}`}
                  className="secondary"
                >
                  Abrir evento
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
