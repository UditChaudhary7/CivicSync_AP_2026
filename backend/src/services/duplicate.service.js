// src/services/duplicate.service.js - Spatial distance calculate karna aur duplicate complaints detect karna
const prisma = require('../prisma');

// Haversine formula: Do GPS coordinates (lat1, lon1 aur lat2, lon2) ke beech ka aerial distance meters mein nikalta hai
function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Dharti (Earth) ka average radius meters mein (~6,371 km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Duplicate complaints check karne ka function: Same category ke issues jo 500 meters ke daayre mein ho
async function checkDuplicateIssues({ category, latitude, longitude }) {
  // Agar coordinates ya category missing hai toh seedha empty list return karo
  if (!latitude || !longitude || !category) return [];

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  // Database se woh saari complaints nikalo jo same category ki hain aur abhi tak resolve nahi hui hain
  const candidates = await prisma.issue.findMany({
    where: {
      category: category.toLowerCase(),
      status: { not: 'RESOLVED' }
    },
    select: {
      id: true,
      trackingNumber: true,
      title: true,
      category: true,
      address: true,
      latitude: true,
      longitude: true
    }
  });

  // Har candidate issue ka distance calculate karo, sirf 500m ke andar wale filter karo aur nearest first sort karo
  return candidates
    .map(c => ({
      ...c,
      distance_meters: Math.round(getHaversineDistanceMeters(lat, lng, c.latitude, c.longitude))
    }))
    .filter(c => c.distance_meters <= 500)
    .sort((a, b) => a.distance_meters - b.distance_meters);
}

module.exports = { checkDuplicateIssues, getHaversineDistanceMeters };
