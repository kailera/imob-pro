## Context

- O arquivo `Contratos (7).csv` contém valores de aluguel formatados com vírgula como separador de milhar e ponto como decimal (ex: `"3,100.00"`). O parser atual em `ingest-contratos.ts` converte incorretamente esse valor para `3.1` (R$ 3,10).
- O script `ingest-cobrancas.ts` foi executado antes do `ingest-contratos.ts` ou falhou em associar as transações financeiras aos contratos, resultando em 982 cobranças órfãs com `contratoId: null` e `imovelId: null`.

## Goals / Non-Goals

**Goals:**
- Corrigir o algoritmo de parsing de moedas em `ingest-contratos.ts` para lidar corretamente com formatos brasileiros (`3.100,00`) e americanos (`3,100.00`).
- Atualizar os aluguéis incorretos no banco de dados para os 81 contratos afetados.
- Criar e rodar um script de reconciliação de transações que vincule retroativamente as transações financeiras órfãs aos respectivos contratos de locação e imóveis, utilizando normalização e comparação robusta de nomes de locatários.

**Non-Goals:**
- Alterar o esquema das tabelas do Prisma ou o formato dos arquivos CSV originais.
- Modificar regras de negócios de reajustes ou taxas administrativas.

## Decisions

### 1. Detecção Dinâmica de Formato Numérico
Adotaremos uma função de parsing `parseMoney` aprimorada que verifica a presença e a posição relativa de pontos e vírgulas:
- Se a string contém tanto `.` quanto `,`:
  - Se a vírgula ocorre antes do ponto (ex: `3,100.00`), removemos a vírgula e mantemos o ponto.
  - Se o ponto ocorre antes da vírgula (ex: `3.100,00`), removemos o ponto e substituímos a vírgula por ponto.
- Se contém apenas vírgula (ex: `969,00`), substituímos a vírgula por ponto.
- Caso contrário, removemos vírgulas residuais.

### 2. Script de Reconciliação / Correção Retroativa
Faremos um script de correção que:
- Lê o CSV `Contratos (7).csv` para obter o aluguel real de cada contrato.
- Busca o contrato correspondente no banco e atualiza os valores errôneos em `imovel_locacao` (e em centavos na tabela `imovel`).
- Busca todas as `TransacaoFinanceira` com `contratoId` nulo.
- Indexa os locatários cadastrados no banco utilizando uma versão limpa de seus nomes (removendo diacríticos, pontuação e sufixos corporativos como "LTDA", "ME", "EPP").
- Compara o sacado da transação com o nome normalizado do locatário. Se houver correspondência exata ou de prefixo/sufixo relevante, atualiza os campos `contratoId` e `imovelId` da transação.

## Risks / Trade-offs

- **[Risco]** Falsos positivos em nomes muito parecidos.
  - *Mitigação:* Usar normalização estrita e registrar em logs todas as atualizações. Apenas fazer matching quando houver grau de confiança aceitável.
- **[Risco]** Sobrescrita acidental de dados válidos já preenchidos manualmente pelo usuário.
  - *Mitigação:* Apenas atualizar contratos e transações cujos valores estejam inconsistentes com o esperado da importação.
