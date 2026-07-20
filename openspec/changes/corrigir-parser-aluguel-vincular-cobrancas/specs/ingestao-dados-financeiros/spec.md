## ADDED Requirements

### Requirement: Importação de valores no padrão americano
O sistema DEVE ser capaz de importar arquivos CSV em que os valores de aluguel utilizam a vírgula como separador de milhar e ponto como separador decimal (ex: "3,100.00").

#### Scenario: Sucesso na importação padrão americano
- **WHEN** o script de ingestão de contratos processa a linha com o valor "3,100.00"
- **THEN** o valor de aluguel inserido no banco de dados deve ser de 3100.00 na tabela imovel_locacao e 310000 na tabela imovel

### Requirement: Importação de valores no padrão brasileiro
O sistema DEVE ser capaz de importar arquivos CSV em que os valores de aluguel utilizam o ponto como separador de milhar e vírgula como separador decimal (ex: "3.100,00" ou apenas "969,00").

#### Scenario: Sucesso na importação padrão brasileiro
- **WHEN** o script de ingestão de contratos processa a linha com o valor "3.100,00" ou "969,00"
- **THEN** o valor de aluguel inserido no banco de dados deve ser de 3100.00 ou 969.00 na tabela imovel_locacao

### Requirement: Vinculação retroativa de transações financeiras
O sistema DEVE varrer transações financeiras de aluguel sem contrato associado e vinculá-las ao respectivo contrato de locação utilizando normalização e comparação robusta de nomes do locatário.

#### Scenario: Associação bem-sucedida de transação financeira
- **WHEN** existe uma transação sem contrato associado para o sacado "paola ferreira de ba.os transportes ltda"
- **THEN** o sistema limpa e normaliza os nomes e associa esta transação ao contrato do locatário "PAOLA FERREIRA DE BA.OS TRANSPORTES"
