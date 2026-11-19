DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS duplicate_complaints CASCADE;
DROP TABLE IF EXISTS complaint_comments CASCADE;
DROP TABLE IF EXISTS complaint_status_history CASCADE;
DROP TABLE IF EXISTS complaint_assignments CASCADE;
DROP TABLE IF EXISTS complaint_images CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS wards CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

DROP TYPE IF EXISTS complaint_priority CASCADE;
DROP TYPE IF EXISTS complaint_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

CREATE TYPE user_role AS ENUM (
    'CITIZEN',
    'STAFF',
    'DEPT_ADMIN',
    'SUPER_ADMIN'
);

CREATE TYPE complaint_status AS ENUM (
    'REPORTED',
    'UNDER_REVIEW',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
    'REJECTED'
);

CREATE TYPE complaint_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TABLE departments (
    department_id INT GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_departments PRIMARY KEY (department_id),
    CONSTRAINT uq_departments_name UNIQUE (name),
    CONSTRAINT chk_departments_name_length CHECK (char_length(trim(name)) >= 3),
    CONSTRAINT chk_departments_email_format CHECK (
        contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

CREATE TABLE wards (
    ward_id INT GENERATED ALWAYS AS IDENTITY,
    ward_number VARCHAR(20) NOT NULL,
    ward_name VARCHAR(100) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,

    CONSTRAINT pk_wards PRIMARY KEY (ward_id),
    CONSTRAINT uq_wards_ward_number UNIQUE (ward_number),
    CONSTRAINT chk_wards_number_not_empty CHECK (char_length(trim(ward_number)) >= 1),
    CONSTRAINT chk_wards_name_not_empty CHECK (char_length(trim(ward_name)) >= 1),
    CONSTRAINT chk_wards_zone_not_empty CHECK (char_length(trim(zone_name)) >= 1)
);

CREATE TABLE categories (
    category_id INT GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    department_id INT NOT NULL,
    default_priority complaint_priority NOT NULL DEFAULT 'MEDIUM',
    sla_hours INT NOT NULL DEFAULT 72,

    CONSTRAINT pk_categories PRIMARY KEY (category_id),
    CONSTRAINT uq_categories_name UNIQUE (name),
    CONSTRAINT fk_categories_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_categories_name_not_empty CHECK (char_length(trim(name)) >= 2),
    CONSTRAINT chk_categories_sla_positive CHECK (sla_hours > 0)
);

CREATE TABLE users (
    user_id UUID DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CITIZEN',
    department_id INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_users_name_length CHECK (char_length(trim(name)) >= 2),
    CONSTRAINT chk_users_email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT chk_users_phone_not_empty CHECK (char_length(trim(phone)) >= 5),
    CONSTRAINT chk_users_department_role CHECK (
        (role = 'CITIZEN' AND department_id IS NULL) OR
        (role IN ('STAFF', 'DEPT_ADMIN') AND department_id IS NOT NULL) OR
        (role = 'SUPER_ADMIN')
    )
);

CREATE TABLE complaints (
    complaint_id UUID DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL,
    category_id INT NOT NULL,
    ward_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    landmark VARCHAR(255) NULL,
    status complaint_status NOT NULL DEFAULT 'REPORTED',
    priority complaint_priority NOT NULL DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_complaints PRIMARY KEY (complaint_id),
    CONSTRAINT fk_complaints_citizen FOREIGN KEY (citizen_id)
        REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaints_category FOREIGN KEY (category_id)
        REFERENCES categories (category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaints_ward FOREIGN KEY (ward_id)
        REFERENCES wards (ward_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_complaints_title_length CHECK (char_length(trim(title)) >= 5),
    CONSTRAINT chk_complaints_description_length CHECK (char_length(trim(description)) >= 10),
    CONSTRAINT chk_complaints_latitude_range CHECK (latitude BETWEEN -90.000000 AND 90.000000),
    CONSTRAINT chk_complaints_longitude_range CHECK (longitude BETWEEN -180.000000 AND 180.000000)
);

CREATE TABLE complaint_images (
    image_id UUID DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    caption VARCHAR(255) NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_complaint_images PRIMARY KEY (image_id),
    CONSTRAINT uq_complaint_images_url UNIQUE (image_url),
    CONSTRAINT fk_complaint_images_complaint FOREIGN KEY (complaint_id)
        REFERENCES complaints (complaint_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_complaint_images_url_protocol CHECK (image_url ~* '^https?://.+$')
);

CREATE TABLE complaint_assignments (
    assignment_id BIGINT GENERATED ALWAYS AS IDENTITY,
    complaint_id UUID NOT NULL,
    department_id INT NOT NULL,
    assigned_to_officer_id UUID NULL,
    assigned_by_user_id UUID NOT NULL,
    notes TEXT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_complaint_assignments PRIMARY KEY (assignment_id),
    CONSTRAINT fk_complaint_assignments_complaint FOREIGN KEY (complaint_id)
        REFERENCES complaints (complaint_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaint_assignments_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaint_assignments_officer FOREIGN KEY (assigned_to_officer_id)
        REFERENCES users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaint_assignments_assigned_by FOREIGN KEY (assigned_by_user_id)
        REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE complaint_status_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY,
    complaint_id UUID NOT NULL,
    previous_status complaint_status NULL,
    new_status complaint_status NOT NULL,
    changed_by_user_id UUID NOT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_complaint_status_history PRIMARY KEY (history_id),
    CONSTRAINT fk_status_history_complaint FOREIGN KEY (complaint_id)
        REFERENCES complaints (complaint_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_status_history_changed_by FOREIGN KEY (changed_by_user_id)
        REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_status_history_transition CHECK (previous_status IS DISTINCT FROM new_status)
);

CREATE TABLE complaint_comments (
    comment_id BIGINT GENERATED ALWAYS AS IDENTITY,
    complaint_id UUID NOT NULL,
    user_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    is_official_update BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_complaint_comments PRIMARY KEY (comment_id),
    CONSTRAINT fk_complaint_comments_complaint FOREIGN KEY (complaint_id)
        REFERENCES complaints (complaint_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaint_comments_user FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_complaint_comments_text_not_empty CHECK (char_length(trim(comment_text)) >= 1)
);

CREATE TABLE duplicate_complaints (
    duplicate_complaint_id UUID NOT NULL,
    canonical_complaint_id UUID NOT NULL,
    detected_by_user_id UUID NULL,
    confidence_score NUMERIC(4,3) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_duplicate_complaints PRIMARY KEY (duplicate_complaint_id),
    CONSTRAINT fk_duplicate_complaints_duplicate FOREIGN KEY (duplicate_complaint_id)
        REFERENCES complaints (complaint_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_duplicate_complaints_canonical FOREIGN KEY (canonical_complaint_id)
        REFERENCES complaints (complaint_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_duplicate_complaints_detected_by FOREIGN KEY (detected_by_user_id)
        REFERENCES users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_duplicate_not_self CHECK (duplicate_complaint_id <> canonical_complaint_id),
    CONSTRAINT chk_duplicate_confidence_range CHECK (
        confidence_score IS NULL OR (confidence_score >= 0.000 AND confidence_score <= 1.000)
    )
);

CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL,
    complaint_id UUID NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_notifications PRIMARY KEY (notification_id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_complaint FOREIGN KEY (complaint_id)
        REFERENCES complaints (complaint_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_notifications_title_not_empty CHECK (char_length(trim(title)) >= 1),
    CONSTRAINT chk_notifications_message_not_empty CHECK (char_length(trim(message)) >= 1)
);
