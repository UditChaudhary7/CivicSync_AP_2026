// src/services/auth.service.js - User registration, password verification aur JWT session logic
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { JWT_SECRET } = require('../middleware/auth');

// Naye citizen ka account register karne ka function
async function registerCitizen({ email, password, fullName }) {
  const cleanEmail = email.trim().toLowerCase();

  // Check karo ki is email se koi pehle se registered toh nahi hai
  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });
  if (existing) {
    const error = new Error('Is email se pehle se ek account bana hua hai.');
    error.statusCode = 400;
    throw error;
  }

  // Security ke liye plain text password ko bcrypt se hash (encrypt) kar rahe hain
  const hashedPassword = await bcrypt.hash(password, 10);

  // Prisma ke through naya citizen record database mein create kar rahe hain
  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      password: hashedPassword,
      fullName: fullName.trim(),
      role: 'CITIZEN'
    }
  });

  // JWT token ke liye user ka data payload prepare kar rahe hain
  const tokenPayload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    role: user.role.toLowerCase(),
    ROLE: user.role.toUpperCase(),
    fullName: user.fullName,
    full_name: user.fullName
  };
  // 1 din (1 day) ki validity wala signed JWT token generate karo
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

  return { user: tokenPayload, token };
}

// User login aur authentication verify karne ka function
async function loginUser({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();

  // Pehle check karo ki user database mein exist karta hai ya nahi
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });
  if (!user) {
    const error = new Error('Galat email ya password dala hai.');
    error.statusCode = 401;
    throw error;
  }

  // Entered password ko database ke hashed password ke saath compare karo
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Galat email ya password dala hai.');
    error.statusCode = 401;
    throw error;
  }

  // Login successful hone par user session token bana kar return karo
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

// User ki profile details nikalne ke liye (password field ko chhod kar)
async function getUserProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, createdAt: true }
  });
}

module.exports = { registerCitizen, loginUser, getUserProfile };
