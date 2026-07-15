## Context

O banco de dados armazena valores de aluguel diretamente na tabela `ImovelLocacao`. Ao aplicar um reajuste, esses valores são sobrescritos, o que inviabiliza a migração de dados de outros sistemas com históricos de reajustes passados e compromete a auditoria do histórico financeiro.

## Goals / Non-Goals

**Goals:**
- Criar a entidade `PeriodoContratoLocacao` vinculada à locação.
- Migrar os campos de valores (`valorAluguel`, `hasCondominio`, `valorCondominio`, `hasIPTU`, `valorIPTU`, `valorTotal`) e encargos (`descontoPontualidade`, `tipoDesconto`, `diasAntecedenciaDesc`, `multaAtrasoPercentual`, `diasCarenciaMulta`, `jurosAtrasoPercentual`, `diasCarenciaJuros`) para a tabela de períodos.
- Adaptar o faturamento mensal para buscar o período ativo com base na data de vencimento da fatura.
- Atualizar a interface de detalhes do contrato para exibir os períodos em abas editáveis.

**Non-Goals:**
- Implementação de reajuste automático integrado com APIs de índices econômicos (a aplicação do reajuste e cálculo dos novos valores continuará sendo de entrada manual ou via ação específica).

## Decisions

### Decisão 1: Criação da Tabela de Períodos Contratuais
Criar o model `PeriodoContratoLocacao` no schema do Prisma e relacioná-lo em formato 1-para-Muitos com `ImovelLocacao`.
*   *Alternativa considerada:* Manter os valores atuais na tabela pai e criar apenas uma tabela de "log de reajustes".
*   *Razão da escolha:* A tabela de sub-períodos é mais robusta, pois unifica todos os parâmetros vigentes sob um intervalo de tempo (`dataInicio` e `dataFim`), tornando a busca do faturamento simples e centralizada.

### Decisão 2: Busca do Período Vigente no Faturamento
Ao gerar transações financeiras, a lógica buscará o período onde `dataVencimentoTransacao` esteja contida entre `dataInicio` e `dataFim` do período contratual.
*   *Razão da escolha:* Garante que retroativos gerados tardiamente ou faturas futuras usem exatamente a tabela de valores correta do momento do vencimento.

## Risks / Trade-offs

- **[Risco] Inconsistência de Datas**: Lacunas entre períodos ou períodos sobrepostos (ex: período 1 termina dia 26 e período 2 inicia dia 28).
  - *Mitigação*: Validação no backend impedindo a gravação de períodos com sobreposição de vigência.
- **[Risco] Contratos antigos sem períodos**: Contratos já existentes no banco de dados.
  - *Mitigação*: Criar um script de migração no Prisma (migration SQL) que crie automaticamente um primeiro `PeriodoContratoLocacao` para cada contrato existente, utilizando as datas globais do contrato e os valores atuais da tabela pai.
