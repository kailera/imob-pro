## ADDED Requirements

### Requirement: Seleção de Inquilino e Carregamento de Dados Cadastrais
O sistema SHALL carregar a lista de inquilinos (`Locatario`) ativos do banco de dados e autopreencher os dados cadastrais (CPF/CNPJ e endereço completo) ao selecionar o inquilino no formulário de criação de acordo manual.

#### Scenario: Autocompletar dados do inquilino selecionado
- **WHEN** o usuário abre o modal de criação de acordo e seleciona o inquilino "João da Silva"
- **THEN** o sistema SHALL preencher automaticamente os campos de CPF/CNPJ e endereço com os dados correspondentes cadastrados no banco de dados.

### Requirement: Exibição de Informações de Referência do Contrato
Ao selecionar um inquilino que possua um contrato de locação ativo, o sistema SHALL exibir em um painel informativo na interface os dados resumidos deste contrato (imóvel, valor da locação e vigência) como apoio visual para a tomada de decisão do usuário.

#### Scenario: Exibição de dados do contrato
- **WHEN** o usuário seleciona um inquilino com contrato ativo
- **THEN** o sistema SHALL renderizar na tela o código do imóvel, a vigência do contrato e o valor total mensal da locação, permitindo que o usuário digite qualquer valor desejado no campo do boleto de acordo.

### Requirement: Validação do Formulário de Acordo Manual
O sistema SHALL validar os campos de entrada do formulário, exigindo descrição textual, valor monetário positivo maior que zero e data de vencimento igual ou posterior ao dia de hoje.

#### Scenario: Tentativa de envio com valor zerado
- **WHEN** o usuário tenta gerar o boleto com o valor de R$ 0,00 ou negativo
- **THEN** o sistema SHALL impedir a submissão e exibir um alerta de validação de valor incorreto.

### Requirement: Registro no BD e Emissão Imediata via Banco Inter
O sistema SHALL salvar o acordo como uma transação financeira no Postgres e realizar imediatamente a emissão do BolePix (boleto com Pix) na API do Banco Inter, salvando os dados de retorno (nosso número, Pix e PDF) e exibindo-os na tela.

#### Scenario: Emissão de boleto manual de acordo com sucesso
- **WHEN** o usuário clica em "Confirmar & Gerar Boleto" no formulário de acordo válido
- **THEN** o sistema SHALL gravar uma nova `TransacaoFinanceira` com status `PENDENTE`, chamar a API do Banco Inter usando a integração mTLS, atualizar a transação com os identificadores retornados pelo banco, e exibir o PDF e Pix Copia e Cola para o usuário.
