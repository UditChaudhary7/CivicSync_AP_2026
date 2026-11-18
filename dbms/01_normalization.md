# CivicSync: Database Schema Design and Normalization Analysis (CP1)

**Coursework Component:** CP1 — Database Schema Design and Normalization  
**Project Name:** CivicSync — Smart Civic Issue Reporting and Tracking Platform  
**Target RDBMS:** PostgreSQL 16+  
**Document Reference:** `dbms/01_normalization.md`  

---

## A. Introduction

### 1. Project Overview
CivicSync is a modern, web-based civic issue reporting and infrastructure management platform. The primary objective of the platform is to bridge the communication gap between citizens and municipal authorities, fostering transparency, accountability, and operational efficiency in urban maintenance. 

Urban centers continually experience infrastructure degradation, ranging from damaged roadways and failed illumination to sanitation failures and pipeline ruptures. Traditional issue management relies on fragmented reporting channels (e.g., physical complaint registers, sporadic telephone complaints), which lack real-time tracking, spatial awareness, and automated departmental routing. CivicSync addresses these challenges by providing:
- A citizen-facing interface to submit geolocated, photographic complaints across diverse civic categories.
- Real-time status tracking and transparent communication channels.
- An administrative and departmental dashboard enabling municipal staff to triage, prioritize, assign, and resolve reported issues.
- Automated duplicate detection to identify recurring or overlapping complaints filed within the same geographical vicinity.
- Comprehensive audit trails tracking the complete lifecycle of every complaint from submission to resolution.

### 2. Purpose of the Database
The CivicSync database functions as the mission-critical Online Transaction Processing (OLTP) backbone of the platform. Given the concurrent nature of municipal operations—where hundreds of citizens may submit complaints simultaneously while municipal officers update statuses and reassign personnel—the database must guarantee:
- **Strict ACID Properties:** Atomicity and consistency across state changes, such as simultaneous complaint assignments and audit log insertions.
- **Relational Integrity:** Strong enforcement of referential constraints, non-nullability, domain validity, and entity uniqueness at the database engine level.
- **Elimination of Data Anomalies:** Preventing insertion, update, and deletion anomalies through systematic relational normalization.
- **Spatial and Temporal Accuracy:** Accurate storage of geographical coordinates (latitude and longitude) and high-precision UTC timestamps for strict Service Level Agreement (SLA) calculations and historical reporting.

### 3. Database Requirements
Based on the operational workflows of CivicSync, the database must satisfy the following functional and business requirements:

1. **User and Identity Management:** Support Role-Based Access Control (RBAC) across distinct actors: Citizens, Field Officers/Staff, Department Administrators, and Super Administrators. Securely store authentication credentials, contact details, and role assignments.
2. **Municipal Administrative Organization:** Maintain structured records of municipal departments (e.g., Public Works, Sanitation, Electrical, Water Supply) and geographic administrative zones/wards.
3. **Issue Categorization and Routing:** Classify civic problems into standardized categories (e.g., Pothole, Broken Streetlight, Sewage Overflow) mapped directly to designated responsible departments with default priority levels and resolution SLA thresholds.
4. **Complaint Lifecycle and Media Records:** Store granular complaint data, including citizen descriptions, exact geospatial coordinates (WGS 84 latitude/longitude), physical landmarks, ward references, and multi-image attachments validating the problem.
5. **Departmental Assignment Workflow:** Permit complaints to be officially assigned to municipal departments and delegated to specific field officers, capturing assignment dates, reassignment histories, and assignment notes.
6. **Immutable Status History (Audit Trail):** Every status transition (e.g., `REPORTED` $\to$ `UNDER_REVIEW` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `RESOLVED` $\to$ `CLOSED`) must be recorded immutably with the identity of the modifying actor, timestamp, and transition remarks.
7. **Citizen-Authority Collaboration:** Support threaded public updates, official progress comments, and citizen feedback ratings upon resolution.
8. **Duplicate Complaint Management:** Support linking redundant citizen reports to a primary master complaint to aggregate public impact metrics while avoiding redundant work orders.
9. **Notification Dispatch Logs:** Track asynchronous system notifications triggered by status transitions, comments, and assignments for auditability and delivery tracking.

### 4. Main Entities and Their Responsibilities

| Entity | Primary Responsibility |
| :--- | :--- |
| **`users`** | Stores account profiles, contact details, authentication credentials, and system roles (`CITIZEN`, `STAFF`, `DEPT_ADMIN`, `SUPER_ADMIN`). |
| **`departments`** | Represents municipal administrative bodies responsible for specific public infrastructure domains. |
| **`wards`** | Defines geographic administrative subdivisions (wards and zones) for spatial triage and jurisdiction assignment. |
| **`categories`** | Defines standardized civic problem types, mapping each to its default responsible department and resolution SLA. |
| **`complaints`** | Serves as the central operational record representing a reported civic issue, its current status, priority, and location. |
| **`complaint_images`** | Stores metadata and URLs of photographic evidence uploaded during complaint submission or resolution verification. |
| **`complaint_assignments`** | Records formal task allocations of complaints to departments and designated field personnel. |
| **`complaint_status_history`** | Maintains an append-only, tamper-resistant audit log of all complaint status transitions and remarks. |
| **`complaint_comments`** | Supports two-way communication between citizens and municipal staff regarding complaint updates. |
| **`duplicate_complaints`** | Maps redundant complaints to canonical primary complaints to consolidate field operations. |
| **`notifications`** | Records dispatched alerts and messages sent to users regarding complaint milestones. |

### 5. System Design Assumptions
To establish a clear boundary for the relational model, the following architectural and business assumptions are formally adopted:
1. **User Identity and Roles:** Every actor (Citizen, Field Staff, Department Administrator, Super Administrator) authenticates via the unified `users` table. Citizens do not require a department affiliation (`department_id IS NULL`), whereas municipal staff and department administrators must be linked to exactly one department.
2. **Decoupled Media Persistence:** Photographic evidence files (JPEG, PNG, WebP) are uploaded to an external object storage service (e.g., AWS S3 or private cloud bucket). The database records strictly atomic URI strings, metadata, and upload timestamps, avoiding BLOB bloat in PostgreSQL tables.
3. **Geospatial Coordinate Representation:** Geographic locations are stored using standard WGS 84 geographic coordinates (`NUMERIC(9,6)` for latitude and longitude), providing sub-meter precision (~0.11 meters at the equator), ensuring compatibility with PostgreSQL geometric functions and PostGIS spatial extensions.
4. **Non-Cyclic Duplicate Hierarchy:** A complaint can be marked as a duplicate of at most one active canonical complaint. A canonical complaint cannot itself be marked as a duplicate, preventing recursive or circular duplicate hierarchies.
5. **Append-Only Auditing:** Status transitions and assignment records are strictly append-only. Application-level update and delete operations are disallowed on `complaint_status_history` to ensure legal and administrative accountability.
6. **SLA and Category Mapping:** Each issue category maps to exactly one default municipal department and specifies a baseline resolution SLA in hours. If a complaint is subsequently reassigned to a different department, the reassignment is captured in `complaint_assignments` without altering the canonical category definition.

---

## B. Initial Database Design

### 1. Unnormalized Relational Representation
In naive database design, developers frequently start with a single consolidated structure or a denormalized flat file. To evaluate the normalization progression rigorously, consider an initial unnormalized relation representing the submission, triage, and assignment of civic issues:

$$\text{UNNORMALIZED\_CIVIC\_REPORT}(\underline{\text{complaint\_id}}, \text{citizen\_name}, \text{citizen\_email}, \text{citizen\_phone}, \text{title}, \text{description}, \text{category\_name}, \text{dept\_name}, \text{dept\_head}, \text{dept\_email}, \text{latitude}, \text{longitude}, \text{ward\_number}, \text{zone\_name}, \text{image\_urls}, \text{assigned\_officer\_names}, \text{assigned\_officer\_emails}, \text{status}, \text{status\_history}, \text{priority}, \text{created\_at})$$

### 2. Sample Unnormalized Data Instance

The table below illustrates sample data within this unnormalized structure:

| complaint_id | citizen_name | citizen_email | title | category_name | dept_name | dept_head | ward_number | image_urls | assigned_officer_names | status | status_history |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `C-101` | Ramesh Rao | ramesh@civic.in | Deep Pothole on MG Road | Road Works | Public Works Dept | Er. Suresh Nair | Ward 12 | `img1.jpg, img2.jpg` | Er. Rajesh Kumar, Er. Priya Sharma | `IN_PROGRESS` | `[2026-10-01 09:00: SUBMITTED], [2026-10-02 11:30: IN_PROGRESS]` |
| `C-102` | Ramesh Rao | ramesh@civic.in | Broken Streetlight | Electrical | Power & Lighting | Er. K. V. Verma | Ward 12 | `img3.jpg` | Er. Anil Mohan | `REPORTED` | `[2026-10-02 14:00: SUBMITTED]` |
| `C-103` | Sunita Mehta | sunita@civic.in | Overflowing Garbage Bin | Sanitation | Solid Waste Mgmt | Smt. Anandi Devi | Ward 05 | `img4.jpg, img5.jpg, img6.jpg` | Er. Sunil Patil | `RESOLVED` | `[2026-10-01 10:15: SUBMITTED], [2026-10-01 16:00: RESOLVED]` |
| `C-104` | Sunita Mehta | sunita@civic.in | Damaged Pavement | Road Works | Public Works Dept | Er. Suresh Nair | Ward 05 | `NULL` | NULL | `REPORTED` | `[2026-10-03 08:30: SUBMITTED]` |

### 3. Identification of Data Redundancy
The unnormalized relation exhibits massive data redundancy across several dimensions:
1. **Citizen Metadata Redundancy:** Citizen attributes (`citizen_name`, `citizen_email`, `citizen_phone`) are repeated identically every time a citizen files a new complaint.
2. **Departmental Metadata Redundancy:** Department information (`dept_name`, `dept_head`, `dept_email`) is replicated across every complaint belonging to that department.
3. **Geographic Information Redundancy:** Ward and zone associations (`ward_number`, `zone_name`) are duplicated for every complaint occurring in that ward.

### 4. Relational Anomalies

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

## C. First Normal Form (1NF)

### 1. Requirements of 1NF
A relation $R$ is in First Normal Form (1NF) if and only if:
1. All underlying attribute domains contain only **atomic (indivisible)** values.
2. There are **no repeating groups** or multi-valued attributes stored within a single tuple.
3. Each record is uniquely identifiable through a well-defined primary key.

### 2. Violations in the Initial Design
The initial relation violates 1NF on multiple counts:
- `image_urls`: Contains comma-separated collections of strings (`img1.jpg, img2.jpg`), representing a non-atomic repeating group.
- `assigned_officer_names` and `assigned_officer_emails`: Stores non-atomic, comma-delimited lists of personnel assigned to the complaint.
- `status_history`: Encodes a structured array of timestamps, state transitions, and remarks into a compound text field.

### 3. Transformation to 1NF
To achieve 1NF, all multi-valued attributes and repeating groups must be eliminated. We isolate repeating entities into dedicated relations where every attribute holds a strictly atomic scalar value, and each relation possesses a well-defined primary key.

We decompose the flat record into four initial atomic relations:

#### Relation 1: `COMPLAINT_1NF`
Stores atomic complaint details, citizen contact, department, and location data:
$$\text{COMPLAINT\_1NF}(\underline{\text{complaint\_id}}, \text{citizen\_name}, \text{citizen\_email}, \text{citizen\_phone}, \text{title}, \text{description}, \text{category\_name}, \text{dept\_name}, \text{dept\_head}, \text{ward\_number}, \text{zone\_name}, \text{latitude}, \text{longitude}, \text{status}, \text{priority}, \text{created\_at})$$

#### Relation 2: `COMPLAINT_IMAGE_1NF`
Eliminates the repeating image attribute:
$$\text{COMPLAINT\_IMAGE\_1NF}(\underline{\text{complaint\_id}, \text{image\_url}}, \text{caption}, \text{uploaded\_at})$$

#### Relation 3: `COMPLAINT_ASSIGNMENT_1NF`
Eliminates repeating assigned personnel:
$$\text{COMPLAINT\_ASSIGNMENT\_1NF}(\underline{\text{complaint\_id}, \text{officer\_email}}, \text{officer\_name}, \text{dept\_name}, \text{assigned\_at})$$

#### Relation 4: `COMPLAINT_STATUS_HISTORY_1NF`
Eliminates compound status history arrays:
$$\text{COMPLAINT\_STATUS\_HISTORY\_1NF}(\underline{\text{complaint\_id}, \text{changed\_at}}, \text{status}, \text{changed\_by\_email}, \text{remarks})$$

### 4. Before-and-After Tabular Examples

#### Before 1NF: `image_urls` attribute in `UNNORMALIZED_CIVIC_REPORT`
| complaint_id | image_urls |
| :--- | :--- |
| `C-101` | `img1.jpg, img2.jpg` |
| `C-103` | `img4.jpg, img5.jpg, img6.jpg` |

#### After 1NF: Flattened Atomic Tuples in `COMPLAINT_IMAGE_1NF`
| complaint_id | image_url | caption | uploaded_at |
| :--- | :--- | :--- | :--- |
| `C-101` | `https://s3.civic.in/c101_1.jpg` | Pothole overview | 2026-10-01 09:02:00 |
| `C-101` | `https://s3.civic.in/c101_2.jpg` | Close-up depth measurement | 2026-10-01 09:02:15 |
| `C-103` | `https://s3.civic.in/c103_1.jpg` | Bin overflow front view | 2026-10-01 10:16:00 |
| `C-103` | `https://s3.civic.in/c103_2.jpg` | Spillage across pedestrian walkway | 2026-10-01 10:16:20 |
| `C-103` | `https://s3.civic.in/c103_3.jpg` | Surrounding garbage scatter | 2026-10-01 10:16:45 |

### 5. Evaluation of 1NF Schema
While 1NF ensures all attribute values are atomic and individual tuples are uniquely addressable, the schema still suffers from severe redundancy because partial and transitive functional dependencies remain unaddressed.

---

## D. Second Normal Form (2NF)

### 1. Requirements of 2NF
A relation $R$ is in Second Normal Form (2NF) if and only if:
1. $R$ is in First Normal Form (1NF).
2. Every **non-prime attribute** is **fully functionally dependent** on every candidate key of $R$.

That is, no non-prime attribute may depend on a proper subset of any candidate key (elimination of **partial dependencies**). If a relation's candidate keys consist of single attributes, the relation is automatically in 2NF. 2NF violations emerge exclusively in relations with composite candidate keys.

### 2. Identifying Partial Dependencies in 1NF Relations

Let us analyze the relations with composite candidate keys created during 1NF decomposition:

#### Analysis of `COMPLAINT_ASSIGNMENT_1NF`:
$$\text{COMPLAINT\_ASSIGNMENT\_1NF}(\underline{\text{complaint\_id}, \text{officer\_email}}, \text{officer\_name}, \text{dept\_name}, \text{assigned\_at})$$

- **Candidate Key:** $\{\text{complaint\_id}, \text{officer\_email}\}$
- **Prime Attributes:** $\text{complaint\_id}, \text{officer\_email}$
- **Non-Prime Attributes:** $\text{officer\_name}, \text{dept\_name}, \text{assigned\_at}$
- **Functional Dependencies:**
  - $FD_1: \{\text{complaint\_id}, \text{officer\_email}\} \to \text{assigned\_at}$ (Full dependency on the whole key).
  - $FD_2: \{\text{officer\_email}\} \to \text{officer\_name}, \text{dept\_name}$ (Partial dependency: depends only on a proper subset of the composite candidate key).

Because the non-prime attributes $\text{officer\_name}$ and $\text{dept\_name}$ depend strictly on $\text{officer\_email}$, a partial dependency exists. If an officer is assigned to 50 complaints, their name and department are needlessly duplicated 50 times.

#### Analysis of `COMPLAINT_STATUS_HISTORY_1NF`:
$$\text{COMPLAINT\_STATUS\_HISTORY\_1NF}(\underline{\text{complaint\_id}, \text{changed\_at}}, \text{status}, \text{changed\_by\_email}, \text{changed\_by\_name}, \text{remarks})$$

- **Candidate Key:** $\{\text{complaint\_id}, \text{changed\_at}\}$
- **Prime Attributes:** $\text{complaint\_id}, \text{changed\_at}$
- **Non-Prime Attributes:** $\text{status}, \text{changed\_by\_email}, \text{changed\_by\_name}, \text{remarks}$
- **Functional Dependencies:**
  - $FD_3: \{\text{complaint\_id}, \text{changed\_at}\} \to \text{status}, \text{changed\_by\_email}, \text{remarks}$ (Full dependency).
  - $FD_4: \{\text{changed\_by\_email}\} \to \text{changed\_by\_name}$ (Transitive / partial context if user details are embedded).

### 3. Elimination of Partial Dependencies
To eliminate partial dependencies, we project the relation into smaller relations such that attributes determined by a subkey are moved into a relation where that subkey is the entire primary key.

#### Decomposition of `COMPLAINT_ASSIGNMENT_1NF`:
1. Extract the officer entity:
   $$\text{OFFICER}(\underline{\text{officer\_email}}, \text{officer\_name}, \text{dept\_name})$$
   Here, $\text{officer\_email}$ is the single-attribute primary key. No partial dependencies are possible.
2. Retain the pure relationship entity:
   $$\text{COMPLAINT\_ASSIGNMENT\_2NF}(\underline{\text{complaint\_id}, \text{officer\_email}}, \text{assigned\_at})$$
   Here, $\text{assigned\_at}$ is fully dependent on the complete candidate key $\{\text{complaint\_id}, \text{officer\_email}\}$.

#### Decomposition of `COMPLAINT_IMAGE_1NF`:
Assign an explicit surrogate primary key or maintain clean composition:
$$\text{COMPLAINT\_IMAGE\_2NF}(\underline{\text{image\_id}}, \text{complaint\_id}, \text{image\_url}, \text{caption}, \text{uploaded\_at})$$
Since $\text{image\_id}$ is the sole primary key:
$$\{\text{image\_id}\} \to \text{complaint\_id}, \text{image\_url}, \text{caption}, \text{uploaded\_at}$$
All non-prime attributes are fully functionally dependent on the single-attribute candidate key.

### 4. Proof of Lossless Join and Dependency Preservation
Let $R = \text{COMPLAINT\_ASSIGNMENT\_1NF}$ with attributes:
$$R = \{\text{complaint\_id}, \text{officer\_email}, \text{officer\_name}, \text{dept\_name}, \text{assigned\_at}\}$$
We decompose $R$ into:
$$R_1 = \{\text{officer\_email}, \text{officer\_name}, \text{dept\_name}\}$$
$$R_2 = \{\text{complaint\_id}, \text{officer\_email}, \text{assigned\_at}\}$$

- **Lossless Join Verification:**
  $$R_1 \cap R_2 = \{\text{officer\_email}\}$$
  In $R_1$, the functional dependency $\{\text{officer\_email}\} \to \{\text{officer\_name}, \text{dept\_name}\}$ holds.
  Therefore, $R_1 \cap R_2$ is a superkey of $R_1$. By relational decomposition theorems, the decomposition is guaranteed to be **lossless**.
- **Dependency Preservation:**
  - $FD_1: \{\text{complaint\_id}, \text{officer\_email}\} \to \text{assigned\_at}$ is preserved in $R_2$.
  - $FD_2: \{\text{officer\_email}\} \to \text{officer\_name}, \text{dept\_name}$ is preserved in $R_1$.
  All original functional dependencies are fully preserved.

---

## E. Third Normal Form (3NF)

### 1. Requirements of 3NF
A relation $R$ is in Third Normal Form (3NF) if and only if:
1. $R$ is in Second Normal Form (2NF).
2. For every non-trivial functional dependency $X \to Y$ holding in $R$, at least one of the following conditions is satisfied:
   - $X$ is a **superkey** of $R$, OR
   - $Y$ is a **prime attribute** of $R$ (each attribute in $Y$ is a member of some candidate key of $R$).

Equivalently, 3NF requires that no non-prime attribute is **transitively dependent** on any candidate key ($X \to Z$ via $X \to Y$ and $Y \to Z$, where neither $Y \to X$ nor $Z \subseteq Y$).

### 2. Identifying Transitive Dependencies in 2NF Relations

Let us examine `COMPLAINT_1NF` (which is in 2NF because its primary key is single-attribute `complaint_id`):

$$\text{COMPLAINT\_2NF}(\underline{\text{complaint\_id}}, \text{citizen\_name}, \text{citizen\_email}, \text{citizen\_phone}, \text{title}, \text{description}, \text{category\_name}, \text{dept\_name}, \text{dept\_head}, \text{ward\_number}, \text{zone\_name}, \text{latitude}, \text{longitude}, \text{status}, \text{priority}, \text{created\_at})$$

- Primary Key: $\text{complaint\_id}$
- All attributes are non-prime except $\text{complaint\_id}$.

We evaluate the following functional dependencies:

1. **Citizen Transitive Dependency:**
   - $\text{complaint\_id} \to \text{citizen\_email}$
   - $\text{citizen\_email} \to \text{citizen\_name}, \text{citizen\_phone}$
   - Here, $\text{citizen\_email} \to \text{citizen\_name}$ is a non-trivial FD where $\text{citizen\_email}$ is NOT a superkey of `COMPLAINT_2NF`, and $\text{citizen\_name}$ is NOT a prime attribute.
   - This is a direct **transitive dependency**: $\text{complaint\_id} \to \text{citizen\_name}$.

2. **Category and Department Transitive Dependency:**
   - $\text{complaint\_id} \to \text{category\_name}$
   - $\text{category\_name} \to \text{dept\_name}$
   - $\text{dept\_name} \to \text{dept\_head}$
   - Neither $\text{category\_name}$ nor $\text{dept\_name}$ is a superkey of the complaint relation. Therefore, non-prime attributes $\text{dept\_name}$ and $\text{dept\_head}$ are transitively dependent on $\text{complaint\_id}$.

3. **Geographical Ward Transitive Dependency:**
   - $\text{complaint\_id} \to \text{ward\_number}$
   - $\text{ward\_number} \to \text{zone\_name}$
   - $\text{ward\_number}$ is not a superkey of the complaint relation, yet it determines $\text{zone\_name}$. This is another transitive dependency.

### 3. Elimination of Transitive Dependencies
To achieve 3NF, we extract the determinant and its dependent attributes into separate independent relations:

1. **Extraction of Users:**
   $$\text{USERS}(\underline{\text{user\_id}}, \text{name}, \text{email}, \text{phone}, \text{role}, \text{password\_hash}, \text{created\_at})$$
   Primary Key: $\text{user\_id}$. Alternate Key: $\text{email}$.
   All citizen profile attributes are isolated here.

2. **Extraction of Departments:**
   $$\text{DEPARTMENTS}(\underline{\text{department\_id}}, \text{name}, \text{contact\_email}, \text{contact\_phone}, \text{created\_at})$$
   Primary Key: $\text{department\_id}$. Alternate Key: $\text{name}$.

3. **Extraction of Categories:**
   $$\text{CATEGORIES}(\underline{\text{category\_id}}, \text{name}, \text{description}, \text{department\_id}, \text{default\_priority}, \text{sla\_hours})$$
   Primary Key: $\text{category\_id}$. Foreign Key: $\text{department\_id} \to \text{DEPARTMENTS}(\text{department\_id})$.

4. **Extraction of Wards:**
   $$\text{WARDS}(\underline{\text{ward\_id}}, \text{ward\_number}, \text{ward\_name}, \text{zone\_name})$$
   Primary Key: $\text{ward\_id}$. Alternate Key: $\text{ward\_number}$.

5. **Cleaned Complaint Relation:**
   $$\text{COMPLAINTS}(\underline{\text{complaint\_id}}, \text{citizen\_id}, \text{category\_id}, \text{ward\_id}, \text{title}, \text{description}, \text{latitude}, \text{longitude}, \text{landmark}, \text{status}, \text{priority}, \text{created\_at}, \text{updated\_at})$$
   Foreign Keys:
   - $\text{citizen\_id} \to \text{USERS}(\text{user\_id})$
   - $\text{category\_id} \to \text{CATEGORIES}(\text{category\_id})$
   - $\text{ward\_id} \to \text{WARDS}(\text{ward\_id})$

### 4. Resolution of Anomalies Through 3NF
- **Insertion:** Departments, Categories, and Wards can now be inserted independently without requiring an existing complaint tuple.
- **Deletion:** Deleting a complaint tuple does not delete the user, department, category, or ward.
- **Update:** Changing a department name or phone number occurs in exactly one tuple in `DEPARTMENTS`. Inconsistency is structurally impossible.

---

## F. Boyce-Codd Normal Form (BCNF)

### 1. Requirements of BCNF
A relation $R$ is in Boyce-Codd Normal Form (BCNF) if and only if:
- For every non-trivial functional dependency $X \to Y$ holding in $R$, the determinant $X$ is a **superkey** of $R$.

BCNF is strictly stronger than 3NF. The difference lies in 3NF's relaxation clause: in 3NF, $X \to Y$ is permitted if $Y$ is a prime attribute, even when $X$ is not a superkey. BCNF disallows this exception completely. Therefore, every BCNF relation is in 3NF, but a 3NF relation with overlapping candidate keys may violate BCNF.

### 2. Rigorous Evaluation of CivicSync Relations

Let us critically evaluate the relations in our schema to test whether any relation satisfies 3NF while violating BCNF.

#### Case Study: Municipal Ward Inspection Jurisdictions
Consider a municipal administrative requirement for field verification:
- Each municipal department operates in various administrative wards.
- In any given ward, a department assigns exactly one **Lead Field Inspector** ($\text{officer\_id}$) responsible for triaging issues.
- Each field inspector belongs to **exactly one** municipal department.
- An inspector can oversee multiple wards for their department.

Suppose this requirement was modeled in a single relation:
$$\text{WARD\_INSPECTION\_LEAD}(\text{ward\_id}, \text{department\_id}, \text{officer\_id})$$

##### Analysis of Functional Dependencies:
1. $FD_1: \{\text{ward\_id}, \text{department\_id}\} \to \text{officer\_id}$  
   *(In a given ward, a specific department has exactly one lead inspector.)*
2. $FD_2: \{\text{officer\_id}\} \to \text{department\_id}$  
   *(Each officer belongs to exactly one department.)*

##### Derivation of Candidate Keys:
- From $FD_1$, the closure $\{\text{ward\_id}, \text{department\_id}\}^+ = \{\text{ward\_id}, \text{department\_id}, \text{officer\_id}\}$.  
  Thus, $K_1 = \{\text{ward\_id}, \text{department\_id}\}$ is a candidate key.
- From $FD_2$, replacing $\text{department\_id}$ in $K_1$ with $\text{officer\_id}$:  
  $\{\text{ward\_id}, \text{officer\_id}\}^+ = \{\text{ward\_id}, \text{officer\_id}, \text{department\_id}\}$.  
  Thus, $K_2 = \{\text{ward\_id}, \text{officer\_id}\}$ is also a candidate key.

##### Prime Attributes:
The set of prime attributes is:
$$\text{Prime} = \{\text{ward\_id}, \text{department\_id}, \text{officer\_id}\}$$
All attributes in the relation are prime.

##### Testing for 3NF:
- For $FD_1: \{\text{ward\_id}, \text{department\_id}\} \to \text{officer\_id}$:
  The determinant is candidate key $K_1$, which is a superkey. (Satisfies 3NF).
- For $FD_2: \{\text{officer\_id}\} \to \text{department\_id}$:
  The determinant $\{\text{officer\_id}\}$ is **NOT** a superkey (an officer can oversee multiple wards, so officer alone cannot determine ward).  
  However, the dependent attribute $\text{department\_id}$ **is a prime attribute** (member of $K_1$).
- **Conclusion:** Because the right-hand side is a prime attribute, **$\text{WARD\_INSPECTION\_LEAD}$ satisfies 3NF!**

##### Testing for BCNF:
- Evaluate $FD_2: \{\text{officer\_id}\} \to \text{department\_id}$:
  - Determinant: $\{\text{officer\_id}\}$
  - Is $\{\text{officer\_id}\}$ a superkey of the relation? **NO.**
- **Conclusion:** Because $FD_2$ has a determinant that is not a superkey, **the relation violates BCNF!**

##### Anomalies Caused by this BCNF Violation:
- **Update Anomaly:** If Inspector Rao ($\text{officer\_id} = 401$) is transferred from Public Works to Sanitation, every tuple where Officer 401 is assigned to a ward must be updated.
- **Insertion Anomaly:** We cannot record that a newly hired inspector belongs to the Public Works department until they are assigned to lead at least one ward.
- **Deletion Anomaly:** If Inspector Rao's sole ward assignment is dissolved, the fact that Officer 401 works for Public Works is lost.

##### BCNF Decomposition:
To eliminate the BCNF violation, we decompose $\text{WARD\_INSPECTION\_LEAD}$ using the violating functional dependency $FD_2: \{\text{officer\_id}\} \to \text{department\_id}$:

1. **Relation 1 ($R_1$):** Extract the violating determinant and its dependent attributes:
   $$\text{STAFF\_DEPARTMENT}(\underline{\text{officer\_id}}, \text{department\_id})$$
   - Functional Dependency: $\{\text{officer\_id}\} \to \text{department\_id}$.
   - Candidate Key: $\{\text{officer\_id}\}$.
   - Determinant $\{\text{officer\_id}\}$ is a superkey. $\implies$ **$R_1$ is in BCNF.**

2. **Relation 2 ($R_2$):** Retain the determinant with the remaining attributes:
   $$\text{WARD\_OFFICER}(\underline{\text{ward\_id}, \text{officer\_id}})$$
   - Candidate Key: $\{\text{ward\_id}, \text{officer\_id}\}$.
   - Only trivial FDs exist. $\implies$ **$R_2$ is in BCNF.**

##### Trade-Off Analysis (Dependency Preservation vs. BCNF):
- In $R_1$, $FD_2$ is preserved.
- In $R_2$, no non-trivial FDs exist.
- Notice that the original $FD_1: \{\text{ward\_id}, \text{department\_id}\} \to \text{officer\_id}$ cannot be verified within a single relation without a relational join between $R_1$ and $R_2$.
- In CivicSync's practical system design, department membership is an intrinsic property of the officer (`users.department_id`), while complaint assignment is handled per complaint rather than by static ward locks. This natural decomposition satisfies BCNF and avoids the anomaly cleanly.

### 3. Verification of Core Relations for BCNF
We now systematically review the core tables in the CivicSync schema to verify that every non-trivial functional dependency $X \to Y$ has a superkey as its determinant $X$:

1. **`users`**:
   - $FD: \{\text{user\_id}\} \to \{\text{name}, \text{email}, \text{phone}, \text{role}, \text{password\_hash}, \text{department\_id}, \text{created\_at}\}$
   - $FD: \{\text{email}\} \to \{\text{user\_id}, \text{name}, \text{phone}, \text{role}, \text{password\_hash}, \text{department\_id}, \text{created\_at}\}$
   - Both determinants $\{\text{user\_id}\}$ and $\{\text{email}\}$ are candidate keys (superkeys). $\implies$ **Satisfies BCNF.**

2. **`departments`**:
   - $FD: \{\text{department\_id}\} \to \{\text{name}, \text{contact\_email}, \text{contact\_phone}, \text{created\_at}\}$
   - $FD: \{\text{name}\} \to \{\text{department\_id}, \text{contact\_email}, \text{contact\_phone}, \text{created\_at}\}$
   - Determinants are superkeys. $\implies$ **Satisfies BCNF.**

3. **`categories`**:
   - $FD: \{\text{category\_id}\} \to \{\text{name}, \text{description}, \text{department\_id}, \text{default\_priority}, \text{sla\_hours}\}$
   - $FD: \{\text{name}\} \to \{\text{category\_id}, \text{description}, \text{department\_id}, \text{default\_priority}, \text{sla\_hours}\}$
   - Determinants are superkeys. $\implies$ **Satisfies BCNF.**

4. **`wards`**:
   - $FD: \{\text{ward\_id}\} \to \{\text{ward\_number}, \text{ward\_name}, \text{zone\_name}\}$
   - $FD: \{\text{ward\_number}\} \to \{\text{ward\_id}, \text{ward\_name}, \text{zone\_name}\}$
   - Determinants are superkeys. $\implies$ **Satisfies BCNF.**

5. **`complaints`**:
   - $FD: \{\text{complaint\_id}\} \to \{\text{citizen\_id}, \text{category\_id}, \text{ward\_id}, \text{title}, \text{description}, \text{latitude}, \text{longitude}, \text{landmark}, \text{status}, \text{priority}, \dots\}$
   - Determinant is the sole candidate key (superkey). $\implies$ **Satisfies BCNF.**

6. **`complaint_images`**:
   - $FD: \{\text{image\_id}\} \to \{\text{complaint\_id}, \text{image\_url}, \text{caption}, \text{uploaded\_at}\}$
   - $FD: \{\text{image\_url}\} \to \{\text{image\_id}, \text{complaint\_id}, \text{caption}, \text{uploaded\_at}\}$
   - Determinants are superkeys. $\implies$ **Satisfies BCNF.**

7. **`complaint_assignments`**:
   - Candidate Key: $\{\text{assignment\_id}\}$
   - Determinant $\{\text{assignment\_id}\}$ is a superkey. $\implies$ **Satisfies BCNF.**

8. **`complaint_status_history`**:
   - Primary Key: $\{\text{history\_id}\}$
   - Determinant $\{\text{history\_id}\}$ is a superkey. $\implies$ **Satisfies BCNF.**

9. **`complaint_comments`**:
   - Primary Key: $\{\text{comment\_id}\}$
   - Determinant $\{\text{comment\_id}\}$ is a superkey. $\implies$ **Satisfies BCNF.**

10. **`duplicate_complaints`**:
    - Candidate Key: $\{\text{canonical\_complaint\_id}, \text{duplicate\_complaint\_id}\}$
    - Determinant is the candidate key (superkey). $\implies$ **Satisfies BCNF.**

11. **`notifications`**:
    - Primary Key: $\{\text{notification\_id}\}$
    - Determinant is a superkey. $\implies$ **Satisfies BCNF.**

---

## G. Functional Dependencies

This section documents the formal minimal cover of functional dependencies governing the CivicSync relational model.

### 1. Entity: `users`
- $FD_{U1}: \{\text{user\_id}\} \to \{\text{name}, \text{email}, \text{phone}, \text{password\_hash}, \text{role}, \text{department\_id}, \text{created\_at}, \text{updated\_at}\}$
- $FD_{U2}: \{\text{email}\} \to \{\text{user\_id}, \text{name}, \text{phone}, \text{password\_hash}, \text{role}, \text{department\_id}, \text{created\_at}, \text{updated\_at}\}$
- *Semantics:* Each user account is uniquely determined either by their surrogate UUID or their unique email address. The associated department applies only to municipal personnel.

### 2. Entity: `departments`
- $FD_{D1}: \{\text{department\_id}\} \to \{\text{name}, \text{contact\_email}, \text{contact\_phone}, \text{created\_at}\}$
- $FD_{D2}: \{\text{name}\} \to \{\text{department\_id}, \text{contact\_email}, \text{contact\_phone}, \text{created\_at}\}$
- *Semantics:* A municipal department has a unique system ID and an officially designated unique organizational name.

### 3. Entity: `wards`
- $FD_{W1}: \{\text{ward\_id}\} \to \{\text{ward\_number}, \text{ward\_name}, \text{zone\_name}\}$
- $FD_{W2}: \{\text{ward\_number}\} \to \{\text{ward\_id}, \text{ward\_name}, \text{zone\_name}\}$
- *Semantics:* Municipal wards are numbered subdivisions within administrative zones. The ward number uniquely determines the ward name and the encompassing administrative zone.

### 4. Entity: `categories`
- $FD_{C1}: \{\text{category\_id}\} \to \{\text{name}, \text{description}, \text{department\_id}, \text{default\_priority}, \text{sla\_hours}\}$
- $FD_{C2}: \{\text{name}\} \to \{\text{category\_id}, \text{description}, \text{department\_id}, \text{default\_priority}, \text{sla\_hours}\}$
- *Semantics:* An issue category has a distinct descriptive name, an assigned default handling department, a baseline severity priority, and a mandatory resolution SLA in hours.

### 5. Entity: `complaints`
- $FD_{CP1}: \{\text{complaint\_id}\} \to \{\text{citizen\_id}, \text{category\_id}, \text{ward\_id}, \text{title}, \text{description}, \text{latitude}, \text{longitude}, \text{landmark}, \text{status}, \text{priority}, \text{created\_at}, \text{updated\_at}\}$
- *Semantics:* A unique complaint ticket ID determines all submitted details, spatial coordinates, classification references, lifecycle states, and modification timestamps.

### 6. Entity: `complaint_images`
- $FD_{CI1}: \{\text{image\_id}\} \to \{\text{complaint\_id}, \text{image\_url}, \text{caption}, \text{uploaded\_at}\}$
- $FD_{CI2}: \{\text{image\_url}\} \to \{\text{image\_id}, \text{complaint\_id}, \text{caption}, \text{uploaded\_at}\}$
- *Semantics:* An uploaded photograph is stored at a distinct URI, associated with exactly one complaint, and possesses an immutable upload timestamp.

### 7. Entity: `complaint_assignments`
- $FD_{CA1}: \{\text{assignment\_id}\} \to \{\text{complaint\_id}, \text{department\_id}, \text{assigned\_to\_officer\_id}, \text{assigned\_by\_user\_id}, \text{notes}, \text{assigned\_at}\}$
- *Semantics:* Each individual assignment transaction is identified by an assignment ID, linking a complaint to a department and optionally to a designated field officer.

### 8. Entity: `complaint_status_history`
- $FD_{SH1}: \{\text{history\_id}\} \to \{\text{complaint\_id}, \text{previous\_status}, \text{new\_status}, \text{changed\_by\_user\_id}, \text{remarks}, \text{created\_at}\}$
- *Semantics:* A specific audit record captures exactly one state transition from a previous status to a new status, recording the actor and timestamp.

### 9. Entity: `complaint_comments`
- $FD_{CM1}: \{\text{comment\_id}\} \to \{\text{complaint\_id}, \text{user\_id}, \text{comment\_text}, \text{is\_official\_update}, \text{created\_at}\}$
- *Semantics:* A comment belongs to a specific complaint and author, denoting whether the entry represents an official municipal progress announcement.

### 10. Entity: `duplicate_complaints`
- $FD_{DC1}: \{\text{duplicate\_complaint\_id}\} \to \{\text{canonical\_complaint\_id}, \text{detected\_by\_user\_id}, \text{confidence\_score}, \text{created\_at}\}$
- *Semantics:* A redundant complaint report can only be linked to at most one canonical (master) complaint. Therefore, the duplicate complaint ID functionally determines the canonical ticket.

### 11. Entity: `notifications`
- $FD_{N1}: \{\text{notification\_id}\} \to \{\text{user\_id}, \text{complaint\_id}, \text{title}, \text{message}, \text{is\_read}, \text{created\_at}\}$
- *Semantics:* Each user notification is unique, linked to an optional triggering complaint and user inbox.

---

## H. Candidate Keys and Primary Keys

### 1. Key Terminology and Criteria
- **Superkey:** A set of attributes within a relation that uniquely identifies each tuple.
- **Candidate Key (CK):** A minimal superkey (no proper subset is itself a superkey).
- **Primary Key (PK):** The candidate key chosen by the database architect to serve as the definitive row identifier.
- **Alternate Key (AK):** Candidate keys not selected as the primary key, enforced using `UNIQUE` constraints.

### 2. Candidate and Primary Key Selection Matrix

| Relation | Identified Candidate Keys | Selected Primary Key | Alternate Keys (Unique) | Selection Justification |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | $CK_1: \{\text{user\_id}\}$, $CK_2: \{\text{email}\}$ | `user\_id` (UUID) | `email` | Surrogate UUID prevents exposure of user email in foreign key relationships; email retains a unique index for login lookup. |
| **`departments`** | $CK_1: \{\text{department\_id}\}$, $CK_2: \{\text{name}\}$ | `department\_id` (INT) | `name` | Compact integer surrogate key provides faster index scans and foreign key joins than text-based department names. |
| **`wards`** | $CK_1: \{\text{ward\_id}\}$, $CK_2: \{\text{ward\_number}\}$ | `ward\_id` (INT) | `ward\_number` | Stable integer surrogate key isolates internal relational references from municipal administrative re-numbering. |
| **`categories`** | $CK_1: \{\text{category\_id}\}$, $CK_2: \{\text{name}\}$ | `category\_id` (INT) | `name` | Compact integer primary key; category names are enforced unique to prevent duplicate catalog entries. |
| **`complaints`** | $CK_1: \{\text{complaint\_id}\}$ | `complaint\_id` (UUID) | None | UUIDv4 guarantees global uniqueness across distributed submission clients and prevents sequential ID enumeration attacks. |
| **`complaint_images`**| $CK_1: \{\text{image\_id}\}$, $CK_2: \{\text{image\_url}\}$ | `image\_id` (UUID) | `image\_url` | URLs are long and prone to external storage migration; a surrogate UUID ensures compact internal indexes. |
| **`complaint_assignments`** | $CK_1: \{\text{assignment\_id}\}$ | `assignment\_id` (BIGINT) | None | A complaint may be reassigned multiple times; a surrogate ID allows full assignment versioning. |
| **`complaint_status_history`** | $CK_1: \{\text{history\_id}\}$ | `history\_id` (BIGINT) | None | Append-only historical log; `BIGINT GENERATED ALWAYS AS IDENTITY` ensures performant, sequentially ordered logging. |
| **`complaint_comments`** | $CK_1: \{\text{comment\_id}\}$ | `comment\_id` (BIGINT) | None | Sequential identity facilitates chronological sorting and threaded discussion retrieval. |
| **`duplicate_complaints`** | $CK_1: \{\text{duplicate\_complaint\_id}\}$ | `duplicate\_complaint\_id` (UUID) | None | A complaint can only be marked duplicate once; using `duplicate_complaint_id` as PK prevents multiple parent mappings. |
| **`notifications`** | $CK_1: \{\text{notification\_id}\}$ | `notification\_id` (BIGINT) | None | High-throughput sequential event log; identity integer maximizes insert efficiency. |

---

## I. Final Normalized Schema

The final normalized schema is specified below for PostgreSQL 16+. It features exact data types, referential actions (`ON DELETE`), default expressions, and domain check constraints.

### 1. Custom Domain Types and Enumerations
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

### 2. Relational Table Specifications

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
  - `CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')`

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
  - `CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')`
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
  - `CHECK (image_url ~* '^https?://.+$')`

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

## J. Conclusion

The relational normalization of the CivicSync database from an unnormalized monolithic representation through 1NF, 2NF, 3NF, and BCNF achieves significant structural and operational advantages:

1. **Elimination of Structural Redundancy:** By isolating independent municipal entities (`departments`, `wards`, `categories`, `users`) from transient transactional events (`complaints`, `assignments`, `status_history`), repetitive string storage is eliminated. This significantly reduces disk consumption and buffer pool memory footprint in PostgreSQL.
2. **Total Elimination of Relational Anomalies:**
   - *Insertion:* Administrative infrastructure (departments, wards, categories) can be created and managed without requiring artificial complaint submissions.
   - *Update:* Any change to a citizen's contact details, department leadership, or category SLA occurs in exactly one row within one table.
   - *Deletion:* Pruning old complaint logs or removing duplicate reports leaves parent municipal records intact.
3. **Rigorous Enforcement of Business Integrity:** The schema leverages PostgreSQL native features—including ENUM domain constraints, geospatial numeric bounding checks, regex email validations, and foreign key referential integrity (`ON DELETE RESTRICT`, `ON DELETE CASCADE`, `ON DELETE SET NULL`)—to enforce business rules at the persistence tier rather than relying solely on application middleware.
4. **Architectural Scalability:** The separation of audit histories (`complaint_status_history`), media records (`complaint_images`), and threaded updates (`complaint_comments`) ensures that high-volume read operations on the primary `complaints` table remain performant, laying a solid foundation for subsequent indexing, spatial querying with PostGIS, and analytics dashboard aggregation.








