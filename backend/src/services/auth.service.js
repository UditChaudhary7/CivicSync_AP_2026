// src/services/auth.service.js - Authentication & User Registration Business Logic
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { JWT_SECRET } = require('../middleware/auth');

// Register a new citizen account
async function registerCitizen({ email, password, fullName }) {
  const cleanEmail = email.trim().toLowerCase();

  // Check existing user via Prisma unique lookup
  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user record using Prisma CRUD
  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      password: hashedPassword,
      fullName: fullName.trim(),
      role: 'CITIZEN'
    }
  });

  const tokenPayload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    role: user.role.toLowerCase(),
    ROLE: user.role.toUpperCase(),
    fullName: user.fullName,
    full_name: user.fullName
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

  return { user: tokenPayload, token };
}

// Authenticate user credentials and issue signed JWT
async function loginUser({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const tokenPayload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    role: user.role.toLowerCase(),
    ROLE: user.role.toUpperCase(),
    fullName: user.fullName,
    full_name: user.fullName
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

  return { user: tokenPayload, token };
}

// Retrieve user profile by ID excluding password
async function getUserProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, createdAt: true }
  });
}

module.exports = { registerCitizen, loginUser, getUserProfile };
