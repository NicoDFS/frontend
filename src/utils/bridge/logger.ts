// Bridge Logger System - Centralized logging for bridge operations
// Replaces console.log with structured logging and optional external service integration

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: Error;
}

class BridgeLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private logLevel: LogLevel = LogLevel.INFO;

  constructor() {
    // Set log level based on environment
    if (typeof window !== 'undefined') {
      this.logLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private log(level: LogLevel, category: string, message: string, data?: any, error?: Error) {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      error,
    };

    // Add to memory store
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with formatting
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelStr = LogLevel[level];
    const prefix = `[${timestamp}] [${levelStr}] [${category}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`🔍 ${prefix}`, message, data || '');
        break;
      case LogLevel.INFO:
        console.info(`ℹ️ ${prefix}`, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${prefix}`, message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${prefix}`, message, data || '', error || '');
        break;
    }

    // TODO: Send to external logging service (Sentry, LogRocket, etc.)
    // this.sendToExternalService(entry);
  }

  debug(category: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any) {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, error?: Error, data?: any) {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by category
  getLogsByCategory(category: string, count: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.category === category)
      .slice(-count);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Set log level
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  // Export logs as JSON for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const bridgeLogger = new BridgeLogger();

// Convenience functions for common bridge operations
export const loggerHelpers = {
  // Bridge initialization
  bridgeInit: (message: string, data?: any) => 
    bridgeLogger.info('BRIDGE_INIT', message, data),
  
  bridgeInitError: (message: string, error: Error) => 
    bridgeLogger.error('BRIDGE_INIT', message, error),

  // Transfer operations
  transferStart: (params: any) => 
    bridgeLogger.info('TRANSFER', 'Starting bridge transfer', params),
  
  transferSuccess: (txHash: string, data?: any) => 
    bridgeLogger.info('TRANSFER', `Transfer completed: ${txHash}`, data),
  
  transferError: (message: string, error: Error, data?: any) => 
    bridgeLogger.error('TRANSFER', message, error, data),

  // Fee calculations
  feeCalculation: (message: string, data?: any) => 
    bridgeLogger.debug('FEES', message, data),
  
  feeError: (message: string, error: Error) => 
    bridgeLogger.error('FEES', message, error),

  // Chain operations
  chainSwitch: (fromChain: string, toChain: string) => 
    bridgeLogger.info('CHAIN', `Switching from ${fromChain} to ${toChain}`),
  
  chainSwitchError: (message: string, error: Error) => 
    bridgeLogger.error('CHAIN', message, error),

  // Validation
  validation: (message: string, data?: any) => 
    bridgeLogger.debug('VALIDATION', message, data),
  
  validationError: (message: string, data?: any) => 
    bridgeLogger.warn('VALIDATION', message, data),

  // Transaction status
  txStatus: (status: string, txHash?: string, data?: any) => 
    bridgeLogger.info('TX_STATUS', `Status: ${status}${txHash ? ` (${txHash})` : ''}`, data),

  // General debug
  debug: (category: string, message: string, data?: any) => 
    bridgeLogger.debug(category, message, data),
};
