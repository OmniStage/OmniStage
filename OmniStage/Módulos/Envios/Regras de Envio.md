 Regras de Envio

## Campos relevantes no convidado

| Campo                  | Tipo    | Uso                                                                           |
| ---------------------- | ------- | ----------------------------------------------------------------------------- |
| `recebe_convite`       | boolean | Determina se o convidado recebe comunicações em massa. `null` = true (padrão) |
| `grupo_envio`          | string  | Identifica o responsável CRM pelo convidado — **não filtra envios em massa**  |
| `telefone`             | string  | Telefone próprio do convidado                                                 |
| `responsavel_telefone` | string  | Telefone(s) do responsável direto (separados por vírgula)                     |
| `contato_principal`    | boolean | Indica quem é o principal do núcleo/grupo                                     |
| `grupo`                | string  | Identifica o núcleo familiar/grupo                                            |
| `token`                | string  | Token único — obrigatório para envio de cartão de entrada                     |
| `status_rsvp`          | string  | `pendente` / `confirmado` / `confirmado_parcial` / `recusado`                 |

---

## Fallback de telefone (`getTelefoneEnvio`)

1. Telefone próprio (`telefone`)
2. `responsavel_telefone` (primeiro válido da lista separada por vírgula)
3. Telefone do `contato_principal` do mesmo `grupo` *(se `envio_via_principal_nucleo` estiver ativo nas configurações)*

Se nenhum encontrado → convidado não entra na fila.

---

## Tipos de envio e critérios de elegibilidade

| Tipo | Condições para enviar |
|---|---|
| `save_the_date` | `recebe_convite` ≠ false + tem telefone + `status_envio_save_the_date` ≠ "enviado" |
| `convite` | Acima + `status_rsvp` é `pendente` / null + `status_envio_convite` ≠ "enviado" |
| `lembrete_rsvp` | Acima + convite já enviado + `status_rsvp` ainda `pendente` |
| `lembrete_evento` | `recebe_convite` + tem telefone + convite enviado + `status_rsvp` = confirmado/confirmado_parcial |
| `cartao_entrada` | Confirmado + tem `token` + `status_envio_cartao` ≠ "enviado" + `recebe_convite` (se config exige) |
| `link_album` | `recebe_convite` + tem telefone + `status_envio_album` ≠ "enviado" |

---

## Configurações de envio (`configuracoes_envio` no tenant)

Salvas como JSONB na tabela `tenants`. Editáveis em **Envios → Configurações**.

| Chave | Padrão | Significado |
|---|---|---|
| `cartao_por_nucleo` | `true` | Envia cartão apenas para o principal do núcleo |
| `exigir_recebe_convite_cartao` | `true` | Só envia cartão se `recebe_convite` = true |
| `envio_via_principal_nucleo` | `true` | Usa telefone do principal do núcleo como fallback |
| `incluir_criancas_publico` | `true` | Inclui crianças (`crianca = "sim"`) no público |

---

## Cronograma automático

- Configurado em **Envios → Cronograma**
- Cada item: `tipo_envio` + `dias_antes` do evento + `ativo`
- Salvo na tabela `evento_cronograma_envios`
- Cron job via **cron-job.org** chama `/api/envios/disparar-cronograma` diariamente
- A rota calcula: `data_evento - dias_antes == hoje` → enfileira na `envio_fila`
- Fila processada por `/api/envios/processar-fila` (também via cron-job.org)
- Janela de envio: **09h–20h horário de Brasília**

---

## Proteção de rotas cron

Header obrigatório:
```
Authorization: Bearer omnistage_cron_2026
```
Variável de ambiente: `CRON_SECRET=omnistage_cron_2026`

---

## Campos de status por tipo de envio

| Tipo | Campo atualizado no convidado |
|---|---|
| `save_the_date` | `status_envio_save_the_date` |
| `convite` | `status_envio_convite` |
| `lembrete_rsvp` | `status_envio_lembrete_rsvp` |
| `lembrete_evento` | `status_envio_lembrete_evento` |
| `cartao_entrada` | `status_envio_cartao` |
| `link_album` | `status_envio_album` |

Após envio bem-sucedido: campo = `"enviado"`. Se o convidado é `contato_principal` do grupo, todos os dependentes sem telefone recebem o mesmo status.
