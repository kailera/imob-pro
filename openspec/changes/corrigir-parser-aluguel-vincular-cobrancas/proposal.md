## Why

Foram identificados dois bugs críticos no fluxo de importação e processamento de dados da imobiliária:
1. **Erro de Formatação no Aluguel:** No script `ingest-contratos.ts`, a função `parseMoney` interpretou incorretamente o separador de milhar americano (vírgula) como decimal, importando valores de aluguel como centavos (ex: R$ 3,100.00 virou R$ 3.10). Isso corrompeu os valores em 81 dos 95 contratos.
2. **Ausência de Vínculos de Boletos:** Devido à execução desordenada de scripts de ingestão (ou banco vazio no momento da ingestão de cobranças), as 982 transações financeiras (boletos) foram salvas sem vínculo (`contratoId` nulo) com os contratos de locação correspondentes.

## What Changes

- **Correção do Parser de Valores:** Modificar a função `parseMoney` em `ingest-contratos.ts` para tolerar e diferenciar dinamicamente formatos de moeda brasileiros e americanos.
- **Vínculo Retroativo de Transações:** Criar um script de reconciliação para percorrer as transações existentes no banco de dados e associá-las aos contratos de locação corretos por meio da comparação robusta de nomes dos locatários.
- **Atualização dos Valores de Contratos Existentes:** Executar a correção dos valores de aluguel dos contratos no banco de dados de acordo com os dados corretos do CSV.

## Capabilities

### New Capabilities
- `ingestao-dados-financeiros`: Importação correta de contratos de locação e vinculação de cobranças financeiras.

### Modified Capabilities
- Nenhuma

## Impact

- **Banco de Dados (Tabelas):**
  - Atualização dos valores das colunas `valorAluguel` e `valorTotal` na tabela `imovel_locacao` (e o valor correspondente em `imovel`).
  - Preenchimento da coluna `contratoId` e `imovelId` na tabela `transacao_financeira` para as transações de aluguel elegíveis.
- **Arquivos de Script:**
  - [ingest-contratos.ts](file:///c:/Users/rebec/Documents/scatolin/imob-pro/scripts/ingest-contratos.ts)
  - [ingest-cobrancas.ts](file:///c:/Users/rebec/Documents/scatolin/imob-pro/scripts/ingest-cobrancas.ts)
