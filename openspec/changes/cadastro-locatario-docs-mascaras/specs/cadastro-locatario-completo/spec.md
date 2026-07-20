## ADDED Requirements

### Requirement: Cadastro Completo do Locatário e Cônjuge
O sistema SHALL permitir o cadastro e armazenamento completo dos dados do Locatário Principal (CPF, Nome, E-mail, Telefones, Endereço, RG, Órgão emissor, Gênero, Estado civil, Profissão, Nacionalidade, Renda mensal, RNE) e dos dados de seu Cônjuge (CPF, Nome, RG, Órgão emissor, E-mail, Data de nascimento, Profissão, Renda mensal, Nacionalidade, RNE, Telefones).

#### Scenario: Visualizar formulário com dados de cônjuge ao selecionar casado
- **WHEN** o usuário seleciona o estado civil "Casado(a)" no formulário do Locatário
- **THEN** o sistema SHALL habilitar e exibir a seção de "Dados do Cônjuge" com todos os campos requisitados.

### Requirement: Armazenamento e Associação de Documentos
O sistema SHALL permitir associar URLs de documentos digitalizados estruturados (Documento Pessoal, Comprovante de Residência, Holerite Cônjuge, Holerite 1 Nilson, Holerite 2 Nilson) ao registro do locatário oriundos do Rust FS S3.

#### Scenario: Enviar e associar documentos digitalizados
- **WHEN** o usuário realiza o upload ou informa o link dos documentos digitalizados específicos
- **THEN** o sistema SHALL salvar as chaves/URLs mapeadas para as categorias correspondentes na coluna JSON de documentos.

### Requirement: Múltiplos Telefones com Estrutura JSON Flexível
O sistema SHALL permitir adicionar múltiplos telefones para o locatário estruturados no formato JSON `{ tipo: string, numero: string }`.

#### Scenario: Adicionar telefone adicional
- **WHEN** o usuário clica em adicionar outro telefone no formulário
- **THEN** o sistema SHALL habilitar um novo par de campos (Tipo e Número) e salvar a coleção no campo JSON flexível.

### Requirement: Formatação e Máscaras de Entrada na UI
O sistema SHALL aplicar máscaras de formatação em tempo real para os campos CPF/CNPJ, Telefone, CEP e Valores Monetários (Dinheiro).

#### Scenario: Digitar CPF com máscara
- **WHEN** o usuário digita números no campo de CPF
- **THEN** o sistema SHALL formatar dinamicamente como `999.999.999-99`.
