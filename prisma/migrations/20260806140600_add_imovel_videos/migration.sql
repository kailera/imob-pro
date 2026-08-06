-- AlterTable
ALTER TABLE "imovel"
ADD COLUMN "videos" TEXT[] DEFAULT ARRAY[]::TEXT[];
