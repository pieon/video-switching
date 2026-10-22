-- CreateTable
CREATE TABLE "display_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientTime" DATETIME,
    "innerWidth" INTEGER NOT NULL,
    "innerHeight" INTEGER NOT NULL,
    "devicePixelRatio" REAL NOT NULL,
    "screenWidth" INTEGER NOT NULL,
    "screenHeight" INTEGER NOT NULL,
    "screenX" INTEGER NOT NULL,
    "screenY" INTEGER NOT NULL,
    "outerWidth" INTEGER NOT NULL,
    "outerHeight" INTEGER NOT NULL,
    "recordedWidth" INTEGER,
    "recordedHeight" INTEGER,
    CONSTRAINT "display_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
