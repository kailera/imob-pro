## ADDED Requirements

### Requirement: Listagem Local de Membros da Organização
O sistema SHALL buscar no banco de dados local (Prisma) todos os usuários cadastrados e vinculados à imobiliária da organização ativa e listá-los na aba de configurações.

#### Scenario: Visualização da Lista de Usuários
- **WHEN** o administrador acessa a aba "Gerenciar Usuários"
- **THEN** o sistema SHALL carregar os dados via Server Action `getUsers()` e renderizar uma tabela contendo Nome Completo, E-mail e Perfil/Função de cada integrante da equipe local.

#### Scenario: Estado de Carregamento da Lista
- **WHEN** a requisição de busca dos usuários locais está em andamento (isPending/loading)
- **THEN** o sistema SHALL exibir um indicador visual de carregamento (loading spinner ou similar) na área da tabela de membros.
