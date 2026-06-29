# Como Funciona o Módulo de Envios

## Visão Geral

O módulo de envios é responsável por enviar mensagens WhatsApp para os convidados de um evento. Ele funciona em etapas: **configurar campanha → selecionar público → disparar → processar fila**.

---

## Tipos de Campanha (em ordem cronológica)

| # | Tipo | Label | Público |
|---|---|---|---|
| 1 | `save_the_date` | Save the Date | Todos com telefone |
| 2 | `convite` | Envio do Convite | Todos com telefone |
| 3 | `lembrete_rsvp` | Confirmação Pendente | Status RSVP = `pendente` + com telefone |
| 4 | `lembrete_evento` | Evento Está Chegando | Confirmados + com telefone |
| 5 | `cartao_entrada` | Cartão de Entrada | Confirmados + tem token + recebe_convite + com telefone |
| 6 | `lista_presentes` | Lista de Presentes | Confirmados + com telefone |
| 7 | `link_album` | Álbum Compartilhado | Todos com telefone |

---

## Fluxo Manual (disparo pelo usuário)

```
[Selecionar Evento]
      ↓
[Escolher Tipo de Campanha]
      ↓
[Editar Template (opcional)] → salva em envio_campanhas
      ↓
[Ver público "A enviar"]
      ↓
[Selecionar convidados ou Enviar Todos]
      ↓
[Inserir na envio_fila com status = pendente]
      ↓
[Cron processar-fila dispara → Evolution API → WhatsApp]
      ↓
[Status convidado atualizado: status_envio_XXX = "enviado"]
```

---

## Fluxo Automático (cronograma)

```
[Configurar cronograma em Envios → Cronograma]
  Ex: "convite → 30 dias antes do evento"
      ↓
[cron-job.org chama /api/envios/disparar-cronograma diariamente]
      ↓
[Rota verifica: data_evento - dias_antes == hoje?]
      ↓
[Se sim → enfileira automaticamente na envio_fila]
      ↓
[Cron processar-fila dispara as mensagens]
```

---

## Tabelas envolvidas

| Tabela | Função |
|---|---|
| `envio_campanhas` | Armazena o template configurado por evento+tipo |
| `envio_fila` | Fila de mensagens pendentes/processando/enviadas/erro |
| `envio_historico` | Registro histórico de tudo que foi enviado |
| `evento_cronograma_envios` | Configuração do cronograma automático por evento |
| `evento_whatsapp_numeros` | Define qual instância WhatsApp usar por tag_envio |
| `tenants.configuracoes_envio` | Configurações de regras (JSONB) |

---

## Templates

Cada campanha tem um **template padrão** e pode ter um **template personalizado** salvo em `envio_campanhas`.

### Variáveis disponíveis

| Variável | Valor |
|---|---|
| `{{nome}}` | Nome do convidado |
| `{{evento}}` | Nome do evento |
| `{{nome_evento}}` | Nome do evento (alias) |
| `{{link_convite}}` | `https://app.omnistageproducoes.com.br/c/TOKEN` |
| `{{link_cartao}}` | `https://app.omnistageproducoes.com.br/cartao/TOKEN` |
| `{{link_album}}` | URL do álbum configurado |
| `{{link_lista_presentes}}` | URL da lista de presentes |
| `{{convidados}}` | Lista de convidados do grupo |
| `{{grupo}}` | Nome do grupo/família |
| `{{telefone}}` | Telefone do convidado |
| `{{email}}` | Email do convidado |
| `{{token}}` | Token bruto do convidado |

---

## Mídia (imagem)

- Cada campanha pode ter uma **imagem** associada (upload via Storage do Supabase)
- Caminho: `tenant_id/evento_id/tipo_envio/campanha/arquivo`
- Se houver mídia, a Evolution API usa `sendMedia` (imagem + legenda)
- Se não houver, usa `sendText`

---

## Seleção de instância WhatsApp

Ordem de prioridade para escolher qual número enviar:
1. Regra específica por `tag_envio` do convidado → `evento_whatsapp_numeros`
2. Regra geral do evento (`relacao_evento = null`) → `evento_whatsapp_numeros`
3. Instância padrão do tenant (`EVOLUTION_INSTANCE` do env)

---

## Filtros da listagem

| Filtro | Exibe |
|---|---|
| A enviar | Elegíveis que ainda não foram enviados |
| Na fila | Estão em `envio_fila` com status `pendente` ou `agendado` |
| Enviados | `status_envio_XXX = "enviado"` |
| Com erro | Em `envio_fila` com status `erro` |
| Card Convidado | Todos os convidados com card resumido |
| Sem telefone | Convidados sem nenhum telefone resolvível |
| Todos | Público completo sem filtro |

---

## Processamento da fila (`/api/envios/processar-fila`)

- Roda via cron-job.org
- Janela: **09h–20h horário de Brasília**
- Busca até **20 itens** com status `pendente` ou `agendado` e `agendado_para` ≤ agora
- Para cada item:
  1. Marca como `processando`
  2. Busca mídia da campanha
  3. Define instância WhatsApp (por tag_envio)
  4. **Delay aleatório 7–15s** (anti-bloqueio WhatsApp)
  5. Envia via Evolution API
  6. Atualiza status na `envio_fila` → `enviado`
  7. Atualiza campo `status_envio_XXX` no convidado
  8. Se o convidado é principal do grupo: marca dependentes sem telefone com mesmo status
  9. Insere em `envio_historico`

---

## Proteção das rotas cron

Header obrigatório:
```
Authorization: Bearer omnistage_cron_2026
```

---

## Ver também

- [[Regras de Envio]] — critérios de elegibilidade por tipo e fallback de telefone
- [[Regras do Convidado]] — campos do convidado usados nos envios
