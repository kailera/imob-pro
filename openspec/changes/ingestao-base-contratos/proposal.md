## Why

O objetivo deste plano é possibilitar a ingestão dos dados históricos e atuais dos contratos da imobiliária a partir do arquivo CSV `Contratos (7).csv` para o banco de dados PostgreSQL do projeto através do Prisma ORM, viabilizando a posterior migração/sincronização desses dados em produção.

## What Changes

- Ingestão em lote dos contratos existentes no arquivo CSV `Contratos (7).csv`.
- Mapeamento e criação das entidades `Imovel`, `ImovelLocacao`, `ContratoImovelLocacao`, `Locatario` e `Locador` necessárias para a integridade referencial dos contratos.
- Geração de placeholders para dados faltantes no CSV (como CPFs/CNPJs, e-mails e contatos) permitindo posterior edição manual em produção.

## Capabilities

### New Capabilities
- `import-contracts-csv`: Capability to parse, decode, and ingest contract records from a CSV file into the database.

### Modified Capabilities
<!-- Nenhuma modificação em regras de negócio existentes. -->
