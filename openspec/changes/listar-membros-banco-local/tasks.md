## 1. Integração de Estado e Ações no ConfiguracoesClient

- [x] 1.1 Importar a action `getUsers` no arquivo `ConfiguracoesClient.tsx`
- [x] 1.2 Adicionar estados para `users` e `loadingUsers` usando `useState` em `ConfiguracoesClient.tsx`
- [x] 1.3 Criar a função assíncrona `loadUsers` para carregar a lista de usuários locais
- [x] 1.4 Acionar a função `loadUsers` no `useEffect` de inicialização de dados do `ConfiguracoesClient.tsx`
- [x] 1.5 Acionar `loadUsers` após a criação de um usuário em `handleCreateUserSubmit` para sincronizar a lista localmente

## 2. Ajuste do Componente UsersTab e Interface de Usuário (UI)

- [x] 2.1 Atualizar a definição das props `UsersTabProps` em `UsersTab.tsx` para receber `users` e `loadingUsers`
- [x] 2.2 Atualizar a chamada do componente `UsersTab` em `ConfiguracoesClient.tsx` passando as novas props
- [x] 2.3 Substituir o componente `<OrganizationProfile />` do Clerk pela estrutura de tabela customizada em `UsersTab.tsx`
- [x] 2.4 Implementar estado visual de carregamento (loading spinner) e mensagem de lista vazia
- [x] 2.5 Exibir Nome Completo, E-mail e Perfil/Função de cada integrante da equipe mapeando a lista local
