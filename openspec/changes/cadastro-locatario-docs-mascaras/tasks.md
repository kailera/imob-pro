## 1. Schema do Prisma e Migrações

- [x] 1.1 Atualizar o modelo `Locatario` no [schema.prisma](file:///c:/Users/rebec/Documents/scatolin/imob-pro/prisma/schema.prisma) para incluir os campos do Cônjuge (nome, CPF, RG, órgão emissor, e-mail, data de nascimento, profissão, renda mensal, nacionalidade, RNE, telefone) e os novos de PF (renda mensal, RNE)
- [x] 1.2 Atualizar o campo `documentoUrl` ou adicionar campo `documentos` para salvar o JSON contendo os documentos digitalizados por categoria
- [x] 1.3 Executar a migração do Prisma (`npx prisma migrate dev` ou equivalente) e regenerar o client do Prisma

## 2. Server Actions e Backend

- [x] 2.1 Modificar as interfaces e funções em [actions.ts](file:///c:/Users/rebec/Documents/scatolin/imob-pro/app/%28admin%29/contratos/actions.ts) (ex: `createLocatario` e `createContratoLocacao`) para lidar com os novos atributos e objetos JSON de locatário, cônjuge e documentos
- [x] 2.2 Validar a conversão/parser do JSON de múltiplos telefones e endereços no backend

## 3. UI, Formulários e Máscaras de Entrada

- [x] 3.1 Implementar funções auxiliares de formatação/máscara para CPF/CNPJ, Telefone, CEP e Valores Monetários (R$) no React
- [x] 3.2 Atualizar o formulário de cadastro de inquilino em [NovoContratoModal.tsx](file:///c:/Users/rebec/Documents/scatolin/imob-pro/app/%28admin%29/locacao/components/NovoContratoModal.tsx) para renderizar os novos campos de cônjuge condicionalmente (quando estado civil for casado)
- [x] 3.3 Adicionar inputs dinâmicos ou interface para anexar múltiplos telefones organizados em tipo e número
- [x] 3.4 Incluir inputs para seleção/upload dos links de arquivos nas categorias específicas (DOC PESSOAL, Comprovante de Residência, Holerite cônjuge, Holerite 1 Nilson, Holerite 2 Nilson)
- [x] 3.5 Vincular as máscaras de input nos campos do formulário para CPF/CNPJ, Telefone, CEP e Valores Monetários
