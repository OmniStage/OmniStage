# Cards do Convidado no Módulo de Envios

Cada convidado elegível aparece como um **card** na listagem do módulo de envios. O card exibe informações contextuais através de tags coloridas que explicam como o envio vai acontecer.

---

## Anatomia do card

```
[ ] DEBORA JOSE
    FAMILIA_GUERRAH · 55229999813381

    🟣 Também inclui (via principal): LARA JOSE, THEO JOSE
    🟢 Envio conjunto: LEON JOSE

    [prévia da mensagem]
```

| Elemento | O que mostra |
|---|---|
| **Nome em negrito** | Título inteligente — pode ser só o nome, "Nome e família", ou "Nome e Fulano" |
| **Linha cinza** | `grupo` · `telefone resolvido` (ou "Sem telefone") |
| **Tags coloridas** | Contexto de como o envio vai funcionar |
| **Prévia da mensagem** | Texto real que será enviado, com variáveis já substituídas |

---

## Tags (badges) do card

### 🟣 "Também inclui (via principal): NOME, NOME..."
**Cor:** roxo claro

**Quando aparece:** no card do **contato principal** do grupo, quando há membros do mesmo grupo **sem telefone próprio**.

**Significado:** esses membros não têm telefone — o envio será feito pelo principal e o status deles será marcado como enviado automaticamente após o envio do principal.

**Regra no código:**
- Convidado é `contato_principal = true`
- Tem telefone próprio
- Existe outro(s) membro(s) do mesmo `grupo` **sem** telefone

---

### 🟢 "Envio conjunto: NOME, NOME..."
**Cor:** verde claro

**Quando aparece:** no card de um contato principal quando há **outros contatos principais** no mesmo grupo que também têm telefone.

**Significado:** o grupo tem múltiplos responsáveis, cada um com telefone próprio — cada um receberá o envio individualmente, mas são exibidos juntos para contexto.

**Regra no código:**
- Convidado é `contato_principal = true`
- Tem telefone próprio
- Existe outro membro do mesmo `grupo` que também é `contato_principal = true` e tem telefone

---

### 🔵 "Envio via Principal Núcleo: NOME" / "Envio via responsável: NOME"
**Cor:** azul claro

**Quando aparece:** no card de um convidado que **não tem telefone próprio** mas tem telefone do responsável ou principal do núcleo.

**Significado:** a mensagem será enviada para o número do responsável/principal, não para o convidado diretamente.

- Se há um `contato_principal` no grupo → "Envio via Principal Núcleo: NOME"
- Se tem `responsavel_telefone` mas não há principal → "Envio via responsável: NOME"
- Se mais de um vinculado: exibe `· N convidados vinculados`

---

## Título inteligente do card (`formatarTituloCardEnvio`)

O nome exibido em negrito não é sempre o nome simples do convidado — ele é calculado:

| Situação | Título exibido |
|---|---|
| Principal com dependentes sem telefone | Apenas o nome do principal (a tag "Também inclui" cuida do resto) |
| Responsável por 1 vinculado | Nome do vinculado |
| Responsável por 2 vinculados | "Nome1 e Nome2" |
| Responsável por 3+ vinculados | "Nome1, Nome2 e Nome3" (ou "Nome1 e família") |
| Independente sem vínculo | Próprio nome |

---

## Checkbox desabilitado (dependente via principal)

Um convidado aparece no card **sem checkbox** (checkbox desabilitado, opacidade 0.3) quando:

- **Não tem telefone próprio**
- Pertence a um `grupo`
- Existe um `contato_principal` com telefone no mesmo grupo

→ Esse convidado **não pode ser selecionado** para envio manual porque ele será coberto automaticamente pelo envio do principal.

---

## Tag de envio (`tag_envio`)

Campo `tag_envio` no convidado (ex: `"Família"`, `"VIP"`, `"Fornecedor"`):
- Aparece no filtro **"Todas as tags"** do topo da listagem
- Define qual **instância WhatsApp** será usada para enviar (via tabela `evento_whatsapp_numeros`)
- Se não preenchido, usa `"Convidado(a)"` como padrão

---

## Instância WhatsApp no card

Quando o convidado está **na fila** e a instância foi determinada, o card exibe:
```
Instância: NomeDaInstancia
```
em azul abaixo das tags.

---

## Pluralização automática da mensagem

Quando um card representa **mais de 1 convidado** (ex: grupo familiar), o template é automaticamente ajustado:

| Original | Pluralizado |
|---|---|
| "Você está convidado(a)" | "Vocês estão convidados" |
| "confirme sua presença" | "confirmem suas presenças" |

---

## Ver também

- [[Regras de Envio]] — lógica completa de elegibilidade e fallback de telefone
- [[Como Funciona o Módulo de Envios]] — fluxo geral de disparo e processamento
- [[Regras do Convidado]] — campos `contato_principal`, `grupo`, `tag_envio`, `recebe_convite`
