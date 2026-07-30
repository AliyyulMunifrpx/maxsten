/*
  Warnings:

  - Added the required column `updated_at` to the `pending_supabase_cleanup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pending_supabase_cleanup" ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "needs_manual_review" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
