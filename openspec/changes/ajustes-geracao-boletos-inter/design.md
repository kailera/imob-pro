## Context

Geração de cobranças integradas à API v3 do Banco Inter para imobiliária Scatolin. Atualmente a geração falha devido a cadastros de endereço incompletos dos inquilinos oriundos da base importada do Sicadi. Além disso, as opções bancárias no frontend contêm dados mockados e a API não envia os juros/multa nem a bonificação (desconto de pontualidade) cadastrada em contrato.

## Goals / Non-Goals

**Goals:**
- Validar previamente a consistência dos dados do locatário (inquilino) e do endereço antes de invocar a API do Inter, fornecendo um erro legível.
- Automatizar o preenchimento dos endereços de cobrança para os inquilinos sem endereço cadastrado, utilizando o endereço do próprio imóvel alugado e o CEP regional `15385-000` (Ilha Solteira-SP).
- Configurar os juros de mora, multas contratuais e bonificações no payload enviado ao Banco Inter.
- Exibir a conta bancária correta da imobiliária no Banco Inter nos filtros de faturamento.
- Desenvolver suporte para a renegociação de boletos vencidos (cancelando a cobrança no Inter e permitindo nova data e valor).

**Non-Goals:**
- Automatizar a digitação ou busca externa automatizada de CPFs/CNPJs faltantes (o usuário informará os 5 inquilinos faltantes manualmente através do painel do admin).
- Modificar o fluxo de geração de lote inteiro de cobranças.

## Decisions

### Decisão 1: Enriquecimento automático do endereço do inquilino
- **Alternativa A (Descartada)**: Exigir que o operador digite os endereços de todos os 93 inquilinos um a um.
- **Alternativa B (Escolhida)**: Criar um script utilitário de uso único `scripts/enrich-inquilinos-addresses.ts` para enriquecer em lote os inquilinos sem endereço, extraindo a rua/número do imóvel associado a seu contrato de aluguel ativo e atribuindo o CEP `15385000` (CEP geral de Ilha Solteira-SP).
- **Raciocínio**: A grande maioria dos locatários reside no próprio imóvel alugado da imobiliária, o que permite o enriquecimento automático confiável, minimizando o trabalho manual e liberando a geração de boletos imediatamente.

### Decisão 2: Envio de Multas, Juros e Descontos à API do Banco Inter
- **Lógica de Mapeamento**:
  - Trazer o relacionamento `imovelLocacao` na transação financeira.
  - Enviar juros sob a propriedade `mora` (tipo `TAXAMENSAL`).
  - Enviar multas sob a propriedade `multa` (tipo `PERCENTUAL`).
  - Calcular a data limite do desconto de pontualidade subtraindo `diasAntecedenciaDesc` da data de vencimento e enviar sob `desconto` (tipo `VALORFIXODATAINFORMAR` ou `PERCENTUALDATAINFORMAR`).

### Decisão 3: Renegociação e Cancelamento (Baixa)
- **Fluxo de Ação**:
  - Nova ação no servidor `renegociarCobrancaAction(cobrancaId, novoVencimento, novoValor)`.
  - Se a transação possui `interNossoNumero`, chama a API do Banco Inter para baixar/cancelar (`POST /cobrancas/{nossoNumero}/cancelar`).
  - Limpa os campos `interNossoNumero`, `interBarcode`, `interPixCode` e redefine a transação para status `PENDENTE` com a nova data e valor, permitindo a regeneração do boleto com os novos dados.

## Risks / Trade-offs

- [Risco] A API do Banco Inter pode rejeitar o CEP regional `15385-000` para logradouros que possuam CEPs específicos por rua.
  - *Mitigação*: O CEP de Ilha Solteira `15385-000` é um CEP único municipal/regional, portanto é plenamente aceito para qualquer logradouro na cidade.
- [Risco] O cancelamento do boleto no Inter pode falhar devido a instabilidade externa.
  - *Mitigação*: A renegociação retornará o erro da API do Inter ao usuário e não alterará o banco local até obter sucesso na baixa, mantendo o alinhamento de estado financeiro.
