## ADDED Requirements

### Requirement: Parse billing CSV with multi-line Sacado field
O sistema deve ler o arquivo CSV `dataset scatolin - cobranca.csv` tratando corretamente o campo Sacado que contém nome + CPF em linhas separadas dentro de aspas CSV.

#### Scenario: Parse multi-line Sacado field
- **WHEN** o script de importação processa uma linha do CSV contendo `"Diego Alves Xavier\n351.215.518-94"` no campo Sacado
- **THEN** o sistema deve extrair separadamente o nome (`Diego Alves Xavier`) e o CPF (`351.215.518-94`).

### Requirement: Cross-reference billing with existing contracts by tenant name
O sistema deve cruzar cada cobrança com os contratos existentes buscando o Locatário pelo nome normalizado (case-insensitive, sem acentos).

#### Scenario: Match billing to contract
- **WHEN** uma cobrança tem Sacado "Diego Alves Xavier" e existe um `Locatario` com nome "Diego Alves Xavier" vinculado a um contrato
- **THEN** a `TransacaoFinanceira` criada deve ter `contratoId` e `imovelId` preenchidos com os IDs do contrato e imóvel correspondentes.

#### Scenario: No matching contract found
- **WHEN** uma cobrança tem um Sacado cujo nome não corresponde a nenhum Locatário no banco
- **THEN** a `TransacaoFinanceira` deve ser criada sem `contratoId` e o registro deve ser logado para revisão manual.

### Requirement: Map banking statuses to system statuses
O sistema deve mapear os status bancários do CSV para os enums `StatusTransacao` do Prisma.

#### Scenario: Status mapping
- **WHEN** o CSV contém uma cobrança com Situação `Liquidado` ou `Baixado`
- **THEN** a `TransacaoFinanceira` deve ter status `LIQUIDADO`.

#### Scenario: Cancelled status mapping
- **WHEN** o CSV contém uma cobrança com Situação `Cancelado` ou `Falha`
- **THEN** a `TransacaoFinanceira` deve ter status `CANCELADO`.

### Requirement: Update tenant CPF from billing data
O sistema deve atualizar o campo `cpfCnpj` do `Locatario` quando encontrar o CPF no campo Sacado e o locatário ainda não tiver CPF preenchido.

#### Scenario: Fill empty CPF
- **WHEN** uma cobrança é cruzada com um Locatário que tem `cpfCnpj = ""`
- **THEN** o sistema deve atualizar o `cpfCnpj` com o CPF extraído do campo Sacado.
