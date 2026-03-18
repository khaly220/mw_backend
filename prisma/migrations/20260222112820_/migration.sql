/*
  Warnings:

  - You are about to drop the column `lessonId` on the `AIInteraction` table. All the data in the column will be lost.
  - You are about to drop the `Lesson` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('LESSON', 'TOPIC', 'SUBTOPIC');

-- DropForeignKey
ALTER TABLE "AIInteraction" DROP CONSTRAINT "AIInteraction_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_quizId_fkey";

-- AlterTable
ALTER TABLE "AIInteraction" DROP COLUMN "lessonId",
ADD COLUMN     "contentId" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "contentId" TEXT;

-- DropTable
DROP TABLE "Lesson";

-- CreateTable
CREATE TABLE "CourseContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "notes" TEXT,
    "videoUrl" TEXT,
    "materialUrl" TEXT,
    "reviewPoints" TEXT[],
    "parentId" TEXT,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseContent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CourseContent" ADD CONSTRAINT "CourseContent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CourseContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseContent" ADD CONSTRAINT "CourseContent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "CourseContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "CourseContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
