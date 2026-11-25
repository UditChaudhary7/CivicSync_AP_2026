// prisma/seed.js - College viva presentation aur testing ke liye sample database data load karne ka script
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Issue ka priority score nikaalne ka helper function (severity, upvotes aur waiting time ke basis par)
function calculatePriority(severity, upvotes, createdAt) {
  const points = { CRITICAL: 40, HIGH: 30, MEDIUM: 20, LOW: 10 };
  const base = points[severity.toUpperCase()] || 10;
  const votePoints = Math.min((upvotes || 0) * 3, 30);
  const daysWaiting = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const timePoints = Math.min(Math.max(daysWaiting, 0) * 2, 30);
  return Math.min(100, base + votePoints + timePoints);
}

async function main() {
  console.log('Prisma ORM se database mein initial data seed kar rahe hain...');

  // Foreign keys ka dhyaan rakhte hue pehle DBMS child tables ko clean kar rahe hain
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM complaint_status_history;`);
    await prisma.$executeRawUnsafe(`DELETE FROM complaint_assignments;`);
    await prisma.$executeRawUnsafe(`DELETE FROM complaint_comments;`);
    await prisma.$executeRawUnsafe(`DELETE FROM duplicate_complaints;`);
    await prisma.$executeRawUnsafe(`DELETE FROM complaint_images;`);
    await prisma.$executeRawUnsafe(`DELETE FROM notifications;`);
    await prisma.$executeRawUnsafe(`DELETE FROM complaints;`);
    await prisma.$executeRawUnsafe(`DELETE FROM categories;`);
    await prisma.$executeRawUnsafe(`DELETE FROM wards;`);
    await prisma.$executeRawUnsafe(`DELETE FROM departments;`);
  } catch (err) {
    // Agar tables abhi tak nahi bani hain toh ignore karo
  }

  // Idempotency ke liye existing Prisma models ka data clear karo
  await prisma.upvote.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.user.deleteMany();

  // Passwords ko hash kar rahe hain
  const adminPassword = await bcrypt.hash('Admin#Secure2026!', 10);
  const citizenPassword = await bcrypt.hash('Citizen#Secure2026!', 10);

  // 1. Default Municipal Administrator account bana rahe hain
  const admin = await prisma.user.create({
    data: {
      email: 'admin@civicsync.local',
      password: adminPassword,
      fullName: 'Municipal Administrator',
      role: 'ADMIN'
    }
  });
  console.log(`Admin account create ho gaya: ${admin.email}`);

  // 2. Default Citizen account bana rahe hain
  const citizen = await prisma.user.create({
    data: {
      email: 'citizen@civicsync.local',
      password: citizenPassword,
      fullName: 'Jane Citizen',
      role: 'CITIZEN'
    }
  });
  console.log(`Citizen account create ho gaya: ${citizen.email}`);

  // 3. DBMS Normalized Relational Tables (departments, wards, categories) mein data daal rahe hain
  try {
    // Departments seed karo
    await prisma.$executeRawUnsafe(`
      INSERT INTO departments (department_id, name, contact_email, contact_phone) VALUES
      (1, 'Road Works & Infrastructure', 'roads@sonipat.gov.in', '0130-2220101'),
      (2, 'Sanitation & Waste Management', 'sanitation@sonipat.gov.in', '0130-2220102'),
      (3, 'Public Health Engineering (Water & Sewage)', 'water@sonipat.gov.in', '0130-2220103'),
      (4, 'Electrical & Street Lighting', 'electrical@sonipat.gov.in', '0130-2220104');
    `);

    // Wards seed karo
    await prisma.$executeRawUnsafe(`
      INSERT INTO wards (ward_id, ward_number, ward_name, zone_name) VALUES
      (1, 'WARD-01', 'Sector 14 & Model Town', 'East Zone'),
      (2, 'WARD-02', 'Old DC Road & Subhash Chowk', 'Central Zone'),
      (3, 'WARD-03', 'Railway Station & Atlas Chowk', 'West Zone'),
      (4, 'WARD-04', 'Murthal Road & Sector 15', 'North Zone'),
      (5, 'WARD-05', 'Sector 23 & Rathdhana', 'South Zone');
    `);

    // Categories seed karo
    await prisma.$executeRawUnsafe(`
      INSERT INTO categories (category_id, name, description, department_id, default_priority, sla_hours) VALUES
      (1, 'road_pothole', 'Potholes, surface craters, and asphalt degradation', 1, 'HIGH', 48),
      (2, 'public_infrastructure', 'Damaged road dividers, broken stormwater slabs, medians', 1, 'HIGH', 72),
      (3, 'streetlight', 'Non-functional street lamps, broken poles, hanging wires', 4, 'CRITICAL', 24),
      (4, 'garbage', 'Solid waste accumulation, overflowing dumpsters, commercial refuse', 2, 'MEDIUM', 24),
      (5, 'water_leakage', 'Pipeline ruptures, drinking water supply disruptions', 3, 'HIGH', 24),
      (6, 'drainage_sewage', 'Blocked storm drains, open sewage overflow, waterlogging', 3, 'HIGH', 48);
    `);
    console.log('DBMS normalized tables (departments, wards, categories) successfully seed ho gayi.');
  } catch (err) {
    console.warn('Relational tables seed karte waqt note:', err.message);
  }

  // 4. Sonipat shahar ki realistic sample complaints ka data
  const sampleIssues = [
    { track: 'REP-2026-00101', title: 'Deep crater cluster near Subhash Chowk on Kakroi Road', desc: 'Multiple severe potholes causing vehicular bottoming-out and hazard to two-wheelers.', cat: 'road_pothole', catId: 1, wardId: 2, sev: 'CRITICAL', status: 'REPORTED', lat: 28.9958, lng: 77.0182, addr: 'Subhash Chowk, Kakroi Road, Sonipat', votes: 12, daysAgo: 1 },
    { track: 'REP-2026-00102', title: 'Non-functional street light luminaires in Model Town 8-Marla Market', desc: 'Four consecutive LED streetlight luminaires failing to illuminate after sunset.', cat: 'streetlight', catId: 3, wardId: 1, sev: 'MEDIUM', status: 'IN_PROGRESS', lat: 28.9945, lng: 77.0230, addr: '8-Marla Main Market, Model Town, Sonipat', votes: 5, daysAgo: 3 },
    { track: 'REP-2026-00103', title: 'Solid waste spillage and cattle hazard near Atlas Chowk', desc: 'Commercial carton waste and market refuse spilling onto roadway. Cleared by crew.', cat: 'garbage', catId: 4, wardId: 3, sev: 'LOW', status: 'RESOLVED', lat: 28.9912, lng: 77.0128, addr: 'Atlas Road near Atlas Chowk, Sonipat', votes: 2, daysAgo: 5 },
    { track: 'REP-2026-00104', title: 'Drinking water supply pipeline burst near Geeta Bhawan Chowk', desc: 'Underground potable water pipe fractured, causing roadway flooding and pressure drop.', cat: 'water_leakage', catId: 5, wardId: 2, sev: 'HIGH', status: 'REPORTED', lat: 28.9938, lng: 77.0168, addr: 'Geeta Bhawan Chowk, Old DC Road, Sonipat', votes: 8, daysAgo: 2 },
    { track: 'REP-2026-00105', title: 'Open storm drain choked with silt near Murthal Road', desc: 'Storm drain blocked causing wastewater overflow onto service lane near DCRUST.', cat: 'drainage_sewage', catId: 6, wardId: 4, sev: 'HIGH', status: 'REPORTED', lat: 29.0085, lng: 77.0385, addr: 'Murthal Road Service Lane, Sonipat', votes: 15, daysAgo: 16 },
    { track: 'REP-2026-00106', title: 'Broken stormwater drain slab creating open pit in Sector 14', desc: 'Concrete cover broken, exposing dangerous 4-foot deep drop near Community Centre.', cat: 'public_infrastructure', catId: 2, wardId: 1, sev: 'CRITICAL', status: 'IN_PROGRESS', lat: 28.9862, lng: 77.0260, addr: 'Pocket B, Sector 14, Sonipat', votes: 10, daysAgo: 4 },
    { track: 'REP-2026-00107', title: 'Construction debris dumped along Sector 15 Green Belt', desc: 'Demolition rubble and waste dumped along public green corridor.', cat: 'garbage', catId: 4, wardId: 4, sev: 'MEDIUM', status: 'REPORTED', lat: 28.9820, lng: 77.0325, addr: 'Green Belt Road, Sector 15 HUDA, Sonipat', votes: 3, daysAgo: 2 },
    { track: 'REP-2026-00108', title: 'Snapped electrical wire hanging low outside Sonipat Railway Station', desc: 'Overhead wire snapped and hanging 5 feet above the auto-rickshaw stand.', cat: 'streetlight', catId: 3, wardId: 3, sev: 'CRITICAL', status: 'IN_PROGRESS', lat: 28.9982, lng: 77.0090, addr: 'Station Road, Sonipat Railway Station', votes: 14, daysAgo: 1 },
    { track: 'REP-2026-00109', title: 'Damaged road divider and missing night reflectors on Rathdhana Road', desc: 'Concrete median knocked out of alignment, missing retro-reflective caution markers.', cat: 'public_infrastructure', catId: 2, wardId: 5, sev: 'HIGH', status: 'REPORTED', lat: 28.9785, lng: 77.0490, addr: 'Rathdhana Road Industrial Area, Sonipat', votes: 6, daysAgo: 4 },
    { track: 'REP-2026-00110', title: 'Sewer backflow and stagnant waterlogging on Old DC Road', desc: 'Underground sewer blocked, overflowing near judicial complex.', cat: 'drainage_sewage', catId: 6, wardId: 2, sev: 'HIGH', status: 'REPORTED', lat: 28.9925, lng: 77.0155, addr: 'Old DC Office Road, Sonipat', votes: 9, daysAgo: 2 },
    { track: 'REP-2026-00111', title: 'Dark stretch on Sector 23 Housing Board connecting road', desc: 'Street lights non-operational on residential boundary lane for past week.', cat: 'streetlight', catId: 3, wardId: 5, sev: 'LOW', status: 'REPORTED', lat: 28.9720, lng: 77.0185, addr: 'Sector 23 Housing Board Colony, Sonipat', votes: 1, daysAgo: 6 },
    { track: 'REP-2026-00112', title: 'Large dangerous pothole on Kakroi Road near Subhash Chowk', desc: 'Crater in road tarmac 100 meters before Subhash Chowk intersection.', cat: 'road_pothole', catId: 1, wardId: 2, sev: 'HIGH', status: 'REPORTED', lat: 28.9961, lng: 77.0177, addr: 'Kakroi Road near Subhash Chowk, Sonipat', votes: 7, daysAgo: 1 }
  ];

  for (const item of sampleIssues) {
    const createdAt = new Date(Date.now() - item.daysAgo * 24 * 3600 * 1000);
    const priority = calculatePriority(item.sev, item.votes, createdAt);

    const issue = await prisma.issue.create({
      data: {
        trackingNumber: item.track,
        title: item.title,
        description: item.desc,
        category: item.cat,
        severity: item.sev,
        status: item.status,
        latitude: item.lat,
        longitude: item.lng,
        address: item.addr,
        priority: priority,
        createdAt: createdAt,
        userId: citizen.id
      }
    });

    // Normalized 'complaints' table mein bhi link kar rahe hain taaki DBMS queries match karein
    try {
      await prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO complaints (
          complaint_id, citizen_id, category_id, ward_id, title, description,
          latitude, longitude, landmark, status, priority, created_at, updated_at
        ) VALUES (
          '${item.track}', ${citizen.id}, ${item.catId}, ${item.wardId},
          '${item.title.replace(/'/g, "''")}', '${item.desc.replace(/'/g, "''")}',
          ${item.lat}, ${item.lng}, '${item.addr.replace(/'/g, "''")}',
          '${item.status}', '${item.sev}', '${createdAt.toISOString()}', '${createdAt.toISOString()}'
        );
      `);

      // Status history entry add karo initial report audit ke liye
      await prisma.$executeRawUnsafe(`
        INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by_user_id, remarks)
        VALUES ('${item.track}', NULL, '${item.status}', ${admin.id}, 'Initial report verified by Sonipat Municipal Corporation');
      `);
    } catch (e) {
      // Agar table nahi hai toh ignore karo
    }
  }

  console.log(`Sonipat ki total ${sampleIssues.length} sample complaints successfully seed ho gayi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
