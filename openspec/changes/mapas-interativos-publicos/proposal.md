## Why

Esta alteração visa aprimorar a experiência do usuário no site público da Scatolin Imóveis. Ao integrar a busca de imóveis com o mapa dinâmico de forma bidirecional (filtragem de imóveis por retângulo visível do mapa) e adicionar um mapa de proximidades interativo na aba de loteamentos (com cálculo de distância curto), fornecemos ferramentas de conversão robustas e uma navegação intuitiva semelhante a portais modernos como o QuintoAndar.

## What Changes

- **Filtro Geográfico na Busca de Imóveis**: Integração de escuta a eventos de movimentação (`moveend`, `zoomend`) no mapa de busca pública para filtrar dinamicamente a listagem lateral de imóveis com base nas coordenadas visíveis (*bounding box*).
- **Controle Flutuante na Busca**: Adição de uma caixa de seleção flutuante "Buscar nesta área do mapa" que permite ativar ou desativar o comportamento de filtragem geográfica da busca.
- **Seção de Localização e Proximidades no Loteamento**: Nova seção na página de loteamento (`/loteamentos`) com mapa geográfico de proximidades e listagem de estabelecimentos agrupados por categorias (Academias, Supermercados, Bancos, Outros).
- **Interação de Distância e Traçado no Loteamento**:
  - Traçado de linha tracejada (`Polyline`) conectando a origem do loteamento ao local de interesse ou ao ponto clicado no mapa.
  - Cálculo instantâneo no cliente da distância linear (Fórmula de Haversine).
  - Badge em destaque com a distância formatada de forma enxuta (ex: "350 m" ou "1.2 km").

## Capabilities

### New Capabilities
- `busca-imoveis-mapa-sincronizado`: Sincronização avançada de busca de imóveis no mapa por limites geométricos visíveis e interações como QuintoAndar.
- `loteamento-proximidades-interativo`: Visualização de mapa geográfico de proximidades no loteamento com cálculo de distância dinâmica e interatividade por clique.

### Modified Capabilities
<!-- Nenhuma modificação em especificações existentes -->

## Impact

- **Frontend do Site Público**: Modificação de `components/public/MapSearchContainer.tsx` e `components/public/MapComponent.tsx` para introduzir o rastreamento de *bounds* e o seletor flutuante de busca.
- **Página de Loteamentos**: Modificação de `app/(public)/loteamentos/page.tsx` para incluir a seção de proximidades e criação de `components/loteamentos/LoteamentoProximidadeMap.tsx`.
- **Dependências**: Reuso das bibliotecas `leaflet` e `react-leaflet` já configuradas no projeto.
