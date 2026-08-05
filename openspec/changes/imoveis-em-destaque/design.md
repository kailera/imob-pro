## Context

Atualmente, o site público exibe como destaque os 3 imóveis mais recentes publicados que não sejam lotes individuais de loteamento. Para dar mais flexibilidade à imobiliária, este design introduz uma flag no banco de dados (`highlight`) que permite marcar ativamente quais imóveis devem aparecer em destaque no site público, além de permitir filtrar e gerenciar esses imóveis no CRM.

## Goals / Non-Goals

**Goals:**
* Permitir marcar/desmarcar um imóvel como "Destaque" no CRM durante o cadastro e edição.
* Permitir filtrar a listagem de imóveis no CRM por destaque (Destaques, Não Destaques ou Todos).
* Alterar a consulta na página inicial do site público para renderizar apenas os imóveis que possuem a flag `highlight: true` ativa.
* Criar uma migração do Prisma para aplicar a nova coluna `highlight` no banco de dados de produção sem utilizar o `db push`.

**Non-Goals:**
* Alterar as demais regras de exibição do site (como exclusão de lotes de loteamentos `LOTE-` ou limite de exibição de até 3 imóveis destacados).
* Implementar áreas de destaque secundárias ou carrosséis múltiplos no site público.

## Decisions

### 1. Modelagem no Banco de Dados
Adicionar o campo `highlight` como um booleano com valor padrão `false` no modelo `Imovel` em `prisma/schema.prisma`.
```prisma
model Imovel {
  ...
  publicado Boolean  @default(false)
  highlight Boolean  @default(false)
  ...
}
```
*Rationale:* Mantém a simplicidade e consistência com campos similares como `publicado`. Um valor padrão `false` garante retrocompatibilidade com imóveis existentes.

### 2. Criação da Migração do Prisma
Utilizar o comando `npx prisma migrate dev --name add_imovel_highlight` para gerar e aplicar a migration em vez do `db push`.
*Rationale:* Garante controle sobre o histórico de migrações e consistência nos ambientes de desenvolvimento e produção.

### 3. Ajuste do Formulário (CRM)
Em `app/(admin)/imoveis/components/ImovelFormModal.tsx`, adicionar uma checkbox "Destacar imóvel no site" logo abaixo de "Publicar imóvel no site institucional". O valor deve ser enviado na Action `saveOrUpdateImovelAction` e salvo no banco de dados.

### 4. Filtro na Listagem de Imóveis (CRM)
Em `app/(admin)/imoveis/components/ImoveisClient.tsx`, adicionar um filtro chamado "Destaque" (com opções: "Todos", "Apenas Destaques", "Não Destaques") para que os administradores possam encontrar rapidamente imóveis destacados.

### 5. Alteração na Home Pública
Em `app/(public)/page.tsx`, alterar o filtro da query `prisma.imovel.findMany` para incluir `highlight: true` no bloco `where`.

## Risks / Trade-offs

* **Risco**: Se nenhum imóvel for marcado como destaque após a alteração, a seção de imóveis em destaque na página inicial ficará vazia.
  * *Mitigação*: Garantir que, na migração ou logo após a implantação, alguns imóveis publicados sejam marcados como destaque (ou a query possuir um fallback caso nenhum imóvel retorne com `highlight: true`). No entanto, a especificação pede explicitamente a filtragem estrita, então garantiremos que pelo menos alguns imóveis sejam marcados como destaque no CRM logo após o deploy.
