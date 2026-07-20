## MODIFIED Requirements

### Requirement: Associação de Proprietário ao Imóvel
O formulário de edição de imóvel MUST permitir pesquisar proprietários (Locadores) existentes no banco de dados e/ou cadastrar um novo proprietário em tempo de edição do imóvel, vinculando-o à ficha cadastral do imóvel através de seu ID no JSON `aluguelDados`. O seletor de proprietários MUST exibir uma lista consolidada (sem duplicadas) e incluir a exibição do CPF/CNPJ quando disponível para diferenciar homônimos.

#### Scenario: Buscar e vincular proprietário existente
- **WHEN** o usuário abre o seletor de proprietários no formulário do imóvel
- **THEN** o sistema exibe apenas proprietários únicos ordenados alfabeticamente, mostrando o CPF formatado ou "(Sem CPF)" se estiver em branco, evitando a listagem de homônimos repetidos.

#### Scenario: Cadastrar e vincular novo proprietário em tempo de edição
- **WHEN** o usuário clica no botão "Cadastrar Novo Proprietário" na edição do imóvel
- **THEN** um subformulário é exibido para preenchimento dos dados do proprietário (Locador) e, após salvar, o novo registro é criado no banco de dados e associado automaticamente ao imóvel em `aluguelDados`.
