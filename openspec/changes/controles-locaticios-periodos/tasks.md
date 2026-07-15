## 1. Banco de Dados e Migração

- [x] 1.1 Criar a tabela `PeriodoContratoLocacao` no arquivo `prisma/schema.prisma` e configurar a relação 1-para-Muitos com `ImovelLocacao`.
- [x] 1.2 Gerar e aplicar a migração Prisma (`npx prisma migrate dev`), criando também uma seed/migration script para gerar automaticamente o primeiro período para os contratos existentes utilizando seus valores vigentes atuais.

## 2. Server Actions e Lógica de Negócio

- [x] 2.1 Atualizar as Server Actions de locação (`app/(admin)/locacao/actions.ts`) para incluir a busca da nova tabela de períodos.
- [x] 2.2 Atualizar as ações de criar/editar locações para salvar múltiplos períodos e validar sobreposição de vigências.
- [x] 2.3 Ajustar a rotina financeira de faturamento mensal para buscar as configurações do período correspondente à data de vencimento da transação.

## 3. Visualização e Interface (Abas e Edição)

- [x] 3.1 Modificar o frontend de detalhes da locação (`app/(admin)/locacao/view-locacao/[id]/page.tsx`) para renderizar as abas por período e carregar as configurações do período ativo ao selecionar.
- [x] 3.2 Modificar os formulários de locação para permitir adicionar e editar os sub-períodos históricos e o atual de forma manual.
