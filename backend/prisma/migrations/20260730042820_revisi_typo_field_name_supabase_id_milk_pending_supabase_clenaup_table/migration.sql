/*
  Warnings:

  - The primary key for the `pending_supabase_cleanup` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `supbase_id` on the `pending_supabase_cleanup` table. All the data in the column will be lost.
  - Added the required column `supabase_id` to the `pending_supabase_cleanup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pending_supabase_cleanup" DROP CONSTRAINT "pending_supabase_cleanup_pkey",
DROP COLUMN "supbase_id",
ADD COLUMN     "supabase_id" TEXT NOT NULL,
ADD CONSTRAINT "pending_supabase_cleanup_pkey" PRIMARY KEY ("supabase_id");
