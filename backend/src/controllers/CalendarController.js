const BaseController = require('./BaseController');
const { ErrorHandler } = require('../middleware/errorHandler');
const APIResponse = require('../lib/apiResponse');
const CalendarService = require('../services/CalendarService');
const prisma = require('../lib/prisma');

class CalendarController extends BaseController {
  constructor() {
    super(prisma.calendarEvent, {
      allowedFilters: ['eventType', 'status', 'caseId', 'isAllDay'],
      allowedSortFields: ['startTime', 'endTime', 'title', 'eventType', 'createdAt'],
      defaultSort: { startTime: 'asc' },
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
      searchFields: ['title', 'description', 'location'],
      requiredCreateFields: ['title', 'startTime', 'endTime'],
      allowedCreateFields: [
        'title', 'description', 'startTime', 'endTime', 'eventType', 
        'isAllDay', 'location', 'attendees', 'reminderMinutes', 'caseId'
      ],
      allowedUpdateFields: [
        'title', 'description', 'startTime', 'endTime', 'location', 
        'attendees', 'reminderMinutes', 'status'
      ]
    });
  }

  // Override user filtering for calendar events
  addUserFilter(where, user) {
    return {
      ...where,
      OR: [
        { createdById: user.userId },
        { attendees: { has: user.userId } }
      ]
    };
  }

  // Get calendar events for date range
  getCalendarEvents = ErrorHandler.asyncHandler(async (req, res) => {
    const { startDate, endDate, caseId } = req.query;
    const { includeTypes, excludeTypes } = req.body || {};

    if (!startDate || !endDate) {
      const response = APIResponse.error('Start date and end date are required', 400);
      return res.status(400).json(response);
    }

    const events = await CalendarService.getCalendarEvents(
      req.user.userId,
      new Date(startDate),
      new Date(endDate),
      { includeTypes, excludeTypes, caseId }
    );

    const response = APIResponse.success(events, 'Calendar events retrieved successfully');
    res.json(response);
  });

  // Get upcoming events
  getUpcomingEvents = ErrorHandler.asyncHandler(async (req, res) => {
    const { daysAhead = 7 } = req.query;

    const events = await CalendarService.getUpcomingEvents(req.user.userId, parseInt(daysAhead));

    const response = APIResponse.success(events, 'Upcoming events retrieved successfully');
    res.json(response);
  });

  // Check schedule conflicts
  checkScheduleConflicts = ErrorHandler.asyncHandler(async (req, res) => {
    const { startTime, endTime, excludeEventId } = req.body;

    if (!startTime || !endTime) {
      const response = APIResponse.error('Start time and end time are required', 400);
      return res.status(400).json(response);
    }

    const conflicts = await CalendarService.checkScheduleConflicts(
      req.user.userId,
      new Date(startTime),
      new Date(endTime),
      excludeEventId
    );

    const response = APIResponse.success({
      hasConflicts: conflicts.length > 0,
      conflicts
    }, 'Schedule conflicts checked successfully');

    res.json(response);
  });

  // Create deadline event from case deadline
  createDeadlineEvent = ErrorHandler.asyncHandler(async (req, res) => {
    const { deadlineId } = req.params;

    const deadline = await prisma.caseDeadline.findUnique({
      where: { id: deadlineId },
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

    if (!deadline) {
      const response = APIResponse.notFound('Deadline', deadlineId);
      return res.status(404).json(response);
    }

    // Check if event already exists
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { deadlineId: deadlineId }
    });

    if (existingEvent) {
      const response = APIResponse.error('Calendar event already exists for this deadline', 409);
      return res.status(409).json(response);
    }

    const event = await CalendarService.createDeadlineEvent(deadline, {
      userId: req.user.userId,
      reminderDays: deadline.reminderDays || [7, 1]
    });

    const response = APIResponse.created(event, 'Deadline event created successfully');
    res.status(201).json(response);
  });

  // Generate case deadline events
  generateCaseDeadlineEvents = ErrorHandler.asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true, attorneyId: true }
    });

    if (!caseRecord) {
      const response = APIResponse.notFound('Case', caseId);
      return res.status(404).json(response);
    }

    const events = await CalendarService.generateCaseDeadlineEvents(caseId, req.user.userId);

    const response = APIResponse.success({
      caseId,
      eventsCreated: events.length,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        eventType: e.eventType
      }))
    }, `Generated ${events.length} calendar events for case deadlines`);

    res.json(response);
  });

  // Create follow-up event from communication
  createFollowUpEvent = ErrorHandler.asyncHandler(async (req, res) => {
    const { communicationId } = req.params;

    const communication = await prisma.communication.findUnique({
      where: { id: communicationId },
      select: {
        id: true,
        subject: true,
        type: true,
        followUpRequired: true,
        followUpDate: true,
        caseId: true,
        userId: true
      }
    });

    if (!communication) {
      const response = APIResponse.notFound('Communication', communicationId);
      return res.status(404).json(response);
    }

    if (!communication.followUpRequired || !communication.followUpDate) {
      const response = APIResponse.error('Communication does not require follow-up or has no follow-up date', 400);
      return res.status(400).json(response);
    }

    // Check if event already exists
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { communicationId: communicationId }
    });

    if (existingEvent) {
      const response = APIResponse.error('Calendar event already exists for this communication', 409);
      return res.status(409).json(response);
    }

    const event = await CalendarService.createFollowUpEvent(communication, {
      userId: req.user.userId
    });

    const response = APIResponse.created(event, 'Follow-up event created successfully');
    res.status(201).json(response);
  });

  // Get calendar view data (monthly, weekly, daily)
  getCalendarView = ErrorHandler.asyncHandler(async (req, res) => {
    const { view = 'month', date } = req.query;
    const currentDate = date ? new Date(date) : new Date();

    let startDate, endDate;

    switch (view) {
      case 'day':
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'week':
        const dayOfWeek = currentDate.getDay();
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'month':
      default:
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    const events = await CalendarService.getCalendarEvents(
      req.user.userId,
      startDate,
      endDate
    );

    // Group events by day for easier frontend consumption
    const eventsByDay = {};
    events.forEach(event => {
      const eventDate = event.startTime.toISOString().split('T')[0];
      if (!eventsByDay[eventDate]) {
        eventsByDay[eventDate] = [];
      }
      eventsByDay[eventDate].push(event);
    });

    const response = APIResponse.success({
      view,
      date: currentDate.toISOString().split('T')[0],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalEvents: events.length,
      events,
      eventsByDay
    }, `${view} calendar view retrieved successfully`);

    res.json(response);
  });

  // Get calendar statistics
  getCalendarStats = ErrorHandler.asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    const currentDate = new Date();
    
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(currentDate);
        startDate.setFullYear(currentDate.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date(currentDate);
        startDate.setMonth(currentDate.getMonth() - 1);
        break;
    }

    const [events, eventTypes, overdue] = await Promise.all([
      prisma.calendarEvent.count({
        where: {
          OR: [
            { createdById: req.user.userId },
            { attendees: { has: req.user.userId } }
          ],
          startTime: { gte: startDate }
        }
      }),
      prisma.calendarEvent.groupBy({
        by: ['eventType'],
        where: {
          OR: [
            { createdById: req.user.userId },
            { attendees: { has: req.user.userId } }
          ],
          startTime: { gte: startDate }
        },
        _count: { id: true }
      }),
      prisma.calendarEvent.count({
        where: {
          OR: [
            { createdById: req.user.userId },
            { attendees: { has: req.user.userId } }
          ],
          startTime: { lt: currentDate },
          status: { in: ['SCHEDULED', 'CONFIRMED'] }
        }
      })
    ]);

    const stats = {
      totalEvents: events,
      overdueEvents: overdue,
      eventsByType: eventTypes.reduce((acc, item) => {
        acc[item.eventType] = item._count.id;
        return acc;
      }, {}),
      period
    };

    const response = APIResponse.success(stats, 'Calendar statistics retrieved successfully');
    res.json(response);
  });
}

module.exports = new CalendarController();