## 1. Setup e Dependências

- [x] 1.1 Garantir a instalação das dependências iconv-lite e csv-parse (no package.json)
- [x] 1.2 Criar a base de arquivos para o script em `scripts/ingest-contratos.ts`

## 2. Implementação do Script de Ingestão

- [x] 2.1 Implementar decodificação Windows-1252 e parsing básico do arquivo CSV
- [x] 2.2 Implementar lógica de criação/upsert de registros de `Imovel` para integridade referencial
- [x] 2.3 Implementar criação de `ImovelLocacao` e `ContratoImovelLocacao`
- [x] 2.4 Implementar criação de `Locatario` e `Locador` com placeholders/dados padrão para os campos não mapeados

## 3. Validação e Execução

- [x] 3.1 Executar a ingestão no ambiente local e verificar a criação dos registros no banco de dados local
- [x] 3.2 Preparar instrução e executar a ingestão apontando para o banco de produção
