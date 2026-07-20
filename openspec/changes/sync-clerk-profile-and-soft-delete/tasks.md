## 1. Banco de Dados (Prisma)

- [x] 1.1 Adicionar o campo `ativo` com valor padrão `true` no modelo `Users` em `prisma/schema.prisma`
- [x] 1.2 Gerar e aplicar a migration localmente executando `npx prisma migrate dev --name add_user_active_field`
- [x] 1.3 Atualizar o client do Prisma executando `npx prisma generate`

## 2. Webhook do Clerk

- [x] 2.1 Atualizar `app/api/webhooks/clerk/route.ts` para escutar e tratar o evento `user.updated`, sincronizando nome, sobrenome e e-mail no banco de dados local
- [x] 2.2 Modificar o tratamento de `organizationMembership.deleted` em `app/api/webhooks/clerk/route.ts` para desativar o usuário (`ativo: false`) no banco de dados local em vez de excluí-lo
- [x] 2.3 Garantir que as ações de criação de membro (`organizationMembership.created`) mantenham ou definam `ativo: true` no banco local

## 3. Filtros de Usuários Ativos

- [x] 3.1 Atualizar a função `getVistoriadores` em `app/(admin)/vistorias/actions.ts` para retornar apenas usuários ativos (`ativo: true`)
