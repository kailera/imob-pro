## 1. Backend: Novas Server Actions

- [x] 1.1 Criar a Server Action `getLocatariosListAction` no backend para buscar todos os inquilinos reais com seus nomes, CPFs/CNPJs e endereços cadastrados no banco
- [x] 1.2 Criar a Server Action `criarAcordoManualAction` que valida os parâmetros do acordo (descrição, valor e vencimento), insere a nova transação na tabela `TransacaoFinanceira` do Postgres e chama imediatamente a função `gerarBolePixAction` da integração com o Banco Inter

## 2. Frontend: Modal de Acordo Manual na Tela Jurídico

- [x] 2.1 Refatorar a aba de Renegociação em `/juridico` para exibir a listagem real ou um botão proeminente "Iniciar Acordo Manual" que abre o novo modal de cadastro
- [x] 2.2 Carregar a lista de inquilinos reais usando `getLocatariosListAction` no carregamento da tela
- [x] 2.3 Implementar os campos do formulário no modal: seleção de inquilino (dropdown pesquisável), exibição/edição do CPF/CNPJ e endereço preenchido, inputs de valor, vencimento e descrição
- [x] 2.4 Vincular a submissão do formulário à Server Action `criarAcordoManualAction` mostrando estado de carregamento durante a emissão no Banco Inter
- [x] 2.5 Exibir em tela o resultado de sucesso: copiar código Pix Copia e Cola, exibir código de barras e disponibilizar o link para abrir o PDF oficial do boleto retornado pela integração do Inter

## 3. Validação e Testes

- [x] 3.1 Emitir um acordo manual selecionando um inquilino real, definindo um valor personalizado (ex: R$ 550,00) e vencimento futuro
- [x] 3.2 Verificar no console/logs se o payload enviado à API v3 do Banco Inter está no formato correto (incluindo dados de endereço e pagador)
- [x] 3.3 Confirmar se a transação financeira correspondente foi salva no Postgres e se aparece corretamente na aba de Cobranças
