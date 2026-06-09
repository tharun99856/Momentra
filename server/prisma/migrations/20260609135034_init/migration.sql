/*
  Warnings:

  - You are about to alter the column `search_vector` on the `events` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("tsvector")` to `Text`.
  - You are about to alter the column `search_vector` on the `media` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("tsvector")` to `Text`.

*/
-- DropIndex
DROP INDEX "events_search_vector_idx";

-- DropIndex
DROP INDEX "media_face_ids_idx";

-- DropIndex
DROP INDEX "media_search_vector_idx";

-- DropIndex
DROP INDEX "media_tags_idx";

-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "search_vector" SET DATA TYPE TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "media" ALTER COLUMN "search_vector" SET DATA TYPE TEXT;
