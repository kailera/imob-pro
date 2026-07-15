## ADDED Requirements

### Requirement: Múltiplos Períodos de Locação
O sistema SHALL permitir o cadastro, armazenamento e visualização de mais de um período com datas de vigência consecutivas para um mesmo contrato de locação, contendo valores de aluguel, condomínio, IPTU, desconto de pontualidade e encargos específicos para cada período.

#### Scenario: Visualização e navegação de múltiplos períodos
- **WHEN** o usuário acessa a página de detalhes de uma locação contendo 3 períodos históricos cadastrados
- **THEN** o sistema SHALL renderizar abas para cada período de vigência e, ao clicar em uma delas, exibirá as informações específicas daquele intervalo de datas.

#### Scenario: Cadastro de múltiplos períodos na migração
- **WHEN** o usuário está cadastrando ou editando um contrato de locação e clica no botão para adicionar um período
- **THEN** o sistema SHALL criar uma nova seção de vigência onde as datas de início e fim, valor de aluguel e demais encargos podem ser digitados e editados de forma independente.

### Requirement: Cobrança Baseada no Período Vigente
O sistema SHALL calcular e gerar a transação financeira mensal (receita de aluguel) utilizando as regras (valor de aluguel, condomínio, IPTU, desconto pontualidade e encargos) do período correspondente à data de vencimento da fatura.

#### Scenario: Geração de cobrança no período reajustado
- **WHEN** a data de vencimento da cobrança cai dentro de um período com aluguel de R$ 978,12
- **THEN** o sistema SHALL gerar a transação financeira com o valor base de R$ 978,12, aplicando os descontos de pontualidade e juros correspondentes a esse período.
