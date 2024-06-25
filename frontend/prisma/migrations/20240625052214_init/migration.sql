/*
  Warnings:

  - The `skills` column on the `CV` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `workHistory` column on the `CV` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `education` column on the `CV` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[employeeId]` on the table `CV` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeId` to the `CV` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cvId` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CV" ADD COLUMN     "employeeId" TEXT NOT NULL,
DROP COLUMN "skills",
ADD COLUMN     "skills" JSONB[],
DROP COLUMN "workHistory",
ADD COLUMN     "workHistory" JSONB[],
DROP COLUMN "education",
ADD COLUMN     "education" JSONB[];

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "cvId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CV_employeeId_key" ON "CV"("employeeId");

-- AddForeignKey
ALTER TABLE "CV" ADD CONSTRAINT "CV_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
