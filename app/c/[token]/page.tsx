async function carregarConvite(tokenUrl: string) {
  setLoading(true);

  const tokenDecodificado = decodeURIComponent(tokenUrl);

  const tokens = tokenDecodificado
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!tokens.length) {
    setHtmlFinal(htmlErro("Convite inválido."));
    setLoading(false);
    return;
  }

  const { data: convidados, error: convidadosError } = await supabase
    .from("convidados")
    .select("id,nome,token,evento_id,grupo,tipo_convite")
    .in("token", tokens);

  if (convidadosError || !convidados?.length) {
    setHtmlFinal(htmlErro("Convite não encontrado."));
    setLoading(false);
    return;
  }

  const convidadoBase = convidados[0];

  const { data: evento } = await supabase
    .from("eventos")
    .select(`
      id,
      nome,
      data_evento,
      local,
      invite_template_id,
      horario,
      endereco,
      mapa_url,
      background_image,
      background_url,
      logo_image,
      logo_url,
      music_file,
      musica_url
    `)
    .eq("id", convidadoBase.evento_id)
    .maybeSingle();

  if (!evento?.invite_template_id) {
    setHtmlFinal(htmlErro("Evento sem convite aplicado."));
    setLoading(false);
    return;
  }

  const { data: template } = await supabase
    .from("invite_templates")
    .select(`
      id,
      nome,
      name,
      html_template,
      editor_mode,
      preview_image,
      background_image,
      logo_image,
      visual_config
    `)
    .eq("id", evento.invite_template_id)
    .maybeSingle();

  if (!template) {
    setHtmlFinal(htmlErro("Modelo de convite não encontrado."));
    setLoading(false);
    return;
  }

  const nomesDoConvite = convidados
    .map((item) => item.nome)
    .filter(Boolean);

  let htmlDoEvento = "";
  const isVisual = template.editor_mode === "visual";

  if (isVisual) {
    const { data: blocksData, error: blocksError } = await supabase
      .from("invite_template_blocks")
      .select("*")
      .eq("template_id", template.id)
      .order("z_index", { ascending: true });

    if (blocksError) {
      setHtmlFinal(htmlErro("Erro ao carregar blocos do convite."));
      setLoading(false);
      return;
    }

    htmlDoEvento = renderizarTemplateVisual(
      template as Template,
      (blocksData || []) as VisualBlock[],
      evento as Evento,
    );

    htmlDoEvento = injetarConvidadosNoConvite(
      htmlDoEvento,
      nomesDoConvite,
    );
  } else if (template.html_template?.trim()) {
    htmlDoEvento = preencherTemplate(
      template.html_template,
      evento as Evento,
    );

    htmlDoEvento = injetarConvidadosNoConvite(
      htmlDoEvento,
      nomesDoConvite,
    );
  } else {
    setHtmlFinal(htmlErro("Modelo de convite não encontrado."));
    setLoading(false);
    return;
  }

  setHtmlFinal(htmlDoEvento);
  setLoading(false);
}

