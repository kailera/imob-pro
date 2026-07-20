## Why

Ao enviar a vistoria para contestação do inquilino, ocorre um erro 404 devido ao caminho incorreto gerado com o prefixo `/public/`. Além disso, a vistoria atualmente tenta validar o acesso do inquilino (CPF/CNPJ) através dos contratos ativos do imóvel. Como o imóvel pode não estar alugado no momento da criação/envio da vistoria, precisamos permitir a seleção prévia de um inquilino já cadastrado antes de enviar o link de contestação, salvando esse vínculo e corrigindo a validação de acesso.

## What Changes

- **Correção da URL de Acesso do Inquilino**: Remover o prefixo `/public` na geração do link de compartilhamento para refletir as rotas do Next.js.
- **Associação Direta de Inquilino à Vistoria**: Permitir escolher um locatário cadastrado no banco de dados para associar diretamente à vistoria.
- **Fluxo de Escolha na UI**: Adicionar um seletor de inquilino no modal de compartilhamento ("Enviar para Inquilino") e salvar essa associação no banco de dados.
- **Validação Ajustada**: Ajustar a validação de login seguro para autenticar usando o inquilino explicitamente associado à vistoria (além de manter o fallback do contrato).

## Capabilities

### New Capabilities
- `vistorias-contestacao`: Requisitos e fluxos para envio de vistorias técnicas e contestações por locatários/inquilinos sem dependência obrigatória de contratos de locação vigentes.

### Modified Capabilities

## Impact

- Banco de dados (Prisma schema): Alterações na tabela `Vistoria` para incluir `locatarioId`.
- Server Actions (`actions.ts`): Atualizações na validação de acesso e novas ações para gerenciar inquilinos e associação.
- Componente de Detalhes da Vistoria (`ficha-vistoria`): Modificação do modal de compartilhamento.
