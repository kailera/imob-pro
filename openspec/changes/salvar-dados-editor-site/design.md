## Context

Atualmente o `SiteEditor` (localizado em `app/(admin)/crm/site/SiteEditor.tsx`) e seus componentes filhos (`EditorServices`, `EditorMediaItems`, `EditorReviews`) armazenam seus estados em variáveis locais de componente React (`useState`), com dados padrão em código.

Na landing page pública (`app/(public)/page.tsx`), o componente `ServicesOfferted` é chamado sem dados e utiliza constantes padrão. Além disso, os depoimentos estão fixados diretamente em código TSX.

## Goals / Non-Goals

**Goals:**
- Criar a entidade `SiteConfig` no schema do Prisma para persistência no PostgreSQL.
- Desenvolver Server Actions (`getSiteConfig`, `updateSiteConfig`) para buscar e atualizar as configurações do site.
- Conectar o `SiteEditor` para carregar dados salvos e disparar a persistência ao salvar.
- Atualizar a página pública (`PublicHome`) para carregar a `SiteConfig` via servidor e passar os dados dinâmicos aos componentes visuais (`ServicesOfferted`, depoimentos, mídias).

**Non-Goals:**
- Modificar o layout visual e o estilo CSS dos cards do site.
- Criar sistema de permissões customizado além da autenticação de admin já existente no CRM.

## Decisions

### 1. Modelo `SiteConfig` com campos JSON no Prisma
- **Decisão:** Adicionar o modelo `SiteConfig` no `schema.prisma` contendo id, `services` (Json), `mediaItems` (Json), `reviews` (Json), `updatedAt` (DateTime).
- **Justificativa:** Usar colunas do tipo `Json` no PostgreSQL permite atualizar o conteúdo dos editores de forma atômica e flexível, sem a necessidade de criar 3 modelos e tabelas relacionais separadas com chaves estrangeiras complexas para itens puramente institucionais.
- **Alternativas consideradas:** Tabelas normalizadas separadas (`SiteService`, `SiteMedia`, `SiteReview`). Descartadas devido à complexidade desnecessária para dados de configuração do site.

### 2. Server Actions para Manipulação dos Dados
- **Decisão:** Criar um módulo de Server Actions em `app/actions/siteActions.ts` com funções `getSiteConfig()` e `updateSiteConfig(data)`.
- **Justificativa:** Integrado nativamente ao Next.js App Router, permitindo chamadas diretas tanto em Server Components (landing page) quanto em Client Components (editor no CRM).

### 3. Fallback Gracioso com Dados Padrão (DEFAULT_SERVICES / DEFAULT_REVIEWS)
- **Decisão:** Caso a tabela `SiteConfig` esteja vazia ou um campo JSON seja nulo, as funções de busca e os componentes devem retornar/exibir os dados padrão (`DEFAULT_SERVICES`, `DEFAULT_REVIEWS`).
- **Justificativa:** Garantir que o site público nunca fique em branco ou quebre na primeira inicialização antes do usuário ter salvo personalizações no editor.

## Risks / Trade-offs

- [Tabela vazia ou erro de rede] → Mitigação: Fallbacks para constantes padrão nos Server Actions e componentes UI.
- [Validação do formato JSON] → Mitigação: Tipagem TypeScript garantida via interfaces `ServiceItem`, `MediaItem`, `ReviewItem` compartilhadas.
