## 1. Setup

- [x] 1.1 Criar o arquivo `scripts/ingest-cobrancas.ts`

## 2. Implementação do Script

- [x] 2.1 Implementar leitura e parse do CSV com tratamento de cabeçalho irregular e campo Sacado multi-line
- [x] 2.2 Implementar normalização de nomes e busca de Locatário/Contrato no banco
- [x] 2.3 Implementar criação de `TransacaoFinanceira` com mapeamento de status e valores
- [x] 2.4 Implementar atualização automática de CPFs dos locatários
- [x] 2.5 Implementar relatório final de cobranças cruzadas vs não-cruzadas

## 3. Validação

- [x] 3.1 Executar o script localmente e verificar os registros criados no banco
