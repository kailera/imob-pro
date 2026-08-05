## ADDED Requirements

### Requirement: Marcar imóvel como destaque no CRM
O sistema deve permitir que um imóvel seja marcado como em destaque através de uma checkbox no formulário de cadastro e edição de imóveis.

#### Scenario: Marcar imóvel como destaque
- **WHEN** o usuário seleciona a opção "Destacar imóvel na página inicial" no formulário de cadastro/edição e salva o imóvel
- **THEN** o sistema salva o imóvel com o campo `highlight` como `true` no banco de dados

### Requirement: Filtrar imóveis por destaque na listagem do CRM
A listagem de imóveis do CRM deve permitir a filtragem por imóveis destacados.

#### Scenario: Filtrar imóveis por destaque no CRM
- **WHEN** o usuário seleciona a opção de filtro de Destaque como "Apenas Destaques" na listagem de imóveis
- **THEN** o sistema exibe apenas os imóveis que possuem `highlight` igual a `true`

### Requirement: Exibir apenas imóveis com flag highlight na página inicial
A página inicial do site público deve carregar apenas imóveis que possuem a flag `highlight` como `true`.

#### Scenario: Carregar imóveis destacados na home pública
- **WHEN** a página inicial pública é carregada
- **THEN** o sistema busca no banco de dados apenas imóveis publicados (`publicado: true`), que não sejam lotes (`codigo` não inicia com `LOTE-`), ordenados por código decrescente e com a condição `highlight: true` (máximo de 3)
