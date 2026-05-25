import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { revalidatePath } from "next/cache";

const CATEGORIAS_PRESENTE = [
  "beleza",
  "vestuario",
  "joias",
  "semijoias",
  "bijuterias",
  "eletronicos",
  "decoracao",
  "infantil",
  "calcados",
  "esporte",
  "brinquedos",
  "outros",
];

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

async function atualizarPresenteAction(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const eventId = String(formData.get("eventId") || "");
  const presenteId = String(formData.get("presenteId") || "");
  const marca = String(formData.get("marca_detectada") || "").trim();
  const categoria = String(formData.get("categoria_detectada") || "").trim();

  if (!eventId || !presenteId) return;

  await supabase
    .from("event_gift_records")
    .update({
      marca_detectada: marca || null,
      categoria_detectada: categoria || null,
      ia_processado: true,
      ia_processado_em: new Date().toISOString(),
    })
    .eq("id", presenteId)
    .eq("evento_id", eventId);

  revalidatePath(`/app/presentes/${eventId}/fisicos`);
  revalidatePath(`/app/presentes/${eventId}`);
}


async function incluirNotaFiscalAction(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const eventId = String(formData.get("eventId") || "");
  const presenteId = String(formData.get("presenteId") || "");
  const notaFiscal = formData.get("nota_fiscal_arquivo");

  if (!eventId || !presenteId) return;

  if (!(notaFiscal instanceof File) || notaFiscal.size === 0) {
    return;
  }

  const nomeOriginal = notaFiscal.name || "nota-fiscal";
  const extensao = nomeOriginal.includes(".")
    ? nomeOriginal.split(".").pop()
    : "jpg";
  const nomeArquivo = `nf-${presenteId}-${Date.now()}.${extensao}`;
  const caminho = `event-gifts/${eventId}/notas-fiscais/${nomeArquivo}`;

  const { error: uploadError } = await supabase.storage
    .from("event-assets")
    .upload(caminho, notaFiscal, {
      upsert: true,
      contentType: notaFiscal.type || "application/octet-stream",
    });

  if (uploadError) {
    throw new Error("Erro ao enviar nota fiscal: " + uploadError.message);
  }

  const { data } = supabase.storage
    .from("event-assets")
    .getPublicUrl(caminho);

  await supabase
    .from("event_gift_records")
    .update({
      nota_fiscal_url: data.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", presenteId)
    .eq("evento_id", eventId);

  revalidatePath(`/app/presentes/${eventId}/fisicos`);
  revalidatePath(`/app/presentes/${eventId}`);
}

async function removerNotaFiscalAction(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const eventId = String(formData.get("eventId") || "");
  const presenteId = String(formData.get("presenteId") || "");

  if (!eventId || !presenteId) return;

  await supabase
    .from("event_gift_records")
    .update({
      nota_fiscal_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", presenteId)
    .eq("evento_id", eventId);

  revalidatePath(`/app/presentes/${eventId}/fisicos`);
  revalidatePath(`/app/presentes/${eventId}`);
}

async function cancelarPresenteAction(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const eventId = String(formData.get("eventId") || "");
  const presenteId = String(formData.get("presenteId") || "");

  if (!eventId || !presenteId) return;

  await supabase
    .from("event_gift_records")
    .update({
      status: "cancelado",
      motivo_cancelamento: "Cancelado no módulo de presentes físicos",
      cancelado_em: new Date().toISOString(),
    })
    .eq("id", presenteId)
    .eq("evento_id", eventId);

  await supabase
    .from("event_gift_ai_queue")
    .update({
      status: "cancelado",
      erro: "Presente cancelado pelo operador",
      processado_em: new Date().toISOString(),
    })
    .eq("gift_record_id", presenteId);

  revalidatePath(`/app/presentes/${eventId}/fisicos`);
  revalidatePath(`/app/presentes/${eventId}`);
}

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
      className: "ia-badge ia-badge-empty",
    };
  }

  if (!record.ia_processado) {
    return {
      label: "Processando IA",
      className: "ia-badge ia-badge-processing",
    };
  }

  return {
    label: "IA detectada",
    className: "ia-badge ia-badge-success",
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

  const { data: presentesData } = await supabase
    .from("event_gift_records")
    .select("*")
    .eq("evento_id", eventId)
    .eq("tipo_presente", "presente_fisico")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });

  const presentes = presentesData || [];
  const totalIaProcessados = presentes.filter((item: any) => item.ia_processado).length;
  const totalPendentesIa = presentes.filter((item: any) => !item.ia_processado).length;
  const totalFotos = presentes.filter((item: any) => item.foto_url).length;

  return (
    <div className="presentes-fisicos-page">
      <style>{styles}</style>

      <div className="presentes-shell">
        <section className="hero-card">
          <div className="hero-content">
            <span className="eyebrow">Presentes físicos</span>

            <h1>Recepção no evento</h1>

            <p>
              Controle presentes recebidos no check-in, etiquetas, embalagens e
              análise automática por IA.
            </p>

            <div className="event-chip">
              {evento?.nome || "Evento"}
            </div>
          </div>

          <Link
            href="/app/presentes"
            className="secondary-action"
          >
            Voltar para presentes
          </Link>
        </section>

        <section className="metrics-grid">
          <MetricCard label="Presentes físicos" value={presentes.length} />
          <MetricCard label="IA processados" value={totalIaProcessados} />
          <MetricCard label="Pendentes IA" value={totalPendentesIa} />
          <MetricCard label="Fotos registradas" value={totalFotos} />
        </section>

        {presentes.length > 0 ? (
          <section className="gallery-grid">
            {presentes.map((presente: any) => {
              const iaStatus = getIAStatus(presente);
              const editPopoverId = `editar-presente-${presente.id}`;
              const nfPopoverId = `nf-presente-${presente.id}`;
              const cancelPopoverId = `cancelar-presente-${presente.id}`;

              return (
                <article key={presente.id} className="gift-card">
                  <div className="photo-wrap">
                    {presente.foto_url ? (
                      <img
                        src={presente.foto_url}
                        alt="Presente"
                        className="gift-photo"
                      />
                    ) : (
                      <div className="photo-placeholder">
                        Sem foto
                      </div>
                    )}

                    <div className="photo-badge-wrap">
                      <span className={iaStatus.className}>
                        {iaStatus.label}
                      </span>
                    </div>
                  </div>

                  <div className="gift-body">
                    <div className="gift-head">
                      <div>
                        <h2>{presente.nome_convidado || "Convidado"}</h2>

                        <p>{presente.grupo || "Sem grupo"}</p>
                      </div>

                      <span className="tag-code">
                        {presente.etiqueta_codigo || "Sem etiqueta"}
                      </span>
                    </div>

                    <div className="ai-info-grid">
                      <div className="info-box">
                        <span>Categoria detectada</span>
                        <strong>
                          {presente.categoria_detectada || "Aguardando IA"}
                        </strong>
                      </div>

                      <div className="info-box">
                        <span>Marca detectada</span>
                        <strong>
                          {presente.marca_detectada || "Aguardando IA"}
                        </strong>
                      </div>
                    </div>

                    <div className="gift-actions-compact">
                      <button
                        type="button"
                        className="compact-action compact-action-primary"
                        {...{ popovertarget: editPopoverId }}
                      >
                        Alterar
                      </button>

                      {presente.nota_fiscal_url ? (
                        <button
                          type="button"
                          className="compact-action compact-action-view-nf"
                          {...{ popovertarget: nfPopoverId }}
                        >
                          Visualizar NF
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="compact-action compact-action-nf"
                          {...{ popovertarget: nfPopoverId }}
                        >
                          Incluir NF
                        </button>
                      )}

                      <button
                        type="button"
                        className="compact-action compact-action-danger"
                        {...{ popovertarget: cancelPopoverId }}
                      >
                        Cancelar
                      </button>
                    </div>

                    <div
                      id={editPopoverId}
                      className="action-popover action-popover-edit"
                      {...{ popover: "auto" }}
                    >
                      <div className="popover-header">
                        <div>
                          <span>Alterar presente</span>
                          <strong>{presente.etiqueta_codigo || "Sem etiqueta"}</strong>
                        </div>

                        <button
                          type="button"
                          className="popover-close"
                          {...{
                            popovertarget: editPopoverId,
                            popovertargetaction: "hide",
                          }}
                        >
                          Fechar
                        </button>
                      </div>

                      <form action={atualizarPresenteAction} className="edit-panel edit-panel-popover">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="presenteId" value={presente.id} />

                        <div className="edit-grid">
                          <label>
                            <span>Categoria</span>
                            <select
                              name="categoria_detectada"
                              defaultValue={presente.categoria_detectada || ""}
                            >
                              <option value="">Selecione</option>
                              {CATEGORIAS_PRESENTE.map((categoria) => (
                                <option key={categoria} value={categoria}>
                                  {categoria}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            <span>Marca</span>
                            <input
                              name="marca_detectada"
                              defaultValue={presente.marca_detectada || ""}
                              placeholder="Marca da embalagem"
                            />
                          </label>
                        </div>

                        <div className="popover-actions-row">
                          <button
                            type="button"
                            className="modal-secondary-action"
                            {...{
                              popovertarget: editPopoverId,
                              popovertargetaction: "hide",
                            }}
                          >
                            Cancelar
                          </button>

                          <button type="submit" className="save-action">
                            Salvar alteração
                          </button>
                        </div>
                      </form>
                    </div>

                    <div
                      id={nfPopoverId}
                      className="action-popover action-popover-nf"
                      {...{ popover: "auto" }}
                    >
                      <div className="popover-header">
                        <div>
                          <span>
                            {presente.nota_fiscal_url
                              ? "Visualizar nota fiscal"
                              : "Incluir nota fiscal"}
                          </span>
                          <strong>{presente.etiqueta_codigo || "Sem etiqueta"}</strong>
                        </div>

                        <button
                          type="button"
                          className="popover-close"
                          {...{
                            popovertarget: nfPopoverId,
                            popovertargetaction: "hide",
                          }}
                        >
                          Fechar
                        </button>
                      </div>

                      {presente.nota_fiscal_url ? (
                        <div className="nf-view-panel">
                          <div className="nf-preview-box">
                            {String(presente.nota_fiscal_url).toLowerCase().includes(".pdf") ? (
                              <iframe
                                src={presente.nota_fiscal_url}
                                className="nf-preview-frame"
                                title="Nota fiscal anexada"
                              />
                            ) : (
                              <img
                                src={presente.nota_fiscal_url}
                                alt="Nota fiscal anexada"
                                className="nf-preview-image"
                              />
                            )}
                          </div>

                          <a
                            href={presente.nota_fiscal_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nf-open-link"
                          >
                            Abrir NF em nova aba
                          </a>

                          <form action={removerNotaFiscalAction} className="danger-form danger-form-popover">
                            <input type="hidden" name="eventId" value={eventId} />
                            <input type="hidden" name="presenteId" value={presente.id} />

                            <div className="danger-confirm-box">
                              <strong>Remover nota fiscal</strong>
                              <p>
                                Esta ação remove o vínculo da nota fiscal deste presente.
                                O presente continuará ativo no evento.
                              </p>
                            </div>

                            <label className="confirm-row">
                              <input type="checkbox" required />
                              Confirmo que desejo remover a nota fiscal anexada.
                            </label>

                            <div className="popover-actions-row">
                              <button
                                type="button"
                                className="modal-secondary-action"
                                {...{
                                  popovertarget: nfPopoverId,
                                  popovertargetaction: "hide",
                                }}
                              >
                                Voltar
                              </button>

                              <button type="submit" className="danger-action">
                                Remover NF
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <form action={incluirNotaFiscalAction} className="nf-form nf-form-popover">
                          <input type="hidden" name="eventId" value={eventId} />
                          <input type="hidden" name="presenteId" value={presente.id} />

                          <div className="nf-upload">
                            <span>Nota fiscal / cupom fiscal</span>

                            <label className="nf-single-upload">
                              <strong>Anexar comprovante</strong>
                              <small>
                                No celular, escolha tirar foto, usar galeria ou buscar em arquivos.
                                No computador, selecione JPG, PNG ou PDF.
                              </small>

                              <input
                                type="file"
                                name="nota_fiscal_arquivo"
                                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                                required
                              />
                            </label>
                          </div>

                          <div className="popover-actions-row">
                            <button
                              type="button"
                              className="modal-secondary-action"
                              {...{
                                popovertarget: nfPopoverId,
                                popovertargetaction: "hide",
                              }}
                            >
                              Cancelar
                            </button>

                            <button type="submit" className="nf-action">
                              Confirmar NF
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    <div
                      id={cancelPopoverId}
                      className="action-popover action-popover-cancel"
                      {...{ popover: "auto" }}
                    >
                      <div className="popover-header">
                        <div>
                          <span>Cancelar presente</span>
                          <strong>{presente.etiqueta_codigo || "Sem etiqueta"}</strong>
                        </div>

                        <button
                          type="button"
                          className="popover-close"
                          {...{
                            popovertarget: cancelPopoverId,
                            popovertargetaction: "hide",
                          }}
                        >
                          Fechar
                        </button>
                      </div>

                      <form action={cancelarPresenteAction} className="danger-form danger-form-popover">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="presenteId" value={presente.id} />

                        <div className="danger-confirm-box">
                          <strong>Confirmar cancelamento</strong>
                          <p>
                            Esta ação remove o presente da listagem ativa e encerra
                            qualquer processamento de IA vinculado.
                          </p>
                        </div>

                        <label className="confirm-row">
                          <input type="checkbox" required />
                          Confirmo que desejo cancelar este presente.
                        </label>

                        <div className="popover-actions-row">
                          <button
                            type="button"
                            className="modal-secondary-action"
                            {...{
                              popovertarget: cancelPopoverId,
                              popovertargetaction: "hide",
                            }}
                          >
                            Voltar
                          </button>

                          <button type="submit" className="danger-action">
                            Confirmar cancelamento
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="gift-meta-row">
                      <span>Confiança IA</span>
                      <strong>
                        {presente.ia_confianca
                          ? `${Math.round(Number(presente.ia_confianca) * 100)}%`
                          : "-"}
                      </strong>
                    </div>

                    <div className="gift-meta-row">
                      <span>Registrado em</span>
                      <strong>{formatDate(presente.created_at)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="empty-state">
            <strong>Nenhum presente físico registrado</strong>

            <p>
              Os presentes registrados no check-in aparecerão aqui automaticamente.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

const styles = `
  .presentes-fisicos-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 8% 0%, rgba(124, 58, 237, .10), transparent 34%),
      radial-gradient(circle at 92% 0%, rgba(16, 185, 129, .09), transparent 30%),
      #f8fafc;
    color: #0f172a;
    padding: 32px;
  }

  .presentes-shell {
    width: 100%;
    max-width: 1320px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .hero-card {
    border: 1px solid rgba(226, 232, 240, .95);
    border-radius: 34px;
    padding: 34px;
    background:
      radial-gradient(circle at 0% 0%, rgba(124, 58, 237, .13), transparent 34%),
      radial-gradient(circle at 100% 0%, rgba(16, 185, 129, .12), transparent 34%),
      #ffffff;
    box-shadow: 0 28px 90px rgba(15, 23, 42, .08);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .hero-content {
    min-width: 0;
  }

  .eyebrow {
    display: inline-block;
    color: #7c3aed;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .18em;
    margin-bottom: 12px;
  }

  .hero-card h1 {
    margin: 0;
    color: #0f172a;
    font-size: clamp(38px, 5vw, 64px);
    line-height: .95;
    font-weight: 950;
    letter-spacing: -.065em;
  }

  .hero-card p {
    margin: 18px 0 0;
    max-width: 760px;
    color: #64748b;
    font-size: 17px;
    line-height: 1.65;
    font-weight: 750;
  }

  .event-chip {
    display: inline-flex;
    margin-top: 22px;
    align-items: center;
    border-radius: 999px;
    background: #fff;
    border: 1px solid rgba(226, 232, 240, .95);
    color: #334155;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 900;
    box-shadow: 0 10px 28px rgba(15, 23, 42, .06);
  }

  .secondary-action {
    flex: 0 0 auto;
    height: 46px;
    padding: 0 18px;
    border-radius: 16px;
    border: 1px solid rgba(203, 213, 225, .95);
    background: #fff;
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 14px;
    font-weight: 950;
    box-shadow: 0 12px 28px rgba(15, 23, 42, .05);
    transition: transform .16s ease, background .16s ease;
  }

  .secondary-action:hover {
    transform: translateY(-1px);
    background: #f8fafc;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .metric-card {
    border: 1px solid rgba(226, 232, 240, .95);
    border-radius: 26px;
    background: #fff;
    padding: 20px;
    box-shadow: 0 20px 60px rgba(15, 23, 42, .06);
  }

  .metric-card span {
    display: block;
    color: #64748b;
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .metric-card strong {
    display: block;
    margin-top: 8px;
    color: #0f172a;
    font-size: 34px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -.055em;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .gift-card {
    overflow: hidden;
    border-radius: 32px;
    border: 1px solid rgba(226, 232, 240, .95);
    background: #fff;
    box-shadow: 0 24px 70px rgba(15, 23, 42, .08);
  }

  .photo-wrap {
    position: relative;
    aspect-ratio: 4 / 3;
    background: #f1f5f9;
    overflow: hidden;
  }

  .gift-photo {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    transition: transform .35s ease;
  }

  .gift-card:hover .gift-photo {
    transform: scale(1.035);
  }

  .photo-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 900;
  }

  .photo-badge-wrap {
    position: absolute;
    left: 14px;
    top: 14px;
  }

  .ia-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 8px 11px;
    font-size: 11px;
    font-weight: 950;
    box-shadow: 0 10px 24px rgba(15, 23, 42, .12);
  }

  .ia-badge-empty {
    background: rgba(241, 245, 249, .95);
    color: #475569;
    border: 1px solid rgba(226, 232, 240, .95);
  }

  .ia-badge-processing {
    background: rgba(254, 243, 199, .96);
    color: #92400e;
    border: 1px solid rgba(253, 230, 138, .95);
  }

  .ia-badge-success {
    background: rgba(220, 252, 231, .96);
    color: #166534;
    border: 1px solid rgba(187, 247, 208, .95);
  }

  .gift-body {
    padding: 20px;
  }

  .gift-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .gift-head h2 {
    margin: 0;
    color: #0f172a;
    font-size: 22px;
    line-height: 1.1;
    font-weight: 950;
    letter-spacing: -.04em;
  }

  .gift-head p {
    margin: 7px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 850;
  }

  .tag-code {
    flex: 0 0 auto;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-radius: 999px;
    background: #f4ebff;
    color: #6d28d9;
    padding: 8px 10px;
    font-size: 11px;
    font-weight: 950;
  }

  .ai-info-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .info-box {
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid rgba(226, 232, 240, .85);
    padding: 14px;
  }

  .info-box span {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .07em;
  }

  .info-box strong {
    display: block;
    margin-top: 5px;
    color: #0f172a;
    font-size: 15px;
    font-weight: 950;
  }

  .edit-panel {
    margin-top: 0;
    border-radius: 20px;
    border: 1px solid rgba(221, 214, 254, .95);
    background: linear-gradient(180deg, rgba(250, 245, 255, .78), rgba(255, 255, 255, .96));
    padding: 14px;
  }

  .edit-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .edit-grid label {
    display: grid;
    gap: 6px;
  }

  .edit-grid label span {
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .07em;
  }

  .edit-grid select,
  .edit-grid input {
    width: 100%;
    min-height: 42px;
    border: 1px solid rgba(203, 213, 225, .95);
    border-radius: 14px;
    background: #fff;
    color: #0f172a;
    padding: 0 12px;
    font-size: 14px;
    font-weight: 850;
    outline: none;
  }

  .edit-grid select:focus,
  .edit-grid input:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, .12);
  }

  .save-action {
    width: 100%;
    margin-top: 10px;
    min-height: 42px;
    border: 0;
    border-radius: 14px;
    background: linear-gradient(135deg, #7c3aed, #8b5cf6);
    color: #fff;
    font-size: 14px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 16px 34px rgba(124, 58, 237, .22);
  }

  .save-action:hover {
    filter: brightness(.98);
  }

  .nf-form {
    margin-top: 0;
    border-radius: 20px;
    border: 1px solid rgba(191, 219, 254, .95);
    background: linear-gradient(180deg, rgba(239, 246, 255, .92), rgba(255, 255, 255, .98));
    padding: 14px;
  }

  .nf-upload {
    display: grid;
    gap: 8px;
  }

  .nf-upload span {
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .07em;
  }

  .nf-single-upload {
    min-height: 138px;
    border: 1px dashed rgba(147, 197, 253, .95);
    border-radius: 18px;
    background: #fff;
    color: #1e3a8a;
    padding: 16px;
    display: grid;
    gap: 8px;
    cursor: pointer;
    transition: transform .16s ease, background .16s ease, border-color .16s ease;
  }

  .nf-single-upload:hover {
    transform: translateY(-1px);
    background: #eff6ff;
    border-color: rgba(59, 130, 246, .95);
  }

  .nf-single-upload strong {
    color: #1d4ed8;
    font-size: 16px;
    font-weight: 950;
  }

  .nf-single-upload small {
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.45;
  }

  .nf-single-upload input {
    width: 100%;
    margin-top: 4px;
    color: #1e3a8a;
    font-size: 13px;
    font-weight: 850;
  }

  .nf-action {
    width: 100%;
    margin-top: 10px;
    min-height: 42px;
    border: 1px solid rgba(191, 219, 254, .95);
    border-radius: 14px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 14px;
    font-weight: 950;
    cursor: pointer;
  }

  .nf-action:hover {
    background: #dbeafe;
  }

  .nf-link {
    display: inline-flex;
    margin-top: 10px;
    color: #1d4ed8;
    font-size: 13px;
    font-weight: 950;
    text-decoration: none;
  }

  .nf-link:hover {
    text-decoration: underline;
  }

  .nf-view-panel {
    display: grid;
    gap: 12px;
  }

  .nf-preview-box {
    width: 100%;
    min-height: 280px;
    max-height: 58vh;
    overflow: hidden;
    border-radius: 20px;
    border: 1px solid rgba(191, 219, 254, .95);
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nf-preview-image {
    width: 100%;
    height: 100%;
    max-height: 58vh;
    display: block;
    object-fit: contain;
    background: #fff;
  }

  .nf-preview-frame {
    width: 100%;
    height: 58vh;
    border: 0;
    background: #fff;
  }

  .nf-open-link {
    min-height: 42px;
    border-radius: 14px;
    border: 1px solid rgba(187, 247, 208, .95);
    background: #ecfdf5;
    color: #047857;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 13px;
    font-weight: 950;
  }

  .nf-open-link:hover {
    background: #d1fae5;
  }

  .danger-form {
    margin-top: 0;
    border-radius: 20px;
    border: 1px solid rgba(254, 205, 211, .95);
    background: #fff7f8;
    padding: 14px;
  }

  .confirm-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #9f1239;
    font-size: 12px;
    font-weight: 900;
    line-height: 1.35;
    margin-bottom: 10px;
  }

  .confirm-row input {
    margin-top: 1px;
    accent-color: #be123c;
  }

  .danger-action {
    width: 100%;
    min-height: 42px;
    border: 1px solid rgba(254, 205, 211, .95);
    border-radius: 14px;
    background: #fff1f2;
    color: #be123c;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
  }

  .danger-action:hover {
    background: #ffe4e6;
  }


  .gift-actions-compact {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .compact-action {
    min-height: 42px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    user-select: none;
    border: 0;
    font-family: inherit;
    transition: transform .16s ease, filter .16s ease, background .16s ease;
  }

  .compact-action:hover {
    transform: translateY(-1px);
  }

  .compact-action-primary {
    background: linear-gradient(135deg, #7c3aed, #8b5cf6);
    color: #fff;
    box-shadow: 0 14px 28px rgba(124, 58, 237, .18);
  }

  .compact-action-nf {
    border: 1px solid rgba(191, 219, 254, .95);
    background: #eff6ff;
    color: #1d4ed8;
  }

  .compact-action-nf:hover {
    background: #dbeafe;
  }

  .compact-action-view-nf {
    border: 1px solid rgba(187, 247, 208, .95);
    background: #ecfdf5;
    color: #047857;
    text-decoration: none;
  }

  .compact-action-view-nf:hover {
    background: #d1fae5;
  }

  .compact-action-remove-nf {
    border: 1px solid rgba(253, 230, 138, .95);
    background: #fffbeb;
    color: #b45309;
  }

  .compact-action-remove-nf:hover {
    background: #fef3c7;
  }

  .compact-action-danger {
    border: 1px solid rgba(254, 205, 211, .95);
    background: #fff1f2;
    color: #be123c;
  }

  .compact-action-danger:hover {
    background: #ffe4e6;
  }

  .action-popover {
    width: min(92vw, 520px);
    max-height: min(86vh, 680px);
    overflow-y: auto;
    border: 1px solid rgba(226, 232, 240, .95);
    border-radius: 28px;
    background: #fff;
    padding: 18px;
    color: #0f172a;
    box-shadow: 0 30px 90px rgba(15, 23, 42, .28);
  }

  .action-popover::backdrop {
    background: rgba(15, 23, 42, .34);
    backdrop-filter: blur(4px);
  }

  .action-popover:popover-open {
    inset: 0;
    margin: auto;
  }

  .popover-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .popover-header span {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .popover-header strong {
    display: block;
    margin-top: 5px;
    color: #0f172a;
    font-size: 18px;
    font-weight: 950;
  }

  .popover-close {
    flex: 0 0 auto;
    min-height: 36px;
    border: 1px solid rgba(203, 213, 225, .95);
    border-radius: 12px;
    background: #fff;
    color: #475569;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 950;
    cursor: pointer;
    font-family: inherit;
  }

  .edit-panel-popover,
  .nf-form-popover,
  .danger-form-popover {
    margin-top: 0;
  }

  .popover-actions-row {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .modal-secondary-action {
    width: 100%;
    min-height: 42px;
    border: 1px solid rgba(203, 213, 225, .95);
    border-radius: 14px;
    background: #fff;
    color: #334155;
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    font-family: inherit;
  }

  .modal-secondary-action:hover {
    background: #f8fafc;
  }

  .danger-confirm-box {
    border-radius: 16px;
    background: #fff1f2;
    border: 1px solid rgba(254, 205, 211, .95);
    padding: 12px;
    margin-bottom: 10px;
  }

  .danger-confirm-box strong {
    display: block;
    color: #9f1239;
    font-size: 13px;
    font-weight: 950;
  }

  .danger-confirm-box p {
    margin: 6px 0 0;
    color: #be123c;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 800;
  }

  .gift-meta-row {
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
  }

  .gift-meta-row strong {
    color: #0f172a;
    font-weight: 950;
    text-align: right;
  }

  .empty-state {
    border-radius: 32px;
    border: 1px dashed rgba(148, 163, 184, .45);
    background: #fff;
    padding: 56px 24px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(15, 23, 42, .05);
  }

  .empty-state strong {
    display: block;
    color: #0f172a;
    font-size: 18px;
    font-weight: 950;
  }

  .empty-state p {
    margin: 8px auto 0;
    max-width: 520px;
    color: #64748b;
    line-height: 1.55;
    font-weight: 750;
  }

  @media (max-width: 1180px) {
    .gallery-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .presentes-fisicos-page {
      padding: 16px;
    }

    .hero-card {
      padding: 24px;
      border-radius: 26px;
      flex-direction: column;
    }

    .secondary-action {
      width: 100%;
    }

    .metrics-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .gallery-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .presentes-fisicos-page {
      padding: 12px;
    }

    .hero-card h1 {
      font-size: 34px;
    }

    .hero-card p {
      font-size: 15px;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .gift-head {
      flex-direction: column;
    }

    .tag-code {
      max-width: 100%;
    }

    .gift-actions-compact {
      grid-template-columns: 1fr;
    }

  }
`;
