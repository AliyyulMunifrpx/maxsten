-- CreateTable
CREATE TABLE "pending_supabase_cleanup" (
    "supbase_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "pending_supabase_cleanup_pkey" PRIMARY KEY ("supbase_id")
);
