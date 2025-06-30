export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
export const logger = {
    info: (message, ...args) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    },
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
};
class Logger {
    level = LogLevel.INFO;
    logHistory = [];
    maxHistorySize = 1000;
    constructor() {
        // Set log level from environment
        const envLevel = process.env.LOG_LEVEL?.toUpperCase();
        if (envLevel && envLevel in LogLevel) {
            this.level = LogLevel[envLevel];
        }
    }
    formatTimestamp() {
        return new Date().toISOString();
    }
    log(level, levelName, message, data) {
        if (level < this.level)
            return;
        const timestamp = this.formatTimestamp();
        const formattedMessage = data
            ? `${message} ${JSON.stringify(data, null, 2)}`
            : message;
        // Console output with colors
        const colors = {
            DEBUG: '\x1b[36m', // Cyan
            INFO: '\x1b[32m', // Green
            WARN: '\x1b[33m', // Yellow
            ERROR: '\x1b[31m', // Red
            RESET: '\x1b[0m' // Reset
        };
        const color = colors[levelName] || colors.RESET;
        console.log(`${color}[${timestamp}] ${levelName}: ${formattedMessage}${colors.RESET}`);
        // Store in history
        const entry = {
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
    debug(message, data) {
        this.log(LogLevel.DEBUG, 'DEBUG', message, data);
    }
    info(message, data) {
        this.log(LogLevel.INFO, 'INFO', message, data);
    }
    warn(message, data) {
        this.log(LogLevel.WARN, 'WARN', message, data);
    }
    error(message, data) {
        this.log(LogLevel.ERROR, 'ERROR', message, data);
    }
    setLevel(level) {
        this.level = level;
    }
    getHistory(limit) {
        const history = this.logHistory.slice().reverse();
        return limit ? history.slice(0, limit) : history;
    }
    getHistoryByLevel(level, limit) {
        const filtered = this.logHistory
            .filter(entry => entry.level === level)
            .slice()
            .reverse();
        return limit ? filtered.slice(0, limit) : filtered;
    }
    clearHistory() {
        this.logHistory = [];
    }
}
export const loggerInstance = new Logger();
//# sourceMappingURL=logger.js.map