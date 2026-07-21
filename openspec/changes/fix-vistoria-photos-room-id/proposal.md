## Why

Ao adicionar novos cômodos/ambientes em uma vistoria e salvar fotos neles, as fotos e mídias se desassociam do cômodo após salvar a vistoria. Isso ocorre porque o front-end gera IDs temporários aleatórios que não são UUIDs, fazendo com que o servidor gere um UUID novo e ignore o ID do front-end, deixando as fotos atreladas ao ID temporário órfão. Além disso, arquivos grandes de mídia (> 1MB) falham no upload em Server Actions devido ao limite padrão de payload do Next.js.

## What Changes

- Modificar a geração de IDs de novos ambientes no front-end para usar um UUID v4 válido de forma que o ID coincida perfeitamente com os comentários e fotos vinculados.
- Garantir que o back-end preserve e salve o UUID enviado pelo cliente se ele for um UUID válido.
- Manter o `bodySizeLimit` em `600mb` no `next.config.ts` para habilitar uploads de mídias pesadas via Server Actions.

## Capabilities

### New Capabilities
- `vistorias-cadastro-fotos`: Lógica resiliente de cadastro de ambientes e associação de mídias/fotos na vistoria.

### Modified Capabilities
<!-- Nenhuma capacidade existente de especificação está sendo modificada -->

## Impact

- `components/vistorias/ficha-vistoria/RoomBuilderForm.tsx`
- `app/(admin)/vistorias/actions.ts`
- `next.config.ts`
