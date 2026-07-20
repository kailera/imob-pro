## 1. Atualização da Ingestão em Lote

- [x] 1.1 Atualizar `scripts/ingest-contratos.ts` para fazer lookup de `Locador` por nome normalizado (case-insensitive, trimmed) e reutilizá-lo caso exista, em vez de criar duplicatas para cada contrato.

## 2. Script de Deduplicação e Limpeza da Base

- [x] 2.1 Criar o script de migração/utilitário `scripts/deduplicate-owners.ts` usando Prisma Client para agrupar proprietários duplicados por nome, apontar suas relações para um registro principal e deletar os duplicados órfãos.
- [x] 2.2 Executar o script no banco local e validar a consolidação correta das chaves estrangeiras.

## 3. Ajustes de Exibição no Frontend

- [x] 3.1 Ajustar o dropdown e busca de proprietários em `app/(admin)/imoveis/components/ImovelFormModal.tsx` para renderizar apenas locadores únicos e formatar corretamente os CPFs/CNPJs ou mostrar `(Sem CPF)` caso estejam em branco.
- [x] 3.2 Validar visualmente o formulário de cadastro de imóveis para confirmar que duplicatas não aparecem no dropdown.
