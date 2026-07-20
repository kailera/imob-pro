## Context

Atualmente, o painel de configurações utiliza o componente `<OrganizationProfile />` do Clerk para exibir membros. Para garantir que apenas os usuários do banco de dados local sejam exibidos (refletindo a sincronização feita no banco via webhooks/cadastro local), é necessário substituir este componente por uma tabela customizada alimentada pela Server Action `getUsers()`.

## Goals / Non-Goals

**Goals:**
- Substituir o componente de perfil do Clerk por uma tabela local de membros na aba de configurações.
- Carregar os dados de forma assíncrona do banco de dados usando a action local `getUsers`.
- Exibir nome, e-mail e função dos usuários do banco de dados local.

**Non-Goals:**
- Alterar as regras de autenticação ou fluxo de cadastro/convite do Clerk.
- Gerenciar convites pendentes do Clerk nesta tabela local (foco apenas em usuários já cadastrados localmente).

## Decisions

### Decisão 1: Gerenciamento de Estado no ConfiguracoesClient
- **Opção A**: Chamar a Server Action `getUsers` diretamente no component `UsersTab` via `useEffect`.
- **Opção B (Escolhida)**: Manter o estado centralizado no componente pai `ConfiguracoesClient.tsx` (onde já são gerenciados estados de templates, banco inter, etc.) e passar os dados e estado de loading via props para `UsersTab`.
- **Raciocínio**: Mantém o padrão arquitetural do restante da tela de configurações, onde o pai gerencia o carregamento de dados iniciais e atualizações de estado.

### Decisão 2: Substituição da UI do Clerk
- **Decisão**: Remover o `<OrganizationProfile />` de `UsersTab` e renderizar uma tabela moderna com visual consistente (utilizando as classes de estilo da aplicação como cantos arredondados, fontes personalizadas e cores baseadas no tema `#280003`).

## Risks / Trade-offs

- **Risco**: Usuários convidados mas que ainda não aceitaram o convite (ou seja, não completaram o fluxo do webhook e não estão na tabela local do Prisma) não aparecerão na lista.
- **Mitigação**: O título da seção será alterado para "Membros Cadastrados Localmente" para deixar claro que reflete o banco de dados.
