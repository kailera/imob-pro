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
