# Regras do Convidado

## Campos principais

| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | string | Nome do convidado |
| `email` | string | Email (opcional) |
| `telefone` | string | Telefone próprio |
| `responsavel_telefone` | string | Telefone(s) do responsável — separados por vírgula |
| `responsavel` | string | Nome do responsável |
| `grupo` | string | Nome do núcleo/grupo familiar — usado para agrupar na listagem e no grafo |
| `grupo_envio` | string | Identifica o responsável CRM (ex: "Eliane") — **não filtra envios em massa** |
| `grupo_contato_id` | uuid | Vínculo com a tabela `nucleos_contatos` (CRM) |
| `crianca` | string | `"sim"` se é criança, vazio/null se adulto |
| `idade_crianca` | number | Idade da criança (opcional) |
| `contato_principal` | boolean | Quem é o representante do núcleo para receber mensagens em nome do grupo |
| `recebe_convite` | boolean | Recebe comunicações em massa? `null` = true (padrão) |
| `tipo_convite` | string | `"individual"` ou `"grupo"` |
| `token` | string | Token único — gerado automaticamente ao criar. Usado nos links de convite e cartão |
| `status_rsvp` | string | Estado da confirmação de presença |
| `tag_envio` | string | Tag que determina qual número WhatsApp usa para enviar (via `evento_whatsapp_numeros`) |

---

## Status RSVP

| Valor | Significado |
|---|---|
| `pendente` | Ainda não respondeu |
| `confirmado` | Presença confirmada |
| `confirmado_parcial` | Parte do grupo confirmou |
| `recusado` | Não vai comparecer |

---

## Tipo de convite

| Valor | Comportamento |
|---|---|
| `individual` | Link único por pessoa (`/c/TOKEN`) |
| `grupo` | Um link para todos do grupo (`/c/TOKEN1,TOKEN2,...`) — usa os tokens de todos os integrantes |

---

## Grupos e Núcleos

- O campo `grupo` agrupa convidados visualmente na listagem
- Quando há busca ativa, **todos os membros do grupo são expandidos** se qualquer um bate na busca
- A listagem é ordenada por `grupo` (alfabético pt-BR)
- `contato_principal = true` indica quem representa o núcleo para envios
- Convidados sem telefone recebem o status de envio automaticamente quando o principal do grupo é enviado

### Diferença grupo vs grupo_envio vs grupo_contato_id

| Campo | Para quê serve |
|---|---|
| `grupo` | Agrupamento visual na listagem e lógica de envio por núcleo |
| `grupo_envio` | Nome do responsável CRM que captou o convidado (ex: "Eliane") — informativo |
| `grupo_contato_id` | FK para `nucleos_contatos` — vincula ao CRM para buscar responsável e dados |

---

## Crianças

- `crianca = "sim"` ativa comportamento especial:
  - Herda `recebe_convite = true` automaticamente (não pode desmarcar individualmente)
  - Pode ser excluída do público de envio via config `incluir_criancas_publico = false`
  - Na listagem, linha com fundo diferenciado
- Campo `idade_crianca` é opcional

---

## Token

- Gerado automaticamente na criação (`gerarToken()`)
- Imutável após criação
- Usado em:
  - Link convite: `/c/TOKEN`
  - Link cartão entrada: `/cartao/TOKEN`
  - Obrigatório para receber `cartao_entrada` no módulo de envios

---

## Filtros disponíveis na listagem

| Filtro | Opções |
|---|---|
| RSVP | todos / pendente / confirmado / confirmado_parcial / recusado |
| Perfil | todos / adulto / criança |
| Tipo convite | todos / individual / grupo |
| Busca livre | nome, email, telefone, grupo, token, status_rsvp, etc. |

---

## Atualização rápida (quickUpdate)

Campos atualizáveis diretamente pelo card da listagem (sem abrir o formulário):
- `recebe_convite` — toggle "Recebe comunicação"
- `contato_principal` — toggle "Contato principal"
- `status_rsvp` — botões de confirmação rápida

> A query de update sempre inclui `.eq("tenant_id", tenantId)` para respeitar o RLS do Supabase.

---

## Links gerados

| Tipo | URL |
|---|---|
| Convite individual | `https://app.omnistageproducoes.com.br/c/TOKEN` |
| Convite grupo | `https://app.omnistageproducoes.com.br/c/TOKEN1,TOKEN2,...` |
| Cartão de entrada | `https://app.omnistageproducoes.com.br/cartao/TOKEN` |
| Álbum de fotos | `https://app.omnistageproducoes.com.br/album?token=TOKEN` |

---

## Ver também

- [[Regras de Envio]] — como o módulo de envios usa os campos do convidado
