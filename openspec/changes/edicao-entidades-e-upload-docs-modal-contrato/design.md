## Context

Atualmente, a geração de contratos no modal vincula Locatário, Locador e Imóvel pré-existentes. A alteração in-place dessas entidades agiliza a rotina operacional do administrador imobiliário. Além disso, a gestão de documentos digitais é vital para a validação do inquilino e armazenamento do contrato formalizado.

## Goals / Non-Goals

**Goals:**
- Permitir edição de Inquilino, Proprietário e Imóvel direto no modal de novo contrato.
- Adicionar suporte a upload de arquivos de comprovantes e documentos do inquilino e do contrato com descrição e URL.
- Estender o schema do banco de dados para suportar múltiplos anexos do contrato.

**Non-Goals:**
- Edição do fiador (que já possui fluxo inline específico ao criar novo locatário).
- Fluxo de assinatura digital automatizada (DocuSign/Clicksign) nesta etapa.

## Decisions

### 1. Extensão do Schema Prisma em `ContratoImovelLocacao`
- **Decisão**: Adicionar o campo `documentoUrl Json?` ao modelo `ContratoImovelLocacao`.
- **Alternativa**: Criar um novo modelo de `DocumentoContrato` com chaves estrangeiras.
- **Razão**: Usar o tipo JSON mantém a simplicidade e a consistência com as tabelas de `Locatario` e `Fiador` que já armazenam documentos via campo JSON.

### 2. Fluxo de Edição no Frontend e Reaproveitamento de Componentes
- **Decisão**: Criar views adicionais (`EDIT_TENANT`, `EDIT_LANDLORD`, `EDIT_PROPERTY`) no estado `modalView` gerenciado por `useNovoContratoForm.ts`.
- **Alternativa**: Abrir sub-modais flutuantes por cima do modal existente.
- **Razão**: Sub-modais empilhados reduzem a usabilidade no mobile/desktop e quebram a coesão visual. Mudar a `modalView` reaproveitando os componentes como `CadastroInquilinoForm` mantém o estado limpo e a interface organizada.

### 3. Server Actions para Edição/Atualização
- **Decisão**: Implementar `updateLocatario` e `updateLocador` em `contratos/actions.ts`.
- **Alternativa**: Usar as rotas de API REST existentes.
- **Razão**: O projeto utiliza Next.js Server Actions para todas as operações do dashboard, logo a criação de Server Actions mantém a consistência arquitetural.

## Risks / Trade-offs

- **[Risco]** Uploads pesados ou interrupção de upload no encerramento.
  - **Mitigação**: Validar o tamanho e formato do arquivo no cliente antes de iniciar a action `uploadMediaToRustFS` e exibir progresso ou feedback visual para o usuário.
