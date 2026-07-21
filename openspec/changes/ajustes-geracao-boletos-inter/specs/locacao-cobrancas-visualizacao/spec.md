## ADDED Requirements

### Requirement: Validação Prévia de Dados para Boleto
O sistema MUST validar a integridade dos dados de cadastro e endereço do locatário (inquilino) antes de solicitar o BolePix na API do Banco Inter.
- O CPF/CNPJ do locatário MUST estar presente e ser válido.
- O CEP MUST conter exatamente 8 dígitos numéricos e ser diferente de "00000000".
- O logradouro, bairro, município e estado MUST estar preenchidos.
Caso os dados de endereço estejam ausentes ou incorretos e não haja fallback automático, a geração MUST ser interrompida com um erro explicativo ao usuário.

#### Scenario: Geração de boleto abortada por dados incompletos
- **WHEN** o operador solicita a geração de um BolePix para uma cobrança
- **THEN** o sistema verifica os dados do locatário e, se estiverem em branco ou inválidos, retorna erro amigável sem chamar a API do Inter

### Requirement: Enriquecimento de Endereço Automático do Inquilino
Para inquilinos que não possuem endereço pessoal cadastrado, o sistema MUST enriquecer os dados de endereço de cobrança a partir da descrição e dados do imóvel vinculado ao contrato, adotando o CEP `15385000` (Ilha Solteira-SP) como padrão de município para fins de faturamento.

#### Scenario: Enriquecimento automático do endereço no boleto
- **WHEN** o boleto é gerado e o endereço do inquilino está ausente
- **THEN** o sistema mapeia o endereço da descrição do imóvel correspondente no payload enviado ao Banco Inter

### Requirement: Envio de Multa e Juros ao Inter
O sistema MUST extrair a multa de atraso percentual e os juros de mora definidos no contrato e repassá-los nas configurações de cobrança (`multa` e `mora`) do Banco Inter.

#### Scenario: Boleto configurado com multa e juros do contrato
- **WHEN** um BolePix é gerado para o contrato com multa de 10% e mora de 1%
- **THEN** o payload do Banco Inter inclui as taxas especificadas sob os campos correspondentes

### Requirement: Configuração de Bonificação/Desconto de Pontualidade
O sistema MUST configurar o desconto de pontualidade (bonificação) no BolePix de acordo com as regras estabelecidas no contrato (valor fixo ou percentual, e prazo limite em dias de antecedência ou no vencimento).

#### Scenario: Boleto configurado com desconto até a data limite
- **WHEN** o contrato prevê bonificação por pontualidade e o BolePix é gerado
- **THEN** o payload do Banco Inter define o código de desconto e a data limite de forma correspondente

### Requirement: Exibição Real do Cedente e Conta Bancária
Os formulários de cedente e filtros bancários no módulo de cobranças MUST exibir as opções reais integradas à conta do Banco Inter da imobiliária (Banco `077 - Banco Inter`, agência `0001-9` e conta `45033751-0`) em substituição a dados mockados.

#### Scenario: Visualização do banco real nos filtros
- **WHEN** o operador acessa o filtro de busca de cobranças ou formulário de cedente
- **THEN** o sistema apresenta a conta cadastrada do Banco Inter da imobiliária para seleção
