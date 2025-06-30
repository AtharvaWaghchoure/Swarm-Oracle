export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
  
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
};

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private logHistory: LogEntry[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.level = LogLevel[envLevel as keyof typeof LogLevel];
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any): void {
    if (level < this.level) return;

    const timestamp = this.formatTimestamp();
    const formattedMessage = data 
      ? `${message} ${JSON.stringify(data, null, 2)}`
      : message;

    // Console output with colors
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      RESET: '\x1b[0m'   // Reset
    };

    const color = colors[levelName as keyof typeof colors] || colors.RESET;
    console.log(`${color}[${timestamp}] ${levelName}: ${formattedMessage}${colors.RESET}`);

    // Store in history
    const entry: LogEntry = {
      timestamp,
      level: levelName,
      message,
      data
    };

    this.logHistory.push(entry);
    
    // Maintain history size
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getHistory(limit?: number): LogEntry[] {
    const history = this.logHistory.slice().reverse();
    return limit ? history.slice(0, limit) : history;
  }

  getHistoryByLevel(level: string, limit?: number): LogEntry[] {
    const filtered = this.logHistory
      .filter(entry => entry.level === level)
      .slice()
      .reverse();
    return limit ? filtered.slice(0, limit) : filtered;
  }

  clearHistory(): void {
    this.logHistory = [];
  }
}

export const loggerInstance = new Logger(); 