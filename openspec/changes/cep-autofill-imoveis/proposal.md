## Why

Facilitar o cadastro de novos imóveis preenchendo automaticamente os campos de endereço (Cidade, UF, Bairro e Rua) ao digitar um CEP válido (8 dígitos). Isso reduz erros de digitação e acelera o processo de inclusão de propriedades no sistema.

## What Changes

- Integração com a API pública do ViaCEP no lado do cliente.
- Detecção automática de digitação/colagem de CEP com 8 dígitos no formulário de imóveis.
- Exibição de indicador de progresso (loading spinner) enquanto os dados do endereço são buscados.
- Preenchimento automático dos estados de Cidade, UF, Bairro e Rua (Logradouro).
- Foco automático no campo de número após o preenchimento bem-sucedido.
- Tratamento de erro silencioso/amigável caso o CEP não seja encontrado ou a API falhe.

## Capabilities

### New Capabilities

- `cep-autofill`: Busca e preenchimento de endereço baseado no CEP digitado no formulário de cadastro/edição de imóveis.

### Modified Capabilities

*(Nenhuma capacidade existente modificada)*

## Impact

- `app/(admin)/imoveis/components/ImovelFormModal.tsx`: Atualização de layout e inclusão de lógica de busca automática de CEP.
