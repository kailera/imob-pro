## Context

O projeto `imob-pro` gerencia imóveis, vistorias e finanças em um modelo multi-inquilino (multi-tenant) representado pelo modelo `Imob`. Atualmente, não há autenticação obrigatória ou segregação de privilégios. Esta alteração introduz o Clerk como provedor de identidade (IdP) e implementa o controle de acesso baseado em funções (RBAC) para garantir que operadores executem tarefas operacionais normais, enquanto corretores mantenham o controle total administrativo e de assinaturas.

## Goals / Non-Goals

**Goals:**
- Proteger todas as rotas do painel administrativo sob `/(admin)` com autenticação Clerk obrigatória.
- Mapear organizações do Clerk para o modelo `Imob` e membros para o modelo `Users` do Prisma.
- Sincronizar eventos de usuário e organização em tempo real através de webhooks do Clerk para o banco local.
- Restringir a conclusão e assinatura de vistorias exclusivamente a usuários com privilégios de administrador (`ADMIN`/Corretor).
- Bloquear a edição de chaves de API e segredos do Banco Inter para usuários não administradores.

**Non-Goals:**
- Desenvolver um sistema proprietário de autenticação (OAuth/senha própria).
- Criar fluxos de recuperação de senha ou telas de gerenciamento de perfil complexas no front-end (usaremos os componentes prontos e modais nativos do Clerk).
- Substituir o modelo de dados de inquilino (`Imob`) já estabelecido no banco local.

## Decisions

### 1. Uso de Clerk Organizations (Multi-Tenancy)
Mapearemos a relação multi-inquilino do sistema utilizando o recurso de **Organizations** do Clerk. 
- A tabela `Imob` guardará o ID da organização no campo `orgId`.
- Quando um novo cliente se cadastrar e criar uma organização, a tabela `Imob` correspondente será instanciada.
- Os operadores daquela imobiliária serão convidados para a organização do Clerk correspondente.

### 2. Sincronização via Webhooks
Usaremos a biblioteca `svix` para escutar e validar webhooks enviados pelo Clerk no endpoint `/api/webhooks/clerk`.
- O webhook processará eventos `organization.created`, `user.created`, `organizationMembership.created` e `organizationMembership.updated`.
- Com isso, garantiremos que os dados em cache local na tabela `users` do Prisma estejam sempre em sincronia com o estado do Clerk (e.g. nomes, e-mails e a função `role`).

### 3. Proteção no Nível de Rotas (Next.js Middleware)
Implementaremos o middleware do Clerk (`middleware.ts`) na raiz do projeto Next.js.
- Rotas sob `/(admin)/*` serão protegidas e exigirão autenticação e vinculação a uma organização ativa.
- Rotas públicas (como o site institucional `/(public)/*` e vendas públicas) continuarão acessíveis sem autenticação.

### 4. Validação Robusta nas Server Actions
O controle de acesso de UI será auxiliado pelos componentes `<Protect>` e hooks `useAuth`/`useUser` do Clerk. Contudo, a validação definitiva SHALL ser feita diretamente nas Server Actions correspondentes (como a de assinatura de vistoria e de alteração da integração do Banco Inter), verificando a role (`orgRole`) do usuário na sessão ativa obtida do back-end (`auth()`).

## Risks / Trade-offs

- **Falha na Entrega do Webhook** → Se por algum motivo o Clerk falhar ao disparar o webhook de criação ou se o servidor estiver temporariamente fora do ar, o registro local na tabela `users` ou `imob` pode ficar ausente.
  - *Mitigação*: Implementar um fluxo de criação *Just-In-Time* (JIT) quando o usuário faz o primeiro login (caso ele não seja encontrado no banco local pelo `userId` do Clerk, criamos seu registro dinamicamente com base nas informações do token de sessão JWT do Clerk).
- **Sobrecarga de chamadas externas** → Ficar dependendo do Clerk em toda Server Action para validar permissões complexas.
  - *Mitigação*: Utilizar os dados em cache local na tabela `users` baseados no `id` do usuário Clerk sempre que possível para operações de leitura, recorrendo ao Clerk SDK ou sessão apenas para validações de escrita em rotas sensíveis.
