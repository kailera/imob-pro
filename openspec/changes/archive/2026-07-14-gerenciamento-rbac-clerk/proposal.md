## Why

Atualmente, o sistema não possui um mecanismo centralizado e seguro de autenticação de usuários nem de controle de acesso baseado em funções (RBAC). Para escalar de forma segura, é necessário limitar o acesso de operadores comuns e conceder controle total (como a assinatura de vistorias e configurações críticas) exclusivamente ao corretor/administrador, garantindo rastreabilidade e integridade das operações.

## What Changes

- Instalação e integração do Clerk SDK para gerenciamento de autenticação e sessão.
- Criação de middleware do Clerk para restringir rotas do painel administrativo.
- Sincronização via webhook do Clerk para manter os dados de usuários e organizações no banco local (Prisma) em tempo real.
- Diferenciação de permissões (RBAC) entre operadores (`OPERADOR`) e corretores (`ADMIN`).
- Restrição de ações confidenciais (por exemplo, assinar vistorias, alterar chaves de API do Banco Inter) para usuários que não possuam a role de administrador.

## Capabilities

### New Capabilities

- `user-auth-clerk`: Gerenciamento de autenticação de usuários, suporte a multi-inquilino (multi-tenant) com Clerk Organizations e sincronização automática de dados com a tabela `Users` e `Imob`.
- `user-rbac-permissions`: Regras de autorização por função (RBAC), assegurando que operadores realizem operações diárias (imóveis, vistorias e boletos) e apenas corretores (`ADMIN`) assinem vistorias e tenham total controle do domínio.

### Modified Capabilities

*(Nenhuma capacidade existente a ser modificada)*

## Impact

- Banco de dados: A tabela `users` terá seu ciclo de vida (criação, edição, exclusão e alteração de role) gerenciado em sincronia com o Clerk via webhooks.
- API e Server Actions: Adição de validações de permissão/perfil nas Server Actions de vistorias e integrações financeiras.
- Componentes e Telas: Proteção visual de elementos na UI (botões de ação, menus e formulários administrativos) com base nas roles dos usuários.
