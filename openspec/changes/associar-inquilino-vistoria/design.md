## Context

Atualmente, ao tentar compartilhar uma vistoria para contestação do inquilino, o sistema gera uma URL com o prefixo `/public/` (ex: `/public/vistorias/acesso/[token]`). Entretanto, no Next.js App Router, a pasta `(public)` é um grupo de rotas, o que significa que o segmento `(public)` não faz parte da URL final, causando um erro 404 ao tentar acessá-la.

Além disso, a validação de acesso exige que o CPF/CNPJ informado bata com o de um inquilino associado a um contrato ativo daquele imóvel. Caso o imóvel ainda não esteja alugado no momento da vistoria (o que é muito comum, pois a vistoria de entrada costuma ser feita antes da assinatura do contrato), o inquilino não consegue acessar a vistoria.

## Goals / Non-Goals

**Goals:**
- Corrigir a URL gerada de `/public/vistorias/acesso/[token]` para `/vistorias/acesso/[token]`.
- Adicionar o relacionamento direto entre `Vistoria` e `Locatario` no banco de dados.
- Adicionar um seletor de inquilino no modal de compartilhamento para que o operador possa associar um inquilino já cadastrado antes de enviar o link.
- Ajustar a lógica de validação de login seguro para que o inquilino associado diretamente à vistoria consiga entrar, mantendo o fallback de busca por contratos.

**Non-Goals:**
- Mudar regras de criação de novas vistorias em lote.
- Alterar as permissões de acesso gerais no painel administrativo.

## Decisions

### 1. Alteração do Prisma Schema
Adicionar um campo `locatarioId` opcional à tabela `Vistoria` e o relacionamento correspondente ao modelo `Locatario`.

```prisma
model Vistoria {
  // ...
  locatarioId String?
  locatario   Locatario? @relation(fields: [locatarioId], references: [id], onDelete: SetNull)
}
```

*Raciocínio:* Permite salvar diretamente qual inquilino receberá esta vistoria mesmo sem um contrato de locação cadastrado para o imóvel correspondente no momento.

### 2. Novas Ações de Servidor em `actions.ts`
Implementar as seguintes ações:
- `getLocatarios()`: Retorna a lista de todos os inquilinos (Locatarios) cadastrados para seleção no dropdown.
- `associateTenantToVistoria(vistoriaId, locatarioId)`: Associa diretamente o inquilino selecionado ao registro de vistoria.

### 3. Ajuste de Validação de Login no `validateTenantAccess`
Atualizar o método `validateTenantAccess` para realizar a verificação:
1. Buscar o CPF/CNPJ do `Locatario` diretamente associado à vistoria (se `locatarioId` estiver preenchido).
2. Se não bater ou não houver inquilino direto, buscar através dos inquilinos dos contratos (`contratoImovelLocacaos`) associados ao imóvel (fallback).

### 4. Correção do Prefixo da URL
Substituir todas as ocorrências de `${window.location.origin}/public/vistorias/acesso/` por `${window.location.origin}/vistorias/acesso/` no código cliente.

## Risks / Trade-offs

- **[Risco] Incompatibilidade com Vistorias Existentes** → A alteração de schema é opcional (`locatarioId` nulo por padrão), garantindo que vistorias antigas continuem funcionando pelo fallback de contratos.
- **[Risco] Erro 404 persistir em caches locais** → O roteamento do lado do cliente é limpo com Next.js, mas deve-se garantir que o IndexedDB offline também reflita as novas propriedades da vistoria.
