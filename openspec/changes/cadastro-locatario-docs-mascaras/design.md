## Context

Atualmente, o modelo de `Locatario` no banco de dados armazena telefones e endereços usando formato flexível JSON, mas não possui suporte estruturado para cadastrar múltiplos telefones e dados de cônjuges. Além disso, os documentos que ficam arquivados no S3 da Rust FS não estão categorizados por finalidade. Na interface do usuário, a entrada de dados (CPF, CNPJ, telefone, CEP, valores monetários) não possui máscaras ou formatação em tempo real, gerando inconsistências no cadastro.

## Goals / Non-Goals

**Goals:**
- Adicionar os novos campos no schema Prisma (`Locatario`) para contemplar os dados complementares de pessoa física e cônjuge.
- Modificar o fluxo de formulário de criação de inquilino para capturar os novos dados de Locatário, Cônjuge e múltiplos telefones.
- Implementar máscaras e formatações nos campos CPF, CNPJ, Telefone, CEP e Valores Monetários na UI do modal.
- Permitir o armazenamento estruturado das URLs de documentos por categoria.

**Non-Goals:**
- Criação de novos buckets de S3 ou alteração das credenciais de S3 (o armazenamento/backend do S3 ou Rust FS já está no local/definido, apenas salvaremos as strings/chaves de URLs associadas no JSON do locatário).
- Fluxo de exclusão física de arquivos do S3 (será tratado de forma lógica ao substituir ou deletar no formulário).

## Decisions

### 1. Modelagem de Dados no Prisma (`Locatario`)
Adicionaremos campos opcionais para dados do cônjuge e dados complementares de PF no modelo `Locatario`. 
- **Alternativa A (Rejeitada)**: Criar uma tabela separada `Conjuge` conectada por relação 1:1. 
- **Alternativa B (Escolhida)**: Manter os dados do cônjuge inline no modelo `Locatario` como atributos opcionais (ex: `conjugeNome`, `conjugeCpf`, etc.) e os múltiplos telefones em um campo JSON `telefone` e os documentos no campo JSON `documentos`. Escolhido devido à simplicidade e agilidade, já que o cônjuge não possui ciclo de vida próprio independente do inquilino no escopo atual.

### 2. Estrutura do JSON de Telefones
Estruturar o array de telefones no banco no formato:
`[ { "tipo": "celular", "numero": "(11) 98304-1169", "observacao": "" } ]`

### 3. Estrutura do JSON de Documentos Digitalizados
Mapear chaves de categoria no campo `documentos` (JSON):
```json
{
  "docPessoal": "url-s3",
  "comprovanteResidencia": "url-s3",
  "holeriteConjuge": "url-s3",
  "holerite1Nilson": "url-s3",
  "holerite2Nilson": "url-s3"
}
```

### 4. Formatadores de Entrada na UI
Implementar helpers simples de formatação em JavaScript dentro de `NovoContratoModal.tsx` ou importar utilitários para aplicar máscaras nos eventos `onChange` de cada input específico.

## Risks / Trade-offs

- **[Risco] Incompatibilidade de tipos de dados nos contratos gerados** → **Mitigação**: Assegurar que os utilitários de preenchimento de templates tratem as novas propriedades (`Locatario`) para que os placeholders de cônjuges sejam substituídos corretamente ou removidos caso o locatário não seja casado.
