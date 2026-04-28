-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "videoSet" TEXT NOT NULL DEFAULT 'A',
    "trainingGroup" TEXT NOT NULL DEFAULT '1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("condition", "createdAt", "id", "participantId", "updatedAt", "videoSet") SELECT "condition", "createdAt", "id", "participantId", "updatedAt", "videoSet" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_participantId_key" ON "users"("participantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
