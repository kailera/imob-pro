## 1. Modificações de Banco de Dados

- [x] 1.1 Adicionar a propriedade `indiceReajuste String?` no modelo `PeriodoContratoLocacao` em `prisma/schema.prisma`.
- [x] 1.2 Executar a migração do Prisma (`npx prisma migrate dev --name add_period_reajuste_index`) para atualizar o esquema do banco de dados local.

## 2. Ações de Backend (Actions)

- [x] 2.1 Criar a Server Action `getLocadores` em `app/actions/imoveisActions.ts` (ou arquivo equivalente) para recuperar todos os proprietários cadastrados ordenados alfabeticamente.
- [x] 2.2 Criar a Server Action `createLocador` para salvar um novo proprietário (Locador) a partir do formulário de imóveis.
- [x] 2.3 Atualizar as Server Actions `addPeriodoContratoLocacao` e `updatePeriodoContratoLocacao` em `app/(admin)/locacao/actions.ts` para receber e persistir a propriedade `indiceReajuste` no banco.

## 3. Utilitários de Máscaras e Formatação

- [x] 3.1 Implementar ou revisar utilitários de formatação em tempo real para moeda (BRL - ex: `1.050,00`), CEP (`00000-000`) e limpeza de strings monetárias para envio ao servidor.

## 4. Atualização da Interface do Imóvel (Cadastro/Edição)

- [x] 4.1 Atualizar o `ImovelFormModal.tsx` para passar a buscar proprietários cadastrados através de `getLocadores` ao carregar.
- [x] 4.2 Adicionar o seletor dropdown (select) de Índice de Reajuste no `ImovelFormModal.tsx` (opções: IGP, IGPM, INPC, IPC, IPC-DI, IPCA, etc.).
- [x] 4.3 Adicionar os seletores dropdowns (select) para "Período Garantido" (Carência da Garantia) e "Abrangência da Garantia" em `ImovelFormModal.tsx` e salvar os valores no payload JSON `aluguelDados`.
- [x] 4.4 Alterar os inputs numéricos de moeda e CEP de `type="number"` para `type="text"`, removendo os spinners nativos dos navegadores e acoplando as máscaras de formatação em tempo real.
- [x] 4.5 Adicionar a seção de vinculação de proprietário no `ImovelFormModal.tsx`: um input de busca com autocompletar e um botão de cadastro de proprietário rápido (abrindo um modal filho ou sub-form). Salvar o vínculo em `aluguelDados.proprietarioId` e `aluguelDados.proprietario`.

## 5. Atualização da Interface do Contrato (Visualização/Edição)

- [x] 5.1 Atualizar o modal de Período Contratual em `ControleLocaticioClient.tsx` para incluir o select dropdown de Índice de Reajuste e enviar o valor correspondente no payload.
- [x] 5.2 Exibir o índice de reajuste ativo de cada período na aba de detalhes de Controle Locatício.
- [x] 5.3 Ajustar o hook `useNovoContratoForm.ts` (`handleSelectSearchedProperty`) para verificar se existe um proprietário previamente vinculado ao imóvel no JSON `aluguelDados` (caso não haja histórico anterior de locação), realizando o auto-preenchimento das informações do locador.
