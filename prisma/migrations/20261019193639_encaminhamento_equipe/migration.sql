-- CreateEnum
CREATE TYPE "handoff_status" AS ENUM ('NONE', 'REQUESTED', 'HUMAN_ACTIVE');

-- CreateEnum
CREATE TYPE "session_priority" AS ENUM ('NORMAL', 'HIGH');

-- AlterEnum
ALTER TYPE "message_role" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "handoff_reason" TEXT,
ADD COLUMN     "handoff_requested_at" TIMESTAMPTZ(3),
ADD COLUMN     "handoff_status" "handoff_status" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "human_active_until" TIMESTAMPTZ(3),
ADD COLUMN     "priority" "session_priority" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "chat_sessions_handoff_status_idx" ON "chat_sessions"("handoff_status");
