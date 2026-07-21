## Why

O fluxo atual de renegociação no painel administrativo opera de forma simulada no lado do cliente (`localStorage`). O usuário necessita de uma funcionalidade mais direta e flexível: um botão para criar cobranças/acordos manuais para um inquilino específico do banco de dados, preenchendo automaticamente o endereço dele, permitindo definir o valor e a descrição livremente, e gerando imediatamente o boleto real integrado com o Banco Inter (BolePix).

## What Changes

- **Botão "Criar Boleto de Acordo"**: Adicionar um botão e modal no painel administrativo para emissão manual de cobrança/acordo.
- **Seleção de Inquilino**: Dropdown/Combobox que carrega todos os inquilinos (`Locatario`) reais cadastrados no banco de dados.
- **Preenchimento Automático**: Ao selecionar o inquilino, exibir e validar seus dados cadastrados (CPF/CNPJ e endereço).
- **Formulário de Entrada Manual**: Campos para o usuário digitar livremente o Valor (R$), Data de Vencimento e Descrição do Acordo (ex: "Acordo de Débitos - Parcela 1/3").
- **Persistência e Emissão Direta**: Server Action que grava a nova transação no Postgres e chama imediatamente a integração do Banco Inter para registrar o BolePix, retornando o código de barras, código Pix e link do PDF.

## Capabilities

### New Capabilities

- `acordos-juridicos-boletos-inter`: Emissão manual de boletos de acordo/cobrança no sistema com seleção de inquilino cadastrado, autocompletar de endereço/CPF, definição manual de parâmetros (valor, data, descrição), gravação no banco de dados central e registro instantâneo via API v3 do Banco Inter.

### Modified Capabilities

(Nenhuma)

## Impact

- **Banco de Dados (Postgres)**: Inserção de novas transações na tabela `TransacaoFinanceira`.
- **API & Server Actions**: Criação de uma Server Action para salvar a transação e gerar o BolePix instantaneamente.
- **Interface UI (`app/(admin)/juridico/page.tsx` ou `/cobrancas`)**: Inclusão do botão de ação e do modal de criação de acordo manual.
