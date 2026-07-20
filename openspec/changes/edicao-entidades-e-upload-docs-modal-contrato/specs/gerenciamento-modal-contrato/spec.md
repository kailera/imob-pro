## ADDED Requirements

### Requirement: Edição in-place de Locatário (Inquilino)
O sistema SHALL permitir que o usuário edite os dados do Locatário selecionado diretamente no modal sem precisar fechá-lo.

#### Scenario: Abrir edição e atualizar com sucesso
- **WHEN** o usuário seleciona um inquilino e clica no botão de edição
- **THEN** o modal exibe o formulário com os dados pré-preenchidos e, ao salvar, os dados são atualizados no banco de dados e na listagem do modal

### Requirement: Edição in-place de Locador (Proprietário)
O sistema SHALL permitir que o usuário edite os dados do Locador (Proprietário) vinculado ao imóvel diretamente no modal de locação.

#### Scenario: Alterar dados do locador com sucesso
- **WHEN** o usuário clica em editar proprietário, altera as informações no formulário e submete
- **THEN** as informações do locador são atualizadas no banco de dados e refletidas no resumo do imóvel no modal

### Requirement: Edição inline de dados do Imóvel
O sistema SHALL permitir que o usuário edite os dados e valores do imóvel (Aluguel, Condomínio, IPTU) no modal.

#### Scenario: Atualizar valores financeiros do imóvel
- **WHEN** o usuário seleciona o imóvel, altera os campos de valor e submete
- **THEN** os valores são atualizados no banco e salvos no contrato gerado

### Requirement: Upload de documentos anexos no encerramento
O sistema SHALL permitir o upload de documentos para o inquilino e para o contrato, cada um contendo descrição e URL do arquivo.

#### Scenario: Anexar documentos do inquilino e do contrato
- **WHEN** o usuário faz o upload de um arquivo, informa a descrição e finaliza o contrato
- **THEN** os arquivos são armazenados no storage, e os metadados (descrição e URL) são associados respectivamente ao Locatário e ao Contrato no banco de dados
