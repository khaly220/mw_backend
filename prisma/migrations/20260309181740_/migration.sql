-- DropForeignKey
ALTER TABLE "assignmentClass" DROP CONSTRAINT "assignmentClass_assignmentId_fkey";

-- AddForeignKey
ALTER TABLE "assignmentClass" ADD CONSTRAINT "assignmentClass_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
