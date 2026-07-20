## Context

A tabela `Locador` no banco de dados armazena os proprietários dos imóveis. Durante o processo de ingestão de dados financeiros/contratuais via script `ingest-contratos.ts`, para cada contrato novo, um novo registro de `Locador` é inserido com o nome lido do CSV e o campo `cpfCnpj` vazio (`""`). Como resultado, temos proprietários duplicados na tabela, dificultando a edição centralizada em ambiente de produção e poluindo dropdowns de seleção no frontend.

## Goals / Non-Goals

**Goals:**
- Atualizar o script `ingest-contratos.ts` para verificar a existência do `Locador` pelo nome (normalizado) antes de criar um novo.
- Criar um script de migração/consolidação para unificar os locadores homônimos atuais no banco de dados, re-mapeando as relações de locações (`imovel_locacao`) para o registro sobrevivente e deletando os duplicados órfãos.
- Ajustar os componentes de exibição de proprietários no frontend para garantir formatação limpa e sem duplicados.

**Non-Goals:**
- Não faremos alterações no esquema do banco de dados (Prisma schema), apenas na lógica dos scripts e dados existentes.
- Não faremos interface gráfica avançada de mesclagem (será executado via script de manutenção ou ação direta).

## Decisions

### 1. Busca por Nome Normalizado na Ingestão
- **Escolha:** Na importação do CSV, buscar por `nome` usando trim e comparação case-insensitive.
- **Raciocínio:** O CSV não possui CPF ou outro campo identificador único para o Locador. O nome é o único identificador disponível na planilha.
- **Alternativa:** Exigir CPF no CSV (descartada pois a planilha atual não possui essa informação).

### 2. Script de Manutenção e Deduplicação no Banco (Seed/Script)
- **Escolha:** Implementar um script local executável via Node (`scripts/deduplicate-owners.ts`) que:
  1. Agrupa locadores pelo nome (normalizado).
  2. Identifica o registro "principal" (se houver algum com CPF preenchido, usa este; caso contrário, usa o primeiro criado).
  3. Atualiza todas as relações de `imovel_locacao` que apontam para os locadores duplicados, redirecionando-as para o locador principal.
  4. Remove os locadores duplicados agora sem relações associadas.
- **Raciocínio:** Executar essa rotina no banco de produção limpa os dados existentes de imediato.

## Risks / Trade-offs

- **[Risco] Falsos Positivos de Homônimos:** Dois proprietários físicos diferentes com o mesmo nome exato serem unificados incorretamente.
  - *Mitigação:* Como o banco de dados é de uma imobiliária local (escala controlada), a probabilidade é baixa. O script de consolidação só unirá registros se eles não possuírem CPFs conflitantes cadastrados.
