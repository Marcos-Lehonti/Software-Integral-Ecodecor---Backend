// logger.js
const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');

const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ level, message, timestamp, ...meta }) => {
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] : ${message}${rest}`;
  })
);

const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json() // archivos en JSON, mejor para parseo
);

const logger = createLogger({
  level,
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error', format: fileFormat }),
    new transports.File({ filename: path.join(LOG_DIR, 'combined.log'), format: fileFormat }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(LOG_DIR, 'exceptions.log'), format: fileFormat }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(LOG_DIR, 'rejections.log'), format: fileFormat }),
  ],
});

module.exports = logger;
