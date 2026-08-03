## Why

Atualmente, o editor do site no CRM (`SiteEditor`) gerencia as seções de Serviços, Mídias/Banners e Depoimentos utilizando apenas estado local (`useState`), o que faz com que qualquer alteração seja perdida ao recarregar a página. Além disso, a página inicial pública (`PublicHome`) renderiza dados estáticos (mock / hardcoded), sem consumir as customizações efetuadas pelo usuário no editor.

Esta mudança introduz a persistência dos dados do editor do site no banco de dados PostgreSQL via Prisma e conecta a página pública para buscar e exibir os dados dinâmicos salvos.

## What Changes

- Criar o modelo `SiteConfig` no schema do Prisma (`prisma/schema.prisma`) com campos JSON para `services`, `mediaItems` e `reviews`.
- Criar Server Actions em `app/actions/siteActions.ts` para carregar (`getSiteConfig`) e salvar (`saveSiteConfig`) as configurações no banco de dados.
- Atualizar o componente `SiteEditor` (e os subcomponentes `EditorServices`, `EditorMediaItems`, `EditorReviews`) para carregar a configuração inicial do banco e persistir as edições ao clicar em "Salvar".
- Atualizar a página pública principal (`app/(public)/page.tsx`) e o componente `ServicesOfferted` para buscar e renderizar dinamicamente os serviços, depoimentos e mídias cadastrados no editor do site.

## Capabilities

### New Capabilities
- `site-editor-persistence`: Gerenciamento e persistência das configurações públicas do site (serviços oferecidos, mídias/banners e depoimentos de clientes) via banco de dados e exibição dinâmica na landing page pública.

### Modified Capabilities
*(Nenhuma capacidade existente com alteração de requisitos especificados)*

## Impact

- Banco de Dados: Adição de uma nova tabela `site_config` no PostgreSQL.
- CRM Admin: `app/(admin)/crm/site/SiteEditor.tsx` e seus subcomponentes.
- Server Actions: `app/actions/siteActions.ts`.
- Landing Page Pública: `app/(public)/page.tsx`, `components/public/ServicesOfferted.tsx` e seção de depoimentos.
