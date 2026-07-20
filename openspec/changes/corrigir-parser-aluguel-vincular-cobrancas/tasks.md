## 1. Ajuste do Parser de Valores

- [x] 1.1 Atualizar a função `parseMoney` em `ingest-contratos.ts` para detectar e lidar corretamente com os formatos brasileiro (ex: "3.100,00" ou "969,00") e americano (ex: "3,100.00").
- [x] 1.2 Implementar validação básica da função de parser de moeda com casos de teste simulando diferentes entradas.

## 2. Reconciliação dos Dados no Banco de Dados

- [x] 2.1 Criar um script de migração/reconciliação (`scripts/reconcile-data.ts`) para ler o arquivo `Contratos (7).csv` e corrigir os valores de aluguel errados no banco de dados (que foram gravados divididos por 1000).
- [x] 2.2 Implementar no script de reconciliação o cruzamento de transações financeiras órfãs (`contratoId` nulo) com os locatários correspondentes, realizando limpeza e normalização robusta de nomes (como remoção de sufixos "LTDA" e pontuação).
- [x] 2.3 Executar o script de reconciliação no banco de dados local de desenvolvimento.

## 3. Verificação de Sucesso

- [x] 3.1 Rodar testes ou scripts para garantir que os valores dos aluguéis dos contratos no banco de dados coincidem com os valores corretos.
- [x] 3.2 Validar que a quantidade de transações financeiras com `contratoId` nulo foi drasticamente reduzida (apenas mantendo sacados de fato sem contratos no sistema).
