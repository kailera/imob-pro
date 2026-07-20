## Why

Os controles locatícios no formulário de imóvel estão incompletos e com formatações de entrada inconsistentes (como seletores numéricos nativos e falta de formatação monetária). Além disso, não é possível buscar, cadastrar ou vincular um proprietário (Locador) a um imóvel diretamente em sua ficha de cadastro/edição, impossibilitando que esses dados sejam carregados de forma automatizada ao gerar novos contratos para imóveis sem histórico prévio de locação.

## What Changes

- **Vínculo de Proprietário no Imóvel**: Possibilidade de buscar, cadastrar (via subformulário) e associar um proprietário (Locador) diretamente na edição do Imóvel, armazenando essa referência no objeto JSON `aluguelDados` (Opção 1) de forma que nenhuma migração estrutural de banco seja necessária.
- **Melhoria nos Controles Locatícios do Imóvel**: 
  - Substituição do campo de texto de Índice de Reajuste (%) no cadastro do imóvel por um seletor contendo os índices corretos (IGPM, IPCA, IGP, INPC, IPC, IPC-DI).
  - Adição dos campos de "Período Garantido" e "Abrangência da Garantia do Aluguel" como dropdowns padrão de locação no cadastro do imóvel.
- **Melhorias de Usabilidade e Formatação nos inputs**:
  - Remoção dos botões de incremento/decremento nativos (spinner) nos inputs numéricos alterando seus tipos para texto.
  - Implementação de máscaras brasileiras dinâmicas de formatação: formato monetário em reais (ponto para milhar, vírgula para decimal), CEP e outros campos formatados.
- **Reajuste nos Períodos do Contrato**:
  - Associação de um índice de reajuste individualizado a cada período de locação, permitindo que a periodicidade e o índice do reajuste do contrato sejam vinculados ao período correspondente.

## Capabilities

### New Capabilities
- `controles-locaticios-proprietario`: Definição de requisitos para o fluxo de controles locatícios por período, formatação de inputs monetários/CEP, e vínculo de proprietários a imóveis cadastrados.

### Modified Capabilities
<!-- Nenhuma especificação de capacidade existente afetada -->

## Impact

- **Database**: Campo `aluguelDados` do modelo `Imovel` passará a armazenar novos dados de vinculação do proprietário (ex: `proprietarioId`, `proprietarioNome`) e novas preferências locatícias (`periodoCarencia`, `abrangenciaGarantia`). O modelo `PeriodoContratoLocacao` receberá um campo `indiceReajuste` para salvar o índice de cada período.
- **Interface**: Modificação do `ImovelFormModal.tsx` e `ControleLocaticioClient.tsx`.
- **Hooks & Actions**: Ajustes nas rotas e hooks que selecionam imóveis para novos contratos (`useNovoContratoForm.ts`) para auto-preencher os dados do proprietário a partir do imóvel.
