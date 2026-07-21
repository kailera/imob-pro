## Context

Para atender à necessidade de uma emissão manual ágil e flexível de acordos e cobranças no painel, o sistema disponibilizará um modal para criação de transações avulsas. O usuário selecionará o inquilino, o sistema preencherá as informações cadastrais e de endereço, e exibirá as informações do contrato ativo como referência rápida (valor do aluguel, pendências, etc.). O usuário poderá definir livremente a descrição, o valor desejado e a data de vencimento. A confirmação gerará um registro no Postgres e disparará imediatamente a emissão do BolePix real no Banco Inter.

## Goals / Non-Goals

**Goals:**
- Implementar Server Action para carregar inquilinos reais do banco com seus respectivos dados cadastrais e informações de contrato/locação (código do contrato, valor do aluguel original, imóvel).
- Implementar Server Action `criarAcordoManualAction` para persistir a cobrança manual e emitir o BolePix no Banco Inter de forma síncrona.
- Adicionar um modal na interface com o formulário de criação contendo busca de inquilino, preenchimento de endereço, painel informativo do contrato atual como referência e campos de valor/vencimento/descrição livres.
- Exibir os dados do boleto gerado (código de barras, Pix e link do PDF) imediatamente após a geração.

**Non-Goals:**
- Forçar limites estritos de valores baseados no contrato; o usuário tem total liberdade para definir o valor do boleto do acordo.

## Decisions

### 1. Obtenção de Inquilinos com Dados Cadastrais e do Contrato
A Server Action `getLocatariosListAction` buscará todos os `Locatario` cadastrados, trazendo seu endereço, CPF/CNPJ, além do `contrato` associado (com dados de `imovelLocacao` e `imovel`) para servir de referência na interface:
```typescript
export async function getLocatariosListAction() {
  return await prisma.locatario.findMany({
    select: {
      id: true,
      nome: true,
      cpfCnpj: true,
      endereco: true,
      contratoId: true,
      contrato: {
        select: {
          id: true,
          imovel: {
            select: {
              codigo: true,
              bairro: true
            }
          },
          imovelLocacao: {
            select: {
              valorTotal: true,
              dataInicio: true,
              dataFim: true
            }
          }
        }
      }
    },
    orderBy: { nome: 'asc' }
  });
}
```

### 2. Criação da Transação e Emissão Síncrona do BolePix
A Server Action `criarAcordoManualAction` validará os dados e executará a gravação de uma nova `TransacaoFinanceira` vinculada ao contrato selecionado, prosseguindo com a chamada síncrona de `gerarBolePixAction` do Banco Inter.

### 3. Interface Visual do Acordo Manual com Referência do Contrato
Adicionaremos o modal de acordo manual na aba "Renegociação" do `/juridico`. Ao selecionar o inquilino:
- Um **painel lateral informativo** exibirá os dados do contrato ativo: Código do Imóvel, Endereço, Data de Vigência do Contrato e o Valor Original Mensal.
- Abaixo ou ao lado, o formulário exibirá os inputs de **Valor do Acordo (livre)**, **Vencimento** e **Descrição**. Isso garante que o usuário tenha todas as informações do contrato à mão ao decidir o valor do boleto do acordo.
- O modal permitirá que o usuário edite o CPF/CNPJ e o Endereço de cobrança se necessário.

## Risks / Trade-offs

- **[Risco] Inquilinos sem contrato ativo** → Se o inquilino não possuir um contrato vinculado (`contratoId` é null), as informações de referência estarão em branco e o boleto não poderá ser associado a um contrato na tabela `TransacaoFinanceira`.
  *Mitigação*: Permitir a emissão mesmo sem contrato (deixando `contratoId` como null), exibindo um aviso na tela de que a transação será avulsa e não vinculada a uma locação.
