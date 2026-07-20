-- AlterTable
ALTER TABLE "Locatario" ADD COLUMN     "conjugeCpf" TEXT,
ADD COLUMN     "conjugeDataNasc" TEXT,
ADD COLUMN     "conjugeEmail" TEXT,
ADD COLUMN     "conjugeNacionalidade" TEXT,
ADD COLUMN     "conjugeNome" TEXT,
ADD COLUMN     "conjugeOrgaoEmissor" TEXT,
ADD COLUMN     "conjugeProfissao" TEXT,
ADD COLUMN     "conjugeRendaMensal" DOUBLE PRECISION,
ADD COLUMN     "conjugeRg" TEXT,
ADD COLUMN     "conjugeRne" TEXT,
ADD COLUMN     "conjugeTelefone" JSONB,
ADD COLUMN     "rendaMensal" DOUBLE PRECISION,
ADD COLUMN     "rne" TEXT;
