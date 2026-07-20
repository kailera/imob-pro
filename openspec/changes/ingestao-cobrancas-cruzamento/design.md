## Context

O CSV `dataset scatolin - cobranca.csv` contém ~982 cobranças exportadas do Banco Inter. Cada registro possui nome+CPF do sacado (multi-line), valor em BRL, datas e status bancário. Precisamos cruzar com os 95 contratos já ingestados no banco (`ContratoImovelLocacao` → `Locatario`) e inserir como `TransacaoFinanceira`.

## Goals / Non-Goals

**Goals:**
- Criar script `scripts/ingest-cobrancas.ts` que lê o CSV, cruza com contratos e insere `TransacaoFinanceira`.
- Normalização de nomes para matching robusto (lowercase, sem acentos, trim).
- Preenchimento automático dos CPFs de locatários quando vazios.
- Relatório final de cobranças não-cruzadas.

**Non-Goals:**
- Não será criada UI para upload de cobranças.
- Não será feita conciliação bancária automática (apenas ingestão).

## Decisions

1. **Cruzamento por nome normalizado**: Sem acentos, lowercase, trim. Alternativa descartada: cruzar por CPF (campo `cpfCnpj` está vazio nos locatários antes desta ingestão).

2. **Parse do CSV**: O campo Sacado contém `"Nome\nCPF"` (multi-line entre aspas). Usaremos `csv-parse` que respeita aspas CSV nativamente. O CSV tem 2 linhas de cabeçalho irregulares que serão skippadas manualmente.

3. **Encoding**: O CSV parece ser UTF-8 com caracteres corrompidos pontuais. Tentaremos UTF-8 puro primeiro; se necessário, fallback para `latin1`.

4. **Mapeamento de status**: `Liquidado`/`Baixado` → `LIQUIDADO`, `Cancelado`/`Falha` → `CANCELADO`, demais → `PENDENTE`.

5. **Desambiguação de contratos**: Se um locatário aparece em múltiplos contratos, vincular ao primeiro encontrado e logar para revisão.

## Risks / Trade-offs

- **Nome não bate**: Diferenças sutis de grafia (ex: "José" vs "Jose") podem gerar falsos negativos → mitigado pela normalização.
- **Duplicatas ao re-executar**: Usaremos o número sequencial como chave em `metadata` para skip se já existir.
