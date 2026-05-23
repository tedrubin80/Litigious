const fs = require('fs').promises;
const path = require('path');

class ErrorMonitor {
  constructor() {
    this.errorLog = [];
    this.maxErrors = 1000; // Keep last 1000 errors in memory
    this.errorLogPath = path.join(__dirname, '../../logs/errors.log');
    this.criticalErrorPath = path.join(__dirname, '../../logs/critical.log');
    
    // Error categories
    this.errorCategories = {
      DATABASE: 'DATABASE',
      API: 'API',
      AUTH: 'AUTH',
      VALIDATION: 'VALIDATION',
      EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
      SYSTEM: 'SYSTEM'
    };
    
    // Error severity levels
    this.severity = {
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      CRITICAL: 'CRITICAL'
    };
    
    this.initializeLogs();
  }
  
  async initializeLogs() {
    try {
      const logsDir = path.join(__dirname, '../../logs');
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }
  
  // Log an error with context
  async logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      category: context.category || this.errorCategories.SYSTEM,
      severity: context.severity || this.severity.MEDIUM,
      userId: context.userId || null,
      requestId: context.requestId || null,
      endpoint: context.endpoint || null,
      method: context.method || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      additionalData: context.additionalData || {}
    };
    
    // Add to in-memory log
    this.errorLog.push(errorEntry);
    if (this.errorLog.length > this.maxErrors) {
      this.errorLog.shift(); // Remove oldest error
    }
    
    // Write to file
    await this.writeToFile(errorEntry);
    
    // If critical, send alert
    if (errorEntry.severity === this.severity.CRITICAL) {
      await this.handleCriticalError(errorEntry);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorEntry);
    }
    
    return errorEntry;
  }
  
  // Write error to log file
  async writeToFile(errorEntry) {
    try {
      const logLine = JSON.stringify(errorEntry) + '\n';
      await fs.appendFile(this.errorLogPath, logLine);
    } catch (error) {
      console.error('Failed to write to error log:', error);
    }
  }
  
  // Handle critical errors
  async handleCriticalError(errorEntry) {
    try {
      // Write to critical log
      const logLine = JSON.stringify(errorEntry) + '\n';
      await fs.appendFile(this.criticalErrorPath, logLine);
      
      // In production, you would send alerts here
      // For example: email, SMS, Slack notification
      console.error('🚨 CRITICAL ERROR:', errorEntry.message);
      
      // Store critical error details for admin dashboard
      await this.storeCriticalError(errorEntry);
    } catch (error) {
      console.error('Failed to handle critical error:', error);
    }
  }
  
  // Store critical error in database
  async storeCriticalError(errorEntry) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // Check if Activity table exists and use it for critical errors
      await prisma.activity.create({
        data: {
          action: 'CRITICAL_ERROR',
          description: errorEntry.message,
          entityType: 'SYSTEM',
          entityId: errorEntry.requestId || 'system',
          userId: errorEntry.userId || 'ce7cadbe0f01fcdc79a0138a826d5969', // System user
          metadata: {
            severity: errorEntry.severity,
            category: errorEntry.category,
            stack: errorEntry.stack,
            endpoint: errorEntry.endpoint
          }
        }
      });
      
      await prisma.$disconnect();
    } catch (dbError) {
      console.error('Failed to store critical error in database:', dbError);
    }
  }
  
  // Get error statistics
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byCategory: {},
      bySeverity: {},
      recentErrors: this.errorLog.slice(-10), // Last 10 errors
      criticalCount: 0,
      errorRate: 0
    };
    
    // Calculate statistics
    this.errorLog.forEach(error => {
      // By category
      if (!stats.byCategory[error.category]) {
        stats.byCategory[error.category] = 0;
      }
      stats.byCategory[error.category]++;
      
      // By severity
      if (!stats.bySeverity[error.severity]) {
        stats.bySeverity[error.severity] = 0;
      }
      stats.bySeverity[error.severity]++;
      
      // Count critical errors
      if (error.severity === this.severity.CRITICAL) {
        stats.criticalCount++;
      }
    });
    
    // Calculate error rate (errors per hour)
    if (this.errorLog.length > 0) {
      const oldestError = new Date(this.errorLog[0].timestamp);
      const newestError = new Date(this.errorLog[this.errorLog.length - 1].timestamp);
      const hoursDiff = (newestError - oldestError) / (1000 * 60 * 60);
      stats.errorRate = hoursDiff > 0 ? (this.errorLog.length / hoursDiff).toFixed(2) : 0;
    }
    
    return stats;
  }
  
  // Get errors by filter
  getErrors(filter = {}) {
    let filtered = [...this.errorLog];
    
    if (filter.category) {
      filtered = filtered.filter(e => e.category === filter.category);
    }
    
    if (filter.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }
    
    if (filter.userId) {
      filtered = filtered.filter(e => e.userId === filter.userId);
    }
    
    if (filter.startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(filter.startDate));
    }
    
    if (filter.endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(filter.endDate));
    }
    
    return filtered;
  }
  
  // Clear old errors from memory
  clearOldErrors(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    this.errorLog = this.errorLog.filter(error => 
      new Date(error.timestamp) > cutoffDate
    );
    
    return this.errorLog.length;
  }
  
  // Express middleware for error handling
  middleware() {
    return (err, req, res, next) => {
      const context = {
        category: this.errorCategories.API,
        severity: err.status >= 500 ? this.severity.HIGH : this.severity.MEDIUM,
        userId: req.user?.id,
        requestId: req.id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        additionalData: {
          body: req.body,
          params: req.params,
          query: req.query
        }
      };
      
      // Log the error
      this.logError(err, context);
      
      // Send response
      const statusCode = err.status || 500;
      const message = process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : err.message;
      
      res.status(statusCode).json({
        error: message,
        requestId: req.id,
        timestamp: new Date().toISOString()
      });
    };
  }
}

// Create singleton instance
const errorMonitor = new ErrorMonitor();

module.exports = errorMonitor;