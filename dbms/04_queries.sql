-- ============================================================================
-- CivicSync: Smart Civic Issue Reporting and Tracking Platform
-- Deliverable: CP3 — SQL Queries Final Review and Validation
-- Target RDBMS: PostgreSQL 16+
-- Schema Reference: dbms/03_schema.sql
-- Alignment: Fully consistent with CP1 Normalization and CP2 ERD
-- ============================================================================
-- Parameter Convention: Uses Node.js/Express 'pg' parameterized placeholders ($1, $2, etc.)
-- Classification: All queries are organized into distinct READ and WRITE sections.
-- Every retrieval query is marked with '-- READ'.
-- Every data modification query is marked with '-- WRITE'.
-- ============================================================================


-- ============================================================================
-- SECTION 1: APPLICATION READ QUERIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Module 1: Authentication & User Profile Management
-- ----------------------------------------------------------------------------

-- READ: Query 1.1 - User Authentication by Email
-- Retrieves user credentials and system role during citizen or staff login.
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.phone,
    u.password_hash,
    u.role,
    u.department_id,
    u.created_at,
    u.updated_at
FROM users u
WHERE u.email = LOWER(TRIM($1));

-- READ: Query 1.2 - User Profile with Department Details
-- Retrieves full profile metadata for the authenticated session, including department name if staff.
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.phone,
    u.role,
    u.department_id,
    d.name AS department_name,
    d.contact_email AS department_email,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN departments d ON u.department_id = d.department_id
WHERE u.user_id = $1;

-- READ: Query 1.3 - List Field Officers by Department
-- Retrieves active inspection officers within a department for assignment allocation.
SELECT 
    u.user_id AS officer_id,
    u.name AS officer_name,
    u.email AS officer_email,
    u.phone AS officer_phone,
    d.name AS department_name
FROM users u
INNER JOIN departments d ON u.department_id = d.department_id
WHERE u.department_id = $1
  AND u.role = 'STAFF'
ORDER BY u.name ASC;


-- ----------------------------------------------------------------------------
-- Module 2: Administrative Lookups & Taxonomies
-- ----------------------------------------------------------------------------

-- READ: Query 2.1 - Retrieve All Municipal Departments
-- Populates departmental directories and administrative triage dropdowns with managed category counts.
SELECT 
    d.department_id,
    d.name AS department_name,
    d.contact_email,
    d.contact_phone,
    d.created_at,
    COUNT(c.category_id) AS total_categories_managed
FROM departments d
LEFT JOIN categories c ON d.department_id = c.department_id
GROUP BY d.department_id, d.name, d.contact_email, d.contact_phone, d.created_at
ORDER BY d.name ASC;

-- READ: Query 2.2 - Retrieve Issue Categories with Responsible Department
-- Populates citizen complaint submission forms with SLA hours and responsible department info.
SELECT 
    c.category_id,
    c.name AS category_name,
    c.description,
    c.department_id,
    d.name AS department_name,
    c.default_priority,
    c.sla_hours
FROM categories c
INNER JOIN departments d ON c.department_id = d.department_id
ORDER BY c.name ASC;

-- READ: Query 2.3 - Retrieve Categories Filtered by Department
-- Populates category filters specific to a department administrator's jurisdiction.
SELECT 
    c.category_id,
    c.name AS category_name,
    c.description,
    c.default_priority,
    c.sla_hours
FROM categories c
WHERE c.department_id = $1
ORDER BY c.name ASC;

-- READ: Query 2.4 - Retrieve All Wards and Administrative Zones
-- Populates ward selection menus during complaint filing and geographic triage.
SELECT 
    w.ward_id,
    w.ward_number,
    w.ward_name,
    w.zone_name
FROM wards w
ORDER BY w.zone_name ASC, w.ward_number ASC;


-- ----------------------------------------------------------------------------
-- Module 3: Citizen Complaint Management
-- ----------------------------------------------------------------------------

-- READ: Query 3.1 - Citizen "My Complaints" Summary List (Paginated & Sorted)
-- Retrieves all civic complaints submitted by a citizen with primary thumbnail, ward, and timestamps.
SELECT 
    c.complaint_id,
    c.title,
    cat.name AS category_name,
    d.name AS department_name,
    w.ward_number,
    w.zone_name,
    c.status,
    c.priority,
    c.created_at,
    c.updated_at,
    (SELECT img.image_url 
     FROM complaint_images img 
     WHERE img.complaint_id = c.complaint_id 
     ORDER BY img.uploaded_at ASC 
     LIMIT 1) AS primary_thumbnail_url
FROM complaints c
INNER JOIN categories cat ON c.category_id = cat.category_id
INNER JOIN departments d ON cat.department_id = d.department_id
INNER JOIN wards w ON c.ward_id = w.ward_id
WHERE c.citizen_id = $1
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3;

-- READ: Query 3.2 - Citizen Complaints Total Count
-- Used for calculating pagination metadata for the citizen complaint dashboard.
SELECT COUNT(*) AS total_complaints
FROM complaints
WHERE citizen_id = $1;

-- READ: Query 3.3 - Detailed Single Complaint View (360-Degree Profile)
-- Retrieves comprehensive metadata for a specific complaint ticket including dynamic SLA calculation.
SELECT 
    c.complaint_id,
    c.citizen_id,
    u.name AS citizen_name,
    u.email AS citizen_email,
    u.phone AS citizen_phone,
    c.category_id,
    cat.name AS category_name,
    cat.sla_hours,
    cat.department_id,
    d.name AS department_name,
    c.ward_id,
    w.ward_number,
    w.ward_name,
    w.zone_name,
    c.title,
    c.description,
    c.latitude,
    c.longitude,
    c.landmark,
    c.status,
    c.priority,
    c.created_at,
    c.updated_at,
    c.created_at + (cat.sla_hours * INTERVAL '1 hour') AS sla_deadline,
    CASE 
        WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 'RESOLVED'
        WHEN CURRENT_TIMESTAMP > (c.created_at + (cat.sla_hours * INTERVAL '1 hour')) THEN 'SLA_BREACHED'
        ELSE 'WITHIN_SLA'
    END AS sla_status
FROM complaints c
INNER JOIN users u ON c.citizen_id = u.user_id
INNER JOIN categories cat ON c.category_id = cat.category_id
INNER JOIN departments d ON cat.department_id = d.department_id
INNER JOIN wards w ON c.ward_id = w.ward_id
WHERE c.complaint_id = $1;


-- ----------------------------------------------------------------------------
-- Module 4: Sub-Entity Retrieval (Evidence, Audit Trail & Comments)
-- ----------------------------------------------------------------------------

-- READ: Query 4.1 - Retrieve Photographic Evidence Attachments
-- Retrieves all photo URLs and captions associated with a specific complaint.
SELECT 
    ci.image_id,
    ci.complaint_id,
    ci.image_url,
    ci.caption,
    ci.uploaded_at
FROM complaint_images ci
WHERE ci.complaint_id = $1
ORDER BY ci.uploaded_at ASC;

-- READ: Query 4.2 - Retrieve Immutable Complaint Status Audit Trail
-- Fetches full chronological lifecycle transitions, recording who changed status and remarks.
SELECT 
    sh.history_id,
    sh.complaint_id,
    sh.previous_status,
    sh.new_status,
    sh.changed_by_user_id,
    u.name AS changed_by_name,
    u.role AS changed_by_role,
    sh.remarks,
    sh.created_at AS transition_timestamp
FROM complaint_status_history sh
INNER JOIN users u ON sh.changed_by_user_id = u.user_id
WHERE sh.complaint_id = $1
ORDER BY sh.created_at ASC;

-- READ: Query 4.3 - Retrieve Threaded Discussion Comments & Official Updates
-- Fetches citizen-authority communications and official municipal announcements.
SELECT 
    cm.comment_id,
    cm.complaint_id,
    cm.user_id,
    u.name AS author_name,
    u.role AS author_role,
    cm.comment_text,
    cm.is_official_update,
    cm.created_at
FROM complaint_comments cm
INNER JOIN users u ON cm.user_id = u.user_id
WHERE cm.complaint_id = $1
ORDER BY cm.created_at ASC;


-- ----------------------------------------------------------------------------
-- Module 5: Workflow Allocation & Assignment Retrieval
-- ----------------------------------------------------------------------------

-- READ: Query 5.1 - Retrieve Latest Active Assignment for a Complaint
-- Fetches the currently designated department and assigned field officer.
SELECT 
    ca.assignment_id,
    ca.complaint_id,
    ca.department_id,
    d.name AS department_name,
    ca.assigned_to_officer_id,
    officer.name AS officer_name,
    officer.email AS officer_email,
    officer.phone AS officer_phone,
    ca.assigned_by_user_id,
    assigner.name AS assigned_by_name,
    ca.notes AS assignment_notes,
    ca.assigned_at
FROM complaint_assignments ca
INNER JOIN departments d ON ca.department_id = d.department_id
LEFT JOIN users officer ON ca.assigned_to_officer_id = officer.user_id
INNER JOIN users assigner ON ca.assigned_by_user_id = assigner.user_id
WHERE ca.complaint_id = $1
ORDER BY ca.assigned_at DESC
LIMIT 1;

-- READ: Query 5.2 - Retrieve Full Assignment Delegation History
-- Tracks historical reassignments and escalations across departments and officers.
SELECT 
    ca.assignment_id,
    ca.complaint_id,
    ca.department_id,
    d.name AS department_name,
    ca.assigned_to_officer_id,
    COALESCE(officer.name, 'Unassigned / Department Pool') AS officer_name,
    assigner.name AS assigned_by_name,
    ca.notes,
    ca.assigned_at
FROM complaint_assignments ca
INNER JOIN departments d ON ca.department_id = d.department_id
LEFT JOIN users officer ON ca.assigned_to_officer_id = officer.user_id
INNER JOIN users assigner ON ca.assigned_by_user_id = assigner.user_id
WHERE ca.complaint_id = $1
ORDER BY ca.assigned_at ASC;

-- READ: Query 5.3 - Field Officer Assigned Work Orders
-- Retrieves tasks assigned to a specific field inspection officer, ordered by priority and date.
SELECT 
    c.complaint_id,
    c.title,
    cat.name AS category_name,
    w.ward_number,
    w.ward_name,
    c.latitude,
    c.longitude,
    c.landmark,
    c.status,
    c.priority,
    ca.assigned_at,
    ca.notes AS officer_instructions,
    c.created_at + (cat.sla_hours * INTERVAL '1 hour') AS sla_deadline
FROM complaint_assignments ca
INNER JOIN complaints c ON ca.complaint_id = c.complaint_id
INNER JOIN categories cat ON c.category_id = cat.category_id
INNER JOIN wards w ON c.ward_id = w.ward_id
WHERE ca.assigned_to_officer_id = $1
  AND c.status IN ('ASSIGNED', 'IN_PROGRESS')
ORDER BY 
    CASE c.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END ASC,
    c.created_at ASC;


-- ----------------------------------------------------------------------------
-- Module 6: Municipal Triage, Search, Filtering & Pagination
-- ----------------------------------------------------------------------------

-- READ: Query 6.1 - Admin Global Triage Queue (Multi-Criteria Filtering & Search)
-- Supports dynamic filtering by status, category, ward, priority, and text search with pagination.
SELECT 
    c.complaint_id,
    c.title,
    c.citizen_id,
    u.name AS citizen_name,
    cat.name AS category_name,
    d.name AS department_name,
    w.ward_number,
    w.zone_name,
    c.status,
    c.priority,
    c.created_at,
    c.created_at + (cat.sla_hours * INTERVAL '1 hour') AS sla_deadline,
    CASE 
        WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 'RESOLVED'
        WHEN CURRENT_TIMESTAMP > (c.created_at + (cat.sla_hours * INTERVAL '1 hour')) THEN 'SLA_BREACHED'
        ELSE 'WITHIN_SLA'
    END AS sla_status
FROM complaints c
INNER JOIN users u ON c.citizen_id = u.user_id
INNER JOIN categories cat ON c.category_id = cat.category_id
INNER JOIN departments d ON cat.department_id = d.department_id
INNER JOIN wards w ON c.ward_id = w.ward_id
WHERE ($1::complaint_status IS NULL OR c.status = $1)
  AND ($2::INT IS NULL OR c.category_id = $2)
  AND ($3::INT IS NULL OR c.ward_id = $3)
  AND ($4::complaint_priority IS NULL OR c.priority = $4)
  AND ($5::TEXT IS NULL OR (c.title ILIKE '%' || $5 || '%' OR c.description ILIKE '%' || $5 || '%'))
ORDER BY 
    CASE c.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END ASC,
    c.created_at DESC
LIMIT $6 OFFSET $7;

-- READ: Query 6.2 - Department-Specific Complaint Triage Queue
-- Restricts complaint triage queue to tickets belonging to a specific department.
SELECT 
    c.complaint_id,
    c.title,
    cat.name AS category_name,
    w.ward_number,
    w.ward_name,
    c.status,
    c.priority,
    c.created_at,
    c.created_at + (cat.sla_hours * INTERVAL '1 hour') AS sla_deadline,
    (SELECT off.name 
     FROM complaint_assignments ca 
     LEFT JOIN users off ON ca.assigned_to_officer_id = off.user_id
     WHERE ca.complaint_id = c.complaint_id 
     ORDER BY ca.assigned_at DESC 
     LIMIT 1) AS currently_assigned_to
FROM complaints c
INNER JOIN categories cat ON c.category_id = cat.category_id
INNER JOIN wards w ON c.ward_id = w.ward_id
WHERE cat.department_id = $1
  AND ($2::complaint_status IS NULL OR c.status = $2)
ORDER BY c.created_at DESC
LIMIT $3 OFFSET $4;


-- ----------------------------------------------------------------------------
-- Module 7: Geographic & Spatial Location Queries
-- ----------------------------------------------------------------------------

-- READ: Query 7.1 - Spatial Bounding-Box Complaint Search (Map Viewpins)
-- Retrieves active civic issues located within a viewport bounding box for map visualization.
SELECT 
    c.complaint_id,
    c.title,
    cat.name AS category_name,
    c.latitude,
    c.longitude,
    c.landmark,
    c.status,
    c.priority,
    c.created_at
FROM complaints c
INNER JOIN categories cat ON c.category_id = cat.category_id
WHERE c.latitude BETWEEN $1 AND $2
  AND c.longitude BETWEEN $3 AND $4
  AND c.status NOT IN ('CLOSED', 'REJECTED');

-- READ: Query 7.2 - Public Issues Feed by Ward
-- Fetches recent non-rejected complaints within a municipal ward with discussion and duplicate metrics.
SELECT 
    c.complaint_id,
    c.title,
    c.description,
    cat.name AS category_name,
    c.landmark,
    c.status,
    c.priority,
    c.created_at,
    (SELECT COUNT(*) FROM complaint_comments cm WHERE cm.complaint_id = c.complaint_id) AS total_comments,
    (SELECT COUNT(*) FROM duplicate_complaints dc WHERE dc.canonical_complaint_id = c.complaint_id) AS total_duplicate_reports
FROM complaints c
INNER JOIN categories cat ON c.category_id = cat.category_id
WHERE c.ward_id = $1
  AND c.status <> 'REJECTED'
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3;


-- ----------------------------------------------------------------------------
-- Module 8: Duplicate Complaint Management
-- ----------------------------------------------------------------------------

-- READ: Query 8.1 - Retrieve Duplicates Linked to a Canonical Complaint
-- Shows all redundant citizen filings consolidated under a primary master ticket.
SELECT 
    dc.duplicate_complaint_id,
    c.title AS duplicate_title,
    c.citizen_id AS reporting_citizen_id,
    u.name AS reporting_citizen_name,
    c.created_at AS reported_at,
    dc.confidence_score,
    dc.detected_by_user_id,
    detector.name AS detected_by_name,
    dc.created_at AS linked_at
FROM duplicate_complaints dc
INNER JOIN complaints c ON dc.duplicate_complaint_id = c.complaint_id
INNER JOIN users u ON c.citizen_id = u.user_id
LEFT JOIN users detector ON dc.detected_by_user_id = detector.user_id
WHERE dc.canonical_complaint_id = $1
ORDER BY dc.created_at DESC;

-- READ: Query 8.2 - Check if a Complaint is Flagged as a Duplicate
-- Verifies whether a given complaint has been merged into a canonical master ticket.
SELECT 
    dc.duplicate_complaint_id,
    dc.canonical_complaint_id,
    master.title AS canonical_title,
    master.status AS canonical_status,
    dc.confidence_score,
    dc.created_at AS linked_at
FROM duplicate_complaints dc
INNER JOIN complaints master ON dc.canonical_complaint_id = master.complaint_id
WHERE dc.duplicate_complaint_id = $1;

-- READ: Query 8.3 - Proximity & Category Duplicate Candidates Search
-- Identifies existing unresolved complaints within the same ward and category filed recently.
SELECT 
    c.complaint_id,
    c.title,
    c.description,
    c.latitude,
    c.longitude,
    c.status,
    c.created_at,
    ABS(c.latitude - $1) + ABS(c.longitude - $2) AS manhattan_distance_approx
FROM complaints c
WHERE c.category_id = $3
  AND c.ward_id = $4
  AND c.complaint_id <> $5
  AND c.status IN ('REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS')
  AND c.created_at >= CURRENT_TIMESTAMP - ($6 * INTERVAL '1 day')
ORDER BY manhattan_distance_approx ASC
LIMIT 5;


-- ----------------------------------------------------------------------------
-- Module 9: Asynchronous User Notifications
-- ----------------------------------------------------------------------------

-- READ: Query 9.1 - User Notification Inbox (Paginated)
-- Retrieves user notifications with read/unread statuses and linked complaints.
SELECT 
    n.notification_id,
    n.user_id,
    n.complaint_id,
    c.title AS complaint_title,
    n.title,
    n.message,
    n.is_read,
    n.created_at
FROM notifications n
LEFT JOIN complaints c ON n.complaint_id = c.complaint_id
WHERE n.user_id = $1
ORDER BY n.is_read ASC, n.created_at DESC
LIMIT $2 OFFSET $3;

-- READ: Query 9.2 - Count Unread User Notifications
-- Drives the red unread badge indicator in the web application navigation bar.
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1
  AND is_read = FALSE;


-- ----------------------------------------------------------------------------
-- Module 10: Analytics & Administrative Reporting Dashboard
-- ----------------------------------------------------------------------------

-- READ: Query 10.1 - Overall Complaint Status Metrics (Top-level KPI Cards)
-- Aggregates system-wide complaint status totals for the executive dashboard.
SELECT 
    COUNT(*) AS total_complaints,
    COUNT(*) FILTER (WHERE status = 'REPORTED') AS total_reported,
    COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') AS total_under_review,
    COUNT(*) FILTER (WHERE status = 'ASSIGNED') AS total_assigned,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS total_in_progress,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') AS total_resolved,
    COUNT(*) FILTER (WHERE status = 'CLOSED') AS total_closed,
    COUNT(*) FILTER (WHERE status = 'REJECTED') AS total_rejected
FROM complaints;

-- READ: Query 10.2 - Departmental Performance & SLA Compliance Metrics
-- Computes complaint resolution counts and average resolution times per department.
SELECT 
    d.department_id,
    d.name AS department_name,
    COUNT(c.complaint_id) AS total_complaints,
    COUNT(c.complaint_id) FILTER (WHERE c.status IN ('RESOLVED', 'CLOSED')) AS resolved_count,
    COUNT(c.complaint_id) FILTER (WHERE c.status IN ('REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS')) AS active_backlog,
    COUNT(c.complaint_id) FILTER (
        WHERE c.status NOT IN ('RESOLVED', 'CLOSED') 
          AND CURRENT_TIMESTAMP > (c.created_at + (cat.sla_hours * INTERVAL '1 hour'))
    ) AS sla_breached_count,
    ROUND(
        COALESCE(
            AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 3600) 
            FILTER (WHERE c.status IN ('RESOLVED', 'CLOSED')), 
            0
        )::NUMERIC, 
        2
    ) AS avg_resolution_time_hours
FROM departments d
LEFT JOIN categories cat ON d.department_id = cat.department_id
LEFT JOIN complaints c ON cat.category_id = c.category_id
GROUP BY d.department_id, d.name
ORDER BY total_complaints DESC;

-- READ: Query 10.3 - Complaint Volume by Issue Category & Priority Breakdown
-- Analyzes infrastructure failure distributions across categories and priorities.
SELECT 
    cat.category_id,
    cat.name AS category_name,
    d.name AS department_name,
    cat.default_priority,
    cat.sla_hours,
    COUNT(c.complaint_id) AS total_complaints,
    COUNT(c.complaint_id) FILTER (WHERE c.priority = 'CRITICAL') AS critical_count,
    COUNT(c.complaint_id) FILTER (WHERE c.priority = 'HIGH') AS high_count,
    COUNT(c.complaint_id) FILTER (WHERE c.priority = 'MEDIUM') AS medium_count,
    COUNT(c.complaint_id) FILTER (WHERE c.priority = 'LOW') AS low_count
FROM categories cat
INNER JOIN departments d ON cat.department_id = d.department_id
LEFT JOIN complaints c ON cat.category_id = c.category_id
GROUP BY cat.category_id, cat.name, d.name, cat.default_priority, cat.sla_hours
ORDER BY total_complaints DESC;

-- READ: Query 10.4 - Geographic Complaint Distribution by Ward & Zone
-- Identifies municipal problem hotspots across administrative zones and wards.
SELECT 
    w.ward_id,
    w.ward_number,
    w.ward_name,
    w.zone_name,
    COUNT(c.complaint_id) AS total_complaints,
    COUNT(c.complaint_id) FILTER (WHERE c.status IN ('REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS')) AS unresolved_complaints,
    COUNT(c.complaint_id) FILTER (WHERE c.status IN ('RESOLVED', 'CLOSED')) AS resolved_complaints
FROM wards w
LEFT JOIN complaints c ON w.ward_id = c.ward_id
GROUP BY w.ward_id, w.ward_number, w.ward_name, w.zone_name
ORDER BY total_complaints DESC;


-- ============================================================================
-- SECTION 2: APPLICATION WRITE QUERIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Module 11: User Profile Management & Account Lifecycle
-- ----------------------------------------------------------------------------

-- WRITE: Query 11.1 - Citizen Self-Registration
-- Registers a new citizen user account with default CITIZEN role and hashed credentials.
INSERT INTO users (
    name, 
    email, 
    phone, 
    password_hash, 
    role
) VALUES (
    $1, 
    LOWER(TRIM($2)), 
    $3, 
    $4, 
    'CITIZEN'
) RETURNING user_id, name, email, phone, role, created_at;

-- WRITE: Query 11.2 - Administrative Creation of Municipal Personnel
-- Creates a departmental staff officer or department administrator account with department link.
INSERT INTO users (
    name, 
    email, 
    phone, 
    password_hash, 
    role, 
    department_id
) VALUES (
    $1, 
    LOWER(TRIM($2)), 
    $3, 
    $4, 
    $5, 
    $6
) RETURNING user_id, name, email, phone, role, department_id, created_at;

-- WRITE: Query 11.3 - Update User Personal Profile Information
-- Allows users to modify their displayed name and primary contact telephone number.
UPDATE users 
SET 
    name = $1, 
    phone = $2, 
    updated_at = CURRENT_TIMESTAMP 
WHERE user_id = $3 
RETURNING user_id, name, email, phone, updated_at;

-- WRITE: Query 11.4 - Update User Password Hash
-- Updates the cryptographic password digest following a verified password change or reset.
UPDATE users 
SET 
    password_hash = $1, 
    updated_at = CURRENT_TIMESTAMP 
WHERE user_id = $2;

-- WRITE: Query 11.5 - Administrative Role and Department Reassignment
-- Enables Super Administrators to update an employee's role and municipal department affiliation.
UPDATE users 
SET 
    role = $1, 
    department_id = $2, 
    updated_at = CURRENT_TIMESTAMP 
WHERE user_id = $3 
RETURNING user_id, role, department_id, updated_at;

-- WRITE: Query 11.6 - Delete Inactive or Test User Account
-- Removes a user record from the database subject to referential integrity constraints.
DELETE FROM users 
WHERE user_id = $1;


-- ----------------------------------------------------------------------------
-- Module 12: Municipal Departments & Administrative Taxonomies
-- ----------------------------------------------------------------------------

-- WRITE: Query 12.1 - Create New Municipal Department
-- Registers a new municipal service department with official contact email and telephone.
INSERT INTO departments (
    name, 
    contact_email, 
    contact_phone
) VALUES (
    $1, 
    LOWER(TRIM($2)), 
    $3
) RETURNING department_id, name, contact_email, contact_phone, created_at;

-- WRITE: Query 12.2 - Update Municipal Department Contact Information
-- Updates official email address and telephone contact details for an existing department.
UPDATE departments 
SET 
    contact_email = LOWER(TRIM($1)), 
    contact_phone = $2 
WHERE department_id = $3 
RETURNING department_id, name, contact_email, contact_phone;

-- WRITE: Query 12.3 - Delete Empty Municipal Department
-- Deletes a department record that has no referencing categories or assigned complaints.
DELETE FROM departments 
WHERE department_id = $1;

-- WRITE: Query 12.4 - Register New Municipal Ward
-- Adds a new administrative ward boundary defined by number, name, and municipal zone.
INSERT INTO wards (
    ward_number, 
    ward_name, 
    zone_name
) VALUES (
    $1, 
    $2, 
    $3
) RETURNING ward_id, ward_number, ward_name, zone_name;

-- WRITE: Query 12.5 - Update Ward Metadata
-- Modifies name or zone affiliation for a municipal ward.
UPDATE wards 
SET 
    ward_name = $1, 
    zone_name = $2 
WHERE ward_id = $3 
RETURNING ward_id, ward_number, ward_name, zone_name;

-- WRITE: Query 12.6 - Delete Empty Municipal Ward
-- Removes an administrative ward that contains no associated civic complaints.
DELETE FROM wards 
WHERE ward_id = $1;

-- WRITE: Query 12.7 - Create New Issue Category
-- Configures a civic problem category with responsible department, default priority, and SLA hours.
INSERT INTO categories (
    name, 
    description, 
    department_id, 
    default_priority, 
    sla_hours
) VALUES (
    $1, 
    $2, 
    $3, 
    $4, 
    $5
) RETURNING category_id, name, department_id, default_priority, sla_hours;

-- WRITE: Query 12.8 - Update Category Configuration
-- Adjusts description, assigned department, default urgency priority, or SLA resolution window.
UPDATE categories 
SET 
    name = $1, 
    description = $2, 
    department_id = $3, 
    default_priority = $4, 
    sla_hours = $5 
WHERE category_id = $6 
RETURNING category_id, name, department_id, default_priority, sla_hours;

-- WRITE: Query 12.9 - Delete Unused Issue Category
-- Deletes an issue category that has no logged complaints.
DELETE FROM categories 
WHERE category_id = $1;


-- ----------------------------------------------------------------------------
-- Module 13: Complaint Lifecycle & Citizen Submissions
-- ----------------------------------------------------------------------------

-- WRITE: Query 13.1 - Citizen Complaint Ticket Submission
-- Creates a new civic complaint with coordinates, ward, and initial default priority from category.
INSERT INTO complaints (
    citizen_id, 
    category_id, 
    ward_id, 
    title, 
    description, 
    latitude, 
    longitude, 
    landmark, 
    status, 
    priority
) VALUES (
    $1, 
    $2, 
    $3, 
    $4, 
    $5, 
    $6, 
    $7, 
    $8, 
    'REPORTED', 
    (SELECT default_priority FROM categories WHERE category_id = $2)
) RETURNING complaint_id, citizen_id, category_id, ward_id, title, status, priority, created_at;

-- WRITE: Query 13.2 - Citizen Update of Complaint Description and Landmark
-- Allows a citizen to amend issue details while the complaint remains in REPORTED status.
UPDATE complaints 
SET 
    description = $1, 
    landmark = $2, 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id = $3 
  AND citizen_id = $4 
  AND status = 'REPORTED' 
RETURNING complaint_id, description, landmark, updated_at;

-- WRITE: Query 13.3 - Administrative Status and Priority Update
-- Updates complaint status and priority level during municipal triage and review.
UPDATE complaints 
SET 
    status = $1, 
    priority = $2, 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id = $3 
RETURNING complaint_id, status, priority, updated_at;

-- WRITE: Query 13.4 - Field Officer Resolution Update
-- Updates a complaint's status to RESOLVED upon physical completion of repair works.
UPDATE complaints 
SET 
    status = 'RESOLVED', 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id = $1 
RETURNING complaint_id, status, updated_at;

-- WRITE: Query 13.5 - Citizen Cancellation of Own Complaint
-- Permits a citizen to close their own issue before field inspection commences.
UPDATE complaints 
SET 
    status = 'CLOSED', 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id = $1 
  AND citizen_id = $2 
  AND status = 'REPORTED' 
RETURNING complaint_id, status, updated_at;

-- WRITE: Query 13.6 - Delete Unprocessed Draft Complaint
-- Allows removal of an accidental submission while still in REPORTED status.
DELETE FROM complaints 
WHERE complaint_id = $1 
  AND citizen_id = $2 
  AND status = 'REPORTED';


-- ----------------------------------------------------------------------------
-- Module 14: Photographic Evidence Attachments
-- ----------------------------------------------------------------------------

-- WRITE: Query 14.1 - Upload Photographic Evidence Attachment
-- Records an image URI and optional caption associated with a complaint ticket.
INSERT INTO complaint_images (
    complaint_id, 
    image_url, 
    caption
) VALUES (
    $1, 
    $2, 
    $3
) RETURNING image_id, complaint_id, image_url, caption, uploaded_at;

-- WRITE: Query 14.2 - Remove Image Attachment
-- Deletes a specific photo attachment from a complaint ticket.
DELETE FROM complaint_images 
WHERE image_id = $1 
  AND complaint_id = $2;


-- ----------------------------------------------------------------------------
-- Module 15: Workflow Allocation & Personnel Assignments
-- ----------------------------------------------------------------------------

-- WRITE: Query 15.1 - Create Workflow Assignment Delegation
-- Dispatches a complaint to a municipal department and assigns an optional inspection officer.
INSERT INTO complaint_assignments (
    complaint_id, 
    department_id, 
    assigned_to_officer_id, 
    assigned_by_user_id, 
    notes
) VALUES (
    $1, 
    $2, 
    $3, 
    $4, 
    $5
) RETURNING assignment_id, complaint_id, department_id, assigned_to_officer_id, assigned_at;

-- WRITE: Query 15.2 - Reassign Field Officer and Update Work Instructions
-- Modifies designated field officer and updates procedural instructions on an active assignment.
UPDATE complaint_assignments 
SET 
    assigned_to_officer_id = $1, 
    notes = $2 
WHERE assignment_id = $3 
RETURNING assignment_id, assigned_to_officer_id, notes;

-- WRITE: Query 15.3 - Delete Erroneous Assignment Record
-- Removes an accidental assignment entry.
DELETE FROM complaint_assignments 
WHERE assignment_id = $1;


-- ----------------------------------------------------------------------------
-- Module 16: Immutable Status Audit History
-- ----------------------------------------------------------------------------

-- WRITE: Query 16.1 - Record Immutable Status Audit Trail Entry
-- Persists an immutable log of a complaint status transition with acting user and remarks.
INSERT INTO complaint_status_history (
    complaint_id, 
    previous_status, 
    new_status, 
    changed_by_user_id, 
    remarks
) VALUES (
    $1, 
    $2, 
    $3, 
    $4, 
    $5
) RETURNING history_id, complaint_id, previous_status, new_status, changed_by_user_id, created_at;


-- ----------------------------------------------------------------------------
-- Module 17: Threaded Discussion Comments & Official Updates
-- ----------------------------------------------------------------------------

-- WRITE: Query 17.1 - Post Discussion Comment or Official Municipal Update
-- Adds a citizen inquiry or municipal public notification to a complaint's discussion thread.
INSERT INTO complaint_comments (
    complaint_id, 
    user_id, 
    comment_text, 
    is_official_update
) VALUES (
    $1, 
    $2, 
    $3, 
    $4
) RETURNING comment_id, complaint_id, user_id, comment_text, is_official_update, created_at;

-- WRITE: Query 17.2 - Update Comment Text
-- Allows author to edit their comment content.
UPDATE complaint_comments 
SET 
    comment_text = $1 
WHERE comment_id = $2 
  AND user_id = $3 
RETURNING comment_id, comment_text;

-- WRITE: Query 17.3 - Delete Discussion Comment
-- Deletes a comment posted by the user.
DELETE FROM complaint_comments 
WHERE comment_id = $1 
  AND user_id = $2;


-- ----------------------------------------------------------------------------
-- Module 18: Duplicate Complaint Management
-- ----------------------------------------------------------------------------

-- WRITE: Query 18.1 - Link Redundant Report to Canonical Master Complaint
-- Consolidates a duplicate citizen report under a master ticket with a similarity confidence score.
INSERT INTO duplicate_complaints (
    duplicate_complaint_id, 
    canonical_complaint_id, 
    detected_by_user_id, 
    confidence_score
) VALUES (
    $1, 
    $2, 
    $3, 
    $4
) RETURNING duplicate_complaint_id, canonical_complaint_id, confidence_score, created_at;

-- WRITE: Query 18.2 - Update Complaint Status to REJECTED Upon Duplicate Confirmation
-- Closes out the redundant ticket status so field teams focus on the canonical master ticket.
UPDATE complaints 
SET 
    status = 'REJECTED', 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id = $1 
RETURNING complaint_id, status, updated_at;

-- WRITE: Query 18.3 - Update Canonical Target or Similarity Confidence Score
-- Re-links a duplicate to a different master complaint or adjusts confidence score.
UPDATE duplicate_complaints 
SET 
    canonical_complaint_id = $1, 
    confidence_score = $2 
WHERE duplicate_complaint_id = $3 
RETURNING duplicate_complaint_id, canonical_complaint_id, confidence_score;

-- WRITE: Query 18.4 - Remove Duplicate Association
-- Unlinks a duplicate complaint if review reveals it to be a distinct, independent civic defect.
DELETE FROM duplicate_complaints 
WHERE duplicate_complaint_id = $1;


-- ----------------------------------------------------------------------------
-- Module 19: Asynchronous Event Notification Queue
-- ----------------------------------------------------------------------------

-- WRITE: Query 19.1 - Create Targeted Event Notification
-- Dispatches a notification to an individual user regarding status transitions or assignments.
INSERT INTO notifications (
    user_id, 
    complaint_id, 
    title, 
    message
) VALUES (
    $1, 
    $2, 
    $3, 
    $4
) RETURNING notification_id, user_id, complaint_id, title, created_at;

-- WRITE: Query 19.2 - Bulk Broadcast Notification to All Active Citizens in Ward
-- Issues automated community updates to all citizens with open issues in a specific ward.
INSERT INTO notifications (
    user_id, 
    complaint_id, 
    title, 
    message
) 
SELECT 
    citizen_id, 
    complaint_id, 
    $1, 
    $2 
FROM complaints 
WHERE ward_id = $3 
  AND status <> 'CLOSED';

-- WRITE: Query 19.3 - Mark Single Notification as Read
-- Clears the unread indicator for a specific notification card in the user's inbox.
UPDATE notifications 
SET 
    is_read = TRUE 
WHERE notification_id = $1 
  AND user_id = $2 
RETURNING notification_id, is_read;

-- WRITE: Query 19.4 - Mark All Notifications as Read for User
-- Bulk updates all unread notifications for a user to read status.
UPDATE notifications 
SET 
    is_read = TRUE 
WHERE user_id = $1 
  AND is_read = FALSE;

-- WRITE: Query 19.5 - Dismiss Individual Notification
-- Deletes a single notification record from the user's notification list.
DELETE FROM notifications 
WHERE notification_id = $1 
  AND user_id = $2;

-- WRITE: Query 19.6 - Purge Expired Read Notifications
-- Housekeeping job to delete notifications read more than a specified number of days ago.
DELETE FROM notifications 
WHERE user_id = $1 
  AND is_read = TRUE 
  AND created_at < CURRENT_TIMESTAMP - ($2 * INTERVAL '1 day');
