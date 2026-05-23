const { PrismaClient } = require('@prisma/client');

class SmartTimeTrackingService {
  constructor() {
    this.prisma = new PrismaClient();
    
    // Activity patterns for automatic project detection
    this.ACTIVITY_PATTERNS = {
      'DOCUMENT_REVIEW': {
        keywords: ['review', 'analyze', 'examine', 'read', 'document', 'contract', 'agreement'],
        hourlyRate: 250,
        category: 'DOCUMENT_WORK'
      },
      'LEGAL_RESEARCH': {
        keywords: ['research', 'case law', 'statute', 'precedent', 'westlaw', 'lexis', 'google scholar'],
        hourlyRate: 200,
        category: 'RESEARCH'
      },
      'CLIENT_COMMUNICATION': {
        keywords: ['call', 'phone', 'email', 'meeting', 'client', 'consultation', 'conference'],
        hourlyRate: 300,
        category: 'CLIENT_WORK'
      },
      'COURT_WORK': {
        keywords: ['court', 'hearing', 'trial', 'deposition', 'motion', 'filing', 'appearance'],
        hourlyRate: 400,
        category: 'COURT_WORK'
      },
      'DOCUMENT_DRAFTING': {
        keywords: ['draft', 'write', 'create', 'prepare', 'compose', 'brief', 'motion', 'contract'],
        hourlyRate: 350,
        category: 'DRAFTING'
      },
      'ADMINISTRATIVE': {
        keywords: ['admin', 'schedule', 'calendar', 'organize', 'file', 'billing', 'invoice'],
        hourlyRate: 150,
        category: 'ADMINISTRATIVE'
      }
    };

    // Billing rate multipliers based on urgency/complexity
    this.RATE_MULTIPLIERS = {
      'URGENT': 1.5,
      'COMPLEX': 1.25,
      'ROUTINE': 1.0,
      'BULK': 0.9
    };

    // Time tracking states
    this.TRACKING_STATES = {
      ACTIVE: 'ACTIVE',
      PAUSED: 'PAUSED',
      COMPLETED: 'COMPLETED',
      BILLED: 'BILLED',
      DISPUTED: 'DISPUTED'
    };
  }

  /**
   * Start automatic time tracking session
   */
  async startTimeTracking(userId, description, caseId = null, clientId = null, metadata = {}) {
    try {
      // Stop any active sessions for this user first
      await this.stopActiveTracking(userId);

      // Analyze activity description for automatic project detection
      const activityAnalysis = this.analyzeActivity(description);
      
      // Auto-detect case/client if not provided
      if (!caseId && !clientId) {
        const autoDetection = await this.autoDetectProject(userId, description, activityAnalysis);
        caseId = autoDetection.caseId;
        clientId = autoDetection.clientId;
      }

      // Create time entry
      const timeEntry = await this.prisma.timeEntry.create({
        data: {
          userId: userId,
          caseId: caseId,
          clientId: clientId,
          description: description,
          startTime: new Date(),
          status: this.TRACKING_STATES.ACTIVE,
          metadata: {
            ...metadata,
            activityType: activityAnalysis.activityType,
            suggestedRate: activityAnalysis.suggestedRate,
            category: activityAnalysis.category,
            autoDetected: !caseId && !clientId,
            trackingStarted: new Date().toISOString()
          }
        }
      });

      // Start background monitoring
      this.startActivityMonitoring(timeEntry.id, userId);

      return {
        success: true,
        timeEntry: timeEntry,
        suggestedRate: activityAnalysis.suggestedRate,
        detectedActivity: activityAnalysis.activityType
      };

    } catch (error) {
      console.error('Start time tracking error:', error);
      throw new Error(`Failed to start time tracking: ${error.message}`);
    }
  }

  /**
   * Stop active time tracking
   */
  async stopActiveTracking(userId, completed = true) {
    try {
      const activeEntries = await this.prisma.timeEntry.findMany({
        where: {
          userId: userId,
          status: this.TRACKING_STATES.ACTIVE
        }
      });

      const results = [];

      for (const entry of activeEntries) {
        const endTime = new Date();
        const duration = Math.round((endTime - entry.startTime) / 1000 / 60); // minutes

        // Calculate billable amount
        const billableAmount = this.calculateBillableAmount(
          duration,
          entry.metadata?.suggestedRate || 250,
          entry.metadata?.complexity || 'ROUTINE'
        );

        const updatedEntry = await this.prisma.timeEntry.update({
          where: { id: entry.id },
          data: {
            endTime: endTime,
            duration: duration,
            status: completed ? this.TRACKING_STATES.COMPLETED : this.TRACKING_STATES.PAUSED,
            billableAmount: billableAmount,
            metadata: {
              ...entry.metadata,
              trackingStopped: endTime.toISOString(),
              autoCalculated: true,
              billableRate: entry.metadata?.suggestedRate || 250
            }
          }
        });

        results.push(updatedEntry);

        // Stop activity monitoring
        this.stopActivityMonitoring(entry.id);
      }

      return {
        success: true,
        stoppedEntries: results,
        count: results.length
      };

    } catch (error) {
      console.error('Stop time tracking error:', error);
      throw new Error(`Failed to stop time tracking: ${error.message}`);
    }
  }

  /**
   * Analyze activity description to determine type and billing rate
   */
  analyzeActivity(description) {
    const lowerDesc = description.toLowerCase();
    let bestMatch = null;
    let maxScore = 0;

    // Score each activity pattern
    Object.keys(this.ACTIVITY_PATTERNS).forEach(activityType => {
      const pattern = this.ACTIVITY_PATTERNS[activityType];
      let score = 0;

      pattern.keywords.forEach(keyword => {
        if (lowerDesc.includes(keyword)) {
          score += keyword.length; // Longer keywords get higher weight
        }
      });

      if (score > maxScore) {
        maxScore = score;
        bestMatch = {
          activityType: activityType,
          suggestedRate: pattern.hourlyRate,
          category: pattern.category,
          confidence: Math.min(score / 20, 1) // Normalize confidence score
        };
      }
    });

    // Default to general legal work if no match
    return bestMatch || {
      activityType: 'GENERAL_LEGAL',
      suggestedRate: 250,
      category: 'GENERAL',
      confidence: 0.1
    };
  }

  /**
   * Auto-detect project based on recent activity and context
   */
  async autoDetectProject(userId, description, activityAnalysis) {
    try {
      const lowerDesc = description.toLowerCase();
      
      // Look for case/client mentions in description
      const caseMatches = await this.prisma.case.findMany({
        where: {
          assignedUserId: userId,
          status: { not: 'CLOSED' },
          OR: [
            { title: { contains: description, mode: 'insensitive' } },
            { caseNumber: { contains: description, mode: 'insensitive' } }
          ]
        },
        take: 5
      });

      const clientMatches = await this.prisma.client.findMany({
        where: {
          OR: [
            { firstName: { contains: description, mode: 'insensitive' } },
            { lastName: { contains: description, mode: 'insensitive' } },
            { email: { contains: description, mode: 'insensitive' } }
          ]
        },
        take: 5
      });

      // Get recent time entries for pattern matching
      const recentEntries = await this.prisma.timeEntry.findMany({
        where: {
          userId: userId,
          startTime: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: { case: true, client: true },
        orderBy: { startTime: 'desc' },
        take: 10
      });

      // Score matches based on various factors
      let bestCaseMatch = null;
      let bestClientMatch = null;

      // Prioritize exact matches
      if (caseMatches.length > 0) {
        bestCaseMatch = caseMatches[0].id;
      }
      
      if (clientMatches.length > 0) {
        bestClientMatch = clientMatches[0].id;
      }

      // Fall back to recent activity patterns
      if (!bestCaseMatch && !bestClientMatch && recentEntries.length > 0) {
        // Find most frequent case/client in recent entries
        const caseFreq = {};
        const clientFreq = {};

        recentEntries.forEach(entry => {
          if (entry.caseId) caseFreq[entry.caseId] = (caseFreq[entry.caseId] || 0) + 1;
          if (entry.clientId) clientFreq[entry.clientId] = (clientFreq[entry.clientId] || 0) + 1;
        });

        const mostFrequentCase = Object.keys(caseFreq).reduce((a, b) => 
          caseFreq[a] > caseFreq[b] ? a : b, null);
        const mostFrequentClient = Object.keys(clientFreq).reduce((a, b) => 
          clientFreq[a] > clientFreq[b] ? a : b, null);

        bestCaseMatch = mostFrequentCase;
        bestClientMatch = mostFrequentClient;
      }

      return {
        caseId: bestCaseMatch,
        clientId: bestClientMatch,
        confidence: (caseMatches.length > 0 || clientMatches.length > 0) ? 0.9 : 0.6
      };

    } catch (error) {
      console.error('Auto-detect project error:', error);
      return { caseId: null, clientId: null, confidence: 0 };
    }
  }

  /**
   * Calculate billable amount based on duration, rate, and complexity
   */
  calculateBillableAmount(durationMinutes, hourlyRate, complexity = 'ROUTINE') {
    const hours = durationMinutes / 60;
    const multiplier = this.RATE_MULTIPLIERS[complexity] || 1.0;
    const billableRate = hourlyRate * multiplier;
    
    // Round to nearest 6-minute increment (0.1 hour)
    const roundedHours = Math.ceil(hours * 10) / 10;
    
    return roundedHours * billableRate;
  }

  /**
   * Get time tracking analytics
   */
  async getTimeAnalytics(userId, startDate, endDate) {
    try {
      const timeEntries = await this.prisma.timeEntry.findMany({
        where: {
          userId: userId,
          startTime: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          status: { in: [this.TRACKING_STATES.COMPLETED, this.TRACKING_STATES.BILLED] }
        },
        include: {
          case: { select: { title: true, caseType: true } },
          client: { select: { firstName: true, lastName: true } }
        }
      });

      // Calculate analytics
      const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      const totalBillable = timeEntries.reduce((sum, entry) => sum + (entry.billableAmount || 0), 0);
      
      const activityBreakdown = {};
      const caseBreakdown = {};
      const dailyBreakdown = {};

      timeEntries.forEach(entry => {
        const activity = entry.metadata?.activityType || 'UNKNOWN';
        const caseTitle = entry.case?.title || 'No Case';
        const day = entry.startTime.toISOString().split('T')[0];

        activityBreakdown[activity] = (activityBreakdown[activity] || 0) + (entry.duration || 0);
        caseBreakdown[caseTitle] = (caseBreakdown[caseTitle] || 0) + (entry.duration || 0);
        dailyBreakdown[day] = (dailyBreakdown[day] || 0) + (entry.duration || 0);
      });

      return {
        summary: {
          totalMinutes: totalMinutes,
          totalHours: Math.round(totalMinutes / 60 * 100) / 100,
          totalBillable: totalBillable,
          averageHourlyRate: totalMinutes > 0 ? totalBillable / (totalMinutes / 60) : 0,
          entriesCount: timeEntries.length
        },
        breakdowns: {
          byActivity: activityBreakdown,
          byCase: caseBreakdown,
          byDay: dailyBreakdown
        },
        entries: timeEntries
      };

    } catch (error) {
      console.error('Time analytics error:', error);
      throw new Error(`Failed to get time analytics: ${error.message}`);
    }
  }

  /**
   * Generate automated timesheet
   */
  async generateTimesheet(userId, startDate, endDate, format = 'JSON') {
    try {
      const analytics = await this.getTimeAnalytics(userId, startDate, endDate);
      
      const timesheet = {
        period: { startDate, endDate },
        attorney: await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true, barNumber: true }
        }),
        summary: analytics.summary,
        entries: analytics.entries.map(entry => ({
          date: entry.startTime.toISOString().split('T')[0],
          time: entry.startTime.toISOString().split('T')[1].split('.')[0],
          duration: `${Math.floor((entry.duration || 0) / 60)}:${String((entry.duration || 0) % 60).padStart(2, '0')}`,
          description: entry.description,
          case: entry.case?.title || 'No Case',
          activityType: entry.metadata?.activityType || 'General',
          billableAmount: entry.billableAmount || 0,
          hourlyRate: entry.metadata?.billableRate || 0
        })),
        generated: new Date().toISOString()
      };

      return {
        success: true,
        timesheet: timesheet,
        format: format
      };

    } catch (error) {
      console.error('Generate timesheet error:', error);
      throw new Error(`Failed to generate timesheet: ${error.message}`);
    }
  }

  /**
   * Smart activity suggestions based on patterns
   */
  async getActivitySuggestions(userId, currentDescription = '') {
    try {
      // Get recent descriptions for pattern matching
      const recentEntries = await this.prisma.timeEntry.findMany({
        where: {
          userId: userId,
          startTime: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        select: { description: true, metadata: true },
        orderBy: { startTime: 'desc' },
        take: 50
      });

      // Extract common patterns
      const descriptionPatterns = new Map();
      const activityTypes = new Map();

      recentEntries.forEach(entry => {
        const desc = entry.description.toLowerCase();
        const words = desc.split(' ').filter(word => word.length > 3);
        
        words.forEach(word => {
          descriptionPatterns.set(word, (descriptionPatterns.get(word) || 0) + 1);
        });

        const activityType = entry.metadata?.activityType;
        if (activityType) {
          activityTypes.set(activityType, (activityTypes.get(activityType) || 0) + 1);
        }
      });

      // Generate suggestions based on current input
      const currentWords = currentDescription.toLowerCase().split(' ');
      const suggestions = [];

      // Activity type suggestions
      const sortedActivities = Array.from(activityTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      sortedActivities.forEach(([activity, count]) => {
        const pattern = this.ACTIVITY_PATTERNS[activity];
        if (pattern) {
          suggestions.push({
            type: 'ACTIVITY',
            suggestion: activity,
            description: pattern.category,
            rate: pattern.hourlyRate,
            confidence: count / recentEntries.length
          });
        }
      });

      // Description autocomplete
      if (currentDescription.length > 2) {
        const matchingPatterns = Array.from(descriptionPatterns.entries())
          .filter(([word]) => word.includes(currentDescription.toLowerCase()))
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        matchingPatterns.forEach(([word, count]) => {
          suggestions.push({
            type: 'DESCRIPTION',
            suggestion: word,
            frequency: count,
            confidence: count / recentEntries.length
          });
        });
      }

      return {
        success: true,
        suggestions: suggestions,
        recentPatterns: Array.from(descriptionPatterns.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
      };

    } catch (error) {
      console.error('Activity suggestions error:', error);
      throw new Error(`Failed to get activity suggestions: ${error.message}`);
    }
  }

  /**
   * Activity monitoring (placeholder for real implementation)
   */
  startActivityMonitoring(timeEntryId, userId) {
    // In a real implementation, this would:
    // - Monitor file system activity
    // - Track application usage
    // - Monitor browser activity
    // - Detect idle time
    // - Auto-pause for breaks
    console.log(`Started activity monitoring for time entry ${timeEntryId}`);
  }

  stopActivityMonitoring(timeEntryId) {
    // Stop monitoring
    console.log(`Stopped activity monitoring for time entry ${timeEntryId}`);
  }

  /**
   * Bulk time entry import
   */
  async importTimeEntries(userId, entries) {
    try {
      const results = [];
      const errors = [];

      for (const entryData of entries) {
        try {
          // Validate and process each entry
          const processedEntry = await this.processImportEntry(userId, entryData);
          results.push(processedEntry);
        } catch (error) {
          errors.push({
            entry: entryData,
            error: error.message
          });
        }
      }

      return {
        success: true,
        imported: results,
        errors: errors,
        summary: {
          total: entries.length,
          successful: results.length,
          failed: errors.length
        }
      };

    } catch (error) {
      console.error('Import time entries error:', error);
      throw new Error(`Failed to import time entries: ${error.message}`);
    }
  }

  async processImportEntry(userId, entryData) {
    // Process and validate individual import entry
    const activityAnalysis = this.analyzeActivity(entryData.description || '');
    
    return await this.prisma.timeEntry.create({
      data: {
        userId: userId,
        description: entryData.description,
        startTime: new Date(entryData.startTime),
        endTime: entryData.endTime ? new Date(entryData.endTime) : null,
        duration: entryData.duration || null,
        billableAmount: entryData.billableAmount || null,
        caseId: entryData.caseId || null,
        clientId: entryData.clientId || null,
        status: this.TRACKING_STATES.COMPLETED,
        metadata: {
          imported: true,
          importDate: new Date().toISOString(),
          activityType: activityAnalysis.activityType,
          suggestedRate: activityAnalysis.suggestedRate
        }
      }
    });
  }
}

// Export singleton instance
module.exports = new SmartTimeTrackingService();