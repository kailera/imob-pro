## Why

O sistema atualmente exibe dados mockados nos totais de cobrança e exibe colunas vazias na tabela de cobranças dentro da aba Locação ➔ Cobrança de aluguéis devido a uma incompatibilidade entre os campos do Prisma e as propriedades esperadas pela tabela. Esta alteração é necessária para que os operadores visualizem dados reais de cobranças e status corretos.

## What Changes

- Remoção de todos os dados totais e de listagem mockados na aba de locação.
- Implementação de mapeamento correto dos registros brutos do Prisma para o formato esperado pelo componente `FinancialTable`.
- Cálculo dinâmico em tempo real dos totais de cobrança (Registrado, Liquidado, Baixado, Recepcionado, Cancelado) no cliente.
- Habilitação de filtros e paginação corretos e integrados na visualização de locação.

## Capabilities

### New Capabilities
- `locacao-cobrancas-visualizacao`: Visualização correta, real e filtrada das cobranças de aluguéis e seus respectivos totais de competência na aba de controle de locação.

### Modified Capabilities

## Impact

- Afeta o componente `LocacaoClientContainer.tsx`, `CobrancasTabContent.tsx` e o mapeamento de transações financeiras na listagem de locação.
