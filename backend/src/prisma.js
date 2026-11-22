// src/prisma.js - Shared PrismaClient singleton instance
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
