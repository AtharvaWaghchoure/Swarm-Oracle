export declare enum LogLevel {
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
export declare const logger: {
    info: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
};
declare class Logger {
    private level;
    private logHistory;
    private maxHistorySize;
    constructor();
    private formatTimestamp;
    private log;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    setLevel(level: LogLevel): void;
    getHistory(limit?: number): LogEntry[];
    getHistoryByLevel(level: string, limit?: number): LogEntry[];
    clearHistory(): void;
}
export declare const loggerInstance: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map