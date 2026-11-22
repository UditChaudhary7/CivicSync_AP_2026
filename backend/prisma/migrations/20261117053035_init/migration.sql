-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CITIZEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "photoUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Issue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upvote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "issueId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Upvote_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_trackingNumber_key" ON "Issue"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Upvote_userId_issueId_key" ON "Upvote"("userId", "issueId");

-- ============================================================================
-- CivicSync DBMS Relational Schema (Linked from dbms/03_schema.sql)
-- Target RDBMS: SQLite / PostgreSQL Compatibility Layer
-- Includes: departments, wards, categories, complaints, complaint_images,
-- complaint_assignments, complaint_status_history, complaint_comments,
-- duplicate_complaints, notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS "departments" (
    "department_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "wards" (
    "ward_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "ward_number" TEXT NOT NULL UNIQUE,
    "ward_name" TEXT NOT NULL,
    "zone_name" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
    "category_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "department_id" INTEGER NOT NULL,
    "default_priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "sla_hours" INTEGER NOT NULL DEFAULT 72,
    CONSTRAINT "fk_categories_department" FOREIGN KEY ("department_id") REFERENCES "departments" ("department_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "complaints" (
    "complaint_id" TEXT PRIMARY KEY,
    "citizen_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "ward_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "landmark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_complaints_citizen" FOREIGN KEY ("citizen_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_complaints_category" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_complaints_ward" FOREIGN KEY ("ward_id") REFERENCES "wards" ("ward_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "complaint_images" (
    "image_id" TEXT PRIMARY KEY,
    "complaint_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL UNIQUE,
    "caption" TEXT,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_complaint_images_complaint" FOREIGN KEY ("complaint_id") REFERENCES "complaints" ("complaint_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "complaint_assignments" (
    "assignment_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "complaint_id" TEXT NOT NULL,
    "department_id" INTEGER NOT NULL,
    "assigned_to_officer_id" INTEGER,
    "assigned_by_user_id" INTEGER NOT NULL,
    "notes" TEXT,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_complaint_assignments_complaint" FOREIGN KEY ("complaint_id") REFERENCES "complaints" ("complaint_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_complaint_assignments_department" FOREIGN KEY ("department_id") REFERENCES "departments" ("department_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "complaint_status_history" (
    "history_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "complaint_id" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "changed_by_user_id" INTEGER NOT NULL,
    "remarks" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_status_history_complaint" FOREIGN KEY ("complaint_id") REFERENCES "complaints" ("complaint_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "complaint_comments" (
    "comment_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "complaint_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "comment_text" TEXT NOT NULL,
    "is_official_update" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_complaint_comments_complaint" FOREIGN KEY ("complaint_id") REFERENCES "complaints" ("complaint_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "duplicate_complaints" (
    "duplicate_complaint_id" TEXT PRIMARY KEY,
    "canonical_complaint_id" TEXT NOT NULL,
    "detected_by_user_id" INTEGER,
    "confidence_score" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_duplicate_complaints_duplicate" FOREIGN KEY ("duplicate_complaint_id") REFERENCES "complaints" ("complaint_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_duplicate_complaints_canonical" FOREIGN KEY ("canonical_complaint_id") REFERENCES "complaints" ("complaint_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "notification_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "complaint_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
