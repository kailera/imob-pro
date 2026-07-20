## ADDED Requirements

### Requirement: Evitar Duplicação na Ingestão de Contratos
A rotina de importação de contratos a partir de arquivos CSV (ingestão em lote) MUST verificar se o proprietário (Locador) já existe no banco de dados com base no nome antes de criar um novo registro.

#### Scenario: Importação de contrato com proprietário já existente
- **WHEN** o arquivo CSV é processado e o nome do locador coincide com um locador já existente no banco de dados
- **THEN** o sistema vincula a nova locação/contrato ao locador existente em vez de criar um novo registro com o mesmo nome.

### Requirement: Ferramenta de Deduplicação e Consolidação de Proprietários
O sistema MUST fornecer uma ferramenta/script para consolidar proprietários homônimos já cadastrados na base de dados, unificando seus históricos de imóveis e contratos sob um único registro de proprietário.

#### Scenario: Execução do script de deduplicação de locadores
- **WHEN** o administrador executa a rotina de deduplicação de proprietários
- **THEN** os locadores com nomes idênticos e CPF em branco são agrupados, as referências de locações vinculadas a eles são atualizadas para apontar para um único locador principal, e os locadores duplicados órfãos são removidos do banco.
