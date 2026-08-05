## 1. Dados e Banco de Dados

- [x] 1.1 Atualizar o script de seed `seed-db.ts` para carregar todos os lotes reais do Loteamento Village Parra (Quadra A: 13-16, Quadra B: 01-08, Quadra C: 01-08, Quadra D: 01-33 interna, Quadra D_EXT: 01-26 externa, Quadra E: 01-27, Quadra F: 01-30).
- [x] 1.2 Executar o seed do banco de dados para popular a tabela `Imovel` com os novos lotes.

## 2. Server Actions

- [x] 2.1 Implementar a Server Action `updateLotStatusAction(lotId: string, status: StatusLote)` em `app/actions/imoveisActions.ts` para atualizar o status do lote e revalidar os caminhos públicos.

## 3. Componente de Mapa de Alta Fidelidade

- [x] 3.1 Refatorar `components/loteamentos/SubdivisionMap.tsx` para implementar o layout SVG geométrico complexo detalhado da foto, com nomes de ruas e quadras correspondentes.
- [x] 3.2 Atualizar as cores de exibição do status no SVG: vermelho para ocupado/vendido (`VENDIDO`), amarelo para reservado (`RESERVADO`) e azul/verde para disponível (`DISPONIVEL`).
- [x] 3.3 Adicionar suporte ao prop `mode?: "public" | "edit"` e callback `onLotStatusChange` no componente de mapa para gerenciar ações de visualização vs. edição.

## 4. CRM / Site Editor

- [x] 4.1 Adicionar a aba "Mapa do Loteamento" e botão correspondente no componente `SiteEditor.tsx` em `/crm/site`.
- [x] 4.2 Desenvolver a visualização da aba no editor do site, renderizando o mapa em `mode="edit"` e adicionando um menu flutuante / popover de status para alterar a disponibilidade de qualquer lote selecionado de forma persistente.

## 5. Verificação e Testes

- [x] 5.1 Validar a exibição e interatividade do mapa no site público em `/loteamentos`.
- [x] 5.2 Testar a alteração de status no painel de CRM e verificar o reflexo imediato das cores nos dois ambientes.
