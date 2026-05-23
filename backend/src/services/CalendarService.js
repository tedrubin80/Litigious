const prisma = require('../lib/prisma');
const AuthUtils = require('../lib/authUtils');

/**
 * Calendar Service for Legal Estate Management System
 * Handles calendar integration, event creation, and deadline management
 */
class CalendarService {
  /**
   * Create calendar event from case deadline
   */
  static async createDeadlineEvent(deadline, options = {}) {
    try {
      const { userId, reminderDays = [7, 1] } = options;

      // Create calendar event
      const event = await prisma.calendarEvent.create({
        data: {
          id: AuthUtils.generateToken(16),
          title: `Deadline: ${deadline.title}`,
          description: deadline.description || `Case deadline for ${deadline.case?.caseNumber || 'case'}`,
          startTime: new Date(deadline.dueDate),
          endTime: new Date(new Date(deadline.dueDate).getTime() + (60 * 60 * 1000)), // 1 hour duration
          eventType: 'DEADLINE',
          isAllDay: false,
          location: null,
          attendees: [],
          reminderMinutes: reminderDays.map(days => days * 24 * 60), // Convert days to minutes
          caseId: deadline.caseId,
          deadlineId: deadline.id,
          createdById: userId || deadline.case?.attorneyId,
          status: 'SCHEDULED'
        }
      });

      // Create reminder notifications
      for (const days of reminderDays) {
        const reminderDate = new Date(deadline.dueDate.getTime() - (days * 24 * 60 * 60 * 1000));
        
        if (reminderDate > new Date()) {
          await prisma.notification.create({
            data: {
              id: AuthUtils.generateToken(16),
              type: 'DEADLINE_REMINDER',
              title: `Deadline Reminder - ${days} day${days > 1 ? 's' : ''} remaining`,
              message: `Case deadline "${deadline.title}" is due in ${days} day${days > 1 ? 's' : ''}`,
              userId: userId || deadline.case?.attorneyId,
              entityType: 'DEADLINE',
              entityId: deadline.id,
              scheduledFor: reminderDate,
              status: 'PENDING'
            }
          });
        }
      }

      return event;
    } catch (error) {
      console.error('Error creating deadline event:', error);
      throw error;
    }
  }

  /**
   * Create calendar event from case appointment
   */
  static async createAppointmentEvent(appointment, options = {}) {
    try {
      const { userId } = options;

      const event = await prisma.calendarEvent.create({
        data: {
          id: AuthUtils.generateToken(16),
          title: appointment.title,
          description: appointment.notes || `Appointment for ${appointment.case?.caseNumber || 'case'}`,
          startTime: appointment.scheduledDateTime,
          endTime: appointment.endDateTime || new Date(appointment.scheduledDateTime.getTime() + (60 * 60 * 1000)),
          eventType: 'APPOINTMENT',
          isAllDay: false,
          location: appointment.location,
          attendees: appointment.attendees || [],
          reminderMinutes: [30, 10], // 30 minutes and 10 minutes before
          caseId: appointment.caseId,
          appointmentId: appointment.id,
          createdById: userId || appointment.scheduledById,
          status: 'SCHEDULED'
        }
      });

      return event;
    } catch (error) {
      console.error('Error creating appointment event:', error);
      throw error;
    }
  }

  /**
   * Create calendar event from communication follow-up
   */
  static async createFollowUpEvent(communication, options = {}) {
    try {
      const { userId } = options;

      if (!communication.followUpRequired || !communication.followUpDate) {
        throw new Error('Communication does not require follow-up or has no follow-up date');
      }

      const event = await prisma.calendarEvent.create({
        data: {
          id: AuthUtils.generateToken(16),
          title: `Follow-up: ${communication.subject || 'Communication'}`,
          description: `Follow-up required for ${communication.type} communication`,
          startTime: communication.followUpDate,
          endTime: new Date(communication.followUpDate.getTime() + (30 * 60 * 1000)), // 30 minutes
          eventType: 'FOLLOW_UP',
          isAllDay: false,
          location: null,
          attendees: [],
          reminderMinutes: [60], // 1 hour before
          caseId: communication.caseId,
          communicationId: communication.id,
          createdById: userId || communication.userId,
          status: 'SCHEDULED'
        }
      });

      return event;
    } catch (error) {
      console.error('Error creating follow-up event:', error);
      throw error;
    }
  }

  /**
   * Get calendar events for user within date range
   */
  static async getCalendarEvents(userId, startDate, endDate, options = {}) {
    try {
      const { includeTypes = [], excludeTypes = [], caseId } = options;

      const where = {
        OR: [
          { createdById: userId },
          { attendees: { has: userId } }
        ],
        startTime: {
          gte: startDate,
          lte: endDate
        }
      };

      if (includeTypes.length > 0) {
        where.eventType = { in: includeTypes };
      }

      if (excludeTypes.length > 0) {
        where.eventType = { notIn: excludeTypes };
      }

      if (caseId) {
        where.caseId = caseId;
      }

      const events = await prisma.calendarEvent.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { startTime: 'asc' }
      });

      return events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  static async updateCalendarEvent(eventId, updateData, userId) {
    try {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Calendar event not found');
      }

      // Check permissions
      if (event.createdById !== userId && !event.attendees.includes(userId)) {
        throw new Error('Insufficient permissions to update this event');
      }

      const updatedEvent = await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true
            }
          }
        }
      });

      return updatedEvent;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  static async deleteCalendarEvent(eventId, userId) {
    try {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new Error('Calendar event not found');
      }

      // Check permissions
      if (event.createdById !== userId) {
        throw new Error('Only the event creator can delete this event');
      }

      await prisma.calendarEvent.delete({
        where: { id: eventId }
      });

      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events for user
   */
  static async getUpcomingEvents(userId, daysAhead = 7) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      return this.getCalendarEvents(userId, startDate, endDate);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  /**
   * Check for schedule conflicts
   */
  static async checkScheduleConflicts(userId, startTime, endTime, excludeEventId = null) {
    try {
      const where = {
        OR: [
          { createdById: userId },
          { attendees: { has: userId } }
        ],
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } }
        ],
        status: { not: 'CANCELLED' }
      };

      if (excludeEventId) {
        where.id = { not: excludeEventId };
      }

      const conflicts = await prisma.calendarEvent.findMany({
        where,
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          eventType: true
        }
      });

      return conflicts;
    } catch (error) {
      console.error('Error checking schedule conflicts:', error);
      throw error;
    }
  }

  /**
   * Generate case deadline calendar events
   */
  static async generateCaseDeadlineEvents(caseId, userId) {
    try {
      const deadlines = await prisma.caseDeadline.findMany({
        where: { 
          caseId,
          dueDate: { gte: new Date() } // Only future deadlines
        },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              attorneyId: true
            }
          }
        }
      });

      const events = [];
      for (const deadline of deadlines) {
        // Check if event already exists
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: { deadlineId: deadline.id }
        });

        if (!existingEvent) {
          const event = await this.createDeadlineEvent(deadline, { 
            userId: userId || deadline.case.attorneyId,
            reminderDays: deadline.reminderDays || [7, 1]
          });
          events.push(event);
        }
      }

      return events;
    } catch (error) {
      console.error('Error generating case deadline events:', error);
      throw error;
    }
  }
}

module.exports = CalendarService;