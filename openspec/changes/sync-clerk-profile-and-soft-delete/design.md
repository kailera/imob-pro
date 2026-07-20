## Context

Os membros da imobiliária são sincronizados via webhooks do Clerk. Atualmente, o sistema realiza a exclusão física (`delete`) dos registros na tabela `users` do banco local ao receber o evento `organizationMembership.deleted`. No entanto, se o usuário já tiver realizado vistorias ou transações financeiras vinculadas à sua conta, a exclusão física falhará devido a restrições de chaves estrangeiras (`Foreign Key Constraint`). Além disso, atualizações de perfil feitas diretamente no Clerk (nome e e-mail) não são propagadas para o banco de dados local.

## Goals / Non-Goals

**Goals:**
- Adicionar o campo booleano `ativo` (default `true`) à tabela `Users`.
- Modificar o webhook `organizationMembership.deleted` para inativar o usuário (`ativo: false`) em vez de deletá-lo.
- Implementar o tratamento do webhook `user.updated` do Clerk para sincronizar atualizações de nome, sobrenome e e-mail.
- Garantir que usuários inativos não apareçam em listagens ativas (como designação de vistoriadores).

**Non-Goals:**
- Excluir manualmente relacionamentos ou logs históricos de vistorias/transações vinculadas a usuários excluídos.

## Decisions

### Decisão 1: Campo `ativo` no Schema Prisma
Adicionar a coluna `ativo Boolean @default(true)` ao modelo `Users`.
- **Alternativa considerada**: Tabela de histórico separada.
- **Razão**: Um campo booleano é mais simples, performático e resolve nativamente a consistência referencial sem migrações de dados complexas.

### Decisão 2: Soft Delete via Webhook
No endpoint `/api/webhooks/clerk`, o processamento do evento `organizationMembership.deleted` passará a atualizar o registro do usuário definindo `ativo: false` em vez de excluí-lo.
- **Alternativa considerada**: Cascade delete.
- **Razão**: Cascade delete destruiria históricos importantes de vistorias passadas e auditorias de transações financeiras, o que é inaceitável para o negócio.

### Decisão 3: Escutar Evento `user.updated`
Adicionar o mapeamento do evento `user.updated` no webhook do Clerk para atualizar `firstName`, `lastName` e `email` dos usuários locais baseando-se no ID do Clerk.

---

## Risks / Trade-offs

- **[Risk] Sincronização Concorrente** → Quando um usuário for criado e imediatamente atualizado, múltiplos webhooks podem ser disparados.
  - *Mitigação*: Utilizar comandos `upsert` com base no ID único do Clerk para que o banco resolva inserções/atualizações de forma atômica.
- **[Risk] Usuários inativos listados na interface** → Corretores desativados poderiam ser selecionados para novas vistorias.
  - *Mitigação*: Atualizar as consultas de usuários (como a busca de vistoriadores ativos) para incluir o filtro `ativo: true`.
