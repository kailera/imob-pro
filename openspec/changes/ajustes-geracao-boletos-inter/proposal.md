## Why

Atualmente, a geração de boletos através da API v3 do Banco Inter falha devido a inconsistências e falta de dados fundamentais (endereço inválido ou ausente do inquilino, datas no passado e falta de configuração de taxas de multa e descontos contratuais). Além disso, a interface de filtros do financeiro exibe opções de bancos mockados, gerando confusão no uso real da plataforma.

## What Changes

- **Geração de BolePix no Banco Inter**:
  - Validação prévia de endereço, CEP (mínimo de 8 dígitos e não nulo) e CPF/CNPJ antes de acionar a API do Inter, fornecendo um erro amigável ao usuário.
  - Enriquecimento automático do endereço do inquilino a partir do imóvel alugado, utilizando o CEP padrão do município (`15385-000`) para inquilinos importados sem endereço.
  - Envio de multas e juros de mora configurados no contrato (`imovelLocacao`) nos campos apropriados da API do Banco Inter.
  - Envio de desconto por pontualidade (bonificação) com base na data limite e valores configurados no contrato.
- **Filtros e Visualização Bancária**:
  - Atualização dos filtros e formulários de cedente na área de cobranças de aluguéis para exibir o banco real configurado (`077 - Banco Inter`) e a conta real correspondente (`45033751-0`).
- **Ação de Renegociação**:
  - Implementação de funcionalidade para baixar/cancelar o boleto vencido anterior na API do Banco Inter e resetar a transação na base de dados para permitir nova data de vencimento e novo valor renegociado.

## Capabilities

### Modified Capabilities
- `locacao-cobrancas-visualizacao`: Adiciona requisitos para exibição real da conta bancária nos filtros, validação de dados de endereço e data de vencimento, e inclusão de multa/bonificação de pontualidade no BolePix gerado, além da renegociação de boletos vencidos.

## Impact

- Modificações na API de geração de cobranças e boletos em `lib/inter.ts`.
- Componentes do frontend de Cobranças como `FinancialFilterBar.tsx` e `CedenteForm.tsx`.
- Criação de um script utilitário de migração/correção temporária para inquilinos sem endereço.
