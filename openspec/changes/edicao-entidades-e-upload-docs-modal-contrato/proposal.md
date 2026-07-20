## Why

Atualmente, ao gerar um contrato de locação pelo modal principal, o usuário só consegue selecionar inquilinos, proprietários e imóveis previamente cadastrados. Se algum dado estiver incorreto ou desatualizado, ele é obrigado a fechar o modal, navegar para outra parte do sistema para editar, e reiniciar o processo de geração. Além disso, não há suporte direto para anexar e fazer upload de documentos do inquilino (descrição e URL) e do próprio contrato (descrição e URL) durante a etapa de fechamento.

## What Changes

- **Edição direta de Locatário (Inquilino)** no modal, reaproveitando o formulário de cadastro atual e adicionando suporte a edição no banco de dados.
- **Edição direta de Locador (Proprietário)** através de um formulário inline ou modal simplificado diretamente na seção de Imóvel/Locador.
- **Edição direta de Imóvel** (valores de aluguel, condomínio, IPTU e dados de endereço) através de interface inline integrada.
- **Seção de Upload de Anexos**:
  - Anexos do Locatário (armazenando descrição e URL no campo JSON `documentoUrl` do `Locatario`).
  - Anexos do Contrato (armazenando descrição e URL no campo JSON `documentoUrl` que será adicionado à tabela `ContratoImovelLocacao`).
- **Banco de Dados (BREAKING)**: Adição do campo `documentoUrl` (tipo `Json?`) na tabela `ContratoImovelLocacao` do Prisma.

## Capabilities

### New Capabilities
- `gerenciamento-modal-contrato`: Permite a edição in-place das partes (Inquilino, Proprietário e Imóvel) e o upload direto de documentos anexos de suporte ao inquilino e ao contrato de locação.

### Modified Capabilities
-

## Impact

- Modificações em `schema.prisma`.
- Nova Server Action `updateLocatario` e `updateLocador`.
- Mudanças nas views e hooks de gerenciamento do novo contrato: `NovoContratoModal.tsx`, `useNovoContratoForm.ts`, `ImovelSearchSection.tsx` e `CadastroInquilinoForm.tsx`.
