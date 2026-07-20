## 1. Banco de Dados e Schema

- [x] 1.1 Atualizar o arquivo schema.prisma para adicionar o campo opcional locatarioId e a relação correspondente em Vistoria
- [x] 1.2 Gerar e aplicar a migração do banco de dados (prisma migrate/db push) e regenerar o Prisma Client

## 2. Server Actions e Lógica de Negócio

- [x] 2.1 Adicionar a server action getLocatarios para retornar todos os inquilinos ordenados por nome
- [x] 2.2 Adicionar a server action associateTenantToVistoria para salvar a associação do inquilino na vistoria
- [x] 2.3 Atualizar a lógica da action validateTenantAccess para autenticar o inquilino diretamente vinculado via locatarioId além do fallback dos contratos ativos

## 3. Roteamento e Link de Acesso

- [x] 3.1 Alterar a geração da URL de compartilhamento no frontend removendo o prefixo /public/ (tanto na página da ficha-vistoria quanto em quaisquer ações locais)

## 4. Interface e Experiência do Usuário (UI)

- [x] 4.1 Modificar o modal de compartilhamento na Ficha de Vistoria para listar os inquilinos se a vistoria não possuir inquilino direto associado
- [x] 4.2 Permitir a seleção e persistência do inquilino antes de habilitar a geração e cópia do link seguro de acesso
