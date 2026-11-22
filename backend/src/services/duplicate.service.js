// src/services/duplicate.service.js - Haversine Distance & Spatial Duplicate Interception
const prisma = require('../prisma');

// Haversine formula to compute great-circle distance in meters between two GPS coordinates
function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Intercept duplicates: find active issues in same category within 500 meters
async function checkDuplicateIssues({ category, latitude, longitude }) {
  if (!latitude || !longitude || !category) return [];

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  // Retrieve unresolved issues in the same category using Prisma
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

  return candidates
    .map(c => ({
      ...c,
      distance_meters: Math.round(getHaversineDistanceMeters(lat, lng, c.latitude, c.longitude))
    }))
    .filter(c => c.distance_meters <= 500)
    .sort((a, b) => a.distance_meters - b.distance_meters);
}

module.exports = { checkDuplicateIssues, getHaversineDistanceMeters };
