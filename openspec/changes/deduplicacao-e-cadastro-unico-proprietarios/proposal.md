## Why

Ao importar contratos da base CSV, o sistema gera novos registros de proprietários (Locadores) para cada linha de contrato individual, sem verificar a existência prévia do proprietário. Isso cria múltiplos registros redundantes com CPFs em branco, poluindo os seletores na interface de administração e dificultando a edição centralizada dos dados cadastrais dos proprietários em ambiente de produção.

## What Changes

- **Cadastro Único de Proprietários:** Atualização da lógica de ingestão de contratos (`scripts/ingest-contratos.ts`) para reutilizar registros de locadores existentes com o mesmo nome, evitando a proliferação de novas linhas duplicadas.
- **Rotina de Consolidação e Limpeza:** Criação de um script/função utilitária de deduplicação automática no banco de dados para unificar os locadores homônimos criados nas importações anteriores, re-mapeando as relações de contratos/imóveis para um registro unificado.
- **Deduplicação de Exibição:** Garantia de que a lista de proprietários no seletor do formulário de imóveis seja deduzida de forma unificada e limpa, mostrando o nome do proprietário apenas uma vez e exibindo de forma correta e legível as informações.

## Capabilities

### New Capabilities
- `cadastro-unico-proprietarios`: Centralização e gerenciamento único de proprietários (Locadores) de imóveis, impedindo a criação de registros redundantes por meio de uploads em lote ou interfaces de cadastro.

### Modified Capabilities
- `controles-locaticios-proprietario`: Atualização das regras de vinculação de proprietários aos imóveis e contratos de locação para focar em registros únicos centralizados.

## Impact

- **Banco de Dados (Prisma):** Tabela `Locador` e relacionamentos em `imovel_locacao`.
- **Scripts:** `scripts/ingest-contratos.ts`.
- **Componentes React:** `app/(admin)/imoveis/components/ImovelFormModal.tsx` e dropdowns associados.
- **Server Actions:** `app/actions/imoveisActions.ts` (`getLocadores`, `createLocador`).
