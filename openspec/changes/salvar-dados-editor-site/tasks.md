## 1. Banco de Dados e Schemas

- [x] 1.1 Adicionar modelo `SiteConfig` no `prisma/schema.prisma` com campos para serviços, mídias e depoimentos
- [x] 1.2 Executar `npx prisma db push` e `npx prisma generate` para sincronizar o banco de dados e o cliente Prisma

## 2. Server Actions de Configuração do Site

- [x] 2.1 Criar `app/actions/siteActions.ts` com as Server Actions `getSiteConfig` e `updateSiteConfig`

## 3. CRM Site Editor (Persistência no Admin)

- [x] 3.1 Atualizar `SiteEditor.tsx` para carregar as configurações do banco no carregamento da página
- [x] 3.2 Conectar as chamadas de salvamento das abas de Serviços, Mídias e Depoimentos com a Server Action de persistência

## 4. Landing Page Pública (Consumo e Exibição)

- [x] 4.1 Atualizar `app/(public)/page.tsx` para buscar os dados de `SiteConfig` no servidor
- [x] 4.2 Passar os serviços carregados para o componente `<ServicesOfferted />`
- [x] 4.3 Renderizar os depoimentos dinâmicos a partir dos dados do banco no componente de depoimentos
- [x] 4.4 Renderizar banners e mídias personalizadas na página pública quando houver mídias cadastradas

## 5. Validação e Testes

- [x] 5.1 Testar adição, edição e exclusão de itens no CRM e confirmar persistência no PostgreSQL
- [x] 5.2 Testar visualização na página pública e verificar se as atualizações do editor aparecem corretamente
