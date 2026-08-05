## Why

Atualmente, o site público exibe como "Imóveis em Destaque" as 3 últimas propriedades publicadas por ordem decrescente de código que não sejam lotes. Não há forma de a imobiliária selecionar ativamente quais imóveis devem aparecer em destaque na página inicial, além de não ser possível filtrar imóveis por esse critério de destaque no painel de administração (CRM).

## What Changes

- Adição do campo `highlight` (Boolean) no modelo `Imovel` do banco de dados (Prisma).
- Adição de um controle (checkbox/botão) no formulário de cadastro/edição de imóveis do CRM para marcar o imóvel como destaque.
- Alteração da busca da página inicial do site público para filtrar apenas os imóveis que possuem `highlight: true` (e mantendo os filtros de `publicado: true` e exclusão de `LOTE-`).
- Adição de filtro de "Destaques" na listagem/busca de imóveis dentro do painel do CRM para facilitar a localização e gerenciamento dos destaques.
- Criação de uma migration do Prisma para adicionar o campo `highlight` na tabela correspondente.

## Capabilities

### New Capabilities
- `imoveis-destaque`: Habilidade de marcar imóveis como em destaque no CRM e exibi-los filtrados no site público e nos filtros de busca do CRM.

### Modified Capabilities

## Impact

- **Banco de Dados (Schema)**: Alteração no arquivo `prisma/schema.prisma` adicionando `highlight Boolean @default(false)` no modelo `Imovel`.
- **CRM Frontend**: Alteração em `app/(admin)/imoveis/components/ImovelFormModal.tsx` para incluir a checkbox de destaque e em `app/(admin)/imoveis/components/ImoveisClient.tsx` para incluir o filtro na listagem.
- **Site Público**: Alteração na consulta ao Prisma em `app/(public)/page.tsx` para filtrar por `highlight: true`.
- **Actions**: Alteração na action `app/actions/imoveisActions.ts` se necessário.
