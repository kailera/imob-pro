## Context

O formulário de cadastro e edição de imóveis (`ImovelFormModal.tsx`) atualmente exige o preenchimento manual de todos os campos de endereço: CEP, Cidade, UF, Bairro, Rua e Número. A automação desse processo reduzirá a carga de trabalho dos operadores de cadastro e diminuirá erros comuns de grafia em nomes de ruas, bairros e cidades.

## Goals / Non-Goals

**Goals:**
- Buscar e preencher automaticamente dados de endereço a partir de um CEP digitado ou colado com 8 dígitos numéricos.
- Oferecer feedback visual de carregamento durante a requisição.
- Direcionar o foco do cursor para o campo de Número do endereço após o preenchimento automático.
- Manter o formulário 100% editável manualmente caso a busca falhe ou a API fique offline.

**Non-Goals:**
- Validação estrita de CEP bloqueando o envio do formulário (o usuário ainda poderá enviar se preencher manualmente).
- Geocodificação (conversão de endereço em coordenadas de latitude e longitude) - isso está fora do escopo desta tarefa.

## Decisions

### 1. Utilização da API ViaCEP via fetch nativo no lado do cliente
- **Opção A (Escolhida):** Realizar um `fetch` para `https://viacep.com.br/ws/${cep}/json/` diretamente do navegador do usuário no componente do formulário. É uma API gratuita, sem limites estritos e não necessita de tokens/credenciais.
- **Opção B (Descartada):** Criar uma rota de API / Server Action intermediária no backend do Next.js. Desnecessário, pois a API ViaCEP suporta CORS e pode ser consumida de forma segura no client-side, poupando recursos do nosso servidor.

### 2. Gatilho do Preenchimento Automático
- **Decisão:** Usar um `useEffect` monitorando o estado `cep`. Quando `cep.length === 8`, a busca é disparada automaticamente. Se o valor for menor que 8, nenhuma ação é tomada.

### 3. Foco Automático no Campo Número
- **Decisão:** Utilizar uma referência React (`useRef`) apontando para o input de Número (`numero`) e chamar `numeroInputRef.current?.focus()` logo após o preenchimento dos estados de endereço.

## Risks / Trade-offs

- **[Risk] ViaCEP ficar indisponível ou retornar erro:**
  - *Mitigation:* A requisição é encapsulada em um bloco `try-catch`. Qualquer falha remove o estado de carregamento silenciosamente, permitindo digitação manual imediata.
- **[Risk] Usuário alterar o CEP após os campos já estarem preenchidos:**
  - *Mitigation:* Se o novo CEP for válido (8 dígitos), a busca é refeita e os campos atualizados. Se for apagado, os campos existentes não são limpos compulsoriamente (mantendo flexibilidade).
