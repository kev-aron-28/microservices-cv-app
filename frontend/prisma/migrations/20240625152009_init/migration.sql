/*
  Warnings:

  - Changed the type of `skills` on the `CV` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workHistory` on the `CV` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `education` on the `CV` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "CV" DROP COLUMN "skills",
ADD COLUMN     "skills" JSONB NOT NULL,
DROP COLUMN "workHistory",
ADD COLUMN     "workHistory" JSONB NOT NULL,
DROP COLUMN "education",
ADD COLUMN     "education" JSONB NOT NULL;
