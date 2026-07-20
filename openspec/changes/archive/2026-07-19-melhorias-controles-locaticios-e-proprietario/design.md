## Context

O formulário de cadastro e edição de imóvel (`ImovelFormModal.tsx`) armazena as preferências de locação no campo JSONB `aluguelDados` da tabela `Imovel`. Atualmente, esse campo não armazena referências ao proprietário (Locador) nem campos essenciais de garantia como "Período Garantido" e "Abrangência da Garantia". Além disso, o input para o Índice de Reajuste é do tipo texto livre, e os campos numéricos e monetários utilizam inputs do tipo `number` do navegador, exibindo setas incrementais e dificultando a formatação com ponto/vírgula.
Finalmente, no banco de dados, cada período contratual (`PeriodoContratoLocacao`) não possui campo para persistir um índice de reajuste individualizado.

## Goals / Non-Goals

**Goals:**
- Vincular o proprietário (Locador) ao Imóvel em `aluguelDados.proprietarioId` e `aluguelDados.proprietario` (Dados básicos do proprietário) sem alterar a estrutura de banco de dados do Imóvel (Opção 1).
- Criar ações de backend `getLocadores` e `createLocador` no arquivo de ações para permitir buscar proprietários cadastrados e cadastrar novos em tempo de edição do imóvel.
- Atualizar o modal do imóvel para selecionar e criar proprietários.
- Adicionar os campos faltantes (`periodoCarencia` e `abrangenciaGarantia`) no formulário do imóvel e armazená-los no JSON `aluguelDados`.
- Adicionar o campo `indiceReajuste` no modelo `PeriodoContratoLocacao` no banco de dados para suportar reajustes específicos por período.
- Remover os seletores nativos (incremento/spinner) dos inputs numéricos/monetários e adicionar formatação amigável (CEP brasileiro `00000-000` e monetário em Real `1.250,50`).

**Non-Goals:**
- Criar uma página administrativa independente para gerenciar Proprietários/Locadores (esta funcionalidade continua embutida em Imóveis e Contratos).
- Alterar o modelo da tabela `Imovel` diretamente (as novas chaves de proprietário e garantias serão contidas em `aluguelDados`).

## Decisions

### Decisão 1: Vínculo de Proprietário via JSON (`aluguelDados`)
- **Escolha**: Armazenar `proprietarioId` e uma cópia dos dados principais do proprietário (`nome`, `cpfCnpj`) no JSON `aluguelDados` do Imóvel.
- **Racional**: Não requer a criação de migrações estruturais na tabela de Imóveis, que é uma tabela central e sensível do sistema. Mantém a integridade de leitura no frontend e o formulário altamente responsivo.
- **Alternativa Considerada**: Criar uma relação direta via chave estrangeira `proprietarioId` na tabela `Imovel` no Prisma. Rejeitada devido ao risco e complexidade de rodar migrações em produção em tabelas core nesta etapa.

### Decisão 2: Mapeamento de Reajuste no Período do Contrato
- **Escolha**: Adicionar a coluna `indiceReajuste String?` na tabela `PeriodoContratoLocacao` no banco de dados.
- **Racional**: Os períodos de locação são registros históricos/financeiros formais. O índice aplicado a cada período de reajuste precisa ser persistido de forma robusta no banco de dados para auditoria e emissão de boletos.
- **Alternativa Considerada**: Salvar o histórico de reajustes em um JSON no Contrato. Rejeitada porque a tabela `PeriodoContratoLocacao` já é a estrutura oficial para controle locatício individualizado por datas.

### Decisão 3: Formatação com Inputs de Texto (`type="text"`)
- **Escolha**: Alterar os inputs numéricos de `type="number"` para `type="text"` ou inputs específicos com máscaras personalizadas.
- **Racional**: Inputs do tipo `number` nativos exibem setas de incremento que poluem a UI e não toleram formatação com máscara de ponto e vírgula (`1.050,00`). Com `type="text"`, podemos aplicar funções utilitárias de máscara em tempo real.

## Risks / Trade-offs

- **[Risco] Dessincronização de dados do Proprietário no Imóvel**: Se os dados cadastrais de um proprietário (ex: CPF, Telefone) forem atualizados no banco de dados, os dados cacheados em `aluguelDados.proprietario` do Imóvel podem ficar desatualizados.
  - *Mitigação*: Armazenaremos prioritariamente o `proprietarioId` como fonte única de verdade. Toda vez que o modal de edição do imóvel for aberto, ou quando um contrato for gerado, o sistema consultará o registro mais recente do `Locador` no banco utilizando o ID, garantindo dados sempre atualizados.
