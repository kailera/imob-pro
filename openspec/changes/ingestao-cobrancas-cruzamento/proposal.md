## Why

A imobiliária possui um histórico de ~982 cobranças (boletos/PIX via Banco Inter) no arquivo `dataset scatolin - cobranca.csv` que precisam ser importadas e cruzadas com os 95 contratos já ingestados no banco de dados. Esse cruzamento é necessário para rastrear pagamentos de inquilinos, identificar períodos de adimplência/inadimplência e vincular receitas aos proprietários dos imóveis.

## What Changes

- Ingestão em lote das cobranças do CSV para a tabela `TransacaoFinanceira`.
- Cruzamento automático por nome do Sacado (inquilino) com `Locatario.nome` para vincular cada cobrança ao `ContratoImovelLocacao` e ao `Imovel` corretos.
- Preenchimento automático dos CPFs dos locatários (que estavam vazios) usando os dados do campo Sacado do CSV.
- Mapeamento dos status bancários (`Liquidado`, `Registrado`, `Recepcionado`, `Cancelado`, `Baixado`, `Falha`) para os enums `StatusTransacao` do Prisma.

## Capabilities

### New Capabilities
- `ingest-billing-csv`: Capacidade de parsear, decodificar e ingestar cobranças de um CSV bancário (Inter) para o banco de dados, cruzando com contratos existentes.

### Modified Capabilities
<!-- Nenhuma modificação em capabilities existentes -->

## Impact

- Tabela `TransacaoFinanceira`: ~982 novos registros vinculados a contratos e imóveis.
- Tabela `Locatario`: atualização do campo `cpfCnpj` com CPFs extraídos do CSV.
- Script utilitário `scripts/ingest-cobrancas.ts`.
- Dependência: `iconv-lite` e `csv-parse` (já instalados).
