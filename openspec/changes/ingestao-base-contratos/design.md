## Context

A imobiliária possui um histórico de contratos no arquivo `Contratos (7).csv` que precisa ser importado para o novo banco de dados (PostgreSQL/Prisma). Essa importação garantirá que a base de produção possua todos os registros de contratos anteriores, permitindo que a equipe edite manualmente os dados em falta posteriormente.

## Goals / Non-Goals

**Goals:**
- Criar um script utilitário standalone escrito em TypeScript (`scripts/ingest-contratos.ts`).
- Fazer a decodificação correta de caracteres acentuados usando `iconv-lite` (o arquivo está em Windows-1252).
- Mapear e relacionar as entidades `Imovel`, `ImovelLocacao`, `ContratoImovelLocacao`, `Locatario` e `Locador` respeitando a integridade das tabelas do Prisma.
- Permitir a execução local contra o banco local e contra o banco de produção (configurando `DATABASE_URL`).

**Non-Goals:**
- Não será desenvolvida uma interface de upload de arquivos (Web UI) nesta fase.
- Não haverá lógica de enriquecimento ou verificação de CPF/CNPJ de locatários e locadores no script (esses campos virão em branco/placeholders para inserção manual posterior).

## Decisions

1. **Uso de `iconv-lite` + `csv-parse`**:
   - *Raciocínio*: O CSV fornecido contém caracteres no formato Windows-1252. Ler diretamente como string padrão UTF-8 corromperia as cedilhas e acentos. `iconv-lite` decodificará o buffer antes do parse.

2. **Geração de códigos únicos para Imóvel (`IMB-CSV-<CONTRATO>`)**:
   - *Raciocínio*: Como a tabela `Imovel` exige uma chave única `codigo` e o CSV não possui código de imóvel, geraremos um a partir do número do contrato importado, facilitando a correspondência exata.

3. **Valores vazios e Placeholders para campos obrigatórios**:
   - *Raciocínio*: Locador e Locatário possuem campos obrigatórios como `cpfCnpj`, `email`, `rg`, etc. Como não estão no CSV, preencheremos com strings vazias (`""`) ou valores falsos padrão para evitar falha nas constraints do Prisma, mantendo a integridade referencial.

## Risks / Trade-offs

- **Formato das Datas**: As datas no CSV estão em `DD/MM/AAAA`. O interpretador JS nativo pode falhar dependendo do timezone do sistema. Mapearemos explicitamente desmembrando dia, mês e ano no parseador.
- **Risco de Duplicidade**: Executar o script repetidamente pode tentar criar o mesmo contrato se não for tratado. Usaremos busca por ID de contrato antes de criar novos registros, ou `upsert` onde for apropriado.
