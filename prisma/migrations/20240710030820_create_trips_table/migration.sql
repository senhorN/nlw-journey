-- CreateTable
CREATE TABLE "trips" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "destino" TEXT NOT NULL,
    "starts_at" DATETIME NOT NULL,
    "ends_at" DATETIME NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
