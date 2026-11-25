// src/routes/dbms.routes.js - College DBMS Coursework ke SQL Schema aur Queries ko run karne ke live endpoints
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// 1. DBMS tables ka overview aur row counts nikaalna
router.get('/overview', async (req, res, next) => {
  try {
    const tableNames = [
      'departments', 'wards', 'categories', 'complaints',
      'complaint_images', 'complaint_assignments', 'complaint_status_history',
      'complaint_comments', 'duplicate_complaints', 'notifications',
      'User', 'Issue'
    ];

    const stats = {};
    // Har table ke total rows count kar rahe hain raw SQL query se
    for (const tbl of tableNames) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM "${tbl}";`);
        stats[tbl] = Number(result[0].cnt);
      } catch (e) {
        // Agar table create nahi hui ho toh count 0 show karo
        stats[tbl] = 0;
      }
    }

    res.json({
      success: true,
      message: 'CivicSync DBMS Schema successfully sync hai.',
      schemaVersion: 'PostgreSQL 16+ & SQLite Compatible',
      tables: stats
    });
  } catch (err) {
    next(err);
  }
});

// 2. Query 2.1: Saare Municipal Departments fetch karna aur unki categories count karna
router.get('/departments', async (req, res, next) => {
  try {
    const depts = await prisma.$queryRawUnsafe(`
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
    `);

    // BigInt values ko JSON serialization ke liye standard Number mein convert kar rahe hain
    const serialized = JSON.parse(JSON.stringify(depts, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ));

    res.json({ success: true, count: serialized.length, data: serialized });
  } catch (err) {
    next(err);
  }
});

// 3. Query 2.2: Issue Categories unke responsible department aur SLA hours ke saath fetch karna
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.$queryRawUnsafe(`
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
    `);

    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
});

// 4. Query 2.4: Saare Municipal Wards aur Administrative Zones fetch karna
router.get('/wards', async (req, res, next) => {
  try {
    const wards = await prisma.$queryRawUnsafe(`
      SELECT 
        w.ward_id,
        w.ward_number,
        w.ward_name,
        w.zone_name
      FROM wards w
      ORDER BY w.ward_id ASC;
    `);

    res.json({ success: true, count: wards.length, data: wards });
  } catch (err) {
    next(err);
  }
});

// 5. Query 10.1: Top-level Complaint Status KPI Metrics nikaalna
router.get('/kpi', async (req, res, next) => {
  try {
    const metrics = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*) AS total_complaints,
        COUNT(CASE WHEN status = 'REPORTED' THEN 1 END) AS reported_count,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) AS in_progress_count,
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS resolved_count,
        COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) AS critical_count
      FROM complaints;
    `);

    const serialized = JSON.parse(JSON.stringify(metrics[0], (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ));

    res.json({ success: true, data: serialized });
  } catch (err) {
    next(err);
  }
});

// 6. Safe SQL Query Execution
router.post('/execute', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, message: 'SQL query string provide karna zaroori hai.' });
    }

    const trimmed = query.trim();
    // Security check: Sirf SELECT read queries allow karo, koi data modify na kar sake
    if (!trimmed.toLowerCase().startsWith('select')) {
      return res.status(403).json({ success: false, message: 'Security: Is endpoint se sirf SELECT read queries execute ho sakti hain.' });
    }

    const rows = await prisma.$queryRawUnsafe(trimmed);
    const serialized = JSON.parse(JSON.stringify(rows, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ));

    res.json({ success: true, count: serialized.length, data: serialized });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
