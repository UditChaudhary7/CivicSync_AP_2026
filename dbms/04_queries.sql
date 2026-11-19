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

SELECT 
    c.category_id,
    c.name AS category_name,
    c.description,
    c.default_priority,
    c.sla_hours
FROM categories c
WHERE c.department_id = $1
ORDER BY c.name ASC;

SELECT 
    w.ward_id,
    w.ward_number,
    w.ward_name,
    w.zone_name
FROM wards w
ORDER BY w.zone_name ASC, w.ward_number ASC;

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

SELECT COUNT(*) AS total_complaints
FROM complaints
WHERE citizen_id = $1;

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

SELECT 
    ci.image_id,
    ci.complaint_id,
    ci.image_url,
    ci.caption,
    ci.uploaded_at
FROM complaint_images ci
WHERE ci.complaint_id = $1
ORDER BY ci.uploaded_at ASC;

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

SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1
  AND is_read = FALSE;

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

INSERT INTO users (
    name, 
    email, 
    phone, 
    password_hash, 
    role
) VALUES (
    , 
    LOWER(TRIM()), 
    , 
    , 
    'CITIZEN'
) RETURNING user_id, name, email, phone, role, created_at;

INSERT INTO users (
    name, 
    email, 
    phone, 
    password_hash, 
    role, 
    department_id
) VALUES (
    , 
    LOWER(TRIM()), 
    , 
    , 
    , 
    
) RETURNING user_id, name, email, phone, role, department_id, created_at;

UPDATE users 
SET 
    name = , 
    phone = , 
    updated_at = CURRENT_TIMESTAMP 
WHERE user_id =  
RETURNING user_id, name, email, phone, updated_at;

UPDATE users 
SET 
    password_hash = , 
    updated_at = CURRENT_TIMESTAMP 
WHERE user_id = ;

UPDATE users 
SET 
    role = , 
    department_id = , 
    updated_at = CURRENT_TIMESTAMP 
WHERE user_id =  
RETURNING user_id, role, department_id, updated_at;

DELETE FROM users 
WHERE user_id = ;

INSERT INTO departments (
    name, 
    contact_email, 
    contact_phone
) VALUES (
    , 
    LOWER(TRIM()), 
    
) RETURNING department_id, name, contact_email, contact_phone, created_at;

UPDATE departments 
SET 
    contact_email = LOWER(TRIM()), 
    contact_phone =  
WHERE department_id =  
RETURNING department_id, name, contact_email, contact_phone;

DELETE FROM departments 
WHERE department_id = ;

INSERT INTO wards (
    ward_number, 
    ward_name, 
    zone_name
) VALUES (
    , 
    , 
    
) RETURNING ward_id, ward_number, ward_name, zone_name;

UPDATE wards 
SET 
    ward_name = , 
    zone_name =  
WHERE ward_id =  
RETURNING ward_id, ward_number, ward_name, zone_name;

DELETE FROM wards 
WHERE ward_id = ;

INSERT INTO categories (
    name, 
    description, 
    department_id, 
    default_priority, 
    sla_hours
) VALUES (
    , 
    , 
    , 
    , 
    
) RETURNING category_id, name, department_id, default_priority, sla_hours;

UPDATE categories 
SET 
    name = , 
    description = , 
    department_id = , 
    default_priority = , 
    sla_hours =  
WHERE category_id =  
RETURNING category_id, name, department_id, default_priority, sla_hours;

DELETE FROM categories 
WHERE category_id = ;

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
    , 
    , 
    , 
    , 
    , 
    , 
    , 
    , 
    'REPORTED', 
    (SELECT default_priority FROM categories WHERE category_id = )
) RETURNING complaint_id, citizen_id, category_id, ward_id, title, status, priority, created_at;

UPDATE complaints 
SET 
    description = , 
    landmark = , 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id =  
  AND citizen_id =  
  AND status = 'REPORTED' 
RETURNING complaint_id, description, landmark, updated_at;

UPDATE complaints 
SET 
    status = , 
    priority = , 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id =  
RETURNING complaint_id, status, priority, updated_at;

UPDATE complaints 
SET 
    status = 'RESOLVED', 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id =  
RETURNING complaint_id, status, updated_at;

UPDATE complaints 
SET 
    status = 'CLOSED', 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id =  
  AND citizen_id =  
  AND status = 'REPORTED' 
RETURNING complaint_id, status, updated_at;

DELETE FROM complaints 
WHERE complaint_id =  
  AND citizen_id =  
  AND status = 'REPORTED';

INSERT INTO complaint_images (
    complaint_id, 
    image_url, 
    caption
) VALUES (
    , 
    , 
    
) RETURNING image_id, complaint_id, image_url, caption, uploaded_at;

DELETE FROM complaint_images 
WHERE image_id =  
  AND complaint_id = ;

INSERT INTO complaint_assignments (
    complaint_id, 
    department_id, 
    assigned_to_officer_id, 
    assigned_by_user_id, 
    notes
) VALUES (
    , 
    , 
    , 
    , 
    
) RETURNING assignment_id, complaint_id, department_id, assigned_to_officer_id, assigned_at;

UPDATE complaint_assignments 
SET 
    assigned_to_officer_id = , 
    notes =  
WHERE assignment_id =  
RETURNING assignment_id, assigned_to_officer_id, notes;

DELETE FROM complaint_assignments 
WHERE assignment_id = ;

INSERT INTO complaint_status_history (
    complaint_id, 
    previous_status, 
    new_status, 
    changed_by_user_id, 
    remarks
) VALUES (
    , 
    , 
    , 
    , 
    
) RETURNING history_id, complaint_id, previous_status, new_status, changed_by_user_id, created_at;

INSERT INTO complaint_comments (
    complaint_id, 
    user_id, 
    comment_text, 
    is_official_update
) VALUES (
    , 
    , 
    , 
    
) RETURNING comment_id, complaint_id, user_id, comment_text, is_official_update, created_at;

UPDATE complaint_comments 
SET 
    comment_text =  
WHERE comment_id =  
  AND user_id =  
RETURNING comment_id, comment_text;

DELETE FROM complaint_comments 
WHERE comment_id =  
  AND user_id = ;

INSERT INTO duplicate_complaints (
    duplicate_complaint_id, 
    canonical_complaint_id, 
    detected_by_user_id, 
    confidence_score
) VALUES (
    , 
    , 
    , 
    
) RETURNING duplicate_complaint_id, canonical_complaint_id, confidence_score, created_at;

UPDATE complaints 
SET 
    status = 'REJECTED', 
    updated_at = CURRENT_TIMESTAMP 
WHERE complaint_id =  
RETURNING complaint_id, status, updated_at;

UPDATE duplicate_complaints 
SET 
    canonical_complaint_id = , 
    confidence_score =  
WHERE duplicate_complaint_id =  
RETURNING duplicate_complaint_id, canonical_complaint_id, confidence_score;

DELETE FROM duplicate_complaints 
WHERE duplicate_complaint_id = ;

INSERT INTO notifications (
    user_id, 
    complaint_id, 
    title, 
    message
) VALUES (
    , 
    , 
    , 
    
) RETURNING notification_id, user_id, complaint_id, title, created_at;

INSERT INTO notifications (
    user_id, 
    complaint_id, 
    title, 
    message
) 
SELECT 
    citizen_id, 
    complaint_id, 
    , 
     
FROM complaints 
WHERE ward_id =  
  AND status <> 'CLOSED';

UPDATE notifications 
SET 
    is_read = TRUE 
WHERE notification_id =  
  AND user_id =  
RETURNING notification_id, is_read;

UPDATE notifications 
SET 
    is_read = TRUE 
WHERE user_id =  
  AND is_read = FALSE;

DELETE FROM notifications 
WHERE notification_id =  
  AND user_id = ;

DELETE FROM notifications 
WHERE user_id =  
  AND is_read = TRUE 
  AND created_at < CURRENT_TIMESTAMP - ( * INTERVAL '1 day');
