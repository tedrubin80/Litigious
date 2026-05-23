// ============================================================================
// COMMUNICATION MODULE - PRISMA MODELS
// ============================================================================

// Add these models to prisma/schema.prisma

model CommunicationThread {
  id          String              @id @default(cuid())
  subject     String
  type        CommunicationType
  status      ThreadStatus        @default(ACTIVE)
  priority    CommunicationPriority @default(MEDIUM)
  isInternal  Boolean             @default(false)
  lastActivity DateTime           @default(now())
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  // Relationships
  caseId   String?
  case     Case?   @relation(fields: [caseId], references: [id])
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id])

  // Thread participants
  participants ThreadParticipant[]
  messages     CommunicationMessage[]
  
  // Creator
  createdById String
  createdBy   User   @relation(fields: [createdById], references: [id])

  @@map("communication_threads")
}

model CommunicationMessage {
  id        String      @id @default(cuid())
  content   String
  type      MessageType @default(TEXT)
  direction MessageDirection
  status    MessageStatus @default(DELIVERED)
  metadata  Json?       // Additional data like email headers, phone duration, etc.
  sentAt    DateTime    @default(now())
  readAt    DateTime?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  // Thread relationship
  threadId String
  thread   CommunicationThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  // Sender/Recipient
  senderId    String?
  sender      User?   @relation("SentMessages", fields: [senderId], references: [id])
  recipientId String?
  recipient   User?   @relation("ReceivedMessages", fields: [recipientId], references: [id])

  // External contact info (for non-users)
  externalEmail String?
  externalName  String?
  externalPhone String?

  // Attachments
  attachments MessageAttachment[]

  @@map("communication_messages")
}

model MessageAttachment {
  id       String @id @default(cuid())
  fileName String
  filePath String
  fileSize Int
  mimeType String

  messageId String
  message   CommunicationMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@map("message_attachments")
}

model ThreadParticipant {
  id           String            @id @default(cuid())
  role         ParticipantRole   @default(PARTICIPANT)
  joinedAt     DateTime          @default(now())
  lastReadAt   DateTime?
  isActive     Boolean           @default(true)
  permissions  ParticipantPermission[] // Array of permissions

  threadId String
  thread   CommunicationThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  // Can be internal user or external contact
  userId        String?
  user          User?   @relation(fields: [userId], references: [id])
  externalEmail String?
  externalName  String?
  externalPhone String?

  @@unique([threadId, userId])
  @@unique([threadId, externalEmail])
  @@map("thread_participants")
}

model EmailTemplate {
  id          String             @id @default(cuid())
  name        String
  subject     String
  content     String
  type        EmailTemplateType
  isActive    Boolean            @default(true)
  variables   String[]           // Allowed template variables
  description String?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  createdById String
  createdBy   User   @relation(fields: [createdById], references: [id])

  @@map("email_templates")
}

model CommunicationLog {
  id          String               @id @default(cuid())
  type        CommunicationType
  direction   MessageDirection
  duration    Int?                 // For phone calls (in seconds)
  outcome     CommunicationOutcome
  summary     String
  notes       String?
  scheduledAt DateTime?            // For scheduled communications
  completedAt DateTime?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  // Relationships
  caseId   String?
  case     Case?   @relation(fields: [caseId], references: [id])
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id])

  // Thread relationship (optional)
  threadId String?
  thread   CommunicationThread? @relation(fields: [threadId], references: [id])

  // User who handled the communication
  handledById String
  handledBy   User   @relation(fields: [handledById], references: [id])

  // External contact info
  contactMethod String? // email, phone, in-person, etc.
  contactInfo   String? // actual email/phone number used

  @@map("communication_logs")
}

model ClientPortalAccess {
  id             String    @id @default(cuid())
  isActive       Boolean   @default(true)
  lastLoginAt    DateTime?
  loginAttempts  Int       @default(0)
  lockedUntil    DateTime?
  resetToken     String?   @unique
  resetTokenExpiry DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  clientId String @unique
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  // Portal communications
  portalMessages PortalMessage[]

  @@map("client_portal_access")
}

model PortalMessage {
  id        String        @id @default(cuid())
  subject   String
  content   String
  isRead    Boolean       @default(false)
  direction MessageDirection
  createdAt DateTime      @default(now())
  readAt    DateTime?

  portalAccessId String
  portalAccess   ClientPortalAccess @relation(fields: [portalAccessId], references: [id], onDelete: Cascade)

  // Sender (internal user)
  senderId String?
  sender   User?   @relation(fields: [senderId], references: [id])

  @@map("portal_messages")
}

// Communication Enums
enum CommunicationType {
  EMAIL
  PHONE_CALL
  SMS
  MEETING
  VIDEO_CALL
  LETTER
  FAX
  PORTAL_MESSAGE
  INTERNAL_NOTE
}

enum ThreadStatus {
  ACTIVE
  CLOSED
  ARCHIVED
  ON_HOLD
}

enum CommunicationPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum MessageType {
  TEXT
  HTML
  RICH_TEXT
  VOICE_NOTE
  FILE
}

enum MessageDirection {
  INBOUND
  OUTBOUND
  INTERNAL
}

enum MessageStatus {
  DRAFT
  SENT
  DELIVERED
  READ
  FAILED
  BOUNCED
}

enum ParticipantRole {
  ORGANIZER
  PARTICIPANT
  OBSERVER
  CC
  BCC
}

enum ParticipantPermission {
  READ
  WRITE
  DELETE
  INVITE
  MODERATE
}

enum EmailTemplateType {
  CLIENT_WELCOME
  CASE_UPDATE
  APPOINTMENT_REMINDER
  SETTLEMENT_OFFER
  DOCUMENT_REQUEST
  FOLLOW_UP
  CLOSING_LETTER
  GENERAL
}

enum CommunicationOutcome {
  SUCCESSFUL
  NO_ANSWER
  BUSY
  VOICEMAIL_LEFT
  CALLBACK_REQUESTED
  INFORMATION_GATHERED
  FOLLOW_UP_NEEDED
  ISSUE_RESOLVED
  ESCALATED
}

// Add to existing models:
// Add to User model:
// sentMessages CommunicationMessage[] @relation("SentMessages")
// receivedMessages CommunicationMessage[] @relation("ReceivedMessages")
// communicationThreads CommunicationThread[]
// threadParticipants ThreadParticipant[]
// emailTemplates EmailTemplate[]
// communicationLogs CommunicationLog[]
// portalMessages PortalMessage[]

// Add to Case model:
// communicationThreads CommunicationThread[]
// communicationLogs CommunicationLog[]

// Add to Client model:
// communicationThreads CommunicationThread[]
// communicationLogs CommunicationLog[]
// portalAccess ClientPortalAccess?

// ============================================================================
// COMMUNICATION MODULE IMPLEMENTATION
// ============================================================================

// src/modules/communication/communication.module.ts
import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  controllers: [
    CommunicationController,
    EmailController,
    PortalController,
    TemplatesController,
  ],
  providers: [
    CommunicationService,
    EmailService,
    PortalService,
    TemplatesService,
  ],
  exports: [
    CommunicationService,
    EmailService,
    PortalService,
    TemplatesService,
  ],
})
export class CommunicationModule {}

// src/modules/communication/communication.controller.ts
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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { QueryThreadsDto } from './dto/query-threads.dto';
import { CreateCommunicationLogDto } from './dto/create-communication-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Communication')
@Controller('communication')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  // Communication Threads
  @Get('threads')
  @ApiOperation({ summary: 'Get communication threads' })
  @ApiResponse({ status: 200, description: 'Threads retrieved successfully' })
  getThreads(@Query() queryDto: QueryThreadsDto, @Request() req) {
    return this.communicationService.getThreads(queryDto, req.user.id);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Create communication thread' })
  @ApiResponse({ status: 201, description: 'Thread created successfully' })
  createThread(@Body() createThreadDto: CreateThreadDto, @Request() req) {
    return this.communicationService.createThread(createThreadDto, req.user.id);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get thread by ID' })
  @ApiResponse({ status: 200, description: 'Thread retrieved successfully' })
  getThread(@Param('id') id: string, @Request() req) {
    return this.communicationService.getThread(id, req.user.id);
  }

  @Patch('threads/:id')
  @ApiOperation({ summary: 'Update thread' })
  @ApiResponse({ status: 200, description: 'Thread updated successfully' })
  updateThread(
    @Param('id') id: string,
    @Body() updateThreadDto: UpdateThreadDto,
    @Request() req,
  ) {
    return this.communicationService.updateThread(id, updateThreadDto, req.user.id);
  }

  @Delete('threads/:id')
  @ApiOperation({ summary: 'Delete thread' })
  @ApiResponse({ status: 200, description: 'Thread deleted successfully' })
  deleteThread(@Param('id') id: string, @Request() req) {
    return this.communicationService.deleteThread(id, req.user.id);
  }

  // Messages
  @Post('threads/:threadId/messages')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send message in thread' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  sendMessage(
    @Param('threadId') threadId: string,
    @Body() createMessageDto: CreateMessageDto,
    @UploadedFiles() attachments: Express.Multer.File[],
    @Request() req,
  ) {
    return this.communicationService.sendMessage(
      threadId,
      createMessageDto,
      attachments,
      req.user.id,
    );
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get messages in thread' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  getThreadMessages(
    @Param('threadId') threadId: string,
    @Query() query: { page?: number; limit?: number },
    @Request() req,
  ) {
    return this.communicationService.getThreadMessages(threadId, query, req.user.id);
  }

  @Patch('messages/:id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  markMessageRead(@Param('id') id: string, @Request() req) {
    return this.communicationService.markMessageRead(id, req.user.id);
  }

  // Communication Logs
  @Get('logs')
  @ApiOperation({ summary: 'Get communication logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  getCommunicationLogs(@Query() query: any, @Request() req) {
    return this.communicationService.getCommunicationLogs(query, req.user.id);
  }

  @Post('logs')
  @ApiOperation({ summary: 'Create communication log entry' })
  @ApiResponse({ status: 201, description: 'Log entry created successfully' })
  createCommunicationLog(
    @Body() createLogDto: CreateCommunicationLogDto,
    @Request() req,
  ) {
    return this.communicationService.createCommunicationLog(createLogDto, req.user.id);
  }

  // Case Communications
  @Get('cases/:caseId/communications')
  @ApiOperation({ summary: 'Get all communications for a case' })
  @ApiResponse({ status: 200, description: 'Case communications retrieved successfully' })
  getCaseCommunications(@Param('caseId') caseId: string, @Request() req) {
    return this.communicationService.getCaseCommunications(caseId, req.user.id);
  }

  // Client Communications
  @Get('clients/:clientId/communications')
  @ApiOperation({ summary: 'Get all communications for a client' })
  @ApiResponse({ status: 200, description: 'Client communications retrieved successfully' })
  getClientCommunications(@Param('clientId') clientId: string, @Request() req) {
    return this.communicationService.getClientCommunications(clientId, req.user.id);
  }

  // Analytics
  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get communication analytics summary' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  getCommunicationAnalytics(@Query() query: any, @Request() req) {
    return this.communicationService.getCommunicationAnalytics(query, req.user.id);
  }
}

// src/modules/communication/communication.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { QueryThreadsDto } from './dto/query-threads.dto';
import { CreateCommunicationLogDto } from './dto/create-communication-log.dto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  async getThreads(queryDto: QueryThreadsDto, userId: string) {
    const {
      caseId,
      clientId,
      type,
      status,
      priority,
      isInternal,
      page = 1,
      limit = 20,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: any = {
      participants: {
        some: {
          userId,
          isActive: true,
        },
      },
    };

    if (caseId) where.caseId = caseId;
    if (clientId) where.clientId = clientId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (isInternal !== undefined) where.isInternal = isInternal;

    const [threads, total] = await Promise.all([
      this.prisma.communicationThread.findMany({
        where,
        skip,
        take: limit,
        include: {
          case: {
            select: { id: true, caseNumber: true, title: true },
          },
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          participants: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              sentAt: true,
              sender: {
                select: { firstName: true, lastName: true },
              },
              externalName: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { lastActivity: 'desc' },
      }),
      this.prisma.communicationThread.count({ where }),
    ]);

    return {
      data: threads.map(thread => ({
        ...thread,
        lastMessage: thread.messages[0] || null,
        messageCount: thread._count.messages,
        messages: undefined,
        _count: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createThread(createThreadDto: CreateThreadDto, userId: string) {
    const { participants, ...threadData } = createThreadDto;

    const thread = await this.prisma.communicationThread.create({
      data: {
        ...threadData,
        createdById: userId,
        participants: {
          create: [
            // Add creator as organizer
            {
              userId,
              role: 'ORGANIZER',
              permissions: ['READ', 'WRITE', 'DELETE', 'INVITE', 'MODERATE'],
            },
            // Add other participants
            ...(participants || []).map(participant => ({
              ...participant,
              permissions: participant.permissions || ['READ', 'WRITE'],
            })),
          ],
        },
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return thread;
  }

  async getThread(id: string, userId: string) {
    const thread = await this.prisma.communicationThread.findFirst({
      where: {
        id,
        participants: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    return thread;
  }

  async updateThread(id: string, updateThreadDto: UpdateThreadDto, userId: string) {
    const thread = await this.getThread(id, userId);

    // Check if user has write permissions
    const userParticipant = thread.participants.find(p => p.userId === userId);
    if (!userParticipant?.permissions.includes('WRITE') && thread.createdBy.id !== userId) {
      throw new ForbiddenException('Insufficient permissions to update thread');
    }

    const updatedThread = await this.prisma.communicationThread.update({
      where: { id },
      data: {
        ...updateThreadDto,
        lastActivity: new Date(),
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return updatedThread;
  }

  async deleteThread(id: string, userId: string) {
    const thread = await this.getThread(id, userId);

    // Only thread creator or users with delete permissions can delete
    const userParticipant = thread.participants.find(p => p.userId === userId);
    if (!userParticipant?.permissions.includes('DELETE') && thread.createdBy.id !== userId) {
      throw new ForbiddenException('Insufficient permissions to delete thread');
    }

    await this.prisma.communicationThread.delete({
      where: { id },
    });

    return { message: 'Thread deleted successfully' };
  }

  async sendMessage(
    threadId: string,
    createMessageDto: CreateMessageDto,
    attachments: Express.Multer.File[],
    userId: string,
  ) {
    const thread = await this.getThread(threadId, userId);

    // Check write permissions
    const userParticipant = thread.participants.find(p => p.userId === userId);
    if (!userParticipant?.permissions.includes('WRITE')) {
      throw new ForbiddenException('Insufficient permissions to send message');
    }

    // Handle file attachments
    const attachmentData = [];
    if (attachments && attachments.length > 0) {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'communications');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      for (const file of attachments) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, file.buffer);

        attachmentData.push({
          fileName: file.originalname,
          filePath: `/uploads/communications/${fileName}`,
          fileSize: file.size,
          mimeType: file.mimetype,
        });
      }
    }

    const message = await this.prisma.communicationMessage.create({
      data: {
        ...createMessageDto,
        threadId,
        senderId: userId,
        attachments: attachmentData.length > 0 ? { create: attachmentData } : undefined,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
        recipient: {
          select: { id: true, firstName: true, lastName: true },
        },
        attachments: true,
      },
    });

    // Update thread last activity
    await this.prisma.communicationThread.update({
      where: { id: threadId },
      data: { lastActivity: new Date() },
    });

    return message;
  }

  async getThreadMessages(
    threadId: string,
    query: { page?: number; limit?: number },
    userId: string,
  ) {
    const thread = await this.getThread(threadId, userId);

    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.communicationMessage.findMany({
        where: { threadId },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true },
          },
          recipient: {
            select: { id: true, firstName: true, lastName: true },
          },
          attachments: true,
        },
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.communicationMessage.count({ where: { threadId } }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markMessageRead(id: string, userId: string) {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id },
      include: { thread: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to thread
    await this.getThread(message.threadId, userId);

    const updatedMessage = await this.prisma.communicationMessage.update({
      where: { id },
      data: { 
        readAt: new Date(),
        status: 'READ',
      },
    });

    return updatedMessage;
  }

  async createCommunicationLog(createLogDto: CreateCommunicationLogDto, userId: string) {
    const log = await this.prisma.communicationLog.create({
      data: {
        ...createLogDto,
        handledById: userId,
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        handledBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return log;
  }

  async getCommunicationLogs(query: any, userId: string) {
    const { caseId, clientId, type, outcome, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (caseId) where.caseId = caseId;
    if (clientId) where.clientId = clientId;
    if (type) where.type = type;
    if (outcome) where.outcome = outcome;

    const [logs, total] = await Promise.all([
      this.prisma.communicationLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          case: {
            select: { id: true, caseNumber: true, title: true },
          },
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
          handledBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.communicationLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCaseCommunications(caseId: string, userId: string) {
    const [threads, logs] = await Promise.all([
      this.prisma.communicationThread.findMany({
        where: {
          caseId,
          participants: {
            some: { userId, isActive: true },
          },
        },
        include: {
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
        orderBy: { lastActivity: 'desc' },
      }),
      this.prisma.communicationLog.findMany({
        where: { caseId },
        include: {
          handledBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      threads: threads.map(thread => ({
        ...thread,
        lastMessage: thread.messages[0] || null,
        messageCount: thread._count.messages,
        messages: undefined,
        _count: undefined,
      })),
      recentLogs: logs,
    };
  }

  async getClientCommunications(clientId: string, userId: string) {
    const [threads, logs] = await Promise.all([
      this.prisma.communicationThread.findMany({
        where: {
          clientId,
          participants: {
            some: { userId, isActive: true },
          },
        },
        include: {
          case: {
            select: { id: true, caseNumber: true, title: true },
          },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
        orderBy: { lastActivity: 'desc' },
      }),
      this.prisma.communicationLog.findMany({
        where: { clientId },
        include: {
          case: {
            select: { id: true, caseNumber: true, title: true },
          },
          handledBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      threads: threads.map(thread => ({
        ...thread,
        lastMessage: thread.messages[0] || null,
        messageCount: thread._count.messages,
        messages: undefined,
        _count: undefined,
      })),
      recentLogs: logs,
    };
  }

  async getCommunicationAnalytics(query: any, userId: string) {
    const { startDate, endDate } = query;
    
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [
      totalThreads,
      totalMessages,
      communicationsByType,
      communicationsByOutcome,
      recentActivity,
    ] = await Promise.all([
      this.prisma.communicationThread.count({
        where: {
          participants: { some: { userId } },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),
      this.prisma.communicationMessage.count({
        where: {
          thread: {
            participants: { some: { userId } },
          },
          ...(Object.keys(dateFilter).length > 0 && { sentAt: dateFilter }),
        },
      }),
      this.prisma.communicationLog.groupBy({
        by: ['type'],
        where: {
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: true,
      }),
      this.prisma.communicationLog.groupBy({
        by: ['outcome'],
        where: {
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: true,
      }),
      this.prisma.communicationThread.findMany({
        where: {
          participants: { some: { userId } },
        },
        include: {
          case: {
            select: { caseNumber: true, title: true },
          },
          client: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { lastActivity: 'desc' },
        take: 5,
      }),
    ]);

    return {
      summary: {
        totalThreads,
        totalMessages,
        averageMessagesPerThread: totalThreads > 0 ? Math.round(totalMessages / totalThreads) : 0,
      },
      communicationsByType: communicationsByType.reduce((acc, item) => {
        acc[item.type.toLowerCase()] = item._count;
        return acc;
      }, {}),
      communicationsByOutcome: communicationsByOutcome.reduce((acc, item) => {
        acc[item.outcome.toLowerCase()] = item._count;
        return acc;
      }, {}),
      recentActivity,
    };
  }
}

// ============================================================================
// DTOs FOR COMMUNICATION MODULE
// ============================================================================

// src/modules/communication/dto/create-thread.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommunicationType, CommunicationPriority, ParticipantRole, ParticipantPermission } from '@prisma/client';

class ParticipantDto {
  @ApiPropertyOptional({ example: 'user-uuid-here' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'client@example.com' })
  @IsOptional()
  @IsString()
  externalEmail?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  externalName?: string;

  @ApiPropertyOptional({ example: '(555) 123-4567' })
  @IsOptional()
  @IsString()
  externalPhone?: string;

  @ApiPropertyOptional({ enum: ParticipantRole, example: ParticipantRole.PARTICIPANT })
  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole = ParticipantRole.PARTICIPANT;

  @ApiPropertyOptional({ 
    enum: ParticipantPermission,
    isArray: true,
    example: [ParticipantPermission.READ, ParticipantPermission.WRITE]
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ParticipantPermission, { each: true })
  permissions?: ParticipantPermission[];
}

export class CreateThreadDto {
  @ApiProperty({ example: 'Client consultation follow-up' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ enum: CommunicationType, example: CommunicationType.EMAIL })
  @IsEnum(CommunicationType)
  type: CommunicationType;

  @ApiPropertyOptional({ enum: CommunicationPriority, example: CommunicationPriority.MEDIUM })
  @IsOptional()
  @IsEnum(CommunicationPriority)
  priority?: CommunicationPriority = CommunicationPriority.MEDIUM;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;

  @ApiPropertyOptional({ example: 'case-uuid-here' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ example: 'client-uuid-here' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ type: [ParticipantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];
}

// src/modules/communication/dto/update-thread.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateThreadDto } from './create-thread.dto';

export class UpdateThreadDto extends PartialType(
  OmitType(CreateThreadDto, ['participants'] as const)
) {}

// src/modules/communication/dto/create-message.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { MessageType, MessageDirection } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({ example: 'Thank you for your inquiry. We will review your case and get back to you within 24 hours.' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, example: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;

  @ApiProperty({ enum: MessageDirection, example: MessageDirection.OUTBOUND })
  @IsEnum(MessageDirection)
  direction: MessageDirection;

  @ApiPropertyOptional({ example: 'user-uuid-here' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiPropertyOptional({ example: 'client@example.com' })
  @IsOptional()
  @IsString()
  externalEmail?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  externalName?: string;

  @ApiPropertyOptional({ example: '(555) 123-4567' })
  @IsOptional()
  @IsString()
  externalPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}

// src/modules/communication/dto/query-threads.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommunicationType, ThreadStatus, CommunicationPriority } from '@prisma/client';

export class QueryThreadsDto {
  @ApiPropertyOptional({ example: 'case-uuid-here' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ example: 'client-uuid-here' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ enum: CommunicationType })
  @IsOptional()
  @IsEnum(CommunicationType)
  type?: CommunicationType;

  @ApiPropertyOptional({ enum: ThreadStatus })
  @IsOptional()
  @IsEnum(ThreadStatus)
  status?: ThreadStatus;

  @ApiPropertyOptional({ enum: CommunicationPriority })
  @IsOptional()
  @IsEnum(CommunicationPriority)
  priority?: CommunicationPriority;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// src/modules/communication/dto/create-communication-log.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { CommunicationType, MessageDirection, CommunicationOutcome } from '@prisma/client';

export class CreateCommunicationLogDto {
  @ApiProperty({ enum: CommunicationType, example: CommunicationType.PHONE_CALL })
  @IsEnum(CommunicationType)
  type: CommunicationType;

  @ApiProperty({ enum: MessageDirection, example: MessageDirection.OUTBOUND })
  @IsEnum(MessageDirection)
  direction: MessageDirection;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiProperty({ enum: CommunicationOutcome, example: CommunicationOutcome.SUCCESSFUL })
  @IsEnum(CommunicationOutcome)
  outcome: CommunicationOutcome;

  @ApiProperty({ example: 'Discussed settlement options with client' })
  @IsNotEmpty()
  @IsString()
  summary: string;

  @ApiPropertyOptional({ example: 'Client expressed interest in mediation. Follow up needed next week.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional({ example: 'case-uuid-here' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ example: 'client-uuid-here' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ example: 'thread-uuid-here' })
  @IsOptional()
  @IsUUID()
  threadId?: string;

  @ApiPropertyOptional({ example: 'phone' })
  @IsOptional()
  @IsString()
  contactMethod?: string;

  @ApiPropertyOptional({ example: '(555) 123-4567' })
  @IsOptional()
  @IsString()
  contactInfo?: string;
}