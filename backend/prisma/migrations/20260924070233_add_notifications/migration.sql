-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'PROJECT_STATUS_CHANGED', 'FILE_UPLOADED', 'MENTION', 'SYSTEM');

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "projectId" INTEGER,
    "fileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
