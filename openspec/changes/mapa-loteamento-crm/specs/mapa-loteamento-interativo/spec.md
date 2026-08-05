## ADDED Requirements

### Requirement: Mapa do Loteamento Village Parra de Alta Fidelidade
O sistema SHALL exibir um mapa interativo de alta fidelidade para o Loteamento Village Parra no site público, representando com precisão o traçado real das ruas (Rua Projetada 01 a 05, Avenida Projetada 01, etc.) e a distribuição de lotes pelas quadras A, B, C, D, E e F, substituindo o layout genérico anterior.

#### Scenario: Exibição Correta do Novo Traçado
- **WHEN** o usuário acessa a página pública do loteamento em `/loteamentos`
- **THEN** o sistema SHALL renderizar o mapa SVG com a disposição geográfica e quadras correspondentes à foto do empreendimento real.

#### Scenario: Visualização de Disponibilidade por Cores
- **WHEN** o mapa é renderizado
- **THEN** o sistema SHALL colorir os lotes com base em seu status: vermelho para "VENDIDO" (ocupado), amarelo para "RESERVADO" e azul/verde para "DISPONIVEL".

### Requirement: Controle de Disponibilidade de Lotes no CRM
O sistema SHALL disponibilizar uma aba de gerenciamento do mapa de loteamentos no CRM / Editor do Site (/crm/site) que exibe o mesmo mapa interativo e permite ao operador atualizar a disponibilidade e o status de cada lote diretamente.

#### Scenario: Acesso à Aba do Loteamento no CRM
- **WHEN** o operador administrador acessa o painel do Editor do Site em `/crm/site` e clica na aba "Mapa do Loteamento"
- **THEN** o sistema SHALL renderizar o mesmo mapa interativo de alta fidelidade e carregar a lista de lotes cadastrados no banco.

#### Scenario: Atualização de Status por Clique Direto
- **WHEN** o operador clica em um lote no mapa do CRM
- **THEN** o sistema SHALL exibir uma interface de seleção rápida permitindo alterar o status para "Disponível", "Reservado" ou "Indisponível/Vendido".

#### Scenario: Persistência no Banco de Dados
- **WHEN** o operador seleciona um novo status para o lote no seletor
- **THEN** o sistema SHALL executar a atualização na base de dados Prisma imediatamente e refletir a nova cor do lote no mapa do CRM e no site público sem recarregar a página.
