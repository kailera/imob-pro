## ADDED Requirements

### Requirement: Exibição e Edição do Perfil da Imobiliária
O sistema SHALL exibir os dados corporativos da imobiliária e permitir a sua atualização por usuários autorizados.

#### Scenario: Visualização do Perfil da Imobiliária
- **WHEN** o painel de configurações `/configuracoes` na aba "Perfil" for carregado
- **THEN** o sistema SHALL preencher os campos com os dados cadastrados no banco local (CNPJ, Razão Social, Telefone, CRECI, etc.)

#### Scenario: Atualização de Dados Cadastrais por Admin
- **WHEN** um usuário com a role `ADMIN` preenche o formulário de perfil e clica em "Salvar Perfil"
- **THEN** o sistema SHALL salvar as alterações na tabela `imob` correspondente e exibir mensagem de sucesso

#### Scenario: Upload do Logotipo
- **WHEN** o administrador faz upload de uma imagem de logotipo (.png, .jpg) no formulário de perfil
- **THEN** o sistema SHALL salvar a imagem no S3/RustFS, atualizar o campo `logoUrl` na tabela `imob` correspondente e atualizar a exibição do logotipo na tela
