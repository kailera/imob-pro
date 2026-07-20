## ADDED Requirements

### Requirement: Exibição de Estabelecimentos Próximos
O sistema SHALL exibir um mapa geográfico interativo na página do loteamento (`/loteamentos`) renderizando a localização do loteamento e marcadores para estabelecimentos próximos classificados por categorias (Academias, Supermercados, Bancos, Outros).

#### Scenario: Visualização inicial do mapa de proximidade
- **WHEN** o usuário acessa a página do loteamento
- **THEN** o sistema exibe o mapa centrado no loteamento com marcadores para todas as categorias de estabelecimentos cadastrados na proximidade.

### Requirement: Filtragem de Proximidades por Categoria
O sistema SHALL fornecer filtros de seleção rápida por categoria (como Academias, Supermercados e Bancos) para atualizar os pins exibidos no mapa.

#### Scenario: Filtragem por categoria de academia
- **WHEN** o usuário clica na categoria "Academias"
- **THEN** o sistema oculta os marcadores das demais categorias e mantém visíveis apenas os marcadores da categoria selecionada.

### Requirement: Cálculo e Destaque Curto da Distância
O sistema SHALL calcular a distância em linha reta entre o ponto central do loteamento e um ponto de interesse e exibi-la de forma curta no painel informativo.

#### Scenario: Exibição de distância menor que um quilômetro
- **WHEN** o usuário seleciona um estabelecimento ou ponto cuja distância até o loteamento seja menor que 1000 metros
- **THEN** o sistema exibe a distância formatada em metros, sem casas decimais (ex: "350 m").

#### Scenario: Exibição de distância maior ou igual a um quilômetro
- **WHEN** o usuário seleciona um estabelecimento ou ponto cuja distância até o loteamento seja maior ou igual a 1000 metros
- **THEN** o sistema exibe a distância formatada em quilômetros com uma casa decimal (ex: "1.2 km").

### Requirement: Traçado Geométrico de Proximidade
O sistema SHALL desenhar um traçado (linha tracejada) no mapa unindo o ponto central do loteamento ao local selecionado.

#### Scenario: Seleção de estabelecimento desenha linha
- **WHEN** o usuário clica em um marcador de estabelecimento ou em qualquer ponto livre no mapa
- **THEN** o sistema desenha uma linha tracejada entre o loteamento e o ponto selecionado e atualiza a distância exibida.
