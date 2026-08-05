## 1. Banco de Dados

- [x] 1.1 Adicionar o campo `highlight` (Boolean, default `false`) no modelo `Imovel` em `prisma/schema.prisma`
- [x] 1.2 Gerar a migration do Prisma rodando `npx prisma migrate dev --name add_imovel_highlight`

## 2. Backend Actions

- [x] 2.1 Adicionar a propriedade `highlight?: boolean` na interface `ImovelInput` em `app/actions/imoveisActions.ts`
- [x] 2.2 Obter a propriedade `highlight` do `formData` em `saveOrUpdateImovelAction` (`formData.get("highlight") === "on"`) e incluí-la no `create` e `update` do Prisma em `app/actions/imoveisActions.ts`

## 3. CRM - Formulário de Imóvel

- [x] 3.1 Adicionar o estado de controle de destaque (`highlight`, `setHighlight`) em `app/(admin)/imoveis/components/ImovelFormModal.tsx`
- [x] 3.2 Carregar o valor de `highlight` do imóvel em edição (`editingImovel`) ou definir como `false` ao abrir o modal
- [x] 3.3 Renderizar o checkbox "Destacar imóvel no site" no formulário (próximo ao campo "Publicar imóvel no site institucional") com o atributo `name="highlight"` em `app/(admin)/imoveis/components/ImovelFormModal.tsx`

## 4. CRM - Filtros da Listagem

- [x] 4.1 Adicionar estado do filtro de destaque (`destaqueFilter`, `setDestaqueFilter`) em `app/(admin)/imoveis/components/ImoveisClient.tsx`
- [x] 4.2 Renderizar um select de filtro na listagem com opções "Todos", "Apenas Destaques" e "Não Destaques"
- [x] 4.3 Aplicar o filtro no array de imóveis renderizado na tabela do CRM

## 5. Site Público

- [x] 5.1 Atualizar a query Prisma de `rawImoveis` em `app/(public)/page.tsx` para filtrar por `highlight: true` no bloco `where`
