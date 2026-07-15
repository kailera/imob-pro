## Context

As configurações administrativas da imobiliária estão dispersas na plataforma `imob-pro`. Este design centraliza e cria abas para "Perfil", "Integração Inter", "Usuários" e "Modelos de Contratos" dentro da rota `/configuracoes`. A central de configurações será acessível e editável de forma segura com base nas regras de RBAC integradas anteriormente com o Clerk.

## Goals / Non-Goals

**Goals:**
- Unificar todas as configurações administrativas em abas na rota `/configuracoes` utilizando o componente `ConfiguracoesClient.tsx`.
- Expandir o modelo `Imob` no Prisma para persistir dados cadastrais e o logotipo da imobiliária de forma multi-tenant.
- Integrar a interface padrão do Clerk `<OrganizationProfile />` para gerenciar usuários, convites e papéis (roles).
- Centralizar o upload de modelos de contratos `.docx`, incluindo detecção automática de variáveis (como `{{nome_inquilino}}`) e gravação dos arquivos no armazenamento persistente (RustFS/S3).

**Non-Goals:**
- Criar um editor de texto online para arquivos `.docx` (os modelos devem ser editados localmente e reenviados).
- Substituir o gerenciador de usuários integrado do Clerk por um painel customizado completo (usaremos o componente nativo do Clerk para simplificação e segurança).

## Decisions

### 1. Expansão do Modelo `Imob` no Prisma
Adicionaremos campos opcionais para dados corporativos (cnpj, telefone, emailContato, logoUrl, creci e endereço estruturado) no modelo `Imob`.
Ao usar campos opcionais, evitamos quebra com dados já existentes e facilitamos a migração. O banco PostgreSQL local continuará sendo a fonte de verdade para esses dados operacionais da imobiliária.

### 2. Gestão de Equipe com `<OrganizationProfile />`
Em vez de construir tabelas complexas de gerenciamento de membros com rotas de convites por e-mail personalizadas, utilizaremos o componente nativo `<OrganizationProfile />` do Clerk na aba "Usuários".
- Vantagem: Convites automáticos por e-mail, controle de convites expirados e troca de roles nativas.
- Sincronização: A tabela local `users` do Prisma continuará sendo sincronizada em segundo plano através do webhook que criamos na etapa anterior.

### 3. Processamento de Arquivos `.docx` (Mapeamento de Variáveis)
Ao fazer upload de um modelo na aba "Modelos", usaremos o `pizzip` e `docxtemplater` para ler o arquivo binário `.docx` no servidor.
- Mapearemos todas as chaves delimitadas por chaves duplas `{{variavel}}`.
- Salvaremos o arquivo gerado com um UUID no storage (RustFS/S3) e registraremos o nome, tipo e a lista de chaves na tabela `ContractTemplate`.

## Risks / Trade-offs

- **Armazenamento de Arquivos** → Gravação de templates no S3/RustFS vs Gravação local no servidor.
  - *Decisão*: Salvaremos no S3/RustFS (utilizando a biblioteca `@aws-sdk/client-s3` já instalada) para garantir que a aplicação funcione corretamente em ambientes de container onde o disco local é efêmero.
- **Incompatibilidade de Versões do Prisma** → Realizar migrações em um banco em desenvolvimento ativo.
  - *Mitigação*: Criar script de migração seguro e testar a atualização utilizando `npx prisma db push` ou `npx prisma migrate dev` para garantir compatibilidade.
