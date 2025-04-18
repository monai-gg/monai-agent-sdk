import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to Winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.meta ? ' ' + JSON.stringify(info.meta) : ''}`
  )
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports: [
    // Console transport
    new winston.transports.Console(),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Create a simple interface that matches the previous logger
export const log = {
  info: (message: string, ...meta: any[]) => {
    logger.info(message, { meta: meta.length > 0 ? meta : undefined });
  },
  warn: (message: string, ...meta: any[]) => {
    logger.warn(message, { meta: meta.length > 0 ? meta : undefined });
  },
  error: (message: string, ...meta: any[]) => {
    logger.error(message, { meta: meta.length > 0 ? meta : undefined });
  },
  debug: (message: string, ...meta: any[]) => {
    logger.debug(message, { meta: meta.length > 0 ? meta : undefined });
  },
  // Add HTTP level for API requests
  http: (message: string, ...meta: any[]) => {
    logger.http(message, { meta: meta.length > 0 ? meta : undefined });
  },
};

// Export the Winston logger for advanced usage
export { logger };

