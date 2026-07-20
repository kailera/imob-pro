## ADDED Requirements

### Requirement: Filtragem Geográfica por Limites do Mapa
O sistema SHALL permitir que a listagem de imóveis na página de busca pública (`/busca`) seja filtrada dinamicamente com base nas coordenadas geográficas visíveis (limites do mapa) sempre que o usuário mover ou ajustar o zoom do mapa.

#### Scenario: Filtragem automática ao mover o mapa
- **WHEN** o usuário arrasta o mapa ou altera o nível de zoom
- **THEN** o sistema atualiza a lista de imóveis exibida para conter apenas os imóveis cujas coordenadas (latitude e longitude) estejam dentro da área visível do mapa.

### Requirement: Ativação/Desativação do Filtro Geográfico
O sistema SHALL disponibilizar um controle visual flutuante (caixa de seleção ou botão toggle) sobre o mapa permitindo ativar ou desativar a busca por limites do mapa.

#### Scenario: Desativação do filtro geográfico
- **WHEN** o usuário desmarca a opção "Buscar nesta área do mapa"
- **THEN** o sistema desativa a filtragem geográfica e exibe a lista completa de imóveis com base nos demais filtros textuais e numéricos de busca ativos.

### Requirement: Sincronização Bidirecional de Foco
O sistema SHALL sincronizar visualmente o foco de destaque entre a lista de imóveis e os marcadores (pins) do mapa.

#### Scenario: Foco no card destaca pin correspondente
- **WHEN** o cursor do mouse passa sobre o card de um imóvel na lista
- **THEN** o marcador correspondente a esse imóvel no mapa é destacado visualmente (com escala aumentada e cor diferente).

#### Scenario: Clique no pin rola até o card
- **WHEN** o usuário clica em um marcador de imóvel no mapa
- **THEN** a lista lateral rola suavemente até posicionar o card correspondente em evidência.
