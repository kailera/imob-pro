## Why

Permitir que a imobiliária gerencie de forma fidedigna múltiplos períodos de vigência, reajustes de aluguel e encargos contratuais ao longo do tempo (por exemplo, contratos antigos migrados com dois ou três reajustes já aplicados). Isso garante que o histórico financeiro seja mantido e que a geração de faturas mês a mês utilize sempre os valores e regras corretas do período correspondente à data de vencimento da transação.

## What Changes

- Criação de uma tabela/entidade `PeriodoContratoLocacao` vinculada à locação (`ImovelLocacao`) para armazenar o histórico de períodos e valores (aluguel, condomínio, IPTU, desconto pontualidade e encargos).
- Atualização da página de visualização de locação (`app/(admin)/locacao/view-locacao/[id]/page.tsx`) para permitir visualizar todos os períodos cadastrados (estilo abas por vigência, semelhante à referência fornecida).
- Atualização do fluxo de cadastro/edição de locações para permitir múltiplos períodos com edição individual.
- Ajuste na lógica de geração mensal de cobranças para basear os valores e regras financeiras da fatura no período vigente para o vencimento correspondente.

## Capabilities

### New Capabilities
- `controle-periodos-locativos`: Gerenciamento, visualização e persistência de múltiplos períodos de preços, reajustes e encargos vigentes dentro de um mesmo contrato de locação.

### Modified Capabilities
<!-- Nenhuma especificação anterior formal de requirements precisa ser alterada -->

## Impact

- Banco de dados (`prisma/schema.prisma`): Nova tabela `PeriodoContratoLocacao`.
- Frontend (`app/(admin)/locacao/*`): Telas de visualização, formulários e abas de períodos contratuais.
- Ações no Servidor (`app/(admin)/locacao/actions.ts`): Atualização de rotas para cadastrar, editar e obter períodos.
- Lógica Financeira de Faturamento: Regra de cálculo de novas cobranças (`TransacaoFinanceira`) obtendo parâmetros a partir do período correspondente ao vencimento.
