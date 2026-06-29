# Fluxo de Dados — Cadastro para Envio

## Princípio fundamental

> **O módulo de Envios só lê. Quem escreve é o Cadastro do Convidado.**

Os campos que controlam o comportamento do envio são definidos no cadastro. O módulo de envios os lê, calcula o público em tempo real e exibe os cards — mas nunca altera esses campos.

---

## Onde cada campo é definido

| Campo | Quem define | Como |
|---|---|---|
| `contato_principal` | Cadastro do Convidado | Checkbox no formulário |
| `recebe_convite` | Cadastro do Convidado | Checkbox "Recebe comunicação" |
| `tag_envio` | Cadastro do Convidado | Campo de texto no formulário |
| `grupo` | Cadastro do Convidado | Campo de texto no formulário |
| `telefone` | Cadastro do Convidado | Campo de texto no formulário |
| `responsavel_telefone` | Cadastro do Convidado | Campo de texto no formulário |
| `crianca` | Cadastro do Convidado | Toggle "É criança" |
| `token` | Sistema | Gerado automaticamente na criação |
| `status_rsvp` | RSVP do convidado | Convidado responde pelo link ou operador altera |

---

## Fluxo completo

```
[1. CADASTRO DO CONVIDADO]
   Usuário preenche:
   - contato_principal, recebe_convite, tag_envio
   - grupo, telefone, responsavel_telefone, crianca
         ↓
   Salva na tabela `convidados` (banco Supabase)

[2. MÓDULO DE ENVIOS — ao abrir]
   Carrega todos os convidados do evento
         ↓
   Calcula publicoCampanha (useMemo):
   └── deveAparecerNoModuloEnvios()    → convidado deve aparecer na lista?
   └── deveEntrarNoPublicoCampanha()   → convidado entra no público deste tipo?
       ├── incluir_criancas_publico    → (config) criança passa?
       ├── getTelefoneEnvio()          → tem telefone resolvível?
       ├── recebeComunicacaoNesteEvento() → recebe_convite ≠ false?
       └── regras específicas por tipo (RSVP, token, etc.)

[3. CARDS — renderização visual]
   Para cada convidado do público, calcula as tags em tempo real:
   ├── "Também inclui (via principal)"
   │     getDependentesViaPrincipal() → compara convidados do mesmo grupo
   ├── "Envio conjunto"
   │     getOutrosPrincipaisGrupo() → outros principais com telefone no grupo
   └── "Envio via responsável/principal"
         isEnvioViaResponsavel() → convidado sem telefone com fallback

   ⚠️ As tags NÃO são salvas em lugar nenhum.
      São calculadas a cada renderização comparando os convidados entre si.

[4. DISPARO]
   Usuário seleciona convidados e clica em "Enviar"
         ↓
   Para cada convidado:
   - getTelefoneEnvio() → resolve o telefone final (próprio / responsável / principal)
   - montarMensagem() → substitui variáveis no template
   - Insere linha na tabela `envio_fila` com:
     { convidado_id, telefone, mensagem, tipo_envio, status: "pendente" }

[5. PROCESSAMENTO (cron)]
   /api/envios/processar-fila (via cron-job.org)
         ↓
   Lê `envio_fila` → envia via Evolution API (WhatsApp)
         ↓
   Atualiza convidado: status_envio_XXX = "enviado"
   Insere em `envio_historico`
```

---

## O que o card sinaliza vs. o que dirige o envio

| As tags do card... | ...são um espelho de |
|---|---|
| "Também inclui: Lara, Theo" | `contato_principal = true` no cadastro + Lara e Theo sem telefone |
| "Envio conjunto: Leon" | Leon também é `contato_principal` com telefone no mesmo grupo |
| "Envio via Principal Núcleo: Debora" | Convidado sem telefone, Debora é o principal do grupo |

O card **visualiza** o que vai acontecer no envio — não cria nem altera nada.  
Se o cadastro estiver errado (ex: ninguém marcado como `contato_principal`), o card e o envio vão refletir isso.

---

## Consequência prática

> **Para corrigir um comportamento de envio, a correção deve ser feita no cadastro do convidado — não no módulo de envios.**

| Problema | Onde corrigir |
|---|---|
| Convidado não aparece no público | Verificar `recebe_convite`, `telefone`, `status_rsvp` no cadastro |
| Mensagem indo para pessoa errada | Verificar `contato_principal` e `grupo` no cadastro |
| Criança recebendo envio separado | Verificar se tem `responsavel_telefone` preenchido no cadastro |
| Cartão indo para todo mundo do grupo | Verificar se só um tem `contato_principal = true` |

---

## Ver também

- [[Regras do Convidado]] — campos e seus significados
- [[Regras de Envio]] — critérios de elegibilidade por tipo
- [[Cards do Convidado no Módulo de Envios]] — como as tags são calculadas
- [[Configurações de Envio (Regras)]] — configs do tenant que afetam o público
