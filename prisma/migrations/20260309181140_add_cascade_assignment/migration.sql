-- DropForeignKey
ALTER TABLE "assignmentAttempt" DROP CONSTRAINT "assignmentAttempt_assignmentId_fkey";

-- AddForeignKey
ALTER TABLE "assignmentAttempt" ADD CONSTRAINT "assignmentAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
