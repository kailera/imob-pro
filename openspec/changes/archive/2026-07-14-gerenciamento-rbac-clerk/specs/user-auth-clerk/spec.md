## ADDED Requirements

### Requirement: Autenticação de Usuários com Clerk
O sistema SHALL exigir que qualquer usuário do painel administrativo esteja autenticado através do Clerk.

#### Scenario: Acesso por Usuário Não Autenticado
- **WHEN** um usuário não autenticado tenta acessar qualquer página sob o path `/(admin)`
- **THEN** o sistema SHALL redirecionar o usuário para a página de Sign-In do Clerk

#### Scenario: Acesso por Usuário Autenticado
- **WHEN** um usuário autenticado tenta acessar as páginas do painel `/(admin)`
- **THEN** o sistema SHALL permitir o acesso e injetar a sessão ativa do usuário

### Requirement: Sincronização de Dados via Webhook
O sistema SHALL fornecer uma rota de webhook (`/api/webhooks/clerk`) que escuta eventos do Clerk e atualiza as tabelas `users` e `imob` no banco de dados local via Prisma.

#### Scenario: Criação de Nova Organização
- **WHEN** o webhook recebe o evento `organization.created`
- **THEN** o sistema SHALL criar um novo registro na tabela `imob` mapeando o `orgId` do Clerk

#### Scenario: Registro ou Atualização de Usuário
- **WHEN** o webhook recebe o evento `user.created` ou `organizationMembership.created`
- **THEN** o sistema SHALL criar ou atualizar o registro do usuário correspondente na tabela `users` do Prisma, vinculando-o à `imob` (organização) correta com a respectiva `role`
