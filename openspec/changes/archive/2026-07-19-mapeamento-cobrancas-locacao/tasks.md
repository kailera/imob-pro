## 1. Totais Dinâmicos de Cobranças

- [x] 1.1 Calcular dinamicamente `cobrancasTotals` a partir do array `initialCobrancas` em `LocacaoClientContainer.tsx` em vez de usar os mocks estáticos.

## 2. Mapeamento de Propriedades no Tab de Locação

- [x] 2.1 Atualizar `CobrancasTabContent.tsx` para mapear os registros do Prisma vindos de `cobrancas` para a interface `BilletData` esperada pelo componente `FinancialTable`.
- [x] 2.2 Garantir que dataVencimento, createdAt, updatedAt, status, valor e descricao sejam mapeados para vencimento, recepcaoData, movimentoData, situacao, valor e sacadoNome respectivamente.

## 3. Teste e Verificação

- [x] 3.1 Rodar a validação do TypeScript com `npx tsc --noEmit` para garantir que tudo compile sem erros.
