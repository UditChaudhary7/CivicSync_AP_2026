// src/prisma.js - Pure application mein ek single PrismaClient instance share karne ke liye (Singleton pattern)
const { PrismaClient } = require('@prisma/client');

// PrismaClient ka shared instance create kar rahe hain jo sabhi models ke queries handle karega
const prisma = new PrismaClient();

module.exports = prisma;
