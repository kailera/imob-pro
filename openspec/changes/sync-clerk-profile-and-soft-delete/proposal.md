## Why

Atualmente, se um usuário atualizar seus dados cadastrais (nome, sobrenome, email) no painel do Clerk, o banco local do aplicativo não reflete essa mudança, gerando inconsistências de perfil. Além disso, a exclusão direta de membros da organização no Clerk dispara um webhook de remoção física (`delete`) que falha no banco de dados local por restrições de chaves estrangeiras (já que o usuário possui vistorias e transações vinculadas), gerando usuários órfãos ou inconsistências na sincronia.

## What Changes

- Sincronização automática de dados de perfil do usuário (`user.updated` do Clerk) para manter nomes e e-mails atualizados no banco local.
- Substituição da remoção física por "Soft Delete" (inativação) de usuários ao receber o webhook `organizationMembership.deleted` do Clerk.
- Adição do atributo `ativo` no modelo de usuário (`Users`) no banco de dados local.

## Capabilities

### New Capabilities
*(Nenhuma nova capacidade geral)*

### Modified Capabilities
- `user-auth-clerk`: Adição de cenários para atualização de perfil do usuário via webhook (`user.updated`) e inativação de conta (*Soft Delete*) via webhook (`organizationMembership.deleted`) para evitar quebra de chaves estrangeiras.

## Impact

- **Banco de Dados (Prisma)**: Novo campo booleano `ativo` no modelo `Users` com default `true`. Necessário gerar e rodar migration.
- **Webhooks do Clerk**: Rota `/api/webhooks/clerk` atualizada para escutar o evento `user.updated` e processar a inativação no evento `organizationMembership.deleted`.
- **Validação de Permissões**: Ações e consultas locais devem considerar o status do campo `ativo` para evitar que usuários inativos realizem operações.
