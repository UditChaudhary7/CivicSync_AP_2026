# CP4 — Query Performance Analysis and Execution Plans
**Project Name:** CivicSync — Smart Civic Issue Reporting and Tracking Platform  
**Deliverable:** CP4 Database Performance Benchmarking & PostgreSQL Execution Plans  
**Target RDBMS:** PostgreSQL 18.0 (Apple Silicon, POSIX Shared Memory, 128 MB Shared Buffers)  
**Schema Reference:** [`dbms/03_schema.sql`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/03_schema.sql)  
**Query Reference:** [`dbms/04_queries.sql`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/04_queries.sql)  
**Execution Plans Directory:** [`dbms/plans/`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/)  

---

## 1. Executive Summary & Objective

The objective of **CP4 (Coursework Deliverable 4)** is to conduct an empirical, rigorous performance evaluation of the normalized relational queries developed for the **CivicSync** platform. In previous deliverables, the database was normalized to 3NF/BCNF ([`dbms/01_normalization.md`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/01_normalization.md)), visually mapped via Crow's Foot ER notation ([`dbms/02_er_diagram.png`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/02_er_diagram.png)), instantiated in DDL ([`dbms/03_schema.sql`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/03_schema.sql)), and programmed with full application queries ([`dbms/04_queries.sql`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/04_queries.sql)).

In CP4, we evaluate the baseline unindexed database against a statistically significant dataset of **50,420 relational records**. Every query was executed against a live PostgreSQL 18.0 engine using `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)`.

### Key Findings of CP4 Benchmark:
1. **Point Lookups on Unique B-Tree Indexes Are Extremely Fast (0.016 ms – 0.043 ms):** Queries that leverage Primary Keys or Unique constraints (such as Query 1.1 email login and Query 3.3 single complaint view) execute in less than 50 microseconds with minimal shared buffer reads (3–10 blocks).
2. **Missing Secondary Indexes on Foreign Keys Cause Sequential Scan Bottlenecks (0.2 ms – 0.6 ms):** Because the initial CP2 schema only defines Primary Keys and Unique constraints, child tables such as `complaint_images` (6,000 rows), `complaint_assignments` (4,100 rows), `complaint_status_history` (12,300 rows), and `notifications` (15,000 rows) must be scanned entirely whenever filtered by `complaint_id` or `user_id`.
3. **Correlated Scalar Subqueries Cause Severe I/O Multipliers (1.0 ms – 3.3 ms):** Queries with subqueries in the `SELECT` clause (Query 3.1, Query 6.2, and Query 7.2) force PostgreSQL to execute nested sequential scans for every row returned, driving buffer reads from a few hundred blocks to **over 12,500 shared buffer hits**.
4. **Complex Analytical Aggregations Scale with Table Volume (1.1 ms – 1.9 ms):** Departmental SLA compliance (Query 10.2) and category distribution metrics (Query 10.3) perform full table scans combined with `FILTER (WHERE ...)` conditional counting and timestamp duration math.

---

## 2. Benchmarking Environment & Methodology

### 2.1 Hardware and Runtime Environment
- **Host Machine:** Apple MacBook Pro (Apple Silicon M-series)
- **Operating System:** macOS 15 (Darwin 25.1.0)
- **Database Engine:** PostgreSQL 18.0 (Postgres.app distribution)
- **Client Protocol:** Local Unix domain socket (`/tmp/.s.PGSQL.5433`)
- **Shared Memory:** POSIX Shared Memory

### 2.2 PostgreSQL Server Configuration
The database engine was configured with standard production parameters to reflect real server conditions:

| Parameter | Configured Value | Operational Rationale |
| :--- | :--- | :--- |
| `port` | `5433` | Isolated coursework port avoiding port conflicts |
| `shared_buffers` | `128 MB` | Standard caching pool for active relational pages |
| `work_mem` | `4 MB` | Memory budget per sort operation and hash table |
| `random_page_cost` | `1.1` | Tuned for high-speed NVMe solid-state storage |
| `track_io_timing` | `on` | Enables precise I/O read/write time measurement |
| `max_connections` | `20` | Controlled connection concurrency for benchmarking |

### 2.3 Benchmark Dataset Volume
To ensure that PostgreSQL's Cost-Based Optimizer (CBO) produces realistic execution plans rather than defaulting to trivial scans, the database was populated with **50,420 records** across all 11 normalized tables:

| Relational Table | Row Count | Description / Cardinality Details |
| :--- | :--- | :--- |
| `departments` | 5 | Municipal functional departments |
| `wards` | 5 | Geographic administrative wards in East, Central, West, North, and South zones |
| `categories` | 9 | Civic defect categories with SLA windows (12 to 72 hours) and default priorities |
| `users` | 1,001 | 1 Super Admin, 20 Department Admins, 80 Field Officers, 900 Registered Citizens |
| `complaints` | 5,000 | Realistic distribution across wards, categories, priorities, and statuses |
| `complaint_images` | 6,000 | Photographic attachments (1 to 2 photos per complaint) |
| `complaint_assignments` | 4,100 | Workflow assignments delegating complaints to departments and field officers |
| `complaint_status_history` | 12,300 | Immutable audit trail tracking lifecycle status transitions |
| `complaint_comments` | 6,850 | Citizen inquiries and official municipal status announcements |
| `duplicate_complaints` | 150 | Redundant citizen complaints linked to canonical master tickets |
| `notifications` | 15,000 | Automated alert logs delivered to citizens and municipal staff |
| **Total Database Records** | **50,420** | **Fully relational, foreign-key validated production dataset** |

### 2.4 Measurement Protocol
1. **Catalog Statistics Synchronization:** A full `VACUUM ANALYZE` was executed immediately after data loading to ensure `pg_statistic` and `pg_class` contained accurate page and row estimates.
2. **Cold vs. Warm Benchmarking:** Each query was first executed once in cold state, followed by **5 consecutive warm iterations**.
3. **Execution Plan Generation:** Plans were captured using `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)`, recording exact startup cost, total cost, planning time, execution time, buffer hits, buffer reads, loop counts, and memory/disk usage.
4. **Artifact Generation:** Raw plans were exported to individual `.txt` files in [`dbms/plans/`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/) with query identifiers.

---

## 3. Query Performance Timings & Metric Summary

The table below compiles the benchmark results for all **27 analyzed queries** from [`dbms/04_queries.sql`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/04_queries.sql). Timings reflect the arithmetic average of warm runs:

| Query ID | Operational Title & Module | Execution Plan File | Scan Strategy | Join Strategy | Buffers (Shared Hit) | Planning Time (ms) | Avg Execution Time (ms) | Min / Max (ms) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **1.1** | User Authentication by Email | [`query_1_1_auth_by_email.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_1_1_auth_by_email.txt) | Index Scan (`uq_users_email`) | N/A | 3 | 0.184 | **0.017 ms** | 0.014 / 0.023 |
| **1.2** | User Profile with Department Details | [`query_1_2_user_profile_dept.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_1_2_user_profile_dept.txt) | Index Scan (`pk_users`), Seq Scan | Hash Right Join | 5 | 0.356 | **0.041 ms** | 0.036 / 0.049 |
| **1.3** | List Field Officers by Department | [`query_1_3_field_officers_by_dept.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_1_3_field_officers_by_dept.txt) | Seq Scan (`users`, `departments`) | Nested Loop | 25 | 0.240 | **0.074 ms** | 0.070 / 0.079 |
| **2.1** | Departments with Category Count | [`query_2_1_departments_category_count.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_2_1_departments_category_count.txt) | Seq Scan (`departments`, `categories`) | Hash Right Join | 2 | 0.260 | **0.056 ms** | 0.054 / 0.060 |
| **2.2** | Issue Categories with Department & SLA | [`query_2_2_categories_with_sla.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_2_2_categories_with_sla.txt) | Seq Scan (`categories`, `departments`) | Hash Join | 2 | 0.265 | **0.042 ms** | 0.038 / 0.049 |
| **2.4** | Wards and Administrative Zones | [`query_2_4_wards_zones.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_2_4_wards_zones.txt) | Seq Scan (`wards`) | N/A | 1 | 0.136 | **0.023 ms** | 0.018 / 0.033 |
| **3.1** | Citizen "My Complaints" Feed + Thumbnail | [`query_3_1_citizen_my_complaints.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_3_1_citizen_my_complaints.txt) | Seq Scan (`complaints`, `images`) | Nested Loop + SubPlan | 5,595 | 0.544 | **1.068 ms** | 1.031 / 1.099 |
| **3.2** | Citizen Complaints Total Count | [`query_3_2_citizen_complaints_count.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_3_2_citizen_complaints_count.txt) | Seq Scan (`complaints`) | N/A | 228 | 0.158 | **0.391 ms** | 0.255 / 0.560 |
| **3.3** | Single Complaint View (360° Profile) | [`query_3_3_single_complaint_360_view.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_3_3_single_complaint_360_view.txt) | Index Scan (`pk_complaints`, `pk_users`), Seq Scan | Nested Loop (4x) | 7 | 0.617 | **0.043 ms** | 0.039 / 0.049 |
| **4.1** | Retrieve Photographic Evidence | [`query_4_1_complaint_images.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_4_1_complaint_images.txt) | Seq Scan (`complaint_images`) | N/A | 63 | 0.160 | **0.240 ms** | 0.212 / 0.265 |
| **4.2** | Complaint Status History Audit Trail | [`query_4_2_complaint_status_history.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_4_2_complaint_status_history.txt) | Seq Scan (`status_history`), Index Scan (`users`) | Nested Loop | 102 | 0.342 | **0.364 ms** | 0.333 / 0.393 |
| **4.3** | Threaded Comments & Updates | [`query_4_3_complaint_comments.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_4_3_complaint_comments.txt) | Seq Scan (`comments`), Index Scan (`users`) | Nested Loop | 61 | 0.268 | **0.223 ms** | 0.204 / 0.238 |
| **5.1** | Latest Active Assignment for Complaint | [`query_5_1_latest_active_assignment.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_5_1_latest_active_assignment.txt) | Seq Scan (`assignments`), Index Scan (`users`) | Nested Loop | 48 | 0.463 | **0.198 ms** | 0.161 / 0.298 |
| **5.3** | Field Officer Assigned Work Orders | [`query_5_3_officer_work_orders.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_5_3_officer_work_orders.txt) | Seq Scan (`assignments`), Index Scan (`complaints`) | Nested Loop | 227 | 0.479 | **0.335 ms** | 0.308 / 0.355 |
| **6.1** | Admin Global Triage Queue (Multi-Filter) | [`query_6_1_admin_global_triage_queue.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_6_1_admin_global_triage_queue.txt) | Seq Scan (`complaints`), Index Scan (`users`) | Nested Loop | 267 | 0.608 | **0.409 ms** | 0.393 / 0.424 |
| **6.2** | Department-Specific Complaint Triage Queue | [`query_6_2_department_triage_queue.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_6_2_department_triage_queue.txt) | Seq Scan (`complaints`, `assignments`) | Hash Join + SubPlan | 12,493 | 0.531 | **2.062 ms** | 2.020 / 2.116 |
| **7.1** | Spatial Bounding-Box Map Viewpins | [`query_7_1_spatial_bounding_box.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_7_1_spatial_bounding_box.txt) | Seq Scan (`complaints`, `categories`) | Hash Join | 230 | 0.349 | **0.699 ms** | 0.651 / 0.740 |
| **7.2** | Ward Public Feed with Subquery Counts | [`query_7_2_ward_public_issues_feed.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_7_2_ward_public_issues_feed.txt) | Seq Scan (`complaints`, `comments`, `duplicates`) | Hash Join + 2x SubPlan | 12,531 | 0.399 | **3.338 ms** | 3.272 / 3.389 |
| **8.1** | Duplicates Linked to Canonical Ticket | [`query_8_1_duplicates_by_canonical.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_8_1_duplicates_by_canonical.txt) | Seq Scan (`duplicate_complaints`), Index Scan (`complaints`, `users`) | Nested Loop | 15 | 0.406 | **0.048 ms** | 0.046 / 0.051 |
| **8.2** | Check If Complaint is Duplicate | [`query_8_2_check_duplicate_status.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_8_2_check_duplicate_status.txt) | Index Scan (`pk_duplicate_complaints`, `pk_complaints`) | Nested Loop | 6 | 0.256 | **0.028 ms** | 0.024 / 0.035 |
| **8.3** | Proximity Duplicate Candidates Search | [`query_8_3_proximity_duplicate_candidates.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_8_3_proximity_duplicate_candidates.txt) | Seq Scan (`complaints`) | N/A | 228 | 0.166 | **0.374 ms** | 0.341 / 0.426 |
| **9.1** | User Notifications Inbox (Paginated) | [`query_9_1_user_notifications_inbox.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_9_1_user_notifications_inbox.txt) | Seq Scan (`notifications`), Index Scan (`complaints`) | Nested Loop Left Join | 185 | 0.328 | **0.520 ms** | 0.497 / 0.556 |
| **9.2** | Count Unread User Notifications | [`query_9_2_unread_notifications_count.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_9_2_unread_notifications_count.txt) | Seq Scan (`notifications`) | N/A | 148 | 0.131 | **0.520 ms** | 0.476 / 0.551 |
| **10.1** | Overall Status KPI Cards | [`query_10_1_kpi_status_metrics.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_10_1_kpi_status_metrics.txt) | Seq Scan (`complaints`) | Aggregate | 228 | 0.112 | **0.535 ms** | 0.514 / 0.565 |
| **10.2** | Department SLA Compliance Metrics | [`query_10_2_dept_sla_compliance.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_10_2_dept_sla_compliance.txt) | Seq Scan (`departments`, `categories`, `complaints`) | Hash Right Join | 231 | 0.403 | **1.941 ms** | 1.823 / 2.085 |
| **10.3** | Category Volume by Priority Breakdown | [`query_10_3_category_priority_breakdown.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_10_3_category_priority_breakdown.txt) | Seq Scan (`categories`, `departments`, `complaints`) | Hash Join, Hash Right Join | 230 | 0.322 | **1.586 ms** | 1.528 / 1.642 |
| **10.4** | Geographic Distribution by Ward & Zone | [`query_10_4_geographic_ward_distribution.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_10_4_geographic_ward_distribution.txt) | Seq Scan (`wards`, `complaints`) | Hash Right Join | 229 | 0.287 | **1.139 ms** | 1.050 / 1.184 |

---

## 4. Performance Classification & Latency Tiers

The 27 benchmarked queries fall into three distinct performance categories based on latency and I/O footprint:

```
[Tier 1: Sub-Millisecond Point Lookups (< 0.10 ms)]  ────────  37% of queries (10 / 27)
  ├── Q1.1 (0.017 ms), Q2.4 (0.023 ms), Q8.2 (0.028 ms)
  └── Q1.2, Q2.1, Q2.2, Q3.3, Q8.1, Q1.3 (0.041 - 0.074 ms)

[Tier 2: Linear Table Scans & Medium Filters (0.10 - 1.0 ms)] ──  41% of queries (11 / 27)
  ├── Q5.1 (0.198 ms), Q4.3 (0.223 ms), Q4.1 (0.240 ms)
  ├── Q5.3 (0.335 ms), Q4.2 (0.364 ms), Q8.3 (0.374 ms), Q3.2 (0.391 ms)
  └── Q6.1 (0.409 ms), Q9.1 (0.520 ms), Q9.2 (0.520 ms), Q10.1 (0.535 ms), Q7.1 (0.699 ms)

[Tier 3: Bottleneck Queries & Heavy Aggregations (> 1.0 ms)] ────  22% of queries (6 / 27)
  ├── Q3.1 Citizen Feed (1.068 ms)  ── [Correlated Subquery: 5,595 buffer hits]
  ├── Q10.4 Ward Density (1.139 ms) ── [Full Hash Outer Join & Aggregation]
  ├── Q10.3 Category Volume (1.586 ms) [Cross-category multi-filter counts]
  ├── Q10.2 SLA Compliance (1.941 ms)  [Date arithmetic & Epoch duration math]
  ├── Q6.2 Dept Triage (2.062 ms)   ── [Scalar Subquery in SELECT: 12,493 buffer hits]
  └── Q7.2 Public Feed (3.338 ms)   ── [2x Scalar Subqueries: 12,531 buffer hits]
```

---

## 5. In-Depth Execution Plan Analysis

Detailed analysis of PostgreSQL's Cost-Based Optimizer (CBO) decisions across representative query profiles:

### 5.1 Query 1.1: User Authentication by Email (Index Scan)
* **Execution Plan File:** [`dbms/plans/query_1_1_auth_by_email.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_1_1_auth_by_email.txt)
* **Execution Time:** **0.017 ms** | **Planning Time:** 0.184 ms | **Buffer Hits:** 3 blocks
* **Plan Hierarchy:**
  ```text
  Index Scan using uq_users_email on public.users u  (cost=0.28..2.49 rows=1 width=150)
    Output: user_id, name, email, phone, password_hash, role, department_id, created_at, updated_at
    Index Cond: ((u.email)::text = 'citizen1@example.com'::text)
    Buffers: shared hit=3
  ```
* **Optimizer Rationale:**  
  The query searches on `email = LOWER(TRIM($1))`. Because `users.email` is protected by a unique constraint `CONSTRAINT uq_users_email UNIQUE (email)`, PostgreSQL maintains a unique B-Tree index. The planner bypasses the heap table and traverses the B-Tree in 3 page lookups: root page, leaf page, and table tuple. This is optimal and needs no modification.

---

### 5.2 Query 3.3: Detailed Single Complaint View (360-Degree Profile)
* **Execution Plan File:** [`dbms/plans/query_3_3_single_complaint_360_view.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_3_3_single_complaint_360_view.txt)
* **Execution Time:** **0.043 ms** | **Planning Time:** 0.617 ms | **Buffer Hits:** 7 blocks
* **Plan Hierarchy:**
  ```text
  Nested Loop (4x)
    -> Index Scan using pk_complaints on public.complaints c (cost=0.28..2.50 rows=1)
    -> Index Scan using pk_users on public.users u (cost=0.28..2.49 rows=1)
    -> Seq Scan on public.categories cat (cost=0.00..1.11 rows=1)
    -> Seq Scan on public.departments d (cost=0.00..1.05 rows=1)
    -> Seq Scan on public.wards w (cost=0.00..1.06 rows=1)
  ```
* **Optimizer Rationale:**  
  Even though 4 tables are joined (`users`, `categories`, `departments`, `wards`), the query specifies a single `complaint_id`. The Primary Key index `pk_complaints` immediately isolates exactly 1 row. PostgreSQL evaluates subsequent foreign-key joins using `pk_users` (Index Scan) and small sequential scans on `categories` (9 rows), `departments` (5 rows), and `wards` (5 rows). Because the lookup tables reside in cached memory blocks, execution completes in 43 microseconds.

---

### 5.3 Query 6.1: Admin Global Triage Queue (Multi-Criteria Filtering & Quicksort)
* **Execution Plan File:** [`dbms/plans/query_6_1_admin_global_triage_queue.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_6_1_admin_global_triage_queue.txt)
* **Execution Time:** **0.409 ms** | **Planning Time:** 0.608 ms | **Buffer Hits:** 267 blocks
* **Plan Hierarchy:**
  ```text
  Limit (cost=354.01..354.02 rows=4) (actual time=0.389..0.390 rows=10 loops=1)
    -> Sort (Sort Key: CASE c.priority ... c.created_at DESC)
         Sort Method: quicksort  Memory: 27kB
         -> Nested Loop
              -> Seq Scan on public.complaints c (Filter: (category_id = 1 AND ward_id = 2 AND status = 'IN_PROGRESS' AND title/desc ILIKE '%pothole%'))
                   Rows Removed by Filter: 4990
              -> Index Scan using pk_users on public.users u (loops=10)
  ```
* **Optimizer Rationale & Bottlenecks:**  
  1. **Full Heap Scan:** Because there are no secondary composite indexes on `(status, category_id, ward_id)`, PostgreSQL is forced to read all 228 pages of the `complaints` table (5,000 rows), discarding **4,990 rows** via CPU filter evaluation.
  2. **Pattern Matching Overhead:** The `ILIKE '%pothole%'` filter prevents normal B-Tree index utilization without trigram (`pg_trgm`) acceleration.
  3. **Memory Quicksort:** Qualifying rows are sorted in memory (27 kB) by the custom `CASE c.priority ...` expression. While in-memory sort is fast, the full table scan is inefficient and will degrade linearly as the database grows to 100,000+ complaints.

---

### 5.4 Query 3.1: Citizen "My Complaints" Feed (Correlated Subquery I/O Multiplier)
* **Execution Plan File:** [`dbms/plans/query_3_1_citizen_my_complaints.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_3_1_citizen_my_complaints.txt)
* **Execution Time:** **1.068 ms** | **Planning Time:** 0.544 ms | **Buffer Hits:** **5,595 blocks**
* **Root Cause of High I/O:**
  Query 3.1 retrieves the primary thumbnail using a correlated scalar subquery in the `SELECT` list:
  ```sql
  (SELECT img.image_url 
   FROM complaint_images img 
   WHERE img.complaint_id = c.complaint_id 
   ORDER BY img.uploaded_at ASC 
   LIMIT 1) AS primary_thumbnail_url
  ```
  PostgreSQL compiles this as a `SubPlan 1` executed for **every matching complaint**. Because `complaint_images` has no secondary index on `complaint_id`, PostgreSQL executes a **sequential scan over all 6,000 image rows** for each complaint returned. This drives shared buffer hits up to **5,595 blocks**, inflating execution time to **1.068 ms**.

---

### 5.5 Query 7.2: Public Issues Feed by Ward (Double Correlated Subquery Bottleneck)
* **Execution Plan File:** [`dbms/plans/query_7_2_ward_public_issues_feed.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_7_2_ward_public_issues_feed.txt)
* **Execution Time:** **3.338 ms** | **Planning Time:** 0.399 ms | **Buffer Hits:** **12,531 blocks**
* **Plan Hierarchy:**
  ```text
  Limit (cost=0.00..1285.42 rows=20) (actual time=0.152..3.292 rows=20 loops=1)
    SubPlan 1
      -> Aggregate (cost=32.10..32.11 rows=1)
           -> Seq Scan on public.complaint_comments cm (Filter: cm.complaint_id = c.complaint_id) [loops=20]
    SubPlan 2
      -> Aggregate (cost=1.20..1.21 rows=1)
           -> Seq Scan on public.duplicate_complaints dc (Filter: dc.canonical_complaint_id = c.complaint_id) [loops=20]
    -> Seq Scan on public.complaints c (Filter: ward_id = 2 AND status <> 'REJECTED')
  ```
* **Performance Assessment:**  
  Query 7.2 is the **slowest query in the entire platform (3.338 ms)**. The query includes **two correlated scalar subqueries**: one to count comments (`complaint_comments`) and one to count duplicate filings (`duplicate_complaints`). For every row in the page (20 rows), PostgreSQL re-executes two sequential scans across `complaint_comments` (6,850 rows) and `duplicate_complaints` (150 rows), generating **12,531 shared buffer lookups**.

---

### 5.6 Query 10.2: Departmental SLA Compliance & Resolution Times
* **Execution Plan File:** [`dbms/plans/query_10_2_dept_sla_compliance.txt`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/query_10_2_dept_sla_compliance.txt)
* **Execution Time:** **1.941 ms** | **Planning Time:** 0.403 ms | **Buffer Hits:** 1,390 blocks
* **Plan Hierarchy:**
  ```text
  Sort (Sort Key: (count(c.complaint_id)) DESC)
    -> HashAggregate (Group Key: d.department_id, d.name)
         -> Hash Right Join (departments -> categories -> complaints)
              -> Seq Scan on public.complaints c
  ```
* **Performance Assessment:**  
  This executive analytical query aggregates all 5,000 complaints, calculates resolution time durations using `EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 3600`, and computes 4 distinct `FILTER (WHERE ...)` conditional sums per department. The planner builds in-memory hash tables for `departments` and `categories` and performs a sequential scan over `complaints`. At 5,000 rows, this takes 1.941 ms; at 1,000,000 rows, this will require partitioning or a materialized reporting view.

---

## 6. Root-Cause Analysis of Performance Bottlenecks

Based on the actual PostgreSQL execution plans, the primary architectural bottlenecks in the baseline database are:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   PRIMARY PERFORMANCE BOTTLENECKS IDENTIFIED                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. Missing Foreign Key Secondary Indexes                                         │
│    - Foreign keys (citizen_id, ward_id, category_id, complaint_id, user_id) lack   │
│      underlying B-Tree indexes, forcing O(N) full table scans on all child tables.│
│                                                                                  │
│ 2. Correlated Scalar Subqueries in SELECT Clauses (I/O Explosion)                 │
│    - Queries 3.1, 6.2, and 7.2 execute subplans per result tuple.                │
│    - Results in 5,000 to 12,500+ buffer page lookups for a single 20-row page.    │
│                                                                                  │
│ 3. Unindexed High-Cardinality Filtering and Sorting                              │
│    - Municipal queues filter by (status, priority) and order by (created_at).    │
│    - Every queue request performs CPU-intensive quicksorts on unindexed columns.  │
│                                                                                  │
│ 4. Geospatial Coordinate Range Scans                                             │
│    - Map viewpin queries (Query 7.1) scan the entire table for lat/long bounds. │
│    - Lack of composite (latitude, longitude) or PostGIS GiST index.              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Actionable Optimization Roadmap for CP5

The empirical findings from CP4 provide a concrete roadmap for the **CP5 Indexing and Optimization** milestone:

1. **Implement Foreign Key B-Tree Indexes:**
   ```sql
   CREATE INDEX idx_complaints_citizen ON complaints (citizen_id);
   CREATE INDEX idx_complaints_ward ON complaints (ward_id);
   CREATE INDEX idx_complaints_category ON complaints (category_id);
   CREATE INDEX idx_complaint_images_complaint ON complaint_images (complaint_id);
   CREATE INDEX idx_complaint_assignments_complaint ON complaint_assignments (complaint_id);
   CREATE INDEX idx_complaint_status_history_complaint ON complaint_status_history (complaint_id);
   CREATE INDEX idx_complaint_comments_complaint ON complaint_comments (complaint_id);
   CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read);
   ```
2. **Refactor Correlated Subqueries into `LEFT JOIN` Aggregations:**
   - In Query 3.1, replace the scalar thumbnail subquery with a `DISTINCT ON (complaint_id)` or window function join.
   - In Query 7.2, rewrite comment and duplicate counts as aggregated `LEFT JOIN` subqueries grouped by `complaint_id`.
3. **Deploy Composite Indexes for Triage Queues:**
   ```sql
   CREATE INDEX idx_complaints_triage ON complaints (status, priority, created_at DESC);
   ```
4. **Deploy Geospatial Coordinate Indexing:**
   ```sql
   CREATE INDEX idx_complaints_spatial ON complaints (latitude, longitude) WHERE status NOT IN ('CLOSED', 'REJECTED');
   ```

---

## 8. Conclusion & Deliverables Verification

- **Timings Deliverable:** Complete execution timings, methodology, and bottleneck analysis documented in [`dbms/05_query_timings.md`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/05_query_timings.md).
- **Execution Plans Deliverable:** All **27 execution plans** generated from live PostgreSQL 18.0 engine saved in [`dbms/plans/`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/plans/).
- **Validation:** Every query corresponds exactly to [`dbms/04_queries.sql`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/04_queries.sql) and adheres strictly to the database schema in [`dbms/03_schema.sql`](file:///Users/yuvi/Desktop/CivicSync_AP_2026/dbms/03_schema.sql).
