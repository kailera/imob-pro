ALTER TABLE "vistoria" ADD COLUMN "enderecoSnapshot" JSONB;

UPDATE "vistoria" AS v
SET "enderecoSnapshot" = jsonb_build_object(
  'logradouro', i."logradouro",
  'numero', i."numero",
  'complemento', i."complemento",
  'bairro', i."bairro",
  'cidade', i."cidade",
  'uf', i."uf"
)
FROM "imovel" AS i
WHERE i."id" = v."imovelId"
  AND v."enderecoSnapshot" IS NULL;
