// ============================================================================
// CALENDAR & SCHEDULING MODULE
// ============================================================================

// First, let's add the Calendar models to our Prisma schema:
// Add these models to prisma/schema.prisma

model Calendar {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String   @default("#3B82F6") // Blue default
  isDefault   Boolean  @default(false)
  isPublic    Boolean  @default(false)
  timezone    String   @default("America/Los_Angeles")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Owner and sharing
  ownerId String
  owner   User   @relation(fields: [ownerId], references: [id])

  // Calendar events
  events CalendarEvent[]
  shares CalendarShare[]

  @@map("calendars")
}

model CalendarEvent {
  id          String    @id @default(cuid())
  title       String
  description String?
  location    String?
  startTime   DateTime
  endTime     DateTime
  allDay      Boolean   @default(false)
  recurring   Boolean   @default(false)
  recurrence  Json?     // Recurrence rules
  status      EventStatus @default(SCHEDULED)
  type        EventType
  priority    EventPriority @default(MEDIUM)
  reminders   Json?     // Reminder settings
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relationships
  calendarId String
  calendar   Calendar @relation(fields: [calendarId], references: [id], onDelete: Cascade)
  
  createdById String
  createdBy   User   @relation("CreatedEvents", fields: [createdById], references: [id])

  // Case and client associations
  caseId   String?
  case     Case?   @relation(fields: [caseId], references: [id])
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id])

  // Attendees and participants
  attendees EventAttendee[]
  
  @@map("calendar_events")
}

model EventAttendee {
  id       String           @id @default(cuid())
  email    String
  name     String?
  status   AttendeeStatus   @default(PENDING)
  isOrganizer Boolean       @default(false)
  notes    String?

  eventId String
  event   CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  userId String?
  user   User?  @relation(fields: [userId], references: [id])

  @@unique([eventId, email])
  @@map("event_attendees")
}

model CalendarShare {
  id          String         @id @default(cuid())
  permission  SharePermission @default(READ)
  sharedAt    DateTime       @default(now())

  calendarId String
  calendar   Calendar @relation(fields: [calendarId], references: [id], onDelete: Cascade)

  sharedWithId String
  sharedWith   User   @relation(fields: [sharedWithId], references: [id])

  @@unique([calendarId, sharedWithId])
  @@map("calendar_shares")
}

model CourtDate {
  id          String       @id @default(cuid())
  courtName   String
  address     String
  judgeId     String?
  judge       Judge?       @relation(fields: [judgeId], references: [id])
  courtroom   String?
  hearingType CourtHearingType
  status      CourtStatus  @default(SCHEDULED)
  notes       String?
  outcome     String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Event association
  eventId String @unique
  event   CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  // Case association
  caseId String
  case   Case   @relation(fields: [caseId], references: [id])

  @@map("court_dates")
}

model Judge {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  title     String   @default("Judge")
  court     String
  phone     String?
  email     String?
  notes     String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  courtDates CourtDate[]

  @@map("judges")
}

model Deadline {
  id          String       @id @default(cuid())
  title       String
  description String?
  type        DeadlineType
  priority    EventPriority @default(HIGH)
  status      DeadlineStatus @default(PENDING)
  completedAt DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Event association
  eventId String @unique
  event   CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  // Case association
  caseId String
  case   Case   @relation(fields: [caseId], references: [id])

  // Assignment
  assignedToId String?
  assignedTo   User?  @relation(fields: [assignedToId], references: [id])

  @@map("deadlines")
}

// Enums for Calendar system
enum EventStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  POSTPONED
}

enum EventType {
  MEETING
  APPOINTMENT
  COURT_DATE
  DEADLINE
  CONSULTATION
  DEPOSITION
  MEDIATION
  ARBITRATION
  PHONE_CALL
  CONFERENCE
  PERSONAL
  OTHER
}

enum EventPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum AttendeeStatus {
  PENDING
  ACCEPTED
  DECLINED
  TENTATIVE
  NO_RESPONSE
}

enum SharePermission {
  READ
  WRITE
  ADMIN
}

enum CourtHearingType {
  INITIAL_HEARING
  CASE_MANAGEMENT
  MOTION_HEARING
  SETTLEMENT_CONFERENCE
  TRIAL
  SENTENCING
  APPEAL
  OTHER
}

enum CourtStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  POSTPONED
  CANCELLED
}

enum DeadlineType {
  STATUTE_OF_LIMITATIONS
  DISCOVERY_DEADLINE
  MOTION_DEADLINE
  FILING_DEADLINE
  RESPONSE_DEADLINE
  APPEAL_DEADLINE
  SETTLEMENT_DEADLINE
  OTHER
}

enum DeadlineStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
  EXTENDED
}

// Now update the existing models to include calendar relationships:
// Add to User model:
// calendars Calendar[]
// createdEvents CalendarEvent[] @relation("CreatedEvents")
// eventAttendees EventAttendee[]
// calendarShares CalendarShare[]
// assignedDeadlines Deadline[]

// Add to Case model:
// events CalendarEvent[]
// courtDates CourtDate[]
// deadlines Deadline[]

// Add to Client model:
// events CalendarEvent[]

// ============================================================================
// CALENDAR MODULE IMPLEMENTATION
// ============================================================================

// src/modules/calendar/calendar.module.ts
import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CourtDatesController } from './court-dates.controller';
import { CourtDatesService } from './court-dates.service';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesService } from './deadlines.service';

@Module({
  controllers: [
    CalendarController,
    EventsController,
    CourtDatesController,
    DeadlinesController,
  ],
  providers: [
    CalendarService,
    EventsService,
    CourtDatesService,
    DeadlinesService,
  ],
  exports: [
    CalendarService,
    EventsService,
    CourtDatesService,
    DeadlinesService,
  ],
})
export class CalendarModule {}

// src/modules/calendar/calendar.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { ShareCalendarDto } from './dto/share-calendar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Get user calendars' })
  @ApiResponse({ status: 200, description: 'Calendars retrieved successfully' })
  getUserCalendars(@Request() req) {
    return this.calendarService.getUserCalendars(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new calendar' })
  @ApiResponse({ status: 201, description: 'Calendar created successfully' })
  createCalendar(@Body() createCalendarDto: CreateCalendarDto, @Request() req) {
    return this.calendarService.createCalendar(createCalendarDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get calendar by ID' })
  @ApiResponse({ status: 200, description: 'Calendar retrieved successfully' })
  getCalendar(@Param('id') id: string, @Request() req) {
    return this.calendarService.getCalendar(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update calendar' })
  @ApiResponse({ status: 200, description: 'Calendar updated successfully' })
  updateCalendar(
    @Param('id') id: string,
    @Body() updateCalendarDto: UpdateCalendarDto,
    @Request() req,
  ) {
    return this.calendarService.updateCalendar(id, updateCalendarDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete calendar' })
  @ApiResponse({ status: 200, description: 'Calendar deleted successfully' })
  deleteCalendar(@Param('id') id: string, @Request() req) {
    return this.calendarService.deleteCalendar(id, req.user.id);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share calendar with user' })
  @ApiResponse({ status: 201, description: 'Calendar shared successfully' })
  shareCalendar(
    @Param('id') id: string,
    @Body() shareCalendarDto: ShareCalendarDto,
    @Request() req,
  ) {
    return this.calendarService.shareCalendar(id, shareCalendarDto, req.user.id);
  }

  @Get(':id/shares')
  @ApiOperation({ summary: 'Get calendar shares' })
  @ApiResponse({ status: 200, description: 'Calendar shares retrieved successfully' })
  getCalendarShares(@Param('id') id: string, @Request() req) {
    return this.calendarService.getCalendarShares(id, req.user.id);
  }

  @Delete(':id/shares/:shareId')
  @ApiOperation({ summary: 'Remove calendar share' })
  @ApiResponse({ status: 200, description: 'Calendar share removed successfully' })
  removeCalendarShare(
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Request() req,
  ) {
    return this.calendarService.removeCalendarShare(id, shareId, req.user.id);
  }
}

// src/modules/calendar/calendar.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { ShareCalendarDto } from './dto/share-calendar.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserCalendars(userId: string) {
    const [ownedCalendars, sharedCalendars] = await Promise.all([
      this.prisma.calendar.findMany({
        where: { ownerId: userId },
        include: {
          _count: { select: { events: true } },
          shares: {
            include: {
              sharedWith: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.calendar.findMany({
        where: {
          shares: { some: { sharedWithId: userId } },
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
          shares: {
            where: { sharedWithId: userId },
            select: { permission: true },
          },
          _count: { select: { events: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      owned: ownedCalendars,
      shared: sharedCalendars.map(calendar => ({
        ...calendar,
        permission: calendar.shares[0]?.permission,
        shares: undefined,
      })),
    };
  }

  async createCalendar(createCalendarDto: CreateCalendarDto, ownerId: string) {
    // If this is the first calendar, make it default
    const existingCalendars = await this.prisma.calendar.count({
      where: { ownerId },
    });

    const calendar = await this.prisma.calendar.create({
      data: {
        ...createCalendarDto,
        ownerId,
        isDefault: existingCalendars === 0 || createCalendarDto.isDefault,
      },
      include: {
        _count: { select: { events: true } },
      },
    });

    // If setting as default, unset other default calendars
    if (calendar.isDefault) {
      await this.prisma.calendar.updateMany({
        where: {
          ownerId,
          id: { not: calendar.id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return calendar;
  }

  async getCalendar(id: string, userId: string) {
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { shares: { some: { sharedWithId: userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
        shares: {
          include: {
            sharedWith: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: { select: { events: true } },
      },
    });

    if (!calendar) {
      throw new NotFoundException('Calendar not found');
    }

    const userPermission = calendar.ownerId === userId ? 'ADMIN' : 
      calendar.shares.find(share => share.sharedWithId === userId)?.permission;

    return {
      ...calendar,
      userPermission,
    };
  }

  async updateCalendar(id: string, updateCalendarDto: UpdateCalendarDto, userId: string) {
    const calendar = await this.getCalendar(id, userId);
    
    if (calendar.ownerId !== userId) {
      const userShare = calendar.shares.find(share => share.sharedWithId === userId);
      if (!userShare || !['WRITE', 'ADMIN'].includes(userShare.permission)) {
        throw new ForbiddenException('Insufficient permissions to update calendar');
      }
    }

    const updatedCalendar = await this.prisma.calendar.update({
      where: { id },
      data: updateCalendarDto,
      include: {
        _count: { select: { events: true } },
      },
    });

    // Handle default calendar logic
    if (updateCalendarDto.isDefault) {
      await this.prisma.calendar.updateMany({
        where: {
          ownerId: calendar.ownerId,
          id: { not: id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return updatedCalendar;
  }

  async deleteCalendar(id: string, userId: string) {
    const calendar = await this.getCalendar(id, userId);

    if (calendar.ownerId !== userId) {
      throw new ForbiddenException('Only calendar owner can delete calendar');
    }

    await this.prisma.calendar.delete({
      where: { id },
    });

    return { message: 'Calendar deleted successfully' };
  }

  async shareCalendar(id: string, shareCalendarDto: ShareCalendarDto, userId: string) {
    const calendar = await this.getCalendar(id, userId);

    if (calendar.ownerId !== userId) {
      throw new ForbiddenException('Only calendar owner can share calendar');
    }

    // Verify the user to share with exists
    const userToShareWith = await this.prisma.user.findUnique({
      where: { id: shareCalendarDto.sharedWithId },
    });

    if (!userToShareWith) {
      throw new NotFoundException('User to share with not found');
    }

    const share = await this.prisma.calendarShare.create({
      data: {
        calendarId: id,
        sharedWithId: shareCalendarDto.sharedWithId,
        permission: shareCalendarDto.permission,
      },
      include: {
        sharedWith: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return share;
  }

  async getCalendarShares(id: string, userId: string) {
    const calendar = await this.getCalendar(id, userId);

    if (calendar.ownerId !== userId) {
      throw new ForbiddenException('Only calendar owner can view shares');
    }

    return calendar.shares;
  }

  async removeCalendarShare(id: string, shareId: string, userId: string) {
    const calendar = await this.getCalendar(id, userId);

    if (calendar.ownerId !== userId) {
      throw new ForbiddenException('Only calendar owner can remove shares');
    }

    await this.prisma.calendarShare.delete({
      where: { id: shareId },
    });

    return { message: 'Calendar share removed successfully' };
  }
}

// ============================================================================
// EVENTS CONTROLLER AND SERVICE
// ============================================================================

// src/modules/calendar/events.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Calendar Events')
@Controller('calendar/events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get calendar events' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  getEvents(@Query() queryDto: QueryEventsDto, @Request() req) {
    return this.eventsService.getEvents(queryDto, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create calendar event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  createEvent(@Body() createEventDto: CreateEventDto, @Request() req) {
    return this.eventsService.createEvent(createEventDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully' })
  getEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.getEvent(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req,
  ) {
    return this.eventsService.updateEvent(id, updateEventDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  deleteEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.deleteEvent(id, req.user.id);
  }

  @Get('case/:caseId')
  @ApiOperation({ summary: 'Get events for a case' })
  @ApiResponse({ status: 200, description: 'Case events retrieved successfully' })
  getCaseEvents(@Param('caseId') caseId: string, @Request() req) {
    return this.eventsService.getCaseEvents(caseId, req.user.id);
  }

  @Get('upcoming/all')
  @ApiOperation({ summary: 'Get upcoming events for user' })
  @ApiResponse({ status: 200, description: 'Upcoming events retrieved successfully' })
  getUpcomingEvents(@Query() query: { days?: number }, @Request() req) {
    return this.eventsService.getUpcomingEvents(req.user.id, query.days);
  }
}

// src/modules/calendar/events.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(queryDto: QueryEventsDto, userId: string) {
    const {
      calendarId,
      startDate,
      endDate,
      type,
      status,
      caseId,
      page = 1,
      limit = 50,
    } = queryDto;

    const skip = (page - 1) * limit;

    // Build where clause for user's accessible calendars
    const calendarWhere: any = {
      OR: [
        { ownerId: userId },
        { shares: { some: { sharedWithId: userId } } },
      ],
    };

    if (calendarId) {
      calendarWhere.id = calendarId;
    }

    const where: any = {
      calendar: calendarWhere,
    };

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({ startTime: { gte: new Date(startDate) } });
      }
      if (endDate) {
        where.AND.push({ startTime: { lte: new Date(endDate) } });
      }
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (caseId) where.caseId = caseId;

    const [events, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        skip,
        take: limit,
        include: {
          calendar: {
            select: { id: true, name: true, color: true },
          },
          case: {
            select: { id: true, caseNumber: true, title: true },
          },
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
          attendees: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.calendarEvent.count({ where }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createEvent(createEventDto: CreateEventDto, userId: string) {
    // Verify user has write access to calendar
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        id: createEventDto.calendarId,
        OR: [
          { ownerId: userId },
          {
            shares: {
              some: {
                sharedWithId: userId,
                permission: { in: ['WRITE', 'ADMIN'] },
              },
            },
          },
        ],
      },
    });

    if (!calendar) {
      throw new ForbiddenException('Calendar not found or insufficient permissions');
    }

    const { attendees, ...eventData } = createEventDto;

    const event = await this.prisma.calendarEvent.create({
      data: {
        ...eventData,
        createdById: userId,
        attendees: attendees
          ? {
              create: attendees.map(attendee => ({
                ...attendee,
                isOrganizer: attendee.email === userId || attendee.isOrganizer,
              })),
            }
          : undefined,
      },
      include: {
        calendar: {
          select: { id: true, name: true, color: true },
        },
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return event;
  }

  async getEvent(id: string, userId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: {
        id,
        calendar: {
          OR: [
            { ownerId: userId },
            { shares: { some: { sharedWithId: userId } } },
          ],
        },
      },
      include: {
        calendar: {
          select: { id: true, name: true, color: true },
        },
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async updateEvent(id: string, updateEventDto: UpdateEventDto, userId: string) {
    const event = await this.getEvent(id, userId);

    // Check permissions
    const canEdit = event.createdBy.id === userId || 
      event.calendar.ownerId === userId ||
      event.attendees.some(a => a.userId === userId && a.isOrganizer);

    if (!canEdit) {
      throw new ForbiddenException('Insufficient permissions to update event');
    }

    const { attendees, ...eventData } = updateEventDto;

    const updatedEvent = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...eventData,
        ...(attendees && {
          attendees: {
            deleteMany: {},
            create: attendees.map(attendee => ({
              ...attendee,
              isOrganizer: attendee.email === userId || attendee.isOrganizer,
            })),
          },
        }),
      },
      include: {
        calendar: {
          select: { id: true, name: true, color: true },
        },
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return updatedEvent;
  }

  async deleteEvent(id: string, userId: string) {
    const event = await this.getEvent(id, userId);

    // Check permissions
    const canDelete = event.createdBy.id === userId || 
      event.calendar.ownerId === userId ||
      event.attendees.some(a => a.userId === userId && a.isOrganizer);

    if (!canDelete) {
      throw new ForbiddenException('Insufficient permissions to delete event');
    }

    await this.prisma.calendarEvent.delete({
      where: { id },
    });

    return { message: 'Event deleted successfully' };
  }

  async getCaseEvents(caseId: string, userId: string) {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        caseId,
        calendar: {
          OR: [
            { ownerId: userId },
            { shares: { some: { sharedWithId: userId } } },
          ],
        },
      },
      include: {
        calendar: {
          select: { id: true, name: true, color: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return events;
  }

  async getUpcomingEvents(userId: string, days = 30) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const events = await this.prisma.calendarEvent.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'CANCELLED' },
        calendar: {
          OR: [
            { ownerId: userId },
            { shares: { some: { sharedWithId: userId } } },
          ],
        },
      },
      include: {
        calendar: {
          select: { id: true, name: true, color: true },
        },
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    });

    return events;
  }
}

// ============================================================================
// DTOs FOR CALENDAR MODULE
// ============================================================================

// src/modules/calendar/dto/create-calendar.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsHexColor } from 'class-validator';

export class CreateCalendarDto {
  @ApiProperty({ example: 'My Legal Calendar' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Calendar for client meetings and court dates' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsHexColor()
  color?: string = '#3B82F6';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ example: 'America/Los_Angeles' })
  @IsOptional()
  @IsString()
  timezone?: string = 'America/Los_Angeles';
}

// src/modules/calendar/dto/update-calendar.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCalendarDto } from './create-calendar.dto';

export class UpdateCalendarDto extends PartialType(CreateCalendarDto) {}

// src/modules/calendar/dto/share-calendar.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsEnum } from 'class-validator';
import { SharePermission } from '@prisma/client';

export class ShareCalendarDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  sharedWithId: string;

  @ApiProperty({ enum: SharePermission, example: SharePermission.READ })
  @IsEnum(SharePermission)
  permission: SharePermission;
}

// src/modules/calendar/dto/create-event.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, EventPriority } from '@prisma/client';

class AttendeeDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOrganizer?: boolean = false;

  @ApiPropertyOptional({ example: 'Additional notes about attendee' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'user-uuid-here' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class CreateEventDto {
  @ApiProperty({ example: 'Client Consultation - John Smith' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Initial consultation for auto accident case' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Conference Room A' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2024-01-15T11:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean = false;

  @ApiProperty({ enum: EventType, example: EventType.MEETING })
  @IsEnum(EventType)
  type: EventType;

  @ApiPropertyOptional({ enum: EventPriority, example: EventPriority.MEDIUM })
  @IsOptional()
  @IsEnum(EventPriority)
  priority?: EventPriority = EventPriority.MEDIUM;

  @ApiProperty({ example: 'calendar-uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  calendarId: string;

  @ApiPropertyOptional({ example: 'case-uuid-here' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ example: 'client-uuid-here' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  recurrence?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  reminders?: any;

  @ApiPropertyOptional({ type: [AttendeeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees?: AttendeeDto[];
}

// src/modules/calendar/dto/update-event.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {}

// src/modules/calendar/dto/query-events.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, EventStatus } from '@prisma/client';

export class QueryEventsDto {
  @ApiPropertyOptional({ example: 'calendar-uuid-here' })
  @IsOptional()
  @IsUUID()
  calendarId?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ example: 'case-uuid-here' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}