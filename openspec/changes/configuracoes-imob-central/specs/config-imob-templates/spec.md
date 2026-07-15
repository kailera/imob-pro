## ADDED Requirements

### Requirement: Central de Gerenciamento de Modelos de Contrato
O sistema SHALL fornecer uma interface para upload, listagem e exclusão de modelos de contratos no formato Word (`.docx`), identificando automaticamente as variáveis contidas no documento.

#### Scenario: Listagem de Modelos Existentes
- **WHEN** a aba "Modelos" for selecionada em `/configuracoes`
- **THEN** o sistema SHALL carregar e listar os modelos de contratos salvos na tabela `ContractTemplate`, exibindo seu nome, tipo (locação, venda, etc.), e as variáveis dinâmicas mapeadas

#### Scenario: Upload de Novo Template `.docx`
- **WHEN** o administrador faz upload de um arquivo `.docx` válido e preenche seu tipo e nome
- **THEN** o sistema SHALL analisar as tags do arquivo, salvar o arquivo no RustFS/S3 local, inserir o registro na tabela `ContractTemplate` com a lista de variáveis dinâmicas extraídas e recarregar a lista

#### Scenario: Exclusão de Modelo de Contrato
- **WHEN** o administrador clica no botão "Excluir" de um modelo de contrato listado
- **THEN** o sistema SHALL remover o registro da tabela `ContractTemplate`, deletar o arquivo correspondente no RustFS/S3 e atualizar a lista
