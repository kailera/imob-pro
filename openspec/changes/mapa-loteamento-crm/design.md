## Context

Atualmente, o componente [SubdivisionMap.tsx](file:///c:/Users/rebec/Documents/scatolin/imob-pro/components/loteamentos/SubdivisionMap.tsx) renderiza um grid SVG estático simulando 4 quadras paralelas e 22 lotes totais. A base de dados (`Imovel` do tipo `LOTE` com `loteamentoId = 'loteamento-village-parra'`) também possui apenas os 22 lotes correspondentes.

O proprietário do site deseja exibir o mapa real do loteamento Village Parra (que possui cerca de 100+ lotes e layout com ruas e lotes angulados). Além disso, o operador do CRM precisa marcar quais lotes estão disponíveis ou ocupados/indisponíveis, o que deve atualizar instantaneamente a visualização no site público.

## Goals / Non-Goals

**Goals:**
- Implementar um layout SVG geométrico de alta fidelidade que represente com precisão as quadras (A, B, C, D, E, F) e lotes do loteamento real.
- Suportar renderização baseada em status (Vermelho = Ocupado/Vendido, Amarelo = Reservado, Azul/Verde = Disponível).
- Adicionar uma aba "Mapa do Loteamento" no Editor de Site (`SiteEditor.tsx`) no CRM.
- Implementar controle interativo no CRM onde o operador clica no lote e altera seu status via Server Actions.
- Expandir o seed do banco de dados para incluir todos os lotes do novo mapa.

**Non-Goals:**
- Não faremos renderização geográfica complexa com Leaflet para a planta do loteamento (usaremos SVG puro por ser leve, performático e responsivo).
- O controle administrativo de cadastrar *novos* loteamentos ou mudar o desenho das quadras via interface não está no escopo (o layout do SVG é fixado com base no mapa do Village Parra).

## Decisions

### Decisão 1: Abstração e Reuso do Mapa SVG (`SubdivisionMap`)
- **Opção A (Escolha):** Refatorar o componente `SubdivisionMap.tsx` para aceitar um prop `mode?: "public" | "edit"` e um callback `onLotStatusChange?: (lotId: string, status: StatusLote) => void`.
- **Opção B (Alternativa):** Criar um componente duplicado específico para o CRM (ex: `CrmSubdivisionMap.tsx`).
- **Razão:** A Opção A evita duplicação de código de layout SVG. Ao atualizar o design do mapa SVG no futuro, ambas as visualizações (pública e CRM) serão atualizadas automaticamente. O prop `mode` controlará se o clique abre o simulador financeiro (público) ou abre a popover de troca de status (CRM).

### Decisão 2: Layout Geométrico SVG Programático
- **Opção A (Escolha):** Organizar o SVG usando grupos `<g>` para cada quadra e calcular a posição dos lotes de forma linear/matemática (ex: loops com espaçamento fixo, rotações e translações para a parte diagonal de D e B).
- **Opção B (Alternativa):** Utilizar caminhos poligonais absolutos (`<polygon points="..." />`) desenhados manualmente para cada um dos 100+ lotes.
- **Razão:** A Opção A é infinitamente mais mantível e reduz o tamanho do arquivo do componente de dezenas de milhares de linhas de coordenadas absolutas para algumas dezenas de linhas de loops matemáticos. Usar transformações SVG (como `rotate(35) translate(...)`) facilita o alinhamento de quadras diagonais inteiras sem mapeamento manual de vértices.

### Decisão 3: Nomeação e Unicidade dos Lotes Diagonais da Quadra D
- **Opção A (Escolha):** A Quadra D possui duas fileiras paralelas de lotes, ambas iniciando no lote 01 (uma fileira externa de 01 a 26 e uma interna de 01 a 33). Na base de dados, salvaremos os da fileira interna como `quadra = 'D'` e os da fileira externa como `quadra = 'D_EXT'`. No mapa, renderizaremos o número do lote limpo (ex: "01", "02") e rotularemos a quadra visualmente como "D", mas a chave do banco e o código do imóvel serão únicos (ex: `LOTE-D_EXT-01`).
- **Opção B (Alternativa):** Salvar todos na mesma quadra "D" e gerar IDs numéricos simples, o que complicaria a distinção de qual lote com número "01" está sendo clicado.
- **Razão:** A Opção A mantém a conformidade com as restrições de chave única do banco de dados (Prisma) e a lógica de negócios sem confundir o operador ou o comprador, que verão apenas o lote correspondente no layout visual.

### Decisão 4: Persistência e Feedback Imediato
- **Opção A (Escolha):** Toggles de status no CRM salvam instantaneamente via Server Action `updateLotStatus` ao selecionar o novo status, atualizando o estado local no React e disparando `revalidatePath` para limpar o cache público do Next.js.
- **Razão:** Garante que o operador tenha feedback visual instantâneo e que qualquer cliente visualizando o site público no mesmo momento veja o lote marcado como ocupado (vermelho) imediatamente.

## Risks / Trade-offs

- **[Risco] Grande quantidade de dados de lotes na base**: Cadastrar ~100 lotes pode poluir a visualização na listagem geral de imóveis do CRM.
  - **Mitigação**: Os lotes já possuem `loteamentoId` associado. Podemos filtrar a listagem principal de imóveis no CRM para agrupar ou ocultar lotes individuais, focando apenas em casas/apartamentos comerciais se necessário, ou filtrar por tipo `LOTE`.
- **[Risco] Responsividade do SVG complexo**: SVG com mais elementos pode quebrar em telas de celulares muito pequenas.
  - **Mitigação**: Envolver o SVG em uma div com `overflow-x-auto` e tamanho mínimo de renderização (`min-w-[800px]`), permitindo scroll horizontal suave no mobile, exatamente como já é feito no mapa simplificado atual.
