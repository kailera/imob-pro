## Why

As configurações administrativas da imobiliária (como dados de perfil, gerenciamento de equipe e templates de contratos) estão fragmentadas ou ausentes de uma interface centralizada. Centralizar essas funcionalidades na página `/configuracoes` permite ao Corretor gerenciar todas as regras e dados operacionais da imobiliária em um único painel coeso, aumentando a eficiência e a segurança do sistema.

## What Changes

- Expansão do schema do banco de dados (tabela `Imob`) para armazenar dados cadastrais (CNPJ, razão social, CRECI, contatos, endereço e logotipo).
- Criação de interface de edição de perfil em `/configuracoes` com suporte a upload do logotipo corporativo.
- Integração da lista de usuários e controle de cargos do Clerk diretamente em uma aba "Usuários" nas Configurações.
- Centralização da gerência de templates de contratos em Word (.docx), permitindo upload, visualização de variáveis detectadas e exclusão de modelos de contratos (`ContractTemplate`).

## Capabilities

### New Capabilities

- `config-imob-profile`: Gerenciamento do perfil cadastral e identidade visual da imobiliária (dados armazenados localmente e sincronizados).
- `config-imob-users`: Painel para visualização e gerenciamento de permissões/cargos da equipe de operadores e corretores.
- `config-imob-templates`: Central de upload e gestão de arquivos `.docx` para modelos de contratos e visualização de suas variáveis de preenchimento automático.

### Modified Capabilities

*(Nenhuma capacidade existente a ser modificada)*

## Impact

- Banco de dados: Expansão da tabela `imob` no `schema.prisma` com novas colunas cadastrais e execução de migração.
- UI: Atualização de `ConfiguracoesClient.tsx` para apresentar as novas abas ("Perfil", "Usuários" e "Modelos") ao lado da de integração do "Banco Inter".
- APIs/Server Actions: Criação de novas Server Actions para atualizar os dados cadastrais da imobiliária e integrar com as APIs de gerenciamento de templates.
