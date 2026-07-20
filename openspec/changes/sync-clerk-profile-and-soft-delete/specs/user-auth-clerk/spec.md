## MODIFIED Requirements

### Requirement: Sincronização de Dados via Webhook
O sistema SHALL fornecer uma rota de webhook (`/api/webhooks/clerk`) que escuta eventos do Clerk e atualiza as tabelas `users` e `imob` no banco de dados local via Prisma.

#### Scenario: Criação de Nova Organização
- **WHEN** o webhook recebe o evento `organization.created`
- **THEN** o sistema SHALL criar um novo registro na tabela `imob` mapeando o `orgId` do Clerk

#### Scenario: Registro ou Atualização de Usuário
- **WHEN** o webhook recebe o evento `user.created` ou `organizationMembership.created`
- **THEN** o sistema SHALL criar ou atualizar o registro do usuário correspondente na tabela `users` do Prisma, vinculando-o à `imob` (organização) correta com a respectiva `role` e definindo o campo `ativo` como `true`

#### Scenario: Atualização de Perfil de Usuário
- **WHEN** o webhook recebe o evento `user.updated`
- **THEN** o sistema SHALL atualizar os campos `firstName`, `lastName` e `email` correspondentes na tabela `users` local, preservando as demais informações

#### Scenario: Remoção de Membro (Soft Delete)
- **WHEN** o webhook recebe o evento `organizationMembership.deleted`
- **THEN** o sistema SHALL atualizar o atributo `ativo` do usuário correspondente na tabela `users` do Prisma para `false`, desativando a conta sem realizar a exclusão física do registro do banco de dados
