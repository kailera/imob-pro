## Why

Atualmente, a listagem e gerenciamento de membros na aba de usuários das configurações utiliza o componente `<OrganizationProfile />` do Clerk. Isso faz com que a lista seja buscada diretamente nos servidores do Clerk, ignorando o banco de dados local e impedindo a customização da listagem de membros ou a visualização offline dos usuários cadastrados localmente.

## What Changes

- Substituição do componente `<OrganizationProfile />` do Clerk por uma tabela customizada de membros na aba de usuários.
- Integração da tabela com a Server Action local `getUsers()` para buscar os membros do banco de dados (Prisma).
- Exibição de informações dos usuários: Nome, Sobrenome, E-mail e Função (Role).
- Adicionado suporte a loading state e tratamentos de erro durante a busca dos usuários.

## Capabilities

### New Capabilities
- `gerenciamento-membros-local`: Busca e renderização da lista de membros da organização diretamente do banco de dados local através do Prisma.

### Modified Capabilities
<!-- Nenhuma especificação de comportamento de autenticação/sincronização existente está sendo alterada. -->

## Impact

- **Componente afetado**: `app/(admin)/configuracoes/components/UsersTab.tsx` (Substituição de `<OrganizationProfile />` pela tabela customizada).
- **Server Action**: `app/(admin)/configuracoes/configuracoesActions.ts` (Utilização da action `getUsers`).
- **Páginas de Configurações**: `app/(admin)/configuracoes/ConfiguracoesClient.tsx` (Carregamento da lista de usuários via state e passagem para o componente `UsersTab`).
