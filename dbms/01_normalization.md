# CivicSync: Database Schema Design and Relational Normalization (CP1)

**Academic Coursework:** CP1 — Database Schema Design and Normalization  
**Project Name:** CivicSync — Smart Civic Issue Reporting and Tracking Platform  
**Target RDBMS:** PostgreSQL 16+  
**Document Reference:** `dbms/01_normalization.md`  

---

## 1. Introduction and System Context

### 1.1 Project Overview and Objectives
CivicSync is a centralized, web-based civic issue reporting and municipal infrastructure management platform. The primary objective of CivicSync is to bridge the communication gap between citizens and municipal administrations, establishing transparency, operational accountability, and efficiency in public service delivery.

Urban municipalities encounter continuous infrastructure degradation, including potholes, damaged roads, failing streetlights, overflowing waste receptacles, water supply leakages, and sewage blockages. Traditional complaint management relies on fragmented, non-digitized channels (e.g., paper registers, localized phone calls, walk-in petitions). These legacy mechanisms suffer from severe limitations:
- Lack of standardized issue categorization.
- Absence of geographic coordinates, causing delayed field inspection.
- Inability to track real-time resolution progress or enforce Service Level Agreements (SLAs).
- High prevalence of duplicate complaints filed by multiple citizens for the same incident, leading to redundant field visits.
- Lack of an immutable audit trail to hold municipal departments accountable.

CivicSync solves these challenges by providing a structured, geolocated, and media-rich platform where citizens submit complaints, municipal staff triage and resolve issues, and administrators monitor infrastructure performance through analytical dashboards.

### 1.2 How CivicSync Manages Civic Complaints
CivicSync structures the complaint lifecycle into a deterministic, multi-stage workflow:
1. **Submission:** A registered citizen submits an issue report specifying a title, detailed description, issue category, exact geospatial coordinates (latitude and longitude), physical landmark, and supporting photographs.
2. **Automated Triage & SLA Assignment:** The database maps the selected category to its designated municipal department and assigns an initial resolution SLA (e.g., 48 hours for potholes, 24 hours for water pipe ruptures).
3. **Duplicate Detection:** The platform analyzes incoming complaints within a spatial radius and category taxonomy to identify duplicate reports, linking redundant submissions to a canonical master ticket.
4. **Departmental Assignment:** Department administrators review incoming tickets and formally assign them to qualified field inspection officers.
5. **Progress Tracking & Status Transitions:** Every lifecycle change (e.g., `REPORTED` → `UNDER_REVIEW` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`) is recorded in an immutable status history log with timestamps and officer remarks.
6. **Resolution Verification:** Field staff upload resolution remarks and photographic evidence, after which the citizen is notified and invited to provide feedback.

### 1.3 Key Stakeholders and User Roles
The system enforces Role-Based Access Control (RBAC) across four distinct stakeholder personas:

1. **Citizens (`CITIZEN`):**
   - Register personal accounts with verified emails and contact numbers.
   - Submit civic complaints with photographic attachments and location metadata.
   - Track resolution status, post communicative comments, and receive automated notifications.
   - View public civic issues within their administrative ward.

2. **Field Staff / Inspection Officers (`STAFF`):**
   - Belong to a designated municipal department (e.g., Road Works, Sanitation, Electrical).
   - Receive delegated work orders and inspect on-site civic issues.
   - Update operational status (`IN_PROGRESS`, `RESOLVED`) and record field notes.
   - Upload photographic proof of completed repairs.

3. **Department Administrators (`DEPT_ADMIN`):**
   - Manage operational workflows for their specific department.
   - Triage unassigned complaints, assign tasks to field staff, and adjust issue priorities.
   - Link duplicate complaint tickets and manage departmental category configurations.
   - Monitor departmental SLA compliance and resolve escalated complaints.

4. **Super Administrators (`SUPER_ADMIN`):**
   - Oversee the entire municipal platform across all departments.
   - Configure municipal departments, administrative wards, and category taxonomies.
   - Manage platform users, role assignments, and system-wide audit reports.

### 1.4 Major Business Requirements and Database Operations
The relational database operates as the high-integrity Online Transaction Processing (OLTP) engine for CivicSync. The system must support the following core operational requirements:

- **User Profile Management:** Create, read, update, and authenticate user accounts with distinct roles and departmental affiliations.
- **Complaint Submission Transactions:** Atomically persist complaint details, geographic coordinates, and media attachment references within an ACID transaction.
- **Workflow Delegation:** Record formal assignments of complaints to municipal departments and individual field personnel.
- **Immutable Status Auditing:** Maintain an append-only, tamper-resistant history of all status transitions, recording the actor, timestamp, previous status, new status, and remarks.
- **Duplicate Issue Consolidation:** Map redundant citizen reports to a primary canonical complaint, aggregating public impact while preventing redundant work orders.
- **Community Interaction:** Support bidirectional, threaded communications between citizens and municipal officers regarding specific complaints.
- **Event-Driven Notifications:** Persist real-time alert logs triggered by status updates, assignments, and comments.

### 1.5 Entity Relationships and Cardinality Matrix

CivicSync models 11 normalized relational entities connected through precise foreign key relationships. The table below documents every relationship, its structural cardinality (following Crow's Foot notation in `dbms/02_er_diagram.png`), the participating foreign key, and its referential integrity rule (`ON DELETE` action):

| Parent Entity (1) | Child Entity (N) | Relationship Description | Cardinality | Foreign Key Column | `ON DELETE` Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`departments`** | **`categories`** | A department governs multiple issue categories | 1 : N (Mandatory) | `categories.department_id` | `RESTRICT` |
| **`departments`** | **`users`** | A department employs municipal staff/admins | 1 : N (Optional) | `users.department_id` | `RESTRICT` |
| **`departments`** | **`complaint_assignments`** | A department receives delegated complaints | 1 : N (Mandatory) | `complaint_assignments.department_id` | `RESTRICT` |
| **`wards`** | **`complaints`** | A ward encompasses multiple reported complaints | 1 : N (Mandatory) | `complaints.ward_id` | `RESTRICT` |
| **`users`** (Citizen) | **`complaints`** | A citizen submits multiple civic complaints | 1 : N (Mandatory) | `complaints.citizen_id` | `RESTRICT` |
| **`users`** (Staff) | **`complaint_assignments`** | A field officer is assigned multiple complaints | 1 : N (Optional) | `complaint_assignments.assigned_to_officer_id` | `SET NULL` |
| **`users`** (Admin) | **`complaint_assignments`** | A supervisor delegates multiple assignments | 1 : N (Mandatory) | `complaint_assignments.assigned_by_user_id` | `RESTRICT` |
| **`users`** (Actor) | **`complaint_status_history`**| A user records status updates across complaints | 1 : N (Mandatory) | `complaint_status_history.changed_by_user_id` | `RESTRICT` |
| **`users`** (Author) | **`complaint_comments`** | A user posts comments across complaints | 1 : N (Mandatory) | `complaint_comments.user_id` | `RESTRICT` |
| **`users`** (Officer) | **`duplicate_complaints`**| An officer flags duplicate complaints | 1 : N (Optional) | `duplicate_complaints.detected_by_user_id` | `SET NULL` |
| **`users`** (Recipient)| **`notifications`** | A user receives multiple system notifications | 1 : N (Mandatory) | `notifications.user_id` | `CASCADE` |
| **`categories`** | **`complaints`** | A category classifies multiple complaints | 1 : N (Mandatory) | `complaints.category_id` | `RESTRICT` |
| **`complaints`** | **`complaint_images`** | A complaint contains multiple evidence photos | 1 : N (Mandatory) | `complaint_images.complaint_id` | `CASCADE` |
| **`complaints`** | **`complaint_assignments`** | A complaint undergoes multiple assignment phases | 1 : N (Mandatory) | `complaint_assignments.complaint_id` | `CASCADE` |
| **`complaints`** | **`complaint_status_history`**| A complaint accumulates chronological status logs | 1 : N (Mandatory) | `complaint_status_history.complaint_id` | `CASCADE` |
| **`complaints`** | **`complaint_comments`** | A complaint hosts a discussion thread | 1 : N (Optional) | `complaint_comments.complaint_id` | `CASCADE` |
| **`complaints`** (Canonical)| **`duplicate_complaints`**| A master ticket links multiple duplicate reports | 1 : N (Optional) | `duplicate_complaints.canonical_complaint_id`| `CASCADE` |
| **`complaints`** (Duplicate)| **`duplicate_complaints`**| A redundant report maps to exactly one master | 1 : 1 (Identifying) | `duplicate_complaints.duplicate_complaint_id`| `CASCADE` |
| **`complaints`** | **`notifications`** | A complaint triggers context-linked notifications | 1 : N (Optional) | `notifications.complaint_id` | `SET NULL` |

### 1.6 System Design Assumptions
The following domain assumptions are formally adopted:
1. **Decoupled Media Persistence:** Binary image data (BLOBs) is not stored directly in relational database tables. Photographic files are stored in external object storage (e.g., AWS S3 or private bucket), and the database records strictly atomic URI strings, metadata, and upload timestamps.
2. **Geospatial Coordinate Representation:** Geographic locations are stored using standard WGS 84 coordinates (`NUMERIC(9,6)` for latitude and longitude), providing sub-meter precision (~0.11 meters at the equator) without requiring mandatory PostGIS extensions for basic CRUD operations.
3. **Department Affiliation Constraint:** Citizens operate independently of municipal departments (`department_id IS NULL`), whereas staff members and department administrators must belong to exactly one municipal department.
4. **Non-Cyclic Duplicate Hierarchy:** A complaint can be marked as a duplicate of at most one active canonical complaint. A canonical complaint cannot itself be marked as duplicate, preventing recursive or circular duplicate hierarchies.
5. **Append-Only Auditing:** Status transitions and assignment histories are strictly append-only. Application-level update and delete operations are disallowed on `complaint_status_history` to ensure administrative accountability.

---

## 2. Initial Database Design and Unnormalized Form (UNF)

### 2.1 Unnormalized Relational Representation
In naive database design, developers frequently start with a single consolidated structure or a denormalized flat file. To evaluate the normalization progression rigorously, consider an initial unnormalized relation representing the submission, triage, and assignment of civic issues:

```text
UNNORMALIZED_CIVIC_REPORT(
    complaint_id, citizen_name, citizen_email, citizen_phone,
    title, description, category_name, dept_name, dept_head, dept_email,
    latitude, longitude, ward_number, zone_name,
    image_urls, assigned_officer_names, assigned_officer_emails,
    status, status_history, priority, created_at
)
```

### 2.2 Concrete Data Instance of UNF
The table below illustrates sample data within this unnormalized structure:

| `complaint_id` | `citizen_name` | `citizen_email` | `title` | `category_name` | `dept_name` | `dept_head` | `ward_number` | `image_urls` | `assigned_officer_names` | `status` | `status_history` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `C-101` | Ramesh Rao | `ramesh@civic.in` | Deep Pothole on MG Road | Road Works | Public Works Dept | Er. Suresh Nair | Ward 12 | `img1.jpg, img2.jpg` | Er. Rajesh Kumar, Er. Priya Sharma | `IN_PROGRESS` | `[2026-10-01 09:00: SUBMITTED], [2026-10-02 11:30: IN_PROGRESS]` |
| `C-102` | Ramesh Rao | `ramesh@civic.in` | Broken Streetlight | Electrical | Power & Lighting | Er. K. V. Verma | Ward 12 | `img3.jpg` | Er. Anil Mohan | `REPORTED` | `[2026-10-02 14:00: SUBMITTED]` |
| `C-103` | Sunita Mehta | `sunita@civic.in` | Overflowing Garbage Bin | Sanitation | Solid Waste Mgmt | Smt. Anandi Devi | Ward 05 | `img4.jpg, img5.jpg, img6.jpg` | Er. Sunil Patil | `RESOLVED` | `[2026-10-01 10:15: SUBMITTED], [2026-10-01 16:00: RESOLVED]` |
| `C-104` | Sunita Mehta | `sunita@civic.in` | Damaged Pavement | Road Works | Public Works Dept | Er. Suresh Nair | Ward 05 | `NULL` | NULL | `REPORTED` | `[2026-10-03 08:30: SUBMITTED]` |

### 2.3 Identification of Data Redundancy
The unnormalized relation exhibits massive data redundancy across several dimensions:
1. **Citizen Metadata Redundancy:** Citizen attributes (`citizen_name`, `citizen_email`, `citizen_phone`) are repeated identically every time a citizen files a new complaint.
2. **Departmental Metadata Redundancy:** Department information (`dept_name`, `dept_head`, `dept_email`) is replicated across every complaint belonging to that department.
3. **Geographic Information Redundancy:** Ward and zone associations (`ward_number`, `zone_name`) are duplicated for every complaint occurring in that ward.

### 2.4 Relational Anomalies

#### a. Insertion Anomalies
- **Cannot create a department without a complaint:** If the municipality establishes a new department (e.g., "Parks and Urban Forestry"), it cannot be entered into the database until a citizen submits a complaint routed to it, because `complaint_id` forms the primary key and cannot be `NULL`.
- **Cannot register a citizen without a complaint:** A citizen registering an account on CivicSync cannot be inserted into the system until they file their first issue report.
- **Cannot configure issue categories in advance:** Standard issue categories (e.g., "Water Pipe Rupture") cannot exist in the schema independently of actual complaints.

#### b. Deletion Anomalies
- **Loss of Departmental Records:** If complaint `C-103` is deleted or purged from the database, the record of the "Solid Waste Mgmt" department, its head (Smt. Anandi Devi), and its contact information is permanently erased if no other complaints exist for that department.
- **Loss of Citizen Profiles:** If a citizen withdraws or deletes their only filed complaint, their user account, email, and contact number are erased from the system.

#### c. Update Anomalies
- **Inconsistent Departmental Updates:** If the Public Works Department changes its department head from "Er. Suresh Nair" to "Er. Meenakshi Sundaram", every single historical row containing "Public Works Dept" must be updated. If the update fails mid-way, or a record is locked, the database enters an inconsistent state where the same department has different heads across different rows.
- **Citizen Contact Updates:** If citizen "Ramesh Rao" updates his phone number, updating it on row `C-101` but missing row `C-102` results in data divergence.

---

## 3. First Normal Form (1NF)

### 3.1 Requirements of 1NF
A relation *R* is in First Normal Form (1NF) if and only if:
1. All underlying attribute domains contain only **atomic (indivisible)** values.
2. There are **no repeating groups** or multi-valued attributes stored within a single tuple.
3. Each record is uniquely identifiable through a well-defined primary key.

### 3.2 Violations in the Initial Design
The initial relation violates 1NF on multiple counts:
- `image_urls`: Contains comma-separated collections of strings (`img1.jpg, img2.jpg`), representing a non-atomic repeating group.
- `assigned_officer_names` and `assigned_officer_emails`: Stores non-atomic, comma-delimited lists of personnel assigned to the complaint.
- `status_history`: Encodes a structured array of timestamps, state transitions, and remarks into a compound text field.

### 3.3 Transformation to 1NF
To achieve 1NF, all multi-valued attributes and repeating groups must be eliminated. We isolate repeating entities into dedicated relations where every attribute holds a strictly atomic scalar value, and each relation possesses a well-defined primary key.

We decompose the flat record into four initial atomic relations:

#### Relation 1: `COMPLAINT_1NF`
Stores atomic complaint details, citizen contact, department, and location data:
```text
COMPLAINT_1NF(
    complaint_id [PK], citizen_name, citizen_email, citizen_phone,
    title, description, category_name, dept_name, dept_head,
    ward_number, zone_name, latitude, longitude,
    status, priority, created_at
)
```

#### Relation 2: `COMPLAINT_IMAGE_1NF`
Eliminates the repeating image attribute:
```text
COMPLAINT_IMAGE_1NF(
    complaint_id [PK], image_url [PK],
    caption, uploaded_at
)
```

#### Relation 3: `COMPLAINT_ASSIGNMENT_1NF`
Eliminates repeating assigned personnel:
```text
COMPLAINT_ASSIGNMENT_1NF(
    complaint_id [PK], officer_email [PK],
    officer_name, dept_name, assigned_at
)
```

#### Relation 4: `COMPLAINT_STATUS_HISTORY_1NF`
Eliminates compound status history arrays:
```text
COMPLAINT_STATUS_HISTORY_1NF(
    complaint_id [PK], changed_at [PK],
    status, changed_by_email, remarks
)
```

### 3.4 Before-and-After Tabular Demonstration

#### Before 1NF: `image_urls` attribute in `UNNORMALIZED_CIVIC_REPORT`
| `complaint_id` | `image_urls` |
| :--- | :--- |
| `C-101` | `img1.jpg, img2.jpg` |
| `C-103` | `img4.jpg, img5.jpg, img6.jpg` |

#### After 1NF: Flattened Atomic Tuples in `COMPLAINT_IMAGE_1NF`
| `complaint_id` | `image_url` | `caption` | `uploaded_at` |
| :--- | :--- | :--- | :--- |
| `C-101` | `https://s3.civic.in/c101_1.jpg` | Pothole overview | 2026-10-01 09:02:00 |
| `C-101` | `https://s3.civic.in/c101_2.jpg` | Close-up depth measurement | 2026-10-01 09:02:15 |
| `C-103` | `https://s3.civic.in/c103_1.jpg` | Bin overflow front view | 2026-10-01 10:16:00 |
| `C-103` | `https://s3.civic.in/c103_2.jpg` | Spillage across pedestrian walkway | 2026-10-01 10:16:20 |
| `C-103` | `https://s3.civic.in/c103_3.jpg` | Surrounding garbage scatter | 2026-10-01 10:16:45 |

### 3.5 Evaluation of 1NF Schema
While 1NF ensures all attribute values are atomic and individual tuples are uniquely addressable, the schema still suffers from severe redundancy because partial and transitive functional dependencies remain unaddressed.

---

## 4. Second Normal Form (2NF)

### 4.1 Requirements of 2NF
A relation *R* is in Second Normal Form (2NF) if and only if:
1. *R* is in First Normal Form (1NF).
2. Every **non-prime attribute** is **fully functionally dependent** on every candidate key of *R*.

That is, no non-prime attribute may depend on a proper subset of any candidate key (elimination of **partial dependencies**). If a relation's candidate keys consist of single attributes, the relation is automatically in 2NF. 2NF violations emerge exclusively in relations with composite candidate keys.

### 4.2 Identifying Partial Dependencies in 1NF Relations

Let us analyze the relations with composite candidate keys created during 1NF decomposition:

#### Analysis of `COMPLAINT_ASSIGNMENT_1NF`:
```text
COMPLAINT_ASSIGNMENT_1NF(complaint_id [PK], officer_email [PK], officer_name, dept_name, assigned_at)
```

- **Candidate Key:** `{complaint_id, officer_email}`
- **Prime Attributes:** `complaint_id`, `officer_email`
- **Non-Prime Attributes:** `officer_name`, `dept_name`, `assigned_at`
- **Functional Dependencies:**
  - `FD_1`: `{complaint_id, officer_email} → {assigned_at}` (Full dependency on the whole key).
  - `FD_2`: `{officer_email} → {officer_name, dept_name}` (Partial dependency: depends only on a proper subset of the composite candidate key).

Because the non-prime attributes `officer_name` and `dept_name` depend strictly on `officer_email`, a partial dependency exists. If an officer is assigned to 50 complaints, their name and department are needlessly duplicated 50 times.

#### Analysis of `COMPLAINT_STATUS_HISTORY_1NF`:
```text
COMPLAINT_STATUS_HISTORY_1NF(complaint_id [PK], changed_at [PK], status, changed_by_email, changed_by_name, remarks)
```

- **Candidate Key:** `{complaint_id, changed_at}`
- **Prime Attributes:** `complaint_id`, `changed_at`
- **Non-Prime Attributes:** `status`, `changed_by_email`, `changed_by_name`, `remarks`
- **Functional Dependencies:**
  - `FD_3`: `{complaint_id, changed_at} → {status, changed_by_email, remarks}` (Full dependency).
  - `FD_4`: `{changed_by_email} → {changed_by_name}` (Partial dependency on officer details if embedded).

### 4.3 Elimination of Partial Dependencies
To eliminate partial dependencies, we project the relation into smaller relations such that attributes determined by a subkey are moved into a relation where that subkey is the entire primary key.

#### Decomposition of `COMPLAINT_ASSIGNMENT_1NF`:
1. Extract the officer entity:
   ```text
   OFFICER(officer_email [PK], officer_name, dept_name)
   ```
   Here, `officer_email` is the single-attribute primary key. No partial dependencies are possible.
2. Retain the pure relationship entity:
   ```text
   COMPLAINT_ASSIGNMENT_2NF(complaint_id [PK], officer_email [PK], assigned_at)
   ```
   Here, `assigned_at` is fully dependent on the complete candidate key `{complaint_id, officer_email}`.

#### Decomposition of `COMPLAINT_IMAGE_1NF`:
Assign an explicit surrogate primary key or maintain clean composition:
```text
COMPLAINT_IMAGE_2NF(image_id [PK], complaint_id, image_url, caption, uploaded_at)
```
Since `image_id` is the sole primary key:
```text
{image_id} → {complaint_id, image_url, caption, uploaded_at}
```
All non-prime attributes are fully functionally dependent on the single-attribute candidate key.

### 4.4 Proof of Lossless Join and Dependency Preservation
Let `R = COMPLAINT_ASSIGNMENT_1NF` with attributes:
```text
R = {complaint_id, officer_email, officer_name, dept_name, assigned_at}
```
We decompose `R` into two projection relations:
```text
R_1 = {officer_email, officer_name, dept_name}
R_2 = {complaint_id, officer_email, assigned_at}
```

- **Lossless Join Verification:**
  The intersection of `R_1` and `R_2` is:
  ```text
  R_1 ∩ R_2 = {officer_email}
  ```
  In `R_1`, the functional dependency `{officer_email} → {officer_name, dept_name}` holds.
  Therefore, `R_1 ∩ R_2` forms a superkey of `R_1`. According to relational decomposition theorems, if the intersection of two decomposed relations is a superkey of at least one of the relations, the decomposition is guaranteed to be **lossless**.
- **Dependency Preservation:**
  - `FD_1`: `{complaint_id, officer_email} → {assigned_at}` is fully preserved in `R_2`.
  - `FD_2`: `{officer_email} → {officer_name, dept_name}` is fully preserved in `R_1`.
  Because all original functional dependencies can be enforced without computing relational joins across tables, the decomposition is **dependency-preserving**.

---

## 5. Third Normal Form (3NF)

### 5.1 Requirements of 3NF
A relation *R* is in Third Normal Form (3NF) if and only if:
1. *R* is in Second Normal Form (2NF).
2. For every non-trivial functional dependency *X* → *Y* holding in *R*, at least one of the following conditions is satisfied:
   - *X* is a **superkey** of *R*, OR
   - *Y* is a **prime attribute** of *R* (each attribute in *Y* is a member of some candidate key of *R*).

Equivalently, 3NF requires that no non-prime attribute is **transitively dependent** on any candidate key (*X* → *Z* via *X* → *Y* and *Y* → *Z*, where neither *Y* → *X* nor *Z* ⊆ *Y*).

### 5.2 Identifying Transitive Dependencies in 2NF Relations

Let us examine `COMPLAINT_1NF` (which is in 2NF because its primary key is single-attribute `complaint_id`):

```text
COMPLAINT_2NF(
    complaint_id [PK], citizen_name, citizen_email, citizen_phone,
    title, description, category_name, dept_name, dept_head,
    ward_number, zone_name, latitude, longitude,
    status, priority, created_at
)
```

- Primary Key: `complaint_id`
- All attributes are non-prime except `complaint_id`.

We evaluate the following functional dependencies:

1. **Citizen Transitive Dependency:**
   - `{complaint_id} → {citizen_email}`
   - `{citizen_email} → {citizen_name, citizen_phone}`
   - Here, `{citizen_email} → {citizen_name}` is a non-trivial FD where `citizen_email` is NOT a superkey of `COMPLAINT_2NF`, and `citizen_name` is NOT a prime attribute.
   - This is a direct **transitive dependency**: `{complaint_id} → {citizen_name}`.

2. **Category and Department Transitive Dependency:**
   - `{complaint_id} → {category_name}`
   - `{category_name} → {dept_name}`
   - `{dept_name} → {dept_head}`
   - Neither `category_name` nor `dept_name` is a superkey of the complaint relation. Therefore, non-prime attributes `dept_name` and `dept_head` are transitively dependent on `complaint_id`.

3. **Geographical Ward Transitive Dependency:**
   - `{complaint_id} → {ward_number}`
   - `{ward_number} → {zone_name}`
   - `ward_number` is not a superkey of the complaint relation, yet it determines `zone_name`. This is another transitive dependency.

### 5.3 Elimination of Transitive Dependencies
To achieve 3NF, we extract the determinant and its dependent attributes into separate independent relations:

1. **Extraction of Users:**
   ```text
   USERS(user_id [PK], name, email [UQ], phone, role, password_hash, department_id [FK], created_at, updated_at)
   ```
   Primary Key: `user_id`. Alternate Key: `email`.
   All citizen profile attributes are isolated here.

2. **Extraction of Departments:**
   ```text
   DEPARTMENTS(department_id [PK], name [UQ], contact_email, contact_phone, created_at)
   ```
   Primary Key: `department_id`. Alternate Key: `name`.

3. **Extraction of Categories:**
   ```text
   CATEGORIES(category_id [PK], name [UQ], description, department_id [FK], default_priority, sla_hours)
   ```
   Primary Key: `category_id`. Foreign Key: `department_id` references `DEPARTMENTS(department_id)`.

4. **Extraction of Wards:**
   ```text
   WARDS(ward_id [PK], ward_number [UQ], ward_name, zone_name)
   ```
   Primary Key: `ward_id`. Alternate Key: `ward_number`.

5. **Cleaned Complaint Relation:**
   ```text
   COMPLAINTS(
       complaint_id [PK], citizen_id [FK], category_id [FK], ward_id [FK],
       title, description, latitude, longitude, landmark,
       status, priority, created_at, updated_at
   )
   ```
   Foreign Keys:
   - `citizen_id` references `USERS(user_id)`
   - `category_id` references `CATEGORIES(category_id)`
   - `ward_id` references `WARDS(ward_id)`

### 5.4 Anomaly Resolution Achieved by 3NF
- **Insertion:** Departments, Categories, and Wards can now be inserted independently without requiring an existing complaint tuple.
- **Deletion:** Deleting a complaint tuple does not delete the user, department, category, or ward.
- **Update:** Changing a department name or phone number occurs in exactly one tuple in `DEPARTMENTS`. Inconsistency is structurally impossible.

---

## 6. Boyce-Codd Normal Form (BCNF)

### 6.1 Requirements of BCNF
A relation *R* is in Boyce-Codd Normal Form (BCNF) if and only if:
- For every non-trivial functional dependency *X* → *Y* holding in *R*, the determinant *X* is a **superkey** of *R*.

BCNF is strictly stronger than 3NF. The difference lies in 3NF's relaxation clause: in 3NF, *X* → *Y* is permitted if *Y* is a prime attribute, even when *X* is not a superkey. BCNF disallows this exception completely. Therefore, every BCNF relation is in 3NF, but a 3NF relation with overlapping candidate keys may violate BCNF.

### 6.2 Detailed Municipal Case Study: 3NF Relation Violating BCNF
Consider a municipal administrative requirement for field verification:
- Each municipal department operates in various administrative wards.
- In any given ward, a department assigns exactly one **Lead Field Inspector** (`officer_id`) responsible for triaging issues.
- Each field inspector belongs to **exactly one** municipal department.
- An inspector can oversee multiple wards for their department.

Suppose this requirement was modeled in a single relation:
```text
WARD_INSPECTION_LEAD(ward_id, department_id, officer_id)
```

#### Analysis of Functional Dependencies:
1. `FD_1`: `{ward_id, department_id} → {officer_id}`  
   *(In a given ward, a specific department has exactly one lead inspector.)*
2. `FD_2`: `{officer_id} → {department_id}`  
   *(Each officer belongs to exactly one department.)*

#### Derivation of Candidate Keys:
- From `FD_1`, the attribute closure is:
  `{ward_id, department_id}+ = {ward_id, department_id, officer_id}`.  
  Thus, `K_1 = {ward_id, department_id}` is a candidate key.
- From `FD_2`, substituting `department_id` in `K_1` with `officer_id`:  
  `{ward_id, officer_id}+ = {ward_id, officer_id, department_id}`.  
  Thus, `K_2 = {ward_id, officer_id}` is also a candidate key.

#### Prime Attributes:
The set of prime attributes (attributes that belong to at least one candidate key) is:
```text
Prime = {ward_id, department_id, officer_id}
```
All attributes in the relation are prime.

#### Testing for 3NF:
- For `FD_1`: `{ward_id, department_id} → {officer_id}`:
  The determinant is candidate key `K_1`, which is a superkey. (Satisfies 3NF).
- For `FD_2`: `{officer_id} → {department_id}`:
  The determinant `{officer_id}` is **NOT** a superkey (an officer can oversee multiple wards, so officer alone cannot determine ward).  
  However, the dependent attribute `department_id` **is a prime attribute** (member of candidate key `K_1`).
- **Conclusion:** Because the right-hand side is a prime attribute, **`WARD_INSPECTION_LEAD` satisfies 3NF!**

#### Testing for BCNF:
- Evaluate `FD_2`: `{officer_id} → {department_id}`:
  - Determinant: `{officer_id}`
  - Is `{officer_id}` a superkey of the relation? **NO.**
- **Conclusion:** Because `FD_2` has a determinant that is not a superkey, **the relation violates BCNF!**

### 6.3 Anomalies Caused by this BCNF Violation
- **Update Anomaly:** If Inspector Rao (`officer_id = 401`) is transferred from Public Works to Sanitation, every tuple where Officer 401 is assigned to a ward must be updated.
- **Insertion Anomaly:** We cannot record that a newly hired inspector belongs to the Public Works department until they are assigned to lead at least one ward.
- **Deletion Anomaly:** If Inspector Rao's sole ward assignment is dissolved, the fact that Officer 401 works for Public Works is lost.

### 6.4 BCNF Decomposition and Trade-off Analysis
To eliminate the BCNF violation, we decompose `WARD_INSPECTION_LEAD` using the violating functional dependency `FD_2`:

1. **Relation 1 (*R₁*):** Extract the violating determinant and its dependent attributes:
   ```text
   STAFF_DEPARTMENT(officer_id [PK], department_id)
   ```
   - Functional Dependency: `{officer_id} → {department_id}`.
   - Candidate Key: `{officer_id}`.
   - Determinant `{officer_id}` is a superkey. ⟹ ***R₁* is in BCNF.**

2. **Relation 2 (*R₂*):** Retain the determinant with the remaining attributes:
   ```text
   WARD_OFFICER(ward_id [PK], officer_id [PK])
   ```
   - Candidate Key: `{ward_id, officer_id}`.
   - Only trivial FDs exist. ⟹ ***R₂* is in BCNF.**

#### Trade-Off Analysis (Dependency Preservation vs. BCNF):
- In *R₁*, `FD_2` is preserved.
- In *R₂*, no non-trivial FDs exist.
- Notice that the original `FD_1`: `{ward_id, department_id} → {officer_id}` spans across both relations and cannot be checked within a single table without a join.
- In CivicSync's practical system design, department membership is modeled as an intrinsic property of the officer (`users.department_id`), while complaint assignment is handled per complaint (`complaint_assignments`) rather than by static ward locks. This natural decomposition satisfies BCNF and avoids the anomaly cleanly.

### 6.5 Systematic BCNF Verification of All Core CivicSync Relations
We now systematically review the core tables in the CivicSync schema to verify that every non-trivial functional dependency *X* → *Y* has a superkey as its determinant *X*:

1. **`users`**:
   - `{user_id} → {name, email, phone, role, password_hash, department_id, created_at, updated_at}`
   - `{email} → {user_id, name, phone, role, password_hash, department_id, created_at, updated_at}`
   - Both determinants `{user_id}` and `{email}` are candidate keys (superkeys). ⟹ **Satisfies BCNF.**

2. **`departments`**:
   - `{department_id} → {name, contact_email, contact_phone, created_at}`
   - `{name} → {department_id, contact_email, contact_phone, created_at}`
   - Determinants are superkeys. ⟹ **Satisfies BCNF.**

3. **`categories`**:
   - `{category_id} → {name, description, department_id, default_priority, sla_hours}`
   - `{name} → {category_id, description, department_id, default_priority, sla_hours}`
   - Determinants are superkeys. ⟹ **Satisfies BCNF.**

4. **`wards`**:
   - `{ward_id} → {ward_number, ward_name, zone_name}`
   - `{ward_number} → {ward_id, ward_name, zone_name}`
   - Determinants are superkeys. ⟹ **Satisfies BCNF.**

5. **`complaints`**:
   - `{complaint_id} → {citizen_id, category_id, ward_id, title, description, latitude, longitude, landmark, status, priority, created_at, updated_at}`
   - Determinant is the sole candidate key (superkey). ⟹ **Satisfies BCNF.**

6. **`complaint_images`**:
   - `{image_id} → {complaint_id, image_url, caption, uploaded_at}`
   - `{image_url} → {image_id, complaint_id, caption, uploaded_at}`
   - Determinants are superkeys. ⟹ **Satisfies BCNF.**

7. **`complaint_assignments`**:
   - Candidate Key: `{assignment_id}`
   - Determinant `{assignment_id}` is a superkey. ⟹ **Satisfies BCNF.**

8. **`complaint_status_history`**:
   - Primary Key: `{history_id}`
   - Determinant `{history_id}` is a superkey. ⟹ **Satisfies BCNF.**

9. **`complaint_comments`**:
   - Primary Key: `{comment_id}`
   - Determinant `{comment_id}` is a superkey. ⟹ **Satisfies BCNF.**

10. **`duplicate_complaints`**:
    - Candidate Key: `{duplicate_complaint_id}`
    - Determinant `{duplicate_complaint_id}` is a superkey. ⟹ **Satisfies BCNF.**

11. **`notifications`**:
    - Primary Key: `{notification_id}`
    - Determinant `{notification_id}` is a superkey. ⟹ **Satisfies BCNF.**

---

## 7. Functional Dependencies

This section documents the formal minimal cover of functional dependencies governing the CivicSync relational model.

### 7.1 Entity: `users`
- `FD_U1`: `{user_id} → {name, email, phone, password_hash, role, department_id, created_at, updated_at}`
- `FD_U2`: `{email} → {user_id, name, phone, password_hash, role, department_id, created_at, updated_at}`
- *Business Justification:* Each user account is uniquely determined either by their surrogate UUID or their unique email address. The associated department applies only to municipal personnel.

### 7.2 Entity: `departments`
- `FD_D1`: `{department_id} → {name, contact_email, contact_phone, created_at}`
- `FD_D2`: `{name} → {department_id, contact_email, contact_phone, created_at}`
- *Business Justification:* A municipal department has a unique system ID and an officially designated unique organizational name.

### 7.3 Entity: `wards`
- `FD_W1`: `{ward_id} → {ward_number, ward_name, zone_name}`
- `FD_W2`: `{ward_number} → {ward_id, ward_name, zone_name}`
- *Business Justification:* Municipal wards are numbered subdivisions within administrative zones. The ward number uniquely determines the ward name and the encompassing administrative zone.

### 7.4 Entity: `categories`
- `FD_C1`: `{category_id} → {name, description, department_id, default_priority, sla_hours}`
- `FD_C2`: `{name} → {category_id, description, department_id, default_priority, sla_hours}`
- *Business Justification:* An issue category has a distinct descriptive name, an assigned default handling department, a baseline severity priority, and a mandatory resolution SLA in hours.

### 7.5 Entity: `complaints`
- `FD_CP1`: `{complaint_id} → {citizen_id, category_id, ward_id, title, description, latitude, longitude, landmark, status, priority, created_at, updated_at}`
- *Business Justification:* A unique complaint ticket ID determines all submitted details, spatial coordinates, classification references, lifecycle states, and modification timestamps.

### 7.6 Entity: `complaint_images`
- `FD_CI1`: `{image_id} → {complaint_id, image_url, caption, uploaded_at}`
- `FD_CI2`: `{image_url} → {image_id, complaint_id, caption, uploaded_at}`
- *Business Justification:* An uploaded photograph is stored at a distinct URI, associated with exactly one complaint, and possesses an immutable upload timestamp.

### 7.7 Entity: `complaint_assignments`
- `FD_CA1`: `{assignment_id} → {complaint_id, department_id, assigned_to_officer_id, assigned_by_user_id, notes, assigned_at}`
- *Business Justification:* Each individual assignment transaction is identified by an assignment ID, linking a complaint to a department and optionally to a designated field officer.

### 7.8 Entity: `complaint_status_history`
- `FD_SH1`: `{history_id} → {complaint_id, previous_status, new_status, changed_by_user_id, remarks, created_at}`
- *Business Justification:* A specific audit record captures exactly one state transition from a previous status to a new status, recording the actor and timestamp.

### 7.9 Entity: `complaint_comments`
- `FD_CM1`: `{comment_id} → {complaint_id, user_id, comment_text, is_official_update, created_at}`
- *Business Justification:* A comment belongs to a specific complaint and author, denoting whether the entry represents an official municipal progress announcement.

### 7.10 Entity: `duplicate_complaints`
- `FD_DC1`: `{duplicate_complaint_id} → {canonical_complaint_id, detected_by_user_id, confidence_score, created_at}`
- *Business Justification:* A redundant complaint report can only be linked to at most one canonical (master) complaint. Therefore, the duplicate complaint ID functionally determines the canonical ticket.

### 7.11 Entity: `notifications`
- `FD_N1`: `{notification_id} → {user_id, complaint_id, title, message, is_read, created_at}`
- *Business Justification:* Each user notification is unique, linked to an optional triggering complaint and user inbox.

---

## 8. Candidate Keys and Primary Keys

### 8.1 Key Terminology and Selection Criteria
- **Superkey:** A set of attributes within a relation that uniquely identifies each tuple.
- **Candidate Key (CK):** A minimal superkey (no proper subset is itself a superkey).
- **Primary Key (PK):** The candidate key chosen by the database architect to serve as the definitive row identifier.
- **Alternate Key (AK):** Candidate keys not selected as the primary key, enforced using `UNIQUE` constraints.

### 8.2 Surrogate Keys vs. Natural Keys in OLTP Architecture
CivicSync deliberately selects surrogate keys (`UUID` and `BIGINT GENERATED ALWAYS AS IDENTITY`) as primary keys across all relations:
1. **Immutability:** Natural identifiers (e.g., email addresses, department names, ward numbers) are subject to real-world administrative changes. Changing a primary key cascades through thousands of foreign key records, locking tables and incurring severe performance overhead.
2. **Security & Anti-Enumeration:** For citizen-facing entities (`users`, `complaints`, `complaint_images`), surrogate UUIDs (v4) prevent sequential enumeration attacks where malicious users scrape civic complaints by incrementing integer IDs.
3. **Compact Index Scans:** For high-throughput internal logs (`complaint_status_history`, `notifications`, `complaint_assignments`), sequential `BIGINT` identities optimize B-tree index locality and insert throughput in PostgreSQL.

### 8.3 Candidate and Primary Key Selection Matrix

| Relation | Identified Candidate Keys | Selected Primary Key | Alternate Keys (Unique) | Selection Justification |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | `CK_1: {user_id}`<br>`CK_2: {email}` | `user_id` (UUID) | `email` | Surrogate UUID shields user email in foreign key relationships; email retains a unique index for login lookup. |
| **`departments`** | `CK_1: {department_id}`<br>`CK_2: {name}` | `department_id` (INT) | `name` | Compact integer surrogate key provides faster index scans and foreign key joins than text-based department names. |
| **`wards`** | `CK_1: {ward_id}`<br>`CK_2: {ward_number}` | `ward_id` (INT) | `ward_number` | Stable integer surrogate key isolates internal relational references from municipal administrative re-numbering. |
| **`categories`** | `CK_1: {category_id}`<br>`CK_2: {name}` | `category_id` (INT) | `name` | Compact integer primary key; category names are enforced unique to prevent duplicate catalog entries. |
| **`complaints`** | `CK_1: {complaint_id}` | `complaint_id` (UUID) | None | UUIDv4 guarantees global uniqueness across distributed submission clients and prevents sequential ID enumeration attacks. |
| **`complaint_images`**| `CK_1: {image_id}`<br>`CK_2: {image_url}` | `image_id` (UUID) | `image_url` | URLs are long and prone to external storage migration; a surrogate UUID ensures compact internal indexes. |
| **`complaint_assignments`** | `CK_1: {assignment_id}` | `assignment_id` (BIGINT) | None | A complaint may be reassigned multiple times; a surrogate ID allows full assignment versioning. |
| **`complaint_status_history`** | `CK_1: {history_id}` | `history_id` (BIGINT) | None | Append-only historical log; `BIGINT GENERATED ALWAYS AS IDENTITY` ensures performant, sequentially ordered logging. |
| **`complaint_comments`** | `CK_1: {comment_id}` | `comment_id` (BIGINT) | None | Sequential identity facilitates chronological sorting and threaded discussion retrieval. |
| **`duplicate_complaints`** | `CK_1: {duplicate_complaint_id}` | `duplicate_complaint_id` (UUID) | None | A complaint can only be marked duplicate once; using `duplicate_complaint_id` as PK prevents multiple parent mappings. |
| **`notifications`** | `CK_1: {notification_id}` | `notification_id` (BIGINT) | None | High-throughput sequential event log; identity integer maximizes insert efficiency. |

---

## 9. Final Normalized Relational Schema

The final normalized schema is specified below for PostgreSQL 16+. It features exact data types, referential actions (`ON DELETE`), default expressions, and domain check constraints.

### 9.1 Custom Domain Types and Enumerations
```sql
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
```

### 9.2 Relational Table Specifications

#### Table 1: `departments`
Represents official municipal administrative departments.
- **Attributes:**
  - `department_id`: `INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
  - `name`: `VARCHAR(100) NOT NULL UNIQUE`
  - `contact_email`: `VARCHAR(255) NOT NULL`
  - `contact_phone`: `VARCHAR(20) NOT NULL`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Constraints:**
  - `CHECK (char_length(name) >= 3)`
  - `CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\$')`

#### Table 2: `wards`
Represents municipal electoral and administrative zones.
- **Attributes:**
  - `ward_id`: `INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
  - `ward_number`: `VARCHAR(20) NOT NULL UNIQUE`
  - `ward_name`: `VARCHAR(100) NOT NULL`
  - `zone_name`: `VARCHAR(100) NOT NULL`
- **Constraints:**
  - `CHECK (char_length(ward_number) >= 1)`

#### Table 3: `users`
Represents citizens, field staff, and administrative personnel.
- **Attributes:**
  - `user_id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `name`: `VARCHAR(100) NOT NULL`
  - `email`: `VARCHAR(255) NOT NULL UNIQUE`
  - `phone`: `VARCHAR(20) NOT NULL`
  - `password_hash`: `VARCHAR(255) NOT NULL`
  - `role`: `user_role NOT NULL DEFAULT 'CITIZEN'`
  - `department_id`: `INT NULL REFERENCES departments(department_id) ON DELETE RESTRICT`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Constraints:**
  - `CHECK (char_length(name) >= 2)`
  - `CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\$')`
  - `CHECK (role = 'CITIZEN' OR department_id IS NOT NULL)` (Staff and Admins must be associated with a department).

#### Table 4: `categories`
Defines issue classifications with default SLA and department routing.
- **Attributes:**
  - `category_id`: `INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
  - `name`: `VARCHAR(100) NOT NULL UNIQUE`
  - `description`: `TEXT NOT NULL`
  - `department_id`: `INT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT`
  - `default_priority`: `complaint_priority NOT NULL DEFAULT 'MEDIUM'`
  - `sla_hours`: `INT NOT NULL DEFAULT 72`
- **Constraints:**
  - `CHECK (sla_hours > 0)`

#### Table 5: `complaints`
The central operational entity recording civic issues.
- **Attributes:**
  - `complaint_id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `citizen_id`: `UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT`
  - `category_id`: `INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT`
  - `ward_id`: `INT NOT NULL REFERENCES wards(ward_id) ON DELETE RESTRICT`
  - `title`: `VARCHAR(200) NOT NULL`
  - `description`: `TEXT NOT NULL`
  - `latitude`: `NUMERIC(9,6) NOT NULL`
  - `longitude`: `NUMERIC(9,6) NOT NULL`
  - `landmark`: `VARCHAR(255) NULL`
  - `status`: `complaint_status NOT NULL DEFAULT 'REPORTED'`
  - `priority`: `complaint_priority NOT NULL DEFAULT 'MEDIUM'`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Constraints:**
  - `CHECK (latitude BETWEEN -90.000000 AND 90.000000)`
  - `CHECK (longitude BETWEEN -180.000000 AND 180.000000)`
  - `CHECK (char_length(title) >= 5)`

#### Table 6: `complaint_images`
Photographic evidence supporting issue reporting or resolution verification.
- **Attributes:**
  - `image_id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `complaint_id`: `UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE`
  - `image_url`: `VARCHAR(512) NOT NULL UNIQUE`
  - `caption`: `VARCHAR(255) NULL`
  - `uploaded_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Constraints:**
  - `CHECK (image_url ~* '^https?://.+\$')`

#### Table 7: `complaint_assignments`
Formal delegation of complaints to departments and field officers.
- **Attributes:**
  - `assignment_id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
  - `complaint_id`: `UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE`
  - `department_id`: `INT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT`
  - `assigned_to_officer_id`: `UUID NULL REFERENCES users(user_id) ON DELETE SET NULL`
  - `assigned_by_user_id`: `UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT`
  - `notes`: `TEXT NULL`
  - `assigned_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`

#### Table 8: `complaint_status_history`
Immutable audit log recording every lifecycle milestone.
- **Attributes:**
  - `history_id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
  - `complaint_id`: `UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE`
  - `previous_status`: `complaint_status NULL`
  - `new_status`: `complaint_status NOT NULL`
  - `changed_by_user_id`: `UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT`
  - `remarks`: `TEXT NULL`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Constraints:**
  - `CHECK (previous_status IS DISTINCT FROM new_status)`

#### Table 9: `complaint_comments`
Discussion and official communication thread for complaints.
- **Attributes:**
  - `comment_id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
  - `complaint_id`: `UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE`
  - `user_id`: `UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT`
  - `comment_text`: `TEXT NOT NULL`
  - `is_official_update`: `BOOLEAN NOT NULL DEFAULT FALSE`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Constraints:**
  - `CHECK (char_length(comment_text) >= 1)`

#### Table 10: `duplicate_complaints`
Relationship linking redundant complaints to a canonical issue ticket.
- **Attributes:**
  - `duplicate_complaint_id`: `UUID PRIMARY KEY REFERENCES complaints(complaint_id) ON DELETE CASCADE`
  - `canonical_complaint_id`: `UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE`
  - `detected_by_user_id`: `UUID NULL REFERENCES users(user_id) ON DELETE SET NULL`
  - `confidence_score`: `NUMERIC(4,3) NULL`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Constraints:**
  - `CHECK (duplicate_complaint_id <> canonical_complaint_id)` (A complaint cannot be marked duplicate of itself).
  - `CHECK (confidence_score IS NULL OR (confidence_score >= 0.000 AND confidence_score <= 1.000))`

#### Table 11: `notifications`
Dispatched user alerts regarding status transitions, comments, and task assignments.
- **Attributes:**
  - `notification_id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
  - `user_id`: `UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE`
  - `complaint_id`: `UUID NULL REFERENCES complaints(complaint_id) ON DELETE SET NULL`
  - `title`: `VARCHAR(150) NOT NULL`
  - `message`: `TEXT NOT NULL`
  - `is_read`: `BOOLEAN NOT NULL DEFAULT FALSE`
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`

---

## 10. Database Design Decisions and Integrity Constraints

### 10.1 Decoupled Media Storage Architecture
A critical design decision in CivicSync is avoiding the storage of raw image binaries (`BYTEA` / BLOBs) directly inside PostgreSQL tables. Storing multi-megabyte photographic files in the database degrades vacuum operations, bloats table storage, exhausts memory buffers, and impairs backup and restoration speeds. Instead, CivicSync adopts an enterprise-standard decoupled architecture:
- Media files are uploaded to cloud object storage (e.g., S3).
- The relational table `complaint_images` stores validated URLs (`VARCHAR(512)`), metadata captions, and upload timestamps.
- A regex check constraint `CHECK (image_url ~* '^https?://.+\$')` guarantees URI format validity at the persistence tier.

### 10.2 Geospatial Coordinate Precision and PostGIS Compatibility
Civic issues require geographic location pinning to facilitate spatial clustering and ward allocation. CivicSync uses `NUMERIC(9,6)` for both latitude and longitude:
- Precision of 6 decimal places yields spatial accuracy of approximately 0.11 meters at the equator.
- Strict check constraints enforce spherical coordinate limits:
  ```sql
  CHECK (latitude BETWEEN -90.000000 AND 90.000000)
  CHECK (longitude BETWEEN -180.000000 AND 180.000000)
  ```
- This numeric representation is lightweight, indexable, and converts cleanly into PostGIS spatial geometry points (`ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`) when geospatial proximity queries are introduced in subsequent modules.

### 10.3 Non-Cyclic Duplicate Complaint Hierarchy
Duplicate complaints arise when multiple citizens report the same infrastructure defect (e.g., the same pothole on a major thoroughfare). CivicSync resolves this via `duplicate_complaints`:
- `duplicate_complaint_id` is both the primary key of `duplicate_complaints` and a foreign key referencing `complaints.complaint_id`.
- This ensures that a complaint can be marked as a duplicate at most once.
- A database-level check constraint `CHECK (duplicate_complaint_id <> canonical_complaint_id)` prevents self-referential duplication.
- When querying active issues, municipal officers can filter out duplicate child records while aggregating community impact counts through canonical master complaints.

### 10.4 Append-Only Audit Logging for Administrative Accountability
Municipal transparency mandates an immutable record of every lifecycle update:
- In `complaint_status_history`, status transitions are appended sequentially with the modifying user's identifier and timestamp.
- A database check constraint `CHECK (previous_status IS DISTINCT FROM new_status)` guarantees that redundant or null-state updates cannot be inserted.
- Deleting a complaint cascades (`ON DELETE CASCADE`) to its audit history, maintaining referential hygiene without orphan records.

### 10.5 Referential Actions and Data Safety
The schema employs deliberate referential action strategies:
- **`ON DELETE RESTRICT`:** Applied to foundational catalogs (`departments`, `wards`, `categories`, and `users`). A department or user cannot be accidentally deleted if active complaints or assignments reference them.
- **`ON DELETE CASCADE`:** Applied to strictly dependent child entities (`complaint_images`, `complaint_assignments`, `complaint_status_history`, `complaint_comments`). Removing a test or purged complaint automatically cleans up its associated logs.
- **`ON DELETE SET NULL`:** Applied to optional delegation references (`assigned_to_officer_id`, `detected_by_user_id`). If an officer account is deactivated, existing assignments preserve their historical departmental link while unsetting the individual officer reference.

---

## 11. Conclusion

The relational normalization of the CivicSync database from an unnormalized monolithic representation through 1NF, 2NF, 3NF, and BCNF achieves significant structural and operational advantages:

1. **Elimination of Structural Redundancy:** By isolating independent municipal entities (`departments`, `wards`, `categories`, `users`) from transient transactional events (`complaints`, `assignments`, `status_history`), repetitive string storage is eliminated. This significantly reduces disk consumption and buffer pool memory footprint in PostgreSQL.
2. **Total Elimination of Relational Anomalies:**
   - *Insertion:* Administrative infrastructure (departments, wards, categories) can be created and managed without requiring artificial complaint submissions.
   - *Update:* Any change to a citizen's contact details, department leadership, or category SLA occurs in exactly one row within one table.
   - *Deletion:* Pruning old complaint logs or removing duplicate reports leaves parent municipal records intact.
3. **Rigorous Enforcement of Business Integrity:** The schema leverages PostgreSQL native features—including ENUM domain constraints, geospatial numeric bounding checks, regex email validations, and foreign key referential integrity (`ON DELETE RESTRICT`, `ON DELETE CASCADE`, `ON DELETE SET NULL`)—to enforce business rules at the persistence tier rather than relying solely on application middleware.
4. **Architectural Scalability:** The separation of audit histories (`complaint_status_history`), media records (`complaint_images`), and threaded updates (`complaint_comments`) ensures that high-volume read operations on the primary `complaints` table remain performant, laying a solid foundation for subsequent indexing, spatial querying with PostGIS, and analytics dashboard aggregation.
5. **Seamless Foundation for Subsequent Coursework:** This normalized schema serves as the exact foundation for the CP2 Entity-Relationship Diagram (`dbms/02_er_diagram.png`) and subsequent physical DDL scripts, ensuring 100% architectural consistency across all deliverables.
