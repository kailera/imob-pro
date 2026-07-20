## 1. Sincronização e Busca no Mapa (/busca)

- [x] 1.1 Atualizar `components/public/MapComponent.tsx` para monitorar eventos de alteração de limites (`moveend`, `zoomend`) e reportar as novas coordenadas visíveis.
- [x] 1.2 Adicionar caixa de seleção flutuante "Buscar nesta área do mapa" no topo da área do mapa.
- [x] 1.3 Atualizar a lógica de filtragem de imóveis em `components/public/MapSearchContainer.tsx` para restringir a lista apenas aos pins visíveis no mapa quando a caixa de seleção estiver ativa.

## 2. Mapa de Proximidades no Loteamento (/loteamentos)

- [x] 2.1 Criar o novo componente `components/loteamentos/LoteamentoProximidadeMap.tsx` com suporte a categorias de estabelecimentos e pins interativos.
- [x] 2.2 Implementar a fórmula de Haversine no cliente para calcular distâncias geodésicas.
- [x] 2.3 Adicionar componente `MapClickHandler` para detectar cliques livres em qualquer ponto do mapa e atualizar a medição.
- [x] 2.4 Desenhar uma linha tracejada (`Polyline`) unindo a origem do loteamento ao ponto de interesse ou local selecionado.
- [x] 2.5 Formatar a exibição das distâncias em formato reduzido (m / km).
- [x] 2.6 Integrar o componente `LoteamentoProximidadeMap` dinamicamente com `ssr: false` na página `app/(public)/loteamentos/page.tsx`.

## 3. Verificação e Validação

- [x] 3.1 Validar a busca de imóveis se movimentando pelo mapa no navegador local.
- [x] 3.2 Testar a interatividade no mapa do loteamento, selecionando diferentes categorias, clicando em estabelecimentos e clicando em pontos aleatórios.
