-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_gaze_samples" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL DEFAULT '',
    "phase" TEXT NOT NULL DEFAULT 'experiment',
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "timestamp" REAL NOT NULL,
    "clientTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gaze_samples_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_gaze_samples" ("clientTime", "createdAt", "id", "timestamp", "userId", "videoId", "x", "y") SELECT "clientTime", "createdAt", "id", "timestamp", "userId", "videoId", "x", "y" FROM "gaze_samples";
DROP TABLE "gaze_samples";
ALTER TABLE "new_gaze_samples" RENAME TO "gaze_samples";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
