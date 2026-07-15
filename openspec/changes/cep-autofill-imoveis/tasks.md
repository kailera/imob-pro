## 1. Preparação e Referências no Formulário

- [x] 1.1 Adicionar uma referência React (`useRef`) para o input de `numero` no componente `ImovelFormModal.tsx`
- [x] 1.2 Declarar um estado local `isFetchingCep` para controlar a animação de carregamento (spinner) do CEP

## 2. Integração com a API ViaCEP

- [x] 2.1 Implementar uma função auxiliar ou efeito `useEffect` que detecte quando a variável `cep` possuir exatamente 8 dígitos
- [x] 2.2 Fazer a requisição HTTP GET para a API do ViaCEP e realizar o tratamento de sucesso e erros (try/catch)
- [x] 2.3 Atualizar os estados locais de endereço (`cidade`, `uf`, `bairro`, `rua`) e transferir o foco do cursor para o input `numero` utilizando o ref criado no passo 1.1

## 3. Ajuste de Interface (UI/UX)

- [x] 3.1 Adicionar um ícone de carregamento rotativo (`Loader2` do `lucide-react`) condicionalmente visível ao lado do input de CEP quando `isFetchingCep` for verdadeiro
- [x] 3.2 Associar a referência criada ao elemento `<input name="numero" ... />` no formulário

