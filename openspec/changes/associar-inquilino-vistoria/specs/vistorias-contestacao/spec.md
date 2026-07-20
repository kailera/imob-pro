## ADDED Requirements

### Requirement: Associar Inquilino à Vistoria
O sistema deve permitir que um operador selecione e associe um inquilino (Locatário) já cadastrado a uma vistoria técnica antes de enviar o link de contestação, independente da existência de um contrato ativo.

#### Scenario: Operador seleciona inquilino no modal de envio
- **WHEN** o operador clica no botão "Enviar p/ Inquilino" na ficha de uma vistoria sem inquilino associado
- **THEN** o sistema exibe um dropdown contendo todos os inquilinos (Locatários) cadastrados
- **WHEN** o operador seleciona um inquilino e confirma a associação
- **THEN** o sistema atualiza o registro da vistoria associando o inquilino escolhido e exibe o link seguro gerado

### Requirement: Autenticação Segura de Inquilino
O sistema deve permitir a autenticação do inquilino utilizando o CPF/CNPJ do inquilino associado diretamente à vistoria.

#### Scenario: Validação de CPF/CNPJ de inquilino associado diretamente
- **WHEN** o inquilino acessa o link seguro de contestação da vistoria
- **THEN** o sistema exibe um formulário solicitando CPF/CNPJ
- **WHEN** o inquilino insere o CPF/CNPJ correspondente ao inquilino associado à vistoria
- **THEN** o sistema concede acesso à ficha de vistoria e contestação do laudo

### Requirement: Redirecionamento de Acesso Correto
O link seguro de contestação copiado e enviado pelo operador deve encaminhar o inquilino à rota correta sem o prefixo `/public`.

#### Scenario: Acesso ao link sem erro 404
- **WHEN** o operador copia o link de compartilhamento gerado para a vistoria
- **THEN** a URL gerada deve possuir o formato `/vistorias/acesso/[token]`
- **WHEN** o inquilino acessa esse link no navegador
- **THEN** o sistema carrega a página de validação de acesso sem retornar erro 404
