# user-rbac-permissions Specification

## Purpose
TBD - created by archiving change gerenciamento-rbac-clerk. Update Purpose after archive.
## Requirements
### Requirement: Diferenciação de Ações por Função
O sistema SHALL diferenciar as permissões e restringir ações no back-end (Server Actions e APIs) e front-end entre operadores (`OPERADOR`) e corretores (`ADMIN`).

#### Scenario: Assinatura de Vistoria por Operador
- **WHEN** um usuário com a role `OPERADOR` tenta executar a ação de assinar/concluir uma vistoria
- **THEN** o sistema SHALL bloquear a operação e retornar um erro de autorização ("Acesso negado")

#### Scenario: Assinatura de Vistoria por Corretor
- **WHEN** um usuário com a role `ADMIN` (Corretor) tenta executar a ação de assinar/concluir uma vistoria
- **THEN** o sistema SHALL permitir a operação e atualizar o status da vistoria para `CONCLUIDA`

### Requirement: Restrição de Configurações Críticas
O sistema SHALL permitir apenas que usuários com a função de administrador (`ADMIN`) alterem as credenciais e configurações da API do Banco Inter.

#### Scenario: Alteração de Configurações de API por Operador
- **WHEN** um usuário com a role `OPERADOR` tenta salvar alterações nas configurações do Banco Inter
- **THEN** o sistema SHALL impedir a alteração, rejeitando a requisição e exibindo erro de permissão

#### Scenario: Alteração de Configurações de API por Corretor
- **WHEN** um usuário com a role `ADMIN` tenta salvar alterações nas configurações do Banco Inter
- **THEN** o sistema SHALL persistir as configurações com sucesso na tabela `configuracao_inter`

