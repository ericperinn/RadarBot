-- CreateTable
CREATE TABLE "NotificationSent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subscriptionId" INTEGER NOT NULL,
    "externalMatchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationSent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("channelId", "createdAt", "guildId", "id", "teamId", "userId") SELECT "channelId", "createdAt", "guildId", "id", "teamId", "userId" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE INDEX "Subscription_teamId_idx" ON "Subscription"("teamId");
CREATE INDEX "Subscription_guildId_idx" ON "Subscription"("guildId");
CREATE INDEX "Subscription_active_idx" ON "Subscription"("active");
CREATE UNIQUE INDEX "Subscription_userId_teamId_guildId_key" ON "Subscription"("userId", "teamId", "guildId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "NotificationSent_sentAt_idx" ON "NotificationSent"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSent_subscriptionId_externalMatchId_kind_key" ON "NotificationSent"("subscriptionId", "externalMatchId", "kind");
