## ADDED Requirements

### Requirement: Busca e Preenchimento Automático de CEP
O sistema SHALL buscar os dados de endereço (Rua/Logradouro, Bairro, Cidade e UF) utilizando a API do ViaCEP quando o usuário preencher um CEP válido de 8 dígitos no formulário do imóvel, preenchendo automaticamente os campos correspondentes e focando o cursor no campo Número ao finalizar.

#### Scenario: Preenchimento automático com CEP válido
- **WHEN** o usuário digita ou cola um CEP válido com 8 dígitos no campo CEP
- **THEN** o sistema SHALL iniciar a busca, exibir um indicador de carregamento (spinner), preencher os campos de Cidade, UF, Bairro e Rua com os dados retornados pela API, remover o indicador de carregamento e transferir o foco do cursor para o campo de Número do endereço.

#### Scenario: Tratamento de erro com CEP inválido ou falha de API
- **WHEN** o usuário insere um CEP de 8 dígitos que não existe na base de dados do ViaCEP ou a API falha por problemas de rede
- **THEN** o sistema SHALL remover o indicador de carregamento silenciosamente, permitindo que o usuário digite os dados manualmente sem perder nenhuma informação digitada previamente.
