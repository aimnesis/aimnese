/*
  Warnings:

  - You are about to alter the column `cpf` on the `DoctorProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(11)`.
  - You are about to alter the column `crm` on the `DoctorProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(16)`.
  - You are about to alter the column `crmUF` on the `DoctorProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(2)`.
  - You are about to alter the column `stateUF` on the `DoctorProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(2)`.
  - A unique constraint covering the columns `[crm,crmUF]` on the table `DoctorProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."DoctorProfile" ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "whatsapp" VARCHAR(20),
ALTER COLUMN "cpf" SET DATA TYPE CHAR(11),
ALTER COLUMN "crm" SET DATA TYPE VARCHAR(16),
ALTER COLUMN "crmUF" SET DATA TYPE CHAR(2),
ALTER COLUMN "stateUF" SET DATA TYPE CHAR(2);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_crm_crmUF_key" ON "public"."DoctorProfile"("crm", "crmUF");
