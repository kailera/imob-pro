## ADDED Requirements

### Requirement: Gerenciamento Integrado de Usuários (Membros)
O sistema SHALL integrar as opções de gerenciamento de membros da organização em uma interface administrativa dedicada nas configurações.

#### Scenario: Exibição da Interface de Membros por Admin
- **WHEN** um administrador (`ADMIN`) acessa a aba "Usuários" em `/configuracoes`
- **THEN** o sistema SHALL renderizar a interface de controle do Clerk (lista de membros, status de convite pendente, troca de roles e convites por e-mail)

#### Scenario: Bloqueio de Gestão de Usuários para Operadores
- **WHEN** um usuário com a role `OPERADOR` tenta acessar a aba "Usuários"
- **THEN** o sistema SHALL ocultar a aba de navegação ou redirecionar o usuário exibindo uma mensagem de "Acesso negado"
