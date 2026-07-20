# controles-locaticios-proprietario Specification

## Purpose
TBD - created by archiving change melhorias-controles-locaticios-e-proprietario. Update Purpose after archive.
## Requirements
### Requirement: Seletor de Índice de Reajuste no Imóvel
O formulário de cadastro e edição de imóvel MUST apresentar um campo do tipo `<select>` para a seleção do índice de reajuste do aluguel, contendo opções padronizadas do mercado brasileiro.

#### Scenario: Visualizar e salvar índice de reajuste
- **WHEN** o usuário abre o modal de edição de um imóvel para locação
- **THEN** o campo de Índice de Reajuste é exibido como um dropdown com as opções: IGP, IGPM, INPC, IPC, IPC-DI e IPCA, e o valor selecionado é salvo no campo JSON `aluguelDados.indiceReajuste`.

---

### Requirement: Campos Faltantes de Controle Locatício no Imóvel
O formulário do imóvel MUST incluir seletores para "Período Garantido" (Carência da Garantia) e "Abrangência da Garantia do Aluguel" para alinhar as preferências do imóvel com as condições do contrato.

#### Scenario: Configurar garantias padrões do imóvel
- **WHEN** o usuário configura as opções de repasse e garantia do imóvel
- **THEN** o sistema exibe os seletores de "Período Garantido" (com opções como "Não Garantir", "Garantir pela vigência do contrato", etc.) e "Abrangência da Garantia" (com opções "Somente o Aluguel" e "Aluguel e demais lançamentos") e salva os valores no JSON `aluguelDados`.

---

### Requirement: Formatação e Máscaras de Campos sem Controles Nativos
Os campos numéricos, monetários e de CEP no formulário do imóvel MUST ser renderizados como inputs de texto (sem setas/spinners de incremento nativos do navegador) e conter máscaras de formatação em tempo real.

#### Scenario: Digitação formatada de valores e CEP
- **WHEN** o usuário digita no campo de valor do aluguel ou no campo de CEP
- **THEN** as setas nativas do navegador não são exibidas e o valor é formatado automaticamente em tempo real (ex: R$ 1.250,50 formatado com ponto para milhar e vírgula para centavos; CEP formatado como 00000-000).

---

### Requirement: Associação de Proprietário ao Imóvel
O formulário de edição de imóvel MUST permitir pesquisar proprietários (Locadores) existentes no banco de dados e/ou cadastrar um novo proprietário em tempo de edição do imóvel, vinculando-o à ficha cadastral do imóvel através de seu ID no JSON `aluguelDados`.

#### Scenario: Buscar e vincular proprietário existente
- **WHEN** o usuário digita o nome ou documento do proprietário no campo de busca do imóvel
- **THEN** o sistema exibe sugestões de proprietários cadastrados e, ao selecionar um deles, vincula seu ID e dados de exibição ao JSON `aluguelDados` do imóvel.

#### Scenario: Cadastrar e vincular novo proprietário em tempo de edição
- **WHEN** o usuário clica no botão "Cadastrar Novo Proprietário" na edição do imóvel
- **THEN** um subformulário é exibido para preenchimento dos dados do proprietário (Locador) e, após salvar, o novo registro é criado no banco de dados e associado automaticamente ao imóvel em `aluguelDados`.

---

### Requirement: Índice de Reajuste por Período de Contrato
O sistema MUST permitir a seleção e o armazenamento de um Índice de Reajuste específico para cada período contratual cadastrado na aba de Controle Locatício.

#### Scenario: Definir índice para período contratual
- **WHEN** o usuário adiciona ou edita um período de locação na visualização do contrato
- **THEN** o modal de período apresenta um seletor dropdown com os índices (IGPM, IPCA, etc.) e o valor escolhido é persistido no banco de dados sob o campo `indiceReajuste` do período em questão.

