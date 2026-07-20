## Why

Melhorar o cadastro de inquilinos (locatários) para permitir o armazenamento completo de dados do inquilino principal, dados de cônjuge e documentos digitalizados direto no S3 da Rust FS para elaboração do contrato. Adicionalmente, fornecer formatação e máscaras para campos críticos como CPF/CNPJ, Telefone, CEP e Valores Monetários (Dinheiro) na interface do usuário para evitar erros de digitação.

## What Changes

- **Novos campos no modelo Locatario (Prisma)**: Adição de dados complementares de pessoa física (renda mensal, RNE), informações completas do Cônjuge e suporte a múltiplos telefones e documentos organizados por categoria.
- **Armazenamento de Documentos**: Armazenamento flexível das URLs dos documentos do inquilino (ex: RG/CPF, Comprovante de Residência, Holerite, Holerite do cônjuge) integrando com o S3.
- **Máscaras na Interface**: Implementação de máscaras dinâmicas de input no formulário de criação de inquilinos para CPF/CNPJ, Telefone, CEP e Dinheiro.

## Capabilities

### New Capabilities
- `cadastro-locatario-completo`: Gestão de dados completos de locatário (incluindo cônjuge) e uploads de documentos anexados diretamente no cadastro/contrato.

### Modified Capabilities
<!-- Nenhuma modificação em requisitos de especificações existentes -->

## Impact

- Modificações no schema Prisma (`Locatario`).
- Modificação na modal de cadastro de inquilino `NovoContratoModal.tsx`.
- Modificação nas Server Actions de contratos (`actions.ts`).
- Adição ou uso de utilitários de formatação e máscaras de inputs.
