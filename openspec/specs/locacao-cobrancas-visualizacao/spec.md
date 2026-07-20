# Locação - Visualização de Cobranças

## Purpose
Esta especificação define o comportamento de exibição das cobranças de aluguéis e do cálculo de totais de competência na aba correspondente do módulo de controle locatício.

## Requirements

### Requirement: Exibição Correta das Colunas da Tabela de Cobrança
O sistema deve mapear corretamente as propriedades brutas da transação financeira retornada pelo banco para as propriedades esperadas pela tabela de cobranças no cliente.
- `recepcaoData` e `recepcaoHora` DEVEM ser mapeados a partir de `createdAt`.
- `movimentoData` e `movimentoHora` DEVEM ser mapeados a partir de `updatedAt`.
- `vencimento` DEVE ser mapeado a partir de `dataVencimento` no formato `DD/MM/YYYY`.
- `situacao` DEVE ser mapeado a partir do `status` (PENDENTE -> 'Recepcionado', LIQUIDADO -> 'Liquidado', CANCELADO -> 'Cancelado').
- `sacadoNome` DEVE ser extraído de `descricao` retirando o prefixo `"Aluguel - "`.
- `pagamentoData` DEVE ser mapeado a partir de `dataPagamento`.
- `pagamentoValor` DEVE ser preenchido com o valor total pago se o status for `LIQUIDADO`.

#### Scenario: Visualização de colunas preenchidas na listagem
- **WHEN** o operador acessa a aba "Cobranças de Aluguéis" na página de controle locatício
- **THEN** os campos Recepção, Vencimento, Situação e Sacado devem exibir os valores correspondentes das transações do banco em vez de células em branco.

### Requirement: Totais de Cobrança Dinâmicos Reais
O sistema DEVE somar dinamicamente os valores de todas as cobranças carregadas por status para compor os cards de resumo de faturamento (Registrado, Liquidado, Baixado, Recepcionado, Cancelado) no cliente, em vez de exibir valores estáticos.

#### Scenario: Cards de resumo com totais reais
- **WHEN** a aba "Cobranças de Aluguéis" é renderizada
- **THEN** os valores nos cards de resumo devem corresponder exatamente à soma dos valores das cobranças listadas.
