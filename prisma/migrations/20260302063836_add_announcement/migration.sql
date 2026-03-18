/*
  Warnings:

  - You are about to drop the column `question` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Quiz` table. All the data in the column will be lost.
  - Added the required column `prompt` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Question` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_quizId_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "question",
ADD COLUMN     "prompt" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "answer" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "description",
ADD COLUMN     "courseId" TEXT;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "graded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passed" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
