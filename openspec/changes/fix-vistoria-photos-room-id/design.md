## Context

Ao adicionar novos ambientes durante a elaboração de uma vistoria técnica no front-end, o componente `RoomBuilderForm` cria o cômodo com um ID aleatório simples (`Math.random().toString(36)...`).
No banco de dados, a model `AmbienteVistoria` tem chave primária UUID e a Server Action `updateVistoria` força a re-geração de UUIDs no banco caso o ID fornecido não passe na expressão regular de validação UUID.
Como o ID temporário gerado no front-end é descartado e o banco cria um ID UUID novo, os comentários (que salvam as fotos da vistoria) criados antes da persistência ficam órfãos, associados ao ID temporário antigo que não existe no banco de dados.

## Goals / Non-Goals

**Goals:**
- Uniformizar a geração de IDs de ambientes no front-end para usar o formato UUID v4.
- Preservar o ID fornecido pelo front-end no banco de dados durante a transação do `updateVistoria`.
- Impedir que fotos e comentários percam o vínculo com seu ambiente correspondente.

**Non-Goals:**
- Alterar schemas da modelagem do Prisma ou banco de dados.
- Modificar o fluxo de uploads diretos de mídias via S3 presigned URLs.

## Decisions

### 1. Geração de UUID no Front-end (RoomBuilderForm.tsx)
- **Decisão**: Substituir `Math.random().toString(36).substr(2, 9)` por uma função geradora de UUID v4 em JavaScript.
- **Alternativa Considerada**: Importar pacotes como `uuid`. Porém, adicionar dependências a um projeto Next.js para uma única linha de geração de UUID é desnecessário.
- **Justificativa**: A API `crypto.randomUUID()` é padrão em navegadores modernos em contextos seguros (HTTPS e localhost). O fallback com `crypto.getRandomValues()` assegura compatibilidade retroativa resiliente sem necessidade de pacotes externos.

### 2. Validação no Back-end (actions.ts)
- **Decisão**: A validação `isUuid` na action `updateVistoria` continuará idêntica:
  ```typescript
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.id);
  ```
- **Justificativa**: Como o ID enviado pelo front-end passará a ser um UUID v4 legítimo, `isUuid` será verdadeiro, fazendo com que o Prisma utilize o mesmo ID durante a operação de criação (`create: { id: r.id }`).

## Risks / Trade-offs

- **[Risco]** Indponibilidade de APIs de criptografia no navegador (ex: contextos HTTP inseguros).
  - **Mitigação**: O gerador de fallback usa `crypto.getRandomValues` e, em último caso (embora quase impossível hoje em dia), substituições determinísticas de caracteres com randomização matemática padrão.
