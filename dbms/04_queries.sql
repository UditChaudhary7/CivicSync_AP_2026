-- ============================================================================
-- CivicSync: Smart Civic Issue Reporting and Tracking Platform
-- Deliverable: CP3 — Part 1: Application READ Queries
-- Target RDBMS: PostgreSQL 16+
-- Schema Reference: dbms/03_schema.sql
-- Alignment: Fully consistent with CP1 Normalization and CP2 ERD
-- ============================================================================
-- Note: All queries use standard PostgreSQL syntax with parameter placeholders
-- ($1, $2, etc.) matching Node.js/Express `pg` driver conventions.
-- Every retrieval operation is explicitly labeled with `-- READ`.
-- ============================================================================


-- ============================================================================
-- MODULE 1: AUTHENTICATION & USER PROFILE MANAGEMENT
-- ============================================================================

-- READ: Query 1.1 - User Authentication by Email
-- Retrieves user credentials and system role during citizen/staff login.
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


-- ============================================================================
-- MODULE 2: ADMINISTRATIVE LOOKUPS & TAXONOMIES
-- ============================================================================

-- READ: Query 2.1 - Retrieve All Municipal Departments
-- Populates departmental directories and administrative triage dropdowns.
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
-- Populates citizen complaint submission forms with SLA and routing information.
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


-- ============================================================================
-- MODULE 3: CITIZEN COMPLAINT MANAGEMENT
-- ============================================================================

-- READ: Query 3.1 - Citizen "My Complaints" Summary List (Paginated & Sorted)
-- Retrieves all civic complaints submitted by a specific citizen with status and timestamps.
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
-- Used for calculating pagination metadata for the citizen's complaint dashboard.
SELECT COUNT(*) AS total_complaints
FROM complaints
WHERE citizen_id = $1;


-- READ: Query 3.3 - Detailed Single Complaint View (360-Degree Profile)
-- Retrieves comprehensive metadata for a specific complaint ticket.
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


-- ============================================================================
-- MODULE 4: SUB-ENTITY RETRIEVAL (EVIDENCE, AUDIT TRAIL & COMMENTS)
-- ============================================================================

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


-- ============================================================================
-- MODULE 5: WORKFLOW ALLOCATION & ASSIGNMENT RETRIEVAL
-- ============================================================================

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
-- Tracks historical reassignments and escalations across departments/officers.
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


-- ============================================================================
-- MODULE 6: MUNICIPAL TRIAGE, SEARCH, FILTERING & PAGINATION
-- ============================================================================

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
-- Restricts complaint queue to tickets belonging to a specific department.
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


-- ============================================================================
-- MODULE 7: GEOGRAPHIC & SPATIAL LOCATION QUERIES
-- ============================================================================

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
-- Fetches recent non-rejected complaints within a specific municipal ward for local transparency.
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


-- ============================================================================
-- MODULE 8: DUPLICATE COMPLAINT MANAGEMENT
-- ============================================================================

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


-- ============================================================================
-- MODULE 9: ASYNCHRONOUS USER NOTIFICATIONS
-- ============================================================================

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


-- ============================================================================
-- MODULE 10: ANALYTICS & ADMINISTRATIVE REPORTING DASHBOARD
-- ============================================================================

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
-- Analyzes infrastructure failure distributions across categories.
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
-- Identifies municipal problem hotspots across administrative zones.
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
