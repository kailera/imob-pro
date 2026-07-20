## Context

A aba "Cobranças de Aluguéis" no painel de Locação exibe dados brutos da tabela `TransacaoFinanceira` retornada pelo Prisma diretamente para o componente `<FinancialTable />`. Como este componente foi desenhado para receber objetos mapeados com campos da interface `BilletData` (definida em `FinancialTable.tsx`), várias colunas (Recepção, Vencimento, Situação, Sacado) ficam em branco e os badges de situação ficam sem texto (bolinha cinza neutra). Adicionalmente, os cards superiores de totais estão exibindo valores estáticos mockados.

## Goals / Non-Goals

**Goals:**
- Mapear corretamente a lista de cobranças enviada para a aba de locação.
- Exibir dinamicamente os totais baseados nos dados reais retornados.
- Habilitar filtros e paginação corretos no cliente na visualização de locação.

**Non-Goals:**
- Alterar o banco de dados.
- Alterar as integrações com o Banco Inter (BolePix).

## Decisions

- **Mapeamento no Cliente (`CobrancasTabContent.tsx`)**: Mapearemos os itens de transações brutas de banco (`initialCobrancas`) para o formato esperado pelo `<FinancialTable />` antes de realizar qualquer operação de paginação ou filtro.
  - *Razão*: Centraliza o tratamento e formatação de datas no componente que renderiza a aba correspondente.
- **Totais em Tempo Real (`LocacaoClientContainer.tsx`)**: Faremos o cálculo dos totais somando os valores reais com base nos status retornados do banco (`LIQUIDADO`, `PENDENTE`, `CANCELADO`).
  - *Razão*: Remove os valores de teste mockados estáticos e exibe o resumo financeiro atualizado da listagem.

## Risks / Trade-offs

- **[Risco]** Mapeamento incorreto de datas do banco que possam causar falhas de renderização.
  - **[Mitigação]** Tratamento defensivo no mapeador com checagens de nulo e fallback de datas válidas.
