-- Create enums
CREATE TYPE "global_role" AS ENUM ('admin', 'user');
CREATE TYPE "club_role" AS ENUM ('admin', 'photographer', 'member');
CREATE TYPE "event_category" AS ENUM ('cultural', 'sports', 'workshop', 'trip', 'party', 'hackathon', 'other');
CREATE TYPE "visibility" AS ENUM ('public', 'private');
CREATE TYPE "media_type" AS ENUM ('photo', 'video');
CREATE TYPE "notification_type" AS ENUM ('like', 'comment', 'reply', 'tag');

-- Users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "global_role" "global_role" NOT NULL DEFAULT 'user',
    "avatar_url" TEXT,
    "face_descriptor" float8[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Clubs table
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- Club members table
CREATE TABLE "club_members" (
    "club_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "club_role" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "club_members_pkey" PRIMARY KEY ("club_id","user_id")
);

-- Events table
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "category" "event_category" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'public',
    "cover_photo_id" TEXT,
    "created_by" TEXT NOT NULL,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "events_search_vector_idx" ON "events" USING GIN ("search_vector");

-- Media table
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "compressed_url" TEXT,
    "thumb_sm_url" TEXT,
    "thumb_md_url" TEXT,
    "media_type" "media_type" NOT NULL,
    "size_bytes" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "face_ids" TEXT[] NOT NULL DEFAULT '{}',
    "caption" TEXT,
    "search_vector" tsvector,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "media_event_id_idx" ON "media"("event_id");
CREATE INDEX "media_search_vector_idx" ON "media" USING GIN ("search_vector");
CREATE INDEX "media_tags_idx" ON "media" USING GIN ("tags");
CREATE INDEX "media_face_ids_idx" ON "media" USING GIN ("face_ids");

-- Likes table
CREATE TABLE "likes" (
    "user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "likes_pkey" PRIMARY KEY ("user_id","media_id")
);

-- Favourites table
CREATE TABLE "favourites" (
    "user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favourites_pkey" PRIMARY KEY ("user_id","media_id")
);

-- Comments table
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "text" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Photo tags table
CREATE TABLE "photo_tags" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "tagged_by_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photo_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "photo_tags_media_id_user_id_key" ON "photo_tags"("media_id", "user_id");

-- Downloads table
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "downloaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- Notifications table
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "media_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_recipient_id_read_at_idx" ON "notifications"("recipient_id", "read_at");

-- Refresh tokens table
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- Foreign key constraints
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media" ADD CONSTRAINT "media_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media" ADD CONSTRAINT "media_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_tagged_by_id_fkey" FOREIGN KEY ("tagged_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_tags" ADD CONSTRAINT "photo_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- tsvector trigger for events: updates search_vector on name/description change
CREATE OR REPLACE FUNCTION events_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_search_vector_trigger
BEFORE INSERT OR UPDATE OF name, description ON events
FOR EACH ROW EXECUTE FUNCTION events_search_vector_update();

-- tsvector trigger for media: updates search_vector on tags change + uploader username join
CREATE OR REPLACE FUNCTION media_search_vector_update() RETURNS trigger AS $$
DECLARE
  uploader_username TEXT;
BEGIN
  SELECT username INTO uploader_username FROM users WHERE id = NEW.uploader_id;
  NEW.search_vector := to_tsvector('english',
    coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
    coalesce(uploader_username, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_search_vector_trigger
BEFORE INSERT OR UPDATE OF tags, uploader_id ON media
FOR EACH ROW EXECUTE FUNCTION media_search_vector_update();
