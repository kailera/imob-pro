CREATE TABLE "vistoria_locatario" (
  "vistoriaId" TEXT NOT NULL,
  "locatarioId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vistoria_locatario_pkey" PRIMARY KEY ("vistoriaId", "locatarioId")
);

CREATE INDEX "vistoria_locatario_locatarioId_idx"
ON "vistoria_locatario"("locatarioId");

ALTER TABLE "vistoria_locatario"
ADD CONSTRAINT "vistoria_locatario_vistoriaId_fkey"
FOREIGN KEY ("vistoriaId") REFERENCES "vistoria"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vistoria_locatario"
ADD CONSTRAINT "vistoria_locatario_locatarioId_fkey"
FOREIGN KEY ("locatarioId") REFERENCES "Locatario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "vistoria_locatario" ("vistoriaId", "locatarioId")
SELECT "id", "locatarioId"
FROM "vistoria"
WHERE "locatarioId" IS NOT NULL
ON CONFLICT DO NOTHING;
