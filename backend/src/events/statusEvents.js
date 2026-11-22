// src/events/statusEvents.js - Node.js EventEmitter for Status Change Audit Logging
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const statusEmitter = new EventEmitter();
const logsDir = path.join(__dirname, '../../logs');
const logFile = path.join(logsDir, 'status.log');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Event listener that asynchronously appends status updates to a file
statusEmitter.on('statusChanged', (data) => {
  const line = `[${new Date().toISOString()}] Issue #${data.trackingNumber} status changed from ${data.oldStatus} to ${data.newStatus} by ${data.adminEmail || 'ADMIN'}\n`;
  fs.appendFile(logFile, line, (err) => {
    if (err) console.error('Error writing to status.log:', err);
  });
});

module.exports = statusEmitter;
