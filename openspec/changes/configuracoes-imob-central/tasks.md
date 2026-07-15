## 1. Banco de Dados e Schema

- [x] 1.1 Atualizar o modelo `Imob` no `schema.prisma` com os novos campos de perfil (razaoSocial, cnpj, telefone, emailContato, logoUrl, creci, cep, logradouro, numero, complemento, bairro, cidade, uf)
- [x] 1.2 Executar push ou migration no Prisma para atualizar as tabelas locais no banco Postgres

## 2. Server Actions e APIs de Configurações

- [x] 2.1 Criar Server Actions em `app/actions/imobActions.ts` para salvar e obter as informações de perfil da imobiliária
- [x] 2.2 Criar rota de API em `app/api/imob/logo/route.ts` para gerenciar o upload de imagens de logotipo e armazenamento no S3/RustFS
- [x] 2.3 Ajustar endpoints de API de modelos em `app/api/contratos/modelos` para integrar corretamente e gerenciar o upload no S3/RustFS

## 3. Interface do Usuário (Abas de Configuração)

- [x] 3.1 Adicionar os botões de navegação na sidebar de `ConfiguracoesClient.tsx` para chaveamento entre Perfil, Banco Inter, Usuários e Modelos
- [x] 3.2 Desenhar o formulário de perfil corporativo da imobiliária na aba "Perfil"
- [x] 3.3 Adicionar a aba "Usuários" renderizando o componente `<OrganizationProfile />` do Clerk com as regras de estilização da plataforma
- [x] 3.4 Implementar a aba "Modelos" com upload de arquivo `.docx`, listagem de templates cadastrados, exibição de variáveis detectadas e botão de exclusão
