## ADDED Requirements

### Requirement: UUIDs de Ambientes Gerados no Front-end
O sistema SHALL gerar um UUID v4 válido no front-end para novos ambientes e salvar os comentários e mídias/fotos atrelados a este UUID.

#### Scenario: Criação de Ambiente com UUID v4
- **WHEN** o vistoriador adiciona um novo ambiente no formulário de ambientes
- **THEN** o front-end gera um UUID v4 e o define como o ID do ambiente

### Requirement: Preservação de UUID de Ambientes no Servidor
O sistema SHALL receber e persistir no banco de dados o ID enviado pelo front-end para o ambiente caso este seja um UUID válido.

#### Scenario: Salvamento de Ambientes da Vistoria com ID UUID v4 do Cliente
- **WHEN** o vistoriador salva a vistoria contendo ambientes novos que possuem UUIDs v4 como ID
- **THEN** o servidor persiste o ambiente no banco de dados com esse exato ID UUID v4
- **AND** qualquer comentário ou foto previamente cadastrado no ambiente com este UUID continuará associado com sucesso

### Requirement: Autocadastro Resiliente JIT de Usuário
O sistema SHALL cadastrar o usuário logado de forma dinâmica e automática (JIT) na tabela `users` do banco local durante o fluxo de salvar vistoria ou resolver contestação, caso ele ainda não esteja cadastrado.

#### Scenario: Salvamento de Vistoria por Usuário Não Sincronizado
- **WHEN** um usuário devidamente autenticado no Clerk que não existe na tabela `users` tenta salvar uma vistoria ou resolver uma contestação
- **THEN** o sistema SHALL criar o registro do usuário dinamicamente no banco local
- **AND** proceder com o salvamento ou a resolução sem falhar com erro de usuário não cadastrado
