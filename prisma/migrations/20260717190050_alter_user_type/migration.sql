/*
  Warnings:

  - The values [VISTORIADOR] on the enum `UsersRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UsersRole_new" AS ENUM ('OPERADOR', 'CORRETOR', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UsersRole_new" USING ("role"::text::"UsersRole_new");
ALTER TYPE "UsersRole" RENAME TO "UsersRole_old";
ALTER TYPE "UsersRole_new" RENAME TO "UsersRole";
DROP TYPE "public"."UsersRole_old";
COMMIT;
