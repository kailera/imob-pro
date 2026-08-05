## Why

O mapa interativo atual do Loteamento Village Parra exibe uma estrutura simplificada e fictícia (com apenas 22 lotes divididos em 4 quadras paralelas) que não reflete a realidade do empreendimento. Precisamos de um mapa de alta fidelidade que siga o modelo real do loteamento (com as quadras A, B, C, D, E, F e suas respectivas distribuições e orientações reais). Além disso, não há controle administrativo para o operador alterar as disponibilidades dos lotes através do CRM (Editor do Site), obrigando o uso de intervenções manuais no banco de dados para alterar status de vendas.

## What Changes

- **Layout do Mapa de Alta Fidelidade**: Substituição da estrutura simplificada por um layout SVG geométrico que replique com precisão as quadras (A, B, C, D, E, F) e lotes (100+ unidades) conforme o mapa oficial.
- **Destaque Visual de Ocupação**: Lotes marcados como indisponíveis (vendidos) serão exibidos na cor vermelha (representando os que já estão ocupados), permitindo fácil identificação visual.
- **Painel de Controle no CRM/Editor de Site**: Criação de uma nova aba "Mapa do Loteamento" no Editor de Site (/crm/site) que renderiza o mesmo mapa de alta fidelidade para o operador.
- **Toggles Rápidos de Status**: Permite ao operador clicar diretamente em qualquer lote no CRM para alterar seu status ("Disponível", "Reservado", "Indisponível/Vendido"), atualizando a informação na base de dados (Prisma) em tempo real de forma segura.
- **Atualização da Ingestão de Dados**: Atualização e expansão do seed script da base de dados para conter toda a listagem de lotes correspondentes às quadras do novo layout do mapa.

## Capabilities

### New Capabilities
- `mapa-loteamento-interativo`: Exibição de mapa de loteamento com layout fiel ao oficial e controle interativo de status/disponibilidade dos lotes integrado ao CRM/Site Editor.

### Modified Capabilities
<!-- Sem alterações em outras especificações existentes -->

## Impact

- **Frontend Público**: `app/(public)/loteamentos/page.tsx`, `LoteamentoClient.tsx` e `SubdivisionMap.tsx` serão atualizados para dar suporte ao novo layout SVG com as cores correspondentes (vermelho para ocupado).
- **CRM / Admin**: `app/(admin)/crm/site/SiteEditor.tsx` receberá a nova aba para visualização e gerenciamento.
- **Server Actions**: Criação de actions dedicadas para carregar todos os lotes do loteamento e atualizar o `statusLote` de um lote.
- **Dados / Seed**: `seed-db.ts` será atualizado para persistir os lotes e quadras reais na base de dados.
