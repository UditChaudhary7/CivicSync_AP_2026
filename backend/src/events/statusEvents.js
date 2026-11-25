// src/events/statusEvents.js - Status change hone par background mein log file likhne ke liye EventEmitter
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const statusEmitter = new EventEmitter();
const logsDir = path.join(__dirname, '../../logs');
const logFile = path.join(logsDir, 'status.log');

// Agar logs directory nahi bani hai toh bana do
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Jab bhi 'statusChanged' event trigger hoga, yeh listener async tarike se file mein log line jod dega
statusEmitter.on('statusChanged', (data) => {
  const line = `[${new Date().toISOString()}] Issue #${data.trackingNumber} status changed from ${data.oldStatus} to ${data.newStatus} by ${data.adminEmail || 'ADMIN'}
`;
  fs.appendFile(logFile, line, (err) => {
    if (err) console.error('status.log mein likhte waqt error aaya:', err);
  });
});

module.exports = statusEmitter;
