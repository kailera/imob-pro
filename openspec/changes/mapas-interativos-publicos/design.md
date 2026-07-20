## Context

O projeto já utiliza `leaflet` e `react-leaflet` no componente [MapComponent.tsx](file:///c:/Users/rebec/Documents/scatolin/imob-pro/components/public/MapComponent.tsx) para renderizar a localização dos imóveis na página de busca pública (`/busca`). No entanto, atualmente não existe sincronização entre a listagem de imóveis e as coordenadas visíveis do mapa. Na página de loteamento (`/loteamentos`), existe apenas um mapa interativo do loteamento feito em SVG estático que serve para simular parcelas dos lotes à venda, mas não há um mapa geográfico que mostre o que há por perto (proximidades) e calcule a distância dos serviços urbanos (supermercados, academias, bancos).

## Goals / Non-Goals

**Goals:**
- Implementar sincronização baseada em limites visíveis (*bounding box*) na busca de imóveis (`/busca`), permitindo filtrar a listagem lateral conforme o usuário navega e arrasta o mapa.
- Adicionar uma caixa de seleção flutuante "Buscar nesta área do mapa" sobreposta ao mapa de busca.
- Criar a nova seção "Localização e Proximidades" na página de loteamentos com um mapa Leaflet geográfico.
- Renderizar pontos de interesse próximos ao Loteamento Village Parra com base em uma lista curada de estabelecimentos.
- Permitir ao usuário clicar em categorias de estabelecimentos para isolar pins no mapa do loteamento.
- Permitir cliques livres no mapa do loteamento para calcular a distância geodésica em linha reta usando a fórmula de Haversine e traçar uma linha tracejada (`Polyline`) entre o loteamento e o ponto clicado.
- Formatar e destacar a distância no formato curto (ex: "350 m" se < 1 km, senão "1.2 km").

**Non-Goals:**
- Não utilizaremos serviços pagos como Google Maps ou Mapbox para evitar custos de API.
- Não faremos buscas dinâmicas em APIs de mapas de terceiros (como Google Places) em tempo de execução para evitar instabilidades e latência; os pontos de proximidade serão definidos de forma estática no frontend (uma vez que os pontos comerciais próximos em Ilha Solteira/SP são conhecidos e estáveis).

## Decisions

### Decisão 1: Armazenamento e Curação de POIs no Frontend
- **Opção A (Escolha):** Manter uma lista estática e curada de estabelecimentos comerciais próximos (academias, supermercados, bancos) diretamente no componente ou em um arquivo de configuração JSON local.
- **Opção B (Alternativa):** Fazer requisições ao Google Places API ou Overpass API (OpenStreetMap) em tempo real.
- **Razão:** A Opção A garante 100% de disponibilidade, tempo de resposta instantâneo (zero milissegundos de latência), custo financeiro zero de infraestrutura e controle total do corretor sobre os pontos comerciais de destaque que deseja mostrar para valorizar o loteamento. Em uma cidade de pequeno porte (Ilha Solteira, SP), a lista de pontos relevantes não sofre alterações diárias e é facilmente mantida no código.

### Decisão 2: Filtragem de Bounding Box no Cliente
- **Opção A (Escolha):** Carregar a lista de imóveis publicados e realizar a filtragem geográfica (dentro dos limites do mapa) inteiramente no frontend.
- **Opção B (Alternativa):** Reconsultar o banco de dados a cada movimento do mapa (`moveend`) passando as coordenadas dos cantos norte-sul/leste-oeste.
- **Razão:** A Opção A é ideal para o tamanho do catálogo de imóveis atual. Como todos os imóveis são carregados na inicialização da página no servidor via Prisma, a filtragem no cliente evita sobrecarga de consultas no banco de dados a cada arrasto do mapa, mantendo a navegação ultra-fluida e responsiva (estilo SPA/Next.js client).

### Decisão 3: Cálculo Geodésico via Fórmula de Haversine no Cliente
- **Opção A (Escolha):** Implementar a fórmula de Haversine diretamente em JavaScript no cliente.
- **Opção B (Alternativa):** Chamar rotas do backend com pacotes de cálculo geográfico ou PostGIS.
- **Razão:** A fórmula de Haversine em JS é simples, pura, executa em frações de milissegundo no navegador e não consome recursos de rede ou do servidor, tornando a experiência de interatividade de clique no mapa instantânea.

## Risks / Trade-offs

- **[Risco] Erros de Hidratação do React (SSR) com Leaflet:** O Leaflet depende do objeto global `window` para inicializar. Se executado no lado do servidor (Next.js SSR), o build falha.
  - **Mitigação:** Os componentes de mapa (`MapComponent.tsx` e o novo `LoteamentoProximidadeMap.tsx`) serão importados dinamicamente no Next.js usando `dynamic(() => import(...), { ssr: false })` e exibindo um esqueleto de carregamento enquanto o browser monta a página.
- **[Risco] Usabilidade Mobile:** Telas de celular possuem pouco espaço para renderizar um mapa geográfico grande e uma listagem lateral.
  - **Mitigação:** No mobile, manteremos o comportamento atual de botão de alternância flutuante entre "Ver Mapa" e "Ver Lista" na busca de imóveis, e o mapa de proximidades no loteamento terá rolagem vertical fluida com controle de toque habilitado.
