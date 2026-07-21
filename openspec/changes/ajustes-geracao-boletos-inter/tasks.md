## 1. Scripts e Preparações do Banco de Dados

- [x] 1.1 Criar o script de migração unilateral `scripts/enrich-inquilinos-addresses.ts` para mapear endereços dos imóveis alugados e CEPs gerais `15385-000` nos perfis dos locatários sem endereço.
- [x] 1.2 Executar o script criado em ambiente de produção para corrigir dados legados e habilitar todos os 94 inquilinos para emissão de boletos.

## 2. API v3 do Banco Inter

- [x] 2.1 Incluir validação prévia de integridade cadastral (CPF/CNPJ, CEP válido de 8 dígitos e endereço preenchido) na ação de geração de boletos em `lib/inter.ts`, com mensagens de erro customizadas.
- [x] 2.2 Alterar a consulta de transação para incluir `imovelLocacao` (contrato) a fim de extrair as configurações de encargos.
- [x] 2.3 Mapear e incluir o envio de multas e juros de mora contratuais no payload do Banco Inter em `lib/inter.ts`.
- [x] 2.4 Mapear e incluir o envio de desconto de pontualidade (bonificação) no payload do Banco Inter em `lib/inter.ts`.
- [x] 2.5 Criar a função de cancelamento de boleto `cancelarBolePixAction` chamando a API do Inter correspondente em `lib/inter.ts`.

## 3. Ações do Servidor e Interface do Usuário

- [x] 3.1 Criar a action `renegociarCobrancaAction` em `app/actions/financeiroActions.ts` para baixar o boleto antigo, atualizar o vencimento/valor e redefinir a cobrança.
- [x] 3.2 Atualizar o filtro de seleção e componentes de dados do cedente nos arquivos `components/cobrancas/FinancialFilterBar.tsx` e `components/cobrancas/CedenteForm.tsx` para usar o Banco Inter real e respectiva conta corrente.
