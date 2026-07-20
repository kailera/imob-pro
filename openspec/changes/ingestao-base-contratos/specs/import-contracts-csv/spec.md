## ADDED Requirements

### Requirement: Parse CSV with Windows-1252 character set
O sistema deve ler o arquivo CSV codificado em `Windows-1252`/`ISO-8859-1` e decodificá-lo corretamente para UTF-8 de forma a preservar caracteres especiais (acentos, cedilhas, etc.).

#### Scenario: Parse and decode file
- **WHEN** o script de importação é executado com o arquivo `Contratos (7).csv` contendo acentuações como "Lorenço Oliveira Telles Franco"
- **THEN** a saída e os dados gravados no banco devem conter os caracteres especiais decodificados sem caracteres corrompidos.

### Requirement: Map and Ingest Properties
O sistema deve obter ou criar registros na tabela `Imovel` com base no endereço e código do contrato gerados a partir do CSV.

#### Scenario: Upsert Imovel
- **WHEN** o script processa uma linha do CSV contendo um contrato e endereço
- **THEN** ele cria ou localiza o correspondente registro de `Imovel` usando a chave única de código derivada do contrato.

### Requirement: Ingest Lease Agreements
O sistema deve cadastrar os registros de locação (`ImovelLocacao` e `ContratoImovelLocacao`) vinculados ao imóvel e à organização imobiliária padrão.

#### Scenario: Create lease records
- **WHEN** o script processa uma linha do CSV contendo datas de contrato e valores
- **THEN** ele insere a locação com os valores numéricos convertidos e as datas corretas formatadas para o banco.

### Requirement: Create associated Landlords and Tenants with placeholders
O sistema deve gerar os registros de Locador e Locatário atrelados a cada contrato importado, preenchendo com valores vazios/placeholders os dados não inclusos no CSV.

#### Scenario: Create tenant and landlord records
- **WHEN** o script processa um contrato do CSV contendo os nomes do Locatário e Locador
- **THEN** ele cria os respectivos registros vinculados na base de dados com o nome correto e os campos restantes (como CPF, e-mail) vazios para posterior edição.
