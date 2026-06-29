# Configurações de Envio (Regras)

Acessível em **Envios → Configurações → Regras de envio**.  
Salvas como JSONB em `tenants.configuracoes_envio`. Aplicadas globalmente para todos os eventos do tenant.

---

## 1. Cartão de entrada por núcleo (`cartao_por_nucleo`)

**Padrão:** ✅ Ativado

### Ativado
Só o **contato principal** do grupo recebe o cartão de entrada.  
O cartão gerado exibe os nomes de todos do núcleo.  
Membros sem `contato_principal = true` não entram no público de `cartao_entrada`.

### Desativado
Cada convidado confirmado recebe seu **próprio cartão individual**, independente de ser principal ou não.

### Implementação
```ts
function deveReceberCartaoEvento(convidado) {
  const grupo = String(convidado.grupo || "").trim();
  return convidado.contato_principal === true || grupo.length === 0;
}
```
→ Sem grupo (individual) sempre passa. Com grupo, só passa se for principal.

---

## 2. Exigir "recebe comunicação" para cartão (`exigir_recebe_convite_cartao`)

**Padrão:** ✅ Ativado

### Ativado
Só recebem o cartão de entrada quem tem `recebe_convite ≠ false` (campo "Recebe comunicação" no cadastro).  
Convidados com `recebe_convite = false` são excluídos do público de `cartao_entrada`.

### Desativado
O campo `recebe_convite` é ignorado para o cartão.  
Todos os confirmados com `token` recebem.

### Implementação
```ts
const recebeOk = config.exigir_recebe_convite_cartao
  ? recebeComunicacaoNesteEvento(convidado)  // verifica recebe_convite
  : true;                                     // ignora
```

> `recebeComunicacaoNesteEvento` retorna `true` se `recebe_convite` não é `false` / `"false"` / `0`.  
> `null` ou `undefined` = **true** (padrão inclusivo).

---

## 3. Envio via contato principal do núcleo (`envio_via_principal_nucleo`)

**Padrão:** ✅ Ativado

### Ativado
Convidados **sem telefone próprio** e sem `responsavel_telefone` têm o envio redirecionado para o telefone do `contato_principal` do mesmo `grupo`.  
Isso é o 3º nível do fallback de telefone.

### Desativado
O fallback para o principal do núcleo é cortado.  
Se o convidado não tem telefone próprio nem `responsavel_telefone` → não tem telefone resolvível → não entra no público.

### Implementação
```ts
function getTelefoneEnvio(convidado, todos, config) {
  const tel = normalizarTelefone(convidado.telefone);
  if (tel) return tel;                                    // 1. próprio

  const respTel = convidado.responsavel_telefone...
  if (respTel) return respTel;                           // 2. responsavel_telefone

  if (!config.envio_via_principal_nucleo) return null;  // ← desativado corta aqui

  return normalizarTelefone(getPrincipalNucleoEnvio(...)?.telefone); // 3. principal
}
```

---

## 4. Incluir crianças no público de envio (`incluir_criancas_publico`)

**Padrão:** ✅ Ativado

### Ativado
Crianças (`crianca = "sim"`) entram normalmente no público de envio.  
O envio é redirecionado para o responsável (via `responsavel_telefone` ou principal do núcleo).

### Desativado
Crianças são excluídas **antes de qualquer outra verificação** — não importa RSVP, telefone ou qualquer outro critério.

### Implementação
```ts
function deveEntrarNoPublicoCampanha(convidado, campanha, todos, config) {
  if (!config.incluir_criancas_publico && convidado.crianca === "sim") return false; // ← corte imediato
  // ... demais verificações
}
```

---

## Interação entre as regras

| Cenário | Resultado |
|---|---|
| Criança + `incluir_criancas_publico = false` | Excluída de todos os tipos de envio |
| Membro do grupo sem telefone + `envio_via_principal_nucleo = false` | Sem telefone resolvível → fora do público |
| Convidado com `recebe_convite = false` + `exigir_recebe_convite_cartao = true` | Fora do público de `cartao_entrada` |
| Convidado com `recebe_convite = false` + `exigir_recebe_convite_cartao = false` | Entra no público de `cartao_entrada` (se confirmado e com token) |
| Membro não-principal + `cartao_por_nucleo = true` | Fora do público de `cartao_entrada` |
| Membro não-principal + `cartao_por_nucleo = false` | Entra no público se confirmado |

---

## Ver também

- [[Regras de Envio]] — critérios completos por tipo de envio
- [[Cards do Convidado no Módulo de Envios]] — como as regras afetam a exibição dos cards
- [[Regras do Convidado]] — campos `recebe_convite`, `crianca`, `contato_principal`
