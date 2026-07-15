## 1. Setup e Instalação

- [x] 1.1 Instalar dependências necessárias (`@clerk/nextjs` e `svix` para assinatura do webhook)
- [x] 1.2 Configurar variáveis de ambiente do Clerk no arquivo `.env`
- [x] 1.3 Criar o arquivo `middleware.ts` na raiz do projeto para impor login obrigatório em `/(admin)/*` e expor a rota do webhook `/api/webhooks/clerk`
- [x] 1.4 Configurar o ClerkProvider no layout principal do aplicativo em `app/layout.tsx`

## 2. Implementação do Webhook de Sincronização

- [x] 2.1 Criar a rota de API para o webhook do Clerk em `app/api/webhooks/clerk/route.ts`
- [x] 2.2 Implementar validação de assinatura com a biblioteca `svix` utilizando o segredo do webhook (`CLERK_WEBHOOK_SECRET`)
- [x] 2.3 Implementar lógica de manipulação do evento `organization.created` para inserir registros correspondentes em `Imob`
- [x] 2.4 Implementar lógica de manipulação dos eventos `user.created`, `organizationMembership.created` e `organizationMembership.updated` para sincronizar os usuários na tabela `Users` com a role adequada

## 3. Aplicação do RBAC nas Server Actions (Back-end)

- [x] 3.1 Adicionar validação de função (`orgRole` / `ADMIN`) na ação de assinar/concluir vistorias
- [x] 3.2 Adicionar validação de função (`orgRole` / `ADMIN`) nas rotas e ações que editam dados da integração com o Banco Inter (`ConfiguracaoInter`)

## 4. Ajustes na Interface Gráfica (Front-end)

- [x] 4.1 Envolver botões de assinatura de vistoria com componentes `<Protect>` limitados a corretores/admins
- [x] 4.2 Restringir menus ou páginas de configuração de integrações sensíveis a usuários não administradores
