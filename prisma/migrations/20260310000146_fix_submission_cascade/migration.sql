-- DropForeignKey
ALTER TABLE "SubmissionAnswer" DROP CONSTRAINT "SubmissionAnswer_questionId_fkey";

-- AddForeignKey
ALTER TABLE "SubmissionAnswer" ADD CONSTRAINT "SubmissionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
